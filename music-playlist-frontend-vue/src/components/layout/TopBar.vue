<template>
  <header class="jb-topbar">
    <div class="jb-topbar-left font-mono">
      <button
        type="button"
        class="jb-hamburger-btn"
        aria-label="Open navigation menu"
        :aria-expanded="uiStore.isMobileSidebarOpen"
        @click="uiStore.toggleMobileSidebar()"
      >
        ☰
      </button>
      <router-link to="/" class="jb-breadcrumb-root" @click="uiStore.clearAllFilters()">
        SOUNDWAVE
      </router-link>
      <span class="jb-breadcrumb-sep">/</span>
      <template v-if="route.path.startsWith('/playlist/')">
        <span class="jb-breadcrumb-section">PLAYLIST</span>
        <span class="jb-breadcrumb-sep">/</span>
        <span class="jb-breadcrumb-active">{{ playlistBreadcrumbName }}</span>
      </template>
      <span v-else class="jb-breadcrumb-active">{{ activeBreadcrumb }}</span>
    </div>

    <div class="jb-topbar-right">
      <button
        type="button"
        class="jb-queue-toggle-btn font-mono"
        @click="uiStore.toggleQueue()"
        :title="`Up Next Queue (${playerStore.queue?.length || 0} tracks)`"
      >
        QUEUE ({{ playerStore.queue?.length || 0 }})
      </button>

      <div class="jb-status-chip font-mono">
        <span class="jb-status-dot"></span>
        <span>JAMENDO CC</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';
import { useUiStore } from '../../stores/ui';
import { usePlayerStore } from '../../stores/player';
import { usePlaylistStore } from '../../stores/playlist';

const route = useRoute();
const uiStore = useUiStore();
const playerStore = usePlayerStore();
const playlistStore = usePlaylistStore();

const playlistBreadcrumbName = computed(() => {
  const id = String(route.params.id || '');
  const active = playlistStore.currentPlaylist;
  if (active && String(active._id || active.id) === id) {
    return active.name || id;
  }
  const found = playlistStore.playlists.find((p) => String(p._id || p.id) === id);
  return found?.name || 'MIXTAPE';
});

const activeBreadcrumb = computed(() => {
  if (route.path === '/search') return 'SEARCH';
  if (route.path === '/explore') return 'EXPLORE';
  if (uiStore.activeMood) return `MOOD: ${uiStore.activeMood.name.toUpperCase()}`;
  if (uiStore.selectedGenre) return `COLLECTION: ${uiStore.selectedGenre.toUpperCase()}`;
  if (uiStore.activeFilter === 'favorites') return 'LIKED TRACKS';
  if (uiStore.searchQuery.trim()) return `FILTER: ${uiStore.searchQuery.trim().toUpperCase()}`;
  return 'HOME';
});
</script>

<style scoped>
.jb-topbar {
  height: var(--topbar-h, 68px);
  background-color: var(--surface, #FFFDF8);
  border-bottom: var(--bw, 2px) solid var(--border, #111111);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 2rem;
  position: sticky;
  top: 0;
  z-index: 90;
  gap: 0.75rem;
}

.jb-topbar-left {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  font-size: 0.85rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  min-width: 0;
  overflow: hidden;
}

.jb-hamburger-btn {
  display: none;
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: 2px 2px 0 var(--border, #111111);
  border-radius: var(--r-sm, 8px);
  width: 36px;
  height: 36px;
  font-size: 1.05rem;
  font-weight: 900;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.jb-breadcrumb-root {
  color: var(--ink, #111111);
  text-decoration: none;
  font-weight: 900;
  white-space: nowrap;
}

.jb-breadcrumb-section {
  white-space: nowrap;
}

.jb-breadcrumb-active {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jb-breadcrumb-sep {
  color: var(--ink-faint, #8A867C);
}

.jb-topbar-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.jb-queue-toggle-btn {
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
  padding: 0.4rem 0.85rem;
  border-radius: var(--r-pill, 999px);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  transition: transform 0.08s ease;
  white-space: nowrap;
}

.jb-queue-toggle-btn:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.jb-status-chip {
  background: var(--mint, #5DE3A6);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
  padding: 0.35rem 0.85rem;
  border-radius: var(--r-pill, 999px);
  font-size: 0.78rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  gap: 0.45rem;
  white-space: nowrap;
}

.jb-status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  border: 1.5px solid #111111;
  background: transparent;
}

@media (max-width: 768px) {
  .jb-topbar {
    padding: 0 1rem;
  }

  .jb-hamburger-btn {
    display: inline-flex;
  }

  .jb-status-chip {
    display: none;
  }
}
</style>
