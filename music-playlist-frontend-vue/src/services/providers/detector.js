// Utility to classify provider types and extract media IDs

/**
 * Validates whether an audio URL belongs to an authorized stream domain
 * @param {string} url
 * @returns {boolean}
 */
export const isAuthorizedStreamUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:') return false;
    if (parsed.username || parsed.password) return false;
    if (parsed.port && parsed.port !== '443' && parsed.port !== '') return false;
    const host = parsed.hostname.toLowerCase();
    // Authorized direct audio stream CDNs:
    // 1. Jamendo CC stream CDN
    // 2. Deezer 30s preview CDN (*.dzcdn.net)
    // 3. Apple Music / iTunes preview CDN (audio-ssl.itunes.apple.com / *.itunes.apple.com)
    return (
      host === 'jamendo.com' ||
      host.endsWith('.jamendo.com') ||
      host === 'dzcdn.net' ||
      host.endsWith('.dzcdn.net') ||
      host === 'itunes.apple.com' ||
      host.endsWith('.itunes.apple.com') ||
      host === 'apple.com' ||
      host.endsWith('.apple.com')
    );
  } catch {
    return false;
  }
};

export const detectProviderType = (url) => {
  if (!url || typeof url !== 'string') return 'unknown';
  const clean = url.trim().toLowerCase();

  try {
    const parsed = new URL(clean);
    const host = parsed.hostname.toLowerCase();
    if (host === 'jamendo.com' || host.endsWith('.jamendo.com')) {
      return 'jamendo';
    }
    if (host === 'dzcdn.net' || host.endsWith('.dzcdn.net') || host === 'deezer.com' || host.endsWith('.deezer.com')) {
      return 'deezer';
    }
    if (
      host === 'itunes.apple.com' ||
      host.endsWith('.itunes.apple.com') ||
      host === 'apple.com' ||
      host.endsWith('.apple.com')
    ) {
      return 'itunes';
    }
    if (host === 'spotify.com' || host.endsWith('.spotify.com')) {
      return 'spotify';
    }
  } catch {
    // If not a full URL, check spotify URI scheme
  }

  if (clean.startsWith('spotify:')) {
    return 'spotify';
  }

  // Direct playable media on verified Jamendo, Deezer, or iTunes CDNs
  if (isAuthorizedStreamUrl(url)) {
    return 'direct';
  }

  // Generic external link (unauthorized for direct playback)
  return 'external';
};

export const extractYouTubeVideoId = (url) => {
  if (!url) return null;
  const match = url.match(/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i);
  return match ? match[1] : null;
};

export const extractSpotifyEmbedUrl = (url) => {
  if (!url) return null;
  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const type = parts[parts.length - 2];
      const id = parts[parts.length - 1];
      return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
    }
  } catch {
    // Return fallback embed url
  }
  return null;
};

/**
 * Resolves a direct audio stream URL from track objects
 */
export const resolvePlayableAudioUrl = (track) => {
  if (!track) return null;
  if (typeof track === 'string') {
    const trimmed = track.trim();
    return trimmed.length > 0 ? trimmed : null;
  }
  const candidate =
    track.streamUrl ||
    track.audioUrl ||
    track.playback?.url ||
    track.playbackUrl ||
    track.source?.audioUrl ||
    track.source?.streamUrl ||
    track.url ||
    track.source?.url;

  if (typeof candidate === 'string' && candidate.trim().length > 0) {
    return candidate.trim();
  }
  return null;
};
