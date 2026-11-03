<template>
  <div class="library-view-wrapper">
    <!-- Header -->
    <header class="library-header">
      <div class="header-content">
        <span class="view-tag">COLLECTION</span>
        <h1 class="library-title">Your Library</h1>
        <p class="library-subtitle">Everything you've collected and curated.</p>
      </div>

      <div class="header-actions">
        <button class="primary-btn" @click="showCreateModal = true">
          <span class="plus-icon">+</span>
          <span>New Playlist</span>
        </button>
      </div>
    </header>

    <!-- Controls Toolbar: Search, Sort, View Toggle -->
    <div class="library-toolbar">
      <!-- Search Input -->
      <div class="search-input-wrapper">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Search by name or description..."
          class="search-field"
        />
        <button v-if="searchQuery" class="clear-search-btn" @click="searchQuery = ''">✕</button>
      </div>

      <!-- Controls Right: Sort & Grid/List Toggle -->
      <div class="toolbar-controls-right">
        <!-- Sort Dropdown -->
        <div class="sort-selector">
          <label class="sort-label">Sort by</label>
          <select v-model="sortBy" class="sort-select">
            <option value="updated">Recently Updated</option>
            <option value="created">Recently Created</option>
            <option value="name">Name (A–Z)</option>
            <option value="tracks">Track Count</option>
          </select>
        </div>

        <!-- View Mode Toggle -->
        <div class="view-toggle-group">
          <button
            class="toggle-btn"
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
            class="toggle-btn"
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

    <!-- Loading Skeleton -->
    <div v-if="playlistStore.isLoading && !playlistStore.playlists.length" class="skeleton-grid">
      <div v-for="i in 8" :key="i" class="skeleton-card">
        <div class="skeleton-art"></div>
        <div class="skeleton-text w-70"></div>
        <div class="skeleton-text w-40"></div>
      </div>
    </div>

    <!-- Empty State (No Playlists) -->
    <div v-else-if="playlistStore.playlists.length === 0" class="empty-library-state">
      <div class="empty-icon-box">📁</div>
      <h2>Your library starts here.</h2>
      <p>Create a playlist and give your music a place to live.</p>
      <div class="empty-actions">
        <button class="primary-btn" @click="showCreateModal = true">
          + Create Playlist
        </button>
      </div>
    </div>

    <!-- Empty Filter Results -->
    <div v-else-if="filteredAndSortedPlaylists.length === 0" class="empty-filter-state">
      <div class="filter-empty-icon">🔍</div>
      <p>No playlists found matching "{{ searchQuery }}"</p>
      <button class="ghost-btn" @click="searchQuery = ''">Clear Search</button>
    </div>

    <!-- GRID VIEW -->
    <div v-else-if="viewMode === 'grid'" class="playlist-grid">
      <div
        v-for="playlist in filteredAndSortedPlaylists"
        :key="playlist._id"
        class="library-card"
        @click="goToPlaylist(playlist._id)"
      >
        <div class="card-art-container">
          <img
            :src="playlist.coverImage || defaultCover"
            :alt="playlist.name"
            class="card-art"
            @error="onImgError"
          />
          <button
            class="play-overlay-btn"
            :disabled="!playlist.songs?.length"
            @click.stop="quickPlay(playlist)"
            title="Play Playlist"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        </div>

        <div class="card-body">
          <h3 class="card-name" :title="playlist.name">{{ playlist.name }}</h3>
          <p v-if="playlist.description" class="card-description">
            {{ playlist.description }}
          </p>
          <div class="card-footer">
            <span class="track-count">{{ playlist.songs?.length || 0 }} tracks</span>
            <span v-if="playlist.totalDuration" class="dot-sep">•</span>
            <span v-if="playlist.totalDuration" class="total-duration">
              {{ formatDuration(playlist.totalDuration) }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- LIST VIEW -->
    <div v-else class="list-view-container">
      <table class="playlist-table">
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
            v-for="playlist in filteredAndSortedPlaylists"
            :key="playlist._id"
            class="playlist-row"
            @click="goToPlaylist(playlist._id)"
          >
            <td class="td-pl">
              <div class="pl-cell">
                <img
                  :src="playlist.coverImage || defaultCover"
                  :alt="playlist.name"
                  class="pl-cell-art"
                  @error="onImgError"
                />
                <div class="pl-name-wrap">
                  <span class="pl-name">{{ playlist.name }}</span>
                </div>
              </div>
            </td>

            <td class="td-desc">
              <span class="pl-desc-text">{{ playlist.description || '—' }}</span>
            </td>

            <td class="td-count">
              <span class="tabular-nums">{{ playlist.songs?.length || 0 }}</span>
            </td>

            <td class="td-dur">
              <span class="tabular-nums">{{ formatDuration(calculateDuration(playlist.songs)) }}</span>
            </td>

            <td class="td-date">
              <span class="date-text">{{ formatDate(playlist.updatedAt || playlist.createdAt) }}</span>
            </td>

            <td class="td-act" @click.stop>
              <button
                class="row-play-btn"
                :disabled="!playlist.songs?.length"
                @click="quickPlay(playlist)"
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
import { formatDuration } from '../data/demoTracks';
import CreatePlaylistModal from '../components/playlists/CreatePlaylistModal.vue';

const router = useRouter();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();

const searchQuery = ref('');
const sortBy = ref('updated');
const viewMode = ref('grid');
const showCreateModal = ref(false);

const defaultCover = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400&auto=format&fit=crop';

const filteredAndSortedPlaylists = computed(() => {
  let list = [...playlistStore.playlists];

  // Search filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }

  // Sort
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
    // Default 'updated'
    return new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0);
  });

  return list;
});

