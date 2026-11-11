<template>
  <div class="pg-unified-playlist font-mono">
    <!-- Main Container -->
    <main class="playlist-main-content">
      <!-- Loading State -->
      <div v-if="isLoading" class="state-loading font-mono">
        <div class="loading-soundbar">
          <span></span><span></span><span></span><span></span>
        </div>
        <p>RETRIEVING MIXTAPE MASTER DATA...</p>
      </div>

      <!-- Error / Inaccessible State -->
      <div v-else-if="error" class="state-error font-mono">
        <div class="error-badge font-display">{{ errorCode || '404' }}</div>
        <h2 class="error-heading font-display">Mixtape Inaccessible</h2>
        <p class="error-detail">{{ error }}</p>
        <div class="error-actions font-mono">
          <router-link to="/" class="btn-error-action font-mono">Return to Home</router-link>
          <router-link to="/explore" class="btn-error-action outline font-mono">Explore Public Playlists</router-link>
          <button v-if="!authStore.isAuthenticated" class="btn-error-action login font-mono" @click="showLoginModal = true">
            Log In
          </button>
        </div>
      </div>

      <!-- Real Loaded Playlist -->
      <div v-else-if="playlist" class="playlist-body">
        <!-- 1. Header -->
        <PlaylistHeader
          :playlist="playlist"
          :isOwner="isOwner"
          :isPlaying="isThisPlaylistPlaying"
          @play-all="handlePlayAll"
          @shuffle="handleShuffle"
          @open-add-songs="handleRequireAuthOrOpenAdd"
          @fork="handleFork"
          @rename="handleRename"
          @edit-details="handleRequireAuthOrEdit"
          @toggle-visibility="handleToggleVisibility"
          @duplicate="handleDuplicate"
          @delete="handleRequireAuthOrDelete"
        />

        <!-- 2. Track List -->
        <section class="playlist-tracks-section">
          <PlaylistTrackList
            :songs="playlist.songs || []"
            :playlist="playlist"
            :isOwner="isOwner"
            @open-add-songs="handleRequireAuthOrOpenAdd"
            @play-song="handlePlaySong"
            @remove-song="handleRemoveSong"
            @reorder-songs="handleReorderSongs"
          />
        </section>
      </div>
    </main>

    <!-- MODALS & OVERLAYS -->

    <!-- Add Songs Drawer -->
    <AddSongsDrawer
      v-if="showAddDrawer"
      :isOpen="showAddDrawer"
      :playlistId="playlistId"
      :existingSongs="playlist?.songs || []"
      @close="showAddDrawer = false"
      @songs-added="refreshPlaylist"
    />

    <!-- Edit Playlist Modal -->
    <EditPlaylistModal
      v-if="showEditModal && playlist"
      :playlist="playlist"
      @close="showEditModal = false"
      @updated="refreshPlaylist"
    />

    <!-- Delete Confirmation Dialog -->
    <ConfirmDialog
      v-if="showDeleteDialog"
      :isOpen="showDeleteDialog"
      title="Delete Playlist"
      :message="`Delete '${playlist?.name}'? This can't be undone.`"
      confirmText="DELETE PLAYLIST"
      :loading="isDeleting"
      @cancel="showDeleteDialog = false"
      @confirm="executeDeletePlaylist"
    />

    <!-- Undo Toast (5 seconds on track remove) -->
    <UndoToast
      v-if="undoInfo"
      :song="undoInfo.song"
      :position="undoInfo.position"
      @undo="executeUndoRemove"
      @dismiss="undoInfo = null"
    />

    <!-- Guest Login Modal -->
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
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePlaylistStore } from '../stores/playlist';
import { usePlayerStore } from '../stores/player';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';

import PlaylistHeader from '../components/playlists/PlaylistHeader.vue';
import PlaylistTrackList from '../components/playlists/PlaylistTrackList.vue';
import AddSongsDrawer from '../components/playlists/AddSongsDrawer.vue';
import EditPlaylistModal from '../components/playlists/EditPlaylistModal.vue';
import ConfirmDialog from '../components/common/ConfirmDialog.vue';
import UndoToast from '../components/playlists/UndoToast.vue';
import LoginModal from '../components/common/LoginModal.vue';

const route = useRoute();
const router = useRouter();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();
const authStore = useAuthStore();
const toastStore = useToastStore();

const isLoading = ref(true);
const error = ref(null);
const errorCode = ref(null);

const showAddDrawer = ref(false);
const showEditModal = ref(false);
const showDeleteDialog = ref(false);
const showLoginModal = ref(false);
const isDeleting = ref(false);
const pendingGuestAction = ref(null);

const undoInfo = ref(null);

const playlistId = computed(() => route.params.id);

const playlist = computed(() => {
  return playlistStore.currentPlaylist;
});

const currentUserId = computed(() => {
  const u = authStore.user;
  return u?._id || u?.id || null;
});

