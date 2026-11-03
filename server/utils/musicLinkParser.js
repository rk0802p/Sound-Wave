/**
 * SOUNDWAVE Music Link Parser & Provider Classification Utility
 * Robust utility for classifying audio sources, validating provider identifiers,
 * and retrieving metadata via public, official oEmbed endpoints.
 *
 * Supported Providers:
 * - Direct: .mp3, .ogg, .wav, .flac, .m4a, .aac, wikimedia streams, data URIs
 * - YouTube: Watch, youtu.be, embed, shorts
 * - Spotify: Track web URLs and track URIs (spotify:track:ID)
 * - External: Generic audio links
 */

const MUSIC_PROVIDERS = {
  DIRECT: "direct",
  YOUTUBE: "youtube",
  SPOTIFY: "spotify",
  EXTERNAL: "external",
};

// YouTube 11-character video ID regex (Base64URL)
const YOUTUBE_ID_REGEX = /^[a-zA-Z0-9_-]{11}$/;

// Spotify 22-character alphanumeric track ID regex (Base62)
const SPOTIFY_ID_REGEX = /^[a-zA-Z0-9]{22}$/;

/**
 * Validates YouTube 11-character Video ID
 * @param {string} id
 * @returns {boolean}
 */
const isValidYouTubeId = (id) => {
  return typeof id === "string" && YOUTUBE_ID_REGEX.test(id.trim());
};

/**
 * Validates Spotify 22-character Track ID
 * @param {string} id
 * @returns {boolean}
 */
const isValidSpotifyId = (id) => {
  return typeof id === "string" && SPOTIFY_ID_REGEX.test(id.trim());
};

/**
 * Extracts YouTube Video ID from any standard YouTube URL format
 * Handles watch, shorts, youtu.be, embed, and live URLs
 * @param {string} url
 * @returns {string|null}
 */
const extractYouTubeId = (url) => {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // Pattern covering youtube.com/watch?v=..., youtu.be/..., youtube.com/embed/..., youtube.com/shorts/...
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regex);
  if (match && isValidYouTubeId(match[1])) {
    return match[1];
  }
  return null;
};

/**
 * Extracts Spotify Resource ID and Type from Spotify URLs or URIs
 * Handles open.spotify.com/track/ID, open.spotify.com/artist/ID, open.spotify.com/album/ID, and spotify:track:ID
 * @param {string} url
 * @returns {{ id: string, type: string }|null}
 */
const extractSpotifyInfo = (url) => {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // URI format: spotify:track:4cOdK2wGLETKBW3PvgPWqT
  if (trimmed.startsWith("spotify:")) {
    const parts = trimmed.split(":");
    if (parts.length >= 3) {
      const type = parts[1].toLowerCase();
      const id = parts[2];
      return { type, id };
    }
    return null;
  }

  // Web URL: https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=...
  const webRegex = /spotify\.com\/(track|artist|album|playlist|episode|show)\/([a-zA-Z0-9]+)/i;
  const match = trimmed.match(webRegex);
  if (match) {
    const type = match[1].toLowerCase();
    const id = match[2];
    return { type, id };
  }

  return null;
};

/**
 * Checks if a URL points directly to a playable audio file
 * @param {string} url
 * @returns {boolean}
 */
const isDirectAudioUrl = (url) => {
  if (!url || typeof url !== "string") return false;
  const clean = url.trim().toLowerCase();

  return (
    clean.endsWith(".mp3") ||
    clean.endsWith(".wav") ||
    clean.endsWith(".ogg") ||
    clean.endsWith(".m4a") ||
    clean.endsWith(".aac") ||
    clean.endsWith(".flac") ||
    clean.startsWith("data:audio/") ||
    clean.startsWith("blob:") ||
    (clean.includes("upload.wikimedia.org") &&
      (clean.includes(".ogg") || clean.includes(".mp3") || clean.includes(".wav")))
  );
};

/**
 * Analyzes an audio URL and returns a structured provider source object
 * with strict validation flags
 * @param {string} rawUrl
 * @returns {{
 *   provider: 'direct'|'youtube'|'spotify'|'external',
 *   externalId: string|null,
 *   url: string,
 *   isValid: boolean,
 *   error: string|null
 * }}
 */
