<template>
  <div
    class="jb-app-shell soundwave-app"
    :style="{ '--dock-height': uiStore.dockHeight + 'px' }"
  >
    <!-- Persistent Left Sidebar -->
    <SideNav
      @open-create="openCreateModal"
      @playlist-rename="handleSidebarRename"
      @playlist-duplicate="handleSidebarDuplicate"
      @playlist-delete="handleSidebarDelete"
    />

    <!-- Right Main Workspace -->
    <div class="jb-main-container">
      <TopBar />
      <div class="jb-page-slot">
        <slot></slot>
      </div>
    </div>

    <!-- Single Persistent Bottom Player Dock -->
    <div ref="dockWrapperRef" class="jb-dock-host">
      <FloatingPlayerDock
        @toggle-queue="uiStore.toggleQueue()"
        @open-info="uiStore.openLicenseModal($event)"
      />
    </div>

    <!-- Single Up Next Queue Drawer -->
    <QueueDrawer />

    <!-- Single Toast Container & Keyboard Shortcuts -->
    <ToastContainer />
    <KeyboardShortcutsModal
      :isOpen="uiStore.showShortcutsModal"
      @close="uiStore.showShortcutsModal = false"
    />

    <!-- Shell Modal: Create Playlist -->
    <CreatePlaylistModal
      v-if="uiStore.showCreatePlaylistModal"
      @close="uiStore.showCreatePlaylistModal = false"
      @created="handlePlaylistCreated"
    />

    <!-- Shell Modal: License & Attribution -->
    <div
      v-if="uiStore.selectedLicenseTrack"
      class="jb-modal-backdrop"
      @click.self="uiStore.closeLicenseModal()"
    >
      <div class="jb-dialog font-mono" role="dialog" aria-label="Track License and Attribution">
        <div class="jb-dialog-header">
          <span class="jb-dialog-tag">LEGAL & ATTRIBUTION</span>
          <button type="button" class="jb-dialog-close" @click="uiStore.closeLicenseModal()">✕</button>
        </div>
        <div class="jb-dialog-body">
          <h3 class="font-display jb-dialog-title">{{ uiStore.selectedLicenseTrack.title }}</h3>
          <p class="jb-dialog-sub">By {{ uiStore.selectedLicenseTrack.artist }}</p>

          <div class="jb-dialog-field">
            <label>LICENSE</label>
            <div class="jb-dialog-val">{{ uiStore.selectedLicenseTrack.license?.name || 'Creative Commons' }}</div>
          </div>

          <div class="jb-dialog-field" v-if="uiStore.selectedLicenseTrack.license?.attribution">
            <label>ATTRIBUTION</label>
            <div class="jb-dialog-val quote">{{ uiStore.selectedLicenseTrack.license.attribution }}</div>
          </div>

          <div class="jb-dialog-field" v-if="uiStore.selectedLicenseTrack.source?.pageUrl">
            <label>JAMENDO VERIFICATION</label>
            <a
              :href="uiStore.selectedLicenseTrack.source.pageUrl"
              target="_blank"
              rel="noopener"
              class="jb-dialog-link"
            >
              {{ uiStore.selectedLicenseTrack.source.pageUrl }} ↗
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Shell Modal: Audio Engine Settings -->
    <div
      v-if="uiStore.showSettingsModal"
      class="jb-modal-backdrop"
      @click.self="uiStore.showSettingsModal = false"
    >
      <div class="jb-dialog font-mono" role="dialog" aria-label="Audio Engine Settings">
        <div class="jb-dialog-header">
          <span class="jb-dialog-tag">AUDIO ENGINE SETTINGS</span>
          <button type="button" class="jb-dialog-close" @click="uiStore.showSettingsModal = false">✕</button>
        </div>
        <div class="jb-dialog-body">
          <div class="jb-setting-row">
            <strong>Persistent HTML5 Audio Engine</strong>
            <p>Active Provider: <code>DirectAudioProvider</code> (Jamendo CC & Authorized Previews)</p>
          </div>
          <div class="jb-setting-row">
            <strong>Volume Memory</strong>
            <p>{{ Math.round(playerStore.volume * 100) }}% ({{ playerStore.muted ? 'Muted' : 'Unmuted' }})</p>
          </div>
          <div class="jb-setting-row">
            <strong>Playback Policy</strong>
            <p>Strict CC authorization, unverified providers rejected.</p>
          </div>
        </div>
      </div>
    </div>

    <!-- Confirm Dialog for Sidebar Playlist Delete -->
    <ConfirmDialog
      v-if="showDeleteConfirm"
      :isOpen="showDeleteConfirm"
      title="Delete Playlist"
      :message="`Delete '${playlistToDelete?.name}'? This can't be undone.`"
      confirmText="DELETE PLAYLIST"
      @cancel="showDeleteConfirm = false; playlistToDelete = null"
      @confirm="confirmSidebarDelete"
    />

    <!-- Rename Playlist Dialog for Sidebar Menu -->
    <div
      v-if="showRenameModal"
      class="jb-modal-backdrop"
      @click.self="closeRenameModal"
    >
      <form class="jb-dialog font-mono" role="dialog" aria-label="Rename Playlist" @submit.prevent="confirmSidebarRename">
        <div class="jb-dialog-header">
          <span class="jb-dialog-tag">RENAME PLAYLIST</span>
          <button type="button" class="jb-dialog-close" @click="closeRenameModal">✕</button>
        </div>
        <div class="jb-dialog-field">
          <label for="sidebar-rename-input">PLAYLIST NAME</label>
          <input
            id="sidebar-rename-input"
            ref="renameInputRef"
            v-model="renameDraft"
            type="text"
            maxlength="80"
            required
            class="jb-rename-input font-display"
            @keydown.esc="closeRenameModal"
          />
        </div>
        <div class="jb-rename-actions">
          <button type="button" class="jb-rename-cancel font-mono" @click="closeRenameModal">CANCEL</button>
          <button type="submit" class="jb-rename-save font-mono" :disabled="!renameDraft.trim()">SAVE NAME</button>
        </div>
      </form>
    </div>

    <!-- Login Modal for Guest Authentication -->
    <LoginModal
      v-if="showLoginModal"
      :isOpen="showLoginModal"
      :onSuccess="pendingGuestAction"
      @login-success="handleLoginSuccess"
      @close="showLoginModal = false"
    />
  </div>
