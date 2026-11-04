/**
 * SOUNDWAVE — Library & Mood Playlists Architecture
 *
 * Sourced from the user's music library collection.
 * Pure offline data architecture with many-to-many mood playlist mappings.
 * Zero external API dependencies (no Spotify API, OAuth, or catalog services required).
 */

// 1. Centralized Master Library Collection (Single Source of Truth)
export const LIBRARY_SONGS = [
  {
    id: 'song-one-kiss',
    _id: 'song-one-kiss',
    title: 'One Kiss (with Dua Lipa)',
    artist: 'Calvin Harris, Dua Lipa',
    album: 'One Kiss',
    duration: 214, // 3:34
    genre: 'Dance Pop / Nu-Disco',
    coverImage: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=400&auto=format&fit=crop',
    url: '',
    localAudioSource: '',
    source: { provider: 'direct', externalId: null, url: '' },
  },
  {
    id: 'song-lily',
    _id: 'song-lily',
    title: 'Lily',
    artist: 'Alan Walker, K-391, Emelie Hollow',
    album: 'Different World',
    duration: 195, // 3:15
    genre: 'Electronic / Atmospheric Pop',
    coverImage: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=400&auto=format&fit=crop',
    url: '',
    localAudioSource: '',
    source: { provider: 'direct', externalId: null, url: '' },
  },
  {
    id: 'song-not-you',
    _id: 'song-not-you',
    title: 'Not You',
    artist: 'Alan Walker, Emma Steinbakken',
    album: 'World of Walker',
    duration: 180, // 3:00
    genre: 'Melodic Pop / Ballad',
    coverImage: 'https://images.unsplash.com/photo-1508700115892-45ecd05ae2ad?q=80&w=400&auto=format&fit=crop',
    url: '',
    localAudioSource: '',
    source: { provider: 'direct', externalId: null, url: '' },
  },
  {
    id: 'song-faded',
    _id: 'song-faded',
    title: 'Faded',
    artist: 'Alan Walker',
    album: 'Different World',
    duration: 212, // 3:32
    genre: 'Electro House / Dream Pop',
    coverImage: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400&auto=format&fit=crop',
    url: '',
    localAudioSource: '',
    source: { provider: 'direct', externalId: null, url: '' },
  },
  {
    id: 'song-on-my-way',
    _id: 'song-on-my-way',
    title: 'On My Way',
    artist: 'Alan Walker, Sabrina Carpenter, Farruko',
    album: 'World of Walker',
    duration: 193, // 3:13
    genre: 'Dance Pop / Latin',
    coverImage: 'https://images.unsplash.com/photo-1445985543468-3944654d2b39?q=80&w=400&auto=format&fit=crop',
    url: '',
    localAudioSource: '',
    source: { provider: 'direct', externalId: null, url: '' },
  },
  {
    id: 'song-alone',
    _id: 'song-alone',
    title: 'Alone',
    artist: 'Alan Walker',
    album: 'Different World',
    duration: 161, // 2:41
    genre: 'Electropop / EDM',
    coverImage: 'https://images.unsplash.com/photo-1539375665275-f9de415ef9ac?q=80&w=400&auto=format&fit=crop',
    url: '',
    localAudioSource: '',
    source: { provider: 'direct', externalId: null, url: '' },
  },
  {
    id: 'song-see-you-again',
    _id: 'song-see-you-again',
    title: 'See You Again',
    artist: 'Wiz Khalifa, Charlie Puth',
    album: 'Furious 7 Soundtrack',
    duration: 229, // 3:49
    genre: 'Pop / Piano Ballad',
    coverImage: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=400&auto=format&fit=crop',
    url: '',
    localAudioSource: '',
    source: { provider: 'direct', externalId: null, url: '' },
  },
  {
    id: 'song-dandelions',
    _id: 'song-dandelions',
    title: 'Dandelions',
    artist: 'Ruth B.',
    album: 'Safe Haven',
    duration: 233, // 3:53
    genre: 'Acoustic Pop / Piano',
    coverImage: 'https://images.unsplash.com/photo-1465847899084-d164df4dedc6?q=80&w=400&auto=format&fit=crop',
    url: '',
    localAudioSource: '',
    source: { provider: 'direct', externalId: null, url: '' },
  },
  {
    id: 'song-senorita',
    _id: 'song-senorita',
    title: 'Señorita',
    artist: 'Shawn Mendes, Camila Cabello',
    album: 'Shawn Mendes (Deluxe)',
    duration: 190, // 3:10
    genre: 'Latin Pop / Acoustic',
    coverImage: 'https://images.unsplash.com/photo-1511192336575-5a79af67a629?q=80&w=400&auto=format&fit=crop',
    url: '',
    localAudioSource: '',
    source: { provider: 'direct', externalId: null, url: '' },
  },
  {
    id: 'song-shape-of-you',
    _id: 'song-shape-of-you',
    title: 'Shape of You',
    artist: 'Ed Sheeran',
    album: '÷ (Divide)',
    duration: 233, // 3:53
    genre: 'Tropical Pop / R&B',
    coverImage: 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?q=80&w=400&auto=format&fit=crop',
    url: '',
    localAudioSource: '',
    source: { provider: 'direct', externalId: null, url: '' },
  },
  {
    id: 'song-lovely',
    _id: 'song-lovely',
    title: 'lovely (with Khalid)',
    artist: 'Billie Eilish, Khalid',
    album: '13 Reasons Why (Season 2)',
    duration: 200, // 3:20
    genre: 'Chamber Pop / Acoustic Strings',
    coverImage: 'https://images.unsplash.com/photo-1520523839898-50712825e3a7?q=80&w=400&auto=format&fit=crop',
    url: '',
    localAudioSource: '',
    source: { provider: 'direct', externalId: null, url: '' },
  },
  {
    id: 'song-im-alive',
    _id: 'song-im-alive',
    title: "I'm Alive - Radio Edit",
    artist: 'Kyle Bourke, Rob Vegas',
    album: "I'm Alive",
    duration: 172, // 2:52
    genre: 'Electro House / Festival EDM',
    coverImage: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=400&auto=format&fit=crop',
    url: '',
    localAudioSource: '',
    source: { provider: 'direct', externalId: null, url: '' },
  },
  {
    id: 'song-night-we-met',
    _id: 'song-night-we-met',
    title: 'The Night We Met',
    artist: 'Lord Huron',
    album: 'Strange Trails',
    duration: 208, // 3:28
    genre: 'Indie Folk / Acoustic',
    coverImage: 'https://images.unsplash.com/photo-1518495973542-4542c06a5843?q=80&w=400&auto=format&fit=crop',
    url: '',
    localAudioSource: '',
    source: { provider: 'direct', externalId: null, url: '' },
  },
  {
    id: 'song-malibu',
    _id: 'song-malibu',
    title: 'Malibu',
    artist: 'Miley Cyrus',
    album: 'Younger Now',
    duration: 231, // 3:51
    genre: 'Pop Rock / Indie Pop',
    coverImage: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=400&auto=format&fit=crop',
    url: '',
    localAudioSource: '',
    source: { provider: 'direct', externalId: null, url: '' },
  },
];

