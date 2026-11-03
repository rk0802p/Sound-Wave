<template>
  <div class="song-table-container">
    <!-- Filter bar -->
    <div class="table-toolbar">
      <div class="filter-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
      <button class="empty-action-btn" @click="$emit('open-add-song')">
        + Add First Track
      </button>
    </div>

    <!-- Empty Filter Results -->
    <div v-else-if="filteredSongs.length === 0" class="empty-state">
      <p>No tracks match "{{ localQuery }}"</p>
      <button class="reset-filter-btn" @click="localQuery = ''">Clear Filter</button>
    </div>

    <!-- Song Table -->
    <div v-else class="table-wrapper">
      <table class="song-table">
        <thead>
          <tr>
            <th class="th-num">#</th>
            <th class="th-title">TITLE</th>
            <th class="th-artist">ARTIST</th>
            <th class="th-album">ALBUM</th>
            <th class="th-duration">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
                  <span v-if="!isCurrentTrack(song)" class="row-index">{{ index + 1 }}</span>
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
            <td class="td-title">
              <div class="track-title-cell">
                <img
                  :src="song.coverImage || defaultSongCover"
                  :alt="song.title"
                  class="song-mini-thumb"
                  @error="onImgError"
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
              <span class="cell-text text-dim">{{ song.album || '—' }}</span>
            </td>

            <!-- Duration -->
            <td class="td-duration">
              <span class="cell-text tabular">{{ formatDuration(song.duration) }}</span>
            </td>

            <!-- Actions: Reorder, Edit, Delete -->
            <td class="td-actions">
              <div class="row-actions">
                <!-- Move Up -->
                <button
                  class="action-icon-btn"
                  :disabled="index === 0 || localQuery !== ''"
                  @click.stop="moveSong(index, -1)"
                  title="Move Up"
                >
                  ▲
                </button>

                <!-- Move Down -->
                <button
                  class="action-icon-btn"
                  :disabled="index === songs.length - 1 || localQuery !== ''"
                  @click.stop="moveSong(index, 1)"
                  title="Move Down"
                >
                  ▼
                </button>

                <!-- Edit -->
                <button class="action-icon-btn" @click.stop="$emit('edit-song', song)" title="Edit Track">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>

                <!-- Delete -->
                <button class="action-icon-btn del-btn" @click.stop="$emit('delete-song', song)" title="Delete Track">
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
import { formatDuration, isExternalMediaUrl, getExternalServiceName } from '../../data/demoTracks';

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
const defaultSongCover = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop';

// Drag & Drop State
const draggedIndex = ref(null);
const dragOverIndex = ref(null);
const dragOverPosition = ref('bottom'); // 'top' | 'bottom'

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

const isExternalMedia = (url) => isExternalMediaUrl(url);
const getService = (url) => getExternalServiceName(url);

const onImgError = (e) => {
  e.target.src = defaultSongCover;
};
</script>

<style scoped>
.song-table-container {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 80px;
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
  display: flex;
  align-items: center;
  width: 100%;
  max-width: 380px;
}

.filter-box svg {
  position: absolute;
  left: 12px;
  color: #6b7280;
  pointer-events: none;
}

.filter-input {
  width: 100%;
  height: 36px;
  padding: 0 32px 0 36px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  color: #fff;
  font-size: 0.85rem;
  transition: all 0.2s;
}

.filter-input:focus {
  outline: none;
  border-color: rgba(99, 102, 241, 0.5);
  background: rgba(255, 255, 255, 0.06);
}

.clear-btn {
  position: absolute;
  right: 10px;
  background: transparent;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 0.8rem;
}

.toolbar-stats {
  font-size: 0.85rem;
  color: #6b7280;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 16px;
  border: 1px dashed rgba(255, 255, 255, 0.08);
}

.empty-icon {
  font-size: 2.5rem;
  margin-bottom: 12px;
}

.empty-state h3 {
  font-size: 1.25rem;
  color: #fff;
  margin: 0 0 8px 0;
}

