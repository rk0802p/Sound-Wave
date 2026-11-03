const request = require("supertest");
const app = require("../index");
const User = require("../models/User");
const { connectTestDB, closeTestDB, clearTestDB } = require("./setup");
const { generateOAuthState, verifyOAuthState } = require("../controllers/spotifyController");

describe("Spotify OAuth & Token Integration Tests", () => {
  let user;
  let token;
  let otherUser;
  let otherToken;

  const originalEnv = process.env;

  beforeAll(async () => {
    await connectTestDB();
  });

  afterAll(async () => {
    await closeTestDB();
    process.env = originalEnv;
  });

  beforeEach(async () => {
    await clearTestDB();
    process.env = { ...originalEnv };
    process.env.SPOTIFY_CLIENT_ID = "mock_spotify_client_id_123";
    process.env.SPOTIFY_CLIENT_SECRET = "mock_spotify_client_secret_456";
    process.env.SPOTIFY_REDIRECT_URI = "http://localhost:5000/api/spotify/callback";
    process.env.FRONTEND_URL = "http://localhost:5173";

    // Create user 1
    const res1 = await request(app)
      .post("/api/auth/signup")
      .send({
        username: "spotify_tester",
        email: "spotify@test.com",
        password: "password123",
      });
    user = res1.body.user;
    token = res1.body.token;

    // Create user 2 for isolation tests
    const res2 = await request(app)
      .post("/api/auth/signup")
      .send({
        username: "other_user",
        email: "other@test.com",
        password: "password123",
      });
    otherUser = res2.body.user;
    otherToken = res2.body.token;
  });

  describe("Unit: OAuth State Generation & Cryptographic Verification", () => {
    it("should generate a verifiable signed state token containing user ID", () => {
      const state = generateOAuthState(user.id);
      expect(typeof state).toBe("string");
      const decodedUserId = verifyOAuthState(state);
      expect(decodedUserId).toBe(user.id);
    });

    it("should return null for tampered or invalid state token", () => {
      expect(verifyOAuthState("invalid_state_string")).toBeNull();
      expect(verifyOAuthState("")).toBeNull();
      const state = generateOAuthState(user.id);
      const tampered = state.slice(0, -5) + "abcde";
      expect(verifyOAuthState(tampered)).toBeNull();
    });
  });

  describe("GET /api/spotify/connect", () => {
    it("should reject unauthenticated connect requests (401)", async () => {
      const res = await request(app).get("/api/spotify/connect");
      expect(res.status).toBe(401);
    });

    it("should generate a valid Spotify authorization URL with required scopes", async () => {
      const res = await request(app)
        .get("/api/spotify/connect")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      expect(res.status).toBe(200);
      expect(res.body.configured).toBe(true);
      expect(res.body.authUrl).toContain("https://accounts.spotify.com/authorize");
      expect(res.body.authUrl).toContain("client_id=mock_spotify_client_id_123");
      expect(res.body.authUrl).toContain("response_type=code");
      expect(res.body.authUrl).toContain("streaming");
      expect(res.body.authUrl).toContain("user-read-playback-state");
      expect(res.body.authUrl).toContain("user-modify-playback-state");
    });

    it("should return 503 if SPOTIFY_CLIENT_ID is not configured", async () => {
      delete process.env.SPOTIFY_CLIENT_ID;

      const res = await request(app)
        .get("/api/spotify/connect")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json");

      expect(res.status).toBe(503);
      expect(res.body.configured).toBe(false);
    });
  });

  describe("GET /api/spotify/callback", () => {
    it("should redirect to frontend with error if authorization was denied", async () => {
      const res = await request(app)
        .get("/api/spotify/callback")
        .query({ error: "access_denied" });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("spotify_error=access_denied");
    });

    it("should reject callback with invalid or missing state", async () => {
      const res = await request(app)
        .get("/api/spotify/callback")
        .query({ code: "mock_code", state: "bogus_state" });

      expect(res.status).toBe(302);
      expect(res.headers.location).toContain("spotify_error=invalid_or_expired_state");
    });

    it("should successfully exchange code, persist tokens, and link account", async () => {
      const validState = generateOAuthState(user.id);

      // Mock global fetch for token exchange and profile fetch
      const originalFetch = global.fetch;
      global.fetch = jest.fn((url) => {
        if (url.includes("accounts.spotify.com/api/token")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                access_token: "mock_access_token_abc",
                refresh_token: "mock_refresh_token_xyz",
                expires_in: 3600,
                token_type: "Bearer",
                scope: "streaming user-read-email",
              }),
          });
        }
        if (url.includes("api.spotify.com/v1/me")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                id: "spotify_user_999",
                display_name: "Sound Curator",
                email: "spotify@curator.com",
                product: "premium",
              }),
          });
        }
        return Promise.reject(new Error("Unknown URL"));
      });

      try {
        const res = await request(app)
          .get("/api/spotify/callback")
          .query({ code: "valid_auth_code_123", state: validState });

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain("spotify_connected=true");
        expect(res.headers.location).toContain("product=premium");

        // Verify database persistence
        const dbUser = await User.findById(user.id);
        expect(dbUser.spotify.connected).toBe(true);
        expect(dbUser.spotify.spotifyId).toBe("spotify_user_999");
        expect(dbUser.spotify.displayName).toBe("Sound Curator");
        expect(dbUser.spotify.product).toBe("premium");
        expect(dbUser.spotify.accessToken).toBe("mock_access_token_abc");
        expect(dbUser.spotify.refreshToken).toBe("mock_refresh_token_xyz");
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("should redirect with token_exchange_failed if token endpoint fails", async () => {
      const validState = generateOAuthState(user.id);

      const originalFetch = global.fetch;
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          text: () => Promise.resolve("Invalid grant"),
        })
      );

      try {
        const res = await request(app)
          .get("/api/spotify/callback")
          .query({ code: "expired_code", state: validState });

        expect(res.status).toBe(302);
        expect(res.headers.location).toContain("spotify_error=token_exchange_failed");
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe("GET /api/spotify/status", () => {
    it("should return connected: false when no Spotify account is linked", async () => {
      const res = await request(app)
        .get("/api/spotify/status")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(false);
      expect(res.body.configured).toBe(true);
      expect(res.body.accessToken).toBeUndefined();
      expect(res.body.refreshToken).toBeUndefined();
    });

    it("should return safe profile info without leaking access or refresh tokens", async () => {
      // Connect user in DB
      await User.findByIdAndUpdate(user.id, {
        spotify: {
          connected: true,
          spotifyId: "spotify_user_1",
          displayName: "Premium Curator",
          product: "premium",
          accessToken: "secret_access_token",
          refreshToken: "secret_refresh_token",
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      const res = await request(app)
        .get("/api/spotify/status")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(true);
      expect(res.body.displayName).toBe("Premium Curator");
      expect(res.body.product).toBe("premium");
      expect(res.body.isEligible).toBe(true);
      // Strictly verify no secrets leaked
      expect(res.body.accessToken).toBeUndefined();
      expect(res.body.refreshToken).toBeUndefined();
    });

    it("should report isEligible: false for free accounts", async () => {
      await User.findByIdAndUpdate(user.id, {
        spotify: {
          connected: true,
          spotifyId: "free_user",
          displayName: "Free User",
          product: "free",
          accessToken: "token_1",
          refreshToken: "token_2",
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      const res = await request(app)
        .get("/api/spotify/status")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(true);
      expect(res.body.isEligible).toBe(false);
      expect(res.body.product).toBe("free");
    });
  });

  describe("POST /api/spotify/token (Access Token Retrieval & Refresh)", () => {
    it("should return 404 if user has not connected Spotify", async () => {
      const res = await request(app)
        .post("/api/spotify/token")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.connected).toBe(false);
    });

    it("should return cached access token if not expired", async () => {
      await User.findByIdAndUpdate(user.id, {
        spotify: {
          connected: true,
          refreshToken: "valid_refresh",
          accessToken: "current_cached_token",
          expiresAt: new Date(Date.now() + 1800000), // 30 mins remaining
        },
      });

      const res = await request(app)
        .post("/api/spotify/token")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.accessToken).toBe("current_cached_token");
      expect(res.body.expiresIn).toBeGreaterThan(1700);
    });

    it("should refresh token when expired using refreshToken", async () => {
      await User.findByIdAndUpdate(user.id, {
        spotify: {
          connected: true,
          refreshToken: "stored_refresh_token",
          accessToken: "expired_token",
          expiresAt: new Date(Date.now() - 10000), // Expired 10s ago
        },
      });

      const originalFetch = global.fetch;
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              access_token: "newly_refreshed_access_token",
              expires_in: 3600,
            }),
        })
      );

      try {
        const res = await request(app)
          .post("/api/spotify/token")
          .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(200);
        expect(res.body.accessToken).toBe("newly_refreshed_access_token");

        // Verify DB was updated
        const dbUser = await User.findById(user.id);
        expect(dbUser.spotify.accessToken).toBe("newly_refreshed_access_token");
      } finally {
        global.fetch = originalFetch;
      }
    });

    it("should mark account disconnected and return 401 if refresh token is rejected", async () => {
      await User.findByIdAndUpdate(user.id, {
        spotify: {
          connected: true,
          refreshToken: "revoked_refresh_token",
          accessToken: "expired_token",
          expiresAt: new Date(Date.now() - 10000),
        },
      });

      const originalFetch = global.fetch;
      global.fetch = jest.fn(() =>
        Promise.resolve({
          ok: false,
          status: 400,
          text: () => Promise.resolve("invalid_grant"),
        })
      );

      try {
        const res = await request(app)
          .post("/api/spotify/token")
          .set("Authorization", `Bearer ${token}`);

        expect(res.status).toBe(401);
        expect(res.body.connected).toBe(false);

        const dbUser = await User.findById(user.id);
        expect(dbUser.spotify.connected).toBe(false);
      } finally {
        global.fetch = originalFetch;
      }
    });
  });

  describe("POST /api/spotify/disconnect", () => {
    it("should clear Spotify credentials and mark user disconnected", async () => {
      await User.findByIdAndUpdate(user.id, {
        spotify: {
          connected: true,
          spotifyId: "to_disconnect",
          displayName: "Disconnect Me",
          accessToken: "token_abc",
          refreshToken: "token_xyz",
        },
      });

      const res = await request(app)
        .post("/api/spotify/disconnect")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.connected).toBe(false);

      const dbUser = await User.findById(user.id);
      expect(dbUser.spotify.connected).toBe(false);
      expect(dbUser.spotify.accessToken).toBeNull();
      expect(dbUser.spotify.refreshToken).toBeNull();
      expect(dbUser.spotify.spotifyId).toBeNull();
    });
  });

  describe("Security: User Ownership & Credential Isolation", () => {
    it("should prevent User B from accessing User A's Spotify token or status", async () => {
      // Connect User A
      await User.findByIdAndUpdate(user.id, {
        spotify: {
          connected: true,
          displayName: "User A Spotify",
          accessToken: "user_a_secret_token",
          refreshToken: "user_a_refresh",
          expiresAt: new Date(Date.now() + 3600000),
        },
      });

      // User B checks status
      const statusResB = await request(app)
        .get("/api/spotify/status")
        .set("Authorization", `Bearer ${otherToken}`);

      expect(statusResB.status).toBe(200);
      expect(statusResB.body.connected).toBe(false); // User B is not connected

      // User B attempts to get token
      const tokenResB = await request(app)
        .post("/api/spotify/token")
        .set("Authorization", `Bearer ${otherToken}`);

      expect(tokenResB.status).toBe(404);
      expect(tokenResB.body.connected).toBe(false);
    });
  });
});
