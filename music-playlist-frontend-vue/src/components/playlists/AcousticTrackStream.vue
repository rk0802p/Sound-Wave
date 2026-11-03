<template>
  <div class="sw-acoustic-stream-root">
    <!-- Stream Control & Filter Bar -->
    <div class="stream-toolbar">
      <div class="stream-filter-capsule">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          v-model="filterQuery"
          type="text"
          placeholder="Filter mixtape tracks..."
          class="stream-filter-input font-mono"
        />
        <button v-if="filterQuery" class="clear-filter-btn" @click="filterQuery = ''" aria-label="Clear filter">✕</button>
      </div>

      <div class="stream-metrics font-mono">
        <span class="metrics-count">{{ filteredSongs.length }} {{ filteredSongs.length === 1 ? 'Track' : 'Tracks' }}</span>
        <span class="metrics-divider">•</span>
        <span class="metrics-runtime">{{ formattedTotalDuration }}</span>
      </div>
    </div>

    <!-- Empty State: Zero Tracks -->
    <div v-if="songs.length === 0" class="stream-empty-atelier">
      <div class="empty-sound-ring">
        <span class="empty-icon font-display">00</span>
      </div>
      <h3 class="empty-heading font-display">No Tracks Yet</h3>
      <p class="empty-desc">
        This mixtape is currently silent. Add high-res audio URLs, YouTube videos, or Spotify links to build your track sequence.
      </p>
      <div class="empty-action-cluster">
        <button class="stream-action-btn primary font-display" @click="$emit('open-add-song')">
          <span class="btn-plus">+</span>
          <span>Add First Audio Track</span>
        </button>
      </div>
    </div>

    <!-- Empty State: Filter Returned No Match -->
    <div v-else-if="filteredSongs.length === 0" class="stream-empty-filter">
      <p class="font-mono">NO TRACKS MATCH "{{ filterQuery }}"</p>
      <button class="clear-pill font-mono" @click="filterQuery = ''">Reset Filter</button>
    </div>

    <!-- The Acoustic Sequence (Tactile Strips, Zero HTML Tables) -->
    <div v-else class="stream-sequence-list" @dragover.prevent @dragenter.prevent>
      <div
        v-for="(song, index) in filteredSongs"
        :key="song._id || index"
        class="stream-track-strip"
        :class="{
          'is-active': isCurrentTrack(song),
          'is-playing': isCurrentTrack(song) && playerStore.isPlaying,
          'is-dragging': draggedIndex === index,
          'is-drag-over': dragOverIndex === index
        }"
        draggable="true"
        @dragstart="handleDragStart(index, $event)"
        @dragover="handleDragOver(index, $event)"
        @dragleave="handleDragLeave(index)"
        @drop="handleDrop(index, $event)"
        @dragend="handleDragEnd"
      >
        <!-- Drag Handle Grip -->
        <div class="strip-drag-handle" title="Drag to reorder sequence">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
            <circle cx="9" cy="6" r="1.5" fill="currentColor"></circle>
            <circle cx="15" cy="6" r="1.5" fill="currentColor"></circle>
            <circle cx="9" cy="12" r="1.5" fill="currentColor"></circle>
            <circle cx="15" cy="12" r="1.5" fill="currentColor"></circle>
            <circle cx="9" cy="18" r="1.5" fill="currentColor"></circle>
            <circle cx="15" cy="18" r="1.5" fill="currentColor"></circle>
          </svg>
        </div>

        <!-- Dynamic Index / Play Trigger / Live Equalizer -->
        <button
          class="strip-play-badge"
          @click="handleTrackPlay(song, index)"
          :title="isCurrentTrack(song) && playerStore.isPlaying ? 'Pause' : 'Play track'"
        >
          <!-- When active & playing: Animated Equalizer -->
          <div v-if="isCurrentTrack(song) && playerStore.isPlaying" class="strip-equalizer">
            <span></span><span></span><span></span>
          </div>

          <!-- When hovered: Play/Pause Icon -->
          <div v-else class="strip-play-icon">
            <svg v-if="isCurrentTrack(song)" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 3 20 12 6 21 6 3"></polygon>
            </svg>
          </div>

          <!-- Default: Numeric Index -->
          <span class="strip-index font-mono">{{ formatIndex(index + 1) }}</span>
        </button>

        <!-- Track Title, Artist & Album -->
        <div class="strip-meta-body" @click="handleTrackPlay(song, index)">
          <div class="strip-primary-row">
            <span class="strip-title font-display">{{ song.title }}</span>
            <span
              class="strip-provider-pill font-mono"
              :class="getProviderPillClass(song)"
            >
              {{ getProviderLabel(song) }}
            </span>
          </div>
          <div class="strip-secondary-row font-mono">
            <span class="strip-artist">{{ song.artist || 'Unknown Artist' }}</span>
            <span v-if="song.album" class="strip-album">• {{ song.album }}</span>
          </div>
        </div>

        <!-- Micro-Waveform Rhythm Visualization -->
        <div class="strip-waveform-bar" aria-hidden="true">
          <span
            v-for="bar in 12"
            :key="bar"
            class="strip-wave-bar"
            :style="{
              height: `${getDeterministicHeight(song.title, bar)}px`,
              animationDelay: `${bar * 0.08}s`
            }"
          ></span>
        </div>

        <!-- Duration in JetBrains Mono -->
        <div class="strip-duration font-mono">
          {{ formatDuration(song.duration) }}
        </div>

        <!-- Context Action Dropdown -->
        <div class="strip-actions-wrapper" ref="actionsContainerRef">
          <button
            class="strip-options-btn"
            @click.stop="toggleActionMenu(index)"
            title="Track options"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <circle cx="12" cy="12" r="1.5" fill="currentColor"></circle>
              <circle cx="19" cy="12" r="1.5" fill="currentColor"></circle>
              <circle cx="5" cy="12" r="1.5" fill="currentColor"></circle>
            </svg>
          </button>

          <!-- Context Menu Popover -->
          <transition name="sw-drop">
            <div v-if="activeMenuIndex === index" class="strip-popover-menu" @click.stop>
              <button class="menu-item font-mono" @click="handleEditSong(song)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                </svg>
                <span>Edit Metadata</span>
              </button>

              <button v-if="song.url" class="menu-item font-mono" @click="copyTrackUrl(song.url)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
                </svg>
                <span>Copy Source URL</span>
              </button>

              <div class="menu-divider"></div>

              <button class="menu-item danger font-mono" @click="handleDeleteSong(song)">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <polyline points="3 6 5 6 21 6"></polyline>
                  <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                </svg>
                <span>Remove Track</span>
              </button>
            </div>
          </transition>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { usePlayerStore } from '../../stores/player';
