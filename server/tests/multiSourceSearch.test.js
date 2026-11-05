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
    it('should list only permitted registered music providers (Jamendo) with their health state', async () => {
      const res = await request(app).get('/api/search/providers');
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.providers)).toBe(true);

      const names = res.body.providers.map((p) => p.name);
      // Policy enforcement: Only approved/conditionally approved providers register
      expect(names).toContain('jamendo');
      expect(names).not.toContain('archive');
      expect(names).not.toContain('audius');
      expect(names).not.toContain('saavn');

      const jamendo = res.body.providers.find((p) => p.name === 'jamendo');
      expect(jamendo).toBeDefined();
      expect(jamendo.policyClassification).toBe('CONDITIONAL_APPROVAL');
    });
  });

  describe('Unified Search Execution & Fault Isolation', () => {
    it('should reject search without query parameter (400)', async () => {
      const res = await request(app).get('/api/search');
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/Search query parameter 'q' is required/i);
    });

    it('Scenario 1 & 2: should handle Jamendo rate-limiting gracefully without crashing or unauthorized fallbacks', async () => {
      global.fetch = jest.fn(async (url) => {
        const urlStr = String(url);
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

      const jamendo = registry.get('jamendo');
      const origConfig = jamendo.isConfigured;
      jamendo.isConfigured = () => true;

      try {
        const res = await request(app).get('/api/search?q=mozart');
        expect(res.status).toBe(200);
        expect(res.body.query).toBe('mozart');
        expect(res.body.providers.jamendo.status).toBe('rate_limited');
        // No fallback to unauthorized providers
        expect(res.body.providers.saavn).toBeUndefined();
        expect(res.body.providers.archive).toBeUndefined();
      } finally {
        jamendo.isConfigured = origConfig;
      }
    });

    it('Scenario 3 & 10: should cleanly skip unconfigured providers without throwing errors', async () => {
      const jamendo = registry.get('jamendo');
      expect(jamendo.isConfigured()).toBe(false);

      const res = await request(app).get('/api/search?q=bach');
      expect(res.status).toBe(200);
      expect(res.body.providers.jamendo.status).toBe('unconfigured');
      expect(res.body.providers.jamendo.count).toBe(0);
    });

    it('Scenario 3b: should refuse search on unapproved or pending providers (Audius) and return policy notice', async () => {
      const audius = registry.get('audius');
      expect(audius).toBeNull(); // Pending verification, not registered

      const res = await request(app).get('/api/search?q=electronic&providers=audius');
      expect(res.status).toBe(200);
      expect(res.body.results).toEqual([]);
      expect(res.body.notice).toMatch(/disabled, pending verification, or rejected/i);
    });

    it('Scenario 4: should handle provider timeout without hanging or failing the whole search', async () => {
      global.fetch = jest.fn(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes('jamendo.com')) {
          const err = new Error('The operation was aborted');
          err.name = 'AbortError';
          throw err;
        }
        return { ok: false, status: 500 };
      });

      const jamendo = registry.get('jamendo');
      const origConfig = jamendo.isConfigured;
      jamendo.isConfigured = () => true;

      try {
        const res = await request(app).get('/api/search?q=ambient');
        expect(res.status).toBe(200);
        expect(['timeout', 'degraded']).toContain(res.body.providers.jamendo.status);
      } finally {
        jamendo.isConfigured = origConfig;
      }
    });

    it('Scenario 6: should conservatively deduplicate identical recordings and attach alternatives', () => {
      const sampleTracks = [
        {
          id: 'jamendo:101',
          title: 'Ode to Joy',
          artist: 'Ludwig van Beethoven',
          duration: 180,
          provider: 'jamendo',
          providerTrackId: '101',
          streamUrl: 'https://prod-1.storage.jamendo.com/101.mp3',
          isPlayable: true,
          license: 'CC BY 4.0',
        },
        {
          id: 'jamendo:102',
          title: 'Ode to Joy',
          artist: 'Ludwig van Beethoven',
          duration: 182,
          provider: 'jamendo',
          providerTrackId: '102',
          streamUrl: 'https://prod-1.storage.jamendo.com/102.mp3',
          isPlayable: true,
          license: 'CC BY-SA 3.0',
        },
        {
          id: 'jamendo:103',
          title: 'Ode to Joy (Synthwave Remix)',
          artist: 'Ludwig van Beethoven',
          duration: 180,
          provider: 'jamendo',
          providerTrackId: '103',
          streamUrl: 'https://prod-1.storage.jamendo.com/103.mp3',
          isPlayable: true,
          license: 'CC BY 4.0',
        },
      ];

      const deduplicated = registry.deduplicateTracks(sampleTracks);
      expect(deduplicated.length).toBe(2);

      const primary = deduplicated.find((t) => t.title === 'Ode to Joy');
      expect(primary.alternatives.length).toBe(1);
      expect(primary.alternatives[0].providerTrackId).toBe('102');

      const remix = deduplicated.find((t) => t.title.includes('Remix'));
      expect(remix).toBeDefined();
    });

    it('Scenario 9: should return clean empty structure when all providers fail or return zero results', async () => {
      global.fetch = jest.fn(async () => {
        throw new Error('Connection refused by remote host');
      });

      const jamendo = registry.get('jamendo');
      const origConfig = jamendo.isConfigured;
      jamendo.isConfigured = () => true;

      try {
        const res = await request(app).get('/api/search?q=unknown_phantom_track');
        expect(res.status).toBe(200);
        expect(res.body.results).toEqual([]);
        expect(res.body.totalResults).toBe(0);
        expect(res.body.providers.jamendo.status).toBe('unavailable');
      } finally {
        jamendo.isConfigured = origConfig;
      }
    });

    it('Scenario 13: Circuit Breaker should trip OPEN after consecutive failures and fast-fail', async () => {
      const breaker = registry.getBreaker('jamendo');
      expect(breaker).toBeDefined();
      breaker.reset();

      breaker.recordFailure('Connection timeout');
      breaker.recordFailure('Connection timeout');
      expect(breaker.getStatus().state).toBe('CLOSED');

      breaker.recordFailure('Connection timeout');
      expect(breaker.getStatus().state).toBe('OPEN');
      expect(breaker.canExecute()).toBe(false);

      const jamendo = registry.get('jamendo');
      const origConfig = jamendo.isConfigured;
      jamendo.isConfigured = () => true;

      global.fetch = jest.fn();
      try {
        const res = await request(app).get('/api/search?q=circuit_test&providers=jamendo');
        expect(res.status).toBe(200);
        expect(res.body.providers.jamendo.status).toBe('circuit_broken');
        expect(global.fetch).not.toHaveBeenCalled();
      } finally {
        jamendo.isConfigured = origConfig;
        breaker.reset();
      }
    });

    it('Scenario 14: Search ranking should prioritize exact artist/title and playable songs over short noise clips', () => {
      const unranked = [
        {
          id: 'jamendo:noise_clip',
          title: 'A Random 3 Second Sound',
          artist: 'Random Person',
          duration: 3,
          isPlayable: true,
        },
        {
          id: 'jamendo:solar_sunrise',
          title: 'Solar Sunrise',
          artist: 'Solar Breeze',
          duration: 210,
          isPlayable: true,
        },
        {
          id: 'jamendo:podcast_discussion',
          title: 'Solar Breeze Discussion Episode 4',
          artist: 'Discussion Host',
          duration: 900,
          isPlayable: true,
        },
      ];

      const ranked = registry.rankTracks(unranked, 'Solar Breeze');
      expect(ranked[0].id).toBe('jamendo:solar_sunrise');
      expect(ranked[ranked.length - 1].id).toBe('jamendo:noise_clip');
    });
  });

  describe('GET /api/search/resolve (On-Demand Playback Resolution)', () => {
    it('should reject resolution without provider or trackId (400)', async () => {
      const res = await request(app).get('/api/search/resolve');
      expect(res.status).toBe(400);
      expect(res.body.message).toMatch(/required/i);
    });

    it('Scenario 7: should block resolution for pending Archive provider with 403', async () => {
      const res = await request(app).get('/api/search/resolve?provider=archive&trackId=test_item');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PROVIDER_PENDING_VERIFICATION');
    });

    it('Scenario 7b: should block resolution for pending Audius provider with 403', async () => {
      const res = await request(app).get('/api/search/resolve?provider=audius&trackId=test_track');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PROVIDER_PENDING_VERIFICATION');
    });

    it('Scenario 7c: should block resolution for rejected Saavn provider with 403', async () => {
      const res = await request(app).get('/api/search/resolve?provider=saavn&trackId=test_track');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PROVIDER_REJECTED');
    });

    it('should return 403 PROVIDER_UNAUTHORIZED when resolving from an unsupported provider', async () => {
      const res = await request(app).get('/api/search/resolve?provider=unknown_provider&trackId=123');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PROVIDER_UNAUTHORIZED');
    });

    it('should resolve stream URL on demand for Jamendo track with verified CC license', async () => {
      global.fetch = jest.fn(async (url) => {
        const u = String(url);
        if (u.includes('api.jamendo.com/v3.0/tracks/')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              headers: { status: 'success', results_count: 1 },
              results: [
                {
                  id: '777001',
                  name: 'Horizon Dawn',
                  artist_name: 'Solar Breeze',
                  album_name: 'Sunrise Album',
                  duration: 210,
                  image: 'https://usercontent.jamendo.com/777001.jpg',
                  audio: 'https://prod-1.storage.jamendo.com/c/777001.mp3',
                  shareurl: 'https://www.jamendo.com/track/777001',
                  license_ccurl: 'http://creativecommons.org/licenses/by/4.0/',
                },
              ],
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      const jamendo = registry.get('jamendo');
      const origConfig = jamendo.isConfigured;
      jamendo.isConfigured = () => true;

      try {
        const res = await request(app).get('/api/search/resolve?provider=jamendo&trackId=777001');
        expect(res.status).toBe(200);
        expect(res.body.provider).toBe('jamendo');
        expect(res.body.streamUrl).toBe('https://prod-1.storage.jamendo.com/c/777001.mp3');
        expect(res.body.metadata.license).toBe('CC BY 4.0');
        expect(res.body.metadata.isPlayable).toBe(true);
      } finally {
        jamendo.isConfigured = origConfig;
      }
    });

    it('should reject resolution with 403 LICENSE_UNVERIFIED when Jamendo track license is unverified', async () => {
      global.fetch = jest.fn(async (url) => {
        const u = String(url);
        if (u.includes('api.jamendo.com/v3.0/tracks/')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              headers: { status: 'success', results_count: 1 },
              results: [
                {
                  id: '777002',
                  name: 'Unverified Song',
                  artist_name: 'Unknown Artist',
                  duration: 180,
                  audio: 'https://prod-1.storage.jamendo.com/c/777002.mp3',
                  shareurl: 'https://www.jamendo.com/track/777002',
                  license_ccurl: null, // Missing license metadata
                },
              ],
            }),
          };
        }
        return { ok: false, status: 404 };
      });

      const jamendo = registry.get('jamendo');
      const origConfig = jamendo.isConfigured;
      jamendo.isConfigured = () => true;

      try {
        const res = await request(app).get('/api/search/resolve?provider=jamendo&trackId=777002');
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('LICENSE_UNVERIFIED');
      } finally {
        jamendo.isConfigured = origConfig;
      }
    });

    it('should return 404 when track cannot be resolved by Jamendo', async () => {
      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({ headers: { status: 'success' }, results: [] }),
      }));

      const jamendo = registry.get('jamendo');
      const origConfig = jamendo.isConfigured;
      jamendo.isConfigured = () => true;

      try {
        const res = await request(app).get('/api/search/resolve?provider=jamendo&trackId=non_existent');
        expect(res.status).toBe(404);
        expect(res.body.code).toBe('NOT_FOUND');
      } finally {
        jamendo.isConfigured = origConfig;
      }
    });
  });

  describe('Scenario 8 & 12: Playlist Persistence & Zero Audio Storage', () => {
    it('should allow adding Jamendo tracks to user playlist', async () => {
      const plRes = await request(app)
        .post('/api/playlists')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Verified CC Playlist',
          description: 'A playlist of verified Jamendo CC tracks',
        });
      expect(plRes.status).toBe(201);
      const playlistId = plRes.body._id;

      const addRes = await request(app)
        .post(`/api/playlists/${playlistId}/songs`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          title: 'Solar Sunrise',
          artist: 'Solar Breeze',
          url: 'https://prod-1.storage.jamendo.com/c/101.mp3',
          source: {
            provider: 'jamendo',
            externalId: '101',
            pageUrl: 'https://www.jamendo.com/track/101',
          },
        });
      expect(addRes.status).toBe(201);
      expect((addRes.body.playlist?.songs || addRes.body.songs).length).toBe(1);
    });

    it('Scenario 12 Verification: MongoDB must NOT store audio buffers, blobs, or files', async () => {
      const playlists = await Playlist.find({}).lean();
      for (const pl of playlists) {
        for (const song of pl.songs || []) {
          expect(song.buffer).toBeUndefined();
          expect(song.blob).toBeUndefined();
          expect(song.audioData).toBeUndefined();
          expect(song.file).toBeUndefined();
        }
      }
    });
  });

  describe('Phase 4: Playback Source Strategy, Reliability & Resolution Guardrails', () => {
    it('should return capabilities matrix for each registered provider in /api/search/providers', async () => {
      const res = await request(app).get('/api/search/providers');
      expect(res.status).toBe(200);

      const providers = res.body.providers;
      for (const p of providers) {
        expect(p.capabilities).toBeDefined();
        expect(typeof p.capabilities.supportsSearch).toBe('boolean');
        expect(typeof p.capabilities.supportsDirectStream).toBe('boolean');
        expect(typeof p.capabilities.requiresResolution).toBe('boolean');
        expect(typeof p.capabilities.authorizationStatus).toBe('string');
      }

      const jamendo = providers.find((p) => p.name === 'jamendo');
      expect(jamendo).toBeDefined();
      expect(jamendo.capabilities.authorizationStatus).toBe('CONDITIONAL_APPROVAL');
    });

    it('should strictly return 403 PROVIDER_REJECTED for Saavn resolution in any environment', async () => {
      const res = await request(app).get('/api/search/resolve?provider=saavn&trackId=test_block');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PROVIDER_REJECTED');
      expect(res.body.message).toMatch(/rejected/i);
    });

    it('should deduplicate concurrent in-flight resolution requests for the same track', async () => {
      registry.resetCircuitBreakers();
      const jamendo = registry.get('jamendo');
      const origConfig = jamendo.isConfigured;
      jamendo.isConfigured = () => true;

      const resolveSpy = jest.spyOn(jamendo, 'resolveTrack').mockImplementation(async (id) => {
        await new Promise((r) => setTimeout(r, 60));
        return {
          streamUrl: `https://prod-1.storage.jamendo.com/c/${id}.mp3`,
          mimeType: 'audio/mpeg',
          metadata: { title: 'Dedupe Track', artist: 'Artist', isPlayable: true },
        };
      });

      try {
        const [res1, res2] = await Promise.all([
          request(app).get('/api/search/resolve?provider=jamendo&trackId=concurrent_dedupe_item'),
          request(app).get('/api/search/resolve?provider=jamendo&trackId=concurrent_dedupe_item'),
        ]);

        expect(res1.status).toBe(200);
        expect(res2.status).toBe(200);
        expect(res1.body.streamUrl).toBe('https://prod-1.storage.jamendo.com/c/concurrent_dedupe_item.mp3');
        expect(res2.body.streamUrl).toBe('https://prod-1.storage.jamendo.com/c/concurrent_dedupe_item.mp3');
        expect(resolveSpy).toHaveBeenCalledTimes(1);
      } finally {
        resolveSpy.mockRestore();
        jamendo.isConfigured = origConfig;
      }
    });

    it('should reject resolution when provider returns an invalid protocol stream URL (400)', async () => {
      registry.resetCircuitBreakers();
      const jamendo = registry.get('jamendo');
      const origConfig = jamendo.isConfigured;
      jamendo.isConfigured = () => true;

      const resolveSpy = jest.spyOn(jamendo, 'resolveTrack').mockResolvedValue({
        streamUrl: 'ftp://invalidscheme.example.com/audio.mp3',
        metadata: {},
      });

      try {
        const res = await request(app).get('/api/search/resolve?provider=jamendo&trackId=bad_protocol');
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('INVALID_STREAM_URL');
      } finally {
        resolveSpy.mockRestore();
        jamendo.isConfigured = origConfig;
      }
    });

    it('should reject resolution when stream URL host does not match authorized Jamendo domain (400)', async () => {
      registry.resetCircuitBreakers();
      const jamendo = registry.get('jamendo');
      const origConfig = jamendo.isConfigured;
      jamendo.isConfigured = () => true;

      const resolveSpy = jest.spyOn(jamendo, 'resolveTrack').mockResolvedValue({
        streamUrl: 'https://unauthorized-external-audio.example.com/audio.mp3',
        metadata: {},
      });

      try {
        const res = await request(app).get('/api/search/resolve?provider=jamendo&trackId=spoofed_host');
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('UNAUTHORIZED_STREAM_DOMAIN');
      } finally {
        resolveSpy.mockRestore();
        jamendo.isConfigured = origConfig;
      }
    });
  });

  describe('Phase 5.1: Jamendo CC License Parsing, Attribution & Provider Activation', () => {
    const jamendo = registry.get('jamendo');

    it('should parse CC BY 4.0 license correctly', () => {
      const parsed = jamendo.parseLicense('https://creativecommons.org/licenses/by/4.0/');
      expect(parsed.licenseStatus).toBe('verified');
      expect(parsed.code).toBe('CC BY 4.0');
      expect(parsed.hasCommercialRestriction).toBe(false);
      expect(parsed.hasDerivativeRestriction).toBe(false);
      expect(parsed.attributionRequired).toBe(true);
      expect(parsed.isCommercialPermitted).toBe(true);
    });

    it('should parse CC BY-SA 3.0 license correctly', () => {
      const parsed = jamendo.parseLicense('http://creativecommons.org/licenses/by-sa/3.0/');
      expect(parsed.licenseStatus).toBe('verified');
      expect(parsed.code).toBe('CC BY-SA 3.0');
      expect(parsed.shareAlikeRequired).toBe(true);
      expect(parsed.hasCommercialRestriction).toBe(false);
      expect(parsed.isCommercialPermitted).toBe(true);
    });

    it('should parse CC BY-NC 4.0 license with non-commercial restriction', () => {
      const parsed = jamendo.parseLicense('https://creativecommons.org/licenses/by-nc/4.0/');
      expect(parsed.licenseStatus).toBe('verified');
      expect(parsed.code).toBe('CC BY-NC 4.0');
      expect(parsed.hasCommercialRestriction).toBe(true);
      expect(parsed.isCommercialPermitted).toBe(false);
    });

    it('should parse CC BY-NC-SA 3.0 license and extract rights restrictions', () => {
      const parsed = jamendo.parseLicense('http://creativecommons.org/licenses/by-nc-sa/3.0/');
      expect(parsed.licenseStatus).toBe('verified');
      expect(parsed.code).toBe('CC BY-NC-SA 3.0');
      expect(parsed.hasCommercialRestriction).toBe(true);
      expect(parsed.hasDerivativeRestriction).toBe(false);
      expect(parsed.shareAlikeRequired).toBe(true);
      expect(parsed.attributionRequired).toBe(true);
      expect(parsed.isCommercialPermitted).toBe(false);
      expect(parsed.jamendoTermsNote).toMatch(/Non-Commercial/i);
    });

    it('should parse CC BY-ND 4.0 license with derivative restrictions', () => {
      const parsed = jamendo.parseLicense('https://creativecommons.org/licenses/by-nd/4.0/');
      expect(parsed.licenseStatus).toBe('verified');
      expect(parsed.code).toBe('CC BY-ND 4.0');
      expect(parsed.hasCommercialRestriction).toBe(false);
      expect(parsed.hasDerivativeRestriction).toBe(true);
      expect(parsed.attributionRequired).toBe(true);
      expect(parsed.isCommercialPermitted).toBe(true);
    });

    it('should parse CC BY-NC-ND 4.0 license with commercial and derivative restrictions', () => {
      const parsed = jamendo.parseLicense('https://creativecommons.org/licenses/by-nc-nd/4.0/');
      expect(parsed.licenseStatus).toBe('verified');
      expect(parsed.code).toBe('CC BY-NC-ND 4.0');
      expect(parsed.hasCommercialRestriction).toBe(true);
      expect(parsed.hasDerivativeRestriction).toBe(true);
      expect(parsed.isCommercialPermitted).toBe(false);
    });

    it('should parse CC0 public domain without commercial restrictions', () => {
      const parsed = jamendo.parseLicense('http://creativecommons.org/publicdomain/zero/1.0/');
      expect(parsed.licenseStatus).toBe('verified');
      expect(parsed.code).toBe('CC0 1.0');
      expect(parsed.hasCommercialRestriction).toBe(false);
      expect(parsed.hasDerivativeRestriction).toBe(false);
      expect(parsed.attributionRequired).toBe(false);
      expect(parsed.isCommercialPermitted).toBe(true);
    });

    it('should handle missing license_ccurl as unknown license status without inventing permissions', () => {
      const parsed = jamendo.parseLicense(null);
      expect(parsed.licenseStatus).toBe('unknown');
      expect(parsed.code).toBe('UNKNOWN');
      expect(parsed.name).toBeNull();
      expect(parsed.isCommercialPermitted).toBe(false);
      expect(parsed.hasCommercialRestriction).toBe(true);
      expect(parsed.url).toBeNull();
    });

    it('should handle arbitrary or unparseable license URLs as unknown license status', () => {
      const parsed = jamendo.parseLicense('https://example.com/arbitrary/custom/license');
      expect(parsed.licenseStatus).toBe('unknown');
      expect(parsed.code).toBe('UNKNOWN');
      expect(parsed.name).toBeNull();
      expect(parsed.isCommercialPermitted).toBe(false);
      expect(parsed.url).toBe('https://example.com/arbitrary/custom/license');
    });

    it('should search Jamendo and return structured CC metadata, streaming audio, and backlink', async () => {
      global.fetch = jest.fn(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes('api.jamendo.com/v3.0/tracks/')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              headers: { status: 'success', results_count: 1 },
              results: [
                {
                  id: '123456',
                  name: 'Acoustic Sunrise',
                  artist_name: 'Solar Breeze',
                  album_name: 'Morning Light',
                  duration: 185,
                  image: 'https://usercontent.jamendo.com?type=album&id=100&width=300',
                  audio: 'https://prod-1.storage.jamendo.com/c/123456.mp3',
                  audiodownload: 'https://prod-1.storage.jamendo.com/download/123456.mp3',
                  shareurl: 'https://www.jamendo.com/track/123456/acoustic-sunrise',
                  license_ccurl: 'http://creativecommons.org/licenses/by-sa/3.0/',
                },
              ],
            }),
          };
        }
        return { ok: false, status: 500, json: async () => ({}) };
      });

      const origConfig = jamendo.isConfigured;
      jamendo.isConfigured = () => true;

      try {
        const searchResult = await jamendo.search('acoustic', { limit: 5 });
        expect(searchResult.status).toBe('available');
        expect(searchResult.results.length).toBe(1);

        const track = searchResult.results[0];
        expect(track.id).toBe('jamendo:123456');
        expect(track.title).toBe('Acoustic Sunrise');
        expect(track.artist).toBe('Solar Breeze');
        expect(track.streamUrl).toBe('https://prod-1.storage.jamendo.com/c/123456.mp3');
        expect(track.url).toBe('https://prod-1.storage.jamendo.com/c/123456.mp3');
        expect(track.streamUrl).not.toContain('download');
        expect(track.license).toBe('CC BY-SA 3.0');
        expect(track.licenseCode).toBe('CC BY-SA 3.0');
        expect(track.licenseUrl).toBe('http://creativecommons.org/licenses/by-sa/3.0/');
        expect(track.providerTrackUrl).toBe('https://www.jamendo.com/track/123456/acoustic-sunrise');
        expect(track.attribution).toContain('Solar Breeze via Jamendo Music');
        expect(track.attribution).toContain('CC BY-SA 3.0');
      } finally {
        jamendo.isConfigured = origConfig;
      }
    });

    it('should resolve Jamendo track on demand via /api/search/resolve', async () => {
      global.fetch = jest.fn(async (url) => {
        const urlStr = String(url);
        if (urlStr.includes('api.jamendo.com/v3.0/tracks/')) {
          return {
            ok: true,
            status: 200,
            json: async () => ({
              headers: { status: 'success', results_count: 1 },
              results: [
                {
                  id: '987654',
                  name: 'Electric Chill',
                  artist_name: 'Neon Waves',
                  album_name: 'Synth Horizon',
                  duration: 210,
                  image: 'https://usercontent.jamendo.com/987654.jpg',
                  audio: 'https://prod-1.storage.jamendo.com/c/987654.mp3',
                  shareurl: 'https://www.jamendo.com/track/987654/electric-chill',
                  license_ccurl: 'http://creativecommons.org/licenses/by-nc-nd/4.0/',
                },
              ],
            }),
          };
        }
        return { ok: false, status: 500, json: async () => ({}) };
      });

      const origConfig = jamendo.isConfigured;
      jamendo.isConfigured = () => true;

      try {
        const res = await request(app).get('/api/search/resolve?provider=jamendo&trackId=jamendo:987654');
        expect(res.status).toBe(200);
        expect(res.body.streamUrl).toBe('https://prod-1.storage.jamendo.com/c/987654.mp3');
        expect(res.body.metadata.license).toBe('CC BY-NC-ND 4.0');
        expect(res.body.metadata.providerTrackUrl).toBe('https://www.jamendo.com/track/987654/electric-chill');
      } finally {
        jamendo.isConfigured = origConfig;
      }
    });
  });
});
