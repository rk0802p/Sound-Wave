<template>
  <div class="sw-acoustic-stream-root">
    <!-- Stream Control & Filter Bar -->
    <div class="stream-toolbar">
      <div class="stream-filter-capsule">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          v-model="filterQuery"
          type="text"
          placeholder="Filter acoustic sequence..."
          class="stream-filter-input font-mono"
        />
        <button v-if="filterQuery" class="clear-filter-btn" @click="filterQuery = ''" aria-label="Clear filter">✕</button>
      </div>

      <div class="stream-metrics font-mono">
        <span class="metrics-count">{{ filteredSongs.length }} {{ filteredSongs.length === 1 ? 'Frequency' : 'Frequencies' }}</span>
        <span class="metrics-divider">•</span>
        <span class="metrics-runtime">{{ formattedTotalDuration }}</span>
      </div>
    </div>

    <!-- Empty State: Zero Tracks -->
    <div v-if="songs.length === 0" class="stream-empty-atelier">
      <div class="empty-sound-ring">
        <div class="ring ring-1"></div>
        <div class="ring ring-2"></div>
        <div class="ring ring-3"></div>
        <span class="empty-icon font-mono">∅</span>
      </div>
      <h3 class="empty-heading font-display">Acoustic Void</h3>
      <p class="empty-desc">
        This atelier holds no frequencies yet. Inject high-res audio URLs, YouTube videos, Spotify links, or load verified master tracks.
      </p>
      <div class="empty-action-cluster">
        <button class="stream-action-btn primary" @click="$emit('open-add-song')">
          <span class="btn-plus">+</span>
          <span>Inject First Frequency</span>
        </button>
      </div>
    </div>

    <!-- Empty State: Filter Returned No Match -->
    <div v-else-if="filteredSongs.length === 0" class="stream-empty-filter">
      <p class="font-mono">NO FREQUENCIES MATCH "{{ filterQuery }}"</p>
      <button class="clear-pill font-mono" @click="filterQuery = ''">Reset Sequence</button>
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
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
          :title="isCurrentTrack(song) && playerStore.isPlaying ? 'Pause' : 'Play frequency'"
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
              :class="getProviderPillClass(song.url)"
            >
              {{ getProviderLabel(song.url) }}
            </span>
          </div>
          <div class="strip-secondary-row font-mono">
            <span class="strip-artist">{{ song.artist || 'Unknown Resonance' }}</span>
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
            title="Frequency actions"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
                <span>Remove Frequency</span>
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

const getProviderLabel = (url) => {
  if (!url) return 'MP3';
  const type = detectProviderType(url);
  if (type === 'youtube') return 'YOUTUBE';
  if (type === 'spotify') return 'SPOTIFY';
  return 'LOSSLESS';
};

const getProviderPillClass = (url) => {
  if (!url) return 'prov-direct';
  const type = detectProviderType(url);
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

  // Construct new order of song IDs
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
  padding: 12px 18px;
  background: rgba(13, 16, 23, 0.45);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--sw-radius-lg);
}

.stream-filter-capsule {
  display: flex;
  align-items: center;
  gap: 10px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--sw-radius-full);
  padding: 6px 14px;
  flex: 1;
  max-width: 360px;
}

.search-icon {
  color: var(--sw-text-muted);
}

.stream-filter-input {
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 12px;
  width: 100%;
}

.stream-filter-input::placeholder {
  color: var(--sw-text-muted);
}

.clear-filter-btn {
  color: var(--sw-text-muted);
  font-size: 12px;
  cursor: pointer;
}

.stream-metrics {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
  color: var(--sw-text-secondary);
}

.metrics-count {
  color: var(--sw-accent);
}

.metrics-divider {
  opacity: 0.4;
}

/* Empty State */
.stream-empty-atelier {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
  background: rgba(13, 16, 23, 0.35);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: var(--sw-radius-xl);
}

.empty-sound-ring {
  position: relative;
  width: 72px;
  height: 72px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 20px;
}

.ring {
  position: absolute;
  border-radius: 50%;
  border: 1px solid var(--sw-accent);
  opacity: 0.2;
}

.ring-1 { inset: 0; animation: pulse-ring 3s ease-out infinite; }
.ring-2 { inset: 8px; animation: pulse-ring 3s ease-out infinite 0.8s; }
.ring-3 { inset: 16px; animation: pulse-ring 3s ease-out infinite 1.6s; }

@keyframes pulse-ring {
  0% { transform: scale(0.9); opacity: 0.4; }
  100% { transform: scale(1.3); opacity: 0; }
}

.empty-icon {
  font-size: 24px;
  color: var(--sw-accent);
}

.empty-heading {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 14px;
  color: var(--sw-text-secondary);
  max-width: 440px;
  line-height: 1.6;
  margin-bottom: 24px;
}

