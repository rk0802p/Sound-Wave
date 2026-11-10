<template>
  <div
    class="playlist-track-row"
    :class="{
      'has-drag': isOwner && isDraggable,
      'is-active': isCurrentTrack,
      'is-playing': isCurrentTrack && playerStore.isPlaying,
      'is-unavailable': isUnavailable,
      'is-dragging': isDragging,
      'menu-open': isMenuOpen,
    }"
    :draggable="isOwner && isDraggable"
    @dragstart="onDragStart"
    @dragover.prevent="onDragOver"
    @drop="onDrop"
    @dragend="onDragEnd"
  >
    <!-- Drag Handle & Keyboard Reorder (Owner Only, Custom Order Only) -->
    <div v-if="isOwner && isDraggable" class="drag-handle-cell">
      <span class="drag-grip" title="Drag to reorder" aria-hidden="true">⋮⋮</span>
      <div class="keyboard-reorder-buttons" aria-label="Reorder track">
        <button
          type="button"
          class="reorder-btn"
          :disabled="index === 0"
          @click.stop="$emit('move-up', index)"
          title="Move track up"
          aria-label="Move track up"
        >
          ▲
        </button>
        <button
          type="button"
          class="reorder-btn"
          :disabled="index === totalSongs - 1"
          @click.stop="$emit('move-down', index)"
          title="Move track down"
          aria-label="Move track down"
        >
          ▼
        </button>
      </div>
    </div>

    <!-- Track Number / Play Indicator -->
    <div class="track-num-cell font-mono" @click="handlePlay">
      <span v-if="isCurrentTrack && playerStore.isPlaying" class="playing-bars" aria-label="Playing">
        <span></span><span></span><span></span>
      </span>
      <span v-else-if="isCurrentTrack" class="paused-indicator">❚❚</span>
      <span v-else class="track-index">{{ index + 1 }}</span>
      <span class="hover-play-glyph font-mono">▶</span>
    </div>

    <!-- Artwork Cover -->
    <div class="track-cover-cell" @click="handlePlay">
      <img
        v-if="trackCover"
        :src="trackCover"
        :alt="track.title"
        class="track-cover-img"
        loading="lazy"
        @error="imgError = true"
      />
      <div v-else class="track-cover-fallback font-display">
        {{ monogram }}
      </div>
    </div>

    <!-- Title & Artist -->
    <div class="track-info-cell" @click="handlePlay">
      <div class="track-title-wrap">
        <span class="track-title font-display" :title="track.title">
          {{ track.title }}
        </span>
        <span v-if="track.isPreview" class="pill-preview font-mono" title="30-second audio preview">
          30s PREVIEW
        </span>
      </div>
      <div class="track-artist font-mono" :title="track.artist">
        {{ track.artist || 'Unknown Artist' }}
      </div>
    </div>

    <!-- Album -->
    <div class="track-album-cell font-mono" :title="track.album || ''">
      {{ track.album || '—' }}
    </div>

    <!-- Source / License Pill -->
    <div class="track-source-cell font-mono">
      <span class="source-pill" :class="providerBadgeClass">
        {{ providerLabel }}
      </span>
      <span v-if="licenseLabel" class="license-pill font-mono" :title="track.licenseUrl || ''">
        {{ licenseLabel }}
      </span>
    </div>

    <!-- Duration -->
    <div class="track-duration-cell font-mono">
      {{ formattedDuration }}
    </div>

    <!-- Like / Favorite Button -->
    <div class="track-like-cell">
      <button
        type="button"
        class="btn-like font-mono"
        :class="{ 'is-liked': isLiked }"
        @click.stop="toggleLike"
        :title="isLiked ? 'Unlike track' : 'Like track'"
        :aria-label="isLiked ? 'Unlike track' : 'Like track'"
      >
        {{ isLiked ? '♥' : '♡' }}
      </button>
    </div>

    <!-- Actions More Menu (...) -->
    <div class="track-menu-cell" ref="menuCellRef">
      <button
        type="button"
        class="btn-track-menu font-mono"
        @click.stop="toggleRowMenu"
        title="Track options"
        :aria-expanded="isMenuOpen"
        aria-haspopup="true"
      >
        •••
      </button>

      <!-- Row Context Menu -->
      <div v-if="isMenuOpen" class="track-dropdown-menu font-mono" @click.stop>
        <button type="button" class="menu-item" @click="handlePlayNext">
          <span class="m-icon">⏭</span>
          <span>Play Next</span>
        </button>

        <button type="button" class="menu-item" @click="handleAddToQueue">
          <span class="m-icon">≡</span>
          <span>Add to Queue</span>
        </button>

        <!-- Sub-picker for Add to another playlist -->
        <AddToPlaylistMenu :track="track">
          <template #trigger>
            <div class="menu-item">
              <span class="m-icon">＋</span>
              <span>Add to Playlist...</span>
            </div>
          </template>
        </AddToPlaylistMenu>

        <a
          v-if="sourceProviderUrl"
          :href="sourceProviderUrl"
          target="_blank"
          rel="noopener noreferrer"
          class="menu-item"
          @click="isMenuOpen = false"
        >
          <span class="m-icon">↗</span>
          <span>Open on Provider</span>
        </a>

        <div v-if="isOwner" class="menu-divider"></div>

        <button
          v-if="isOwner"
          type="button"
          class="menu-item danger"
          @click="handleRemove"
        >
          <span class="m-icon">🗑️</span>
          <span>Remove from Playlist</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { usePlayerStore } from '../../stores/player';
