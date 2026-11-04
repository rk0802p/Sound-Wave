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

describe("Security & Ownership Isolation Integration Tests", () => {
  let userAToken, userAId;
  let userBToken, userBId;
  let userAPlaylist;

  beforeEach(async () => {
    // User A
    const resA = await request(app).post("/api/auth/signup").send({
      username: "userA",
      email: "userA@example.com",
      password: "Password123!",
    });
    userAToken = resA.body.token;
    userAId = resA.body.user.id;

    // User B
    const resB = await request(app).post("/api/auth/signup").send({
      username: "userB",
      email: "userB@example.com",
      password: "Password123!",
    });
    userBToken = resB.body.token;
    userBId = resB.body.user.id;

    // Create private playlist owned by User A
    userAPlaylist = await Playlist.create({
      name: "User A Confidential Mix",
      description: "Private beats",
      userId: userAId,
      isPublic: false,
      songs: [
        { title: "Secret Track", artist: "Artist A", duration: 180, url: "http://audio.mp3" },
      ],
    });
  });

  describe("Cross-User Access Controls", () => {
    it("should prevent User B from viewing User A's private playlist (403)", async () => {
      const res = await request(app)
        .get(`/api/playlists/${userAPlaylist._id}`)
        .set("Authorization", `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it("should allow User B to view User A's playlist if marked isPublic: true", async () => {
      await Playlist.findByIdAndUpdate(userAPlaylist._id, { isPublic: true });

      const res = await request(app)
        .get(`/api/playlists/${userAPlaylist._id}`)
        .set("Authorization", `Bearer ${userBToken}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("User A Confidential Mix");
    });

    it("should prevent User B from updating User A's playlist (403)", async () => {
      const res = await request(app)
        .put(`/api/playlists/${userAPlaylist._id}`)
        .set("Authorization", `Bearer ${userBToken}`)
        .send({ name: "Hacked Playlist" });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized/i);

      // Verify name was not modified in database
      const dbPlaylist = await Playlist.findById(userAPlaylist._id);
      expect(dbPlaylist.name).toBe("User A Confidential Mix");
    });

    it("should prevent User B from deleting User A's playlist (403)", async () => {
      const res = await request(app)
        .delete(`/api/playlists/${userAPlaylist._id}`)
        .set("Authorization", `Bearer ${userBToken}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized/i);

      // Verify playlist still exists
      const dbPlaylist = await Playlist.findById(userAPlaylist._id);
      expect(dbPlaylist).not.toBeNull();
    });

    it("should prevent User B from adding songs to User A's playlist (403)", async () => {
      const res = await request(app)
        .post(`/api/playlists/${userAPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${userBToken}`)
        .send({
          title: "Malicious Track",
          artist: "Hacker",
          url: "http://malicious.mp3",
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized/i);
    });

    it("should prevent User B from reordering songs on User A's playlist (403)", async () => {
      const res = await request(app)
        .put(`/api/playlists/${userAPlaylist._id}/songs/reorder`)
        .set("Authorization", `Bearer ${userBToken}`)
        .send({ songIds: [] });

      expect(res.status).toBe(403);
      expect(res.body.message).toMatch(/not authorized/i);
    });
  });

  describe("ID Tampering & Mass Assignment Prevention", () => {
    it("should strictly ignore userId in PUT request body and prevent owner takeover", async () => {
      const res = await request(app)
        .put(`/api/playlists/${userAPlaylist._id}`)
        .set("Authorization", `Bearer ${userAToken}`)
        .send({
          name: "Renamed Mix",
          userId: userBId, // Attempt to reassign owner
        });

      expect(res.status).toBe(200);

      // Verify in DB that owner is STILL User A
      const updated = await Playlist.findById(userAPlaylist._id);
      expect(updated.userId.toString()).toBe(userAId);
      expect(updated.userId.toString()).not.toBe(userBId);
    });

    it("should ignore _id modification attempts in request body", async () => {
      const fakeId = new mongoose.Types.ObjectId().toString();

      const res = await request(app)
        .put(`/api/playlists/${userAPlaylist._id}`)
        .set("Authorization", `Bearer ${userAToken}`)
        .send({
          _id: fakeId,
          name: "Legit Rename",
        });

      expect(res.status).toBe(200);

      const checkOld = await Playlist.findById(userAPlaylist._id);
      expect(checkOld).not.toBeNull();

      const checkFake = await Playlist.findById(fakeId);
      expect(checkFake).toBeNull();
    });
  });

  describe("CORS Strict Allowlist Enforcement", () => {
    it("should allow configured production frontend origin", async () => {
      const res = await request(app)
        .get("/api/test")
        .set("Origin", "https://music-playlist-pp8l.vercel.app");
      expect(res.headers["access-control-allow-origin"]).toBe("https://music-playlist-pp8l.vercel.app");
    });

    it("should block arbitrary origins even if matching prefix and suffix", async () => {
      const res = await request(app)
        .get("/api/test")
        .set("Origin", "https://music-playlist-malicious.vercel.app");
      expect(res.status).toBe(403);
      expect(res.body.error).toBe("CORS Error");
    });
  });

  describe("Fail-Fast Startup Environment Validation", () => {
    const origEnv = process.env.NODE_ENV;
    const origSecret = process.env.JWT_SECRET;

    afterEach(() => {
      process.env.NODE_ENV = origEnv;
      process.env.JWT_SECRET = origSecret;
    });

    it("should throw fatal error at startup if in production without JWT_SECRET", () => {
      process.env.NODE_ENV = "production";
      delete process.env.JWT_SECRET;
      expect(() => {
        app.validateEnvironment();
      }).toThrow(/FATAL: JWT_SECRET environment variable is missing in production/i);
    });

    it("should allow startup when JWT_SECRET is provided in production", () => {
      process.env.NODE_ENV = "production";
      process.env.JWT_SECRET = "production_super_secret_key_12345";
      expect(() => {
        app.validateEnvironment();
      }).not.toThrow();
    });
  });
});
