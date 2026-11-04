const BaseProvider = require('./BaseProvider');

// Self-contained pure-JS DES-ECB decryptor for Saavn encrypted_media_url
// Enables zero-dependency DES decryption across all Node versions without legacy flags
const IP = [58,50,42,34,26,18,10,2,60,52,44,36,28,20,12,4,62,54,46,38,30,22,14,6,64,56,48,40,32,24,16,8,57,49,41,33,25,17,9,1,59,51,43,35,27,19,11,3,61,53,45,37,29,21,13,5,63,55,47,39,31,23,15,7];
const FP = [40,8,48,16,56,24,64,32,39,7,47,15,55,23,63,31,38,6,46,14,54,22,62,30,37,5,45,13,53,21,61,29,36,4,44,12,52,20,60,28,35,3,43,11,51,19,59,27,34,2,42,10,50,18,58,26,33,1,41,9,49,17,57,25];
const E = [32,1,2,3,4,5,4,5,6,7,8,9,8,9,10,11,12,13,12,13,14,15,16,17,16,17,18,19,20,21,20,21,22,23,24,25,24,25,26,27,28,29,28,29,30,31,32,1];
const P = [16,7,20,21,29,12,28,17,1,15,23,26,5,18,31,10,2,8,24,14,32,27,3,9,19,13,30,6,22,11,4,25];
const S = [
  [14,4,13,1,2,15,11,8,3,10,6,12,5,9,0,7,0,15,7,4,14,2,13,1,10,6,12,11,9,5,3,8,4,1,14,8,13,6,2,11,15,12,9,7,3,10,5,0,15,12,8,2,4,9,1,7,5,11,3,14,10,0,6,13],
  [15,1,8,14,6,11,3,4,9,7,2,13,12,0,5,10,3,13,4,7,15,2,8,14,12,0,1,10,6,9,11,5,0,14,7,11,10,4,13,1,5,8,12,6,9,3,2,15,13,8,10,1,3,15,4,2,11,6,7,12,0,5,14,9],
  [10,0,9,14,6,3,15,5,1,13,12,7,11,4,2,8,13,7,0,9,3,4,6,10,2,8,5,14,12,11,15,1,13,6,4,9,8,15,3,0,11,1,2,12,5,10,14,7,1,10,13,0,6,9,8,7,4,15,14,3,11,5,2,12],
  [7,13,14,3,0,6,9,10,1,2,8,5,11,12,4,15,13,8,11,5,6,15,0,3,4,7,2,12,1,10,14,9,10,6,9,0,12,11,7,13,15,1,3,14,5,2,8,4,3,15,0,6,10,1,13,8,9,4,5,11,12,7,2,14],
  [2,12,4,1,7,10,11,6,8,5,3,15,13,0,14,9,14,11,2,12,4,7,13,1,5,0,15,10,3,9,8,6,4,2,1,11,10,13,7,8,15,9,12,5,6,3,0,14,11,8,12,7,1,14,2,13,6,15,0,9,10,4,5,3],
  [12,1,10,15,9,2,6,8,0,13,3,4,14,7,5,11,10,15,4,2,7,12,9,5,6,1,13,14,0,11,3,8,9,14,15,5,2,8,12,3,7,0,4,10,1,13,11,6,4,3,2,12,9,5,15,10,11,14,1,7,6,0,8,13],
  [4,11,2,14,15,0,8,13,3,12,9,7,5,10,6,1,13,0,11,7,4,9,1,10,14,3,5,12,2,15,8,6,1,4,11,13,12,3,7,14,10,15,6,8,0,5,9,2,6,11,13,8,1,4,10,7,9,5,0,15,14,2,3,12],
  [13,2,8,4,6,15,11,1,10,9,3,14,5,0,12,7,1,15,13,8,10,3,7,4,12,5,6,11,0,14,9,2,7,11,4,1,9,12,14,2,0,6,10,13,15,3,5,8,2,1,14,7,4,10,8,13,15,12,9,0,3,5,6,11]
];
const PC1 = [57,49,41,33,25,17,9,1,58,50,42,34,26,18,10,2,59,51,43,35,27,19,11,3,60,52,44,36,63,55,47,39,31,23,15,7,62,54,46,38,30,22,14,6,61,53,45,37,29,21,13,5,28,20,12,4];
const PC2 = [14,17,11,24,1,5,3,28,15,6,21,10,23,19,12,4,26,8,16,7,27,20,13,2,41,52,31,37,47,55,30,40,51,45,33,48,44,49,39,56,34,53,46,42,50,36,29,32];
const SHIFTS = [1,1,2,2,2,2,2,2,1,2,2,2,2,2,2,1];

