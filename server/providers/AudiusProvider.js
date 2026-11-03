const BaseProvider = require('./BaseProvider');

class AudiusProvider extends BaseProvider {
  constructor() {
    super('audius', 'Audius Music');
    this.baseUrl = 'https://api.audius.co/v1';
  }

  isConfigured() {
    // Audius requires an API key in modern v1 endpoints, configured via AUDIUS_API_KEY
    return Boolean(process.env.AUDIUS_API_KEY && process.env.AUDIUS_API_KEY.trim());
  }

  getApiKey() {
    return (process.env.AUDIUS_API_KEY || '').trim();
  }

  /**
   * Search Audius decentralized music network
   * @param {string} query
   * @param {object} options
   * @returns {Promise<{ results: Array, error: string|null, status: string }>}
   */
  async search(query, options = {}) {
    if (!this.isConfigured()) {
      this.status = 'unconfigured';
      return {
        results: [],
        error: 'Audius integration is unconfigured (set AUDIUS_API_KEY in server environment)',
        status: 'unconfigured',
      };
    }

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

      const res = await this.fetchWithTimeout(searchUrl, { headers }, 5000);

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

      const results = rawTracks.map((item) => ({
        id: `audius:${item.id}`,
        title: item.title || 'Untitled Track',
        artist: item.user?.name || 'Audius Artist',
        album: item.genre || 'Audius Release',
        artwork: item.artwork?.['480x480'] || item.artwork?.['150x150'] || '',
        duration: item.duration || 0,
        provider: 'audius',
        providerTrackId: String(item.id),
        providerTrackUrl: `https://audius.co${item.permalink || ''}`,
        url: `${this.baseUrl}/tracks/${item.id}/stream?app_name=SOUNDWAVE`,
        streamUrl: `${this.baseUrl}/tracks/${item.id}/stream?app_name=SOUNDWAVE`,
        license: item.is_streamable ? 'Audius Stream License' : 'Standard License',
        licenseUrl: 'https://audius.org',
        attribution: `${item.user?.name || 'Artist'} on Audius`,
        playbackCapabilities: {
          canSeek: true,
          canVolume: true,
          hasTimeEvents: true,
          isEmbedded: false,
          playbackType: 'direct',
        },
      }));

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
    if (!this.isConfigured()) {
      return { streamUrl: null, metadata: null, error: 'Audius is unconfigured' };
    }

    const rawId = trackId.replace(/^audius:/, '');
    const streamUrl = `${this.baseUrl}/tracks/${encodeURIComponent(rawId)}/stream?app_name=SOUNDWAVE`;
    return {
      streamUrl,
      metadata: null,
      error: null,
    };
  }
}

module.exports = AudiusProvider;
