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

describe("Playlist CRUD Integration Tests", () => {
  let token;
  let userId;

  beforeEach(async () => {
    const signupRes = await request(app).post("/api/auth/signup").send({
      username: "playlist_user",
      email: "playlist_user@example.com",
      password: "Password123!",
    });
    token = signupRes.body.token;
    userId = signupRes.body.user.id;
  });

  describe("POST /api/playlists", () => {
    it("should create a playlist with name, description, and cover image", async () => {
      const payload = {
        name: "Late Night Chill",
        description: "Smooth lo-fi and downtempo tracks",
        coverImage: "https://example.com/cover.jpg",
      };

      const res = await request(app)
        .post("/api/playlists")
        .set("Authorization", `Bearer ${token}`)
        .send(payload);

      expect(res.status).toBe(201);
      expect(res.body).toMatchObject({
        name: payload.name,
        description: payload.description,
        coverImage: payload.coverImage,
        userId: userId,
      });
      expect(res.body.songs).toEqual([]);

      const dbPlaylist = await Playlist.findById(res.body._id);
      expect(dbPlaylist).not.toBeNull();
      expect(dbPlaylist.name).toBe(payload.name);
    });

    it("should reject creation when playlist name is missing or empty", async () => {
      const res = await request(app)
        .post("/api/playlists")
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "   " });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/name is required/i);
    });
  });

  describe("GET /api/playlists", () => {
    it("should retrieve all playlists belonging to the authenticated user", async () => {
      await Playlist.create([
        { name: "Playlist 1", userId },
        { name: "Playlist 2", userId },
      ]);

      const res = await request(app)
        .get("/api/playlists")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(2);
    });

    it("should support search filtering by name and description", async () => {
      await Playlist.create([
        { name: "Synthwave Sunset", description: "Retro 80s vibes", userId },
        { name: "Acoustic Morning", description: "Gentle folk tracks", userId },
      ]);

      const res = await request(app)
        .get("/api/playlists?search=Retro")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.length).toBe(1);
      expect(res.body[0].name).toBe("Synthwave Sunset");
    });
  });

  describe("GET /api/playlists/:id", () => {
    it("should return the playlist details for a valid ID", async () => {
      const playlist = await Playlist.create({
        name: "Deep Focus",
        userId,
      });

      const res = await request(app)
        .get(`/api/playlists/${playlist._id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Deep Focus");
    });

    it("should return 400 for an invalid ObjectId format", async () => {
      const res = await request(app)
        .get("/api/playlists/invalid-id-123")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid playlist id/i);
    });

    it("should return 404 if the playlist does not exist", async () => {
      const fakeId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .get(`/api/playlists/${fakeId}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  describe("PUT /api/playlists/:id", () => {
    it("should update playlist name, description, and cover image", async () => {
      const playlist = await Playlist.create({
        name: "Initial Name",
        description: "Initial description",
        userId,
      });

      const res = await request(app)
        .put(`/api/playlists/${playlist._id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          name: "Updated Name",
          description: "Updated description",
          coverImage: "https://example.com/new-cover.jpg",
        });

      expect(res.status).toBe(200);
      expect(res.body.name).toBe("Updated Name");
      expect(res.body.description).toBe("Updated description");
      expect(res.body.coverImage).toBe("https://example.com/new-cover.jpg");
    });

    it("should reject update if new name is empty", async () => {
      const playlist = await Playlist.create({ name: "Keep Me", userId });

      const res = await request(app)
        .put(`/api/playlists/${playlist._id}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ name: "   " });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/cannot be empty/i);
    });
  });

  describe("DELETE /api/playlists/:id", () => {
    it("should delete the playlist when requested by owner", async () => {
      const playlist = await Playlist.create({ name: "To Delete", userId });

      const res = await request(app)
        .delete(`/api/playlists/${playlist._id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toMatch(/deleted successfully/i);

      const checkDb = await Playlist.findById(playlist._id);
      expect(checkDb).toBeNull();
    });
  });
});
