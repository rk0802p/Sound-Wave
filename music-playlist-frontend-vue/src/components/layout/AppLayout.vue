<template>
  <div class="app-layout-shell">
    <!-- Sidebar -->
    <Sidebar
      :is-open="sidebarOpen"
      @close="sidebarOpen = false"
      @open-create-modal="showCreateModal = true"
    />

    <!-- Main Content Area -->
    <div class="main-viewport">
      <TopBar @toggle-sidebar="sidebarOpen = !sidebarOpen" />
      
      <main class="content-scroll-container">
        <slot></slot>
      </main>
    </div>

    <!-- Persistent Bottom Audio Player -->
    <AudioPlayer />

    <!-- Expanded Now Playing Modal -->
    <ExpandedPlayer />

    <!-- Queue Slide-out Drawer -->
    <QueueDrawer />

    <!-- Global Toast Container -->
    <ToastContainer />

    <!-- Global Create Playlist Modal -->
    <CreatePlaylistModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import Sidebar from './Sidebar.vue';
import TopBar from './TopBar.vue';
import AudioPlayer from '../player/AudioPlayer.vue';
import ExpandedPlayer from '../player/ExpandedPlayer.vue';
import QueueDrawer from '../player/QueueDrawer.vue';
import ToastContainer from '../common/ToastContainer.vue';
import CreatePlaylistModal from '../playlists/CreatePlaylistModal.vue';
import { usePlaylistStore } from '../../stores/playlist';
import { useAuthStore } from '../../stores/auth';

const sidebarOpen = ref(false);
const showCreateModal = ref(false);

const playlistStore = usePlaylistStore();
const authStore = useAuthStore();

onMounted(async () => {
  if (authStore.isAuthenticated) {
    try {
      await playlistStore.fetchPlaylists();
    } catch (e) {
      console.warn('Initial playlist fetch skipped or failed:', e);
    }
  }
});
</script>

<style scoped>
.app-layout-shell {
  min-height: 100vh;
  display: flex;
  background: #0a0b10;
  color: #fff;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  overflow: hidden;
}

.main-viewport {
  flex: 1;
  margin-left: 260px;
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: relative;
  background: radial-gradient(circle at 10% 20%, rgba(99, 102, 241, 0.08) 0%, transparent 40%),
              radial-gradient(circle at 90% 80%, rgba(139, 92, 246, 0.05) 0%, transparent 40%),
              #0a0b10;
}

.content-scroll-container {
  flex: 1;
  overflow-y: auto;
  padding: 28px 36px 120px 36px; /* 120px padding bottom prevents overlap with persistent player */
  height: calc(100vh - 72px);
}

@media (max-width: 900px) {
  .main-viewport {
    margin-left: 0;
  }
  .content-scroll-container {
    padding: 20px 16px 120px 16px;
  }
}
</style>