function permute(bits, map) {
  const o = [];
  for (let i = 0; i < map.length; i++) o.push(bits[map[i] - 1]);
  return o;
}
function bytesToBits(buf) {
  const bits = [];
  for (let i = 0; i < buf.length; i++) {
    for (let b = 7; b >= 0; b--) bits.push((buf[i] >> b) & 1);
  }
  return bits;
}
function bitsToBytes(bits) {
  const buf = Buffer.alloc(bits.length / 8);
  for (let i = 0; i < buf.length; i++) {
    let byte = 0;
    for (let b = 0; b < 8; b++) byte = (byte << 1) | bits[i * 8 + b];
    buf[i] = byte;
  }
  return buf;
}
function generateSubkeys(keyBytes) {
  const keyBits = bytesToBits(keyBytes);
  const pc1 = permute(keyBits, PC1);
  let c = pc1.slice(0, 28);
  let d = pc1.slice(28, 56);
  const subkeys = [];
  for (let round = 0; round < 16; round++) {
    const shift = SHIFTS[round];
    c = c.slice(shift).concat(c.slice(0, shift));
    d = d.slice(shift).concat(d.slice(0, shift));
    subkeys.push(permute(c.concat(d), PC2));
  }
  return subkeys;
}
function feistel(r, k) {
  const er = permute(r, E);
  const xor = er.map((b, i) => b ^ k[i]);
  const sOut = [];
  for (let b = 0; b < 8; b++) {
    const chunk = xor.slice(b * 6, b * 6 + 6);
    const row = (chunk[0] << 1) | chunk[5];
    const col = (chunk[1] << 3) | (chunk[2] << 2) | (chunk[3] << 1) | chunk[4];
    const val = S[b][row * 16 + col];
    for (let bit = 3; bit >= 0; bit--) sOut.push((val >> bit) & 1);
  }
  return permute(sOut, P);
}
function decryptBlock(blockBits, subkeys) {
  const ip = permute(blockBits, IP);
  let l = ip.slice(0, 32);
  let r = ip.slice(32, 64);
  for (let round = 15; round >= 0; round--) {
    const f = feistel(r, subkeys[round]);
    const nextL = r;
    const nextR = l.map((b, i) => b ^ f[i]);
    l = nextL;
    r = nextR;
  }
  return permute(r.concat(l), FP);
}
function decryptDesEcb(cipherBytes, keyBytes) {
  const subkeys = generateSubkeys(keyBytes);
  const chunks = [];
  for (let i = 0; i < cipherBytes.length; i += 8) {
    const block = cipherBytes.slice(i, i + 8);
    if (block.length < 8) break;
    chunks.push(bitsToBytes(decryptBlock(bytesToBits(block), subkeys)));
  }
  const buf = Buffer.concat(chunks);
  const padLen = buf[buf.length - 1];
  if (padLen >= 1 && padLen <= 8) {
    return buf.slice(0, buf.length - padLen).toString('utf8');
  }
  return buf.toString('utf8');
}

/**
 * SaavnProvider (Development-Only Isolated Adapter)
 * Resolves commercial metadata and 320kbps AAC streams from JioSaavn CDN
 * for local proof-of-concept testing.
 * 
 * STRICT COMPLIANCE BOUNDARIES:
 * - Disabled by default in production (NODE_ENV === 'production' requires ENABLE_DEV_SAAVN === 'true')
 * - Does not store or download audio locally
 * - Purely on-demand stream resolution
 * - Clearly marked with termsStatus: 'unresolved'
 */
