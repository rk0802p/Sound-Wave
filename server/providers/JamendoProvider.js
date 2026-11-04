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

  getCapabilities() {
    return {
      supportsSearch: true,
      supportsDirectStream: true,
      requiresResolution: false,
      isTemporaryUrl: false,
      authRequired: true,
      environmentRestrictions: 'configured_only',
      authorizationStatus: 'verified_public',
    };
  }

  /**
   * Parse Creative Commons license metadata from Jamendo license_ccurl
   * e.g. "http://creativecommons.org/licenses/by-nc-sa/3.0/" -> "CC BY-NC-SA 3.0"
   * @param {string} licenseCcUrl
   * @returns {{
   *   name: string,
   *   code: string,
   *   url: string,
   *   attributionRequired: boolean,
   *   hasCommercialRestriction: boolean,
   *   hasDerivativeRestriction: boolean,
   *   shareAlikeRequired: boolean,
   *   isCommercialPermitted: boolean,
   *   jamendoTermsNote: string
   * }}
   */
  parseLicense(licenseCcUrl) {
    const rawUrl = String(licenseCcUrl || '').trim();
    if (!rawUrl) {
      return {
        licenseStatus: 'unknown',
        name: null,
        code: 'UNKNOWN',
        url: null,
        attributionRequired: true,
        hasCommercialRestriction: true,
        hasDerivativeRestriction: false,
        shareAlikeRequired: false,
        isCommercialPermitted: false,
        jamendoTermsNote: 'License metadata not specified by provider. Defaulting to restricted personal listening.'
      };
    }

    const urlMatch = rawUrl.match(/licenses\/([a-z0-9-]+)\/([0-9.]+)/i);
    const zeroMatch = rawUrl.match(/publicdomain\/zero\/([0-9.]+)/i);

    let code = null;
    let version = '';

    if (zeroMatch) {
      code = 'CC0';
      version = zeroMatch[1];
    } else if (urlMatch) {
      const parts = urlMatch[1].toUpperCase();
      version = urlMatch[2];
      code = `CC ${parts}`;
    } else {
      const lower = rawUrl.toLowerCase();
      if (lower.includes('zero') || lower.includes('cc0')) code = 'CC0';
      else if (lower.includes('by-nc-sa')) code = 'CC BY-NC-SA';
      else if (lower.includes('by-nc-nd')) code = 'CC BY-NC-ND';
      else if (lower.includes('by-nc')) code = 'CC BY-NC';
      else if (lower.includes('by-sa')) code = 'CC BY-SA';
      else if (lower.includes('by-nd')) code = 'CC BY-ND';
      else if (lower.includes('by')) code = 'CC BY';
      else {
        return {
          licenseStatus: 'unknown',
          name: null,
          code: 'UNKNOWN',
          url: rawUrl,
          attributionRequired: true,
          hasCommercialRestriction: true,
          hasDerivativeRestriction: false,
          shareAlikeRequired: false,
          isCommercialPermitted: false,
          jamendoTermsNote: 'Unrecognized license URL. Commercial or derivative reuse not permitted without explicit license verification.'
        };
      }
    }

    const cleanCode = version ? `${code} ${version}` : code;
    const lowerCode = cleanCode.toLowerCase();

    const isZero = lowerCode.includes('cc0');
    const hasCommercialRestriction = !isZero && lowerCode.includes('nc');
    const hasDerivativeRestriction = !isZero && lowerCode.includes('nd');
    const shareAlikeRequired = !isZero && lowerCode.includes('sa');
    const attributionRequired = !isZero && (lowerCode.includes('by') || code.includes('BY'));

    return {
      licenseStatus: 'verified',
      name: cleanCode,
      code: cleanCode,
      url: rawUrl,
      attributionRequired,
      hasCommercialRestriction,
      hasDerivativeRestriction,
      shareAlikeRequired,
      isCommercialPermitted: !hasCommercialRestriction,
      jamendoTermsNote: hasCommercialRestriction
        ? 'Creator specified Non-Commercial (NC). Jamendo API terms permit private personal streaming in SOUNDWAVE. Commercial synchronization requires Jamendo PRO license.'
        : 'Creator permits commercial reuse with attribution under CC terms. Jamendo platform stream remains non-exclusive.'
    };
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

    const limit = Math.min(30, Math.max(1, parseInt(options.limit) || 10));
    const cleanQuery = String(query || '').trim();

    if (!cleanQuery) {
      return { results: [], error: null, status: this.status };
    }

    try {
      const searchUrl = `${this.baseUrl}/tracks/?` + new URLSearchParams({
        client_id: this.getClientId(),
        format: 'json',
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
        signal: options.signal,
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
      const results = rawTracks.map((item) => {
        const licenseMeta = this.parseLicense(item.license_ccurl);
        const shareUrl = item.shareurl || `https://www.jamendo.com/track/${item.id}`;
        return {
          id: `jamendo:${item.id}`,
          title: item.name || 'Untitled Jamendo Track',
          artist: item.artist_name || 'Jamendo Artist',
          album: item.album_name || '',
          artwork: item.image || item.album_image || '',
          duration: item.duration || 0,
          provider: 'jamendo',
          providerTrackId: String(item.id),
          providerTrackUrl: shareUrl,
          url: item.audio || '',
          streamUrl: item.audio || '',
          isPlayable: Boolean(item.audio),
          needsResolution: false,
          license: licenseMeta.name,
          licenseCode: licenseMeta.code,
          licenseUrl: licenseMeta.url,
          licenseMeta: licenseMeta,
          attribution: licenseMeta.name
            ? `${item.artist_name || 'Artist'} via Jamendo Music (${licenseMeta.name})`
            : `${item.artist_name || 'Artist'} via Jamendo Music`,
          playbackCapabilities: {
            canSeek: true,
            canVolume: true,
            hasTimeEvents: true,
            isEmbedded: false,
            playbackType: 'direct',
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
      const url = `${this.baseUrl}/tracks/?client_id=${this.getClientId()}&format=json&id=${encodeURIComponent(rawId)}&include=musicinfo+licenses&audioformat=mp32`;
      const res = await this.fetchWithTimeout(url, {}, 4000);

      if (!res.ok) {
        return { streamUrl: null, metadata: null, error: `Jamendo track fetch failed (${res.status})` };
      }

      const data = await res.json();
      const track = data.results?.[0];
      if (!track) {
        return { streamUrl: null, metadata: null, error: 'Track not found on Jamendo' };
      }

      const licenseMeta = this.parseLicense(track.license_ccurl);
      const shareUrl = track.shareurl || `https://www.jamendo.com/track/${track.id}`;

      return {
        streamUrl: track.audio || null,
        metadata: {
          id: `jamendo:${track.id}`,
          title: track.name || 'Untitled Jamendo Track',
          artist: track.artist_name || 'Jamendo Artist',
          album: track.album_name || '',
          artwork: track.image || track.album_image || '',
          duration: track.duration || 0,
          provider: 'jamendo',
          providerTrackId: String(track.id),
          providerTrackUrl: shareUrl,
          streamUrl: track.audio || '',
          isPlayable: Boolean(track.audio),
          needsResolution: false,
          license: licenseMeta.name,
          licenseCode: licenseMeta.code,
          licenseUrl: licenseMeta.url,
          licenseMeta: licenseMeta,
          attribution: licenseMeta.name
            ? `${track.artist_name || 'Artist'} via Jamendo Music (${licenseMeta.name})`
            : `${track.artist_name || 'Artist'} via Jamendo Music`,
        },
        error: null,
      };
    } catch (err) {
      return { streamUrl: null, metadata: null, error: err.message };
    }
  }
}

module.exports = JamendoProvider;
