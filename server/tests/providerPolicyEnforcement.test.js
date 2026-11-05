const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('../index');
const registry = require('../providers/ProviderRegistry');
const {
  CLASSIFICATIONS,
  providerPolicy,
  normalizeProviderName,
  getProviderPolicy,
  isProviderPermittedForRegistration,
  isProviderPermittedForPlayback,
} = require('../config/providerPolicy');
const { connectTestDB, closeTestDB } = require('./setup');
const JamendoProvider = require('../providers/JamendoProvider');

describe('SOUNDWAVE Authoritative Provider Policy & Playback Security Tests', () => {
  let originalFetch;

  beforeAll(async () => {
    await connectTestDB();
    originalFetch = global.fetch;
  });

  afterAll(async () => {
    await closeTestDB();
    global.fetch = originalFetch;
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('1. Authoritative Policy Classification Matrix', () => {
    it('should classify Jamendo as CONDITIONAL_APPROVAL', () => {
      const policy = getProviderPolicy('jamendo');
      expect(policy.classification).toBe(CLASSIFICATIONS.CONDITIONAL_APPROVAL);
      expect(policy.canRegister).toBe(true);
      expect(policy.canResolvePlayback).toBe(true);
      expect(isProviderPermittedForRegistration('jamendo')).toBe(true);
      expect(isProviderPermittedForPlayback('jamendo')).toBe(true);
    });

    it('should classify Audius as PENDING_VERIFICATION and disable registration/playback', () => {
      const policy = getProviderPolicy('audius');
      expect(policy.classification).toBe(CLASSIFICATIONS.PENDING_VERIFICATION);
      expect(policy.canRegister).toBe(false);
      expect(policy.canResolvePlayback).toBe(false);
      expect(isProviderPermittedForRegistration('audius')).toBe(false);
      expect(isProviderPermittedForPlayback('audius')).toBe(false);
    });

    it('should classify Archive as PENDING_VERIFICATION and disable registration/playback', () => {
      const policy = getProviderPolicy('archive');
      expect(policy.classification).toBe(CLASSIFICATIONS.PENDING_VERIFICATION);
      expect(policy.canRegister).toBe(false);
      expect(policy.canResolvePlayback).toBe(false);
      expect(isProviderPermittedForRegistration('archive')).toBe(false);
      expect(isProviderPermittedForPlayback('archive')).toBe(false);
    });

    it('should classify Saavn as REJECTED in all environments', () => {
      const policy = getProviderPolicy('saavn');
      expect(policy.classification).toBe(CLASSIFICATIONS.REJECTED);
      expect(policy.canRegister).toBe(false);
      expect(policy.canResolvePlayback).toBe(false);
      expect(isProviderPermittedForRegistration('saavn')).toBe(false);
      expect(isProviderPermittedForPlayback('saavn')).toBe(false);
    });

    it('should classify Spotify as PENDING_VERIFICATION with playback disabled', () => {
      const policy = getProviderPolicy('spotify');
      expect(policy.classification).toBe(CLASSIFICATIONS.PENDING_VERIFICATION);
      expect(policy.canRegister).toBe(false);
      expect(policy.canResolvePlayback).toBe(false);
      expect(isProviderPermittedForPlayback('spotify')).toBe(false);
    });

    it('should classify YouTube as REJECTED_FOR_DIRECT_AUDIO', () => {
      const policy = getProviderPolicy('youtube');
      expect(policy.classification).toBe(CLASSIFICATIONS.REJECTED_FOR_DIRECT_AUDIO);
      expect(policy.canRegister).toBe(false);
      expect(policy.canResolvePlayback).toBe(false);
    });

    it('should classify DirectAudio as REJECTED for arbitrary URLs', () => {
      const policy = getProviderPolicy('direct');
      expect(policy.classification).toBe(CLASSIFICATIONS.REJECTED);
      expect(policy.canRegister).toBe(false);
      expect(policy.canResolvePlayback).toBe(false);
    });

    it('should fail closed for unknown or missing policy entries', () => {
      const unknownPolicy = getProviderPolicy('unknown_service');
      expect(unknownPolicy.classification).toBe(CLASSIFICATIONS.UNKNOWN);
      expect(unknownPolicy.canRegister).toBe(false);
      expect(unknownPolicy.canResolvePlayback).toBe(false);
      expect(isProviderPermittedForRegistration('unknown_service')).toBe(false);
      expect(isProviderPermittedForPlayback('unknown_service')).toBe(false);

      const emptyPolicy = getProviderPolicy('');
      expect(emptyPolicy.classification).toBe(CLASSIFICATIONS.UNKNOWN);
      expect(isProviderPermittedForPlayback('')).toBe(false);
    });
  });

  describe('2. ProviderRegistry Policy Enforcement', () => {
    it('should only register permitted providers in the active registry instance', () => {
      const registered = Array.from(registry.providers.keys());
      expect(registered).toEqual(['jamendo']);
      expect(registry.get('jamendo')).toBeDefined();
      expect(registry.get('archive')).toBeNull();
      expect(registry.get('audius')).toBeNull();
      expect(registry.get('saavn')).toBeNull();
    });

    it('should confirm unused provider implementation files have been removed from the repository', () => {
      const providersDir = path.resolve(__dirname, '../providers');
      expect(fs.existsSync(path.join(providersDir, 'SaavnProvider.js'))).toBe(false);
      expect(fs.existsSync(path.join(providersDir, 'ArchiveProvider.js'))).toBe(false);
      expect(fs.existsSync(path.join(providersDir, 'AudiusProvider.js'))).toBe(false);
    });

    it('should reject manual registration of non-permitted providers', () => {
      expect(registry.register({ name: 'saavn' })).toBe(false);
      expect(registry.register({ name: 'archive' })).toBe(false);
      expect(registry.register({ name: 'audius' })).toBe(false);
      expect(registry.register({ name: 'spotify' })).toBe(false);
      expect(registry.register({ name: 'youtube' })).toBe(false);
      expect(registry.register({ name: 'arbitrary_provider' })).toBe(false);
      expect(registry.get('saavn')).toBeNull();
      expect(registry.get('archive')).toBeNull();
      expect(registry.get('audius')).toBeNull();
    });

    it('should prevent case-casing variations from bypassing policy registration', () => {
      expect(registry.get('Saavn')).toBeNull();
      expect(registry.get('SAAVN')).toBeNull();
      expect(registry.get('Archive')).toBeNull();
      expect(registry.get('ARCHIVE')).toBeNull();
      expect(registry.get('Audius')).toBeNull();
    });
  });

  describe('3. Jamendo License Verification & Attribution', () => {
    const jamendo = registry.get('jamendo');

    it('should reject playback resolution when Jamendo track has missing license (LICENSE_UNVERIFIED)', async () => {
      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: 'success' },
          results: [
            {
              id: 'jam_no_lic_1',
              name: 'No License Song',
              artist_name: 'Artist',
              audio: 'https://prod-1.storage.jamendo.com/c/test.mp3',
              license_ccurl: null, // missing
            },
          ],
        }),
      }));

      const orig = jamendo.isConfigured;
      jamendo.isConfigured = () => true;

      try {
        const res = await request(app).get('/api/search/resolve?provider=jamendo&trackId=jam_no_lic_1');
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('LICENSE_UNVERIFIED');
        expect(res.body.message).toMatch(/license could not be verified/i);
      } finally {
        jamendo.isConfigured = orig;
      }
    });

    it('should reject playback resolution when Jamendo track has unknown or arbitrary license', async () => {
      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: 'success' },
          results: [
            {
              id: 'jam_unknown_lic_2',
              name: 'Unknown License Song',
              artist_name: 'Artist',
              audio: 'https://prod-1.storage.jamendo.com/c/test.mp3',
              license_ccurl: 'https://example.com/unsupported/license',
            },
          ],
        }),
      }));

      const orig = jamendo.isConfigured;
      jamendo.isConfigured = () => true;

      try {
        const res = await request(app).get('/api/search/resolve?provider=jamendo&trackId=jam_unknown_lic_2');
        expect(res.status).toBe(403);
        expect(res.body.code).toBe('LICENSE_UNVERIFIED');
      } finally {
        jamendo.isConfigured = orig;
      }
    });

    it('should mark unverified license tracks as isPlayable: false in Jamendo search results', async () => {
      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: 'success' },
          results: [
            {
              id: 'jam_unverified_search',
              name: 'Unverified CC',
              artist_name: 'Artist',
              audio: 'https://prod-1.storage.jamendo.com/c/test.mp3',
              license_ccurl: 'invalid_license_url',
            },
            {
              id: 'jam_valid_search',
              name: 'Valid CC',
              artist_name: 'Artist',
              audio: 'https://prod-1.storage.jamendo.com/c/test2.mp3',
              license_ccurl: 'http://creativecommons.org/licenses/by/4.0/',
            },
          ],
        }),
      }));

      const orig = jamendo.isConfigured;
      jamendo.isConfigured = () => true;

      try {
        const res = await jamendo.search('test');
        expect(res.results.length).toBe(2);

        const unverified = res.results.find((t) => t.id === 'jamendo:jam_unverified_search');
        expect(unverified.isPlayable).toBe(false);
        expect(unverified.streamUrl).toBe('');
        expect(unverified.playbackCapabilities.playbackType).toBe('unsupported');

        const valid = res.results.find((t) => t.id === 'jamendo:jam_valid_search');
        expect(valid.isPlayable).toBe(true);
        expect(valid.streamUrl).toBe('https://prod-1.storage.jamendo.com/c/test2.mp3');
        expect(valid.playbackCapabilities.playbackType).toBe('direct');
      } finally {
        jamendo.isConfigured = orig;
      }
    });

    it('should preserve required attribution fields in resolved Jamendo track', async () => {
      global.fetch = jest.fn(async () => ({
        ok: true,
        status: 200,
        json: async () => ({
          headers: { status: 'success' },
          results: [
            {
              id: 'jam_attr_test',
              name: 'Attribution Song',
              artist_name: 'Creator Person',
              audio: 'https://prod-1.storage.jamendo.com/c/attr.mp3',
              shareurl: 'https://www.jamendo.com/track/jam_attr_test',
              license_ccurl: 'http://creativecommons.org/licenses/by-nc-sa/3.0/',
            },
          ],
        }),
      }));

      const orig = jamendo.isConfigured;
      jamendo.isConfigured = () => true;

      try {
        const res = await request(app).get('/api/search/resolve?provider=jamendo&trackId=jam_attr_test');
        expect(res.status).toBe(200);
        expect(res.body.metadata.attribution).toContain('Creator Person via Jamendo Music (CC BY-NC-SA 3.0)');
        expect(res.body.metadata.providerTrackUrl).toBe('https://www.jamendo.com/track/jam_attr_test');
        expect(res.body.metadata.license).toBe('CC BY-NC-SA 3.0');
        expect(res.body.metadata.licenseUrl).toBe('http://creativecommons.org/licenses/by-nc-sa/3.0/');
      } finally {
        jamendo.isConfigured = orig;
      }
    });
  });

  describe('4. Resolution Gatekeeping & Anti-Bypass Security', () => {
    it('should reject resolve request for Saavn with 403 in any environment', async () => {
      const res = await request(app).get('/api/search/resolve?provider=saavn&trackId=12345');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PROVIDER_REJECTED');
    });

    it('should reject resolve request for Archive with 403 (pending verification)', async () => {
      const res = await request(app).get('/api/search/resolve?provider=archive&trackId=item123');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PROVIDER_PENDING_VERIFICATION');
    });

    it('should reject resolve request for Audius with 403 (pending verification)', async () => {
      const res = await request(app).get('/api/search/resolve?provider=audius&trackId=track123');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PROVIDER_PENDING_VERIFICATION');
    });

    it('should reject resolve request for Spotify with 403 (pending verification)', async () => {
      const res = await request(app).get('/api/search/resolve?provider=spotify&trackId=track123');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PROVIDER_PENDING_VERIFICATION');
    });

    it('should reject resolve request for unknown provider with 403', async () => {
      const res = await request(app).get('/api/search/resolve?provider=arbitrary_cdn&trackId=xyz');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PROVIDER_UNAUTHORIZED');
    });

    it('should reject Jamendo stream resolution if URL attempts domain spoofing', async () => {
      const jamendo = registry.get('jamendo');
      const orig = jamendo.isConfigured;
      jamendo.isConfigured = () => true;

      const resolveSpy = jest.spyOn(jamendo, 'resolveTrack').mockResolvedValue({
        streamUrl: 'https://evil-attacker-site.com/malicious.mp3',
        metadata: {},
      });

      try {
        const res = await request(app).get('/api/search/resolve?provider=jamendo&trackId=spoof_item');
        expect(res.status).toBe(400);
        expect(res.body.code).toBe('UNAUTHORIZED_STREAM_DOMAIN');
      } finally {
        resolveSpy.mockRestore();
        jamendo.isConfigured = orig;
      }
    });

    it('should reject client attempts to forge isPlayable or streamUrl via query parameters', async () => {
      const res = await request(app).get('/api/search/resolve?provider=saavn&trackId=123&isPlayable=true&streamUrl=https://fake.com/audio.mp3');
      expect(res.status).toBe(403);
      expect(res.body.code).toBe('PROVIDER_REJECTED');
    });
  });

  describe('5. Integrity of Curated Homepage Jamendo Discovery Tracks', () => {
    it('should confirm all 18 curated discovery songs are verified Jamendo tracks with CC licensing', () => {
      const filePath = path.resolve(__dirname, '../../music-playlist-frontend-vue/src/data/featuredSongs.js');
      const content = fs.readFileSync(filePath, 'utf-8');

      const titleMatches = [...content.matchAll(/"title":\s*"([^"]+)"/g)].map((m) => m[1]);
      const idMatches = [...content.matchAll(/"id":\s*"([^"]+)"/g)].map((m) => m[1]);
      const artistMatches = [...content.matchAll(/"artist":\s*"([^"]+)"/g)].map((m) => m[1]);
      const providerMatches = [...content.matchAll(/"provider":\s*"([^"]+)"/g)].map((m) => m[1]);
      const streamUrlMatches = [...content.matchAll(/"streamUrl":\s*"([^"]+)"/g)].map((m) => m[1]);

      expect(titleMatches.length).toBe(18);
      expect(providerMatches.length).toBeGreaterThanOrEqual(18);
      expect(providerMatches.every((p) => p === 'jamendo')).toBe(true);

      // Verify Jamendo CDN domain for all stream URLs
      expect(streamUrlMatches.every((url) => url.includes('storage.jamendo.com'))).toBe(true);

      // Verify Track 1: Deep house by Cooloop
      expect(titleMatches[0]).toBe('Deep house');
      expect(artistMatches[0]).toBe('Cooloop');
      expect(idMatches[0]).toBe('jamendo-1580571');

      // Verify Track 18: AY AY AY MALUCA by PUETO PA LO MIO RECORDS
      expect(titleMatches[17]).toContain('AY AY AY MALUCA');
      expect(artistMatches[17]).toBe('PUETO PA LO MIO RECORDS');
      expect(idMatches[17]).toBe('jamendo-1843061');
    });
  });
});
