const BaseProvider = require('./BaseProvider');

class JamendoProvider extends BaseProvider {
  constructor() {
    super('jamendo', 'Jamendo Music');
    this.baseUrl = 'https://api.jamendo.com/v3.0';
  }

  isConfigured() {
    return Boolean(process.env.JAMENDO_CLIENT_ID && process.env.JAMENDO_CLIENT_ID.trim());
  }

  getClientId() {
    return (process.env.JAMENDO_CLIENT_ID || '').trim();
  }

  /**
   * Search Jamendo Creative Commons music catalog
   * @param {string} query
   * @param {object} options
   * @returns {Promise<{ results: Array, error: string|null, status: string }>}
   */
  async search(query, options = {}) {
    if (!this.isConfigured()) {
      this.status = 'unconfigured';
      return {
        results: [],
        error: 'Jamendo integration is unconfigured (set JAMENDO_CLIENT_ID in server environment)',
        status: 'unconfigured',
      };
    }

    const limit = Math.min(20, Math.max(1, parseInt(options.limit) || 10));
    const cleanQuery = String(query || '').trim();

    if (!cleanQuery) {
      return { results: [], error: null, status: this.status };
    }

    try {
      const searchUrl = `${this.baseUrl}/tracks/?` + new URLSearchParams({
        client_id: this.getClientId(),
        format: 'jsonpretty',
        limit: String(limit),
        search: cleanQuery,
        include: 'musicinfo+licenses',
        audioformat: 'mp32',
      }).toString();

      const res = await this.fetchWithTimeout(searchUrl, {
        headers: {
          'User-Agent': 'SOUNDWAVE-Audio-Discovery/1.0',
          Accept: 'application/json',
        },
      }, 5000);

      if (res.status === 429) {
        this.status = 'rate_limited';
        this.lastError = 'Jamendo API rate limit reached (HTTP 429)';
        return { results: [], error: this.lastError, status: this.status };
      }

      if (!res.ok) {
        throw new Error(`Jamendo API returned HTTP status ${res.status}`);
      }

      const data = await res.json();

      // Check Jamendo header warnings for usage limits
      if (data.headers?.warnings && String(data.headers.warnings).includes('Usage limits are exceeded')) {
        this.status = 'rate_limited';
        this.lastError = 'Jamendo API rate limit exceeded for client ID';
        return { results: [], error: this.lastError, status: this.status };
      }

      if (data.headers?.status === 'failed') {
        throw new Error(data.headers?.error_message || 'Jamendo request failed');
      }

      const rawTracks = data.results || [];
      const results = rawTracks.map((item) => ({
        id: `jamendo:${item.id}`,
        title: item.name || 'Untitled Jamendo Track',
        artist: item.artist_name || 'Jamendo Artist',
        album: item.album_name || '',
        artwork: item.image || item.album_image || '',
        duration: item.duration || 0,
        provider: 'jamendo',
        providerTrackId: String(item.id),
        providerTrackUrl: item.shareurl || `https://www.jamendo.com/track/${item.id}`,
        url: item.audio || '',
        streamUrl: item.audio || '',
        license: item.license_ccurl ? 'Creative Commons' : 'Jamendo Free Listening',
        licenseUrl: item.license_ccurl || 'https://creativecommons.org/licenses/',
        attribution: `${item.artist_name || 'Artist'} via Jamendo Music`,
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
      this.lastError = err.name === 'AbortError' ? 'Jamendo search request timed out' : err.message;
      this.lastChecked = new Date();

      return {
        results: [],
        error: this.lastError,
        status: this.status,
      };
    }
  }

  /**
   * Resolve track by Jamendo ID
   * @param {string} trackId
   * @returns {Promise<{ streamUrl: string|null, metadata: object|null, error: string|null }>}
   */
  async resolveTrack(trackId) {
    if (!this.isConfigured()) {
      return { streamUrl: null, metadata: null, error: 'Jamendo is unconfigured' };
    }

    try {
      const rawId = trackId.replace(/^jamendo:/, '');
      const url = `${this.baseUrl}/tracks/?client_id=${this.getClientId()}&format=jsonpretty&id=${encodeURIComponent(rawId)}&include=musicinfo+licenses`;
      const res = await this.fetchWithTimeout(url, {}, 4000);

      if (!res.ok) {
        return { streamUrl: null, metadata: null, error: `Jamendo track fetch failed (${res.status})` };
      }

      const data = await res.json();
      const track = data.results?.[0];
      if (!track) {
        return { streamUrl: null, metadata: null, error: 'Track not found on Jamendo' };
      }

      return {
        streamUrl: track.audio || null,
        metadata: {
          id: `jamendo:${track.id}`,
          title: track.name,
          artist: track.artist_name,
          album: track.album_name,
          artwork: track.image,
          duration: track.duration,
          provider: 'jamendo',
          providerTrackId: String(track.id),
          providerTrackUrl: track.shareurl || `https://www.jamendo.com/track/${track.id}`,
          streamUrl: track.audio,
          license: track.license_ccurl || 'Creative Commons',
          licenseUrl: track.license_ccurl || 'https://creativecommons.org/licenses/',
          attribution: `${track.artist_name} via Jamendo Music`,
        },
        error: null,
      };
    } catch (err) {
      return { streamUrl: null, metadata: null, error: err.message };
    }
  }
}

module.exports = JamendoProvider;