import { useToastStore } from '../../stores/toast';
import { detectProviderType } from '../../services/providers/detector';

const props = defineProps({
  songs: {
    type: Array,
    required: true,
  },
  playlist: {
    type: Object,
    default: null,
  },
});

const emit = defineEmits([
  'open-add-song',
  'edit-song',
  'delete-song',
  'reorder-songs',
]);

const playerStore = usePlayerStore();
const toastStore = useToastStore();

const filterQuery = ref('');
const activeMenuIndex = ref(null);
const draggedIndex = ref(null);
const dragOverIndex = ref(null);

const filteredSongs = computed(() => {
  if (!filterQuery.value.trim()) return props.songs;
  const q = filterQuery.value.toLowerCase().trim();
  return props.songs.filter(
    (s) =>
      (s.title && s.title.toLowerCase().includes(q)) ||
      (s.artist && s.artist.toLowerCase().includes(q)) ||
      (s.album && s.album.toLowerCase().includes(q))
  );
});

const formattedTotalDuration = computed(() => {
  const total = props.songs.reduce((acc, s) => acc + (s.duration || 0), 0);
  if (total === 0) return '0 min';
  const m = Math.floor(total / 60);
  const s = Math.floor(total % 60);
  if (m >= 60) {
    const hrs = Math.floor(m / 60);
    const remM = m % 60;
    return `${hrs} hr ${remM} min`;
  }
  return `${m}m ${s}s`;
});

