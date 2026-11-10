const request = require("supertest");
const mongoose = require("mongoose");
const app = require("../index");
const Playlist = require("../models/Playlist");
const { connectTestDB, closeTestDB, clearTestDB } = require("./setup");

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

beforeEach(async () => {
  await clearTestDB();
});

describe("Milestone 6.2: Social Playlist Discovery & Sharing Integration Tests", () => {
  let userA, tokenA;
  let userB, tokenB;

  beforeEach(async () => {
    const resA = await request(app).post("/api/auth/signup").send({
      username: "alice_curator",
      email: "alice@example.com",
      password: "Password123!",
    });
    userA = resA.body.user;
    tokenA = resA.body.token;

    const resB = await request(app).post("/api/auth/signup").send({
      username: "bob_listener",
      email: "bob@example.com",
      password: "Password123!",
    });
    userB = resB.body.user;
    tokenB = resB.body.token;
  });

  describe("Public Explore Feed (GET /api/playlists/public/explore)", () => {
    beforeEach(async () => {
      // Create 3 public playlists and 1 private playlist
      await request(app)
        .post("/api/playlists")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          name: "Synthwave Nights",
          description: "Retro 80s neon dreamscapes",
          isPublic: true,
          songs: [
            {
              title: "Nightcall",
              artist: "Kavinsky",
              source: { provider: "jamendo", externalId: "101" },
            },
          ],
        });

      await request(app)
        .post("/api/playlists")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          name: "Deep Focus Lo-Fi",
          description: "Calm beats for coding",
          isPublic: true,
          songs: [
            {
              title: "Coffee Break",
              artist: "ChillHop",
              source: { provider: "jamendo", externalId: "102" },
            },
          ],
        });

      await request(app)
        .post("/api/playlists")
        .set("Authorization", `Bearer ${tokenB}`)
        .send({
          name: "Acoustic Sunset",
          description: "Warm guitars and gentle vocals",
          isPublic: true,
          songs: [
            {
              title: "Golden Hour",
              artist: "Indie Singer",
              source: { provider: "spotify", externalId: "spotify:track:123" },
            },
          ],
        });

      // Private playlist
      await request(app)
        .post("/api/playlists")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          name: "Secret Alice Vault",
          description: "Top secret unreleased tracks",
          isPublic: false,
          songs: [
            {
              title: "Secret Jam",
              artist: "Unknown",
            },
          ],
        });
    });

    it("should return only public playlists without requiring authentication", async () => {
      const res = await request(app).get("/api/playlists/public/explore");
      expect(res.status).toBe(200);
      expect(res.body.playlists).toBeDefined();
      expect(res.body.playlists.length).toBe(3);

      const names = res.body.playlists.map((p) => p.name);
      expect(names).toContain("Synthwave Nights");
      expect(names).toContain("Deep Focus Lo-Fi");
      expect(names).toContain("Acoustic Sunset");
      expect(names).not.toContain("Secret Alice Vault");

      // Verify creator info is sanitized (no email, no password hash)
      res.body.playlists.forEach((p) => {
        expect(p.creator).toBeDefined();
        expect(p.creator.username).toBeDefined();
        expect(p.creator.email).toBeUndefined();
        expect(p.creator.password).toBeUndefined();
        expect(p.userId).toBeDefined();
      });

      expect(res.body.pagination).toMatchObject({
        page: 1,
        limit: 12,
        total: 3,
        totalPages: 1,
      });
    });

    it("should filter public playlists by search keyword across name and song titles", async () => {
      // Search by playlist name
      const res1 = await request(app)
        .get("/api/playlists/public/explore")
        .query({ search: "synthwave" });
      expect(res1.status).toBe(200);
      expect(res1.body.playlists.length).toBe(1);
      expect(res1.body.playlists[0].name).toBe("Synthwave Nights");

      // Search by song artist
      const res2 = await request(app)
        .get("/api/playlists/public/explore")
        .query({ search: "Kavinsky" });
      expect(res2.status).toBe(200);
      expect(res2.body.playlists.length).toBe(1);
      expect(res2.body.playlists[0].name).toBe("Synthwave Nights");
    });

    it("should filter public playlists by provider", async () => {
      const res = await request(app)
        .get("/api/playlists/public/explore")
        .query({ provider: "jamendo" });
      expect(res.status).toBe(200);
      expect(res.body.playlists.length).toBe(2);
      const names = res.body.playlists.map((p) => p.name);
      expect(names).toContain("Synthwave Nights");
      expect(names).toContain("Deep Focus Lo-Fi");
      expect(names).not.toContain("Acoustic Sunset");
    });

    it("should support pagination", async () => {
      const res = await request(app)
        .get("/api/playlists/public/explore")
        .query({ page: 1, limit: 2 });
      expect(res.status).toBe(200);
      expect(res.body.playlists.length).toBe(2);
      expect(res.body.pagination).toMatchObject({
        page: 1,
        limit: 2,
        total: 3,
        totalPages: 2,
      });

      const page2 = await request(app)
        .get("/api/playlists/public/explore")
        .query({ page: 2, limit: 2 });
      expect(page2.status).toBe(200);
      expect(page2.body.playlists.length).toBe(1);
    });
  });

  describe("Public Playlist Preview & Authorization (GET /api/playlists/:id)", () => {
    let publicPlId;
    let privatePlId;

    beforeEach(async () => {
      const pubRes = await request(app)
        .post("/api/playlists")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          name: "Public Masterpiece",
          description: "Curated by Alice",
          isPublic: true,
          songs: [
            {
              title: "Summer Breeze",
              artist: "Sunny",
              duration: 180,
              source: { provider: "jamendo", externalId: "999", url: "https://example.com" },
            },
          ],
        });
      publicPlId = pubRes.body._id;

      const privRes = await request(app)
        .post("/api/playlists")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          name: "Alice Diary",
          description: "Private thoughts",
          isPublic: false,
          songs: [],
        });
      privatePlId = privRes.body._id;
    });

    it("should allow unauthenticated guest to view public playlist", async () => {
      const res = await request(app).get(`/api/playlists/${publicPlId}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Public Masterpiece");
      expect(res.body.isOwner).toBe(false);
      expect(res.body.creator).toMatchObject({
        username: "alice_curator",
      });
      expect(res.body.creator.email).toBeUndefined();
      expect(res.body.songs.length).toBe(1);
    });

    it("should deny unauthenticated guest from viewing private playlist with 401", async () => {
      const res = await request(app).get(`/api/playlists/${privatePlId}`);
      expect(res.status).toBe(401);
      expect(res.body.message).toMatch(/private playlist/i);
    });

    it("should deny non-owner authenticated user from viewing private playlist with 404 to hide existence", async () => {
      const res = await request(app)
        .get(`/api/playlists/${privatePlId}`)
        .set("Authorization", `Bearer ${tokenB}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/Playlist not found/i);
    });

    it("should allow owner to view their own private playlist with isOwner: true", async () => {
      const res = await request(app)
        .get(`/api/playlists/${privatePlId}`)
        .set("Authorization", `Bearer ${tokenA}`);
      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Alice Diary");
      expect(res.body.isOwner).toBe(true);
    });
  });

  describe("Fork Playlist (POST /api/playlists/:id/fork)", () => {
    let sourcePlId;
    let privatePlId;

    beforeEach(async () => {
      const pubRes = await request(app)
        .post("/api/playlists")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          name: "Alice Epic Jams",
          description: "The ultimate road trip compilation",
          coverImage: "https://example.com/cover.jpg",
          isPublic: true,
          songs: [
            {
              title: "Highway Star",
              artist: "Speedster",
              duration: 210,
              source: { provider: "jamendo", externalId: "888", url: "https://jamendo.com/track/888" },
              license: "CC-BY",
              attribution: "Speedster via Jamendo",
            },
          ],
        });
      sourcePlId = pubRes.body._id;

      const privRes = await request(app)
        .post("/api/playlists")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          name: "Alice Top Secret",
          isPublic: false,
        });
      privatePlId = privRes.body._id;
    });

    it("should require authentication to fork a playlist", async () => {
      const res = await request(app).post(`/api/playlists/${sourcePlId}/fork`).send();
      expect(res.status).toBe(401);
    });

    it("should allow userB to fork userA's public playlist, cloning songs and incrementing forkCount", async () => {
      const res = await request(app)
        .post(`/api/playlists/${sourcePlId}/fork`)
        .set("Authorization", `Bearer ${tokenB}`)
        .send({ name: "Bob's Customized Jams" });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Bob's Customized Jams");
      expect(String(res.body.userId)).toBe(String(userB.id));
      expect(String(res.body.forkedFrom)).toBe(String(sourcePlId));
      expect(res.body.isPublic).toBe(false); // forked playlists start as user's private library copy
      expect(res.body.songs.length).toBe(1);
      expect(res.body.songs[0].title).toBe("Highway Star");
      expect(res.body.songs[0].source.provider).toBe("jamendo");

      // Check source playlist forkCount was incremented
      const updatedSource = await Playlist.findById(sourcePlId);
      expect(updatedSource.forkCount).toBe(1);
    });

    it("should block non-owner from forking a private playlist with 403", async () => {
      const res = await request(app)
        .post(`/api/playlists/${privatePlId}/fork`)
        .set("Authorization", `Bearer ${tokenB}`)
        .send();

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/Cannot fork a private playlist/i);
    });
  });

  describe("OpenGraph Metadata Endpoint (GET /api/playlists/:id/og)", () => {
    let publicPlId;
    let privatePlId;

    beforeEach(async () => {
      const pubRes = await request(app)
        .post("/api/playlists")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          name: "Neon Horizon",
          description: "Night driving anthems",
          coverImage: "https://example.com/neon.jpg",
          isPublic: true,
          songs: [{ title: "Drive", artist: "Synth" }],
        });
      publicPlId = pubRes.body._id;

      const privRes = await request(app)
        .post("/api/playlists")
        .set("Authorization", `Bearer ${tokenA}`)
        .send({
          name: "Secret Neon",
          isPublic: false,
        });
      privatePlId = privRes.body._id;
    });

    it("should render rich OpenGraph HTML for public playlist", async () => {
      const res = await request(app).get(`/api/playlists/${publicPlId}/og`);
      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/html/);
      expect(res.text).toContain("<title>Neon Horizon — SOUNDWAVE Mixtape</title>");
      expect(res.text).toContain('property="og:title" content="Neon Horizon by alice_curator"');
      expect(res.text).toContain('property="og:type" content="music.playlist"');
      expect(res.text).toContain('property="og:image" content="https://example.com/neon.jpg"');
      expect(res.text).toContain("Drive"); // In playlist or count
    });

    it("should return 404 for private playlist on OpenGraph endpoint", async () => {
      const res = await request(app).get(`/api/playlists/${privatePlId}/og`);
      expect(res.status).toBe(404);
    });
  });
});
