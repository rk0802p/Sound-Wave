<template>
  <div class="sw-library-view">
    <!-- Header -->
    <header class="library-header">
      <div class="header-titles">
        <span class="header-eyebrow">COLLECTION</span>
        <h1 class="header-main-title">Your Library</h1>
        <p class="header-sub">Manage, curate, and explore your personal sound archives.</p>
      </div>

      <div class="header-actions">
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

    <!-- Toolbar Controls -->
    <div class="library-toolbar">
      <!-- Search Input -->
      <div class="toolbar-search-box">
        <svg class="search-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Filter by name or description..."
          class="toolbar-search-input"
        />
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''">✕</button>
      </div>

      <!-- Right Controls: Sort & Grid/List Toggle -->
      <div class="toolbar-right-controls">
        <div class="sort-picker">
          <label class="sort-tag">Sort</label>
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
            title="List View"
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
      <div class="empty-icon">📁</div>
      <h2>Your library starts here.</h2>
      <p>Create a playlist and give your music a place to live.</p>
      <AppButton variant="primary" size="md" @click="showCreateModal = true">
        + Create Playlist
      </AppButton>
    </div>

    <!-- Empty Search Results -->
    <div v-else-if="filteredPlaylists.length === 0" class="empty-state-box">
      <div class="empty-icon">🔍</div>
      <h2>No matches found</h2>
      <p>No playlists match "{{ searchQuery }}"</p>
      <AppButton variant="secondary" size="sm" @click="searchQuery = ''">
        Clear Filter
      </AppButton>
    </div>

    <!-- GRID VIEW (Using shared PlaylistCard) -->
    <div v-else-if="viewMode === 'grid'" class="library-grid">
      <PlaylistCard
        v-for="(pl, idx) in filteredPlaylists"
        :key="pl._id"
        :playlist="pl"
        :index="idx"
      />
    </div>

    <!-- LIST VIEW -->
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
            v-for="(pl, idx) in filteredPlaylists"
            :key="pl._id"
            class="table-row"
            @click="goToPlaylist(pl._id)"
          >
            <td class="td-pl">
              <div class="cell-pl-info">
                <img :src="getArtwork(pl, idx)" :alt="pl.name" class="pl-mini-thumb" @error="onImgError" />
                <span class="pl-table-name">{{ pl.name }}</span>
              </div>
            </td>

            <td class="td-desc">
              <span class="cell-desc-text">{{ pl.description || '—' }}</span>
            </td>

            <td class="td-count">
              <span class="tabular-nums">{{ pl.songs?.length || 0 }}</span>
            </td>

            <td class="td-dur">
              <span class="tabular-nums">{{ formatDuration(calculateDuration(pl.songs)) }}</span>
            </td>

            <td class="td-date">
              <span class="date-label">{{ formatDate(pl.updatedAt || pl.createdAt) }}</span>
            </td>

            <td class="td-act" @click.stop>
              <button
                class="quick-play-row-btn"
                :disabled="!pl.songs?.length"
                @click="quickPlay(pl)"
                title="Play Playlist"
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
import { formatDuration, getDistinctArtwork } from '../data/demoTracks';
import PlaylistCard from '../components/dashboard/PlaylistCard.vue';
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
    playerStore.playTrack(pl.songs[0], pl.songs, 0);
  }
};

const getArtwork = (pl, idx) => {
  return getDistinctArtwork(pl, idx);
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

const onImgError = (e) => {
  e.target.src = getDistinctArtwork(null, 1);
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
  gap: 20px;
  flex-wrap: wrap;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.header-eyebrow {
  font-size: 0.72rem;
  letter-spacing: 1.5px;
  color: var(--sw-accent);
  font-weight: 700;
}

.header-main-title {
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: -0.6px;
  color: var(--sw-text-primary);
  margin: 0;
}

.header-sub {
  font-size: 0.92rem;
  color: var(--sw-text-secondary);
}

.library-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--sw-border-subtle);
}

.toolbar-search-box {
  position: relative;
  flex: 1;
  max-width: 360px;
  min-width: 220px;
}