const isOwner = computed(() => {
  if (!authStore.isAuthenticated || !playlist.value) return false;
  if (playlist.value.isOwner !== undefined) return Boolean(playlist.value.isOwner);
  const pUser = playlist.value.userId?._id || playlist.value.userId;
  const cUser = playlist.value.creator?._id || playlist.value.creator;
  return Boolean(
    (pUser && pUser === currentUserId.value) ||
    (cUser && cUser === currentUserId.value)
  );
});

const isThisPlaylistPlaying = computed(() => {
  return (
    playerStore.isPlaying &&
    (playerStore.currentPlaylist?._id === playlistId.value ||
     playerStore.currentPlaylist?.id === playlistId.value)
  );
});

const loadPlaylist = async () => {
  if (!playlistId.value) return;
  isLoading.value = true;
  error.value = null;
  errorCode.value = null;
  try {
    const data = await playlistStore.fetchPlaylist(playlistId.value);
    if (!data) {
      error.value = 'Mixtape not found.';
      errorCode.value = 404;
    }
  } catch (err) {
    errorCode.value = err.response?.status || 500;
    if (err.response?.status === 404) {
      error.value = 'This playlist does not exist or has been removed.';
    } else if (err.response?.status === 401 || err.response?.status === 403) {
      error.value = 'This playlist is private and requires owner authentication.';
    } else {
      error.value = err.response?.data?.message || err.message || 'Failed to load playlist.';
    }
  } finally {
    isLoading.value = false;
  }
};

const refreshPlaylist = async () => {
  try {
    await playlistStore.fetchPlaylist(playlistId.value);
  } catch {}
};

// Playback Handlers
const handlePlayAll = () => {
  const songs = playlist.value?.songs || [];
  if (!songs.length) return;
  if (isThisPlaylistPlaying.value) {
    playerStore.togglePlay();
  } else {
    playerStore.playTrack(songs[0], songs, 0);
    playerStore.currentPlaylist = playlist.value;
    toastStore.show(`Playing "${playlist.value.name}"`, 'success');
  }
};

const handleShuffle = () => {
  const songs = [...(playlist.value?.songs || [])];
  if (!songs.length) return;
  // Fisher-Yates shuffle
  for (let i = songs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [songs[i], songs[j]] = [songs[j], songs[i]];
  }
  playerStore.playTrack(songs[0], songs, 0);
  playerStore.currentPlaylist = playlist.value;
  playerStore.shuffle = true;
  toastStore.show(`Shuffling "${playlist.value.name}"`, 'info');
};

const handlePlaySong = ({ track, index, songsList }) => {
  playerStore.playTrack(track, songsList, index);
  playerStore.currentPlaylist = playlist.value;
};

// Owner Operations with Guest Protection
const runWithAuthGuard = (action) => {
  if (!authStore.isAuthenticated) {
    pendingGuestAction.value = action;
    showLoginModal.value = true;
    return;
  }
  action();
};

const handleLoginSuccess = async () => {
  await loadPlaylist();
};

const handleRequireAuthOrOpenAdd = () => {
  runWithAuthGuard(() => {
    showAddDrawer.value = true;
  });
};

const handleRequireAuthOrEdit = () => {
  runWithAuthGuard(() => {
    showEditModal.value = true;
  });
};

const handleRequireAuthOrDelete = () => {
  runWithAuthGuard(() => {
    showDeleteDialog.value = true;
  });
};

// Rename
const handleRename = async (newName) => {
  runWithAuthGuard(async () => {
    try {
      await playlistStore.updatePlaylist(playlistId.value, { name: newName });
      toastStore.show('Playlist renamed!', 'success');
    } catch (err) {
      toastStore.show(err.response?.data?.message || 'Failed to rename playlist', 'error');
    }
  });
};

// Toggle Visibility
const handleToggleVisibility = async (isPublic) => {
  runWithAuthGuard(async () => {
    try {
      await playlistStore.updatePlaylist(playlistId.value, { isPublic });
      toastStore.show(`Playlist is now ${isPublic ? 'Public' : 'Private'}.`, 'success');
    } catch (err) {
      toastStore.show(err.response?.data?.message || 'Failed to update visibility', 'error');
    }
  });
};

// Duplicate
const handleDuplicate = async () => {
  runWithAuthGuard(async () => {
    try {
      const duplicated = await playlistStore.duplicatePlaylist(playlistId.value);
      toastStore.show(`Duplicated as "${duplicated.name}"`, 'success');
      router.push(`/playlist/${duplicated._id || duplicated.id}`);
    } catch (err) {
      toastStore.show(err.response?.data?.message || 'Failed to duplicate playlist', 'error');
    }
  });
};

