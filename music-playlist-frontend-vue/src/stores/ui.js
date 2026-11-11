import { defineStore } from 'pinia';
import { ref, computed } from 'vue';
import { MOOD_PLAYLISTS } from '../data/moodPlaylists';

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
  const favoritesList = ref([]);

  const activeMood = computed(() => {
    if (!activeMoodId.value) return null;
    return (
      MOOD_PLAYLISTS.find(
        (m) => m.id === activeMoodId.value || m._id === activeMoodId.value
      ) || null
    );
  });

  const loadFavorites = () => {
    if (typeof localStorage === 'undefined') return;
    try {
      const raw = localStorage.getItem('soundwave_favorites');
      favoritesList.value = raw ? JSON.parse(raw) : [];
    } catch {
      favoritesList.value = [];
    }
  };

  const isFavoriteTrack = (track) => {
    const id = track?._id || track?.id;
    return id ? favoritesList.value.includes(id) : false;
  };

  const toggleFavorite = (track) => {
    const id = track?._id || track?.id;
    if (!id) return false;
    const idx = favoritesList.value.indexOf(id);
    let added = false;
    if (idx === -1) {
      favoritesList.value.push(id);
      added = true;
    } else {
      favoritesList.value.splice(idx, 1);
      added = false;
    }
    try {
      localStorage.setItem('soundwave_favorites', JSON.stringify(favoritesList.value));
    } catch {}
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
    favoritesList,
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