.stream-action-btn.primary {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 22px;
  border-radius: var(--sw-radius-full);
  background: linear-gradient(135deg, var(--sw-accent), #0284c7);
  color: #060709;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 0 24px rgba(56, 189, 248, 0.4);
  transition: transform var(--sw-transition-fast);
}

.stream-action-btn.primary:hover {
  transform: translateY(-2px);
}

/* Sequence List */
.stream-sequence-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

/* Tactile Acoustic Strip */
.stream-track-strip {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 16px;
  background: rgba(13, 16, 23, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: var(--sw-radius-md);
  transition: all var(--sw-transition-fast);
  user-select: none;
  position: relative;
}

.stream-track-strip:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateX(4px);
}

.stream-track-strip.is-active {
  background: rgba(56, 189, 248, 0.08);
  border-color: rgba(56, 189, 248, 0.35);
  box-shadow: inset 0 0 20px rgba(56, 189, 248, 0.05);
}

.stream-track-strip.is-playing {
  border-color: var(--sw-accent);
  box-shadow: 0 0 24px -4px rgba(56, 189, 248, 0.25);
}

.stream-track-strip.is-dragging {
  opacity: 0.4;
  border: 1px dashed var(--sw-accent);
}

.stream-track-strip.is-drag-over {
  border-top: 2px solid var(--sw-accent);
}

/* Drag Handle */
.strip-drag-handle {
  opacity: 0.3;
  cursor: grab;
  color: var(--sw-text-muted);
  transition: opacity var(--sw-transition-fast);
}

.stream-track-strip:hover .strip-drag-handle {
  opacity: 0.9;
}

/* Play Badge / Index */
.strip-play-badge {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.04);
  color: var(--sw-text-secondary);
  flex-shrink: 0;
  cursor: pointer;
  transition: all var(--sw-transition-fast);
  position: relative;
}

.strip-play-icon {
  display: none;
}

.stream-track-strip:hover .strip-index {
  display: none;
}

.stream-track-strip:hover .strip-play-icon {
  display: flex;
  color: #fff;
}

.stream-track-strip:hover .strip-play-badge {
  background: var(--sw-accent);
  color: #060709;
}

.strip-equalizer {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
}

.strip-equalizer span {
  width: 3px;
  background: var(--sw-accent);
  border-radius: 1px;
  animation: eq-bounce 0.8s ease-in-out infinite alternate;
}

.strip-equalizer span:nth-child(1) { height: 12px; animation-delay: 0.1s; }
.strip-equalizer span:nth-child(2) { height: 6px; animation-delay: 0.4s; }
.strip-equalizer span:nth-child(3) { height: 14px; animation-delay: 0.2s; }

@keyframes eq-bounce {
  0% { height: 4px; }
  100% { height: 14px; }
}

.strip-index {
  font-size: 11px;
}

/* Metadata */
.strip-meta-body {
  flex: 1;
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
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.stream-track-strip.is-active .strip-title {
  color: var(--sw-accent);
}

.strip-provider-pill {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.08em;
  padding: 1px 6px;
  border-radius: var(--sw-radius-full);
}

.strip-provider-pill.prov-direct {
  color: var(--sw-accent);
  background: rgba(56, 189, 248, 0.12);
  border: 1px solid rgba(56, 189, 248, 0.25);
}

.strip-provider-pill.prov-youtube {
  color: #f43f5e;
  background: rgba(244, 63, 94, 0.12);
  border: 1px solid rgba(244, 63, 94, 0.25);
}

.strip-provider-pill.prov-spotify {
  color: #10b981;
  background: rgba(16, 185, 129, 0.12);
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.strip-secondary-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--sw-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Waveform Rhythm Graphic */
.strip-waveform-bar {
  display: flex;
  align-items: center;
  gap: 2px;
  height: 20px;
  opacity: 0.35;
  transition: opacity var(--sw-transition-fast);
}

.stream-track-strip:hover .strip-waveform-bar,
.stream-track-strip.is-playing .strip-waveform-bar {
  opacity: 0.85;
}

.strip-wave-bar {
  width: 2px;
  background: rgba(255, 255, 255, 0.5);
  border-radius: 1px;
}

.stream-track-strip.is-playing .strip-wave-bar {
  background: var(--sw-accent);
  animation: wave-jitter 0.6s ease-in-out infinite alternate;
}

@keyframes wave-jitter {
  0% { transform: scaleY(0.7); }
  100% { transform: scaleY(1.4); }
}

.strip-duration {
  font-size: 12px;
  color: var(--sw-text-secondary);
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
  color: var(--sw-text-muted);
  border-radius: 50%;
  transition: all var(--sw-transition-fast);
}

.strip-options-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.strip-popover-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  width: 170px;
  background: rgba(13, 16, 23, 0.98);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--sw-radius-md);
  padding: 6px;
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.8);
  z-index: 50;
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 10px;
  font-size: 11px;
  color: var(--sw-text-secondary);
  border-radius: var(--sw-radius-xs);
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.menu-item:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
}

.menu-item.danger {
  color: var(--sw-danger);
}

.menu-item.danger:hover {
  background: rgba(244, 63, 94, 0.12);
}

.menu-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
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