// Fast indexed lookup for library songs
export const getSongById = (id) => {
  return LIBRARY_SONGS.find((s) => s.id === id || s._id === id) || null;
};

// 2. Curated Mood Playlist Definitions (Many-to-many relationship using songIds)
export const MOOD_PLAYLIST_DEFINITIONS = [
  {
    id: 'mood-acoustic-mornings',
    _id: '67c000000000000000000001',
    isMood: true,
    name: 'Acoustic mornings',
    n: 'Acoustic mornings',
    emoji: '☀️',
    e: '☀️',
    o1: '#ffd27a',
    o2: '#ffa24c',
    tint: '#ffe9c9',
    description: 'Soft strings for slow starts.',
    line: 'Soft strings for slow starts.',
    songIds: [
      'song-dandelions',
      'song-night-we-met',
      'song-lovely',
      'song-not-you',
    ],
  },
  {
    id: 'mood-late-night-drive',
    _id: '67c000000000000000000002',
    isMood: true,
    name: 'Late night drive',
    n: 'Late night drive',
    emoji: '🌙',
    e: '🌙',
    o1: '#c9b6ff',
    o2: '#8a68ff',
    tint: '#e6dcff',
    description: 'Dreamy piano for empty roads.',
    line: 'Dreamy piano for empty roads.',
    songIds: [
      'song-faded',
      'song-lily',
      'song-alone',
      'song-not-you',
      'song-night-we-met',
    ],
  },
  {
    id: 'mood-study-loop',
    _id: '67c000000000000000000003',
    isMood: true,
    name: 'Study loop',
    n: 'Study loop',
    emoji: '🌿',
    e: '🌿',
    o1: '#79ecd1',
    o2: '#20c997',
    tint: '#d3f8ec',
    description: 'Calm synth sweeps on repeat.',
    line: 'Calm synth sweeps on repeat.',
    songIds: [
      'song-lovely',
      'song-night-we-met',
      'song-dandelions',
      'song-not-you',
    ],
  },
  {
    id: 'mood-gym-pump',
    _id: '67c000000000000000000004',
    isMood: true,
    name: 'Gym pump',
    n: 'Gym pump',
    emoji: '🔥',
    e: '🔥',
    o1: '#ff9bd2',
    o2: '#ff4f9a',
    tint: '#ffd9ec',
    description: 'Big drums, bigger energy.',
    line: 'Big drums, bigger energy.',
    songIds: [
      'song-one-kiss',
      'song-shape-of-you',
      'song-senorita',
      'song-im-alive',
      'song-alone',
    ],
  },
  {
    id: 'mood-road-trip',
    _id: '67c000000000000000000005',
    isMood: true,
    name: 'Road trip',
    n: 'Road trip',
    emoji: '🚗',
    e: '🚗',
    o1: '#9ad8ff',
    o2: '#3fa7ff',
    tint: '#d4eeff',
    description: 'Bright tunes for open windows.',
    line: 'Bright tunes for open windows.',
    songIds: [
      'song-on-my-way',
      'song-see-you-again',
      'song-malibu',
      'song-one-kiss',
      'song-shape-of-you',
    ],
  },
];

