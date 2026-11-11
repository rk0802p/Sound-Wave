import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { MOOD_PLAYLISTS } from '../data/moodPlaylists';
import { usePlaylistStore } from './playlist';
import { usePlayerStore } from './player';
import {
  FAVORITES_STORAGE_KEY,
  FAVORITE_TRACKS_META_KEY,
  getCanonicalFavoriteId,
  buildCatalogIndex,
  safeParseFavoritesList,
  safeParseFavoriteMetaMap,
  compactTrackMeta,
} from '../utils/favorites';

export const useUiStore = defineStore('ui', () => {
  // Sidebar & Shell UI State
  const isSidebarCollapsed = ref(false);
  const isMobileSidebarOpen = ref(false);
  const isQueueOpen = ref(false);
  const showSettingsModal = ref(false);
  const showCreatePlaylistModal = ref(false);
  const showShortcutsModal = ref(false);
  const selectedLicenseTrack = ref(null);
  const searchFocusNonce = ref(0);
  const dockHeight = ref(88);

  // Catalog / Filter State (shared across HomeView & SideNav)
  const searchQuery = ref('');
  const selectedGenre = ref('');
  const activeFilter = ref(''); // '' | 'favorites' | 'genre' | 'mood' | 'search'
  const activeMoodId = ref('');
  const sortBy = ref('default');

  // Persisted raw/canonical favorite IDs & lightweight track metadata map
  const rawFavoriteIds = ref([]);
  const savedFavoriteMeta = ref({});

  const playlistStore = usePlaylistStore();
  const playerStore = usePlayerStore();

  const activeMood = computed(() => {
    if (!activeMoodId.value) return null;
    return (
      MOOD_PLAYLISTS.find(
        (m) => m.id === activeMoodId.value || m._id === activeMoodId.value
      ) || null
    );
  });

  const catalogIndex = computed(() =>
    buildCatalogIndex({
      userPlaylists: playlistStore.userPlaylists || [],
      queueTracks: playerStore.queue || [],
      currentTrack: playerStore.currentTrack || null,
      savedMetaMap: savedFavoriteMeta.value,
    })
  );

  // Canonical, deduplicated, reconciled list of liked tracks that exist in the supported scope
  const likedTracks = computed(() => {
    const { aliasMap, tracksByCanonicalId } = catalogIndex.value;
    const seen = new Set();
    const resolved = [];

    for (const rawId of rawFavoriteIds.value) {
      const canonicalId = getCanonicalFavoriteId(rawId, aliasMap);
      if (!canonicalId || seen.has(canonicalId)) continue;
      const track = tracksByCanonicalId.get(canonicalId);
      if (!track) continue; // Ignore stale / orphaned IDs that do not correspond to any supported track
      seen.add(canonicalId);
      resolved.push({
        ...track,
        id: track.id || canonicalId,
        _id: track._id || canonicalId,
        canonicalId,
      });
    }

    return resolved;
  });

  // Canonical unique favorite IDs synchronized everywhere (header, badge, filter, cards)
  const favoritesList = computed(() =>
    likedTracks.value.map((t) => t.canonicalId || getCanonicalFavoriteId(t, catalogIndex.value.aliasMap))
  );

  const favoriteCount = computed(() => likedTracks.value.length);

  const persistFavorites = () => {
    if (typeof localStorage === 'undefined') return;
    try {
      localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify(rawFavoriteIds.value));
      localStorage.setItem(FAVORITE_TRACKS_META_KEY, JSON.stringify(savedFavoriteMeta.value));
    } catch {}
  };

  const loadFavorites = () => {
    if (typeof localStorage === 'undefined') {
      rawFavoriteIds.value = [];
      savedFavoriteMeta.value = {};
      return;
    }

    const parsedMeta = safeParseFavoriteMetaMap(localStorage.getItem(FAVORITE_TRACKS_META_KEY));
    savedFavoriteMeta.value = parsedMeta;

    const parsedIds = safeParseFavoritesList(localStorage.getItem(FAVORITES_STORAGE_KEY));
    const { aliasMap } = catalogIndex.value;

    const seen = new Set();
    const normalized = [];
    for (const rawId of parsedIds) {
      const canonical = getCanonicalFavoriteId(rawId, aliasMap);
      if (!canonical || seen.has(canonical)) continue;
      seen.add(canonical);
      normalized.push(canonical);
    }

    rawFavoriteIds.value = normalized;
    persistFavorites();
  };

  const isFavoriteTrack = (trackOrId) => {
    if (!trackOrId) return false;
    const canonicalId = getCanonicalFavoriteId(trackOrId, catalogIndex.value.aliasMap);
    if (!canonicalId) return false;
    return favoritesList.value.includes(canonicalId);
  };

  const toggleFavorite = (track) => {
    if (!track) return false;
    const { aliasMap } = catalogIndex.value;
    const canonicalId = getCanonicalFavoriteId(track, aliasMap);
    if (!canonicalId) return false;

    const exists = rawFavoriteIds.value.some(
      (id) => getCanonicalFavoriteId(id, aliasMap) === canonicalId
    );

    let added = false;
    if (exists) {
      rawFavoriteIds.value = rawFavoriteIds.value.filter(
        (id) => getCanonicalFavoriteId(id, aliasMap) !== canonicalId
      );
      const nextMeta = { ...savedFavoriteMeta.value };
      delete nextMeta[canonicalId];
      savedFavoriteMeta.value = nextMeta;
      added = false;
    } else {
      // Ensure we store the canonical identity cleanly without duplicating aliases
      const deduped = rawFavoriteIds.value.filter(
        (id) => getCanonicalFavoriteId(id, aliasMap) !== canonicalId
      );
      deduped.push(canonicalId);
      rawFavoriteIds.value = deduped;

      if (typeof track === 'object') {
        savedFavoriteMeta.value = {
          ...savedFavoriteMeta.value,
          [canonicalId]: compactTrackMeta(track, canonicalId),
        };
      }
      added = true;
    }

    persistFavorites();
    return added;
  };

  const toggleSidebarCollapsed = () => {
    isSidebarCollapsed.value = !isSidebarCollapsed.value;
  };

  const toggleMobileSidebar = () => {
    isMobileSidebarOpen.value = !isMobileSidebarOpen.value;
  };

  const closeMobileSidebar = () => {
    isMobileSidebarOpen.value = false;
  };

  const toggleQueue = () => {
    isQueueOpen.value = !isQueueOpen.value;
  };

  const openQueue = () => {
    isQueueOpen.value = true;
  };

  const closeQueue = () => {
    isQueueOpen.value = false;
  };

  const openLicenseModal = (track) => {
    selectedLicenseTrack.value = track || null;
  };

  const closeLicenseModal = () => {
    selectedLicenseTrack.value = null;
  };

  const triggerSearchFocus = () => {
    searchFocusNonce.value += 1;
  };

  const selectGenre = (genreName) => {
    activeMoodId.value = '';
    selectedGenre.value = genreName || '';
    activeFilter.value = genreName ? 'genre' : '';
  };

  const selectMood = (moodOrId) => {
    const id = typeof moodOrId === 'string' ? moodOrId : moodOrId?.id || moodOrId?._id || '';
    selectedGenre.value = '';
    activeMoodId.value = id;
    activeFilter.value = id ? 'mood' : '';
  };

  const selectFavorites = () => {
    selectedGenre.value = '';
    activeMoodId.value = '';
    activeFilter.value = 'favorites';
  };

  const setSearchQuery = (q) => {
    searchQuery.value = q;
    if (q && q.trim()) {
      activeFilter.value = 'search';
    } else if (activeFilter.value === 'search') {
      activeFilter.value = '';
    }
  };

  const clearAllFilters = () => {
    selectedGenre.value = '';
    activeMoodId.value = '';
    activeFilter.value = '';
    searchQuery.value = '';
    sortBy.value = 'default';
  };

  return {
    isSidebarCollapsed,
    isMobileSidebarOpen,
    isQueueOpen,
    showSettingsModal,
    showCreatePlaylistModal,
    showShortcutsModal,
    selectedLicenseTrack,
    searchFocusNonce,
    dockHeight,
    searchQuery,
    selectedGenre,
    activeFilter,
    activeMoodId,
    activeMood,
    sortBy,
    rawFavoriteIds,
    favoritesList,
    likedTracks,
    favoriteCount,
    catalogIndex,
    loadFavorites,
    isFavoriteTrack,
    toggleFavorite,
    toggleSidebarCollapsed,
    toggleMobileSidebar,
    closeMobileSidebar,
    toggleQueue,
    openQueue,
    closeQueue,
    openLicenseModal,
    closeLicenseModal,
    triggerSearchFocus,
    selectGenre,
    selectMood,
    selectFavorites,
    setSearchQuery,
    clearAllFilters,
  };
});
