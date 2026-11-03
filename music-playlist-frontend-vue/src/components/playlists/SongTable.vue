<template>
  <div class="sw-song-table-container">
    <!-- Filter bar -->
    <div class="table-toolbar">
      <div class="filter-box">
        <svg class="search-svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          v-model="localQuery"
          type="text"
          placeholder="Filter tracks by title, artist, or album..."
          class="filter-input"
        />
        <button v-if="localQuery" class="clear-btn" @click="localQuery = ''">✕</button>
      </div>

      <div class="toolbar-stats">
        <span>{{ filteredSongs.length }} of {{ songs.length }} tracks</span>
      </div>
    </div>

    <!-- Empty State if no tracks -->
    <div v-if="songs.length === 0" class="empty-state">
      <div class="empty-icon">🎶</div>
      <h3>This playlist is quiet</h3>
      <p>Add your favorite tracks, or pick from our curated royalty-free sound catalog.</p>
      <AppButton variant="primary" size="md" @click="$emit('open-add-song')">
        + Add First Track
      </AppButton>
    </div>

    <!-- Empty Filter Results -->
    <div v-else-if="filteredSongs.length === 0" class="empty-state">
      <p>No tracks match "{{ localQuery }}"</p>
      <AppButton variant="secondary" size="sm" @click="localQuery = ''">
        Clear Filter
      </AppButton>
    </div>

    <!-- Song Table -->
    <div v-else class="table-card">
      <table class="song-table">
        <thead>
          <tr>
            <th class="th-num">#</th>
            <th class="th-title">TITLE</th>
            <th class="th-artist">ARTIST</th>
            <th class="th-album">ALBUM</th>
            <th class="th-duration">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"></circle>
                <polyline points="12 6 12 12 16 14"></polyline>
              </svg>
            </th>
            <th class="th-actions"></th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="(song, index) in filteredSongs"
            :key="song._id || index"
            class="song-row"
            :class="{
              'is-active': isCurrentTrack(song),
              'is-dragging': draggedIndex === index,
              'drag-over-top': dragOverIndex === index && dragOverPosition === 'top',
              'drag-over-bottom': dragOverIndex === index && dragOverPosition === 'bottom'
            }"
            :draggable="!localQuery"
            @dragstart="handleDragStart($event, index)"
            @dragover.prevent="handleDragOver($event, index)"
            @dragleave="handleDragLeave(index)"
            @drop="handleDrop($event, index)"
            @dragend="handleDragEnd"
          >
            <!-- # / Play on hover / Drag handle -->
            <td class="td-num">
              <div class="row-num-flex">
                <div
                  v-if="!localQuery"
                  class="drag-handle"
                  title="Drag to reorder"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="8" cy="6" r="2.2"></circle>
                    <circle cx="16" cy="6" r="2.2"></circle>
                    <circle cx="8" cy="12" r="2.2"></circle>
                    <circle cx="16" cy="12" r="2.2"></circle>
                    <circle cx="8" cy="18" r="2.2"></circle>
                    <circle cx="16" cy="18" r="2.2"></circle>
                  </svg>
                </div>

                <div class="num-container" @click="handlePlayRow(song, index)">
                  <span v-if="!isCurrentTrack(song)" class="row-index tabular-nums">{{ index + 1 }}</span>
                  <span v-else-if="playerStore.isPlaying" class="playing-bars">
                    <span></span><span></span><span></span>
                  </span>
                  <span v-else class="paused-indicator">⏸</span>

                  <button class="hover-play-btn" :title="isCurrentTrack(song) && playerStore.isPlaying ? 'Pause' : 'Play'">
                    <svg v-if="isCurrentTrack(song) && playerStore.isPlaying" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                    </svg>
                    <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M8 5v14l11-7z"/>
                    </svg>
                  </button>
                </div>
              </div>
            </td>

            <!-- Title & Thumbnail -->
            <td class="td-title" @click="handlePlayRow(song, index)">
              <div class="track-title-cell">
                <img
                  :src="getTrackArt(song, index)"
                  :alt="song.title"
                  class="song-mini-thumb"
                  @error="onImgError($event, index)"
                />
                <div class="title-info">
                  <span class="song-title-text" :class="{ 'highlight-active': isCurrentTrack(song) }">
                    {{ song.title }}
                  </span>
                  <div v-if="isExternalMedia(song.url)" class="ext-badge-row">
                    <span class="ext-pill">{{ getService(song.url) }}</span>
                    <a :href="song.url" target="_blank" rel="noopener noreferrer" class="ext-link" @click.stop>
                      Open Link ↗
                    </a>
                  </div>
                </div>
              </div>
            </td>

            <!-- Artist -->
            <td class="td-artist">
              <span class="cell-text">{{ song.artist }}</span>
            </td>

            <!-- Album -->
            <td class="td-album">
              <span class="cell-text dim">{{ song.album || '—' }}</span>
            </td>

            <!-- Duration -->
            <td class="td-duration">
              <span class="cell-text tabular-nums">{{ formatDuration(song.duration) }}</span>
            </td>

            <!-- Actions: Reorder, Edit, Delete -->
            <td class="td-actions">
              <div class="row-actions">
                <button
                  class="action-btn"
                  :disabled="index === 0 || Boolean(localQuery)"
                  @click.stop="moveSong(index, -1)"
                  title="Move Up"
                >
                  ▲
                </button>

                <button
                  class="action-btn"
                  :disabled="index === songs.length - 1 || Boolean(localQuery)"
                  @click.stop="moveSong(index, 1)"
                  title="Move Down"
                >
                  ▼
                </button>

                <button class="action-btn" @click.stop="$emit('edit-song', song)" title="Edit Track">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>

                <button class="action-btn del-btn" @click.stop="$emit('delete-song', song)" title="Remove Track">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <polyline points="3 6 5 6 21 6"></polyline>
                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                  </svg>
                </button>
              </div>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { usePlayerStore } from '../../stores/player';
