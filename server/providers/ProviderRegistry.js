const ArchiveProvider = require('./ArchiveProvider');
const JamendoProvider = require('./JamendoProvider');
const AudiusProvider = require('./AudiusProvider');
const SaavnProvider = require('./SaavnProvider');
const CircuitBreaker = require('./CircuitBreaker');

class ProviderRegistry {
  constructor() {
    this.providers = new Map();
    this.circuitBreakers = new Map();
    this.metadataCache = new Map(); // Simple in-memory LRU metadata cache
    this.cacheMax = 150;
    this.cacheTtlMs = 1000 * 60 * 3; // 3 minutes TTL for search metadata

    this.resolutionCache = new Map(); // In-memory LRU stream resolution cache
    this.resolutionCacheMax = 200;
    this.resolutionCacheTtlMs = 1000 * 60 * 10; // 10 minutes TTL for stream resolutions
    this.activeResolutionPromises = new Map(); // In-flight resolution deduplication

    // Register active provider adapters
    this.register(new ArchiveProvider());
    this.register(new JamendoProvider());
    this.register(new AudiusProvider());
    this.register(new SaavnProvider());
  }

  /**
   * Register a new provider instance
   * @param {BaseProvider} provider
   */
  register(provider) {
    if (!provider || !provider.name) {
      throw new Error('Invalid provider: missing name');
    }
    const key = provider.name.toLowerCase();
    this.providers.set(key, provider);
    if (!this.circuitBreakers.has(key)) {
      this.circuitBreakers.set(key, new CircuitBreaker(key, { failureThreshold: 3, cooldownPeriodMs: 30000 }));
    }
  }

  /**
   * Retrieve registered provider by name
   * @param {string} name
   * @returns {BaseProvider|null}
   */
  get(name) {
    if (!name || typeof name !== 'string') return null;
    return this.providers.get(name.toLowerCase()) || null;
  }

  /**
   * Retrieve circuit breaker for provider
   * @param {string} name
   * @returns {CircuitBreaker|null}
   */
  getBreaker(name) {
    if (!name || typeof name !== 'string') return null;
    return this.circuitBreakers.get(name.toLowerCase()) || null;
  }

  /**
   * Reset all circuit breakers (primarily for test suite tear-down)
   */
  resetCircuitBreakers() {
    for (const breaker of this.circuitBreakers.values()) {
      breaker.reset();
    }
    this.metadataCache.clear();
    this.resolutionCache.clear();
    this.activeResolutionPromises.clear();
  }

  /**
   * Return list of all registered providers, their current health, and circuit breaker state
   */
  getAllStatus() {
    const list = [];
    for (const [key, provider] of this.providers.entries()) {
      const health = provider.getHealth();
      const breaker = this.circuitBreakers.get(key);
      list.push({
        ...health,
        circuitBreaker: breaker ? breaker.getStatus() : null,
      });
    }
    return list;
  }

