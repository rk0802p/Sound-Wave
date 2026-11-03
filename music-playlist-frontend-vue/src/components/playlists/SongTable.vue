<template>
  <div class="sw-song-table-container">
    <!-- Filter Bar & Table Toolbar -->
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
        <button v-if="localQuery" class="clear-btn" @click="localQuery = ''" aria-label="Clear filter">✕</button>
      </div>

      <div class="toolbar-stats font-mono">
        <span>{{ filteredSongs.length }} of {{ songs.length }} tracks</span>
      </div>
    </div>

    <!-- Empty State: No Tracks in Playlist -->
    <div v-if="songs.length === 0" class="empty-state-console">
      <div class="empty-console-icon">
        <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
          <path d="M9 18V5l12-2v13"></path>
          <circle cx="6" cy="18" r="3"></circle>
          <circle cx="18" cy="16" r="3"></circle>
        </svg>
      </div>
      <h3 class="font-display">This playlist is silent.</h3>
      <p>Add your personal favorite tracks, Spotify/YouTube links, or choose from our verified sound catalog.</p>
      <AppButton variant="primary" size="md" @click="$emit('open-add-song')">
        <template #icon-left>+</template>
        Add First Track
      </AppButton>
    </div>

    <!-- Empty State: No Filter Results -->
    <div v-else-if="filteredSongs.length === 0" class="empty-state-console">
      <h3 class="font-display">No tracks match "{{ localQuery }}"</h3>
      <p>Try clearing your filter or searching for another term.</p>
      <AppButton variant="secondary" size="sm" @click="localQuery = ''">
        Clear Filter
      </AppButton>
    </div>

    <!-- Song Table Card -->
    <div v-else class="table-card">
      <table class="song-table">
        <thead>
          <tr>
            <th class="th-num font-mono">#</th>
            <th class="th-title font-mono">TRACK</th>
            <th class="th-artist font-mono">ARTIST</th>
            <th class="th-album font-mono">ALBUM</th>
            <th class="th-duration font-mono">
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
                  title="Drag to reorder position"
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="8" cy="6" r="2"></circle>
                    <circle cx="16" cy="6" r="2"></circle>
                    <circle cx="8" cy="12" r="2"></circle>
                    <circle cx="16" cy="12" r="2"></circle>
                    <circle cx="8" cy="18" r="2"></circle>
                    <circle cx="16" cy="18" r="2"></circle>
                  </svg>
                </div>

                <div class="num-container" @click="handlePlayRow(song, index)">
                  <span v-if="!isCurrentTrack(song)" class="row-index tabular-nums font-mono">{{ index + 1 }}</span>
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

            <!-- Title & Cover Thumbnail -->
            <td class="td-title" @click="handlePlayRow(song, index)">
              <div class="track-title-cell">
                <ArtworkCover
                  :src="song.coverImage"
                  :alt="song.title"
                  size="xs"
                  :isPlaying="isCurrentTrack(song) && playerStore.isPlaying"
                  :fallbackSeed="song.title"
                />
                <div class="title-info">
                  <span class="song-title-text font-display" :class="{ 'highlight-active': isCurrentTrack(song) }">
                    {{ song.title }}
                  </span>
                  <div class="provider-pill-row">
                    <span class="track-provider-pill" :class="getProviderPillClass(song.url)">
                      {{ getServiceName(song.url) }}
                    </span>
                    <a
                      v-if="isExternal(song.url)"
                      :href="song.url"
                      target="_blank"
                      rel="noopener noreferrer"
                      class="ext-link"
                      @click.stop
                    >
                      Source ↗
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
              <span class="cell-text tabular-nums font-mono">{{ formatDuration(song.duration) }}</span>
            </td>

            <!-- Actions: Move Up, Move Down, Edit, Delete -->
            <td class="td-actions">
              <div class="row-actions">
                <button
                  class="action-btn"
                  :disabled="index === 0 || Boolean(localQuery)"
                  @click.stop="moveSong(index, -1)"
                  title="Move Up"
                  aria-label="Move Track Up"
                >
                  ▲
                </button>

                <button
                  class="action-btn"
                  :disabled="index === songs.length - 1 || Boolean(localQuery)"
                  @click.stop="moveSong(index, 1)"
                  title="Move Down"
                  aria-label="Move Track Down"
                >
                  ▼
                </button>

                <button
                  class="action-btn"
                  @click.stop="$emit('edit-song', song)"
                  title="Edit Track"
                  aria-label="Edit Track"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </button>

                <button
                  class="action-btn del-btn"
                  @click.stop="$emit('delete-song', song)"
                  title="Remove Track"
                  aria-label="Remove Track"
                >
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
import { detectProviderType } from '../../services/providers/detector';
import ArtworkCover from '../common/ArtworkCover.vue';
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
const dragOverPosition = ref('bottom');

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

const isExternal = (url) => isExternalMediaUrl(url);

const getServiceName = (url) => {
  const type = detectProviderType(url);
  if (type === 'youtube') return 'YouTube';
  if (type === 'spotify') return 'Spotify';
  if (type === 'direct') return 'FLAC/MP3';
  return getExternalServiceName(url);
};

const getProviderPillClass = (url) => {
  const type = detectProviderType(url);
  if (type === 'youtube') return 'pill-yt';
  if (type === 'spotify') return 'pill-sp';
  return 'pill-flac';
};

