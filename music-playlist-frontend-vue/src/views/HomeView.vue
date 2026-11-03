<template>
  <div class="home-view-wrapper">
    <!-- Welcome Banner -->
    <header class="home-hero-banner">
      <div class="banner-text">
        <div class="banner-greeting">
          <span>Welcome back,</span>
          <h1>{{ authStore.username }}</h1>
        </div>
        <p class="banner-subtext">
          Manage your playlists, explore curated soundscapes, and keep your audio flowing.
        </p>
      </div>

      <div class="banner-stats">
        <div class="stat-card">
          <span class="stat-num">{{ playlistStore.playlists.length }}</span>
          <span class="stat-label">Playlists</span>
        </div>
        <div class="stat-card">
          <span class="stat-num">{{ playlistStore.totalTracksCount }}</span>
          <span class="stat-label">Tracks</span>
        </div>
      </div>
    </header>

    <!-- Playlist Section Header -->
    <div class="section-bar">
      <div class="section-title-group">
        <h2>Your Library</h2>
        <span class="playlist-subcount" v-if="playlistStore.filteredPlaylists.length">
          {{ playlistStore.filteredPlaylists.length }} {{ playlistStore.filteredPlaylists.length === 1 ? 'playlist' : 'playlists' }}
        </span>
      </div>

      <div class="section-actions">
        <button class="create-btn" @click="showCreateModal = true">
          <span class="plus-icon">+</span>
          <span>New Playlist</span>
        </button>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="playlistStore.isLoading && !playlistStore.playlists.length" class="loading-grid">
      <div v-for="i in 6" :key="i" class="skeleton-card">
        <div class="skeleton-thumb"></div>
        <div class="skeleton-line w-75"></div>
        <div class="skeleton-line w-50"></div>
      </div>
    </div>

    <!-- Empty State (No Playlists) -->
    <div v-else-if="playlistStore.playlists.length === 0" class="empty-library">
      <div class="empty-icon-art">🎧</div>
      <h3>Your collection is empty</h3>
      <p>Start organizing your music by creating your first custom playlist, or generate a starter demo playlist with verified audio.</p>
      <div class="empty-btns">
        <button class="primary-btn" @click="showCreateModal = true">
          + Create Playlist
        </button>
        <button class="demo-seed-btn" :disabled="seeding" @click="seedDemoPlaylist">
          <span v-if="seeding">Setting up...</span>
          <span v-else>✨ Create Starter Playlist</span>
        </button>
      </div>
    </div>

    <!-- Empty Search Filter State -->
    <div v-else-if="playlistStore.filteredPlaylists.length === 0" class="empty-search">
      <p>No playlists match "{{ playlistStore.searchQuery }}"</p>
      <button class="reset-search-btn" @click="playlistStore.searchQuery = ''">Clear Search</button>
    </div>

    <!-- Playlist Grid -->
    <div v-else class="playlists-grid">
      <div
        v-for="playlist in playlistStore.filteredPlaylists"
        :key="playlist._id"
        class="playlist-card"
        @click="goToPlaylist(playlist._id)"
      >
        <div class="card-thumb-wrapper">
          <img
            :src="playlist.coverImage || defaultCover"
            :alt="playlist.name"
            class="card-thumb"
            @error="onImgError"
          />
          <button
            class="card-play-overlay-btn"
            :disabled="!playlist.songs?.length"
            @click.stop="quickPlayPlaylist(playlist)"
            title="Play Playlist"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>
        </div>

        <div class="card-meta">
          <h3 class="card-title" :title="playlist.name">{{ playlist.name }}</h3>
          <p class="card-desc" :title="playlist.description">
            {{ playlist.description || 'No description' }}
          </p>
          <div class="card-footer-info">
            <span class="track-badge">{{ playlist.songs?.length || 0 }} tracks</span>
            <span v-if="playlist.isPublic" class="public-tag">Public</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Create Playlist Modal -->
    <CreatePlaylistModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { usePlaylistStore } from '../stores/playlist';
import { usePlayerStore } from '../stores/player';
import { useToastStore } from '../stores/toast';
import CreatePlaylistModal from '../components/playlists/CreatePlaylistModal.vue';
import { CURATED_DEMO_TRACKS, PLAYLIST_COVER_PRESETS } from '../data/demoTracks';

const router = useRouter();
const authStore = useAuthStore();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();
const toastStore = useToastStore();

const showCreateModal = ref(false);
const seeding = ref(false);
const defaultCover = PLAYLIST_COVER_PRESETS[0].url;

const goToPlaylist = (id) => {
  router.push(`/playlists/${id}`);
};

const quickPlayPlaylist = (playlist) => {
  if (!playlist.songs || !playlist.songs.length) return;
  playerStore.playTrack(playlist.songs[0], playlist.songs, 0);
  toastStore.info(`Playing "${playlist.name}"`);
};

