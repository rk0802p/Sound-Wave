<template>
  <div class="add-to-playlist-container" ref="menuRoot">
    <div
      ref="triggerBoxRef"
      class="trigger-box"
      @click.stop="toggleMenu"
      :title="title"
      :aria-expanded="isOpen"
      aria-haspopup="true"
      role="button"
      tabindex="0"
      @keydown.enter.stop="toggleMenu"
      @keydown.space.stop.prevent="toggleMenu"
    >
      <slot name="trigger">
        <button type="button" class="trigger-btn font-mono">
          <span class="default-trigger">＋ Add to Playlist</span>
        </button>
      </slot>
    </div>

    <Teleport to="body">
      <div
        v-if="isOpen"
        ref="popoverRef"
        class="picker-dropdown font-mono"
        :data-placement="popoverPlacement"
        :style="popoverStyle"
        role="dialog"
        aria-label="Add to playlist menu"
        @click.stop
      >
        <div class="picker-header">
          <span class="picker-title font-display">ADD TO PLAYLIST</span>
          <button
            type="button"
            class="picker-close"
            @click="closeMenu"
            aria-label="Close playlist picker"
          >
            ✕
          </button>
        </div>

        <div class="picker-playlists">
          <div v-if="isLoading" class="picker-loading">Loading playlists...</div>
          <div v-else-if="userPlaylists.length === 0" class="picker-empty">
            No playlists created yet.
          </div>
          <button
            v-for="p in userPlaylists"
            :key="p._id || p.id"
            type="button"
            class="picker-row font-mono"
            @click="handleAddToPlaylist(p)"
            :disabled="isAdding"
          >
            <span class="p-icon">🎵</span>
            <span class="p-name">{{ p.name }}</span>
            <span class="p-count font-mono">{{ p.songs?.length || p.songCount || 0 }}</span>
          </button>
        </div>

        <div class="picker-footer">
          <button type="button" class="btn-create-new font-mono" @click="openCreateModal">
            ＋ CREATE NEW PLAYLIST
          </button>
        </div>
      </div>
    </Teleport>

    <!-- Create Playlist Modal -->
    <CreatePlaylistModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="handlePlaylistCreated"
    />

    <!-- Login Modal for Guest Authentication -->
    <LoginModal
      v-if="showLoginModal"
      :isOpen="showLoginModal"
      :onSuccess="pendingAction"
      @login-success="handleLoginSuccess"
      @close="showLoginModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed, nextTick, onMounted, onUnmounted } from 'vue';
import { usePlaylistStore } from '../../stores/playlist';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';
import { computePopoverPosition } from '../../utils/popoverPosition';
import CreatePlaylistModal from './CreatePlaylistModal.vue';
import LoginModal from '../common/LoginModal.vue';

const props = defineProps({
  track: {
    type: Object,
    required: true,
  },
  title: {
    type: String,
    default: 'Add to playlist',
  },
});

const emit = defineEmits(['added', 'close']);

const playlistStore = usePlaylistStore();
const authStore = useAuthStore();
const toastStore = useToastStore();

const isOpen = ref(false);
const isLoading = ref(false);
const isAdding = ref(false);
const showCreateModal = ref(false);
const showLoginModal = ref(false);
const pendingAction = ref(null);

const menuRoot = ref(null);
const triggerBoxRef = ref(null);
const popoverRef = ref(null);

const popoverCoords = ref({
  top: 0,
  left: 0,
  width: 276,
  maxHeight: 320,
  placement: 'bottom',
});

const popoverPlacement = computed(() => popoverCoords.value.placement);

const popoverStyle = computed(() => ({
  position: 'fixed',
  top: `${popoverCoords.value.top}px`,
  left: `${popoverCoords.value.left}px`,
  width: `${popoverCoords.value.width}px`,
  maxHeight: `${popoverCoords.value.maxHeight}px`,
  zIndex: 1400,
}));

const userPlaylists = computed(() => {
  return (playlistStore.playlists || []).filter(
    (p) => !p.isMood && !p.id?.startsWith('mood-') && !p._id?.startsWith('mood-')
  );
});

