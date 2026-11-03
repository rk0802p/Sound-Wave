// Audio source classification & duration formatting utilities
export const isPlayableAudioUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  // Direct playable media extensions
  if (
    clean.endsWith('.mp3') ||
    clean.endsWith('.wav') ||
    clean.endsWith('.ogg') ||
    clean.endsWith('.m4a') ||
    clean.endsWith('.aac') ||
    clean.endsWith('.flac')
  ) {
    return true;
  }
  // Audio streaming endpoints or data URIs
  if (clean.startsWith('data:audio/') || clean.startsWith('blob:')) {
    return true;
  }
  // Curated playable Wikimedia audio
  if (clean.includes('upload.wikimedia.org') && (clean.includes('.ogg') || clean.includes('.mp3'))) {
    return true;
  }
  return false;
};

export const isExternalMediaUrl = (url) => {
  if (!url || typeof url !== 'string') return false;
  const clean = url.trim().toLowerCase();
  return (
    clean.includes('youtube.com') ||
    clean.includes('youtu.be') ||
    clean.includes('spotify.com') ||
    clean.includes('soundcloud.com') ||
    clean.includes('apple.com') ||
    clean.includes('deezer.com') ||
    clean.includes('bandcamp.com')
  );
};

export const getExternalServiceName = (url) => {
  if (!url) return 'External Link';
  const clean = url.toLowerCase();
  if (clean.includes('youtube.com') || clean.includes('youtu.be')) return 'YouTube';
  if (clean.includes('spotify.com')) return 'Spotify';
  if (clean.includes('soundcloud.com')) return 'SoundCloud';
  if (clean.includes('apple.com')) return 'Apple Music';
  if (clean.includes('bandcamp.com')) return 'Bandcamp';
  return 'Web Audio';
};

export const formatDuration = (seconds) => {
  if (seconds === undefined || seconds === null || isNaN(seconds) || seconds < 0) {
    return '0:00';
  }
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
};

// Curated distinctive high quality artwork presets for music genres
export const PLAYLIST_COVER_PRESETS = [
  {
    id: 'analog-studio',
    name: 'Midnight Studio',
    genre: 'Studio / Analog',
    url: 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'future-proof',
    name: 'Future Proof',
    genre: 'Electronic / Cosmic',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'nocturnal-lofi',
    name: 'Nocturnal Lo-Fi',
    genre: 'Lo-Fi / Focus',
    url: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'ambient-gradient',
    name: 'Deep Ambient',
    genre: 'Ambient / Soundscape',
    url: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'synthwave-sunset',
    name: 'Retro Synthwave',
    genre: 'Synthwave / Retro',
    url: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'midnight-jazz',
    name: 'Velvet Jazz',
    genre: 'Jazz / Acoustic',
    url: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'future-bass',
    name: 'Tokyo Neon Drive',
    genre: 'Bass / Club',
    url: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=600&auto=format&fit=crop',
  },
  {
    id: 'acoustic-mist',
    name: 'Acoustic Mist',
    genre: 'Indie / Folk',
    url: 'https://images.unsplash.com/photo-1445985543468-3944654d2b39?q=80&w=600&auto=format&fit=crop',
  },
];

// Helper to get distinct artwork for playlists without repeating the same image
export const getDistinctArtwork = (item, fallbackIndex = 0) => {
  if (item && item.coverImage && !item.coverImage.includes('photo-1518709268805-4e9042af9f23')) {
    return item.coverImage;
  }
  // Deterministic index from string id or name
  let hash = fallbackIndex;
  const str = (item?._id || item?.name || item?.title || '') + '';
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  const idx = Math.abs(hash) % PLAYLIST_COVER_PRESETS.length;
  return PLAYLIST_COVER_PRESETS[idx].url;
};

// Curated royalty-free tracks with verified playable audio streams & distinct album art
export const CURATED_DEMO_TRACKS = [
  {
    title: 'Clair de Lune',
    artist: 'Claude Debussy',
    album: 'Suite bergamasque',
    duration: 304,
    url: 'https://upload.wikimedia.org/wikipedia/commons/2/29/Clair_de_lune_%28Claude_Debussy%29_Suite_bergamasque.ogg',
    coverImage: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=400&auto=format&fit=crop',
  },
  {
    title: 'Gymnopédie No. 1',
    artist: 'Erik Satie',
    album: 'Trois Gymnopédies',
    duration: 204,
    url: 'https://upload.wikimedia.org/wikipedia/commons/3/34/Erik_Satie_-_Gymnop%C3%A9die_No.1.ogg',
    coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&auto=format&fit=crop',
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
    coverImage: 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?q=80&w=400&auto=format&fit=crop',
  },
  {
    title: 'Canon in D Major',
    artist: 'Johann Pachelbel',
    album: 'Baroque Classics',
    duration: 363,
    url: 'https://upload.wikimedia.org/wikipedia/commons/5/52/Pachelbel%27s_Canon_in_D.ogg',
    coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop',
  },
];
