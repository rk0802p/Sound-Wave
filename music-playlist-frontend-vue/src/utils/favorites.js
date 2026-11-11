import { FEATURED_SONGS } from '../data/featuredSongs';
import { LIBRARY_SONGS } from '../data/moodPlaylists';

export const FAVORITES_STORAGE_KEY = 'soundwave_favorites';
export const FAVORITE_TRACKS_META_KEY = 'soundwave_favorite_tracks_v1';

const SUPPORTED_PROVIDERS = new Set(['jamendo', 'deezer', 'itunes', 'apple']);

/**
 * Derive a single canonical string ID for any track or raw ID string.
 * Normalizes Jamendo/Deezer/iTunes/Apple IDs so the same recording across
 * FEATURED_SONGS (jamendo-1580571), MOOD_PLAYLISTS (song-one-kiss + providerTrackId 1580571),
 * SearchView (jamendo:1580571), and MongoDB playlists (_id + source.externalId) maps to one identity.
 */
export const getCanonicalFavoriteId = (trackOrId, aliasMap = null) => {
  if (!trackOrId) return null;

  if (typeof trackOrId === 'string') {
    const trimmed = trackOrId.trim();
    if (!trimmed) return null;
    if (aliasMap && aliasMap.has(trimmed)) {
      return aliasMap.get(trimmed);
    }
    // Normalize "provider:extId" -> "provider-extId"
    const colonMatch = trimmed.match(/^(jamendo|deezer|itunes|apple):(.+)$/i);
    if (colonMatch) {
      return `${colonMatch[1].toLowerCase()}-${colonMatch[2].trim()}`;
    }
    return trimmed;
  }

  if (typeof trackOrId !== 'object') return null;

  const provider = String(
    trackOrId.provider || trackOrId.source?.provider || ''
  )
    .trim()
    .toLowerCase();

  const extIdRaw =
    trackOrId.providerTrackId ||
    trackOrId.source?.externalId ||
    null;

  if (provider && SUPPORTED_PROVIDERS.has(provider) && extIdRaw !== null && extIdRaw !== '') {
    const cleanExt = String(extIdRaw).trim();
    if (cleanExt) {
      return `${provider}-${cleanExt}`;
    }
  }

  const rawPrimary = trackOrId.id || trackOrId._id;
  if (rawPrimary !== undefined && rawPrimary !== null && String(rawPrimary).trim() !== '') {
    const primaryStr = String(rawPrimary).trim();
    if (aliasMap && aliasMap.has(primaryStr)) {
      return aliasMap.get(primaryStr);
    }
    const colonMatch = primaryStr.match(/^(jamendo|deezer|itunes|apple):(.+)$/i);
    if (colonMatch) {
      return `${colonMatch[1].toLowerCase()}-${colonMatch[2].trim()}`;
    }
    return primaryStr;
  }

  return null;
};

/**
 * Build an alias lookup and canonical track index across static catalog + user playlists + saved metadata.
 */