const formatIndex = (num) => (num < 10 ? `0${num}` : `${num}`);

const formatDuration = (sec) => {
  if (!sec || isNaN(sec)) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const isCurrentTrack = (song) => {
  if (!playerStore.currentTrack) return false;
  return (
    playerStore.currentTrack._id === song._id ||
    (playerStore.currentTrack.title === song.title &&
      playerStore.currentTrack.artist === song.artist)
  );
};

const getProviderLabel = (input) => {
  if (!input) return 'MP3';
  const type = typeof input === 'object'
    ? (input.source?.provider || (input.url ? detectProviderType(input.url) : 'direct'))
    : detectProviderType(input);
  if (type === 'youtube') return 'YOUTUBE';
  if (type === 'spotify') return 'SPOTIFY';
  return 'LOSSLESS';
};

const getProviderPillClass = (input) => {
  if (!input) return 'prov-direct';
  const type = typeof input === 'object'
    ? (input.source?.provider || (input.url ? detectProviderType(input.url) : 'direct'))
    : detectProviderType(input);
  return `prov-${type}`;
};

const getDeterministicHeight = (title, seed) => {
  const code = (title || 'Soundwave').charCodeAt(seed % (title || 'Soundwave').length) || 12;
  return ((code * (seed + 3)) % 14) + 4;
};

const handleTrackPlay = (song, index) => {
  if (isCurrentTrack(song)) {
    playerStore.togglePlay();
  } else {
    playerStore.playTrack(song, props.playlist, props.songs);
  }
};

const toggleActionMenu = (index) => {
  activeMenuIndex.value = activeMenuIndex.value === index ? null : index;
};

const handleEditSong = (song) => {
  activeMenuIndex.value = null;
  emit('edit-song', song);
};

const handleDeleteSong = (song) => {
  activeMenuIndex.value = null;
  emit('delete-song', song);
};

const copyTrackUrl = async (url) => {
  activeMenuIndex.value = null;
  try {
    await navigator.clipboard.writeText(url);
    toastStore.success('Source URL copied to clipboard');
  } catch (e) {
    toastStore.info('Source URL: ' + url);
  }
};

// Drag and drop reordering
const handleDragStart = (index, event) => {
  draggedIndex.value = index;
  event.dataTransfer.effectAllowed = 'move';
  event.dataTransfer.setData('text/plain', index);
};

const handleDragOver = (index, event) => {
  event.preventDefault();
  event.dataTransfer.dropEffect = 'move';
  dragOverIndex.value = index;
};

const handleDragLeave = (index) => {
  if (dragOverIndex.value === index) {
    dragOverIndex.value = null;
  }
};

const handleDrop = (dropIndex, event) => {
  event.preventDefault();
  if (draggedIndex.value === null || draggedIndex.value === dropIndex) {
    draggedIndex.value = null;
    dragOverIndex.value = null;
    return;
  }

  const reordered = [...props.songs];
  const [removed] = reordered.splice(draggedIndex.value, 1);
  reordered.splice(dropIndex, 0, removed);

  const newSongIds = reordered.map((s) => s._id);
  emit('reorder-songs', newSongIds);

  draggedIndex.value = null;
  dragOverIndex.value = null;
};

const handleDragEnd = () => {
  draggedIndex.value = null;
  dragOverIndex.value = null;
};

const handleGlobalClick = () => {
  activeMenuIndex.value = null;
};

onMounted(() => {
  window.addEventListener('click', handleGlobalClick);
});

onUnmounted(() => {
  window.removeEventListener('click', handleGlobalClick);
});
</script>

<style scoped>
.sw-acoustic-stream-root {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Toolbar */
.stream-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 18px;
  background: var(--pg-canvas);
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  box-shadow: 2px 2px 0px var(--pg-border);
}

.stream-filter-capsule {
  display: flex;
  align-items: center;
  gap: 10px;
  background: var(--pg-surface-soft);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  padding: 6px 14px;
  flex: 1;
  max-width: 380px;
}

.search-icon {
  color: var(--pg-ink-secondary);
}

.stream-filter-input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--pg-ink);
  font-size: 0.82rem;
  width: 100%;
}