import {
  formatDuration,
  isExternalMediaUrl,
  getExternalServiceName,
  getDistinctArtwork,
} from '../../data/demoTracks';
import AppButton from '../common/AppButton.vue';

const props = defineProps({
  songs: {
    type: Array,
    default: () => [],
  },
  playlistId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['open-add-song', 'edit-song', 'delete-song', 'reorder-songs']);

const playerStore = usePlayerStore();
const localQuery = ref('');

// Drag & Drop State
const draggedIndex = ref(null);
const dragOverIndex = ref(null);
const dragOverPosition = ref('bottom'); // 'top' | 'bottom'

const filteredSongs = computed(() => {
  if (!localQuery.value.trim()) return props.songs;
  const q = localQuery.value.toLowerCase().trim();
  return props.songs.filter(
    (s) =>
      s.title.toLowerCase().includes(q) ||
      s.artist.toLowerCase().includes(q) ||
      (s.album && s.album.toLowerCase().includes(q))
  );
});

const isCurrentTrack = (song) => {
  return playerStore.currentTrack && playerStore.currentTrack._id === song._id;
};

const getTrackArt = (song, idx) => {
  return getDistinctArtwork(song, idx);
};

const handlePlayRow = (song, index) => {
  if (isCurrentTrack(song)) {
    playerStore.togglePlay();
  } else {
    playerStore.playTrack(song, props.songs, index);
  }
};

const moveSong = (currentIndex, direction) => {
  const targetIndex = currentIndex + direction;
  if (targetIndex < 0 || targetIndex >= props.songs.length) return;

  const currentIds = props.songs.map((s) => s._id);
  const temp = currentIds[currentIndex];
  currentIds[currentIndex] = currentIds[targetIndex];
  currentIds[targetIndex] = temp;

  emit('reorder-songs', currentIds);
};

// HTML5 Drag and Drop handlers
const handleDragStart = (e, index) => {
  if (localQuery.value.trim()) {
    e.preventDefault();
    return;
  }
  draggedIndex.value = index;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(index));
};

const handleDragOver = (e, index) => {
  if (draggedIndex.value === null || draggedIndex.value === index) return;
  e.preventDefault();
  e.dataTransfer.dropEffect = 'move';

  const row = e.currentTarget;
  const rect = row.getBoundingClientRect();
  const midY = rect.top + rect.height / 2;
  dragOverIndex.value = index;
  dragOverPosition.value = e.clientY < midY ? 'top' : 'bottom';
};

const handleDragLeave = (index) => {
  if (dragOverIndex.value === index) {
    dragOverIndex.value = null;
  }
};

const handleDrop = (e, targetIndex) => {
  e.preventDefault();
  if (draggedIndex.value === null || draggedIndex.value === targetIndex) {
    handleDragEnd();
    return;
  }

  const fromIndex = draggedIndex.value;
  const currentSongIds = props.songs.map((s) => s._id);
  const [movedId] = currentSongIds.splice(fromIndex, 1);

  let targetInsertIndex = targetIndex;
  if (fromIndex < targetIndex) {
    targetInsertIndex = targetIndex - 1;
    if (dragOverPosition.value === 'bottom') {
      targetInsertIndex += 1;
    }
  } else {
    if (dragOverPosition.value === 'bottom') {
      targetInsertIndex += 1;
    }
  }

  targetInsertIndex = Math.max(0, Math.min(targetInsertIndex, currentSongIds.length));
  currentSongIds.splice(targetInsertIndex, 0, movedId);
  emit('reorder-songs', currentSongIds);
  handleDragEnd();
};

const handleDragEnd = () => {
  draggedIndex.value = null;
  dragOverIndex.value = null;
};

const isExternalMedia = (url) => isExternalMediaUrl(url);
const getService = (url) => getExternalServiceName(url);

const onImgError = (e, idx) => {
  e.target.src = getDistinctArtwork(null, idx + 2);
};
</script>

<style scoped>
.sw-song-table-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 40px;
}

