/**
 * Curated royalty-free demo tracks and media detection helpers
 */

export const isPlayableAudioUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const cleanUrl = url.trim().toLowerCase();
  
  // Audio file extensions
  const audioExtensions = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];
  if (audioExtensions.some((ext) => cleanUrl.includes(ext))) {
    return true;
  }

  // Known direct streaming / audio CDN formats
  if (
    cleanUrl.startsWith('https://upload.wikimedia.org') ||
    cleanUrl.includes('archive.org/download') ||
    cleanUrl.includes('freemusicarchive.org') ||
    cleanUrl.includes('cdn.pixabay.com/download/audio')
  ) {
    return true;
  }

  return false;
};

export const isExternalMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const cleanUrl = url.trim().toLowerCase();
  return (
    cleanUrl.includes('youtube.com') ||
    cleanUrl.includes('youtu.be') ||
    cleanUrl.includes('spotify.com') ||
    cleanUrl.includes('soundcloud.com')
  );
};

export const getExternalServiceName = (url) => {
  if (!url) return 'External Link';
  const cleanUrl = url.toLowerCase();
  if (cleanUrl.includes('youtube.com') || cleanUrl.includes('youtu.be')) return 'YouTube';
  if (cleanUrl.includes('spotify.com')) return 'Spotify';
  if (cleanUrl.includes('soundcloud.com')) return 'SoundCloud';
  return 'Web Link';
};

export const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// Curated high quality artwork presets
export const PLAYLIST_COVER_PRESETS = [
  {
    id: 'cyberpunk-neon',
    name: 'Cyberpunk Neon',
    url: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'nocturnal-lofi',
    name: 'Nocturnal Lo-Fi',
    url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'ambient-gradient',
    name: 'Deep Ambient',
    url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'synthwave-sunset',
    name: 'Retro Synthwave',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'future-bass',
    name: 'Future Bass',
    url: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'acoustic-mist',
    name: 'Acoustic Mist',
    url: 'https://images.unsplash.com/photo-1445985543468-3944654d2b39?q=80&w=600&auto=format&fit=crop',
  },
];

// Curated royalty-free tracks with verified playable audio streams
export const CURATED_DEMO_TRACKS = [
  {
    title: 'Clair de Lune',
    artist: 'Claude Debussy',
    album: 'Suite bergamasque',
    duration: 304,
    url: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Clair_de_lune_%28Claude_Debussy%29_Suite_bergamasque.ogg',
    coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&auto=format&fit=crop',
  },
  {
    title: 'Gymnopédie No. 1',
    artist: 'Erik Satie',
    album: 'Trois Gymnopédies',
    duration: 204,
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/34/Erik_Satie_-_Gymnop%C3%A9die_No.1.ogg',
    coverImage: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=400&auto=format&fit=crop',
  },
  {
    title: 'Moonlight Sonata (Adagio)',
    artist: 'Ludwig van Beethoven',
    album: 'Piano Sonata No. 14',
    duration: 320,
    url: 'https://upload.wikimedia.org/wikipedia/commons/e/eb/Beethoven_Moonlight_1st_movement.ogg',
    coverImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&auto=format&fit=crop',
  },
  {
    title: 'The Four Seasons - Spring',
    artist: 'Antonio Vivaldi',
    album: 'Le quattro stagioni',
    duration: 216,
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Vivaldi_Spring_mvt_1_Allegro.ogg',
    coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&auto=format&fit=crop',
  },
  {
    title: 'Canon in D Major',
    artist: 'Johann Pachelbel',
    album: 'Baroque Classics',
    duration: 363,
    url: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Pachelbel%27s_Canon_in_D.ogg',
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400&auto=format&fit=crop',
  },
];
