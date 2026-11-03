<template>
  <div class="sw-library-view">
    <!-- Header with Collection Metrics -->
    <header class="library-header">
      <div class="header-titles">
        <span class="header-eyebrow font-mono">SOUND ARCHIVE</span>
        <h1 class="header-main-title font-display">Personal Library</h1>
        <p class="header-sub">Manage, curate, and explore your personal sound collections and playlists.</p>
      </div>

      <div class="header-actions">
        <!-- Quick Metrics -->
        <div class="library-metrics font-mono">
          <div class="metric-chip">
            <span class="metric-num tabular-nums">{{ playlistStore.playlists.length }}</span>
            <span class="metric-lbl">COLLECTIONS</span>
          </div>
          <div class="metric-chip">
            <span class="metric-num tabular-nums">{{ playlistStore.totalTracksCount }}</span>
            <span class="metric-lbl">TRACKS</span>
          </div>
        </div>

        <AppButton
          variant="primary"
          size="md"
          @click="showCreateModal = true"
        >
          <template #icon-left>+</template>
          New Playlist
        </AppButton>
      </div>
    </header>

    <!-- Toolbar Controls: Search, Sort, View Switcher -->
    <div class="library-toolbar">
      <!-- Search Filter -->
      <div class="toolbar-search-box">
        <svg class="search-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Filter collection by name or description..."
          class="toolbar-search-input"
        />
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''" aria-label="Clear filter">✕</button>
      </div>

      <!-- Right Controls: Sort & Grid/List Toggle -->
      <div class="toolbar-right-controls">
        <div class="sort-picker">
          <label class="sort-tag font-mono">SORT</label>
          <select v-model="sortBy" class="sw-sort-select">
            <option value="updated">Recently Updated</option>
            <option value="created">Recently Created</option>
            <option value="name">Name (A–Z)</option>
            <option value="tracks">Track Count</option>
          </select>
        </div>

        <div class="view-switch-box">
          <button
            class="switch-btn"
            :class="{ active: viewMode === 'grid' }"
            @click="viewMode = 'grid'"
            title="Grid View"
            aria-label="Grid View"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
          </button>
          <button
            class="switch-btn"
            :class="{ active: viewMode === 'list' }"
            @click="viewMode = 'list'"
            title="List / Ledger View"
            aria-label="List View"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Skeletons -->
    <div v-if="playlistStore.isLoading && !playlistStore.playlists.length" class="library-grid">
      <div v-for="i in 8" :key="i" class="skeleton-card">
        <div class="skeleton-art"></div>
        <div class="skeleton-line w-75"></div>
        <div class="skeleton-line w-40"></div>
      </div>
    </div>

    <!-- Empty Library State -->
    <div v-else-if="playlistStore.playlists.length === 0" class="empty-state-box">
      <div class="empty-icon-wrap">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
      </div>
      <h2 class="font-display">Your sound archive is empty.</h2>
      <p>Create your first playlist and give your music a dedicated listening space.</p>
      <AppButton variant="primary" size="md" @click="showCreateModal = true">
        <template #icon-left>+</template>
        Create Playlist
      </AppButton>
    </div>

    <!-- Empty Filter Results -->
    <div v-else-if="filteredPlaylists.length === 0" class="empty-state-box">
      <h2 class="font-display">No collections match "{{ searchQuery }}"</h2>
      <p>Try searching for a different keyword or playlist name.</p>
      <AppButton variant="secondary" size="sm" @click="searchQuery = ''">
        Clear Filter
      </AppButton>
    </div>

    <!-- GRID VIEW -->
    <div v-else-if="viewMode === 'grid'" class="library-grid">
      <PlaylistCard
        v-for="(pl, idx) in filteredPlaylists"
        :key="pl._id"
        :playlist="pl"
        :index="idx"
      />
    </div>

    <!-- LIST / LEDGER VIEW -->
    <div v-else class="library-list-table-container">
      <table class="library-table">
        <thead>
          <tr>
            <th class="th-pl">PLAYLIST</th>
            <th class="th-desc">DESCRIPTION</th>
            <th class="th-count">TRACKS</th>
            <th class="th-dur">DURATION</th>
            <th class="th-date">UPDATED</th>
            <th class="th-act"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(pl) in filteredPlaylists"
            :key="pl._id"
            class="table-row"
            @click="goToPlaylist(pl._id)"
          >
            <td class="td-pl">
              <div class="cell-pl-info">
                <ArtworkCover
                  :src="pl.coverImage"
                  :alt="pl.name"
                  size="xs"
                  :fallbackSeed="pl.name"
                />
                <span class="pl-table-name font-display">{{ pl.name }}</span>
              </div>
            </td>

            <td class="td-desc">
              <span class="cell-desc-text">{{ pl.description || '—' }}</span>
            </td>

            <td class="td-count">
              <span class="tabular-nums font-mono">{{ pl.songs?.length || 0 }}</span>
            </td>

            <td class="td-dur">
              <span class="tabular-nums font-mono">{{ formatDuration(calculateDuration(pl.songs)) }}</span>
            </td>

            <td class="td-date">
              <span class="date-label font-mono">{{ formatDate(pl.updatedAt || pl.createdAt) }}</span>
            </td>

            <td class="td-act" @click.stop>
              <button
                class="quick-play-row-btn"
                :disabled="!pl.songs?.length"
                @click="quickPlay(pl)"
                title="Play Playlist"
                aria-label="Play Playlist"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- Create Playlist Modal -->
    <CreatePlaylistModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePlaylistStore } from '../stores/playlist';
