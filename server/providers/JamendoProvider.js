const BaseProvider = require('./BaseProvider');
const { getProviderPolicy } = require('../config/providerPolicy');

class JamendoProvider extends BaseProvider {
  constructor() {
    super('jamendo', 'Jamendo Music');
    this.baseUrl = 'https://api.jamendo.com/v3.0';
    this.metadataCache = new Map();
    this.cacheMax = 100;
    this.cacheTtlMs = 1000 * 60 * 5; // 5-minute bounded TTL
  }

  isConfigured() {
    return Boolean(process.env.JAMENDO_CLIENT_ID && process.env.JAMENDO_CLIENT_ID.trim());
  }

  getClientId() {
    return (process.env.JAMENDO_CLIENT_ID || '').trim();
  }

  getCapabilities() {
    const policy = getProviderPolicy('jamendo');
    return {
      supportsSearch: true,
      supportsDirectStream: true,
      requiresResolution: false,
      isTemporaryUrl: false,
      authRequired: true,
      environmentRestrictions: 'configured_only',
      authorizationStatus: policy.classification,
      policyClassification: policy.classification,
    };
  }

  /**
   * Parse Creative Commons license metadata from Jamendo license_ccurl
   * e.g. "http://creativecommons.org/licenses/by-nc-sa/3.0/" -> "CC BY-NC-SA 3.0"
   * @param {string} licenseCcUrl
   * @returns {{
   *   licenseStatus: 'verified'|'unknown',
   *   name: string|null,
   *   code: string,
   *   url: string|null,
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

      let rawTracks = data.results || [];

      // Fallback: If full-text search yielded 0 results, retry with fuzzyfttags for genre/mood/tag matching
      if (rawTracks.length === 0 && !options.signal?.aborted) {
        try {
          const fallbackUrl = `${this.baseUrl}/tracks/?` + new URLSearchParams({
            client_id: this.getClientId(),
            format: 'json',
            limit: String(limit),
            fuzzyfttags: cleanQuery,
            include: 'musicinfo+licenses',
          }).toString();
          const fallbackRes = await this.fetchWithTimeout(fallbackUrl, {
            headers: {
              'User-Agent': 'SOUNDWAVE-Audio-Discovery/1.0',
              Accept: 'application/json',
            },
            signal: options.signal,
          }, 3000);
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            if (fallbackData.headers?.status === 'success' && Array.isArray(fallbackData.results) && fallbackData.results.length > 0) {
              rawTracks = fallbackData.results;
            }
          }
        } catch (_) {
          // Fallback failure is non-fatal; continue with original empty results
        }
      }

      const results = rawTracks.map((item) => {
        const licenseMeta = this.parseLicense(item.license_ccurl);
        const shareUrl = item.shareurl || `https://www.jamendo.com/track/${item.id}`;

        // Strict compliance check: only tracks with verified CC licenses and valid audio streams are playable
        const isLicenseVerified = licenseMeta && licenseMeta.licenseStatus === 'verified';
        const isPlayable = Boolean(item.audio) && isLicenseVerified;
        const streamUrl = isPlayable ? item.audio : null;

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
          url: streamUrl || '',
          streamUrl: streamUrl || '',
          isPlayable,
          needsResolution: false,
          license: licenseMeta.name || 'Unknown License',
          licenseCode: licenseMeta.code,
          licenseUrl: licenseMeta.url,
          licenseMeta: licenseMeta,
          attribution: licenseMeta.name
            ? `${item.artist_name || 'Artist'} via Jamendo Music (${licenseMeta.name})`
            : `${item.artist_name || 'Artist'} via Jamendo Music`,
          playbackCapabilities: {
            canSeek: isPlayable,
            canVolume: true,
            hasTimeEvents: true,
            isEmbedded: false,
            playbackType: isPlayable ? 'direct' : 'unsupported',
            restrictionReason: isPlayable
              ? null
              : (!isLicenseVerified ? 'Unverified or unsupported license metadata' : 'Missing audio stream'),
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
   * @returns {Promise<{ streamUrl: string|null, metadata: object|null, error: string|null, code?: string }>}
   */
  async resolveTrack(trackId) {
    if (!this.isConfigured()) {
      return { streamUrl: null, metadata: null, error: 'Jamendo is unconfigured', code: 'PROVIDER_UNCONFIGURED' };
    }

    try {
      const rawId = trackId.replace(/^jamendo:/, '');
      const url = `${this.baseUrl}/tracks/?client_id=${this.getClientId()}&format=json&id=${encodeURIComponent(rawId)}&include=musicinfo+licenses`;
      const res = await this.fetchWithTimeout(url, {}, 4000);

      if (!res.ok) {
        return {
          streamUrl: null,
          metadata: null,
          error: `Jamendo track fetch failed (${res.status})`,
          code: 'RESOLUTION_FAILED',
        };
      }

      const data = await res.json();
      let track = data.results?.[0];

      // Replica resilience: retry with array format id[] if primary query returned empty results
      if (!track) {
        try {
          const retryUrl = `${this.baseUrl}/tracks/?client_id=${this.getClientId()}&format=json&id[]=${encodeURIComponent(rawId)}&include=musicinfo+licenses`;
          const retryRes = await this.fetchWithTimeout(retryUrl, {}, 3000);
          if (retryRes.ok) {
            const retryData = await retryRes.json();
            if (retryData.results?.[0]) {
              track = retryData.results[0];
            }
          }
        } catch (_) {
          // Ignore retry failure and proceed to not found check
        }
      }

      if (!track) {
        return {
          streamUrl: null,
          metadata: null,
          error: 'Track not found on Jamendo',
          code: 'NOT_FOUND',
        };
      }

      const licenseMeta = this.parseLicense(track.license_ccurl);
      const shareUrl = track.shareurl || `https://www.jamendo.com/track/${track.id}`;

      // Strict enforcement: if license is unverified, reject playback resolution
      if (!licenseMeta || licenseMeta.licenseStatus !== 'verified') {
        return {
          streamUrl: null,
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
            streamUrl: null,
            isPlayable: false,
            license: licenseMeta?.name || 'Unknown License',
            licenseCode: licenseMeta?.code || 'UNKNOWN',
            licenseUrl: licenseMeta?.url || null,
            licenseMeta,
            restrictionReason: 'Track license could not be verified or is not supported for streaming',
          },
          error: 'Playback unavailable: Track license could not be verified or is not supported for streaming',
          code: 'LICENSE_UNVERIFIED',
        };
      }

      if (!track.audio) {
        return {
          streamUrl: null,
          metadata: null,
          error: 'No audio stream available for this track on Jamendo',
          code: 'STREAM_UNAVAILABLE',
        };
      }

      return {
        streamUrl: track.audio,
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
          streamUrl: track.audio,
          isPlayable: true,
          needsResolution: false,
          license: licenseMeta.name,
          licenseCode: licenseMeta.code,
          licenseUrl: licenseMeta.url,
          licenseMeta: licenseMeta,
          attribution: `${track.artist_name || 'Artist'} via Jamendo Music (${licenseMeta.name})`,
        },
        error: null,
      };
    } catch (err) {
      return { streamUrl: null, metadata: null, error: err.message, code: 'RESOLUTION_ERROR' };
    }
  }
}

module.exports = JamendoProvider;