export const buildCatalogIndex = ({
  featuredSongs = FEATURED_SONGS,
  librarySongs = LIBRARY_SONGS,
  userPlaylists = [],
  queueTracks = [],
  currentTrack = null,
  savedMetaMap = {},
} = {}) => {
  const aliasMap = new Map();
  const tracksByCanonicalId = new Map();

  const registerTrack = (track, preferOverwrite = false) => {
    if (!track || typeof track !== 'object') return;
    const canonicalId = getCanonicalFavoriteId(track);
    if (!canonicalId) return;

    const rawId = track.id ? String(track.id).trim() : null;
    const rawMongoId = track._id ? String(track._id).trim() : null;
    if (rawId) aliasMap.set(rawId, canonicalId);
    if (rawMongoId) aliasMap.set(rawMongoId, canonicalId);
    aliasMap.set(canonicalId, canonicalId);

    const provider = String(track.provider || track.source?.provider || '').trim().toLowerCase();
    const extId = track.providerTrackId || track.source?.externalId;
    if (provider && extId) {
      aliasMap.set(`${provider}:${String(extId).trim()}`, canonicalId);
      aliasMap.set(`${provider}-${String(extId).trim()}`, canonicalId);
    }

    if (preferOverwrite || !tracksByCanonicalId.has(canonicalId)) {
      tracksByCanonicalId.set(canonicalId, {
        ...track,
        canonicalId,
      });
    }
  };

  // 1. Featured catalog is highest priority for artwork, genre, and CC attribution
  featuredSongs.forEach((t) => registerTrack(t, true));

  // 2. Mood / Library songs map their song-* IDs onto canonical Jamendo IDs cleanly
  librarySongs.forEach((t) => registerTrack(t, false));

  // 3. Saved metadata snapshot for tracks liked from Search or PlayListView
  if (savedMetaMap && typeof savedMetaMap === 'object') {
    Object.values(savedMetaMap).forEach((t) => registerTrack(t, false));
  }

  // 4. User playlists' tracks
  if (Array.isArray(userPlaylists)) {
    userPlaylists.forEach((pl) => {
      if (Array.isArray(pl?.songs)) {
        pl.songs.forEach((s) => registerTrack(s, false));
      }
    });
  }

  // 5. Active player queue / current track
  if (Array.isArray(queueTracks)) {
    queueTracks.forEach((t) => registerTrack(t, false));
  }
  if (currentTrack) {
    registerTrack(currentTrack, false);
  }

  return { aliasMap, tracksByCanonicalId };
};

export const safeParseFavoritesList = (raw) => {
  if (!raw) return [];
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!Array.isArray(parsed)) return [];
    const seen = new Set();
    const cleaned = [];
    for (const item of parsed) {
      if (typeof item !== 'string') continue;
      const trimmed = item.trim();
      if (!trimmed || seen.has(trimmed)) continue;
      seen.add(trimmed);
      cleaned.push(trimmed);
    }
    return cleaned;
  } catch {
    return [];
  }
};

export const safeParseFavoriteMetaMap = (raw) => {
  if (!raw) return {};
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return parsed;
  } catch {
    return {};
  }
};

export const compactTrackMeta = (track, canonicalId) => ({
  id: canonicalId,
  _id: track._id || canonicalId,
  title: track.title || track.name || 'Untitled Track',
  artist: track.artist || 'Unknown Artist',
  album: track.album || '',
  genre: track.genre || '',
  duration: Number.isFinite(Number(track.duration)) && Number(track.duration) > 0 ? Number(track.duration) : 0,
  coverImage: track.coverImage || track.artwork || track.albumArt || '',
  artwork: track.artwork || track.coverImage || '',
  url: track.url || track.streamUrl || track.audioUrl || '',
  streamUrl: track.streamUrl || track.url || track.audioUrl || '',
  provider: track.provider || track.source?.provider || '',
  providerTrackId: track.providerTrackId || track.source?.externalId || '',
  source: track.source || undefined,
  license: track.license || undefined,
  licenseUrl: track.licenseUrl || undefined,
  attribution: track.attribution || undefined,
  isPreview: track.isPreview || undefined,
  previewDurationMs: track.previewDurationMs || undefined,
  isPlayable: track.isPlayable !== false,
});

/**
 * Format total liked duration cleanly for the playlist header.
 * Ignores missing, negative, non-numeric, or non-finite values so NaN never appears.
 */
export const calculateTotalDurationSeconds = (tracks = []) => {
  if (!Array.isArray(tracks)) return 0;
  return tracks.reduce((sum, track) => {
    const d = Number(track?.duration);
    if (!Number.isFinite(d) || d <= 0) return sum;
    return sum + d;
  }, 0);
};

export const formatPlaylistDurationReadable = (totalSeconds) => {
  const safeSec = Number.isFinite(Number(totalSeconds)) && Number(totalSeconds) > 0
    ? Math.floor(Number(totalSeconds))
    : 0;
  if (safeSec === 0) return '0 min';
  const totalMinutes = Math.floor(safeSec / 60);
  if (totalMinutes < 1) return '< 1 min';
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  if (hours > 0) {
    return mins > 0 ? `${hours} hr ${mins} min` : `${hours} hr`;
  }
  return `${totalMinutes} min`;
};