const handlePlayRow = (song, index) => {
  if (isCurrentTrack(song)) {
    playerStore.togglePlay();
  } else {
    playerStore.playTrack(song, props.songs, index, props.playlistId);
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
}

.filter-box {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-md);
  padding: 8px 14px;
  width: 100%;
  max-width: 400px;
  transition: all var(--sw-transition-fast);
}

.filter-box:focus-within {
  border-color: var(--sw-accent);
  background: var(--sw-surface-hover);
}

.search-svg {
  color: var(--sw-text-muted);
}

.filter-input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--sw-text-primary);
  font-size: 0.84rem;
  width: 100%;
}

.clear-btn {
  color: var(--sw-text-muted);
  cursor: pointer;
  font-size: 0.8rem;
}

.toolbar-stats {
  font-size: 0.74rem;
  color: var(--sw-text-muted);
}

/* Empty State */
.empty-state-console {
  text-align: center;
  padding: 56px 24px;
  background: var(--sw-surface);
  border: 1px dashed var(--sw-border);
  border-radius: var(--sw-radius-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.empty-console-icon {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sw-accent);
  margin-bottom: 4px;
}

.empty-state-console h3 {
  font-size: 1.3rem;
  color: var(--sw-text-primary);
}

.empty-state-console p {
  font-size: 0.88rem;
  color: var(--sw-text-secondary);
  max-width: 440px;
  line-height: 1.5;
  margin-bottom: 12px;
}

/* Table Card */
.table-card {
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-xl);
  overflow-x: auto;
}

.song-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.song-table th {
  padding: 12px 18px;
  font-size: 0.68rem;
  color: var(--sw-text-muted);
  border-bottom: 1px solid var(--sw-border);
  letter-spacing: 0.08em;
}

.song-row {
  border-bottom: 1px solid var(--sw-border-subtle);
  transition: background var(--sw-transition-fast);
  cursor: default;
  position: relative;
}

.song-row:hover {
  background: var(--sw-surface-hover);
}

.song-row.is-active {
  background: rgba(56, 189, 248, 0.06);
}

.song-row.is-dragging {
  opacity: 0.4;
}

.song-row.drag-over-top {
  border-top: 2px solid var(--sw-accent);
}

.song-row.drag-over-bottom {
  border-bottom: 2px solid var(--sw-accent);
}

.song-table td {
  padding: 10px 18px;
  font-size: 0.84rem;
  color: var(--sw-text-secondary);
}

/* # / Play Button Container */
.row-num-flex {
  display: flex;
  align-items: center;
  gap: 8px;
}

.drag-handle {
  cursor: grab;
  color: var(--sw-text-muted);
  opacity: 0;
  transition: opacity var(--sw-transition-fast);
}

.song-row:hover .drag-handle {
  opacity: 1;
}

.num-container {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
}

.row-index {
  font-size: 0.78rem;
  color: var(--sw-text-muted);
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
}

.playing-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
}

.playing-bars span {
  width: 2px;
  background: var(--sw-accent);
  border-radius: 1px;
  animation: eqBounce 0.8s ease-in-out infinite alternate;
}

.playing-bars span:nth-child(1) { height: 40%; animation-delay: 0.1s; }
.playing-bars span:nth-child(2) { height: 100%; animation-delay: 0.3s; }
.playing-bars span:nth-child(3) { height: 60%; animation-delay: 0.2s; }

@keyframes eqBounce {
  0% { height: 20%; }
  100% { height: 100%; }
}

.paused-indicator {
  font-size: 0.75rem;
  color: var(--sw-accent);
}

/* Track Title & Cell */
.track-title-cell {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
}

.title-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.song-title-text {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--sw-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song-title-text.highlight-active {
  color: var(--sw-accent);
}

.provider-pill-row {
  display: flex;
  align-items: center;
  gap: 6px;
}

.track-provider-pill {
  font-family: var(--sw-font-mono);
  font-size: 0.6rem;
  font-weight: 700;
  padding: 1px 5px;
  border-radius: 3px;
  text-transform: uppercase;
}

.pill-flac {
  background: rgba(56, 189, 248, 0.1);
  color: var(--sw-accent);
}

.pill-yt {
  background: rgba(244, 63, 94, 0.1);
  color: #fb7185;
}

.pill-sp {
  background: rgba(16, 185, 129, 0.1);
  color: #34d399;
}

.ext-link {
  font-size: 0.65rem;
  color: var(--sw-text-muted);
  text-decoration: underline;
}

.ext-link:hover {
  color: var(--sw-text-primary);
}

.cell-text {
  font-size: 0.84rem;
}

.cell-text.dim {
  color: var(--sw-text-muted);
}

/* Actions */
.row-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  opacity: 0;
  transition: opacity var(--sw-transition-fast);
}

.song-row:hover .row-actions {
  opacity: 1;
}

.action-btn {
  background: transparent;
  border: none;
  color: var(--sw-text-muted);
  padding: 4px 6px;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  transition: all var(--sw-transition-fast);
}

.action-btn:hover:not(:disabled) {
  color: var(--sw-text-primary);
  background: var(--sw-surface-active);
}

.action-btn.del-btn:hover {
  color: var(--sw-danger);
  background: rgba(244, 63, 94, 0.12);
}

.action-btn:disabled {
  opacity: 0.2;
  cursor: not-allowed;
}

@media (max-width: 768px) {
  .th-album, .td-album {
    display: none;
  }
  .row-actions {
    opacity: 1;
  }
}
</style>