import { useToastStore } from '../../stores/toast';
import AddToPlaylistMenu from './AddToPlaylistMenu.vue';

const props = defineProps({
  track: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    required: true,
  },
  totalSongs: {
    type: Number,
    default: 1,
  },
  isOwner: {
    type: Boolean,
    default: false,
  },
  isDraggable: {
    type: Boolean,
    default: false,
  },
  playlistSongs: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits([
  'play',
  'remove-song',
  'move-up',
  'move-down',
  'drag-start',
  'drag-over',
  'drop',
  'drag-end',
]);

const playerStore = usePlayerStore();
const toastStore = useToastStore();

const isMenuOpen = ref(false);
const imgError = ref(false);
const isDragging = ref(false);
const menuCellRef = ref(null);

const isCurrentTrack = computed(() => {
  if (!playerStore.currentTrack || !props.track) return false;
  return (
    (props.track._id && playerStore.currentTrack._id === props.track._id) ||
    (props.track.id && playerStore.currentTrack.id === props.track.id) ||
    (playerStore.currentTrack.title === props.track.title && playerStore.currentTrack.artist === props.track.artist)
  );
});

const isUnavailable = computed(() => {
  return props.track.isUnavailable || props.track.isPlayable === false;
});

const trackCover = computed(() => {
  if (imgError.value) return null;
  return props.track.coverImage || props.track.artwork || props.track.albumArt || null;
});

const monogram = computed(() => {
  const t = props.track.title || 'SW';
  return t.substring(0, 2).toUpperCase();
});

const formattedDuration = computed(() => {
  const sec = props.track.duration || 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
});

const providerLabel = computed(() => {
  const p = props.track.provider || props.track.source?.provider || 'direct';
  return p.toUpperCase();
});

const providerBadgeClass = computed(() => {
  const p = (props.track.provider || props.track.source?.provider || 'direct').toLowerCase();
  return `badge-${p}`;
});

const licenseLabel = computed(() => {
  if (props.track.license) return props.track.license.toUpperCase();
  if (props.track.attribution) return 'CC';
  return '';
});

const sourceProviderUrl = computed(() => {
  const p = (props.track.provider || props.track.source?.provider || '').toLowerCase();
  const extId = props.track.providerTrackId || props.track.source?.externalId;
  if (p === 'jamendo' && extId) {
    return `https://www.jamendo.com/track/${extId}`;
  }
  return props.track.url || props.track.source?.url || props.track.source?.pageUrl || null;
});

// Like handling via localStorage
const isLiked = ref(false);
const checkLiked = () => {
  try {
    const raw = localStorage.getItem('soundwave_favorites');
    const ids = raw ? JSON.parse(raw) : [];
    const id = props.track._id || props.track.id;
    isLiked.value = ids.includes(id);
  } catch {
    isLiked.value = false;
  }
};

const toggleLike = () => {
  try {
    const raw = localStorage.getItem('soundwave_favorites');
    let ids = raw ? JSON.parse(raw) : [];
    const id = props.track._id || props.track.id;
    if (!id) return;
    const idx = ids.indexOf(id);
    if (idx === -1) {
      ids.push(id);
      isLiked.value = true;
      toastStore.show('Added to Liked Tracks', 'success');
    } else {
      ids.splice(idx, 1);
      isLiked.value = false;
      toastStore.show('Removed from Liked Tracks', 'info');
    }
    localStorage.setItem('soundwave_favorites', JSON.stringify(ids));
  } catch {}
};

const handlePlay = () => {
  emit('play', { track: props.track, index: props.index });
};

const toggleRowMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};

const handlePlayNext = () => {
  playerStore.playNext(props.track);
  toastStore.show(`"${props.track.title}" will play next`, 'info');
  isMenuOpen.value = false;
};

const handleAddToQueue = () => {
  playerStore.addToQueue(props.track);
  toastStore.show(`Added "${props.track.title}" to queue`, 'info');
  isMenuOpen.value = false;
};