class SaavnProvider extends BaseProvider {
  constructor() {
    super('saavn', 'JioSaavn (Dev)');
    this.baseUrl = 'https://www.jiosaavn.com/api.php';
    this.keyBytes = Buffer.from('38346591', 'utf8');
  }

  isConfigured() {
    // Strictly disabled in production environments. Cannot be bypassed via runtime flags.
    if (process.env.NODE_ENV === 'production') {
      return false;
    }
    return true;
  }

  getCapabilities() {
    return {
      supportsSearch: true,
      supportsDirectStream: false,
      requiresResolution: true,
      isTemporaryUrl: true,
      authRequired: false,
      environmentRestrictions: 'development_only',
      authorizationStatus: 'unresolved',
    };
  }

  getHealth() {
    return {
      ...super.getHealth(),
      experimental: true,
      developmentOnly: true,
      termsStatus: 'unresolved',
      badge: 'DEV-SAAVN',
      notice: 'Development proof-of-concept only. Unofficial reverse-engineered endpoints without commercial redistribution license.',
    };
  }

  decryptMediaUrl(encryptedUrl) {
    if (!encryptedUrl || typeof encryptedUrl !== 'string') return null;
    try {
      const cipherBytes = Buffer.from(encryptedUrl.trim(), 'base64');
      const decrypted = decryptDesEcb(cipherBytes, this.keyBytes);
      return decrypted ? decrypted.replace('_96.mp4', '_320.mp4') : null;
    } catch {
      return null;
    }
  }

  /**
   * Search JioSaavn catalog for tracks
   * @param {string} query
   * @param {object} options
   */
  async search(query, options = {}) {
    if (!this.isConfigured()) {
      return {
        results: [],
        error: 'Saavn provider is disabled in production',
        status: 'unconfigured',
      };
    }

    const cleanQuery = String(query || '').trim();
    if (!cleanQuery) {
      return { results: [], error: null, status: this.status };
    }

    const limit = Math.min(20, Math.max(1, parseInt(options.limit) || 10));

    try {
      const searchUrl = `${this.baseUrl}?__call=search.getResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=${limit}&p=1&q=${encodeURIComponent(cleanQuery)}`;
      const res = await this.fetchWithTimeout(searchUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
          'Accept': 'application/json',
        },
        signal: options.signal,
      }, 5000);

      if (!res.ok) {
        throw new Error(`JioSaavn responded with HTTP ${res.status}`);
      }

      const data = await res.json();
      let rawResults = data.results || [];
      let results = [];

      const parseResults = (items, currentQ) => {
        const parsed = [];
        for (const item of items) {
          if (!item || !item.id || !item.title) continue;

          const cleanTitle = (item.title || '')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&amp;/g, '&')
            .trim();

          // Filter out noisy remixes unless user explicitly requested a remix
          const isDerivative = /remix|sped up|slowed|instrumental|karaoke|tribute/i.test(cleanTitle);
          const queryHasRemix = /remix|sped up|slowed|instrumental/i.test(currentQ);
          if (isDerivative && !queryHasRemix) continue;

          const artist = (item.subtitle || item.more_info?.music || item.more_info?.singers || '')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&amp;/g, '&')
            .trim();