.search-svg {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--sw-text-muted);
  pointer-events: none;
}

.toolbar-search-input {
  width: 100%;
  height: 38px;
  padding: 0 32px 0 36px;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-sm);
  color: var(--sw-text-primary);
  font-size: 0.88rem;
  outline: none;
  transition: all var(--sw-transition-fast);
}

.toolbar-search-input:focus {
  border-color: var(--sw-accent);
  background: var(--sw-surface-hover);
}

.clear-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--sw-text-muted);
  cursor: pointer;
  font-size: 0.8rem;
}

.toolbar-right-controls {
  display: flex;
  align-items: center;
  gap: 14px;
}

.sort-picker {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-tag {
  font-size: 0.82rem;
  color: var(--sw-text-muted);
}

.sw-sort-select {
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-sm);
  color: var(--sw-text-primary);
  font-size: 0.85rem;
  padding: 6px 12px;
  outline: none;
  cursor: pointer;
}

.view-switch-box {
  display: flex;
  align-items: center;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-sm);
  padding: 2px;
}

.switch-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  background: transparent;
  border: none;
  color: var(--sw-text-muted);
  border-radius: 6px;
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.switch-btn.active {
  background: var(--sw-surface-hover);
  color: var(--sw-text-primary);
}

.library-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 22px;
}

/* Skeletons */
.skeleton-card {
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-md);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-art {
  width: 100%;
  aspect-ratio: 1;
  background: var(--sw-surface-hover);
  border-radius: var(--sw-radius-sm);
  animation: pulse 1.4s infinite;
}

.skeleton-line {
  height: 14px;
  background: var(--sw-surface-hover);
  border-radius: 4px;
  animation: pulse 1.4s infinite;
}

.w-75 { width: 75%; }
.w-40 { width: 40%; }

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

/* Empty states */
.empty-state-box {
  text-align: center;
  padding: 70px 24px;
  background: var(--sw-surface);
  border: 1px dashed var(--sw-border);
  border-radius: var(--sw-radius-lg);
}

.empty-icon {
  font-size: 2.8rem;
  margin-bottom: 12px;
}

.empty-state-box h2 {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--sw-text-primary);
  margin-bottom: 8px;
}

.empty-state-box p {
  color: var(--sw-text-secondary);
  font-size: 0.9rem;
  margin-bottom: 22px;
}

/* Table View */
.library-list-table-container {
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-md);
  overflow-x: auto;
}

.library-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.library-table th {
  padding: 14px 18px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--sw-text-muted);
  border-bottom: 1px solid var(--sw-border-subtle);
}

.th-pl { min-width: 240px; }
.th-desc { min-width: 200px; }
.th-count { width: 90px; }
.th-dur { width: 100px; }
.th-date { width: 130px; }
.th-act { width: 50px; text-align: right; }

.table-row {
  cursor: pointer;
  transition: background var(--sw-transition-fast);
}

.table-row:hover {
  background: var(--sw-surface-hover);
}

.table-row td {
  padding: 12px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  vertical-align: middle;
  font-size: 0.88rem;
}

.cell-pl-info {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pl-mini-thumb {
  width: 42px;
  height: 42px;
  border-radius: var(--sw-radius-sm);
  object-fit: cover;
  flex-shrink: 0;
}

.pl-table-name {
  font-weight: 600;
  color: var(--sw-text-primary);
}

.cell-desc-text {
  color: var(--sw-text-secondary);
  font-size: 0.82rem;
}

.date-label {
  color: var(--sw-text-muted);
  font-size: 0.82rem;
}

.quick-play-row-btn {
  background: transparent;
  border: none;
  color: var(--sw-text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all var(--sw-transition-fast);
}

.table-row:hover .quick-play-row-btn {
  color: var(--sw-accent);
}

.quick-play-row-btn:hover {
  transform: scale(1.15);
}

@media (max-width: 900px) {
  .th-desc, .td-desc,
  .th-date, .td-date {
    display: none;
  }
}
</style>