.stream-filter-input::placeholder {
  color: var(--pg-ink-muted);
}

.clear-filter-btn {
  color: var(--pg-ink-muted);
  font-size: 0.75rem;
  cursor: pointer;
}

.stream-metrics {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.76rem;
  color: var(--pg-ink-secondary);
}

.metrics-count {
  font-weight: 800;
  color: var(--pg-cobalt);
}

.metrics-divider {
  opacity: 0.4;
}

.metrics-runtime {
  font-weight: 700;
}

/* Empty State */
.stream-empty-atelier {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 24px;
  text-align: center;
  background: var(--pg-surface-soft);
  border: 2px dashed var(--pg-border);
  border-radius: var(--pg-radius-xl);
}

.empty-sound-ring {
  margin-bottom: 12px;
}

.empty-icon {
  font-size: 3.5rem;
  font-weight: 800;
  color: var(--pg-ink-dim);
}

.empty-heading {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--pg-ink);
  margin-bottom: 6px;
}

.empty-desc {
  font-size: 0.88rem;
  color: var(--pg-ink-secondary);
  max-width: 440px;
  line-height: 1.5;
  margin-bottom: 20px;
}

.stream-action-btn.primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: var(--pg-radius-full);
  background: var(--pg-cobalt);
  color: #fff;
  border: 2px solid var(--pg-border);
  font-size: 0.88rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 2px 2px 0px var(--pg-border);
  transition: all var(--pg-transition-spring);
}

.stream-action-btn.primary:hover {
  background: var(--pg-coral);
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0px var(--pg-border);
}

/* Empty State: Filter Returned No Match */
.stream-empty-filter {
  padding: 40px 20px;
  text-align: center;
  background: var(--pg-surface-soft);
  border: 1.5px dashed var(--pg-border);
  border-radius: var(--pg-radius-lg);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--pg-ink);
}

.clear-pill {
  padding: 6px 14px;
  background: var(--pg-canvas);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  font-size: 0.75rem;
  cursor: pointer;
}

/* Sequence List */
.stream-sequence-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

/* Tactile Strip */
.stream-track-strip {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px;
  background: var(--pg-canvas);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-md);
  box-shadow: 2px 2px 0px var(--pg-border);
  transition: all var(--pg-transition-spring);
  user-select: none;
  position: relative;
}

.stream-track-strip:hover {
  transform: translateX(4px);
  box-shadow: 4px 4px 0px var(--pg-border);
  border-color: var(--pg-cobalt);
}

.stream-track-strip.is-active {
  background: var(--pg-surface-butter);
  border-color: var(--pg-border);
  box-shadow: 3px 3px 0px var(--pg-coral);
}

.stream-track-strip.is-playing {
  border-color: var(--pg-border);
}

.stream-track-strip.is-dragging {
  opacity: 0.35;
  border: 2px dashed var(--pg-cobalt);
}

.stream-track-strip.is-drag-over {
  border-top: 3px solid var(--pg-coral);
}

/* Drag Handle */
.strip-drag-handle {
  opacity: 0.35;
  cursor: grab;
  color: var(--pg-ink-secondary);
  transition: opacity var(--pg-transition-fast);
}

.stream-track-strip:hover .strip-drag-handle {
  opacity: 1;
}

/* Play Badge / Index */
.strip-play-badge {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: var(--pg-surface-soft);
  border: 1.5px solid var(--pg-border);
  color: var(--pg-ink);
  flex-shrink: 0;
  cursor: pointer;
  transition: all var(--pg-transition-spring);
  position: relative;
  box-shadow: 1.5px 1.5px 0px var(--pg-border);
}

.stream-track-strip:hover .strip-play-badge {
  background: var(--pg-citron);
  transform: scale(1.05);
}