const updatePopoverPosition = () => {
  if (!isOpen.value || !triggerBoxRef.value || typeof window === 'undefined') return;

  const triggerRect = triggerBoxRef.value.getBoundingClientRect();
  const dockEl = document.getElementById('dock');
  const dockRect = dockEl ? dockEl.getBoundingClientRect() : null;
  const topbarEl = document.querySelector('.jb-topbar');
  const topbarRect = topbarEl ? topbarEl.getBoundingClientRect() : null;
  const measuredHeight = popoverRef.value
    ? Math.min(340, Math.max(220, popoverRef.value.scrollHeight))
    : 300;

  popoverCoords.value = computePopoverPosition({
    triggerRect,
    popoverWidth: 276,
    popoverHeight: measuredHeight,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    dockTop: dockRect && dockRect.height > 0 ? dockRect.top : null,
    headerBottom: topbarRect && topbarRect.height > 0 ? topbarRect.bottom : 0,
  });
};

const runWithAuthGuard = (action) => {
  if (!authStore.isAuthenticated) {
    pendingAction.value = action;
    showLoginModal.value = true;
    return;
  }
  action();
};

const handleLoginSuccess = async () => {
  try {
    await playlistStore.fetchPlaylists();
  } catch {}
};

const toggleMenu = async () => {
  if (isOpen.value) {
    closeMenu();
    return;
  }
  isOpen.value = true;
  await nextTick();
  updatePopoverPosition();

  if (!playlistStore.playlists.length && authStore.isAuthenticated) {
    isLoading.value = true;
    try {
      await playlistStore.fetchPlaylists();
    } catch {}
    isLoading.value = false;
    await nextTick();
    updatePopoverPosition();
  }
};

const closeMenu = () => {
  isOpen.value = false;
  emit('close');
};

const handleAddToPlaylist = (playlist) => {
  runWithAuthGuard(async () => {
    const pId = playlist._id || playlist.id;
    isAdding.value = true;
    try {
      const formattedTrack = {
        title: props.track.title || props.track.name,
        artist: props.track.artist || 'Unknown Artist',
        album: props.track.album || '',
        duration: props.track.duration || 0,
        url: props.track.url || props.track.streamUrl || '',
        coverImage: props.track.coverImage || props.track.artwork || '',
        provider: props.track.provider || props.track.source?.provider || 'direct',
        providerTrackId: props.track.providerTrackId || props.track.source?.externalId || null,
        source: props.track.source || undefined,
        license: props.track.license || undefined,
        licenseUrl: props.track.licenseUrl || undefined,
        attribution: props.track.attribution || undefined,
        isPreview: props.track.isPreview || undefined,
        previewDurationMs: props.track.previewDurationMs || undefined,
      };
      await playlistStore.addSong(pId, formattedTrack);
      toastStore.show(`Added to "${playlist.name}"`, 'success');
      emit('added', { playlist, track: props.track });
      closeMenu();
    } catch (err) {
      if (err.response?.status === 409) {
        toastStore.show(`"${props.track.title}" is already in "${playlist.name}"`, 'warning');
      } else {
        toastStore.show(err.response?.data?.message || 'Failed to add track', 'error');
      }
    } finally {
      isAdding.value = false;
    }
  });
};

const openCreateModal = () => {
  runWithAuthGuard(() => {
    closeMenu();
    showCreateModal.value = true;
  });
};

const handlePlaylistCreated = async (newPlaylist) => {
  showCreateModal.value = false;
  if (newPlaylist) {
    await handleAddToPlaylist(newPlaylist);
  }
};

const handleOutsideClick = (e) => {
  if (!isOpen.value) return;
  const insideTrigger = menuRoot.value && menuRoot.value.contains(e.target);
  const insidePopover = popoverRef.value && popoverRef.value.contains(e.target);
  if (!insideTrigger && !insidePopover) {
    closeMenu();
  }
};

const handleKeyDown = (e) => {
  if (isOpen.value && e.key === 'Escape') {
    e.preventDefault();
    closeMenu();
  }
};