// 3. Hydrated Mood Playlists (References resolved from LIBRARY_SONGS without record duplication)
export const MOOD_PLAYLISTS = MOOD_PLAYLIST_DEFINITIONS.map((def) => {
  const resolvedSongs = def.songIds
    .map((id) => getSongById(id))
    .filter(Boolean);

  const totalDuration = resolvedSongs.reduce((sum, s) => sum + (s.duration || 0), 0);

  return {
    ...def,
    songs: resolvedSongs,
    t: resolvedSongs, // backward-compatible alias
    totalDuration,
    trackCount: resolvedSongs.length,
  };
});

// Helper to format track duration (mm:ss)
export const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${String(secs).padStart(2, '0')}`;
};

// Particle pop utility matching HTML reference
export const popParticles = (x, y, n = 16, colors = { o1: '#ff9bd2', o2: '#ff6fb5' }) => {
  if (typeof window === 'undefined') return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  for (let i = 0; i < n; i++) {
    const d = document.createElement('i');
    d.className = 'bub';
    const s = 14 + Math.random() * 34;
    d.style.cssText = `left:${x}px;top:${y}px;width:${s}px;height:${s}px;--bc:${i % 2 ? colors.o1 : colors.o2}`;
    document.body.appendChild(d);

    const a = Math.random() * 6.28;
    const v = 60 + Math.random() * 180;
    d.animate(
      [
        { transform: 'translate(0,0) scale(.3)', opacity: 1 },
        { transform: `translate(${Math.cos(a) * v}px,${Math.sin(a) * v - 170}px) scale(1)`, opacity: 1, offset: 0.75 },
        { transform: `translate(${Math.cos(a) * v * 1.05}px,${Math.sin(a) * v - 190}px) scale(1.4)`, opacity: 0 },
      ],
      {
        duration: 1100 + Math.random() * 700,
        easing: 'cubic-bezier(.2,.8,.3,1)',
      }
    ).onfinish = () => d.remove();
  }
};