import { usePlayerStore } from '../stores/player';
import { formatDuration } from '../data/demoTracks';
import PlaylistCard from '../components/dashboard/PlaylistCard.vue';
import ArtworkCover from '../components/common/ArtworkCover.vue';
import AppButton from '../components/common/AppButton.vue';
import CreatePlaylistModal from '../components/playlists/CreatePlaylistModal.vue';

const router = useRouter();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();

const searchQuery = ref('');
const sortBy = ref('updated');
const viewMode = ref('grid');
const showCreateModal = ref(false);

const filteredPlaylists = computed(() => {
  let list = [...playlistStore.playlists];

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }

  list.sort((a, b) => {
    if (sortBy.value === 'name') {
      return a.name.localeCompare(b.name);
    }
    if (sortBy.value === 'created') {
      return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
    }
    if (sortBy.value === 'tracks') {
      return (b.songs?.length || 0) - (a.songs?.length || 0);
    }
    return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
  });

  return list;
});

const goToPlaylist = (id) => {
  router.push(`/playlists/${id}`);
};

const quickPlay = (pl) => {
  if (pl.songs && pl.songs.length) {
    playerStore.playTrack(pl.songs[0], pl.songs, 0, pl._id);
  }
};

const calculateDuration = (songs) => {
  if (!songs || !songs.length) return 0;
  return songs.reduce((acc, s) => acc + (s.duration || 0), 0);
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    return new Date(dateString).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return '—';
  }
};
</script>

<style scoped>
.sw-library-view {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.library-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  flex-wrap: wrap;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-eyebrow {
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  color: var(--sw-accent);
  font-weight: 700;
}

.header-main-title {
  font-size: 2.4rem;
  font-weight: 800;
  letter-spacing: -0.03em;
  color: var(--sw-text-primary);
}

.header-sub {
  font-size: 0.92rem;
  color: var(--sw-text-secondary);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 16px;
  flex-wrap: wrap;
}

.library-metrics {
  display: flex;
  gap: 10px;
}

.metric-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 6px 14px;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-md);
}

.metric-num {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--sw-text-primary);
}

.metric-lbl {
  font-size: 0.62rem;
  color: var(--sw-text-muted);
}

/* Toolbar */
.library-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding: 14px 18px;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-lg);
}

.toolbar-search-box {
  display: flex;
  align-items: center;
  gap: 10px;
  flex: 1;
  max-width: 440px;
}

.search-svg {
  color: var(--sw-text-muted);
}

.toolbar-search-input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--sw-text-primary);
  font-size: 0.88rem;
  width: 100%;
}

.toolbar-search-input::placeholder {
  color: var(--sw-text-muted);
}

.clear-btn {
  color: var(--sw-text-muted);
  font-size: 0.8rem;
  cursor: pointer;
}

.toolbar-right-controls {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sort-picker {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-tag {
  font-size: 0.68rem;
  color: var(--sw-text-muted);
  letter-spacing: 0.08em;
}

.sw-sort-select {
  background: var(--sw-surface-hover);
  border: 1px solid var(--sw-border);
  color: var(--sw-text-primary);
  padding: 6px 12px;
  border-radius: var(--sw-radius-sm);
  font-size: 0.82rem;
  outline: none;
  cursor: pointer;
}

.view-switch-box {
  display: flex;
  background: var(--sw-surface-hover);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-sm);
  padding: 2px;
}

.switch-btn {
  padding: 6px 8px;
  border-radius: 4px;
  color: var(--sw-text-muted);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--sw-transition-fast);
}

.switch-btn:hover {
  color: var(--sw-text-primary);
}

.switch-btn.active {
  background: var(--sw-surface-active);
  color: var(--sw-accent);
}

/* Grids & Cards */
.library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 24px;
}

/* Skeletons */
.skeleton-card {
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-xl);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-art {
  width: 100%;
  aspect-ratio: 1;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.02));
  background-size: 200% 100%;
  border-radius: var(--sw-radius-md);
  animation: swShimmer 1.8s infinite;
}

.skeleton-line {
  height: 14px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 4px;
}

@keyframes swShimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Empty State */
.empty-state-box {
  text-align: center;
  padding: 64px 24px;
  background: var(--sw-surface);
  border: 1px dashed var(--sw-border);
  border-radius: var(--sw-radius-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-icon-wrap {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sw-accent);
  margin-bottom: 16px;
}

.empty-state-box h2 {
  font-size: 1.5rem;
  margin-bottom: 8px;
}

.empty-state-box p {
  color: var(--sw-text-secondary);
  font-size: 0.9rem;
  margin-bottom: 24px;
}

/* List / Ledger Table */
.library-list-table-container {
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-xl);
  overflow-x: auto;
}

.library-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.library-table th {
  padding: 14px 18px;
  font-family: var(--sw-font-mono);
  font-size: 0.68rem;
  color: var(--sw-text-muted);
  border-bottom: 1px solid var(--sw-border);
  letter-spacing: 0.08em;
}

.table-row {
  cursor: pointer;
  border-bottom: 1px solid var(--sw-border-subtle);
  transition: background var(--sw-transition-fast);
}

.table-row:hover {
  background: var(--sw-surface-hover);
}

.library-table td {
  padding: 12px 18px;
  font-size: 0.85rem;
  color: var(--sw-text-secondary);
}

.cell-pl-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pl-table-name {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--sw-text-primary);
}

.table-row:hover .pl-table-name {
  color: var(--sw-accent);
}

.cell-desc-text {
  max-width: 320px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: block;
}

.quick-play-row-btn {
  width: 34px;
  height: 34px;
  border-radius: 50%;
  background: var(--sw-surface-active);
  color: var(--sw-text-primary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.quick-play-row-btn:hover:not(:disabled) {
  background: var(--sw-accent);
  color: #060709;
  transform: scale(1.08);
}
</style>