// Fork
const handleFork = async () => {
  runWithAuthGuard(async () => {
    try {
      const forked = await playlistStore.forkPlaylist(playlistId.value);
      toastStore.show(`Forked "${playlist.value.name}" to your library!`, 'success');
      router.push(`/playlist/${forked._id || forked.id}`);
    } catch (err) {
      toastStore.show(err.response?.data?.message || 'Failed to fork playlist', 'error');
    }
  });
};

// Delete
const executeDeletePlaylist = async () => {
  isDeleting.value = true;
  try {
    const pName = playlist.value?.name;
    await playlistStore.deletePlaylist(playlistId.value);
    showDeleteDialog.value = false;
    toastStore.show(`Deleted "${pName}".`, 'success');
    router.push('/');
  } catch (err) {
    toastStore.show(err.response?.data?.message || 'Failed to delete playlist', 'error');
  } finally {
    isDeleting.value = false;
  }
};

// Remove Song with Undo Toast (5s)
const handleRemoveSong = async ({ track, index }) => {
  const songId = track._id || track.id;
  try {
    await playlistStore.removeSong(playlistId.value, songId);
    undoInfo.value = {
      song: track,
      position: index,
    };
  } catch (err) {
    toastStore.show(err.response?.data?.message || 'Failed to remove song', 'error');
  }
};

const executeUndoRemove = async ({ song, position }) => {
  try {
    await playlistStore.restoreSong(playlistId.value, song, position);
    toastStore.show(`Restored "${song.title}"`, 'success');
    undoInfo.value = null;
  } catch (err) {
    toastStore.show(err.response?.data?.message || 'Failed to restore song', 'error');
  }
};

// Reorder
const handleReorderSongs = async (newSongIds) => {
  try {
    await playlistStore.reorderSongs(playlistId.value, newSongIds);
  } catch (err) {
    toastStore.show(err.response?.data?.message || 'Failed to reorder songs', 'error');
  }
};

watch(() => route.params.id, (newId) => {
  if (newId) {
    loadPlaylist();
  }
});

onMounted(() => {
  loadPlaylist();
});
</script>

<style scoped>
.pg-unified-playlist {
  width: 100%;
  color: #111111;
  display: flex;
  flex-direction: column;
  font-family: var(--font-body, Figtree, sans-serif);
}

/* Main */
.playlist-main-content {
  flex: 1;
  max-width: 1240px;
  width: 100%;
  margin: 0 auto;
  padding: 28px 24px calc(var(--dock-height, 88px) + 24px);
  box-sizing: border-box;
}

@media (max-width: 768px) {
  .playlist-main-content {
    padding: 16px 12px calc(var(--dock-height, 92px) + 24px);
  }
}

/* Loading */
.state-loading {
  text-align: center;
  padding: 60px 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  background-color: #FFFFFF;
  border: 3px solid #111111;
  box-shadow: 6px 6px 0 #111111;
  max-width: 480px;
  margin: 60px auto;
}

.loading-soundbar {
  display: flex;
  gap: 6px;
  height: 28px;
  align-items: flex-end;
}

.loading-soundbar span {
  width: 8px;
  background-color: #FFD84A;
  border: 2px solid #111111;
  animation: loadingBar 0.8s ease-in-out infinite alternate;
}

.loading-soundbar span:nth-child(2) { animation-delay: 0.2s; }
.loading-soundbar span:nth-child(3) { animation-delay: 0.4s; }
.loading-soundbar span:nth-child(4) { animation-delay: 0.6s; }

@keyframes loadingBar {
  from { height: 6px; }
  to { height: 28px; }
}

/* Error */
.state-error {
  max-width: 520px;
  margin: 60px auto;
  padding: 36px 28px;
  background-color: #FFFFFF;
  border: 3px solid #111111;
  box-shadow: 6px 6px 0 #111111;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.error-badge {
  font-family: var(--font-display, "Bricolage Grotesque", sans-serif);
  font-size: 2rem;
  font-weight: 900;
  background-color: #FF6B5E;
  color: #FFFFFF;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
  padding: 4px 18px;
}

.error-heading {
  font-family: var(--font-display, "Bricolage Grotesque", sans-serif);
  font-size: 1.8rem;
  font-weight: 900;
  margin: 0;
  text-transform: uppercase;
}

.error-detail {
  font-family: var(--font-mono, monospace);
  font-size: 0.9rem;
  font-weight: 600;
  color: #555555;
  margin: 0;
  line-height: 1.5;
}

.error-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 14px;
}

.btn-error-action {
  padding: 10px 18px;
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  font-weight: 900;
  background-color: #FFD84A;
  color: #111111;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
  text-decoration: none;
  cursor: pointer;
  text-transform: uppercase;
  border-radius: 0;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

.btn-error-action:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #111111;
}

.btn-error-action:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #111111;
}

.btn-error-action.outline {
  background-color: #FFFFFF;
}

.btn-error-action.login {
  background-color: #5DE3A6;
}

/* Body */
.playlist-body {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.playlist-tracks-section {
  width: 100%;
}
</style>
