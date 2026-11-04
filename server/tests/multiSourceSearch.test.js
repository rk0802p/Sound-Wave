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
      // Jamendo is unconfigured by default (requires JAMENDO_CLIENT_ID)
      const jamendo = registry.get('jamendo');
      expect(jamendo.isConfigured()).toBe(false);

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
      expect(res.body.providers.jamendo.status).toBe('unconfigured');
      expect(res.body.providers.jamendo.count).toBe(0);
    });

    it('Scenario 3b: should support Audius unauthenticated read-only search and respect creator permissions', async () => {
      const audius = registry.get('audius');
      expect(audius.isConfigured()).toBe(true); // Public read-only endpoints supported without key

      global.fetch = jest.fn(async (url) => {
        const u = String(url);
        if (u.includes('api.audius.co/v1/tracks/search')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              data: [
                {
                  id: 'aud_streamable_1',
                  title: 'Streamable Hit',
                  user: { name: 'Audius Creator' },
                  genre: 'Electronic',
                  duration: 210,
                  is_streamable: true,
                  stream_conditions: null,
                },
                {
                  id: 'aud_restricted_2',
                  title: 'Restricted Audio',
                  user: { name: 'Exclusive Creator' },
                  genre: 'Ambient',
                  duration: 180,
                  is_streamable: false, // Creator restricted
                  stream_conditions: { usdc_purchase: true },
                },
              ],
            }),
          };
        }
        return { ok: true, status: 200, json: async () => ({ response: { docs: [] } }) };
      });

      const res = await request(app).get('/api/search?q=electronic&providers=audius');
      expect(res.status).toBe(200);
      expect(res.body.providers.audius.status).toBe('available');
      expect(res.body.providers.audius.count).toBe(2);

      const streamable = res.body.results.find((t) => t.id === 'audius:aud_streamable_1');
      expect(streamable).toBeDefined();
      expect(streamable.isPlayable).toBe(true);
      expect(streamable.playbackCapabilities.playbackType).toBe('direct');

      const restricted = res.body.results.find((t) => t.id === 'audius:aud_restricted_2');
      expect(restricted).toBeDefined();
      expect(restricted.isPlayable).toBe(false);
      expect(restricted.playbackCapabilities.playbackType).toBe('unsupported');
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

    it('Scenario 13: Circuit Breaker should trip OPEN after consecutive failures and fast-fail', async () => {
      const breaker = registry.getBreaker('archive');
      expect(breaker).toBeDefined();
      breaker.reset();

      // Breaker threshold is 3
      breaker.recordFailure('Connection timeout');
      breaker.recordFailure('Connection timeout');
      expect(breaker.getStatus().state).toBe('CLOSED');

      breaker.recordFailure('Connection timeout');
      // 3rd failure trips the breaker to OPEN
      expect(breaker.getStatus().state).toBe('OPEN');
      expect(breaker.canExecute()).toBe(false);

      // Now query should fast-fail with circuit_broken without hitting fetch
      global.fetch = jest.fn();
      const res = await request(app).get('/api/search?q=circuit_test&providers=archive');
      expect(res.status).toBe(200);
      expect(res.body.providers.archive.status).toBe('circuit_broken');
      expect(global.fetch).not.toHaveBeenCalled();

      // Clean up breaker for subsequent tests
      breaker.reset();
    });

    it('Scenario 14: Search ranking should prioritize exact artist/title and playable songs over short noise clips', () => {
      const unranked = [
        {
          id: 'archive:noise_clip',
          title: 'A Random 3 Second Sound',
          artist: 'Random Person',
          duration: 3,
          isPlayable: true,
        },
        {
          id: 'audius:eminem_lose_yourself',
          title: 'Lose Yourself',
          artist: 'Eminem',
          duration: 326,
          isPlayable: true,
        },
        {
          id: 'archive:eminem_podcast_clip',
          title: 'Eminem Talk Show Discussion Episode 4',
          artist: 'Podcast Host',
          duration: 900,
          isPlayable: true,
        },
      ];

      const ranked = registry.rankTracks(unranked, 'Eminem');
      expect(ranked[0].id).toBe('audius:eminem_lose_yourself');
      expect(ranked[ranked.length - 1].id).toBe('archive:noise_clip');
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
                licenseurl: 'https://creativecommons.org/licenses/by/4.0/',
                collection: ['audio_music'],
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

    it('Scenario 7b: should reject resolution for unauthorized community uploads or ripper filenames', async () => {
      global.fetch = jest.fn(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes('/files')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              result: [{ name: 'song_flvto_rip.mp3', format: 'VBR MP3' }],
            }),
          };
        }
        return {
          ok: true,
          status: 200,
          json: async () => ({
            metadata: {
              identifier: 'unauthorized_rip',
              title: 'Ripped Song',
              creator: 'Unknown Uploader',
            },
          }),
        };
      });

      const res = await request(app).get('/api/search/resolve?provider=archive&trackId=unauthorized_rip');
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/restricted|unverified/i);
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

  describe('Phase 3.0B: Extended Multi-Source Search & Playability Validation', () => {
    it('should include saavn provider health with DEV-SAAVN badge and unresolved terms status', async () => {
      const res = await request(app).get('/api/search/providers');
      expect(res.status).toBe(200);

      const saavn = res.body.providers.find((p) => p.name === 'saavn');
      expect(saavn).toBeDefined();
      expect(saavn.displayName).toBe('JioSaavn (Dev)');
      expect(saavn.badge).toBe('DEV-SAAVN');
      expect(saavn.termsStatus).toBe('unresolved');
      expect(saavn.experimental).toBe(true);
      expect(saavn.developmentOnly).toBe(true);
    });

    it('should mark resolvable tracks (needsResolution: true) as isPlayable: true in aggregateSearch', async () => {
      // Mock Saavn search response
      global.fetch = jest.fn(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes('jiosaavn.com/api.php') && urlStr.includes('search.getResults')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              results: [
                {
                  id: 'test_saavn_01',
                  title: 'Faded (Original)',
                  subtitle: 'Alan Walker',
                  image: 'https://c.saavncdn.com/test_150x150.jpg',
                  perma_url: 'https://www.jiosaavn.com/song/faded/test_saavn_01',
                  more_info: {
                    album: 'Faded EP',
                    duration: '212',
                  },
                },
              ],
            }),
          };
        }
        return { ok: true, status: 200, json: async () => ({}) };
      });

      const res = await request(app).get('/api/search?q=Faded&providers=saavn');
      expect(res.status).toBe(200);
      expect(res.body.results.length).toBeGreaterThanOrEqual(1);

      const saavnTrack = res.body.results.find((t) => t.provider === 'saavn');
      expect(saavnTrack).toBeDefined();
      expect(saavnTrack.needsResolution).toBe(true);
      expect(saavnTrack.isPlayable).toBe(true);
      expect(saavnTrack.providerTrackId).toBe('test_saavn_01');
    });

    it('should support provider filtering via query parameter', async () => {
      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ data: [] }),
      }));

      const res = await request(app).get('/api/search?q=ambient&providers=audius');
      expect(res.status).toBe(200);
      expect(Object.keys(res.body.providers)).toEqual(['audius']);
    });

    it('should reject whitespace-only search query with 400', async () => {
      const res = await request(app).get('/api/search?q=   ');
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Search query parameter 'q' is required/i);
    });

    it('should return 404 when resolving from an unsupported provider', async () => {
      const res = await request(app).get('/api/search/resolve?provider=unknown_provider&trackId=123');
      expect(res.status).toBe(404);
      expect(res.body.message).toMatch(/not registered/i);
    });
  });

  describe('Phase 4: Playback Source Strategy, Reliability & Resolution Guardrails', () => {
    it('should return capabilities matrix for each provider in /api/search/providers', async () => {
      const res = await request(app).get('/api/search/providers');
      expect(res.status).toBe(200);

      const providers = res.body.providers;
      for (const p of providers) {
        expect(p.capabilities).toBeDefined();
        expect(typeof p.capabilities.supportsSearch).toBe('boolean');
        expect(typeof p.capabilities.supportsDirectStream).toBe('boolean');
        expect(typeof p.capabilities.requiresResolution).toBe('boolean');
        expect(typeof p.capabilities.isTemporaryUrl).toBe('boolean');
        expect(typeof p.capabilities.environmentRestrictions).toBe('string');
        expect(typeof p.capabilities.authorizationStatus).toBe('string');
      }

      const saavn = providers.find((p) => p.name === 'saavn');
      expect(saavn.capabilities.requiresResolution).toBe(true);
      expect(saavn.capabilities.environmentRestrictions).toBe('development_only');
      expect(saavn.capabilities.authorizationStatus).toBe('unresolved');
    });

    it('should strictly return 403 PROVIDER_UNCONFIGURED for Saavn resolution in production', async () => {
      const prevEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const saavnProvider = registry.get('saavn');
        expect(saavnProvider.isConfigured()).toBe(false);

        const res = await request(app).get('/api/search/resolve?provider=saavn&trackId=test_prod_block');
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('PROVIDER_UNCONFIGURED');
        expect(res.body.message).toMatch(/unconfigured or disabled/i);
      } finally {
        process.env.NODE_ENV = prevEnv;
      }
    });

    it('should deduplicate concurrent in-flight resolution requests for the same track', async () => {
      registry.resetCircuitBreakers();
      const archiveProvider = registry.get('archive');
      const resolveSpy = jest.spyOn(archiveProvider, 'resolveTrack').mockImplementation(async (id) => {
        await new Promise((r) => setTimeout(r, 60));
        return {
          streamUrl: `https://archive.org/download/${id}/${id}.mp3`,
          mimeType: 'audio/mpeg',
          metadata: { title: 'Test Dedupe', artist: 'Artist' },
        };
      });

      // Fire 2 concurrent requests for the identical trackId
      const [res1, res2] = await Promise.all([
        request(app).get('/api/search/resolve?provider=archive&trackId=concurrent_dedupe_item'),
        request(app).get('/api/search/resolve?provider=archive&trackId=concurrent_dedupe_item'),
      ]);

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);
      expect(res1.body.streamUrl).toBe('https://archive.org/download/concurrent_dedupe_item/concurrent_dedupe_item.mp3');
      expect(res2.body.streamUrl).toBe('https://archive.org/download/concurrent_dedupe_item/concurrent_dedupe_item.mp3');

      // The provider resolveTrack method must only have been invoked once
      expect(resolveSpy).toHaveBeenCalledTimes(1);
      resolveSpy.mockRestore();
    });

    it('should reject resolution when provider returns an invalid protocol stream URL (400)', async () => {
      registry.resetCircuitBreakers();
      const archiveProvider = registry.get('archive');
      const resolveSpy = jest.spyOn(archiveProvider, 'resolveTrack').mockResolvedValue({
        streamUrl: 'ftp://invalidscheme.example.com/audio.mp3',
        metadata: {},
      });

      const res = await request(app).get('/api/search/resolve?provider=archive&trackId=bad_protocol_item');
      expect(res.status).toBe(400);
      expect(res.body.code).toBe('INVALID_STREAM_URL');
      resolveSpy.mockRestore();
    });

    it('should preserve needsResolution and isPlayable on alternatives in deduplicateTracks', () => {
      const tracks = [
        {
          id: '1',
          title: 'Believer',
          artist: 'Imagine Dragons',
          duration: 204,
          provider: 'archive',
          providerTrackId: 'arch_believer',
          streamUrl: 'https://archive.org/stream/believer.mp3',
          isPlayable: true,
          license: 'Public Domain',
        },
        {
          id: '2',
          title: 'Believer',
          artist: 'Imagine Dragons',
          duration: 205,
          provider: 'saavn',
          providerTrackId: 'saavn_believer',
          streamUrl: null,
          needsResolution: true,
          isPlayable: true,
          license: 'Development Only',
        },
      ];

      const merged = registry.deduplicateTracks(tracks);
      expect(merged.length).toBe(1);
      expect(merged[0].alternatives.length).toBe(1);
      expect(merged[0].alternatives[0].provider).toBe('saavn');
      expect(merged[0].alternatives[0].needsResolution).toBe(true);
      expect(merged[0].alternatives[0].isPlayable).toBe(true);
    });

    it('should distinguish audio variants (sped up, slowed, acoustic) and not merge them', () => {
      const tracks = [
        {
          id: '1',
          title: 'Dandelions',
          artist: 'Ruth B.',
          duration: 233,
          provider: 'saavn',
          providerTrackId: 'dan_orig',
        },
        {
          id: '2',
          title: 'Dandelions (Sped Up)',
          artist: 'Ruth B.',
          duration: 200,
          provider: 'saavn',
          providerTrackId: 'dan_sped',
        },
        {
          id: '3',
          title: 'Dandelions (Slowed + Reverb)',
          artist: 'Ruth B.',
          duration: 270,
          provider: 'archive',
          providerTrackId: 'dan_slow',
        },
      ];

      const merged = registry.deduplicateTracks(tracks);
      expect(merged.length).toBe(3);
    });
  });
});
