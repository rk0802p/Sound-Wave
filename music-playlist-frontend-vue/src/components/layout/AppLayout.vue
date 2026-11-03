<template>
  <div class="sw-shell-root">
    <!-- Sidebar Navigation -->
    <Sidebar
      :is-open="sidebarOpen"
      @close="sidebarOpen = false"
      @open-create-modal="showCreateModal = true"
    />

    <!-- Main Viewport Area -->
    <div class="sw-main-viewport">
      <!-- Top Bar -->
      <TopBar @toggle-sidebar="sidebarOpen = !sidebarOpen" />

      <!-- Scrollable Main Routed Content -->
      <main class="sw-content-scroller" id="main-scroller">
        <slot></slot>
      </main>
    </div>

    <!-- Persistent Bottom Player Bar -->
    <AudioPlayer />

    <!-- Expanded Immersive Listening Room -->
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
.sw-shell-root {
  min-height: 100vh;
  display: flex;
  background: var(--sw-bg);
  color: var(--sw-text-primary);
  font-family: inherit;
  overflow: hidden;
  position: relative;
}

.sw-main-viewport {
  flex: 1;
  margin-left: var(--sw-sidebar-width);
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  position: relative;
  background: var(--sw-bg);
  transition: margin-left var(--sw-transition-normal);
}

.sw-content-scroller {
  flex: 1;
  overflow-y: auto;
  padding: 32px 36px calc(var(--sw-player-height) + 40px) 36px;
  height: calc(100vh - var(--sw-topbar-height));
  scroll-behavior: smooth;
}

@media (max-width: 900px) {
  .sw-main-viewport {
    margin-left: 0;
  }

  .sw-content-scroller {
    padding: 20px 16px calc(var(--sw-player-height) + 48px) 16px;
  }
}
</style>
