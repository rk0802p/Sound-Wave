const ArchiveProvider = require('./ArchiveProvider');
const JamendoProvider = require('./JamendoProvider');
const AudiusProvider = require('./AudiusProvider');

class ProviderRegistry {
  constructor() {
    this.providers = new Map();

    // Register active provider adapters
    this.register(new ArchiveProvider());
    this.register(new JamendoProvider());
    this.register(new AudiusProvider());
  }

  /**
   * Register a new provider instance
   * @param {BaseProvider} provider
   */
  register(provider) {
    if (!provider || !provider.name) {
      throw new Error('Invalid provider: missing name');
    }
    this.providers.set(provider.name.toLowerCase(), provider);
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
   * Return list of all registered providers and their current status
   */
  getAllStatus() {
    const list = [];
    for (const provider of this.providers.values()) {
      list.push(provider.getHealth());
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
   * Only merges when normalized title AND artist match with similar duration.
   * Preserves remixes, covers, live versions, and alternatives.
   * @param {Array} tracks
   * @returns {Array}
   */
  deduplicateTracks(tracks) {
    if (!Array.isArray(tracks) || tracks.length <= 1) return tracks || [];

    const merged = [];
    const seenMap = new Map();

    for (const track of tracks) {
      const normTitle = this.normalizeText(track.title);
      const normArtist = this.normalizeText(track.artist);

      // Distinguish distinct variations (remix, live, cover, acoustic, instrumental)
      const hasVariantModifier = /(remix|live|cover|acoustic|instrumental|edit|dub|mix)/i.test(track.title);

      const key = `${normArtist}:::${normTitle}`;

      if (seenMap.has(key)) {
        const existingTrack = seenMap.get(key);

        // Check duration similarity (within 6 seconds) and ensure neither is an unshared variant
        const durDiff = Math.abs((track.duration || 0) - (existingTrack.duration || 0));
        const canMerge = !hasVariantModifier && durDiff <= 6 && normArtist.length > 2 && normTitle.length > 2;

        if (canMerge) {
          if (!existingTrack.alternatives) {
            existingTrack.alternatives = [];
          }

          // Add as alternate source without duplicating in the primary list
          existingTrack.alternatives.push({
            provider: track.provider,
            providerTrackId: track.providerTrackId,
            providerTrackUrl: track.providerTrackUrl,
            streamUrl: track.streamUrl,
            license: track.license,
            attribution: track.attribution,
          });
          continue;
        }
      }

      // Track is distinct
      const trackCopy = { ...track, alternatives: [] };
      seenMap.set(key, trackCopy);
      merged.push(trackCopy);
    }

    return merged;
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

    const providerTasks = [];
    const providerMeta = {};

    for (const name of requestedProviders) {
      const provider = this.providers.get(name);
      if (!provider) continue;

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

      providerTasks.push(
        (async () => {
          try {
            const result = await provider.search(rawQuery, { limit: limitPerProvider });
            return {
              providerName: name,
              results: result.results || [],
              error: result.error || null,
              status: result.status || provider.status,
            };
          } catch (err) {
            return {
              providerName: name,
              results: [],
              error: err.message,
              status: 'unavailable',
            };
          }
        })()
      );
    }

    // Execute all providers in parallel using Promise.allSettled to guarantee complete fault isolation
    const settled = await Promise.allSettled(providerTasks);

    const aggregatedTracks = [];

    for (const item of settled) {
      if (item.status === 'fulfilled' && item.value) {
        const { providerName, results, error, status } = item.value;
        providerMeta[providerName].count = results.length;
        providerMeta[providerName].status = status;
        providerMeta[providerName].error = error;

        if (Array.isArray(results) && results.length > 0) {
          aggregatedTracks.push(...results);
        }
      }
    }

    // Apply conservative deduplication to the aggregated results
    const deduplicatedResults = this.deduplicateTracks(aggregatedTracks);

    return {
      query: rawQuery,
      results: deduplicatedResults,
      providers: providerMeta,
      totalResults: deduplicatedResults.length,
    };
  }

  /**
   * Resolve track on demand from appropriate provider
   * @param {string} providerName
   * @param {string} trackId
   * @returns {Promise<{ streamUrl: string|null, metadata: object|null, error: string|null }>}
   */
  async resolveTrack(providerName, trackId) {
    const provider = this.get(providerName);
    if (!provider) {
      return {
        streamUrl: null,
        metadata: null,
        error: `Provider '${providerName}' is not registered`,
      };
    }

    return provider.resolveTrack(trackId);
  }
}

// Singleton registry instance
const registry = new ProviderRegistry();

module.exports = registry;
