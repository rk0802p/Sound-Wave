const request = require("supertest");
const app = require("../index");
const User = require("../models/User");
const Playlist = require("../models/Playlist");
const { connectTestDB, closeTestDB, clearTestDB } = require("./setup");
const {
  isValidYouTubeId,
  isValidSpotifyId,
  extractYouTubeId,
  extractSpotifyInfo,
  isDirectAudioUrl,
  parseMusicSource,
  fetchYouTubeMetadata,
  fetchSpotifyMetadata,
  resolveTrackMetadata,
} = require("../utils/musicLinkParser");

beforeAll(async () => {
  await connectTestDB();
});

afterAll(async () => {
  await closeTestDB();
});

describe("Music Provider Integration & Backward Compatibility Tests", () => {
  let token;
  let userBToken;
  let userId;
  let userBId;
  let testPlaylist;

  beforeEach(async () => {
    await clearTestDB();

    // Register User A
    const resA = await request(app).post("/api/auth/signup").send({
      username: "audiophile",
      email: "audiophile@soundwave.io",
      password: "Password123!",
    });
    token = resA.body.token;
    userId = resA.body.user.id;

    // Register User B
    const resB = await request(app).post("/api/auth/signup").send({
      username: "otherlistener",
      email: "other@soundwave.io",
      password: "Password123!",
    });
    userBToken = resB.body.token;
    userBId = resB.body.user.id;

    // Create a base playlist owned by User A
    const pRes = await request(app)
      .post("/api/playlists")
      .set("Authorization", `Bearer ${token}`)
      .send({
        name: "Provider Test Workstation",
        description: "Testing YouTube, Spotify, and Direct Audio sources",
      });

    testPlaylist = pRes.body;
  });

  describe("Unit: musicLinkParser Utility & Format Validation", () => {
    it("should correctly validate YouTube video IDs", () => {
      expect(isValidYouTubeId("dQw4w9WgXcQ")).toBe(true);
      expect(isValidYouTubeId("5qap5aO4i9A")).toBe(true);
      expect(isValidYouTubeId("invalid")).toBe(false); // too short
      expect(isValidYouTubeId("toolongvideoid123")).toBe(false); // too long
      expect(isValidYouTubeId("")).toBe(false);
      expect(isValidYouTubeId(null)).toBe(false);
    });

    it("should correctly validate Spotify track IDs", () => {
      expect(isValidSpotifyId("4cOdK2wGLETKBW3PvgPWqT")).toBe(true);
      expect(isValidSpotifyId("7ouMYWpwJ422jRcDASZB7P")).toBe(true);
      expect(isValidSpotifyId("shortid")).toBe(false); // too short
      expect(isValidSpotifyId("4cOdK2wGLETKBW3PvgPWqT123")).toBe(false); // too long
      expect(isValidSpotifyId("")).toBe(false);
      expect(isValidSpotifyId(null)).toBe(false);
    });

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
        expect(parsed.isValid).toBe(true);
      });
    });

    it("should reject malformed or truncated YouTube URLs", () => {
      const invalidUrls = [
        "https://www.youtube.com/watch?v=short",
        "https://youtu.be/",
        "https://www.youtube.com/embed/",
      ];

      invalidUrls.forEach((url) => {
        expect(extractYouTubeId(url)).toBeNull();
        const parsed = parseMusicSource(url);
        expect(parsed.provider).toBe("youtube");
        expect(parsed.isValid).toBe(false);
        expect(parsed.error).toContain("Invalid YouTube URL");
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
      expect(parsed.isValid).toBe(true);
    });

    it("should reject unsupported Spotify resource types or malformed IDs", () => {
      const artistUrl = "https://open.spotify.com/artist/4Z8W4fKeB5YxbusRsdQVPb";
      const malformedUrl = "https://open.spotify.com/track/badId";

      const parsedArtist = parseMusicSource(artistUrl);
      expect(parsedArtist.isValid).toBe(false);
      expect(parsedArtist.error).toContain("Only single tracks are supported");

      const parsedMalformed = parseMusicSource(malformedUrl);
      expect(parsedMalformed.isValid).toBe(false);
      expect(parsedMalformed.error).toContain("missing or malformed 22-character track ID");
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
        expect(parsed.isValid).toBe(true);
      });
    });
  });

  describe("Metadata Retrieval & Error Resilience", () => {
    it("should retrieve YouTube metadata via oEmbed for a known video", async () => {
      const meta = await fetchYouTubeMetadata("dQw4w9WgXcQ");
      expect(meta.isAvailable).toBe(true);
      expect(meta.title).toBeTruthy();
      expect(meta.artist).toBeTruthy();
      expect(meta.coverImage).toContain("hqdefault.jpg");
    });

    it("should retrieve Spotify metadata via oEmbed for a known track", async () => {
      const meta = await fetchSpotifyMetadata("4cOdK2wGLETKBW3PvgPWqT");
      expect(meta.isAvailable).toBe(true);
      expect(meta.title).toBeTruthy();
      expect(meta.coverImage).toBeTruthy();
    });

    it("should gracefully handle unavailable YouTube video IDs without crashing", async () => {
      const meta = await fetchYouTubeMetadata("invalid00000");
      expect(meta.isAvailable).toBe(false);
      expect(meta.error).toBeTruthy();
    });

    it("should gracefully handle unavailable Spotify track IDs without crashing", async () => {
      const meta = await fetchSpotifyMetadata("invalid0000000000000000");
      expect(meta.isAvailable).toBe(false);
      expect(meta.error).toBeTruthy();
    });
  });

  describe("GET /api/playlists/resolve/track (Metadata Resolution Endpoint)", () => {
    it("should resolve track info from a valid YouTube URL", async () => {
      const res = await request(app)
        .get("/api/playlists/resolve/track")
        .query({ url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ" })
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.provider).toBe("youtube");
      expect(res.body.externalId).toBe("dQw4w9WgXcQ");
      expect(res.body.title).toBeTruthy();
      expect(res.body.artist).toBeTruthy();
      expect(res.body.coverImage).toBeTruthy();
    });

    it("should resolve track info from a valid Spotify URL", async () => {
      const res = await request(app)
        .get("/api/playlists/resolve/track")
        .query({ url: "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT" })
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(200);
      expect(res.body.provider).toBe("spotify");
      expect(res.body.externalId).toBe("4cOdK2wGLETKBW3PvgPWqT");
      expect(res.body.title).toBeTruthy();
    });

    it("should reject resolution request without url parameter", async () => {
      const res = await request(app)
        .get("/api/playlists/resolve/track")
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("URL parameter is required");
    });

    it("should reject resolution request with invalid YouTube link", async () => {
      const res = await request(app)
        .get("/api/playlists/resolve/track")
        .query({ url: "https://www.youtube.com/watch?v=short" })
        .set("Authorization", `Bearer ${token}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Invalid YouTube URL");
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

    it("should auto-resolve title and artist when adding YouTube link with omitted titles", async () => {
      const ytUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
      const res = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          url: ytUrl,
        });

      expect(res.status).toBe(201);
      expect(res.body.addedSong.title).toBeTruthy();
      expect(res.body.addedSong.artist).toBeTruthy();
      expect(res.body.addedSong.source.provider).toBe("youtube");
    });

    it("should reject adding song with malformed YouTube video ID", async () => {
      const res = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Broken Track",
          artist: "Nobody",
          url: "https://www.youtube.com/watch?v=not11chars",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Invalid YouTube URL");
    });

    it("should reject adding song with malformed Spotify track ID", async () => {
      const res = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Broken Track",
          artist: "Nobody",
          url: "https://open.spotify.com/track/not22chars",
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toContain("Invalid Spotify URL");
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

    it("should detect duplicate Spotify songs by track ID", async () => {
      const spUrl1 = "https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT";
      const spUrl2 = "spotify:track:4cOdK2wGLETKBW3PvgPWqT";

      await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Track A",
          artist: "Artist A",
          url: spUrl1,
        });

      const dupRes = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Track A Alias",
          artist: "Artist A",
          url: spUrl2,
          allowDuplicate: false,
        });

      expect(dupRes.status).toBe(409);
      expect(dupRes.body.isDuplicate).toBe(true);
    });

    it("should allow duplicate song addition when allowDuplicate is true", async () => {
      const ytUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

      await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Rickroll",
          artist: "Rick Astley",
          url: ytUrl,
        });

      const dupRes = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Rickroll",
          artist: "Rick Astley",
          url: ytUrl,
          allowDuplicate: true,
        });

      expect(dupRes.status).toBe(201);
      expect(dupRes.body.playlist.songs.length).toBe(2);
    });

    it("should maintain backward-compatibility when reading legacy songs saved with url only", async () => {
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

    it("should support mixed-provider playlist with direct, YouTube, Spotify, and legacy tracks simultaneously", async () => {
      // 1. Add Direct Audio
      await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Direct OGG Track",
          artist: "Open Audio",
          url: "https://upload.wikimedia.org/wikipedia/commons/4/4b/Canon_in_D.ogg",
        });

      // 2. Add YouTube Track
      await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "YouTube Video Track",
          artist: "Rick Astley",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        });

      // 3. Add Spotify Track
      await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${token}`)
        .send({
          title: "Spotify Track",
          artist: "Muse",
          url: "https://open.spotify.com/track/7ouMYWpwJ422jRcDASZB7P",
        });

      // 4. Retrieve complete playlist
      const getRes = await request(app)
        .get(`/api/playlists/${testPlaylist._id}`)
        .set("Authorization", `Bearer ${token}`);

      expect(getRes.status).toBe(200);
      expect(getRes.body.songs.length).toBe(3);

      const providers = getRes.body.songs.map((s) => s.source.provider);
      expect(providers).toContain("direct");
      expect(providers).toContain("youtube");
      expect(providers).toContain("spotify");

      // Verify correct positions
      expect(getRes.body.songs[0].position).toBe(0);
      expect(getRes.body.songs[1].position).toBe(1);
      expect(getRes.body.songs[2].position).toBe(2);
    });

    it("should prevent User B from adding songs to User A's playlist (ownership enforcement)", async () => {
      const res = await request(app)
        .post(`/api/playlists/${testPlaylist._id}/songs`)
        .set("Authorization", `Bearer ${userBToken}`)
        .send({
          title: "Intruder Track",
          artist: "Intruder",
          url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        });

      expect(res.status).toBe(403);
      expect(res.body.message).toContain("Not authorized");
    });
  });
});