const handleRemove = () => {
  isMenuOpen.value = false;
  emit('remove-song', { track: props.track, index: props.index });
};

// Drag and drop
const onDragStart = (e) => {
  isDragging.value = true;
  e.dataTransfer.effectAllowed = 'move';
  e.dataTransfer.setData('text/plain', String(props.index));
  emit('drag-start', props.index);
};

const onDragOver = (e) => {
  e.dataTransfer.dropEffect = 'move';
  emit('drag-over', props.index);
};

const onDrop = (e) => {
  emit('drop', props.index);
};

const onDragEnd = () => {
  isDragging.value = false;
  emit('drag-end');
};

const handleDocumentClick = (e) => {
  if (menuCellRef.value && !menuCellRef.value.contains(e.target)) {
    isMenuOpen.value = false;
  }
};

onMounted(() => {
  checkLiked();
  document.addEventListener('click', handleDocumentClick);
});

onUnmounted(() => {
  document.removeEventListener('click', handleDocumentClick);
});
</script>

<style scoped>
.playlist-track-row {
  display: grid;
  grid-template-columns: 36px 44px 1.8fr 1.2fr 130px 60px 36px 40px;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  border-bottom: 2px solid #111111;
  background-color: #FFFFFF;
  transition: background-color 0.08s ease;
  position: relative;
}

.playlist-track-row.has-drag {
  grid-template-columns: 24px 36px 44px 1.8fr 1.2fr 130px 60px 36px 40px;
}

.playlist-track-row.menu-open {
  z-index: 30;
}

.playlist-track-row:hover {
  background-color: #FFFDF8;
}

.playlist-track-row.is-active {
  background-color: #FFFDE6;
}

.playlist-track-row.is-unavailable {
  opacity: 0.5;
  filter: grayscale(80%);
}

.playlist-track-row.is-dragging {
  opacity: 0.5;
  background-color: #EFEAE1;
  border: 2px dashed #111111;
}

/* Drag Handle */
.drag-handle-cell {
  display: flex;
  align-items: center;
  gap: 2px;
  cursor: grab;
}

.drag-grip {
  color: #111111;
  font-size: 1rem;
  font-weight: 900;
  user-select: none;
}

.keyboard-reorder-buttons {
  display: none;
  flex-direction: column;
}

.playlist-track-row:focus-within .keyboard-reorder-buttons,
.playlist-track-row:hover .keyboard-reorder-buttons {
  display: flex;
}

.reorder-btn {
  background: #FFFFFF;
  border: 1.5px solid #111111;
  box-shadow: 1px 1px 0 #111111;
  padding: 1px 4px;
  font-size: 0.65rem;
  font-weight: 900;
  color: #111111;
  cursor: pointer;
  line-height: 1;
  border-radius: 0;
  margin: 1px 0;
  transition: background-color 0.08s ease;
}

.reorder-btn:hover:not(:disabled) {
  background-color: #FFD84A;
}

.reorder-btn:disabled {
  opacity: 0.3;
  cursor: default;
}

/* Track Number */
.track-num-cell {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 800;
  color: #111111;
  cursor: pointer;
}

.hover-play-glyph {
  display: none;
  position: absolute;
  color: #111111;
  font-size: 0.85rem;
  font-weight: 900;
}

.track-num-cell:hover .hover-play-glyph {
  display: block;
}

.track-num-cell:hover .track-index {
  visibility: hidden;
}

.playing-bars {
  display: inline-flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
}

.playing-bars span {
  width: 3px;
  background-color: #111111;
  animation: barBounce 0.8s ease-in-out infinite alternate;
}

.playing-bars span:nth-child(2) {
  animation-delay: 0.2s;
}

.playing-bars span:nth-child(3) {
  animation-delay: 0.4s;
}

@keyframes barBounce {
  from { height: 3px; }
  to { height: 14px; }
}

.paused-indicator {
  color: #111111;
  font-size: 0.75rem;
  font-weight: 900;
}

/* Cover Artwork */
.track-cover-cell {
  width: 44px;
  height: 44px;
  cursor: pointer;
  border: 2px solid #111111;
  box-shadow: 2px 2px 0 #111111;
  flex-shrink: 0;
  overflow: hidden;
  background-color: #FFD84A;
  border-radius: 0;
}

.track-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.track-cover-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--font-display, "Bricolage Grotesque", sans-serif);
  font-size: 0.95rem;
  font-weight: 900;
  color: #111111;
}

/* Info */
.track-info-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  cursor: pointer;
  overflow: hidden;
}

.track-title-wrap {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow: hidden;
}

