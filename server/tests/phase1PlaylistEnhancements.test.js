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

describe("Phase 1: Backend Playlist Enhancements & Hardening Tests", () => {
  let userAToken, userAId;
  let userBToken, userBId;
  let testPlaylist;

  beforeEach(async () => {
    // Setup User A
    const signupA = await request(app).post("/api/auth/signup").send({
      username: "user_a",
      email: "user_a@example.com",
      password: "Password123!",
    });
    userAToken = signupA.body.token;
    userAId = signupA.body.user.id;

    // Setup User B
    const signupB = await request(app).post("/api/auth/signup").send({
      username: "user_b",
      email: "user_b@example.com",
      password: "Password123!",
    });
    userBToken = signupB.body.token;
    userBId = signupB.body.user.id;

    // Create a base private playlist for User A
    const plRes = await request(app)
      .post("/api/playlists")
      .set("Authorization", `Bearer ${userAToken}`)
      .send({
        name: "User A Private Playlist",
        description: "Private music collection",
        isPublic: false,
        songs: [
          {
            title: "First Track",
            artist: "Artist One",
            duration: 120,
            url: "https://example.com/track1.mp3",
          },
          {
            title: "Second Track",
            artist: "Artist Two",
            duration: 200,
            url: "https://example.com/track2.mp3",
          },
        ],
      });
    testPlaylist = plRes.body;
  });

  describe("Item 1 & Summary Mode: GET /api/playlists", () => {
    it("should return lightweight summary mode with summary=true", async () => {
      const res = await request(app)
        .get("/api/playlists?summary=true")
        .set("Authorization", `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBe(1);

      const summary = res.body[0];
      expect(summary._id).toBe(testPlaylist._id);
      expect(summary.name).toBe("User A Private Playlist");
      expect(summary.songCount).toBe(2);
      expect(summary.totalDurationMs).toBe((120 + 200) * 1000);
      expect(summary.totalDuration).toBe(320);
      expect(summary.isPublic).toBe(false);
      expect(summary.songs).toBeUndefined(); // summary mode omits full songs array
    });

    it("should return 404 to non-owner authenticated users for private playlists (hiding existence)", async () => {
      const res = await request(app)
        .get(`/api/playlists/${testPlaylist._id}`)
        .set("Authorization", `Bearer ${userBToken}`);

      expect(res.status).toBe(404);
      expect(res.body.code).toBe("NOT_FOUND");
      expect(res.body.message).toMatch(/Playlist not found/i);
    });

    it("should return 401 for unauthenticated requests to private playlists", async () => {
      const res = await request(app).get(`/api/playlists/${testPlaylist._id}`);

      expect(res.status).toBe(401);
      expect(res.body.code).toBe("AUTH_REQUIRED");
      expect(res.body.message).toMatch(/Authentication required/i);
    });
  });

  describe("Item 2 & 3: Provider Schema, Deezer, iTunes, and Preview Support", () => {
    it("should store provider and providerTrackId and preserve stream URL fallback", async () => {
      const res = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${userAToken}`)
        .send({
          title: "Jamendo Ambient",
          artist: "Creative Commons Artist",
          url: "https://www.jamendo.com/track/12345/ambient-space",
          duration: 180,
        });

      expect(res.status).toBe(201);
      expect(res.body.addedSong.provider).toBe("jamendo");
      expect(res.body.addedSong.providerTrackId).toBe("12345");
      expect(res.body.addedSong.url).toBe("https://www.jamendo.com/track/12345/ambient-space");
    });

    it("should support Deezer tracks with isPreview: true and previewDurationMs: 30000", async () => {
      const res = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${userAToken}`)
        .send({
          title: "Deezer Song",
          artist: "French Artist",
          url: "https://www.deezer.com/track/3135556",
          duration: 30,
        });

      expect(res.status).toBe(201);
      expect(res.body.addedSong.provider).toBe("deezer");
      expect(res.body.addedSong.providerTrackId).toBe("3135556");
      expect(res.body.addedSong.isPreview).toBe(true);
      expect(res.body.addedSong.previewDurationMs).toBe(30000);
    });

    it("should support iTunes tracks with isPreview: true and previewDurationMs: 30000", async () => {
      const res = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${userAToken}`)
        .send({
          title: "Apple Song",
          artist: "Cupertino Artist",
          url: "https://music.apple.com/album/song-title/102531908?i=102531910",
          duration: 30,
        });

      expect(res.status).toBe(201);
      expect(res.body.addedSong.provider).toBe("itunes");
      expect(res.body.addedSong.providerTrackId).toBe("102531910");
      expect(res.body.addedSong.isPreview).toBe(true);
      expect(res.body.addedSong.previewDurationMs).toBe(30000);
    });
  });

  describe("Item 4: Batch Add Songs (POST /api/playlists/:id/songs/batch)", () => {
    it("should successfully batch add up to 50 songs and report added, duplicates, and failures", async () => {
      const batchPayload = {
        songs: [
          { title: "Batch Song 1", artist: "Artist A", duration: 100 },
          { title: "First Track", artist: "Artist One" }, // Duplicate of existing
          { title: "", artist: "" }, // Failure (missing fields)
          { title: "Batch Song 2", artist: "Artist B", duration: 150 },
        ],
      };

      const res = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs/batch`)
        .set("Authorization", `Bearer ${userAToken}`)
        .send(batchPayload);

      expect(res.status).toBe(201);
      expect(res.body.added.length).toBe(2);
      expect(res.body.duplicates.length).toBe(1);
      expect(res.body.failures.length).toBe(1);
      expect(res.body.duplicates[0].code).toBe("DUPLICATE_TRACK");

      // Verify playlist total songs is now 4 (2 initial + 2 added)
      const dbPlaylist = await Playlist.findById(testPlaylist._id);
      expect(dbPlaylist.songs.length).toBe(4);
    });

    it("should reject batch add with more than 50 songs with LIMIT_REACHED", async () => {
      const oversizedBatch = Array.from({ length: 51 }, (_, i) => ({
        title: `Song ${i}`,
        artist: `Artist ${i}`,
      }));

      const res = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs/batch`)
        .set("Authorization", `Bearer ${userAToken}`)
        .send({ songs: oversizedBatch });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("LIMIT_REACHED");
      expect(res.body.message).toMatch(/cannot exceed 50 songs/i);
    });

    it("should reject batch add from non-owner with 403 FORBIDDEN", async () => {
      const res = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs/batch`)
        .set("Authorization", `Bearer ${userBToken}`)
        .send({ songs: [{ title: "Intruder Track", artist: "Intruder" }] });

      expect(res.status).toBe(403);
      expect(res.body.code).toBe("FORBIDDEN");
    });
  });

  describe("Item 5: Insert at Position (addSong with optional position)", () => {
    it("should insert a track at position 1 and re-index following tracks", async () => {
      // testPlaylist currently has 2 songs: index 0 ("First Track") and index 1 ("Second Track")
      const res = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${userAToken}`)
        .send({
          title: "Inserted Middle Track",
          artist: "Middle Artist",
          position: 1,
        });

      expect(res.status).toBe(201);
      const songs = res.body.playlist.songs;
      expect(songs.length).toBe(3);

      expect(songs[0].title).toBe("First Track");
      expect(songs[0].position).toBe(0);

      expect(songs[1].title).toBe("Inserted Middle Track");
      expect(songs[1].position).toBe(1);

      expect(songs[2].title).toBe("Second Track");
      expect(songs[2].position).toBe(2);
    });

    it("should simulate undo-delete by restoring removed song at its original position", async () => {
      // 1. Remove song at index 0 ("First Track")
      const songToRemoveId = testPlaylist.songs[0]._id;
      const originalTitle = testPlaylist.songs[0].title;
      const originalArtist = testPlaylist.songs[0].artist;

      const deleteRes = await request(app)
        .delete(`/api/playlists/${testPlaylist._id}/songs/${songToRemoveId}`)
        .set("Authorization", `Bearer ${userAToken}`);

      expect(deleteRes.status).toBe(200);
      expect(deleteRes.body.playlist.songs.length).toBe(1);
      expect(deleteRes.body.playlist.songs[0].position).toBe(0);

      // 2. Undo: insert back at position 0
      const restoreRes = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${userAToken}`)
        .send({
          title: originalTitle,
          artist: originalArtist,
          position: 0,
        });

      expect(restoreRes.status).toBe(201);
      const restoredSongs = restoreRes.body.playlist.songs;
      expect(restoredSongs.length).toBe(2);
      expect(restoredSongs[0].title).toBe(originalTitle);
      expect(restoredSongs[0].position).toBe(0);
      expect(restoredSongs[1].title).toBe("Second Track");
      expect(restoredSongs[1].position).toBe(1);
    });
  });

  describe("Item 6: Duplicate Playlist Endpoint (POST /api/playlists/:id/duplicate)", () => {
    it("should allow owner to duplicate their playlist", async () => {
      const res = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/duplicate`)
        .set("Authorization", `Bearer ${userAToken}`)
        .send();

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("User A Private Playlist (Copy)");
      expect(res.body.userId).toBe(userAId);
      expect(res.body.isPublic).toBe(false);
      expect(res.body.songs.length).toBe(2);
      expect(res.body._id).not.toBe(testPlaylist._id);
    });

    it("should support custom name when duplicating", async () => {
      const res = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/duplicate`)
        .set("Authorization", `Bearer ${userAToken}`)
        .send({ name: "Custom Duplicate Title" });

      expect(res.status).toBe(201);
      expect(res.body.name).toBe("Custom Duplicate Title");
    });

    it("should return 404 to non-owner attempting to duplicate a private playlist", async () => {
      const res = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/duplicate`)
        .set("Authorization", `Bearer ${userBToken}`)
        .send();

      expect(res.status).toBe(404);
      expect(res.body.code).toBe("NOT_FOUND");
    });

    it("should allow user B to duplicate a public playlist into their own library", async () => {
      // Make user A playlist public
      await Playlist.findByIdAndUpdate(testPlaylist._id, { isPublic: true });

      const res = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/duplicate`)
        .set("Authorization", `Bearer ${userBToken}`)
        .send({ name: "User B Duplicate of A" });

      expect(res.status).toBe(201);
      expect(res.body.userId).toBe(userBId);
      expect(res.body.name).toBe("User B Duplicate of A");
      expect(res.body.isPublic).toBe(false);
      expect(res.body.songs.length).toBe(2);
    });
  });

  describe("Item 7: Validation Limits & Enforcement", () => {
    it("should reject playlist name exceeding 80 characters with LIMIT_REACHED", async () => {
      const longName = "A".repeat(81);
      const res = await request(app)
        .post("/api/playlists")
        .set("Authorization", `Bearer ${userAToken}`)
        .send({ name: longName });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("LIMIT_REACHED");
      expect(res.body.message).toMatch(/cannot exceed 80 characters/i);
    });

    it("should reject playlist description exceeding 300 characters with LIMIT_REACHED", async () => {
      const longDesc = "D".repeat(301);
      const res = await request(app)
        .post("/api/playlists")
        .set("Authorization", `Bearer ${userAToken}`)
        .send({ name: "Valid Name", description: longDesc });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("LIMIT_REACHED");
      expect(res.body.message).toMatch(/cannot exceed 300 characters/i);
    });

    it("should reject playlist creation when user reaches 100 playlists limit", async () => {
      // Create 99 more playlists for User A (already has 1 from beforeEach)
      const fakePlaylists = Array.from({ length: 99 }, (_, i) => ({
        name: `Filler Playlist ${i}`,
        userId: userAId,
      }));
      await Playlist.insertMany(fakePlaylists);

      const count = await Playlist.countDocuments({ userId: userAId });
      expect(count).toBe(100);

      // Attempt to create 101st playlist
      const res = await request(app)
        .post("/api/playlists")
        .set("Authorization", `Bearer ${userAToken}`)
        .send({ name: "101st Playlist" });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("LIMIT_REACHED");
      expect(res.body.message).toMatch(/maximum 100 playlists/i);
    });

    it("should reject adding more than 1,000 songs to a single playlist", async () => {
      // Populate playlist with 1,000 songs
      const songs = Array.from({ length: 1000 }, (_, i) => ({
        title: `Song ${i}`,
        artist: `Artist ${i}`,
        position: i,
      }));

      await Playlist.findByIdAndUpdate(testPlaylist._id, { songs });

      // Attempt to add 1001st song
      const res = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${userAToken}`)
        .send({ title: "One Too Many", artist: "Over Limit" });

      expect(res.status).toBe(400);
      expect(res.body.code).toBe("LIMIT_REACHED");
      expect(res.body.message).toMatch(/maximum 1,000 songs/i);
    });
  });

  describe("Item 8: Consistent Response Format & Standard Error Codes", () => {
    it("should return consistent error shape on duplicate song addition", async () => {
      const res = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${userAToken}`)
        .send({
          title: "First Track",
          artist: "Artist One",
        });

      expect(res.status).toBe(409);
      expect(res.body.isDuplicate).toBe(true);
      expect(res.body.code).toBe("DUPLICATE_TRACK");
      expect(res.body.message).toBeDefined();
      expect(res.body.existingSong).toBeDefined();
    });

    it("should return consistent song mutation response on updateSong", async () => {
      const songId = testPlaylist.songs[0]._id;
      const res = await request(app)
        .put(`/api/playlists/${testPlaylist._id}/songs/${songId}`)
        .set("Authorization", `Bearer ${userAToken}`)
        .send({ title: "Updated First Track", duration: 150 });

      expect(res.status).toBe(200);
      expect(res.body.updatedSong).toBeDefined();
      expect(res.body.updatedSong.title).toBe("Updated First Track");
      expect(res.body.playlist).toBeDefined();
      expect(res.body.message).toMatch(/Song updated successfully/i);
    });

    it("should return consistent song mutation response on deleteSong", async () => {
      const songId = testPlaylist.songs[0]._id;
      const res = await request(app)
        .delete(`/api/playlists/${testPlaylist._id}/songs/${songId}`)
        .set("Authorization", `Bearer ${userAToken}`);

      expect(res.status).toBe(200);
      expect(res.body.deletedSong).toBeDefined();
      expect(res.body.playlist).toBeDefined();
      expect(res.body.message).toMatch(/Song removed successfully/i);
    });
  });

  describe("Edge Cases & Hardened Boundaries", () => {
    it("should handle batch adding 50 songs when playlist has 970 songs (30 added, 20 rejected with LIMIT_REACHED)", async () => {
      // 1. Populate playlist with 970 songs
      const initial970 = Array.from({ length: 970 }, (_, i) => ({
        title: `Existing Track ${i}`,
        artist: "Test Catalog",
        position: i,
      }));
      await Playlist.findByIdAndUpdate(testPlaylist._id, { songs: initial970 });

      // 2. Batch add 50 songs
      const batch50 = Array.from({ length: 50 }, (_, i) => ({
        title: `New Batch Song ${i}`,
        artist: "Batch Artist",
        duration: 100,
      }));

      const res = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs/batch`)
        .set("Authorization", `Bearer ${userAToken}`)
        .send({ songs: batch50 });

      expect(res.status).toBe(201);
      expect(res.body.added.length).toBe(30);
      expect(res.body.failures.length).toBe(20);
      expect(res.body.failures[0].code).toBe("LIMIT_REACHED");

      const dbPlaylist = await Playlist.findById(testPlaylist._id);
      expect(dbPlaylist.songs.length).toBe(1000);
    });

    it("should not treat songs from different providers as duplicates even if externalIds are identical", async () => {
      // Add Deezer song with externalId "99999"
      const resDeezer = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${userAToken}`)
        .send({
          title: "Deezer Exclusive",
          artist: "Deezer Artist",
          url: "https://www.deezer.com/track/99999",
        });
      expect(resDeezer.status).toBe(201);
      expect(resDeezer.body.addedSong.provider).toBe("deezer");
      expect(resDeezer.body.addedSong.providerTrackId).toBe("99999");

      // Add Jamendo song with different title/artist but same numeric track ID "99999"
      const resJamendo = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${userAToken}`)
        .send({
          title: "Jamendo Independent",
          artist: "Jamendo Artist",
          url: "https://www.jamendo.com/track/99999/different-song",
        });
      expect(resJamendo.status).toBe(201);
      expect(resJamendo.body.addedSong.provider).toBe("jamendo");
      expect(resJamendo.body.addedSong.providerTrackId).toBe("99999");
    });

    it("should correctly throttle requests when writeRateLimiter is active", async () => {
      const writeRateLimiter = require("../middleware/writeRateLimiter");
      const limiter = writeRateLimiter({ windowMs: 10000, maxRequests: 2, bypassInTest: false });

      const mockReq = { ip: "127.0.0.1", user: { id: "test_limiter_user" } };
      let statusCode = null;
      let responseBody = null;
      const mockRes = {
        status: (code) => {
          statusCode = code;
          return {
            json: (body) => { responseBody = body; },
          };
        },
      };

      let nextCalled = 0;
      const nextFn = () => { nextCalled += 1; };

      limiter(mockReq, mockRes, nextFn); // 1st request -> pass
      limiter(mockReq, mockRes, nextFn); // 2nd request -> pass
      limiter(mockReq, mockRes, nextFn); // 3rd request -> throttled!

      expect(nextCalled).toBe(2);
      expect(statusCode).toBe(429);
      expect(responseBody.code).toBe("LIMIT_REACHED");
    });
  });
});

