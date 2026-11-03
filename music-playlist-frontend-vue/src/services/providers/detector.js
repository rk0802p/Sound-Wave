// Utility to classify provider types and extract media IDs
export const detectProviderType = (url) => {
  if (!url || typeof url !== 'string') return 'unknown';
  const clean = url.trim().toLowerCase();

  // YouTube detection
  if (clean.includes('youtube.com') || clean.includes('youtu.be')) {
    return 'youtube';
  }

  // Spotify detection
  if (clean.includes('spotify.com')) {
    return 'spotify';
  }

  // Direct playable media extensions
  if (
    clean.endsWith('.mp3') ||
    clean.endsWith('.wav') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.m4a') ||
    clean.endsWith('.aac') ||
    clean.endsWith('.flac') ||
    clean.startsWith('data:audio/') ||
    clean.startsWith('blob:') ||
    (clean.includes('upload.wikimedia.org') && (clean.includes('.ogg') || clean.includes('.mp3')))
  ) {
    return 'direct';
  }

  // Generic external streaming link (SoundCloud, Apple Music, Bandcamp, etc.)
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
      const type = parts[parts.length - 2]; // 'track' | 'album' | 'playlist'
      const id = parts[parts.length - 1];
      return `https://open.spotify.com/embed/${type}/${id}?utm_source=generator&theme=0`;
    }
  } catch {
    // Return fallback embed url
  }
  return null;
};
