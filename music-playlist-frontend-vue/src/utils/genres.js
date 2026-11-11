export const GENRE_MAP = {
  'Electronic / Dance': { color: '#4D6BFF', icon: '⚡' },
  'English Pop': { color: '#FF6B5E', icon: '🌸' },
  'Reggaeton': { color: '#FFD84A', icon: '💃' },
  'Hip-Hop': { color: '#FFA23A', icon: '🔥' },
  'Indie Pop / Rock': { color: '#B8F23C', icon: '🎸' },
  'Latin Dance': { color: '#FF4F9A', icon: '✨' },
  'Latin Pop': { color: '#5DE3A6', icon: '🌴' },
};

export const getGenreColor = (genre) => {
  if (!genre) return '#B9A6FF';
  return GENRE_MAP[genre]?.color || '#3FD8EA';
};

export const buildAvailableGenres = (tracks = []) => {
  const counts = {};
  tracks.forEach((t) => {
    const g = t.genre || 'Electronic / Dance';
    counts[g] = (counts[g] || 0) + 1;
  });
  return Object.keys(counts).map((g) => ({
    name: g,
    count: counts[g],
    color: getGenreColor(g),
    icon: GENRE_MAP[g]?.icon || '🎵',
  }));
};