const parseMusicSource = (rawUrl) => {
  const url = typeof rawUrl === "string" ? rawUrl.trim() : "";
  if (!url) {
    return {
      provider: MUSIC_PROVIDERS.DIRECT,
      externalId: null,
      url: "",
      isValid: false,
      error: "URL cannot be empty",
    };
  }

  const clean = url.toLowerCase();

  // Reject dangerous or unsupported protocols
  if (
    clean.startsWith("javascript:") ||
    clean.startsWith("vbscript:") ||
    clean.startsWith("file:") ||
    clean.startsWith("ftp:")
  ) {
    return {
      provider: MUSIC_PROVIDERS.EXTERNAL,
      externalId: null,
      url,
      isValid: false,
      error: "Unsupported or insecure URL protocol",
    };
  }

  // 1. YouTube Domain Detection
  if (clean.includes("youtube.com") || clean.includes("youtu.be")) {
    const ytId = extractYouTubeId(url);
    if (ytId) {
      return {
        provider: MUSIC_PROVIDERS.YOUTUBE,
        externalId: ytId,
        url,
        isValid: true,
        error: null,
      };
    }
    return {
      provider: MUSIC_PROVIDERS.YOUTUBE,
      externalId: null,
      url,
      isValid: false,
      error: "Invalid YouTube URL: missing or malformed 11-character video ID",
    };
  }

  // 2. Spotify Domain / URI Detection
  if (clean.includes("spotify.com") || clean.startsWith("spotify:")) {
    const spInfo = extractSpotifyInfo(url);
    if (spInfo) {
      if (spInfo.type !== "track") {
        return {
          provider: MUSIC_PROVIDERS.SPOTIFY,
          externalId: spInfo.id,
          url,
          isValid: false,
          error: `Unsupported Spotify resource type '${spInfo.type}'. Only single tracks are supported for playlist insertion.`,
        };
      }
      if (!isValidSpotifyId(spInfo.id)) {
        return {
          provider: MUSIC_PROVIDERS.SPOTIFY,
          externalId: null,
          url,
          isValid: false,
          error: "Invalid Spotify URL or URI: missing or malformed 22-character track ID",
        };
      }
      return {
        provider: MUSIC_PROVIDERS.SPOTIFY,
        externalId: spInfo.id,
        url,
        isValid: true,
        error: null,
      };
    }
    return {
      provider: MUSIC_PROVIDERS.SPOTIFY,
      externalId: null,
      url,
      isValid: false,
      error: "Invalid Spotify URL or URI: missing or malformed 22-character track ID",
    };
  }

  // 3. Direct audio file
  if (isDirectAudioUrl(url)) {
    return {
      provider: MUSIC_PROVIDERS.DIRECT,
      externalId: null,
      url,
      isValid: true,
      error: null,
    };
  }

  // 4. Fallback external link
  return {
    provider: MUSIC_PROVIDERS.EXTERNAL,
    externalId: null,
    url,
    isValid: true,
    error: null,
  };
};

/**
 * Fetch official metadata for YouTube video using public oEmbed API
 * Handles network failures, timeouts, unavailable/restricted videos, and rate limits
 * @param {string} videoId
 * @param {number} timeoutMs
 * @returns {Promise<{
 *   isAvailable: boolean,
 *   title: string|null,
 *   artist: string|null,
 *   coverImage: string|null,
 *   error: string|null
 * }>}
 */
const fetchYouTubeMetadata = async (videoId, timeoutMs = 3500) => {
  if (!isValidYouTubeId(videoId)) {
    return {
      isAvailable: false,
      title: null,
      artist: null,
      coverImage: null,
      error: "Invalid 11-character YouTube video ID",
    };
  }

  const oembedUrl = `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(oembedUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "SOUNDWAVE-Music-Server/1.0" },
    });

    clearTimeout(timeoutId);

    if (res.status === 404 || res.status === 400 || res.status === 401) {
      return {
        isAvailable: false,
        title: null,
        artist: null,
        coverImage: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        error: "YouTube video is private, restricted, or no longer available",
      };
    }

    if (res.status === 429) {
      return {
        isAvailable: false,
        title: null,
        artist: null,
        coverImage: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        error: "YouTube metadata rate limit reached",
      };
    }

    if (!res.ok) {
      return {
        isAvailable: false,
        title: null,
        artist: null,
        coverImage: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        error: `YouTube oEmbed returned status ${res.status}`,
      };
    }

    const data = await res.json();
    return {
      isAvailable: true,
      title: data.title || "YouTube Track",
      artist: data.author_name || "YouTube Creator",
      coverImage: data.thumbnail_url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      error: null,
    };
  } catch (err) {
    return {
      isAvailable: false,
      title: null,
      artist: null,
      coverImage: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      error: err.name === "AbortError" ? "YouTube metadata request timed out" : err.message,
    };
  }
};

/**
 * Fetch official metadata for Spotify track using public oEmbed API
 * Handles network failures, timeouts, unavailable tracks, and rate limits
 * @param {string} trackId
 * @param {number} timeoutMs
 * @returns {Promise<{
 *   isAvailable: boolean,
 *   title: string|null,
 *   artist: string|null,
 *   coverImage: string|null,
 *   error: string|null
 * }>}
 */
const fetchSpotifyMetadata = async (trackId, timeoutMs = 3500) => {
  if (!isValidSpotifyId(trackId)) {
    return {
      isAvailable: false,
      title: null,
      artist: null,
      coverImage: null,
      error: "Invalid 22-character Spotify track ID",
    };
  }

  const oembedUrl = `https://open.spotify.com/oembed?url=https://open.spotify.com/track/${trackId}`;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    const res = await fetch(oembedUrl, {
      signal: controller.signal,
      headers: { "User-Agent": "SOUNDWAVE-Music-Server/1.0" },
    });

    clearTimeout(timeoutId);

    if (res.status === 404 || res.status === 400) {
      return {
        isAvailable: false,
        title: null,
        artist: null,
        coverImage: null,
        error: "Spotify track not found or unavailable in this region",
      };
    }

    if (res.status === 429) {
      return {
        isAvailable: false,
        title: null,
        artist: null,
        coverImage: null,
        error: "Spotify metadata rate limit reached",
      };
    }

    if (!res.ok) {
      return {
        isAvailable: false,
        title: null,
        artist: null,
        coverImage: null,
        error: `Spotify oEmbed returned status ${res.status}`,
      };
    }

    const data = await res.json();
    return {
      isAvailable: true,
      title: data.title || "Spotify Track",
      artist: "Spotify Artist",
      coverImage: data.thumbnail_url || null,
      error: null,
    };
  } catch (err) {
    return {
      isAvailable: false,
      title: null,
      artist: null,
      coverImage: null,
      error: err.name === "AbortError" ? "Spotify metadata request timed out" : err.message,
    };
  }
};

