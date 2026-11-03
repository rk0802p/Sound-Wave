<template>
  <header class="sw-topbar">
    <div class="topbar-left">
      <!-- Mobile hamburger toggle button -->
      <button class="mobile-menu-btn" @click="$emit('toggle-sidebar')" title="Toggle Menu" aria-label="Toggle Navigation">
        <span></span><span></span><span></span>
      </button>

      <!-- Global Search Bar -->
      <div class="global-search-container">
        <svg class="search-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search catalog, playlists, tracks... (/ to focus)"
          class="topbar-search-input"
          ref="searchInputRef"
          @keydown.enter="handleSearchSubmit"
          @keydown.esc="handleSearchClear"
        />
        <div v-if="!searchQuery" class="search-key-badge">/</div>
        <button
          v-else
          class="clear-query-btn"
          @click="handleSearchClear"
          title="Clear search"
          aria-label="Clear Search Query"
        >
          ✕
        </button>
      </div>
    </div>

    <!-- Center/Right: Live Now Playing Floating Widget (If playing) -->
    <div class="topbar-right">
      <div
        v-if="playerStore.currentTrack"
        class="now-playing-pill"
        @click="playerStore.toggleExpanded()"
        title="Open Fullscreen Listening Room"
      >
        <div class="pill-eq" :class="{ active: playerStore.isPlaying }">
          <span></span><span></span><span></span>
        </div>
        <div class="pill-meta">
          <span class="pill-title">{{ playerStore.currentTrack.title }}</span>
          <span class="pill-artist">{{ playerStore.currentTrack.artist }}</span>
        </div>
        <div class="pill-expand-arrow">↗</div>
      </div>

      <!-- User Profile Pill -->
      <div class="user-greeting-pill">
        <div class="user-avatar-dot">{{ userInitials }}</div>
        <span class="user-greeting-label">{{ authStore.username || 'Listener' }}</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { usePlaylistStore } from '../../stores/playlist';
import { usePlayerStore } from '../../stores/player';

defineEmits(['toggle-sidebar']);

const router = useRouter();
const authStore = useAuthStore();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();

const searchInputRef = ref(null);
const searchQuery = ref('');

const userInitials = computed(() => {
  const name = authStore.username || 'SW';
  return name.substring(0, 2).toUpperCase();
});

const handleSearchSubmit = () => {
  if (searchQuery.value.trim()) {
    playlistStore.searchQuery = searchQuery.value.trim();
    router.push({ path: '/search', query: { q: searchQuery.value.trim() } });
  }
};

const handleSearchClear = () => {
  searchQuery.value = '';
  playlistStore.searchQuery = '';
};

// Global '/' keyboard shortcut to focus search
const handleGlobalKeydown = (e) => {
  if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
    e.preventDefault();
    searchInputRef.value?.focus();
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleGlobalKeydown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleGlobalKeydown);
});
</script>

<style scoped>
.sw-topbar {
  height: var(--sw-topbar-height);
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(10, 12, 16, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--sw-border-subtle);
  position: sticky;
  top: 0;
  z-index: 50;
  gap: 16px;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  max-width: 480px;
}

.mobile-menu-btn {
  display: none;
  background: transparent;
  border: none;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  padding: 8px 6px;
}

.mobile-menu-btn span {
  width: 20px;
  height: 2px;
  background: var(--sw-text-primary);
  border-radius: 1px;
}

/* Global Search Input Box */
.global-search-container {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-full);
  padding: 0 14px;
  height: 38px;
  width: 100%;
  transition: all var(--sw-transition-fast);
}

.global-search-container:focus-within {
  border-color: var(--sw-accent);
  background: var(--sw-surface-hover);
  box-shadow: 0 0 16px var(--sw-accent-soft);
}

.search-svg {
  color: var(--sw-text-muted);
  flex-shrink: 0;
}

.topbar-search-input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--sw-text-primary);
  font-size: 0.84rem;
  width: 100%;
}

.topbar-search-input::placeholder {
  color: var(--sw-text-muted);
}

.search-key-badge {
  font-family: var(--sw-font-mono);
  font-size: 0.72rem;
  color: var(--sw-text-muted);
  border: 1px solid var(--sw-border);
  border-radius: 4px;
  padding: 1px 6px;
  background: rgba(255, 255, 255, 0.04);
}

.clear-query-btn {
  color: var(--sw-text-muted);
  font-size: 0.8rem;
  padding: 2px;
  cursor: pointer;
}

.clear-query-btn:hover {
  color: var(--sw-text-primary);
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

/* Now Playing Floating Pill in Header */
.now-playing-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.22);
  border-radius: var(--sw-radius-full);
  padding: 4px 14px 4px 10px;
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.now-playing-pill:hover {
  background: rgba(56, 189, 248, 0.16);
  border-color: var(--sw-accent);
  transform: translateY(-1px);
}

.pill-eq {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
}

.pill-eq span {
  width: 2px;
  background: var(--sw-accent);
  border-radius: 1px;
}

.pill-eq.active span {
  animation: pillEqBounce 0.8s ease-in-out infinite alternate;
}

.pill-eq.active span:nth-child(1) { height: 40%; animation-delay: 0.1s; }
.pill-eq.active span:nth-child(2) { height: 100%; animation-delay: 0.3s; }
.pill-eq.active span:nth-child(3) { height: 60%; animation-delay: 0.2s; }

@keyframes pillEqBounce {
  0% { height: 20%; }
  100% { height: 100%; }
}

.pill-meta {
  display: flex;
  flex-direction: column;
  max-width: 140px;
}

.pill-title {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--sw-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pill-artist {
  font-size: 0.68rem;
  color: var(--sw-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pill-expand-arrow {
  font-size: 0.75rem;
  color: var(--sw-accent);
}

/* User Greeting Pill */
.user-greeting-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 4px;
  border-radius: var(--sw-radius-full);
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
}

.user-avatar-dot {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--sw-accent), #2563eb);
  color: #fff;
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
}

.user-greeting-label {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--sw-text-secondary);
}

@media (max-width: 900px) {
  .sw-topbar {
    padding: 0 16px;
  }
  .mobile-menu-btn {
    display: flex;
  }
  .now-playing-pill {
    display: none;
  }
}
</style>
