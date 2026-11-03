<template>
  <div class="playlist-view-wrapper">
    <!-- Back to Library Button -->
    <div class="back-nav-bar">
      <router-link to="/" class="back-link">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>Back to Library</span>
      </router-link>
    </div>

    <!-- Loading State -->
    <div v-if="playlistStore.isLoading && !playlist" class="loading-state">
      <div class="spinner"></div>
      <p>Loading playlist...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="playlistStore.error" class="error-state">
      <div class="error-icon">⚠️</div>
      <h2>Unable to Load Playlist</h2>
      <p>{{ playlistStore.error }}</p>
      <router-link to="/" class="btn-home">Return to Library</router-link>
    </div>

    <!-- Main Content -->
    <template v-else-if="playlist">
      <!-- Hero Banner -->
      <PlaylistHero
        :playlist="playlist"
        @play-all="handlePlayAll"
        @shuffle-play="handleShufflePlay"
        @open-add-song="showAddSongModal = true"
        @open-edit="showEditModal = true"
        @delete-playlist="handleDeletePlaylist"
      />

      <!-- Song Table -->
      <SongTable
        :songs="playlist.songs || []"
        :playlist-id="playlist._id"
        @open-add-song="showAddSongModal = true"
        @edit-song="openEditSong"
        @delete-song="handleDeleteSong"
        @reorder-songs="handleReorderSongs"
      />

      <!-- Modals -->
      <AddSongModal
        v-if="showAddSongModal"
        :playlist-id="playlist._id"
        @close="showAddSongModal = false"
        @song-added="refreshPlaylist"
      />

      <EditPlaylistModal
        v-if="showEditModal"
        :playlist="playlist"
        @close="showEditModal = false"
        @playlist-updated="refreshPlaylist"
      />

      <EditSongModal
        v-if="selectedSongForEdit"
        :playlist-id="playlist._id"
        :song="selectedSongForEdit"
        @close="selectedSongForEdit = null"
        @song-updated="refreshPlaylist"
      />
    </template>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePlaylistStore } from '../stores/playlist';
import { usePlayerStore } from '../stores/player';
import { useToastStore } from '../stores/toast';

import PlaylistHero from '../components/playlists/PlaylistHero.vue';
import SongTable from '../components/playlists/SongTable.vue';
import AddSongModal from '../components/playlists/AddSongModal.vue';
import EditPlaylistModal from '../components/playlists/EditPlaylistModal.vue';
import EditSongModal from '../components/playlists/EditSongModal.vue';

const route = useRoute();
const router = useRouter();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();
const toastStore = useToastStore();

const showAddSongModal = ref(false);
const showEditModal = ref(false);
const selectedSongForEdit = ref(null);

const playlist = computed(() => playlistStore.currentPlaylist);

const loadPlaylistData = async (id) => {
  if (!id) return;
  try {
    await playlistStore.fetchPlaylist(id);
  } catch (err) {
    console.error('Failed to load playlist:', err);
  }
};

const refreshPlaylist = async () => {
  if (route.params.id) {
    await loadPlaylistData(route.params.id);
  }
};

const handlePlayAll = () => {
  if (!playlist.value?.songs?.length) return;
  playerStore.playTrack(playlist.value.songs[0], playlist.value.songs, 0);
  toastStore.info(`Playing "${playlist.value.name}"`);
};

const handleShufflePlay = () => {
  if (!playlist.value?.songs?.length) return;
  playerStore.shuffle = true;
  const randomIndex = Math.floor(Math.random() * playlist.value.songs.length);
  playerStore.playTrack(playlist.value.songs[randomIndex], playlist.value.songs, randomIndex);
  toastStore.info(`Shuffling "${playlist.value.name}"`);
};

const openEditSong = (song) => {
  selectedSongForEdit.value = song;
};

const handleDeleteSong = async (song) => {
  if (!confirm(`Are you sure you want to remove "${song.title}" from this playlist?`)) {
    return;
  }

  try {
    await playlistStore.deleteSong(playlist.value._id, song._id);
    toastStore.success(`Removed "${song.title}"`);
  } catch (err) {
    toastStore.error(err.response?.data?.message || 'Failed to remove song');
  }
};

const handleReorderSongs = async (newSongIds) => {
  try {
    await playlistStore.reorderSongs(playlist.value._id, newSongIds);
  } catch (err) {
    toastStore.error('Failed to update song order');
  }
};

const handleDeletePlaylist = async () => {
  if (!confirm(`Are you sure you want to delete "${playlist.value?.name}"? This action cannot be undone.`)) {
    return;
  }

  try {
    await playlistStore.deletePlaylist(playlist.value._id);
    toastStore.success('Playlist deleted');
    router.push('/');
  } catch (err) {
    toastStore.error(err.response?.data?.message || 'Failed to delete playlist');
  }
};

watch(
  () => route.params.id,
  (newId) => {
    if (newId) loadPlaylistData(newId);
  }
);

onMounted(() => {
  if (route.params.id) {
    loadPlaylistData(route.params.id);
  }
});
</script>

<style scoped>
.playlist-view-wrapper {
  max-width: 1400px;
  margin: 0 auto;
}

.back-nav-bar {
  margin-bottom: 20px;
}

.back-link {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: #9ca3af;
  text-decoration: none;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s;
  padding: 6px 12px;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.03);
}

.back-link:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.loading-state,
.error-state {
  text-align: center;
  padding: 80px 20px;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(255, 255, 255, 0.1);
  border-top-color: #6366f1;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 16px auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}

.error-state h2 {
  font-size: 1.5rem;
  color: #fff;
  margin-bottom: 8px;
}

.error-state p {
  color: #9ca3af;
  margin-bottom: 24px;
}

.btn-home {
  padding: 10px 22px;
  background: #6366f1;
  color: #fff;
  text-decoration: none;
  border-radius: 20px;
  font-weight: 600;
}
</style>
