<template>
  <header class="sw-topbar">
    <div class="topbar-left">
      <!-- Mobile hamburger toggle button -->
      <button class="mobile-menu-btn" @click="$emit('toggle-sidebar')" title="Toggle Menu">
        <span></span><span></span><span></span>
      </button>

      <!-- Global Search Input -->
      <div class="global-search-container">
        <svg class="search-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          v-model="playlistStore.searchQuery"
          type="text"
          placeholder="Search playlists, tracks, artists... (Enter)"
          class="topbar-search-input"
          @keydown.enter="handleSearchSubmit"
          @keydown.esc="handleSearchClear"
        />
        <button
          v-if="playlistStore.searchQuery"
          class="clear-query-btn"
          @click="handleSearchClear"
          title="Clear search"
        >
          ✕
        </button>
      </div>
    </div>

    <div class="topbar-right">
      <div class="user-greeting-pill">
        <span class="user-greeting-label">Hi, {{ authStore.username || 'Friend' }}</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { usePlaylistStore } from '../../stores/playlist';

defineEmits(['toggle-sidebar']);

const router = useRouter();
const authStore = useAuthStore();
const playlistStore = usePlaylistStore();

const handleSearchSubmit = () => {
  if (playlistStore.searchQuery.trim()) {
    router.push({ path: '/search', query: { q: playlistStore.searchQuery.trim() } });
  }
};

const handleSearchClear = () => {
  playlistStore.searchQuery = '';
};
</script>

<style scoped>
.sw-topbar {
  height: var(--sw-topbar-height);
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--sw-bg);
  border-bottom: 1px solid var(--sw-border-subtle);
  position: sticky;
  top: 0;
  z-index: 50;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  max-width: 440px;
}

.mobile-menu-btn {
  display: none;
  background: transparent;
  border: none;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  padding: 6px;
}

.mobile-menu-btn span {
  width: 18px;
  height: 2px;
  background: var(--sw-text-primary);
  border-radius: 1px;
}

.global-search-container {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
}

.search-svg {
  position: absolute;
  left: 12px;
  color: var(--sw-text-muted);
  pointer-events: none;
}

.topbar-search-input {
  width: 100%;
  height: 38px;
  padding: 0 32px 0 36px;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: 10px;
  color: var(--sw-text-primary);
  font-size: 0.85rem;
  outline: none;
  transition: all var(--sw-transition-fast);
}

.topbar-search-input:focus {
  border-color: var(--sw-accent);
  background: var(--sw-surface-hover);
  box-shadow: 0 0 0 1px var(--sw-accent);
}

.topbar-search-input::placeholder {
  color: var(--sw-text-muted);
}

.clear-query-btn {
  position: absolute;
  right: 10px;
  background: transparent;
  border: none;
  color: var(--sw-text-muted);
  cursor: pointer;
  font-size: 0.8rem;
  padding: 2px;
}

.clear-query-btn:hover {
  color: var(--sw-text-primary);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 14px;
}

.user-greeting-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border-subtle);
  border-radius: 20px;
}

.user-greeting-label {
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--sw-text-secondary);
}

@media (max-width: 900px) {
  .sw-topbar {
    padding: 0 16px;
  }
  .mobile-menu-btn {
    display: flex;
  }
}
</style>