.empty-state p {
  color: #9ca3af;
  font-size: 0.9rem;
  margin: 0 0 20px 0;
}

.empty-action-btn {
  padding: 10px 22px;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.empty-action-btn:hover {
  transform: translateY(-2px);
  background: #4f46e5;
}

.reset-filter-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 6px 14px;
  border-radius: 6px;
  cursor: pointer;
}

/* Table styles */
.table-wrapper {
  overflow-x: auto;
}

.song-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.song-table th {
  padding: 12px 14px;
  font-size: 0.72rem;
  letter-spacing: 1px;
  font-weight: 700;
  color: #6b7280;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.th-num { width: 72px; text-align: center; }
.th-title { min-width: 220px; }
.th-artist { min-width: 150px; }
.th-album { min-width: 140px; }
.th-duration { width: 70px; text-align: right; }
.th-actions { width: 140px; text-align: right; }

.song-row {
  border-radius: 8px;
  transition: background 0.15s ease, border-color 0.15s ease;
  cursor: pointer;
}

.song-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.song-row.is-active {
  background: rgba(118, 107, 255, 0.1);
}

.song-row.is-dragging {
  opacity: 0.3;
  background: rgba(118, 107, 255, 0.15) !important;
}

.song-row.drag-over-top td {
  border-top: 2px solid #766bff !important;
}

.song-row.drag-over-bottom td {
  border-bottom: 2px solid #766bff !important;
}

.song-row td {
  padding: 10px 14px;
  vertical-align: middle;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
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
  color: #6b7280;
  padding: 4px 2px;
  border-radius: 4px;
  opacity: 0.35;
  transition: opacity 0.15s, color 0.15s;
}

.song-row:hover .drag-handle {
  opacity: 0.85;
  color: #a1a1aa;
}

.drag-handle:hover {
  opacity: 1;
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.drag-handle:active {
  cursor: grabbing;
}

/* Row Num / Play */
.num-container {
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  width: 28px;
  height: 28px;
  margin: 0 auto;
}

.row-index {
  color: #6b7280;
  font-size: 0.85rem;
  font-variant-numeric: tabular-nums;
}

.hover-play-btn {
  display: none;
  background: transparent;
  border: none;
  color: #fff;
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
  background: #6366f1;
  border-radius: 1px;
  animation: barAnim 0.7s infinite alternate;
}

.playing-bars span:nth-child(1) { height: 40%; }
.playing-bars span:nth-child(2) { height: 100%; animation-delay: 0.2s; }
.playing-bars span:nth-child(3) { height: 60%; animation-delay: 0.1s; }

@keyframes barAnim {
  from { height: 20%; }
  to { height: 100%; }
}

.paused-indicator {
  font-size: 0.75rem;
  color: #6366f1;
}

/* Title cell */
.track-title-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.song-mini-thumb {
  width: 42px;
  height: 42px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.title-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.song-title-text {
  font-size: 0.92rem;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-title-text.highlight-active {
  color: #818cf8;
}

.ext-badge-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ext-pill {
  font-size: 0.65rem;
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  padding: 1px 5px;
  border-radius: 4px;
}

.ext-link {
  font-size: 0.7rem;
  color: #9ca3af;
  text-decoration: underline;
}

.ext-link:hover {
  color: #fff;
}

.cell-text {
  font-size: 0.88rem;
  color: #d1d5db;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.text-dim {
  color: #6b7280;
}

.tabular {
  font-variant-numeric: tabular-nums;
  display: block;
  text-align: right;
}

/* Actions */
.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  opacity: 0.5;
  transition: opacity 0.2s;
}

.song-row:hover .row-actions {
  opacity: 1;
}

.action-icon-btn {
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 5px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  font-size: 0.75rem;
  transition: all 0.15s;
}

.action-icon-btn:hover:not(:disabled) {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.action-icon-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

.del-btn:hover:not(:disabled) {
  color: #f87171;
  background: rgba(248, 113, 113, 0.15);
}
</style>