.track-title {
  font-family: var(--font-display, "Bricolage Grotesque", sans-serif);
  font-size: 0.95rem;
  font-weight: 800;
  color: #111111;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.pill-preview {
  font-family: var(--font-mono, monospace);
  font-size: 0.65rem;
  font-weight: 900;
  padding: 2px 6px;
  background-color: #FFD84A;
  color: #111111;
  border: 1.5px solid #111111;
  box-shadow: 1.5px 1.5px 0 #111111;
  border-radius: 0;
  flex-shrink: 0;
  text-transform: uppercase;
}

.track-artist {
  font-family: var(--font-mono, monospace);
  font-size: 0.78rem;
  font-weight: 600;
  color: #555555;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Album */
.track-album-cell {
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  font-weight: 600;
  color: #666666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Source Pill */
.track-source-cell {
  display: flex;
  align-items: center;
  gap: 4px;
  overflow: hidden;
}

.source-pill {
  font-family: var(--font-mono, monospace);
  font-size: 0.68rem;
  font-weight: 900;
  padding: 2px 6px;
  border: 1.5px solid #111111;
  box-shadow: 1.5px 1.5px 0 #111111;
  background-color: #EFEAE1;
  color: #111111;
  border-radius: 0;
  text-transform: uppercase;
}

.badge-jamendo {
  background-color: #FF6B5E;
  color: #FFFFFF;
}

.badge-deezer {
  background-color: #B9A6FF;
  color: #111111;
}

.badge-itunes {
  background-color: #3FD8EA;
  color: #111111;
}

.badge-audius {
  background-color: #FF8AD0;
  color: #111111;
}

.badge-archive {
  background-color: #111111;
  color: #FFFFFF;
}

.license-pill {
  font-family: var(--font-mono, monospace);
  font-size: 0.65rem;
  font-weight: 800;
  color: #111111;
  background-color: #EFEAE1;
  border: 1px solid #111111;
  padding: 2px 5px;
  border-radius: 0;
}

/* Duration */
.track-duration-cell {
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  font-weight: 700;
  color: #111111;
  text-align: right;
}

/* Like */
.btn-like {
  background: none;
  border: none;
  font-size: 1.15rem;
  color: #111111;
  cursor: pointer;
  transition: transform 0.08s ease, color 0.08s ease;
  padding: 0;
}

.btn-like:hover {
  transform: scale(1.2);
  color: #FF6B5E;
}

.btn-like.is-liked {
  color: #FF6B5E;
}

/* Menu */
.track-menu-cell {
  position: relative;
  display: flex;
  justify-content: flex-end;
}

.btn-track-menu {
  background: #FFFFFF;
  border: 1.5px solid transparent;
  font-family: var(--font-mono, monospace);
  font-size: 0.85rem;
  font-weight: 900;
  color: #111111;
  cursor: pointer;
  padding: 3px 6px;
  border-radius: 0;
  transition: border-color 0.08s ease, box-shadow 0.08s ease, background-color 0.08s ease;
}

.btn-track-menu:hover {
  border-color: #111111;
  box-shadow: 2px 2px 0 #111111;
  background-color: #FFFDF8;
}

.track-dropdown-menu {
  position: absolute;
  top: 100%;
  right: 0;
  width: 220px;
  background-color: #FFFFFF;
  border: 2px solid #111111;
  box-shadow: 4px 4px 0 #111111;
  z-index: 1000;
  padding: 6px 0;
  border-radius: 0;
}

.menu-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 14px;
  background: none;
  border: none;
  text-align: left;
  font-family: var(--font-mono, monospace);
  font-size: 0.8rem;
  font-weight: 700;
  color: #111111;
  cursor: pointer;
  text-decoration: none;
  transition: background-color 0.08s ease;
}

.menu-item:hover {
  background-color: #FFFDF8;
  font-weight: 800;
}

.menu-item.danger {
  color: #FF6B5E;
}

.menu-item.danger:hover {
  background-color: #FFE6EE;
}

.m-icon {
  font-size: 0.85rem;
  width: 16px;
}

.menu-divider {
  height: 2px;
  background-color: #111111;
  margin: 4px 0;
}

@media (max-width: 900px) {
  .playlist-track-row {
    grid-template-columns: 32px 40px 1.8fr 110px 50px 32px 36px;
  }
  .playlist-track-row.has-drag {
    grid-template-columns: 20px 32px 40px 1.8fr 110px 50px 32px 36px;
  }
  .track-album-cell {
    display: none;
  }
}

@media (max-width: 640px) {
  .playlist-track-row {
    grid-template-columns: 28px 38px 1fr 48px 32px;
    gap: 8px;
    padding: 8px 10px;
  }
  .playlist-track-row.has-drag {
    grid-template-columns: 18px 28px 38px 1fr 48px 32px;
    gap: 8px;
    padding: 8px 10px;
  }
  .track-source-cell,
  .track-like-cell {
    display: none;
  }
}
</style>