const goToPlaylist = (id) => {
  router.push(`/playlists/${id}`);
};

const quickPlay = (playlist) => {
  if (playlist.songs && playlist.songs.length > 0) {
    playerStore.playTrack(playlist.songs[0], playlist.songs, 0);
  }
};

const calculateDuration = (songs) => {
  if (!songs || !songs.length) return 0;
  return songs.reduce((acc, s) => acc + (s.duration || 0), 0);
};

const formatDate = (dateString) => {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '—';
  }
};

const onImgError = (e) => {
  e.target.src = defaultCover;
};
</script>

<style scoped>
.library-view-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* Header */
.library-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
}

.view-tag {
  font-size: 0.75rem;
  letter-spacing: 1.5px;
  color: var(--accent-primary, #766BFF);
  font-weight: 700;
  margin-bottom: 6px;
  display: inline-block;
}

.library-title {
  font-size: 2.25rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: var(--text-primary, #F4F3FA);
  margin-bottom: 6px;
}

.library-subtitle {
  font-size: 0.95rem;
  color: var(--text-secondary, #A1A1AA);
}

.primary-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  background: var(--accent-primary, #766BFF);
  color: #fff;
  border: none;
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.15s ease, transform 0.15s ease;
}

.primary-btn:hover {
  background: var(--accent-hover, #887EFF);
  transform: translateY(-1px);
}

.plus-icon {
  font-size: 1.2rem;
  line-height: 1;
}

/* Toolbar */
.library-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-default, #25252F);
}

.search-input-wrapper {
  position: relative;
  flex: 1;
  max-width: 360px;
  min-width: 220px;
}

.search-icon {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted, #71717A);
  pointer-events: none;
}

.search-field {
  width: 100%;
  padding: 9px 34px 9px 36px;
  background: var(--bg-surface, #101117);
  border: 1px solid var(--border-default, #25252F);
  border-radius: 10px;
  color: var(--text-primary, #F4F3FA);
  font-size: 0.88rem;
  outline: none;
  transition: border-color 0.15s;
}

.search-field:focus {
  border-color: var(--accent-primary, #766BFF);
}

.clear-search-btn {
  position: absolute;
  right: 10px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--text-muted, #71717A);
  cursor: pointer;
  font-size: 0.8rem;
}

.toolbar-controls-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.sort-selector {
  display: flex;
  align-items: center;
  gap: 8px;
}

.sort-label {
  font-size: 0.82rem;
  color: var(--text-muted, #71717A);
}

.sort-select {
  background: var(--bg-surface, #101117);
  border: 1px solid var(--border-default, #25252F);
  border-radius: 8px;
  color: var(--text-primary, #F4F3FA);
  font-size: 0.85rem;
  padding: 6px 12px;
  outline: none;
  cursor: pointer;
}

.view-toggle-group {
  display: flex;
  align-items: center;
  background: var(--bg-surface, #101117);
  border: 1px solid var(--border-default, #25252F);
  border-radius: 8px;
  padding: 2px;
}

.toggle-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 6px 10px;
  background: transparent;
  border: none;
  color: var(--text-muted, #71717A);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.15s;
}

.toggle-btn.active {
  background: var(--bg-hover, #24242F);
  color: var(--text-primary, #F4F3FA);
}

/* Skeletons */
.skeleton-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 22px;
}

.skeleton-card {
  background: var(--bg-surface, #101117);
  border-radius: 14px;
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-art {
  width: 100%;
  aspect-ratio: 1;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 10px;
  animation: pulse 1.4s infinite;
}

.skeleton-text {
  height: 14px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  animation: pulse 1.4s infinite;
}

.w-70 { width: 70%; }
.w-40 { width: 40%; }

@keyframes pulse {
  0%, 100% { opacity: 0.5; }
  50% { opacity: 0.8; }
}

/* Empty States */
.empty-library-state,
.empty-filter-state {
  text-align: center;
  padding: 70px 24px;
  background: var(--bg-surface, #101117);
  border: 1px dashed var(--border-default, #25252F);
  border-radius: 16px;
}

.empty-icon-box,
.filter-empty-icon {
  font-size: 2.8rem;
  margin-bottom: 14px;
}

.empty-library-state h2 {
  font-size: 1.4rem;
  font-weight: 700;
  margin-bottom: 8px;
}

.empty-library-state p,
.empty-filter-state p {
  color: var(--text-secondary, #A1A1AA);
  margin-bottom: 22px;
}

.ghost-btn {
  padding: 8px 18px;
  background: transparent;
  border: 1px solid var(--border-default, #25252F);
  color: var(--text-primary, #F4F3FA);
  border-radius: 8px;
  cursor: pointer;
}

/* Grid View */
.playlist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 22px;
}

.library-card {
  background: var(--bg-surface, #101117);
  border: 1px solid var(--border-default, #25252F);
  border-radius: 14px;
  padding: 16px;
  cursor: pointer;
  transition: transform 0.2s ease, border-color 0.2s ease, background 0.2s ease;
  display: flex;
  flex-direction: column;
}

.library-card:hover {
  transform: translateY(-4px);
  border-color: rgba(118, 107, 255, 0.4);
  background: var(--bg-elevated, #191922);
}

.card-art-container {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 10px;
  overflow: hidden;
  margin-bottom: 14px;
  background: #000;
}

.card-art {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.library-card:hover .card-art {
  transform: scale(1.04);
}

.play-overlay-btn {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--accent-primary, #766BFF);
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transform: translateY(8px);
  transition: all 0.2s ease;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.5);
}

.library-card:hover .play-overlay-btn {
  opacity: 1;
  transform: translateY(0);
}

.play-overlay-btn:hover {
  background: var(--accent-hover, #887EFF);
  transform: scale(1.08) translateY(0);
}

.card-body {
  display: flex;
  flex-direction: column;
  gap: 6px;
  flex: 1;
}

.card-name {
  font-size: 1rem;
  font-weight: 700;
  color: var(--text-primary, #F4F3FA);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-description {
  font-size: 0.82rem;
  color: var(--text-secondary, #A1A1AA);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  min-height: 2.3em;
}

.card-footer {
  margin-top: auto;
  padding-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: var(--text-muted, #71717A);
}

.dot-sep {
  opacity: 0.5;
}

/* List View */
.list-view-container {
  background: var(--bg-surface, #101117);
  border: 1px solid var(--border-default, #25252F);
  border-radius: 14px;
  overflow-x: auto;
}

.playlist-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.playlist-table th {
  padding: 14px 18px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--text-muted, #71717A);
  border-bottom: 1px solid var(--border-default, #25252F);
}

.th-pl { min-width: 240px; }
.th-desc { min-width: 220px; }
.th-count { width: 100px; }
.th-dur { width: 100px; }
.th-date { width: 140px; }
.th-act { width: 60px; text-align: right; }

.playlist-row {
  cursor: pointer;
  transition: background 0.15s;
}

.playlist-row:hover {
  background: var(--bg-hover, #24242F);
}

.playlist-row td {
  padding: 12px 18px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  vertical-align: middle;
  font-size: 0.88rem;
}

.pl-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.pl-cell-art {
  width: 44px;
  height: 44px;
  border-radius: 8px;
  object-fit: cover;
}

.pl-name {
  font-weight: 600;
  color: var(--text-primary, #F4F3FA);
}

.pl-desc-text {
  color: var(--text-secondary, #A1A1AA);
  font-size: 0.82rem;
}

.date-text {
  color: var(--text-muted, #71717A);
  font-size: 0.82rem;
}

.row-play-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary, #A1A1AA);
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;
}

.playlist-row:hover .row-play-btn {
  color: var(--accent-primary, #766BFF);
}

.row-play-btn:hover {
  transform: scale(1.15);
}

@media (max-width: 900px) {
  .th-desc, .td-desc,
  .th-date, .td-date {
    display: none;
  }
}
</style>
