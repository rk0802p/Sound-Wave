const request = require('supertest');
const app = require('../index');
const registry = require('../providers/ProviderRegistry');
const Playlist = require('../models/Playlist');
const User = require('../models/User');
const { connectTestDB, closeTestDB, clearTestDB } = require('./setup');

describe('SOUNDWAVE Multi-Source Music Aggregation & Resilience Tests', () => {
  let authToken;
  let testUserId;
  let originalFetch;

  beforeAll(async () => {
    await connectTestDB();
    originalFetch = global.fetch;

    // Create test user for playlist persistence tests
    const userRes = await request(app).post('/api/auth/signup').send({
      username: 'multi_curator',
      email: 'multi_curator@soundwave.internal',
      password: 'password123',
    });
    authToken = userRes.body.token;
    testUserId = userRes.body.user.id;
  });

  afterAll(async () => {
    await closeTestDB();
    global.fetch = originalFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('GET /api/search/providers (Provider Health & Registration)', () => {
    it('should list all registered music providers with their health state', async () => {
      const res = await request(app).get('/api/search/providers');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.providers)).toBe(true);

      const names = res.body.providers.map((p) => p.name);
      expect(names).toContain('archive');
      expect(names).toContain('jamendo');
      expect(names).toContain('audius');

      const archive = res.body.providers.find((p) => p.name === 'archive');
      expect(archive.isConfigured).toBe(true);
      expect(archive.status).toBe('available');
    });
  });

  describe('Unified Search Execution & Fault Isolation', () => {
    it('should reject search without query parameter (400)', async () => {
      const res = await request(app).get('/api/search');
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Search query parameter 'q' is required/i);
    });

    it('Scenario 1 & 2: should return Internet Archive results when Jamendo rate-limits or fails', async () => {
      // Mock fetch: Internet Archive succeeds, Jamendo returns rate limit warning
      global.fetch = jest.fn(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes('archive.org/advancedsearch.php')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              response: {
                docs: [
                  {
                    identifier: 'mozart_symphony_40',
                    title: 'Symphony No. 40 in G minor',
                    creator: 'Wolfgang Amadeus Mozart',
                    licenseurl: 'https://creativecommons.org/publicdomain/mark/1.0/',
                  },
                ],
              },
            }),
          };
        }
        if (urlStr.includes('archive.org/metadata/')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              result: [
                {
                  name: 'symphony40.mp3',
                  format: 'VBR MP3',
                  length: '320.5',
                  title: 'Symphony No. 40 in G minor',
                },
              ],
            }),
          };
        }
        if (urlStr.includes('jamendo.com')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              headers: {
                status: 'success',
                warnings: 'Usage limits are exceeded for this request',
                results_count: 0,
              },
              results: [],
            }),
          };
        }
        return { ok: false, status: 500, json: async () => ({}) };
      });

      // Temporarily mark jamendo configured to test rate limit resilience
      const jamendo = registry.get('jamendo');
      const origConfig = jamendo.isConfigured;
      jamendo.isConfigured = () => true;

      try {
        const res = await request(app).get('/api/search?q=mozart');
        expect(res.status).toBe(200);
        expect(res.body.query).toBe('mozart');
        expect(res.body.results.length).toBeGreaterThanOrEqual(1);

        const first = res.body.results[0];
        expect(first.provider).toBe('archive');
        expect(first.title).toBe('Symphony No. 40 in G minor');
        expect(first.artist).toBe('Wolfgang Amadeus Mozart');
        expect(first.streamUrl).toContain('archive.org/download/mozart_symphony_40');
        expect(first.playbackCapabilities.canSeek).toBe(true);

        // Jamendo rate limit must be isolated
        expect(res.body.providers.jamendo.status).toBe('rate_limited');
        expect(res.body.providers.archive.status).toBe('available');
      } finally {
        jamendo.isConfigured = origConfig;
      }
    });

    it('Scenario 3 & 10: should cleanly skip unconfigured providers without throwing errors', async () => {
      // Audius is unconfigured by default
      const audius = registry.get('audius');
      expect(audius.isConfigured()).toBe(false);

      global.fetch = jest.fn(async (url) => {
        if (String(url).includes('archive.org/advancedsearch.php')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              response: {
                docs: [
                  { identifier: 'bach_fugue', title: 'Little Fugue in G minor', creator: 'J.S. Bach' },
                ],
              },
            }),
          };
        }
        return { ok: true, status: 200, json: async () => ({ result: [] }) };
      });

      const res = await request(app).get('/api/search?q=bach');
      expect(res.status).toBe(200);
      expect(res.body.providers.audius.status).toBe('unconfigured');
      expect(res.body.providers.audius.count).toBe(0);
    });

    it('Scenario 4: should handle provider timeout without hanging or failing the whole search', async () => {
      global.fetch = jest.fn(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes('archive.org')) {
          // Simulate timeout via AbortError
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          throw err;
        }
        if (urlStr.includes('jamendo.com')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              headers: { status: 'success' },
              results: [
                {
                  id: 101,
                  name: 'Resilient Jamendo Beat',
                  artist_name: 'Electro Artist',
                  audio: 'https://mp3d.jamendo.com/track/101.mp3',
                  duration: 180,
                },
              ],
            }),
          };
        }
        return { ok: false, status: 500 };
      });

      const jamendo = registry.get('jamendo');
      const origConfig = jamendo.isConfigured;
      jamendo.isConfigured = () => true;

      try {
        const res = await request(app).get('/api/search?q=resilience');
        expect(res.status).toBe(200);
        expect(res.body.providers.archive.status).toBe('degraded');
        expect(res.body.providers.jamendo.count).toBe(1);
        expect(res.body.results[0].provider).toBe('jamendo');
      } finally {
        jamendo.isConfigured = origConfig;
      }
    });

    it('Scenario 6: should conservatively deduplicate identical recordings and attach alternatives', async () => {
      // Simulate two providers returning the exact same recording
      const sampleTracks = [
        {
          id: 'archive:beethoven_ode_to_joy',
          title: 'Ode to Joy',
          artist: 'Ludwig van Beethoven',
          duration: 240,
          provider: 'archive',
          providerTrackId: 'beethoven_ode_to_joy',
          streamUrl: 'https://archive.org/download/ode.mp3',
          license: 'Public Domain',
          attribution: 'Internet Archive',
        },
        {
          id: 'jamendo:999',
          title: 'Ode To Joy',
          artist: 'Ludwig van Beethoven',
          duration: 242, // within 6s
          provider: 'jamendo',
          providerTrackId: '999',
          streamUrl: 'https://mp3d.jamendo.com/999.mp3',
          license: 'CC BY',
          attribution: 'Jamendo',
        },
        {
          id: 'archive:beethoven_ode_remix',
          title: 'Ode to Joy (Synthwave Remix)', // Distinct variant
          artist: 'Ludwig van Beethoven',
          duration: 240,
          provider: 'archive',
          providerTrackId: 'beethoven_ode_remix',
          streamUrl: 'https://archive.org/download/remix.mp3',
        },
      ];

      const deduplicated = registry.deduplicateTracks(sampleTracks);
      // The exact same recording is merged with alternatives; the remix is preserved!
      expect(deduplicated.length).toBe(2);

      const primary = deduplicated.find((t) => t.title === 'Ode to Joy');
      expect(primary.alternatives.length).toBe(1);
      expect(primary.alternatives[0].provider).toBe('jamendo');
      expect(primary.alternatives[0].streamUrl).toBe('https://mp3d.jamendo.com/999.mp3');

      const remix = deduplicated.find((t) => t.title.includes('Remix'));
      expect(remix).toBeDefined();
    });

    it('Scenario 9: should return clean empty structure when all providers fail or return zero results', async () => {
      global.fetch = jest.fn(async () => {
        throw new Error('Connection refused by remote host');
      });

      const res = await request(app).get('/api/search?q=unknown_phantom_track');
      expect(res.status).toBe(200);
      expect(res.body.results).toEqual([]);
      expect(res.body.totalResults).toBe(0);
      expect(res.body.providers.archive.status).toBe('unavailable');
    });
  });

  describe('GET /api/search/resolve (On-Demand Playback Resolution)', () => {
    it('should reject resolution without provider or trackId (400)', async () => {
      const res = await request(app).get('/api/search/resolve');
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/required/i);
    });

    it('Scenario 7: should resolve stream URL on demand for Internet Archive track', async () => {
      global.fetch = jest.fn(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes('archive.org/metadata/test_item/files')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              result: [
                {
                  name: 'track.mp3',
                  format: 'VBR MP3',
                  length: '185',
                },
              ],
            }),
          };
        }
        if (urlStr.includes('archive.org/metadata/test_item')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              metadata: {
                identifier: 'test_item',
                title: 'Resolved Item Title',
                creator: 'Resolved Creator',
              },
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      const res = await request(app).get('/api/search/resolve?provider=archive&trackId=test_item');
      expect(res.status).toBe(200);
      expect(res.body.provider).toBe('archive');
      expect(res.body.streamUrl).toBe('https://archive.org/download/test_item/track.mp3');
      expect(res.body.metadata.duration).toBe(185);
    });

    it('should return 404 when track cannot be resolved by provider', async () => {
      global.fetch = jest.fn(async () => ({ ok: false, status: 404 }));
      const res = await request(app).get('/api/search/resolve?provider=archive&trackId=non_existent');
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not found/i);
    });
  });

  describe('Scenario 8 & 12: Mixed-Provider Playlist Persistence & Zero Audio Storage', () => {
    let playlistId;

    it('should allow adding multi-source tracks (Archive, Jamendo) to user playlist', async () => {
      const createRes = await request(app)
        .post('/api/playlists')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Multi-Source Aggregation Archive',
          description: 'Testing mixed online providers',
        });
      expect(createRes.status).toBe(201);
      playlistId = createRes.body._id;

      // 1. Add Internet Archive track
      const addArchiveRes = await request(app)
        .post(`/api/playlists/${playlistId}/songs`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Canon in D',
          artist: 'Johann Pachelbel',
          url: 'https://archive.org/download/pachelbel_canon/canon.mp3',
          source: {
            provider: 'archive',
            externalId: 'pachelbel_canon',
            url: 'https://archive.org/download/pachelbel_canon/canon.mp3',
          },
          duration: 310,
          license: 'Creative Commons Public Domain',
          attribution: 'Internet Archive',
        });
      expect(addArchiveRes.status).toBe(201);
      expect(addArchiveRes.body.addedSong.source.provider).toBe('archive');
      expect(addArchiveRes.body.addedSong.source.externalId).toBe('pachelbel_canon');
      expect(addArchiveRes.body.addedSong.attribution).toBe('Internet Archive');

      // 2. Add Jamendo track
      const addJamendoRes = await request(app)
        .post(`/api/playlists/${playlistId}/songs`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Acoustic Morning',
          artist: 'Sunny Days',
          url: 'https://mp3d.jamendo.com/track/88812.mp3',
          source: {
            provider: 'jamendo',
            externalId: '88812',
            url: 'https://mp3d.jamendo.com/track/88812.mp3',
          },
          duration: 195,
          license: 'CC BY-NC',
          attribution: 'Jamendo Music',
        });
      expect(addJamendoRes.status).toBe(201);
      expect(addJamendoRes.body.addedSong.source.provider).toBe('jamendo');
    });

    it('should restore playlist and preserve provider identity and metadata', async () => {
      const res = await request(app)
        .get(`/api/playlists/${playlistId}`)
        .set('Authorization', `Bearer ${authToken}`);

      expect(res.status).toBe(200);
      expect(res.body.songs.length).toBe(2);

      const s1 = res.body.songs[0];
      expect(s1.source.provider).toBe('archive');
      expect(s1.source.externalId).toBe('pachelbel_canon');
      expect(s1.duration).toBe(310);

      const s2 = res.body.songs[1];
      expect(s2.source.provider).toBe('jamendo');
      expect(s2.source.externalId).toBe('88812');
      expect(s2.duration).toBe(195);
    });

    it('Scenario 12 Verification: MongoDB must NOT store audio buffers, blobs, or files', async () => {
      const rawPlaylist = await Playlist.findById(playlistId).lean();
      for (const song of rawPlaylist.songs) {
        expect(song.audioData).toBeUndefined();
        expect(song.blob).toBeUndefined();
        expect(song.buffer).toBeUndefined();
        expect(song.base64).toBeUndefined();
        // URLs must be remote HTTP/HTTPS references only
        expect(song.url).toMatch(/^https?:\/\//);
      }
    });
  });

  describe('Scenario 11: Core Platform Independence', () => {
    it('should preserve authentication, user profile, and core playlist CRUD even if external providers are down', async () => {
      // Intentionally break all external providers
      for (const p of registry.providers.values()) {
        p.status = 'unavailable';
      }

      // 1. Auth check still works
      const authRes = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`);
      expect(authRes.status).toBe(200);
      expect(authRes.body.user.username).toBe('multi_curator');

      // 2. Playlist CRUD still works
      const plRes = await request(app)
        .get('/api/playlists')
        .set('Authorization', `Bearer ${authToken}`);
      expect(plRes.status).toBe(200);

      // Restore provider states
      for (const p of registry.providers.values()) {
        p.status = p.isConfigured() ? 'available' : 'unconfigured';
      }
    });
  });
});