</template>

<script setup>
import { ref, nextTick, onMounted, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useUiStore } from '../../stores/ui';
import { usePlayerStore } from '../../stores/player';
import { usePlaylistStore } from '../../stores/playlist';
import { useAuthStore } from '../../stores/auth';
import { useToastStore } from '../../stores/toast';
import SideNav from './SideNav.vue';
import TopBar from './TopBar.vue';
import QueueDrawer from './QueueDrawer.vue';
import FloatingPlayerDock from '../player/FloatingPlayerDock.vue';
import ToastContainer from '../common/ToastContainer.vue';
import KeyboardShortcutsModal from '../common/KeyboardShortcutsModal.vue';
import CreatePlaylistModal from '../playlists/CreatePlaylistModal.vue';
import ConfirmDialog from '../common/ConfirmDialog.vue';
import LoginModal from '../common/LoginModal.vue';

const route = useRoute();
const router = useRouter();
const uiStore = useUiStore();
const playerStore = usePlayerStore();
const playlistStore = usePlaylistStore();
const authStore = useAuthStore();
const toastStore = useToastStore();

const dockWrapperRef = ref(null);
const showDeleteConfirm = ref(false);
const playlistToDelete = ref(null);
const showRenameModal = ref(false);
const playlistToRename = ref(null);
const renameDraft = ref('');
const renameInputRef = ref(null);
const showLoginModal = ref(false);
const pendingGuestAction = ref(null);

let dockResizeObserver = null;
let lastWasCompactViewport = false;

