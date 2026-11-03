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

describe("Granular Song Operations & Duplicate Detection Tests", () => {
  let token;
  let userId;
  let playlist;

  beforeEach(async () => {
    const signupRes = await request(app).post("/api/auth/signup").send({
      username: "songtester",
      email: "songtester@example.com",
      password: "Password123!",
    });
    token = signupRes.body.token;
    userId = signupRes.body.user.id;

    playlist = await Playlist.create({
      name: "Track Testing Playlist",
      userId,
      songs: [],
    });
  });

  describe("POST /api/playlists/:id/songs (Add Song)", () => {
    it("should add a song with complete metadata and assign position 0", async () => {
      const songData = {
        title: "Starboy",
        artist: "The Weeknd",
        album: "Starboy",
        duration: 230,
        url: "https://example.com/starboy.mp3",
        coverImage: "https://example.com/starboy.jpg",
      };

      const res = await request(app)
        .post(`/api/playlists/${playlist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send(songData);

      expect(res.status).toBe(201);
      expect(res.body.playlist.songs.length).toBe(1);
      expect(res.body.addedSong).toMatchObject({
        title: "Starboy",
        artist: "The Weeknd",
        album: "Starboy",
        duration: 230,
        position: 0,
      });

      // Verify virtual calculations
      const dbPlaylist = await Playlist.findById(playlist._id);
      expect(dbPlaylist.songCount).toBe(1);
      expect(dbPlaylist.totalDuration).toBe(230);
    });

    it("should assign incremental position 1 to the second song", async () => {
      await request(app)
        .post(`/api/playlists/${playlist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Song 1", artist: "Artist 1" });

      const res = await request(app)
        .post(`/api/playlists/${playlist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Song 2", artist: "Artist 2" });

      expect(res.status).toBe(201);
      expect(res.body.addedSong.position).toBe(1);
    });

    it("should reject adding song without title or artist (400)", async () => {
      const res = await request(app)
        .post(`/api/playlists/${playlist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/title is required/i);
    });

    it("should detect duplicate songs (case-insensitive) and return 409 Conflict", async () => {
      // Add first song
      await request(app)
        .post(`/api/playlists/${playlist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Blinding Lights", artist: "The Weeknd" });

      // Attempt to add duplicate with different case
      const res = await request(app)
        .post(`/api/playlists/${playlist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "  blinding lights  ", artist: "THE WEEKND" });

      expect(res.status).toBe(409);
      expect(res.body.isDuplicate).toBe(true);
      expect(res.body.message).toMatch(/already in this playlist/i);
    });

    it("should allow duplicate song addition when allowDuplicate is set to true", async () => {
      await request(app)
        .post(`/api/playlists/${playlist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Save Your Tears", artist: "The Weeknd" });

      const res = await request(app)
        .post(`/api/playlists/${playlist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Save Your Tears",
          artist: "The Weeknd",
          allowDuplicate: true,
        });

      expect(res.status).toBe(201);
      expect(res.body.playlist.songs.length).toBe(2);
    });
  });

  describe("PUT /api/playlists/:id/songs/:songId (Update Song)", () => {
    let songId;

    beforeEach(async () => {
      const addRes = await request(app)
        .post(`/api/playlists/${playlist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Original Title", artist: "Original Artist", duration: 150 });
      songId = addRes.body.addedSong._id;
    });

    it("should update song metadata", async () => {
      const res = await request(app)
        .put(`/api/playlists/${playlist._id}/songs/${songId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Remastered Title",
          duration: 180,
          album: "Greatest Hits",
        });

      expect(res.status).toBe(200);
      const updatedSong = res.body.songs.find((s) => s._id === songId);
      expect(updatedSong.title).toBe("Remastered Title");
      expect(updatedSong.artist).toBe("Original Artist");
      expect(updatedSong.duration).toBe(180);
      expect(updatedSong.album).toBe("Greatest Hits");
    });

    it("should return 400 for an invalid songId format", async () => {
      const res = await request(app)
        .put(`/api/playlists/${playlist._id}/songs/invalid-song-id`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "New Title" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/invalid song id/i);
    });

    it("should return 404 for a non-existent songId", async () => {
      const nonExistentId = new mongoose.Types.ObjectId();
      const res = await request(app)
        .put(`/api/playlists/${playlist._id}/songs/${nonExistentId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "New Title" });

      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/song not found/i);
    });
  });

  describe("DELETE /api/playlists/:id/songs/:songId (Delete Song)", () => {
    let s1Id, s2Id, s3Id;

    beforeEach(async () => {
      const r1 = await request(app)
        .post(`/api/playlists/${playlist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Track A", artist: "Artist A" });
      s1Id = r1.body.addedSong._id;

      const r2 = await request(app)
        .post(`/api/playlists/${playlist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Track B", artist: "Artist B" });
      s2Id = r2.body.addedSong._id;

      const r3 = await request(app)
        .post(`/api/playlists/${playlist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Track C", artist: "Artist C" });
      s3Id = r3.body.addedSong._id;
    });

    it("should remove the middle song and re-index remaining positions", async () => {
      const res = await request(app)
        .delete(`/api/playlists/${playlist._id}/songs/${s2Id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.playlist.songs.length).toBe(2);

      // Remaining songs should be s1 (pos 0) and s3 (pos 1)
      const remainingSongs = res.body.playlist.songs;
      expect(remainingSongs[0]._id).toBe(s1Id);
      expect(remainingSongs[0].position).toBe(0);

      expect(remainingSongs[1]._id).toBe(s3Id);
      expect(remainingSongs[1].position).toBe(1);
    });
  });

  describe("PUT /api/playlists/:id/songs/reorder (Song Reordering)", () => {
    let s1Id, s2Id, s3Id;

    beforeEach(async () => {
      const r1 = await request(app)
        .post(`/api/playlists/${playlist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Track 1", artist: "Artist 1" });
      s1Id = r1.body.addedSong._id;

      const r2 = await request(app)
        .post(`/api/playlists/${playlist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Track 2", artist: "Artist 2" });
      s2Id = r2.body.addedSong._id;

      const r3 = await request(app)
        .post(`/api/playlists/${playlist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({ title: "Track 3", artist: "Artist 3" });
      s3Id = r3.body.addedSong._id;
    });

    it("should reorder songs based on array of IDs and update position indices", async () => {
      // Desired order: [Track 3, Track 1, Track 2]
      const newOrder = [s3Id, s1Id, s2Id];

      const res = await request(app)
        .put(`/api/playlists/${playlist._id}/songs/reorder`)
        .set("Authorization", `Bearer ${token}`)
        .send({ songIds: newOrder });

      expect(res.status).toBe(200);
      const songs = res.body.playlist.songs;
      expect(songs[0]._id).toBe(s3Id);
      expect(songs[0].position).toBe(0);

      expect(songs[1]._id).toBe(s1Id);
      expect(songs[1].position).toBe(1);

      expect(songs[2]._id).toBe(s2Id);
      expect(songs[2].position).toBe(2);
    });

    it("should reject reordering when songIds is not an array", async () => {
      const res = await request(app)
        .put(`/api/playlists/${playlist._id}/songs/reorder`)
        .set("Authorization", `Bearer ${token}`)
        .send({ songIds: "invalid" });

      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/songIds array is required/i);
    });
  });
});
