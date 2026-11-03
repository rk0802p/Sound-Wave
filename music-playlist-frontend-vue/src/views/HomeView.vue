<template>
  <div class="sw-dashboard-view">
    <!-- Editorial Greeting Section -->
    <GreetingSection
      :username="authStore.username"
      :playlist-count="playlistStore.playlists.length"
      :track-count="playlistStore.totalTracksCount"
    />

    <!-- Featured Playlist Banner (Only when user has playlists) -->
    <section v-if="featuredPlaylist" class="dashboard-featured-section">
      <FeaturedPlaylist :playlist="featuredPlaylist" />
    </section>

    <!-- Curated Sonic Moods & Frequencies Portal -->
    <section class="mood-exploration-section">
      <div class="section-title-row">
        <span class="section-kicker font-mono">CURATED FREQUENCIES</span>
        <h3 class="section-heading font-display">Acoustic Atmospheres</h3>
      </div>
      <div class="mood-tiles-grid">
        <div
          v-for="vibe in quickVibes"
          :key="vibe.name"
          class="mood-tile"
          @click="handleVibeClick(vibe.query)"
        >
          <div class="mood-tile-glow" :style="{ background: vibe.color }"></div>
          <span class="mood-tile-icon">{{ vibe.icon }}</span>
          <div class="mood-tile-text">
            <span class="mood-name font-display">{{ vibe.name }}</span>
            <span class="mood-sub">{{ vibe.desc }}</span>
          </div>
        </div>
      </div>
    </section>

    <!-- Main Playlists Collection Grid -->
    <section class="dashboard-collection-section">
      <div class="section-top-bar">
        <div class="section-titles">
          <span class="section-kicker font-mono">YOUR ARCHIVE</span>
          <h2 class="section-heading font-display">Playlists</h2>
          <span class="section-count-badge font-mono" v-if="playlistStore.playlists.length">
            {{ playlistStore.playlists.length }} {{ playlistStore.playlists.length === 1 ? 'collection' : 'collections' }}
          </span>
        </div>

        <div class="section-actions">
          <AppButton
            variant="primary"
            size="md"
            @click="showCreateModal = true"
          >
            <template #icon-left>+</template>
            Create Playlist
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
        <div class="empty-icon-art">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M9 18V5l12-2v13"></path>
            <circle cx="6" cy="18" r="3"></circle>
            <circle cx="18" cy="16" r="3"></circle>
          </svg>
        </div>
        <h3 class="empty-title font-display">Your sound atelier is silent.</h3>
        <p class="empty-desc">
          Create your first custom playlist, or generate a starter collection with verified high-fidelity playable audio.
        </p>
        <div class="empty-btn-group">
          <AppButton
            variant="primary"
            size="lg"
            @click="showCreateModal = true"
          >
            <template #icon-left>+</template>
            Create First Playlist
          </AppButton>

          <AppButton
            variant="warm"
            size="lg"
            :loading="seeding"
            @click="seedStarterPlaylist"
          >
            ✨ Generate Starter Archive
          </AppButton>
        </div>
      </div>

      <!-- Populated Playlists Grid -->
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

const quickVibes = [
  { name: 'Late Night Lo-Fi', desc: 'Analog tape warmth', icon: '🌙', query: 'Lo-Fi', color: 'rgba(56, 189, 248, 0.2)' },
  { name: 'Deep Space Ambient', desc: 'Infinite reverberations', icon: '🌌', query: 'Ambient', color: 'rgba(168, 85, 247, 0.2)' },
  { name: 'Velvet Midnight Jazz', desc: 'Acoustic brass & smoke', icon: '🎷', query: 'Jazz', color: 'rgba(245, 158, 11, 0.2)' },
  { name: 'Retro Synthwave', desc: '80s analog neon pulse', icon: '⚡', query: 'Synthwave', color: 'rgba(244, 63, 94, 0.2)' },
];

const handleVibeClick = (query) => {
  router.push({ path: '/search', query: { q: query } });
};

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
      name: 'Nocturnal Resonance Atelier',
      description: 'Handcrafted selection of verified high-fidelity ambient, classical, and electronic audio streams.',
      coverImage: PLAYLIST_COVER_PRESETS[1].url,
      isPublic: true,
      songs: CURATED_DEMO_TRACKS,
    });
    toastStore.success('Generated starter playlist with playable lossless audio!');
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
  gap: 36px;
}

.dashboard-featured-section {
  width: 100%;
}

/* Mood Tiles */
.mood-exploration-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-kicker {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--sw-accent);
  letter-spacing: 0.12em;
}

.section-heading {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--sw-text-primary);
  letter-spacing: -0.02em;
}

.mood-tiles-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.mood-tile {
  position: relative;
  overflow: hidden;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-lg);
  padding: 16px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.mood-tile:hover {
  background: var(--sw-surface-hover);
  border-color: var(--sw-border-hover);
  transform: translateY(-2px);
}

.mood-tile-glow {
  position: absolute;
  top: -20px;
  right: -20px;
  width: 80px;
  height: 80px;
  border-radius: 50%;
  filter: blur(24px);
  pointer-events: none;
}

.mood-tile-icon {
  font-size: 1.6rem;
}

.mood-tile-text {
  display: flex;
  flex-direction: column;
}

.mood-name {
  font-size: 0.92rem;
  font-weight: 700;
  color: var(--sw-text-primary);
}

.mood-sub {
  font-size: 0.74rem;
  color: var(--sw-text-secondary);
}

/* Collections Grid Section */
.dashboard-collection-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-top-bar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.section-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.section-count-badge {
  font-size: 0.75rem;
  color: var(--sw-text-muted);
}

.cards-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 24px;
}

/* Skeletons */
.skeleton-card {
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-xl);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-thumb {
  width: 100%;
  aspect-ratio: 1;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.07), rgba(255, 255, 255, 0.02));
  background-size: 200% 100%;
  border-radius: var(--sw-radius-md);
  animation: swShimmer 1.8s infinite;
}

.skeleton-text {
  height: 14px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 4px;
}

.w-75 { width: 75%; }
.w-40 { width: 40%; }

@keyframes swShimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Empty State */
.sw-empty-library {
  text-align: center;
  padding: 64px 28px;
  background: var(--sw-surface);
  border: 1px dashed var(--sw-border);
  border-radius: var(--sw-radius-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
}

.empty-icon-art {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  background: rgba(56, 189, 248, 0.08);
  border: 1px solid rgba(56, 189, 248, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sw-accent);
  margin-bottom: 16px;
}

.empty-title {
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--sw-text-primary);
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 0.92rem;
  color: var(--sw-text-secondary);
  max-width: 480px;
  margin-bottom: 28px;
  line-height: 1.5;
}

.empty-btn-group {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  flex-wrap: wrap;
}
</style>
