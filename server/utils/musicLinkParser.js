/**
 * SOUNDWAVE Music Link Parser & Provider Classification Utility
 * Pure utility function to classify audio sources and extract provider IDs.
 * Does not require external API keys.
 */

const MUSIC_PROVIDERS = {
  DIRECT: "direct",
  YOUTUBE: "youtube",
  SPOTIFY: "spotify",
  EXTERNAL: "external",
};

/**
 * Extracts YouTube Video ID from any standard YouTube URL
 * Handles watch, shorts, youtu.be, embed, and live URLs
 * @param {string} url
 * @returns {string|null} 11-character video ID or null
 */
const extractYouTubeId = (url) => {
  if (!url || typeof url !== "string") return null;
  const trimmed = url.trim();

  // Standard watch or embed regex
  const regex =
    /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?|shorts)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
  const match = trimmed.match(regex);
  return match ? match[1] : null;
};

/**
 * Extracts Spotify Resource ID and Type from Spotify URLs or URIs
 * Handles open.spotify.com/track/ID, open.spotify.com/album/ID, and spotify:track:ID
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
      return { type: parts[1], id: parts[2] };
    }
  }

  // Web URL: https://open.spotify.com/track/4cOdK2wGLETKBW3PvgPWqT?si=...
  const webRegex = /spotify\.com\/(track|album|playlist|episode)\/([a-zA-Z0-9]+)/i;
  const match = trimmed.match(webRegex);
  if (match) {
    return { type: match[1].toLowerCase(), id: match[2] };
  }

  return null;
};

/**
 * Checks if a URL points directly to an audio file
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
    (clean.includes("upload.wikimedia.org") && (clean.includes(".ogg") || clean.includes(".mp3")))
  );
};

/**
 * Analyzes an audio URL and returns a structured provider source object
 * @param {string} rawUrl
 * @returns {{ provider: string, externalId: string|null, url: string }}
 */
const parseMusicSource = (rawUrl) => {
  const url = typeof rawUrl === "string" ? rawUrl.trim() : "";
  if (!url) {
    return {
      provider: MUSIC_PROVIDERS.DIRECT,
      externalId: null,
      url: "",
    };
  }

  // 1. YouTube
  const ytId = extractYouTubeId(url);
  if (ytId) {
    return {
      provider: MUSIC_PROVIDERS.YOUTUBE,
      externalId: ytId,
      url,
    };
  }

  // 2. Spotify
  const spotifyInfo = extractSpotifyInfo(url);
  if (spotifyInfo) {
    return {
      provider: MUSIC_PROVIDERS.SPOTIFY,
      externalId: spotifyInfo.id,
      url,
    };
  }

  // 3. Direct audio file
  if (isDirectAudioUrl(url)) {
    return {
      provider: MUSIC_PROVIDERS.DIRECT,
      externalId: null,
      url,
    };
  }

  // 4. Fallback external link
  return {
    provider: MUSIC_PROVIDERS.EXTERNAL,
    externalId: null,
    url,
  };
};

module.exports = {
  MUSIC_PROVIDERS,
  extractYouTubeId,
  extractSpotifyInfo,
  isDirectAudioUrl,
  parseMusicSource,
};
