<template>
  <div class="sw-shell-root">
    <!-- Ambient Reactive Particle & Soundwave Canvas -->
    <AmbientBackdrop />

    <!-- Kinetic Floating Orbital Capsule Navigation -->
    <OrbitalNav @open-create-modal="showCreateModal = true" />

    <!-- Full-Viewport Fluid Spatial Canvas -->
    <main class="sw-canvas-scroller" id="main-scroller">
      <div class="sw-content-stage">
        <slot></slot>
      </div>
    </main>

    <!-- Autonomous Floating Acoustic Capsule Player -->
    <AcousticCapsule />

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
import AmbientBackdrop from '../common/AmbientBackdrop.vue';
import OrbitalNav from '../navigation/OrbitalNav.vue';
import AcousticCapsule from '../player/AcousticCapsule.vue';
import ExpandedPlayer from '../player/ExpandedPlayer.vue';
import QueueDrawer from '../player/QueueDrawer.vue';
import ToastContainer from '../common/ToastContainer.vue';
import CreatePlaylistModal from '../playlists/CreatePlaylistModal.vue';
import { usePlaylistStore } from '../../stores/playlist';
import { useAuthStore } from '../../stores/auth';

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
  width: 100%;
  background: var(--sw-void);
  color: var(--sw-text-primary);
  font-family: var(--sw-font-sans);
  position: relative;
  overflow-x: hidden;
}

.sw-canvas-scroller {
  position: relative;
  z-index: 10;
  min-height: 100vh;
  overflow-y: auto;
  overflow-x: hidden;
  /* Generous vertical clearance for floating orbital nav and bottom acoustic capsule */
  padding-top: 104px;
  padding-bottom: 140px;
  scroll-behavior: smooth;
}

.sw-content-stage {
  width: 100%;
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 32px;
}

@media (max-width: 768px) {
  .sw-canvas-scroller {
    padding-top: 84px;
    padding-bottom: 160px; /* Space for both mobile dock and player capsule */
  }

  .sw-content-stage {
    padding: 0 16px;
  }
}
</style>