.table-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.filter-box {
  position: relative;
  max-width: 380px;
  width: 100%;
}

.search-svg {
  position: absolute;
  left: 12px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--sw-text-muted);
  pointer-events: none;
}

.filter-input {
  width: 100%;
  height: 38px;
  padding: 0 32px 0 36px;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-sm);
  color: var(--sw-text-primary);
  font-size: 0.85rem;
  outline: none;
  transition: all var(--sw-transition-fast);
}

.filter-input:focus {
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

.toolbar-stats {
  font-size: 0.82rem;
  color: var(--sw-text-muted);
}

.empty-state {
  text-align: center;
  padding: 60px 24px;
  background: var(--sw-surface);
  border: 1px dashed var(--sw-border);
  border-radius: var(--sw-radius-md);
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 10px;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--sw-text-primary);
  margin-bottom: 6px;
}

.empty-state p {
  color: var(--sw-text-secondary);
  font-size: 0.88rem;
  margin-bottom: 20px;
}

.table-card {
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-md);
  overflow-x: auto;
}

.song-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.song-table th {
  padding: 12px 16px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--sw-text-muted);
  border-bottom: 1px solid var(--sw-border-subtle);
}

.th-num { width: 72px; text-align: center; }
.th-title { min-width: 240px; }
.th-artist { min-width: 160px; }
.th-album { min-width: 140px; }
.th-duration { width: 70px; text-align: right; }
.th-actions { width: 140px; text-align: right; }

.song-row {
  transition: background var(--sw-transition-fast);
  cursor: pointer;
}

.song-row:hover {
  background: var(--sw-surface-hover);
}

.song-row.is-active {
  background: var(--sw-accent-soft);
}

.song-row.is-dragging {
  opacity: 0.35;
  background: rgba(121, 104, 255, 0.2) !important;
}

.song-row.drag-over-top td {
  border-top: 2px solid var(--sw-accent) !important;
}

.song-row.drag-over-bottom td {
  border-bottom: 2px solid var(--sw-accent) !important;
}

.song-row td {
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  vertical-align: middle;
  font-size: 0.88rem;
}

.row-num-flex {
  display: flex;
  align-items: center;
  gap: 6px;
  justify-content: center;
}

.drag-handle {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
  color: var(--sw-text-muted);
  padding: 4px 2px;
  border-radius: 4px;
  opacity: 0.35;
  transition: opacity var(--sw-transition-fast);
}

.song-row:hover .drag-handle {
  opacity: 0.85;
  color: var(--sw-text-secondary);
}

.drag-handle:active {
  cursor: grabbing;
}

.num-container {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 26px;
  height: 26px;
}

.row-index {
  color: var(--sw-text-muted);
  font-size: 0.82rem;
}

.hover-play-btn {
  display: none;
  background: transparent;
  border: none;
  color: var(--sw-text-primary);
  cursor: pointer;
  padding: 0;
}

.song-row:hover .row-index,
.song-row:hover .playing-bars,
.song-row:hover .paused-indicator {
  display: none;
}

.song-row:hover .hover-play-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}

.playing-bars {
  display: flex;
  gap: 2px;
  height: 12px;
  align-items: flex-end;
}

.playing-bars span {
  width: 2px;
  background: var(--sw-accent);
  border-radius: 1px;
  animation: barEqualizer 0.7s infinite alternate;
}

.playing-bars span:nth-child(1) { height: 40%; }
.playing-bars span:nth-child(2) { height: 100%; animation-delay: 0.2s; }
.playing-bars span:nth-child(3) { height: 60%; animation-delay: 0.1s; }

@keyframes barEqualizer {
  0% { height: 20%; }
  100% { height: 100%; }
}

.track-title-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.song-mini-thumb {
  width: 38px;
  height: 38px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.title-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.song-title-text {
  font-weight: 500;
  color: var(--sw-text-primary);
}

.song-title-text.highlight-active {
  color: var(--sw-accent-muted);
  font-weight: 600;
}

.ext-badge-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
}

.ext-pill {
  background: var(--sw-surface-hover);
  border: 1px solid var(--sw-border-subtle);
  padding: 1px 6px;
  border-radius: 4px;
  color: var(--sw-accent-muted);
}

.ext-link {
  color: var(--sw-text-muted);
  text-decoration: underline;
}

.ext-link:hover {
  color: var(--sw-text-primary);
}

.cell-text {
  color: var(--sw-text-secondary);
  font-size: 0.85rem;
}

.cell-text.dim {
  color: var(--sw-text-muted);
}

.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
}

.action-btn {
  background: transparent;
  border: none;
  color: var(--sw-text-muted);
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: all var(--sw-transition-fast);
}

.action-btn:hover:not(:disabled) {
  background: var(--sw-surface-hover);
  color: var(--sw-text-primary);
}

.action-btn.del-btn:hover:not(:disabled) {
  color: var(--sw-danger);
  background: rgba(237, 116, 125, 0.15);
}

.action-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}
</style>
