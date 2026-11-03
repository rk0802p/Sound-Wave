<template>
  <div class="sw-dashboard-view">
    <!-- Greeting Section -->
    <GreetingSection
      :username="authStore.username"
      :playlist-count="playlistStore.playlists.length"
      :track-count="playlistStore.totalTracksCount"
    />

    <!-- Featured Playlist Banner (Only when playlists exist) -->
    <section v-if="featuredPlaylist" class="dashboard-featured-section">
      <FeaturedPlaylist :playlist="featuredPlaylist" />
    </section>

    <!-- Main Collection Section -->
    <section class="dashboard-collection-section">
      <div class="section-top-bar">
        <div class="section-titles">
          <h2 class="section-heading">Your Playlists</h2>
          <span class="section-count-badge" v-if="playlistStore.playlists.length">
            {{ playlistStore.playlists.length }} {{ playlistStore.playlists.length === 1 ? 'playlist' : 'playlists' }}
          </span>
        </div>

        <div class="section-actions">
          <AppButton
            variant="primary"
            size="md"
            @click="showCreateModal = true"
          >
            <template #icon-left>+</template>
            New Playlist
          </AppButton>
        </div>
      </div>

      <!-- Skeletons while loading -->
      <div v-if="playlistStore.isLoading && !playlistStore.playlists.length" class="cards-grid">
        <div v-for="i in 6" :key="i" class="skeleton-card">
          <div class="skeleton-thumb"></div>
          <div class="skeleton-text w-75"></div>
          <div class="skeleton-text w-40"></div>
        </div>
      </div>

      <!-- Empty State -->
      <div v-else-if="playlistStore.playlists.length === 0" class="sw-empty-library">
        <div class="empty-icon-art">🎧</div>
        <h3 class="empty-title">Your library starts here.</h3>
        <p class="empty-desc">
          Create your first custom playlist, or generate a starter collection with verified playable audio.
        </p>
        <div class="empty-btn-group">
          <AppButton
            variant="primary"
            size="md"
            @click="showCreateModal = true"
          >
            + Create Playlist
          </AppButton>

          <AppButton
            variant="secondary"
            size="md"
            :loading="seeding"
            @click="seedStarterPlaylist"
          >
            ✨ Create Starter Playlist
          </AppButton>
        </div>
      </div>

      <!-- Playlists Cards Grid -->
      <div v-else class="cards-grid">
        <PlaylistCard
          v-for="(playlist, index) in playlistStore.playlists"
          :key="playlist._id"
          :playlist="playlist"
          :index="index"
        />
      </div>
    </section>

    <!-- Create Playlist Modal -->
    <CreatePlaylistModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { usePlaylistStore } from '../stores/playlist';
import { useToastStore } from '../stores/toast';
import GreetingSection from '../components/dashboard/GreetingSection.vue';
import FeaturedPlaylist from '../components/dashboard/FeaturedPlaylist.vue';
import PlaylistCard from '../components/dashboard/PlaylistCard.vue';
import AppButton from '../components/common/AppButton.vue';
import CreatePlaylistModal from '../components/playlists/CreatePlaylistModal.vue';
import { CURATED_DEMO_TRACKS, PLAYLIST_COVER_PRESETS } from '../data/demoTracks';

const router = useRouter();
const authStore = useAuthStore();
const playlistStore = usePlaylistStore();
const toastStore = useToastStore();

const showCreateModal = ref(false);
const seeding = ref(false);

// Deterministic featured playlist: first playlist that has tracks, or the first playlist
const featuredPlaylist = computed(() => {
  if (!playlistStore.playlists.length) return null;
  const withSongs = playlistStore.playlists.find((p) => p.songs && p.songs.length > 0);
  return withSongs || playlistStore.playlists[0];
});

const seedStarterPlaylist = async () => {
  seeding.value = true;
  try {
    const starter = await playlistStore.createPlaylist({
      name: 'Nocturnal Focus Beats',
      description: 'Handcrafted selection of timeless classical and ambient audio streams.',
      coverImage: PLAYLIST_COVER_PRESETS[1].url,
      isPublic: true,
      songs: CURATED_DEMO_TRACKS,
    });
    toastStore.success('Created starter playlist with playable audio!');
    router.push(`/playlists/${starter._id}`);
  } catch (err) {
    toastStore.error(err.response?.data?.message || 'Failed to generate starter playlist');
  } finally {
    seeding.value = false;
  }
};
</script>

<style scoped>
.sw-dashboard-view {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.dashboard-featured-section {
  width: 100%;
}

.dashboard-collection-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-top-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.section-titles {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.section-heading {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--sw-text-primary);
  letter-spacing: -0.3px;
}

.section-count-badge {
  font-size: 0.82rem;
  color: var(--sw-text-muted);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 22px;
}

/* Skeletons */
.skeleton-card {
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-md);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-thumb {
  width: 100%;
  aspect-ratio: 1;
  background: var(--sw-surface-hover);
  border-radius: var(--sw-radius-sm);
  animation: pulse 1.4s infinite;
}

.skeleton-text {
  height: 14px;
  background: var(--sw-surface-hover);
  border-radius: 4px;
  animation: pulse 1.4s infinite;
}

.w-75 { width: 75%; }
.w-40 { width: 40%; }

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

/* Empty State */
.sw-empty-library {
  text-align: center;
  padding: 64px 24px;
  background: var(--sw-surface);
  border: 1px dashed var(--sw-border);
  border-radius: var(--sw-radius-lg);
}

.empty-icon-art {
  font-size: 3rem;
  margin-bottom: 12px;
}

.empty-title {
  font-size: 1.35rem;
  font-weight: 700;
  color: var(--sw-text-primary);
  margin-bottom: 6px;
}

.empty-desc {
  font-size: 0.88rem;
  color: var(--sw-text-secondary);
  max-width: 440px;
  margin: 0 auto 24px auto;
  line-height: 1.5;
}

.empty-btn-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 14px;
  flex-wrap: wrap;
}
</style>