const seedDemoPlaylist = async () => {
  seeding.value = true;
  try {
    const starter = await playlistStore.createPlaylist({
      name: 'Nocturnal Focus Beats',
      description: 'Handcrafted selection of timeless classical and ambient streams.',
      coverImage: PLAYLIST_COVER_PRESETS[1].url,
      isPublic: true,
      songs: CURATED_DEMO_TRACKS,
    });
    toastStore.success('Created starter playlist!');
    router.push(`/playlists/${starter._id}`);
  } catch (err) {
    toastStore.error(err.response?.data?.message || 'Failed to generate starter playlist');
  } finally {
    seeding.value = false;
  }
};

const onImgError = (e) => {
  e.target.src = defaultCover;
};
</script>

<style scoped>
.home-view-wrapper {
  max-width: 1400px;
  margin: 0 auto;
}

/* Banner */
.home-hero-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 24px;
  padding: 32px;
  background: linear-gradient(135deg, rgba(99, 102, 241, 0.12) 0%, rgba(139, 92, 246, 0.05) 100%);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: 20px;
  margin-bottom: 36px;
}

.banner-greeting span {
  font-size: 0.95rem;
  color: #9ca3af;
  font-weight: 500;
}

.banner-greeting h1 {
  font-size: 2.2rem;
  font-weight: 800;
  color: #fff;
  margin: 4px 0 8px 0;
  letter-spacing: -0.5px;
}

.banner-subtext {
  font-size: 0.95rem;
  color: #9ca3af;
  max-width: 560px;
  line-height: 1.5;
}

.banner-stats {
  display: flex;
  gap: 16px;
}

.stat-card {
  padding: 16px 24px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  align-items: center;
  min-width: 100px;
}

.stat-num {
  font-size: 1.8rem;
  font-weight: 800;
  color: #818cf8;
}

.stat-label {
  font-size: 0.75rem;
  color: #9ca3af;
  text-transform: uppercase;
  letter-spacing: 1px;
}

/* Section Bar */
.section-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.section-title-group {
  display: flex;
  align-items: baseline;
  gap: 12px;
}

.section-title-group h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
}

.playlist-subcount {
  font-size: 0.85rem;
  color: #6b7280;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 20px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  box-shadow: 0 4px 15px rgba(99, 102, 241, 0.3);
  transition: all 0.2s;
}

.create-btn:hover {
  background: #4f46e5;
  transform: translateY(-2px);
}

.plus-icon {
  font-size: 1.1rem;
}

/* Grid */
.playlists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 24px;
}

.playlist-card {
  background: rgba(18, 19, 29, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
  display: flex;
  flex-direction: column;
}

.playlist-card:hover {
  background: rgba(24, 26, 40, 0.9);
  transform: translateY(-4px);
  border-color: rgba(99, 102, 241, 0.3);
  box-shadow: 0 12px 30px rgba(0, 0, 0, 0.4);
}

.card-thumb-wrapper {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 12px;
  overflow: hidden;
  margin-bottom: 14px;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.card-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s;
}

.playlist-card:hover .card-thumb {
  transform: scale(1.04);
}

.card-play-overlay-btn {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: #6366f1;
  color: #fff;
  border: none;
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: translateY(10px);
  transition: all 0.25s ease;
  cursor: pointer;
}

.playlist-card:hover .card-play-overlay-btn {
  opacity: 1;
  transform: translateY(0);
}

.card-play-overlay-btn:hover {
  background: #4f46e5;
  transform: scale(1.08) !important;
}

.card-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.card-title {
  font-size: 1rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-desc {
  font-size: 0.82rem;
  color: #9ca3af;
  margin: 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.4;
  height: 38px;
}

.card-footer-info {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid rgba(255, 255, 255, 0.04);
}

.track-badge {
  font-size: 0.75rem;
  color: #6b7280;
}

.public-tag {
  font-size: 0.68rem;
  background: rgba(255, 255, 255, 0.08);
  padding: 1px 6px;
  border-radius: 4px;
  color: #9ca3af;
}

/* Empty States */
.empty-library,
.empty-search {
  text-align: center;
  padding: 60px 20px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 16px;
  border: 1px dashed rgba(255, 255, 255, 0.08);
}

.empty-icon-art {
  font-size: 3rem;
  margin-bottom: 16px;
}

.empty-library h3 {
  font-size: 1.4rem;
  color: #fff;
  margin-bottom: 8px;
}

.empty-library p {
  color: #9ca3af;
  font-size: 0.95rem;
  max-width: 500px;
  margin: 0 auto 24px auto;
  line-height: 1.5;
}

.empty-btns {
  display: flex;
  gap: 14px;
  justify-content: center;
  flex-wrap: wrap;
}

.primary-btn {
  padding: 10px 22px;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
}

.demo-seed-btn {
  padding: 10px 22px;
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 20px;
  font-weight: 600;
  cursor: pointer;
}

.reset-search-btn {
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  padding: 8px 16px;
  border-radius: 8px;
  margin-top: 12px;
  cursor: pointer;
}

/* Skeletons */
.loading-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 24px;
}

.skeleton-card {
  padding: 16px;
  background: rgba(255, 255, 255, 0.02);
  border-radius: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.skeleton-thumb {
  width: 100%;
  aspect-ratio: 1;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
}

.skeleton-line {
  height: 12px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 6px;
}

.w-75 { width: 75%; }
.w-50 { width: 50%; }

@media (max-width: 900px) {
  .home-hero-banner {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
