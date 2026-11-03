<template>
  <div class="pg-playlist-root">
    <!-- Back to Vault Navigation Pill -->
    <div class="back-nav-container">
      <router-link to="/library" class="back-vault-btn font-mono">
        <span class="back-arrow">←</span>
        <span>BACK TO MIXTAPE VAULT</span>
      </router-link>
    </div>

    <!-- Loading State -->
    <div v-if="playlistStore.isLoading && !playlist" class="pg-playlist-loading">
      <div class="loading-soundmark">
        <span></span><span></span><span></span><span></span>
      </div>
      <p class="font-mono">RETRIEVING MIXTAPE MASTER DATA...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="playlistStore.error" class="pg-playlist-error">
      <div class="error-badge font-mono">ARCHIVE UNAVAILABLE</div>
      <h2 class="font-display">Mixtape Inaccessible</h2>
      <p>{{ playlistStore.error }}</p>
      <router-link to="/library" class="back-vault-btn font-mono">Return to Vault</router-link>
    </div>

    <!-- Main Editorial Playlist Stage -->
    <div v-else-if="playlist" class="pg-playlist-stage">
      <!-- 1. Asymmetric Hero Stage -->
      <section class="playlist-hero-card">
        <!-- Left: Physical 12-inch Vinyl Sleeve Showcase -->
        <div class="hero-vinyl-stage">
          <div class="vinyl-sleeve-container">
            <!-- Vinyl Record Disc sliding out -->
            <div
              class="physical-vinyl-disc"
              :class="{ 'is-spinning': isThisPlaylistPlaying }"
            >
              <div class="disc-groove g1"></div>
              <div class="disc-groove g2"></div>
              <div class="disc-center-label">
                <span class="disc-spindle"></span>
              </div>
            </div>

            <!-- Front Sleeve Jacket Cover -->
            <div class="sleeve-jacket">
              <img
                v-if="playlist.coverImage && !imageFailed"
                :src="playlist.coverImage"
                :alt="playlist.name"
                class="sleeve-artwork"
                @error="imageFailed = true"
              />
              <div v-else class="generative-jacket font-display">
                {{ playlistMonogram }}
              </div>
            </div>
          </div>
        </div>

        <!-- Right: Editorial Typographic Title & Meta -->
        <div class="hero-narrative-stage">
          <div class="narrative-kicker font-mono">
            <span class="kicker-badge">CURATED MIXTAPE</span>
            <span class="kicker-index">#{{ playlist.songs?.length || 0 }} AUDIO TRACKS</span>
          </div>

          <h1 class="narrative-title font-display">{{ playlist.name }}</h1>

          <p v-if="playlist.description" class="narrative-description">
            {{ playlist.description }}
          </p>

          <!-- Metrics Ledger -->
          <div class="narrative-ledger font-mono">
            <div class="ledger-item">
              <span class="ledger-label">CURATOR</span>
              <span class="ledger-value font-display">{{ playlist.user?.username || 'Curator' }}</span>
            </div>
            <div class="ledger-item">
              <span class="ledger-label">RUNTIME</span>
              <span class="ledger-value">{{ formattedDuration }}</span>
            </div>
            <div class="ledger-item">
              <span class="ledger-label">AUDIO ENGINE</span>
              <span class="ledger-value accent-cobalt">MULTI-SOURCE</span>
            </div>
          </div>

          <!-- Tactical Action Cluster -->
          <div class="narrative-action-cluster">
            <button
              class="action-btn primary font-display"
              @click="handlePlayAll"
              :disabled="!playlist.songs?.length"
            >
              <span class="btn-glyph">{{ isThisPlaylistPlaying ? '❚❚' : '▶' }}</span>
              <span>{{ isThisPlaylistPlaying ? 'Pause Mixtape' : 'Play Mixtape' }}</span>
            </button>

            <button
              class="action-btn secondary font-mono"
              @click="handleShufflePlay"
              :disabled="!playlist.songs?.length"
              title="Shuffle all tracks"
            >
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="16 3 21 3 21 8"></polyline>
                <line x1="4" y1="20" x2="21" y2="3"></line>
                <polyline points="21 16 21 21 16 21"></polyline>
                <line x1="15" y1="15" x2="21" y2="21"></line>
                <line x1="4" y1="4" x2="9" y2="9"></line>
              </svg>
              <span>Shuffle</span>
            </button>

            <button
              class="action-btn citron font-mono"
              @click="showAddSongModal = true"
            >
              <span class="btn-plus">+</span>
              <span>Add Audio Track</span>
            </button>

            <button
              class="action-btn icon-only"
              @click="showEditModal = true"
              title="Edit Mixtape Details"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>

            <button
              class="action-btn icon-only danger"
              @click="handleDeletePlaylist"
              title="Delete Mixtape"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </section>

      <!-- 2. Acoustic Track Sequence Section -->
      <section class="pg-sequence-section">
        <div class="sequence-header-row">
          <span class="sequence-kicker font-mono">TRACK SEQUENCE</span>
          <h2 class="sequence-heading font-display">Audio Tracklist</h2>
        </div>

        <AcousticTrackStream
          :songs="playlist.songs || []"
          :playlist="playlist"
          @open-add-song="showAddSongModal = true"
          @edit-song="openEditSong"
          @delete-song="handleDeleteSong"
          @reorder-songs="handleReorderSongs"
        />
      </section>

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
        @updated="refreshPlaylist"
      />

      <EditSongModal
        v-if="showEditSongModal"
        :playlist-id="playlist._id"
        :song="editingSong"
        @close="showEditSongModal = false"
        @song-updated="refreshPlaylist"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePlaylistStore } from '../stores/playlist';