const runWithAuthGuard = (action) => {
  if (!authStore.isAuthenticated) {
    pendingGuestAction.value = action;
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

const openCreateModal = () => {
  runWithAuthGuard(() => {
    uiStore.showCreatePlaylistModal = true;
    uiStore.closeMobileSidebar();
  });
};

const handlePlaylistCreated = () => {
  uiStore.showCreatePlaylistModal = false;
  playlistStore.fetchPlaylists().catch(() => {});
  toastStore.show('Playlist created!', 'success');
};

const handleSidebarRename = (p) => {
  runWithAuthGuard(async () => {
    playlistToRename.value = p;
    renameDraft.value = p.name || '';
    showRenameModal.value = true;
    await nextTick();
    renameInputRef.value?.focus();
    renameInputRef.value?.select();
  });
};

const closeRenameModal = () => {
  showRenameModal.value = false;
  playlistToRename.value = null;
  renameDraft.value = '';
};

const confirmSidebarRename = async () => {
  if (!playlistToRename.value) return;
  const trimmed = renameDraft.value.trim();
  const target = playlistToRename.value;
  if (!trimmed || trimmed === target.name) {
    closeRenameModal();
    return;
  }
  try {
    await playlistStore.updatePlaylist(target._id || target.id, { name: trimmed });
    toastStore.show(`Playlist renamed to "${trimmed}"`, 'success');
    closeRenameModal();
  } catch (err) {
    toastStore.show(err.response?.data?.message || 'Failed to rename playlist', 'error');
  }
};

const handleSidebarDuplicate = (p) => {
  runWithAuthGuard(async () => {
    try {
      const dup = await playlistStore.duplicatePlaylist(p._id || p.id);
      toastStore.show(`Duplicated as "${dup.name}"`, 'success');
    } catch (err) {
      toastStore.show(err.response?.data?.message || 'Failed to duplicate playlist', 'error');
    }
  });
};

const handleSidebarDelete = (p) => {
  runWithAuthGuard(() => {
    playlistToDelete.value = p;
    showDeleteConfirm.value = true;
  });
};

const confirmSidebarDelete = async () => {
  if (!playlistToDelete.value) return;
  const targetId = playlistToDelete.value._id || playlistToDelete.value.id;
  try {
    const pName = playlistToDelete.value.name;
    await playlistStore.deletePlaylist(targetId);
    toastStore.show(`Playlist "${pName}" deleted.`, 'success');
    if (route.path === `/playlist/${targetId}`) {
      router.push('/');
    }
  } catch (err) {
    toastStore.show(err.response?.data?.message || 'Failed to delete playlist', 'error');
  } finally {
    showDeleteConfirm.value = false;
    playlistToDelete.value = null;
  }
};

const isInputElement = (el) => {
  if (!el) return false;
  const tag = el.tagName ? el.tagName.toLowerCase() : '';
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
};

const handleKeyDown = (e) => {
  // Cmd/Ctrl+K -> Focus sidebar search
  if ((e.metaKey || e.ctrlKey) && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    uiStore.triggerSearchFocus();
    return;
  }

  // If typing inside form controls, don't trigger media shortcuts
  if (isInputElement(e.target) || isInputElement(document.activeElement)) {
    return;
  }

  // Never hijack browser modifier combinations
  if (e.ctrlKey || e.metaKey || e.altKey) {
    return;
  }

  if (e.key === 'Escape') {
    if (uiStore.showShortcutsModal) {
      e.preventDefault();
      uiStore.showShortcutsModal = false;
      return;
    }
    if (uiStore.isQueueOpen) {
      e.preventDefault();
      uiStore.closeQueue();
      return;
    }
    if (uiStore.isMobileSidebarOpen) {
      e.preventDefault();
      uiStore.closeMobileSidebar();
      return;
    }
  }

  if (e.code === 'Space' || e.key === ' ') {
    const targetTag = (e.target?.tagName || '').toLowerCase();
    if (targetTag === 'button') return;
    if (e.repeat) return;
    e.preventDefault();
    playerStore.togglePlay();
    return;
  }

  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    playerStore.seek(Math.max(0, playerStore.currentTime - 5));
    return;
  }

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    playerStore.seek(Math.min(playerStore.duration || 9999, playerStore.currentTime + 5));
    return;
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    playerStore.setVolume(Math.min(1, playerStore.volume + 0.05));
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    playerStore.setVolume(Math.max(0, playerStore.volume - 0.05));
    return;
  }

  if (e.key === 'm' || e.key === 'M') {
    if (e.repeat) return;
    e.preventDefault();
    playerStore.setMuted(!playerStore.muted);
    return;
  }

  if (e.key === 's' || e.key === 'S') {
    if (e.repeat) return;
    e.preventDefault();
    playerStore.toggleShuffle();
    return;
  }

  if (e.key === 'r' || e.key === 'R') {
    if (e.repeat) return;
    e.preventDefault();
    playerStore.cycleRepeat();
    return;
  }

  if (e.key === '?' || (e.shiftKey && e.key === '/')) {
    if (e.repeat) return;
    e.preventDefault();
    uiStore.showShortcutsModal = !uiStore.showShortcutsModal;
  }
};

const measureDockHeight = () => {
  const dockEl = dockWrapperRef.value?.querySelector('#dock');
  if (dockEl) {
    const h = Math.round(dockEl.getBoundingClientRect().height);
    if (h > 0) {
      uiStore.dockHeight = h;
      if (typeof document !== 'undefined') {
        document.documentElement.style.setProperty('--dock-height', `${h}px`);
      }
    }
  }
};