  /**
   * Normalize text for conservative matching (title / artist)
   * @param {string} str
   * @returns {string}
   */
  normalizeText(str) {
    return String(str || '')
      .toLowerCase()
      .replace(/[^\w\s]/g, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Conservative deduplication of aggregated tracks
   * Merges identical tracks from different providers into alternatives
   * @param {Array} tracks
   * @returns {Array}
   */
  deduplicateTracks(tracks) {
    if (!Array.isArray(tracks) || tracks.length <= 1) return tracks || [];

    const merged = [];
    const seenMap = new Map();

    for (const track of tracks) {
      if (!track || !track.title) continue;

      const normTitle = this.normalizeText(track.title);
      const normArtist = this.normalizeText(track.artist);

      // Distinguish explicit variants (remix, live, cover, acoustic, instrumental, mix, sped up, slowed, tribute, karaoke, orchestral, nightcore, reverb)
      const hasVariantModifier = /(remix|live|cover|acoustic|instrumental|edit|dub|mix|sped up|slowed|tribute|karaoke|orchestral|nightcore|reverb)/i.test(track.title);

      const key = `${normArtist}:::${normTitle}`;

      if (seenMap.has(key)) {
        const existingTrack = seenMap.get(key);

        const durDiff = Math.abs((track.duration || 0) - (existingTrack.duration || 0));
        const canMerge = !hasVariantModifier && durDiff <= 6 && normArtist.length > 2 && normTitle.length > 2;

        if (canMerge) {
          if (!existingTrack.alternatives) {
            existingTrack.alternatives = [];
          }

          existingTrack.alternatives.push({
            provider: track.provider,
            providerTrackId: track.providerTrackId,
            providerTrackUrl: track.providerTrackUrl,
            streamUrl: track.streamUrl,
            needsResolution: Boolean(track.needsResolution),
            isPlayable: track.isPlayable !== false,
            license: track.license,
            attribution: track.attribution,
            duration: track.duration,
          });
          continue;
        }
      }

      // Track is distinct
      const trackCopy = { ...track, alternatives: track.alternatives || [] };
      seenMap.set(key, trackCopy);
      merged.push(trackCopy);
    }

    return merged;
  }

  /**
   * Rank tracks by search relevance and playability
   * @param {Array} tracks
   * @param {string} rawQuery
   * @returns {Array}
   */
  rankTracks(tracks, rawQuery) {
    const q = this.normalizeText(rawQuery);
    if (!q) return tracks;

    const queryTokens = q.split(' ').filter(Boolean);

    return [...tracks].sort((a, b) => {
      const aTitle = this.normalizeText(a.title);
      const bTitle = this.normalizeText(b.title);
      const aArtist = this.normalizeText(a.artist);
      const bArtist = this.normalizeText(b.artist);

      // Score calculation
      let scoreA = 0;
      let scoreB = 0;

      // 1. Exact artist match
      if (aArtist === q) scoreA += 100;
      else if (aArtist.includes(q)) scoreA += 50;

      if (bArtist === q) scoreB += 100;
      else if (bArtist.includes(q)) scoreB += 50;

      // 2. Exact title match
      if (aTitle === q) scoreA += 90;
      else if (aTitle.includes(q)) scoreA += 45;

      if (bTitle === q) scoreB += 90;
      else if (bTitle.includes(q)) scoreB += 45;

      // 3. Token overlap
      for (const token of queryTokens) {
        if (aTitle.includes(token)) scoreA += 20;
        if (aArtist.includes(token)) scoreA += 20;
        if (bTitle.includes(token)) scoreB += 20;
        if (bArtist.includes(token)) scoreB += 20;
      }

      // 4. Playability bonus
      if (a.isPlayable) scoreA += 25;
      if (b.isPlayable) scoreB += 25;

      // 5. Short clip penalty (duration under 15s is often a sound effect, unless user searched for that)
      if (a.duration && a.duration > 0 && a.duration < 15) scoreA -= 40;
      if (b.duration && b.duration > 0 && b.duration < 15) scoreB -= 40;

      return scoreB - scoreA;
    });
  }

  /**
   * Execute independent, fault-isolated multi-source search
   * @param {string} query - Search term
   * @param {object} options - { providers: string[], limit: number }
   * @returns {Promise<{ query: string, results: Array, providers: object, totalResults: number }>}
   */
  async aggregateSearch(query, options = {}) {
    const rawQuery = String(query || '').trim();
    if (!rawQuery) {
      return {
        query: '',
        results: [],
        providers: {},
        totalResults: 0,
      };
    }

    const requestedProviders = Array.isArray(options.providers) && options.providers.length > 0
      ? options.providers.map(p => String(p).toLowerCase().trim())
      : Array.from(this.providers.keys());

    const limitPerProvider = Math.min(25, Math.max(1, parseInt(options.limit) || 10));

    // Check in-memory metadata cache
    const cacheKey = `search:${rawQuery.toLowerCase()}:${requestedProviders.sort().join(',')}:${limitPerProvider}`;
    const cached = this.metadataCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheTtlMs) {
      return { ...cached.data, fromCache: true };
    }

    const providerTasks = [];
    const providerMeta = {};

    for (const name of requestedProviders) {
      const provider = this.providers.get(name);
      if (!provider) continue;

      const breaker = this.circuitBreakers.get(name) || new CircuitBreaker(name);
      this.circuitBreakers.set(name, breaker);

      providerMeta[name] = {
        name: provider.displayName,
        status: provider.isConfigured() ? provider.status : 'unconfigured',
        count: 0,
        error: null,
      };

      // Skip immediately if unconfigured
      if (!provider.isConfigured()) {
        continue;
      }

      // Check circuit breaker state: if OPEN, fast-fail without calling upstream
      if (!breaker.canExecute()) {
        providerMeta[name].status = 'circuit_broken';
        providerMeta[name].error = `Circuit breaker is OPEN for ${provider.displayName} (cooldown active)`;
        continue;
      }

      providerTasks.push(
        (async () => {
          const controller = new AbortController();
          const timeoutMs = 4500; // 4.5s bounded budget
          const timer = setTimeout(() => controller.abort(), timeoutMs);

          try {
            const result = await provider.search(rawQuery, {
              limit: limitPerProvider,
              signal: controller.signal,
            });

            clearTimeout(timer);

            // Record success on circuit breaker if no error returned
            if (!result.error && result.status !== 'unavailable' && result.status !== 'rate_limited') {
              breaker.recordSuccess();
            } else if (result.error) {
              breaker.recordFailure(result.error);
            }

            return {
              providerName: name,
              results: result.results || [],
              error: result.error || null,
              status: result.status || provider.status,
            };
          } catch (err) {
            clearTimeout(timer);
            breaker.recordFailure(err);

            const isTimeout = err.name === 'AbortError' || err.message.toLowerCase().includes('timeout');
            const status = isTimeout ? 'timeout' : 'unavailable';

            return {
              providerName: name,
              results: [],
              error: isTimeout ? `${provider.displayName} search timed out` : err.message,
              status,
            };
          }
        })()
      );
    }

    // Execute all providers in parallel using Promise.allSettled for fault isolation
    const settled = await Promise.allSettled(providerTasks);

    const aggregatedTracks = [];

    for (const item of settled) {
      if (item.status === 'fulfilled' && item.value) {
        const { providerName, results, error, status } = item.value;
        providerMeta[providerName].count = results.length;
        providerMeta[providerName].status = status;
        providerMeta[providerName].error = error;

        if (Array.isArray(results) && results.length > 0) {
          for (const track of results) {
            if (track && track.title && track.provider) {
              aggregatedTracks.push({
                ...track,
                isPlayable: track.isPlayable !== false && Boolean(track.streamUrl || track.url || track.needsResolution),
              });
            }
          }
        }
      }
    }

    // Deduplicate and rank
    const deduplicatedResults = this.deduplicateTracks(aggregatedTracks);
    const rankedResults = this.rankTracks(deduplicatedResults, rawQuery);

    const finalResponse = {
      query: rawQuery,
      results: rankedResults,
      providers: providerMeta,
      totalResults: rankedResults.length,
    };

    // Cache metadata in memory
    if (this.metadataCache.size >= this.cacheMax) {
      const oldestKey = this.metadataCache.keys().next().value;
      this.metadataCache.delete(oldestKey);
    }
    this.metadataCache.set(cacheKey, {
      data: finalResponse,
      timestamp: Date.now(),
    });

    return finalResponse;
  }

  /**
   * Resolve track on demand from appropriate provider with in-flight deduplication and URL validation
   * @param {string} providerName
   * @param {string} trackId
   * @returns {Promise<{ streamUrl: string|null, metadata: object|null, error: string|null, code?: string }>}
   */
  async resolveTrack(providerName, trackId) {
    if (!providerName || typeof providerName !== 'string' || !trackId || typeof trackId !== 'string') {
      return {
        streamUrl: null,
        metadata: null,
        error: 'Invalid provider name or track ID',
        code: 'INVALID_PARAMETERS',
      };
    }

    const key = providerName.toLowerCase().trim();
    const cleanTrackId = trackId.trim();

    const provider = this.get(key);
    if (!provider) {
      return {
        streamUrl: null,
        metadata: null,
        error: `Provider '${providerName}' is not registered`,
        code: 'PROVIDER_NOT_FOUND',
      };
    }

    if (!provider.isConfigured()) {
      return {
        streamUrl: null,
        metadata: null,
        error: `Provider '${provider.displayName || providerName}' is unconfigured or disabled in this environment`,
        code: 'PROVIDER_UNCONFIGURED',
      };
    }

    const cacheKey = `${key}:${cleanTrackId}`;

    // Return cached resolution if fresh
    const cached = this.resolutionCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.resolutionCacheTtlMs) {
      return cached.data;
    }

    // Deduplicate in-flight requests for identical provider + trackId
    if (this.activeResolutionPromises.has(cacheKey)) {
      return this.activeResolutionPromises.get(cacheKey);
    }

    const resolutionPromise = (async () => {
      try {
        const result = await provider.resolveTrack(cleanTrackId);

        if (result && result.streamUrl) {
          const isValidUrl = typeof result.streamUrl === 'string' && /^https?:\/\//i.test(result.streamUrl);
          if (!isValidUrl) {
            return {
              streamUrl: null,
              metadata: result.metadata || null,
              error: 'Provider returned an invalid stream URL protocol',
              code: 'INVALID_STREAM_URL',
            };
          }

          const payload = {
            streamUrl: result.streamUrl,
            mimeType: result.mimeType || 'audio/mpeg',
            expiresAt: result.expiresAt || null,
            metadata: result.metadata || null,
            error: null,
          };

          // Cache resolved stream
          if (this.resolutionCache.size >= this.resolutionCacheMax) {
            const oldestKey = this.resolutionCache.keys().next().value;
            this.resolutionCache.delete(oldestKey);
          }
          this.resolutionCache.set(cacheKey, {
            data: payload,
            timestamp: Date.now(),
          });

          return payload;
        }

        return {
          streamUrl: null,
          metadata: result ? result.metadata : null,
          error: (result && result.error) || 'Track could not be resolved from remote provider',
          code: (result && result.code) || 'RESOLUTION_FAILED',
        };
      } catch (err) {
        return {
          streamUrl: null,
          metadata: null,
          error: err.message || 'Stream resolution error',
          code: 'RESOLUTION_ERROR',
        };
      } finally {
        this.activeResolutionPromises.delete(cacheKey);
      }
    })();

    this.activeResolutionPromises.set(cacheKey, resolutionPromise);
    return resolutionPromise;
  }
}

// Singleton registry instance
const registry = new ProviderRegistry();

module.exports = registry;