import { usePlayerStore } from '../stores/player';
import { useToastStore } from '../stores/toast';

import AcousticTrackStream from '../components/playlists/AcousticTrackStream.vue';
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
const showEditSongModal = ref(false);
const editingSong = ref(null);
const imageFailed = ref(false);

const playlist = computed(() => playlistStore.currentPlaylist);

const playlistMonogram = computed(() => {
  if (!playlist.value?.name) return 'SW';
  return playlist.value.name.slice(0, 2).toUpperCase();
});

const isThisPlaylistPlaying = computed(() => {
  return (
    playerStore.isPlaying &&
    playerStore.currentPlaylistId === playlist.value?._id
  );
});

const formattedDuration = computed(() => {
  if (!playlist.value?.songs?.length) return '0 min';
  const totalSeconds = playlist.value.songs.reduce((acc, song) => {
    return acc + (Number(song.duration) || 0);
  }, 0);
  const minutes = Math.floor(totalSeconds / 60);
  return `${minutes} min`;
});

const handlePlayAll = () => {
  if (!playlist.value?.songs?.length) return;
  if (isThisPlaylistPlaying.value) {
    playerStore.togglePlay();
  } else {
    playerStore.playTrack(playlist.value.songs[0], playlist.value, playlist.value.songs);
    toastStore.info(`Playing ${playlist.value.name}`);
  }
};

const handleShufflePlay = () => {
  if (!playlist.value?.songs?.length) return;
  const songs = [...playlist.value.songs];
  for (let i = songs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [songs[i], songs[j]] = [songs[j], songs[i]];
  }
  playerStore.playTrack(songs[0], playlist.value, songs);
  toastStore.info(`Shuffling ${playlist.value.name}`);
};

const openEditSong = (song) => {
  editingSong.value = song;
  showEditSongModal.value = true;
};

const handleDeleteSong = async (songId) => {
  if (!confirm('Remove this audio track from the mixtape?')) return;
  try {
    await playlistStore.removeSong(playlist.value._id, songId);
    toastStore.success('Track removed from mixtape');
    await refreshPlaylist();
  } catch (err) {
    toastStore.error(err.response?.data?.message || 'Failed to remove track');
  }
};

const handleReorderSongs = async (songIds) => {
  try {
    await playlistStore.reorderSongs(playlist.value._id, songIds);
    toastStore.success('Sequence reordered');
    await refreshPlaylist();
  } catch (err) {
    toastStore.error('Could not save reordered sequence');
  }
};

const handleDeletePlaylist = async () => {
  if (!confirm(`Are you sure you want to delete "${playlist.value.name}"?`)) return;
  try {
    await playlistStore.deletePlaylist(playlist.value._id);
    toastStore.success('Mixtape deleted');
    router.push('/library');
  } catch (err) {
    toastStore.error(err.response?.data?.message || 'Failed to delete mixtape');
  }
};

const refreshPlaylist = async () => {
  const id = route.params.id;
  if (id) {
    await playlistStore.fetchPlaylist(id);
  }
};

onMounted(async () => {
  await refreshPlaylist();
});
</script>

<style scoped>
.pg-playlist-root {
  display: flex;
  flex-direction: column;
  gap: 32px;
  padding-bottom: 40px;
}

/* Back Nav */
.back-nav-container {
  display: flex;
  align-items: center;
}

.back-vault-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: var(--pg-canvas);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  box-shadow: 2px 2px 0px var(--pg-border);
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--pg-ink);
  text-decoration: none;
  transition: all var(--pg-transition-spring);
}

.back-vault-btn:hover {
  background: var(--pg-surface-butter);
  transform: translateY(-2px);
  box-shadow: 3px 3px 0px var(--pg-border);
}

.back-arrow {
  font-size: 0.9rem;
}

/* 1. Hero Card */
.playlist-hero-card {
  background: var(--pg-surface-peach);
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-xl);
  box-shadow: var(--pg-shadow-solid-lg);
  padding: 36px 40px;
  display: grid;
  grid-template-columns: 260px 1fr;
  align-items: center;
  gap: 48px;
}

.hero-vinyl-stage {
  display: flex;
  justify-content: center;
}

.vinyl-sleeve-container {
  position: relative;
  width: 220px;
  height: 220px;
}

