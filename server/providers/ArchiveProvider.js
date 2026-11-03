const BaseProvider = require('./BaseProvider');

class ArchiveProvider extends BaseProvider {
  constructor() {
    super('archive', 'Internet Archive');
    this.baseUrl = 'https://archive.org';
    this.metadataCache = new Map();
  }

  isConfigured() {
    return true; // Public official API, no API keys required
  }

  /**
   * Search Internet Archive audio collections
   * @param {string} query
   * @param {object} options
   * @returns {Promise<{ results: Array, error: string|null, status: string }>}
   */
  async search(query, options = {}) {
    const limit = Math.min(20, Math.max(1, parseInt(options.limit) || 10));
    const cleanQuery = String(query || '').trim().replace(/[^\w\s-]/g, ' ').replace(/\s+/g, ' ');

    if (!cleanQuery) {
      return { results: [], error: null, status: this.status };
    }

    try {
      const searchUrl = `${this.baseUrl}/advancedsearch.php?` + new URLSearchParams({
        q: `mediatype:audio AND (${cleanQuery})`,
        'fl[]': 'identifier,title,creator,description,year,licenseurl,downloads',
        'sort[]': 'downloads desc',
        rows: String(limit),
        page: '1',
        output: 'json',
      }).toString();

      const res = await this.fetchWithTimeout(searchUrl, {
        headers: {
          'User-Agent': 'SOUNDWAVE-Audio-Discovery/1.0 (https://github.com/rk0802p/music_playlist)',
          Accept: 'application/json',
        },
      }, 5000);

      if (!res.ok) {
        throw new Error(`Internet Archive returned HTTP status ${res.status}`);
      }

      const data = await res.json();
      const docs = data.response?.docs || [];

      // Resolve audio streams in parallel with bounded timeout
      const trackPromises = docs.map((doc) => this.resolveDocToTrack(doc));
      const settled = await Promise.allSettled(trackPromises);

      const results = [];
      for (const item of settled) {
        if (item.status === 'fulfilled' && item.value) {
          results.push(item.value);
        }
      }

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
      this.lastError = err.name === 'AbortError' ? 'Search request timed out' : err.message;
      this.lastChecked = new Date();

      return {
        results: [],
        error: this.lastError,
        status: this.status,
      };
    }
  }

  /**
   * Resolve an item identifier to a playable track with audio file stream
   * @param {object} doc
   * @returns {Promise<object|null>}
   */
  async resolveDocToTrack(doc) {
    const identifier = doc.identifier;
    if (!identifier) return null;

    let files = this.metadataCache.get(identifier);

    if (!files) {
      try {
        const metaRes = await this.fetchWithTimeout(
          `${this.baseUrl}/metadata/${encodeURIComponent(identifier)}/files`,
          { headers: { Accept: 'application/json' } },
          3500
        );
        if (metaRes.ok) {
          const metaData = await metaRes.json();
          files = metaData.result || [];
          this.metadataCache.set(identifier, files);
          // Limit cache size
          if (this.metadataCache.size > 200) {
            const firstKey = this.metadataCache.keys().next().value;
            this.metadataCache.delete(firstKey);
          }
        }
      } catch {
        files = [];
      }
    }

    // Select primary audio file (prefer MP3, VBR MP3, or OGG)
    let bestFile = null;
    if (Array.isArray(files) && files.length > 0) {
      bestFile = files.find(f => f.format && f.format.includes('VBR MP3')) ||
                 files.find(f => f.name && f.name.toLowerCase().endsWith('.mp3')) ||
                 files.find(f => f.name && f.name.toLowerCase().endsWith('.ogg'));
    }

    // If metadata files lookup succeeded with an audio file, construct remote stream URL
    let streamUrl = '';
    let duration = 0;
    let fileTitle = '';

    if (bestFile && bestFile.name) {
      streamUrl = `${this.baseUrl}/download/${encodeURIComponent(identifier)}/${encodeURIComponent(bestFile.name)}`;
      duration = Math.round(parseFloat(bestFile.length) || 0);
      fileTitle = bestFile.title || '';
    } else {
      // Fallback: Default download URL if files listing was unavailable
      streamUrl = `${this.baseUrl}/download/${encodeURIComponent(identifier)}`;
    }

    const title = fileTitle || doc.title || identifier;
    const artist = doc.creator || 'Internet Archive Contributor';

    return {
      id: `archive:${identifier}`,
      title: title.slice(0, 100),
      artist: typeof artist === 'string' ? artist.slice(0, 80) : 'Internet Archive Contributor',
      album: doc.title ? doc.title.slice(0, 100) : 'Archive Audio',
      artwork: `${this.baseUrl}/services/img/${encodeURIComponent(identifier)}`,
      duration,
      provider: 'archive',
      providerTrackId: identifier,
      providerTrackUrl: `${this.baseUrl}/details/${encodeURIComponent(identifier)}`,
      url: streamUrl,
      streamUrl,
      license: doc.licenseurl || 'Creative Commons / Public Domain',
      licenseUrl: doc.licenseurl || 'https://creativecommons.org/publicdomain/mark/1.0/',
      attribution: 'Internet Archive (archive.org)',
      playbackCapabilities: {
        canSeek: true,
        canVolume: true,
        hasTimeEvents: true,
        isEmbedded: false,
        playbackType: 'direct',
      },
    };
  }

  /**
   * Resolve single track by identifier
   * @param {string} trackId
   * @returns {Promise<{ streamUrl: string|null, metadata: object|null, error: string|null }>}
   */
  async resolveTrack(trackId) {
    try {
      const identifier = trackId.replace(/^archive:/, '');
      const metaRes = await this.fetchWithTimeout(
        `${this.baseUrl}/metadata/${encodeURIComponent(identifier)}`,
        { headers: { Accept: 'application/json' } },
        4000
      );

      if (!metaRes.ok) {
        return { streamUrl: null, metadata: null, error: `Item not found on Internet Archive (${metaRes.status})` };
      }

      const data = await metaRes.json();
      const doc = data.metadata || { identifier };
      doc.identifier = identifier;

      const track = await this.resolveDocToTrack(doc);
      return {
        streamUrl: track?.streamUrl || null,
        metadata: track,
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

module.exports = ArchiveProvider;
