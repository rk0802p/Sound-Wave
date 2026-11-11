<template>
  <div>
    <!-- Mobile backdrop when drawer open -->
    <div
      v-if="uiStore.isMobileSidebarOpen"
      class="jb-sidebar-mobile-backdrop"
      @click="uiStore.closeMobileSidebar()"
    ></div>

    <aside
      class="jb-sidebar"
      :class="{
        collapsed: uiStore.isSidebarCollapsed,
        'mobile-open': uiStore.isMobileSidebarOpen,
      }"
      aria-label="Primary Navigation"
    >
      <!-- Sidebar Header / Brand -->
      <div class="jb-sidebar-header">
        <router-link to="/" class="jb-brand" @click="handleGoHome">
          <div class="jb-logo-grid" aria-hidden="true">
            <span class="sq sq-blue"></span>
            <span class="sq sq-coral"></span>
            <span class="sq sq-sun"></span>
            <span class="sq sq-lime"></span>
          </div>
          <span v-if="!uiStore.isSidebarCollapsed" class="jb-brand-text font-display">SOUNDWAVE</span>
        </router-link>
        <button
          type="button"
          class="jb-collapse-toggle font-mono"
          @click="uiStore.toggleSidebarCollapsed()"
          :title="uiStore.isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
          :aria-label="uiStore.isSidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'"
        >
          {{ uiStore.isSidebarCollapsed ? '»' : '«' }}
        </button>
      </div>

      <!-- Search in Sidebar -->
      <div class="jb-search-box-wrap">
        <div
          class="jb-search-box"
          :class="{ collapsed: uiStore.isSidebarCollapsed }"
          @click="uiStore.isSidebarCollapsed ? uiStore.toggleSidebarCollapsed() : null"
        >
          <svg class="jb-search-icon" viewBox="0 0 24 24"><path :d="SEARCH_ICON_PATH" /></svg>
          <input
            v-if="!uiStore.isSidebarCollapsed"
            ref="searchInputRef"
            :value="uiStore.searchQuery"
            type="search"
            placeholder="Search tracks, artists..."
            @input="handleSearchInput"
            @keydown.enter="handleSearchSubmit"
            class="jb-search-input font-mono"
          />
          <span v-if="!uiStore.isSidebarCollapsed && !uiStore.searchQuery" class="jb-key-cap font-mono">⌘K</span>
          <button
            v-if="!uiStore.isSidebarCollapsed && uiStore.searchQuery"
            type="button"
            class="jb-clear-search font-mono"
            @click="clearSearchQuery"
            aria-label="Clear sidebar search"
          >
            ✕
          </button>
        </div>
      </div>

      <!-- Navigation Links -->
      <nav class="jb-sidebar-nav">
        <router-link
          to="/"
          class="jb-nav-item"
          :class="{ active: isHomeActive }"
          @click="handleGoHome"
        >
          <span class="jb-nav-tile tile-blue">⌂</span>
          <span v-if="!uiStore.isSidebarCollapsed" class="jb-nav-label">Home</span>
        </router-link>

        <router-link
          to="/explore"
          class="jb-nav-item"
          :class="{ active: route.path === '/explore' }"
          @click="uiStore.closeMobileSidebar()"
        >
          <span class="jb-nav-tile tile-coral">🌐</span>
          <span v-if="!uiStore.isSidebarCollapsed" class="jb-nav-label">Explore Mixtapes</span>
        </router-link>

        <button
          type="button"
          class="jb-nav-item"
          :class="{ active: route.path === '/' && uiStore.activeFilter === 'favorites' }"
          @click="handleSelectFavorites"
        >
          <span class="jb-nav-tile tile-pink">♥</span>
          <span v-if="!uiStore.isSidebarCollapsed" class="jb-nav-label">Liked Tracks</span>
          <span
            v-if="!uiStore.isSidebarCollapsed && uiStore.favoriteCount"
            class="jb-nav-count font-mono"
          >
            {{ uiStore.favoriteCount }}
          </span>
        </button>

        <router-link
          to="/search"
          class="jb-nav-item"
          :class="{ active: route.path === '/search' }"
          @click="uiStore.closeMobileSidebar()"
        >
          <span class="jb-nav-tile tile-sun">🔍</span>
          <span v-if="!uiStore.isSidebarCollapsed" class="jb-nav-label">Search Catalog</span>
        </router-link>
      </nav>

      <!-- GENRE / COLLECTIONS SECTION -->
      <div class="jb-sidebar-section">
        <div v-if="!uiStore.isSidebarCollapsed" class="jb-section-label font-mono">COLLECTIONS</div>
        <div class="jb-collections-list">
          <button
            v-for="genre in availableGenres"
            :key="genre.name"
            type="button"
            class="jb-collection-row"
            :class="{ active: route.path === '/' && uiStore.selectedGenre === genre.name }"
            @click="handleSelectGenre(genre.name)"
            :title="genre.name"
          >
            <span class="jb-nav-tile" :style="{ backgroundColor: genre.color }">{{ genre.icon }}</span>
            <span v-if="!uiStore.isSidebarCollapsed" class="jb-collection-name">{{ genre.name }}</span>
            <span v-if="!uiStore.isSidebarCollapsed" class="jb-collection-count font-mono">{{ genre.count }}</span>
          </button>
        </div>
      </div>

      <!-- PLAYLISTS SECTION -->
      <div class="jb-sidebar-section">
        <div v-if="!uiStore.isSidebarCollapsed" class="jb-section-label font-mono jb-split-label">
          <span>PLAYLISTS ({{ userPlaylists.length }})</span>
          <button
            type="button"
            class="jb-mini-add-btn font-mono"
            @click="emit('open-create')"
            title="New playlist"
          >
            + NEW
          </button>
        </div>
        <div class="jb-playlists-list" @click="handlePlaylistAreaClick">
          <div v-if="userPlaylists.length === 0 && !uiStore.isSidebarCollapsed" class="jb-sidebar-empty font-mono">
            No user playlists
          </div>
          <PlaylistSidebarMenu
            v-for="p in userPlaylists"
            :key="p._id || p.id"
            :playlist="p"
            :isCollapsed="uiStore.isSidebarCollapsed"
            @rename="emit('playlist-rename', $event)"
            @duplicate="emit('playlist-duplicate', $event)"
            @delete="emit('playlist-delete', $event)"
          />
        </div>
      </div>

      <!-- MOODS SECTION -->
      <div class="jb-sidebar-section">
        <div v-if="!uiStore.isSidebarCollapsed" class="jb-section-label font-mono">MOODS</div>
        <div class="jb-collections-list">
          <button
            v-for="mood in MOOD_PLAYLISTS"
            :key="mood.id"
            type="button"
            class="jb-collection-row"
            :class="{ active: route.path === '/' && uiStore.activeFilter === 'mood' && uiStore.activeMoodId === mood.id }"
            @click="handleSelectMood(mood)"
            :title="mood.name"
          >
            <span class="jb-nav-tile" :style="{ backgroundColor: mood.tint || '#ffd84a' }">{{ mood.emoji || '✨' }}</span>
            <span v-if="!uiStore.isSidebarCollapsed" class="jb-collection-name">{{ mood.name }}</span>
            <span v-if="!uiStore.isSidebarCollapsed" class="jb-collection-count font-mono">{{ mood.songs?.length || 0 }}</span>
          </button>
        </div>
      </div>

      <!-- SIDEBAR FOOTER -->
      <div class="jb-sidebar-footer">
        <button
          v-if="!uiStore.isSidebarCollapsed"
          type="button"
          class="jb-support-btn font-mono"
          @click="uiStore.showSettingsModal = true; uiStore.closeMobileSidebar()"
        >
          ⚙️ AUDIO SETTINGS
        </button>

        <div v-if="!uiStore.isSidebarCollapsed && authStore.isAuthenticated" class="jb-user-card font-mono">
          <div class="jb-user-info">
            <span class="jb-user-avatar">{{ userInitial }}</span>
            <span class="jb-username">{{ authStore.username }}</span>
          </div>
          <button type="button" class="jb-signout-btn font-mono" @click="handleLogout">EXIT</button>
        </div>
        <div v-else-if="!uiStore.isSidebarCollapsed" class="jb-auth-box">
          <router-link to="/login" class="jb-auth-pill font-mono" @click="uiStore.closeMobileSidebar()">LOG IN</router-link>
          <router-link to="/signup" class="jb-auth-pill fill font-mono" @click="uiStore.closeMobileSidebar()">SIGN UP</router-link>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { ref, computed, watch, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { useUiStore } from '../../stores/ui';
import { usePlaylistStore } from '../../stores/playlist';
import { usePlayerStore } from '../../stores/player';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';
import { FEATURED_SONGS } from '../../data/featuredSongs';
import { MOOD_PLAYLISTS } from '../../data/moodPlaylists';
import { buildAvailableGenres } from '../../utils/genres';
import PlaylistSidebarMenu from '../playlists/PlaylistSidebarMenu.vue';

const emit = defineEmits(['open-create', 'playlist-rename', 'playlist-duplicate', 'playlist-delete']);

const router = useRouter();
const route = useRoute();
const uiStore = useUiStore();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();
const authStore = useAuthStore();
const toastStore = useToastStore();

const searchInputRef = ref(null);
const SEARCH_ICON_PATH =
  'M10.5 3a7.5 7.5 0 1 0 4.5 13.500l4.500 4.500 1.500-1.500-4.500-4.500A7.500 7.500 0 0 0 10.500 3zm0 2a5.500 5.500 0 1 1 0 11 5.500 5.500 0 0 1 0-11z';

const availableGenres = computed(() => buildAvailableGenres(FEATURED_SONGS));
const userPlaylists = computed(() => playlistStore.userPlaylists);
const userInitial = computed(() => (authStore.username?.[0] || 'U').toUpperCase());

const isHomeActive = computed(() => {
  return (
    route.path === '/' &&
    uiStore.activeFilter === '' &&
    !uiStore.selectedGenre &&
    !uiStore.activeMoodId
  );
});

const handleGoHome = () => {
  uiStore.clearAllFilters();
  uiStore.closeMobileSidebar();
  if (route.path !== '/' || Object.keys(route.query).length > 0) {
    router.push({ path: '/' });
  }
};

const handleSelectFavorites = () => {
  uiStore.selectFavorites();
  uiStore.closeMobileSidebar();
  router.push({ path: '/', query: { filter: 'favorites' } });
};

const handleSelectGenre = (genreName) => {
  uiStore.selectGenre(genreName);
  uiStore.closeMobileSidebar();
  router.push({ path: '/', query: genreName ? { genre: genreName } : {} });
};

const handleSelectMood = (mood) => {
  uiStore.selectMood(mood);
  if (mood.songs && mood.songs.length) {
    playerStore.queue = mood.songs;
  }
  uiStore.closeMobileSidebar();
  router.push({ path: '/', query: { playlist: mood.id } });
};

const handleSearchInput = (e) => {
  const val = e.target.value;
  uiStore.setSearchQuery(val);
  if (route.path !== '/' && route.path !== '/search') {
    router.push({ path: '/', query: val.trim() ? { q: val.trim() } : {} });
  }
};

const clearSearchQuery = () => {
  uiStore.setSearchQuery('');
  if (route.path === '/' && route.query.q) {
    const { q, ...rest } = route.query;
    router.replace({ path: '/', query: rest });
  }
};

const handleSearchSubmit = () => {
  const q = uiStore.searchQuery.trim();
  if (q) {
    uiStore.closeMobileSidebar();
    router.push({ path: '/search', query: { q } });
  }
};

const handlePlaylistAreaClick = (e) => {
  if (e.target.closest('.sidebar-playlist-link')) {
    uiStore.closeMobileSidebar();
  }
};

const handleLogout = () => {
  authStore.logout();
  uiStore.closeMobileSidebar();
  toastStore.show('Logged out', 'info');
};

watch(
  () => uiStore.searchFocusNonce,
  async () => {
    if (uiStore.isSidebarCollapsed) {
      uiStore.isSidebarCollapsed = false;
    }
    await nextTick();
    searchInputRef.value?.focus();
    searchInputRef.value?.select?.();
  }
);
</script>

<style scoped>
.jb-sidebar-mobile-backdrop {
  display: none;
}

.jb-sidebar {
  width: var(--sidebar-w, 300px);
  background-color: #EFEAE1;
  border-right: var(--bw, 2px) solid var(--border, #111111);
  display: flex;
  flex-direction: column;
  position: sticky;
  top: 0;
  height: 100vh;
  flex-shrink: 0;
  z-index: 100;
  transition: width 0.15s ease;
  overflow-y: auto;
}

.jb-sidebar.collapsed {
  width: var(--sidebar-w-collapsed, 80px);
}

.jb-sidebar.collapsed .jb-sidebar-header {
  flex-direction: column;
  gap: 0.65rem;
  padding: 0.85rem 0.5rem;
}

.jb-sidebar.collapsed .jb-nav-item,
.jb-sidebar.collapsed .jb-collection-row {
  justify-content: center;
  padding: 0.45rem;
}

.jb-sidebar.collapsed .jb-sidebar-section {
  padding: 0.6rem 0.5rem;
}

.jb-sidebar.collapsed .jb-sidebar-footer {
  padding: 0.75rem 0.5rem calc(var(--dock-height, 88px) + 1rem);
  min-height: 0;
}

.jb-sidebar-header {
  padding: 1.25rem 1rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: var(--bw, 2px) solid var(--border, #111111);
  background-color: var(--surface, #FFFDF8);
}

.jb-brand {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
}

.jb-logo-grid {
  display: grid;
  grid-template-columns: 12px 12px;
  grid-template-rows: 12px 12px;
  gap: 3px;
}

.jb-logo-grid .sq {
  width: 12px;
  height: 12px;
  border: 1.5px solid #111111;
  border-radius: 3px;
}

.sq-blue { background-color: var(--c-blue, #4D6BFF); }
.sq-coral { background-color: var(--c-coral, #FF6B5E); }
.sq-sun { background-color: var(--c-sun, #FFD84A); }
.sq-lime { background-color: var(--c-lime, #B8F23C); }

.jb-brand-text {
  font-size: 1.35rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  color: var(--ink, #111111);
}

.jb-collapse-toggle {
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: 2px 2px 0 var(--border, #111111);
  width: 32px;
  height: 32px;
  border-radius: var(--r-sm, 8px);
  cursor: pointer;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.08s ease;
}

.jb-collapse-toggle:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.jb-search-box-wrap {
  padding: 0.9rem 1rem;
}

.jb-search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  background-color: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
  border-radius: var(--r-md, 12px);
  padding: 0.55rem 0.75rem;
}

.jb-search-box.collapsed {
  justify-content: center;
  padding: 0.6rem;
  cursor: pointer;
}

.jb-search-icon {
  width: 18px;
  height: 18px;
  fill: var(--ink, #111111);
  flex-shrink: 0;
}

.jb-search-input {
  border: none;
  outline: none;
  background: transparent;
  width: 100%;
  font-size: 0.85rem;
  color: var(--ink, #111111);
}

.jb-key-cap {
  border: 1.5px solid var(--border, #111111);
  border-radius: 4px;
  padding: 0.1rem 0.35rem;
  font-size: 0.7rem;
  background: #EFEAE1;
}

.jb-clear-search {
  border: none;
  background: none;
  cursor: pointer;
  font-weight: bold;
}

.jb-sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 0.5rem 1rem;
}

.jb-nav-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.45rem 0.65rem;
  border-radius: var(--r-sm, 8px);
  border: var(--bw, 2px) solid transparent;
  color: var(--ink, #111111);
  font-weight: 700;
  font-size: 0.92rem;
  cursor: pointer;
  text-decoration: none;
  transition: all 0.1s ease;
  text-align: left;
  width: 100%;
}

.jb-nav-item:hover {
  background-color: rgba(17, 17, 17, 0.05);
}

.jb-nav-item.active {
  background-color: var(--ink, #111111);
  color: var(--bg, #F3EFE8);
  border-color: var(--border, #111111);
}

.jb-nav-tile {
  width: 28px;
  height: 28px;
  border-radius: 6px;
  border: 1.5px solid var(--border, #111111);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  flex-shrink: 0;
}

.tile-blue { background-color: var(--c-blue, #4D6BFF); color: #fff; }
.tile-coral { background-color: var(--c-coral, #FF6B5E); color: #fff; }
.tile-pink { background-color: var(--c-hotpink, #FF4F9A); color: #fff; }
.tile-sun { background-color: var(--c-sun, #FFD84A); color: #111; }

.jb-nav-count {
  margin-left: auto;
  font-size: 0.75rem;
  border: 1px solid var(--border, #111111);
  padding: 0.1rem 0.4rem;
  border-radius: 999px;
  background: var(--surface-2, #FFFFFF);
  color: var(--ink, #111111);
}

.jb-nav-item.active .jb-nav-count {
  background: var(--ink, #111111);
  color: var(--bg, #F3EFE8);
  border-color: var(--bg, #F3EFE8);
}

.jb-sidebar-section {
  padding: 0.75rem 1rem;
  border-top: var(--bw, 2px) solid var(--border, #111111);
}

.jb-section-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  color: var(--ink-muted, #4A4740);
  margin-bottom: 0.5rem;
}

.jb-split-label {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.jb-mini-add-btn {
  background: var(--surface-2, #FFFFFF);
  border: 1.5px solid var(--border, #111111);
  padding: 0.1rem 0.4rem;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: bold;
  cursor: pointer;
}

.jb-collections-list,
.jb-playlists-list {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.jb-sidebar-empty {
  font-size: 0.78rem;
  color: var(--ink-muted, #4A4740);
  padding: 0.35rem 0.25rem;
}

.jb-collection-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 0.4rem 0.5rem;
  border: 2px solid transparent;
  border-radius: var(--r-sm, 8px);
  background: none;
  font-weight: 600;
  font-size: 0.88rem;
  cursor: pointer;
  text-align: left;
  width: 100%;
}

.jb-collection-row:hover {
  background-color: rgba(17, 17, 17, 0.05);
}

.jb-collection-row.active {
  background-color: var(--surface-2, #FFFFFF);
  border-color: var(--border, #111111);
  box-shadow: 2px 2px 0 var(--border, #111111);
}

.jb-collection-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}

.jb-collection-count {
  font-size: 0.72rem;
  color: var(--ink-muted, #4A4740);
}

.jb-sidebar-footer {
  margin-top: auto;
  padding: 1rem 1rem calc(var(--dock-height, 88px) + 1.25rem);
  border-top: var(--bw, 2px) solid var(--border, #111111);
  background-color: var(--surface, #FFFDF8);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  flex-shrink: 0;
  min-height: 80px;
}

.jb-support-btn {
  background-color: var(--yellow, #FFD84A);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
  padding: 0.55rem;
  border-radius: var(--r-md, 12px);
  font-weight: 700;
  font-size: 0.8rem;
  cursor: pointer;
  transition: transform 0.08s ease;
}

.jb-support-btn:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.jb-user-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.4rem;
  background: #EFEAE1;
  border: 1.5px solid var(--border, #111111);
  border-radius: var(--r-sm, 8px);
}

.jb-user-info {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 0;
}

.jb-user-avatar {
  width: 24px;
  height: 24px;
  background: var(--ink, #111111);
  color: var(--bg, #F3EFE8);
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.jb-username {
  font-size: 0.82rem;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.jb-signout-btn {
  background: none;
  border: 1px solid var(--border, #111111);
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-size: 0.68rem;
  cursor: pointer;
}

.jb-auth-box {
  display: flex;
  gap: 0.5rem;
}

.jb-auth-pill {
  flex: 1;
  text-align: center;
  padding: 0.45rem;
  border: 1.5px solid var(--border, #111111);
  border-radius: var(--r-sm, 8px);
  font-size: 0.75rem;
  font-weight: 700;
  text-decoration: none;
  color: var(--ink, #111111);
  background: var(--surface-2, #FFFFFF);
}

.jb-auth-pill.fill {
  background: var(--ink, #111111);
  color: var(--bg, #F3EFE8);
}

@media (max-width: 1100px) and (min-width: 769px) {
  .jb-sidebar:not(.collapsed) {
    width: 250px;
  }
}

@media (max-width: 768px) {
  .jb-sidebar-mobile-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    background: rgba(17, 17, 17, 0.45);
    z-index: 1290;
  }

  .jb-sidebar {
    position: fixed;
    top: 0;
    left: 0;
    bottom: 0;
    width: min(300px, 85vw);
    height: 100vh;
    transform: translateX(-100%);
    transition: transform 0.2s ease;
    z-index: 1300;
  }

  .jb-sidebar.collapsed {
    width: min(300px, 85vw);
  }

  .jb-sidebar.mobile-open {
    transform: translateX(0);
  }

  .jb-collapse-toggle {
    display: none;
  }
}
</style>
