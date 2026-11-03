const request = require("supertest");
const app = require("../index");
const User = require("../models/User");
const Playlist = require("../models/Playlist");
const { connectTestDB, closeTestDB, clearTestDB } = require("./setup");
const {
  extractYouTubeId,
  extractSpotifyInfo,
  isDirectAudioUrl,
  parseMusicSource,
} = require("../utils/musicLinkParser");

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

describe("Music Provider Integration & Backward Compatibility Tests", () => {
  let token;
  let userId;
  let testPlaylist;

  beforeEach(async () => {
    await clearTestDB();

    // Register and authenticate user
    const res = await request(app).post("/api/auth/signup").send({
      username: "audiophile",
      email: "audiophile@soundwave.io",
      password: "Password123!",
    });

    token = res.body.token;
    userId = res.body.user.id;

    // Create a base playlist
    const pRes = await request(app)
      .post("/api/playlists")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Provider Test Workstation",
        description: "Testing YouTube, Spotify, and Direct Audio sources",
      });

    testPlaylist = pRes.body;
  });

  describe("Unit: musicLinkParser Utility", () => {
    it("should correctly extract YouTube video IDs from various formats", () => {
      const urls = [
        "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        "https://youtube.com/watch?v=dQw4w9WgXcQ&feature=share",
        "https://youtu.be/dQw4w9WgXcQ?t=42",
        "https://www.youtube.com/embed/dQw4w9WgXcQ",
        "https://www.youtube.com/shorts/dQw4w9WgXcQ",
      ];

      urls.forEach((url) => {
        expect(extractYouTubeId(url)).toBe("dQw4w9WgXcQ");
        const parsed = parseMusicSource(url);
        expect(parsed.provider).toBe("youtube");
        expect(parsed.externalId).toBe("dQw4w9WgXcQ");
      });
    });

    it("should correctly extract Spotify track IDs from web URLs and URIs", () => {
      const trackUrl = "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=abc123";
      const uri = "spotify:track:4cOdK2wGLETKBW3PvgPWqT";

      const info1 = extractSpotifyInfo(trackUrl);
      expect(info1).toEqual({ type: "track", id: "4cOdK2wGLETKBW3PvgPWqT" });

      const info2 = extractSpotifyInfo(uri);
      expect(info2).toEqual({ type: "track", id: "4cOdK2wGLETKBW3PvgPWqT" });

      const parsed = parseMusicSource(trackUrl);
      expect(parsed.provider).toBe("spotify");
      expect(parsed.externalId).toBe("4cOdK2wGLETKBW3PvgPWqT");
    });

    it("should identify direct audio stream URLs", () => {
      const directUrls = [
        "https://example.com/audio/track.mp3",
        "https://cdn.soundwave.io/audio/song.ogg",
        "https://example.com/song.wav",
        "https://example.com/stream.flac",
        "https://upload.wikimedia.org/wikipedia/commons/4/4b/Canon_in_D.ogg",
      ];

      directUrls.forEach((url) => {
        expect(isDirectAudioUrl(url)).toBe(true);
        const parsed = parseMusicSource(url);
        expect(parsed.provider).toBe("direct");
        expect(parsed.externalId).toBeNull();
      });
    });
  });

  describe("Integration: Playlist Song Operations with Multi-Provider Support", () => {
    it("should add a YouTube track and store both url and source object", async () => {
      const ytUrl = "https://www.youtube.com/watch?v=5qap5aO4i9A";
      const res = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Lofi Hip Hop Radio",
          artist: "Lofi Girl",
          url: ytUrl,
          duration: 3600,
        });

      expect(res.status).toBe(201);
      expect(res.body.addedSong).toBeDefined();
      expect(res.body.addedSong.url).toBe(ytUrl);
      expect(res.body.addedSong.source).toBeDefined();
      expect(res.body.addedSong.source.provider).toBe("youtube");
      expect(res.body.addedSong.source.externalId).toBe("5qap5aO4i9A");
    });

    it("should add a Spotify track and populate source object", async () => {
      const spUrl = "https://open.spotify.com/track/7ouMYWpwJ422jRcDASZB7P";
      const res = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Knights of Cydonia",
          artist: "Muse",
          url: spUrl,
          duration: 366,
        });

      expect(res.status).toBe(201);
      expect(res.body.addedSong.source.provider).toBe("spotify");
      expect(res.body.addedSong.source.externalId).toBe("7ouMYWpwJ422jRcDASZB7P");
      expect(res.body.addedSong.url).toBe(spUrl);
    });

    it("should add a Direct Audio track with provider 'direct'", async () => {
      const directUrl = "https://upload.wikimedia.org/wikipedia/commons/4/4b/Canon_in_D.ogg";
      const res = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Canon in D Major",
          artist: "Johann Pachelbel",
          url: directUrl,
          duration: 172,
        });

      expect(res.status).toBe(201);
      expect(res.body.addedSong.source.provider).toBe("direct");
      expect(res.body.addedSong.source.externalId).toBeNull();
      expect(res.body.addedSong.url).toBe(directUrl);
    });

    it("should detect duplicate songs by provider externalId", async () => {
      const ytUrl1 = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
      const ytUrl2 = "https://youtu.be/dQw4w9WgXcQ"; // Same video, different URL format

      await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Never Gonna Give You Up",
          artist: "Rick Astley",
          url: ytUrl1,
        });

      // Attempt to add with different title but identical external ID
      const dupRes = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Rickroll Classic",
          artist: "Rick Astley",
          url: ytUrl2,
          allowDuplicate: false,
        });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.isDuplicate).toBe(true);
    });

    it("should maintain backward-compatibility when reading songs saved with legacy format (url only)", async () => {
      // Direct raw DB insert simulating an old MongoDB document created before provider integration
      await Playlist.findByIdAndUpdate(testPlaylist._id, {
        $push: {
          songs: {
            title: "Legacy Vinyl Track",
            artist: "Vintage Artist",
            album: "Ancient Recordings",
            duration: 210,
            position: 0,
            url: "https://www.youtube.com/watch?v=kJQP7kiw5Fk",
            coverImage: "https://example.com/art.jpg",
          },
        },
      });

      const res = await request(app)
        .get(`/api/playlists/${testPlaylist._id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      const legacySong = res.body.songs.find((s) => s.title === "Legacy Vinyl Track");
      expect(legacySong).toBeDefined();
      expect(legacySong.url).toBe("https://www.youtube.com/watch?v=kJQP7kiw5Fk");
      // Hydrated on retrieval
      expect(legacySong.source).toBeDefined();
      expect(legacySong.source.provider).toBe("youtube");
      expect(legacySong.source.externalId).toBe("kJQP7kiw5Fk");
    });

    it("should allow updating song provider link", async () => {
      const addRes = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Multi-Source Track",
          artist: "Experimental Artist",
          url: "https://example.com/audio.mp3",
        });

      const songId = addRes.body.addedSong._id;

      // Update to YouTube
      const updateRes = await request(app)
        .put(`/api/playlists/${testPlaylist._id}/songs/${songId}`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          url: "https://www.youtube.com/watch?v=3JZ_D3ELwOQ",
        });

      expect(updateRes.status).toBe(200);
      const updatedSong = updateRes.body.songs.id
        ? updateRes.body.songs.id(songId)
        : updateRes.body.songs.find((s) => s._id === songId);
      expect(updatedSong.source.provider).toBe("youtube");
      expect(updatedSong.source.externalId).toBe("3JZ_D3ELwOQ");
    });
  });
});