.strip-play-icon {
  display: none;
}

.stream-track-strip:hover .strip-play-icon {
  display: flex;
}

.stream-track-strip:hover .strip-index {
  display: none;
}

.stream-track-strip.is-playing .strip-index {
  display: none;
}

.strip-equalizer {
  display: flex;
  align-items: flex-end;
  gap: 2.5px;
  height: 14px;
}

.strip-equalizer span {
  width: 2.5px;
  background: var(--pg-coral);
  border-radius: 1px;
  animation: eqBounce 0.6s infinite ease-in-out alternate;
}

.strip-equalizer span:nth-child(2) {
  animation-delay: 0.2s;
}

.strip-equalizer span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes eqBounce {
  0% { height: 3px; }
  100% { height: 14px; }
}

.strip-index {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--pg-ink);
}

/* Metadata Body */
.strip-meta-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: pointer;
  overflow: hidden;
}

.strip-primary-row {
  display: flex;
  align-items: center;
  gap: 10px;
  overflow: hidden;
}

.strip-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--pg-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stream-track-strip.is-active .strip-title {
  color: var(--pg-cobalt);
}

.strip-provider-pill {
  font-size: 0.62rem;
  font-weight: 800;
  letter-spacing: 0.06em;
  padding: 1px 6px;
  border-radius: var(--pg-radius-full);
  border: 1px solid var(--pg-border);
  flex-shrink: 0;
}

.strip-provider-pill.prov-direct {
  color: var(--pg-ink);
  background: var(--pg-citron);
}

.strip-provider-pill.prov-youtube {
  color: #fff;
  background: var(--pg-coral);
}

.strip-provider-pill.prov-spotify {
  color: var(--pg-ink);
  background: var(--pg-mint);
}

.strip-secondary-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.78rem;
  color: var(--pg-ink-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.strip-artist {
  font-weight: 700;
}

.strip-album {
  color: var(--pg-ink-muted);
}

/* Waveform Rhythm Graphic */
.strip-waveform-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 20px;
  opacity: 0.45;
  transition: opacity var(--pg-transition-fast);
}

.stream-track-strip:hover .strip-waveform-bar,
.stream-track-strip.is-playing .strip-waveform-bar {
  opacity: 1;
}

.strip-wave-bar {
  width: 2.5px;
  background: var(--pg-ink);
  border-radius: 1px;
}

.stream-track-strip.is-playing .strip-wave-bar {
  background: var(--pg-cobalt);
  animation: wave-jitter 0.6s ease-in-out infinite alternate;
}

@keyframes wave-jitter {
  0% { transform: scaleY(0.7); }
  100% { transform: scaleY(1.4); }
}

.strip-duration {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--pg-ink-secondary);
  width: 44px;
  text-align: right;
}

/* Actions Menu */
.strip-actions-wrapper {
  position: relative;
}

.strip-options-btn {
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--pg-ink-muted);
  border-radius: 50%;
  cursor: pointer;
  transition: all var(--pg-transition-fast);
}

.strip-options-btn:hover {
  color: var(--pg-ink);
  background: var(--pg-surface-soft);
}

.strip-popover-menu {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  width: 175px;
  background: var(--pg-canvas);
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-md);
  padding: 6px;
  box-shadow: var(--pg-shadow-solid);
  z-index: 50;
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--pg-ink);
  border-radius: var(--pg-radius-xs);
  cursor: pointer;
  transition: all var(--pg-transition-fast);
}

.menu-item:hover {
  background: var(--pg-surface-butter);
  color: var(--pg-ink);
}

.menu-item.danger {
  color: var(--pg-coral);
}

.menu-item.danger:hover {
  background: var(--pg-surface-peach);
}

.menu-divider {
  height: 1.5px;
  background: var(--pg-border);
  opacity: 0.15;
  margin: 4px 0;
}

@media (max-width: 768px) {
  .strip-waveform-bar {
    display: none;
  }
  .strip-drag-handle {
    display: none;
  }
}
</style>