.physical-vinyl-disc {
  position: absolute;
  top: 0;
  left: 30px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: #14101E;
  border: 2px solid var(--pg-border);
  box-shadow: var(--pg-shadow-solid);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1;
  transition: transform 400ms var(--pg-ease-spring);
}

.vinyl-sleeve-container:hover .physical-vinyl-disc {
  transform: translateX(45px) rotate(20deg);
}

.physical-vinyl-disc.is-spinning {
  animation: vinylSpin 3s linear infinite;
}

.disc-center-label {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  background: var(--pg-coral);
  border: 2px solid #14101E;
  display: flex;
  align-items: center;
  justify-content: center;
}

.disc-spindle {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #14101E;
}

.sleeve-jacket {
  position: relative;
  width: 220px;
  height: 220px;
  border-radius: var(--pg-radius-md);
  border: 2px solid var(--pg-border);
  box-shadow: var(--pg-shadow-solid);
  overflow: hidden;
  background: var(--pg-canvas);
  z-index: 2;
}

.sleeve-artwork {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.generative-jacket {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3.5rem;
  font-weight: 800;
  background: var(--pg-surface-butter);
  color: var(--pg-cobalt);
}

/* Narrative */
.hero-narrative-stage {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.narrative-kicker {
  display: flex;
  align-items: center;
  gap: 10px;
}

.kicker-badge {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 3px 8px;
  background: var(--pg-ink);
  color: var(--pg-citron);
  border-radius: var(--pg-radius-full);
}

.kicker-index {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--pg-ink-secondary);
}

.narrative-title {
  font-size: clamp(2.2rem, 4.5vw, 3.4rem);
  font-weight: 800;
  color: var(--pg-ink);
  line-height: 1.05;
  letter-spacing: -0.04em;
}

.narrative-description {
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--pg-ink-secondary);
  max-width: 620px;
}

.narrative-ledger {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 16px;
  padding: 10px 16px;
  background: var(--pg-canvas);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-md);
  box-shadow: 2px 2px 0px var(--pg-border);
  font-size: 0.75rem;
  width: fit-content;
}

.ledger-item {
  display: flex;
  align-items: center;
  gap: 6px;
}

.ledger-label {
  color: var(--pg-ink-muted);
  font-weight: 800;
}

.ledger-value {
  font-weight: 800;
  color: var(--pg-ink);
}

.ledger-value.accent-cobalt {
  color: var(--pg-cobalt);
}

/* Action Cluster */
.narrative-action-cluster {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 4px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 11px 22px;
  border-radius: var(--pg-radius-full);
  font-size: 0.9rem;
  font-weight: 800;
  border: 2px solid var(--pg-border);
  cursor: pointer;
  box-shadow: var(--pg-shadow-solid);
  transition: all var(--pg-transition-spring);
}

.action-btn.primary {
  background: var(--pg-cobalt);
  color: #fff;
}

.action-btn.primary:hover:not(:disabled) {
  background: var(--pg-coral);
  transform: translate(-2px, -2px);
  box-shadow: var(--pg-shadow-solid-lg);
}

.action-btn.secondary {
  background: var(--pg-canvas);
  color: var(--pg-ink);
}

.action-btn.secondary:hover:not(:disabled) {
  background: var(--pg-surface-butter);
  transform: translateY(-2px);
  box-shadow: 3px 3px 0px var(--pg-border);
}

.action-btn.citron {
  background: var(--pg-citron);
  color: var(--pg-ink);
}

.action-btn.citron:hover {
  background: var(--pg-coral);
  color: #fff;
  transform: translate(-2px, -2px);
  box-shadow: var(--pg-shadow-solid-lg);
}

.action-btn.icon-only {
  width: 42px;
  height: 42px;
  padding: 0;
  justify-content: center;
  background: var(--pg-canvas);
  color: var(--pg-ink);
}

.action-btn.icon-only:hover {
  background: var(--pg-surface-soft);
  transform: translateY(-2px);
  box-shadow: 3px 3px 0px var(--pg-border);
}

.action-btn.icon-only.danger:hover {
  background: var(--pg-coral);
  color: #fff;
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* Sequence Section */
.pg-sequence-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sequence-header-row {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.sequence-kicker {
  font-size: 0.68rem;
  font-weight: 800;
  color: var(--pg-cobalt);
  letter-spacing: 0.08em;
}

.sequence-heading {
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--pg-ink);
  letter-spacing: -0.03em;
}

@media (max-width: 900px) {
  .playlist-hero-card {
    grid-template-columns: 1fr;
    padding: 24px 20px;
    gap: 24px;
  }

  .hero-vinyl-stage {
    justify-content: flex-start;
  }

  .vinyl-sleeve-container {
    width: 180px;
    height: 180px;
  }

  .physical-vinyl-disc {
    width: 180px;
    height: 180px;
    left: 20px;
  }

  .sleeve-jacket {
    width: 180px;
    height: 180px;
  }
}
</style>