          const album = (item.more_info?.album || '')
            .replace(/&quot;/g, '"')
            .replace(/&#039;/g, "'")
            .replace(/&amp;/g, '&')
            .trim();

          const duration = parseInt(item.more_info?.duration || 0);

          parsed.push({
            id: `saavn:${item.id}`,
            title: cleanTitle,
            artist,
            album,
            artwork: item.image || '',
            duration,
            provider: 'saavn',
            providerTrackId: String(item.id),
            providerTrackUrl: item.perma_url || `https://www.jiosaavn.com/song/${item.id}`,
            streamUrl: null, // Resolved on-demand
            needsResolution: true,
            license: 'Commercial (Usage terms unresolved - Dev only)',
            attribution: 'JioSaavn CDN (Development Proof-of-Concept)',
            isPlayable: true,
            isFullLength: duration > 60,
          });
        }
        return parsed;
      };

      results = parseResults(rawResults, cleanQuery);

      // Fallback: if 0 valid results after filtering and query contains parentheticals e.g. "One Kiss (with Dua Lipa)", retry with stripped query "One Kiss"
      if (results.length === 0 && /\(.*?\)/.test(cleanQuery)) {
        const simplified = cleanQuery.replace(/\(.*?\)/g, '').replace(/\s+/g, ' ').trim();
        if (simplified.length >= 2) {
          const fallbackUrl = `${this.baseUrl}?__call=search.getResults&_format=json&_marker=0&api_version=4&ctx=web6dot0&n=${limit}&p=1&q=${encodeURIComponent(simplified)}`;
          const fallbackRes = await this.fetchWithTimeout(fallbackUrl, {
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
              'Accept': 'application/json',
            },
            signal: options.signal,
          }, 5000);
          if (fallbackRes.ok) {
            const fallbackData = await fallbackRes.json();
            results = parseResults(fallbackData.results || [], simplified);
          }
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
   * Resolve track on demand by JioSaavn track ID
   * @param {string} trackId
   * @returns {Promise<{ streamUrl: string|null, mimeType: string, metadata: object|null, error: string|null }>}
   */
  async resolveTrack(trackId) {
    if (!this.isConfigured()) {
      return { streamUrl: null, metadata: null, error: 'Saavn provider is disabled in production' };
    }

    const cleanId = String(trackId || '').replace(/^saavn:/, '').trim();
    if (!cleanId) {
      return { streamUrl: null, metadata: null, error: 'Invalid or missing trackId' };
    }

    try {
      const url = `${this.baseUrl}?__call=song.getDetails&pids=${encodeURIComponent(cleanId)}&_format=json&_marker=0&api_version=4&ctx=web6dot0`;
      const res = await this.fetchWithTimeout(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko)',
          'Accept': 'application/json',
        },
      }, 5000);

      if (!res.ok) {
        return { streamUrl: null, metadata: null, error: `Upstream Saavn responded with HTTP ${res.status}` };
      }

      const data = await res.json();
      const song = data[cleanId] || (Array.isArray(data.songs) ? data.songs[0] : null);

      if (!song) {
        return { streamUrl: null, metadata: null, error: `Track '${cleanId}' not found in Saavn catalog` };
      }

      const enc = song.encrypted_media_url || song.more_info?.encrypted_media_url;
      const streamUrl = this.decryptMediaUrl(enc);

      if (!streamUrl) {
        return { streamUrl: null, metadata: null, error: 'Failed to decrypt audio stream URL' };
      }

      const title = (song.song || song.title || '')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, '&')
        .trim();

      const artist = (song.primary_artists || song.singers || song.more_info?.singers || song.more_info?.music || '')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, '&')
        .trim();

      const album = (song.album || song.more_info?.album || '')
        .replace(/&quot;/g, '"')
        .replace(/&#039;/g, "'")
        .replace(/&amp;/g, '&')
        .trim();

      const artwork = song.image || song.more_info?.image || '';
      const duration = parseInt(song.duration || song.more_info?.duration || 0);

      return {
        streamUrl,
        mimeType: 'audio/mp4',
        metadata: {
          id: `saavn:${cleanId}`,
          title,
          artist,
          album,
          artwork,
          duration,
          provider: 'saavn',
          providerTrackId: cleanId,
          streamUrl,
          license: 'Commercial (Usage terms unresolved - Dev only)',
          attribution: 'JioSaavn CDN (Development Proof-of-Concept)',
          isFullLength: duration > 60,
        },
        error: null,
      };
    } catch (err) {
      return { streamUrl: null, metadata: null, error: err.message };
    }
  }
}

module.exports = SaavnProvider;