/**
 * Unified resolver: parses URL and retrieves metadata for any supported audio/media source
 * @param {string} url
 * @param {number} timeoutMs
 * @returns {Promise<{
 *   provider: string,
 *   externalId: string|null,
 *   url: string,
 *   title: string,
 *   artist: string,
 *   coverImage: string,
 *   duration: number,
 *   isAvailable: boolean,
 *   error: string|null
 * }>}
 */
const resolveTrackMetadata = async (url, timeoutMs = 3500) => {
  const parsed = parseMusicSource(url);

  if (!parsed.isValid) {
    return {
      provider: parsed.provider,
      externalId: parsed.externalId,
      url: parsed.url,
      title: "",
      artist: "",
      coverImage: "",
      duration: 0,
      isAvailable: false,
      error: parsed.error,
    };
  }

  // YouTube Resolution
  if (parsed.provider === MUSIC_PROVIDERS.YOUTUBE) {
    const meta = await fetchYouTubeMetadata(parsed.externalId, timeoutMs);
    return {
      provider: parsed.provider,
      externalId: parsed.externalId,
      url: parsed.url,
      title: meta.title || "",
      artist: meta.artist || "",
      coverImage: meta.coverImage || "",
      duration: 0,
      isAvailable: meta.isAvailable,
      error: meta.error,
    };
  }

  // Spotify Resolution
  if (parsed.provider === MUSIC_PROVIDERS.SPOTIFY) {
    const meta = await fetchSpotifyMetadata(parsed.externalId, timeoutMs);
    return {
      provider: parsed.provider,
      externalId: parsed.externalId,
      url: parsed.url,
      title: meta.title || "",
      artist: meta.artist || "",
      coverImage: meta.coverImage || "",
      duration: 0,
      isAvailable: meta.isAvailable,
      error: meta.error,
    };
  }

  // Direct Audio Resolution
  if (parsed.provider === MUSIC_PROVIDERS.DIRECT) {
    let guessedTitle = "Direct Audio Track";
    try {
      const parsedUrl = new URL(parsed.url);
      const filename = parsedUrl.pathname.split("/").pop();
      if (filename) {
        guessedTitle = decodeURIComponent(filename)
          .replace(/\.(mp3|ogg|wav|flac|m4a|aac)$/i, "")
          .replace(/[-_]/g, " ");
      }
    } catch {
      // Keep default
    }

    return {
      provider: parsed.provider,
      externalId: null,
      url: parsed.url,
      title: guessedTitle,
      artist: "Soundwave Library",
      coverImage: "",
      duration: 0,
      isAvailable: true,
      error: null,
    };
  }

  // External Fallback
  return {
    provider: parsed.provider,
    externalId: null,
    url: parsed.url,
    title: "External Audio",
    artist: "External Stream",
    coverImage: "",
    duration: 0,
    isAvailable: true,
    error: null,
  };
};

module.exports = {
  MUSIC_PROVIDERS,
  YOUTUBE_ID_REGEX,
  SPOTIFY_ID_REGEX,
  isValidYouTubeId,
  isValidSpotifyId,
  extractYouTubeId,
  extractSpotifyInfo,
  isDirectAudioUrl,
  parseMusicSource,
  fetchYouTubeMetadata,
  fetchSpotifyMetadata,
  resolveTrackMetadata,
};