const syncViewportSidebar = () => {
  if (typeof window === 'undefined') return;
  const w = window.innerWidth;
  const isCompactDesktop = w <= 1100 && w > 768;
  if (isCompactDesktop && !lastWasCompactViewport) {
    uiStore.isSidebarCollapsed = true;
  } else if (w > 1100 && lastWasCompactViewport) {
    uiStore.isSidebarCollapsed = false;
  }
  if (w > 768 && uiStore.isMobileSidebarOpen) {
    uiStore.closeMobileSidebar();
  }
  lastWasCompactViewport = isCompactDesktop;
};

onMounted(() => {
  uiStore.loadFavorites();
  playlistStore.fetchPlaylists().catch(() => {});
  syncViewportSidebar();
  window.addEventListener('resize', syncViewportSidebar);
  window.addEventListener('keydown', handleKeyDown);
  if (typeof window !== 'undefined') {
    window._soundwaveOpenShortcutsModal = () => {
      uiStore.showShortcutsModal = true;
    };
  }
  measureDockHeight();
  const dockEl = dockWrapperRef.value?.querySelector('#dock');
  if (dockEl && typeof ResizeObserver !== 'undefined') {
    dockResizeObserver = new ResizeObserver(measureDockHeight);
    dockResizeObserver.observe(dockEl);
  }
});

onUnmounted(() => {
  window.removeEventListener('resize', syncViewportSidebar);
  window.removeEventListener('keydown', handleKeyDown);
  dockResizeObserver?.disconnect();
});
</script>

<style scoped>
.jb-app-shell {
  display: flex;
  min-height: 100vh;
  width: 100%;
  background-color: var(--bg, #F3EFE8);
  color: var(--ink, #111111);
  font-family: var(--font-body);
  position: relative;
}

.jb-main-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
  padding-bottom: calc(var(--dock-height, 88px) + 1rem);
}

.jb-page-slot {
  flex: 1;
  min-width: 0;
}

.jb-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 17, 17, 0.6);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1rem;
}

.jb-dialog {
  background: var(--surface, #FFFDF8);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-lg, 8px 8px 0 var(--border, #111111));
  border-radius: var(--r-lg, 18px);
  width: 100%;
  max-width: 540px;
  padding: 1.75rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.jb-dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: var(--bw, 2px) solid var(--border, #111111);
  padding-bottom: 0.75rem;
}

.jb-dialog-tag {
  font-size: 0.82rem;
  font-weight: 800;
  letter-spacing: 0.08em;
}

.jb-dialog-close {
  background: none;
  border: 1.5px solid var(--border, #111111);
  border-radius: 4px;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
}

.jb-dialog-title {
  font-size: 1.6rem;
  font-weight: 900;
}

.jb-dialog-sub {
  color: var(--ink-muted, #4A4740);
  font-weight: 700;
  margin-top: -0.5rem;
}

.jb-dialog-field {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.jb-dialog-field label {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--ink-muted, #4A4740);
}

.jb-dialog-val {
  background: #EFEAE1;
  border: 1.5px solid var(--border, #111111);
  border-radius: 6px;
  padding: 0.5rem;
  font-size: 0.85rem;
}

.jb-dialog-val.quote {
  font-style: italic;
}

.jb-dialog-link {
  color: var(--c-blue, #4D6BFF);
  text-decoration: underline;
  word-break: break-all;
  font-size: 0.82rem;
}

.jb-setting-row {
  border-bottom: 1px solid rgba(17, 17, 17, 0.1);
  padding: 0.75rem 0;
}

.jb-rename-input {
  width: 100%;
  padding: 0.65rem 0.85rem;
  background: #FFFFFF;
  border: 2px solid var(--border, #111111);
  box-shadow: 3px 3px 0 var(--border, #111111);
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--ink, #111111);
}

.jb-rename-input:focus {
  outline: none;
  background: #FFFDE6;
}

.jb-rename-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.jb-rename-cancel,
.jb-rename-save {
  padding: 0.55rem 1.1rem;
  border: 2px solid var(--border, #111111);
  box-shadow: 3px 3px 0 var(--border, #111111);
  font-weight: 900;
  font-size: 0.8rem;
  cursor: pointer;
}

.jb-rename-cancel {
  background: #FFFFFF;
}

.jb-rename-save {
  background: #5DE3A6;
}

.jb-rename-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