onMounted(() => {
  document.addEventListener('click', handleOutsideClick);
  document.addEventListener('keydown', handleKeyDown);
  window.addEventListener('scroll', updatePopoverPosition, true);
  window.addEventListener('resize', updatePopoverPosition);
});

onUnmounted(() => {
  document.removeEventListener('click', handleOutsideClick);
  document.removeEventListener('keydown', handleKeyDown);
  window.removeEventListener('scroll', updatePopoverPosition, true);
  window.removeEventListener('resize', updatePopoverPosition);
});
</script>

<style scoped>
.add-to-playlist-container {
  position: relative;
  display: inline-block;
}

.trigger-btn {
  background: none;
  border: none;
  padding: 0;
  cursor: pointer;
  color: inherit;
  font-family: inherit;
}

.default-trigger {
  font-family: var(--font-mono, monospace);
  font-size: 0.8rem;
  font-weight: 800;
  padding: 5px 10px;
  background-color: #FFD84A;
  border: 2px solid #111111;
  box-shadow: 2px 2px 0 #111111;
  color: #111111;
  border-radius: 0;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 4px;
  text-transform: uppercase;
  transition: transform 0.08s ease, box-shadow 0.08s ease, background-color 0.08s ease;
}

.default-trigger:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #111111;
  background-color: #FFE066;
}

.default-trigger:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #111111;
}

.picker-dropdown {
  position: fixed;
  display: flex;
  flex-direction: column;
  background-color: #FFFFFF;
  border: 3px solid #111111;
  box-shadow: 5px 5px 0 #111111;
  padding: 0;
  border-radius: 0;
  overflow: hidden;
  box-sizing: border-box;
}

.picker-header {
  flex-shrink: 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 14px;
  background-color: #EFEAE1;
  border-bottom: 2px solid #111111;
}

.picker-title {
  font-family: var(--font-display, "Bricolage Grotesque", sans-serif);
  font-size: 0.85rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  color: #111111;
  text-transform: uppercase;
}

.picker-close {
  background: #FFFFFF;
  border: 1.5px solid #111111;
  box-shadow: 1.5px 1.5px 0 #111111;
  width: 24px;
  height: 24px;
  font-size: 0.75rem;
  font-weight: 900;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #111111;
  transition: transform 0.08s ease, background-color 0.08s ease;
}

.picker-close:hover {
  background-color: #FF6B5E;
  color: #FFFFFF;
}

.picker-playlists {
  flex: 1 1 auto;
  min-height: 0;
  max-height: 220px;
  overflow-y: auto;
  padding: 4px 0;
  background-color: #FFFFFF;
}

.picker-loading,
.picker-empty {
  padding: 16px 12px;
  font-size: 0.8rem;
  font-weight: 600;
  color: #666666;
  text-align: center;
  font-family: var(--font-mono, monospace);
}

.picker-row {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 9px 14px;
  border: none;
  border-bottom: 1px solid #EFEAE1;
  background: transparent;
  text-align: left;
  cursor: pointer;
  font-size: 0.82rem;
  color: #111111;
  font-family: var(--font-mono, monospace);
  transition: background-color 0.08s ease;
}

.picker-row:hover:not(:disabled) {
  background-color: #FFFDF8;
}

.p-icon {
  font-size: 0.85rem;
}

.p-name {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 700;
}

.p-count {
  font-size: 0.72rem;
  font-weight: 800;
  background: #FFD84A;
  border: 1px solid #111111;
  padding: 1px 6px;
  color: #111111;
}

.picker-footer {
  flex-shrink: 0;
  border-top: 2px solid #111111;
  padding: 10px 12px;
  background-color: #FFFDF8;
}

.btn-create-new {
  width: 100%;
  background-color: #5DE3A6;
  color: #111111;
  border: 2px solid #111111;
  box-shadow: 2px 2px 0 #111111;
  padding: 8px 10px;
  font-size: 0.78rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  text-align: center;
  border-radius: 0;
  transition: transform 0.08s ease, box-shadow 0.08s ease, background-color 0.08s ease;
}

.btn-create-new:hover {
  background-color: #4BD898;
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #111111;
}

.btn-create-new:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #111111;
}
</style>
