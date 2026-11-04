const BaseProvider = require('./BaseProvider');

class AudiusProvider extends BaseProvider {
  constructor() {
    super('audius', 'Audius Music');
    this.baseUrl = 'https://api.audius.co/v1';
  }

  isConfigured() {
    // Audius official documentation specifies that read-only search and streaming
    // endpoints work without credentials. An API key is optional for higher rate limits.
    return true;
  }

  getApiKey() {
    return (process.env.AUDIUS_API_KEY || '').trim();
  }

  getCapabilities() {
    return {
      supportsSearch: true,
      supportsDirectStream: true,
      requiresResolution: false,
      isTemporaryUrl: false,
      authRequired: false,
      environmentRestrictions: 'unrestricted',
      authorizationStatus: 'creator_terms',
    };
  }

  /**
   * Search Audius decentralized music network
   * @param {string} query
   * @param {object} options
   * @returns {Promise<{ results: Array, error: string|null, status: string }>}
   */
  async search(query, options = {}) {
    const limit = Math.min(20, Math.max(1, parseInt(options.limit) || 10));
    const cleanQuery = String(query || '').trim();

    if (!cleanQuery) {
      return { results: [], error: null, status: this.status };
    }

    try {
      const searchUrl = `${this.baseUrl}/tracks/search?` + new URLSearchParams({
        query: cleanQuery,
        app_name: 'SOUNDWAVE',
        limit: String(limit),
      }).toString();

      const headers = {
        'User-Agent': 'SOUNDWAVE-Audio-Discovery/1.0',
        Accept: 'application/json',
      };
      if (this.getApiKey()) {
        headers['x-api-key'] = this.getApiKey();
      }

      const res = await this.fetchWithTimeout(searchUrl, { headers, signal: options.signal }, 5000);

      if (res.status === 429) {
        this.status = 'rate_limited';
        this.lastError = 'Audius rate limit reached (HTTP 429)';
        return { results: [], error: this.lastError, status: this.status };
      }

      if (!res.ok) {
        throw new Error(`Audius API returned HTTP status ${res.status}`);
      }

      const data = await res.json();
      const rawTracks = data.data || [];

      const results = rawTracks.map((item) => {
        // Respect creator permissions and track-level stream conditions
        const isPlayable = item.is_streamable !== false && !item.stream_conditions && !item.is_unlisted;
        const streamUrl = isPlayable
          ? `${this.baseUrl}/tracks/${item.id}/stream?app_name=SOUNDWAVE`
          : null;

        return {
          id: `audius:${item.id}`,
          title: item.title || 'Untitled Track',
          artist: item.user?.name || 'Audius Artist',
          album: item.genre || 'Audius Release',
          artwork: item.artwork?.['480x480'] || item.artwork?.['150x150'] || '',
          duration: item.duration || 0,
          provider: 'audius',
          providerTrackId: String(item.id),
          providerTrackUrl: `https://audius.co${item.permalink || ''}`,
          url: streamUrl || '',
          streamUrl: streamUrl || '',
          isPlayable,
          license: isPlayable ? 'Audius Stream License (Subject to Creator Terms)' : 'Creator Restricted',
          licenseUrl: 'https://audius.org',
          attribution: `${item.user?.name || 'Artist'} on Audius`,
          playbackCapabilities: {
            canSeek: isPlayable,
            canVolume: true,
            hasTimeEvents: true,
            isEmbedded: false,
            playbackType: isPlayable ? 'direct' : 'unsupported',
            restrictionReason: isPlayable ? null : 'Streaming restricted by creator',
          },
        };
      });

      this.status = 'available';
      this.lastError = null;
      this.lastChecked = new Date();

      return {
        results,
        error: null,
        status: this.status,
      };
    } catch (err) {
      this.status = err.name === 'AbortError' ? 'degraded' : 'unavailable';
      this.lastError = err.name === 'AbortError' ? 'Audius search request timed out' : err.message;
      this.lastChecked = new Date();

      return {
        results: [],
        error: this.lastError,
        status: this.status,
      };
    }
  }

  /**
   * Resolve Audius track by ID
   * @param {string} trackId
   * @returns {Promise<{ streamUrl: string|null, metadata: object|null, error: string|null }>}
   */
  async resolveTrack(trackId) {
    try {
      const rawId = trackId.replace(/^audius:/, '');
      const trackUrl = `${this.baseUrl}/tracks/${encodeURIComponent(rawId)}?app_name=SOUNDWAVE`;
      const headers = {
        'User-Agent': 'SOUNDWAVE-Audio-Discovery/1.0',
        Accept: 'application/json',
      };
      if (this.getApiKey()) {
        headers['x-api-key'] = this.getApiKey();
      }

      const res = await this.fetchWithTimeout(trackUrl, { headers }, 4000);
      if (!res.ok) {
        return { streamUrl: null, metadata: null, error: `Audius track fetch failed (${res.status})` };
      }

      const data = await res.json();
      const track = data.data;
      if (!track) {
        return { streamUrl: null, metadata: null, error: 'Track not found on Audius' };
      }

      const isPlayable = track.is_streamable !== false && !track.stream_conditions && !track.is_unlisted;
      if (!isPlayable) {
        return {
          streamUrl: null,
          metadata: null,
          error: 'Playback restricted by track creator on Audius',
        };
      }

      const streamUrl = `${this.baseUrl}/tracks/${encodeURIComponent(rawId)}/stream?app_name=SOUNDWAVE`;
      return {
        streamUrl,
        metadata: {
          id: `audius:${track.id}`,
          title: track.title,
          artist: track.user?.name,
          album: track.genre,
          artwork: track.artwork?.['480x480'] || track.artwork?.['150x150'] || '',
          duration: track.duration,
          provider: 'audius',
          providerTrackId: String(track.id),
          providerTrackUrl: `https://audius.co${track.permalink || ''}`,
          streamUrl,
          isPlayable: true,
          license: 'Audius Stream License (Subject to Creator Terms)',
          licenseUrl: 'https://audius.org',
          attribution: `${track.user?.name || 'Artist'} on Audius`,
        },
        error: null,
      };
    } catch (err) {
      return {
        streamUrl: null,
        metadata: null,
        error: err.message,
      };
    }
  }
}

module.exports = AudiusProvider;
