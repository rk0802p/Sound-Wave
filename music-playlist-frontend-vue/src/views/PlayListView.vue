<template>
  <div class="sw-spatial-playlist-view">
    <!-- Back to Archive Navigation Pill -->
    <div class="back-nav-container">
      <router-link to="/library" class="back-pill font-mono">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="19" y1="12" x2="5" y2="12"></line>
          <polyline points="12 19 5 12 12 5"></polyline>
        </svg>
        <span>ARCHIVE LEDGER</span>
      </router-link>
    </div>

    <!-- Loading State -->
    <div v-if="playlistStore.isLoading && !playlist" class="spatial-loading">
      <div class="loading-soundmark">
        <span></span><span></span><span></span><span></span>
      </div>
      <p class="font-mono">RESONATING ARCHIVE DATA...</p>
    </div>

    <!-- Error State -->
    <div v-else-if="playlistStore.error" class="spatial-error">
      <div class="error-badge font-mono">ERR // 404</div>
      <h2 class="font-display">Archive Inaccessible</h2>
      <p>{{ playlistStore.error }}</p>
      <router-link to="/library" class="action-btn font-mono">Return to Archive</router-link>
    </div>

    <!-- Main Spatial Atelier View -->
    <div v-else-if="playlist" class="spatial-atelier-stage">
      <!-- 1. Asymmetric Hero Composition -->
      <section class="atelier-hero-section">
        <!-- Ambient Glow Halo -->
        <div class="hero-halo" :style="haloStyle"></div>

        <!-- Left: Physical 3D Vinyl Sleeve Showcase -->
        <div
          class="hero-vinyl-stage"
          @mousemove="handleHeroMouseMove"
          @mouseleave="handleHeroMouseLeave"
          :style="sleeveTransformStyle"
        >
          <div class="vinyl-sleeve-container">
            <!-- Vinyl Record peeking / sliding out -->
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

            <!-- Sleeve Front Cover with Fallback -->
            <div class="sleeve-jacket">
              <img
                v-if="playlist.coverImage && !imageFailed"
                :src="playlist.coverImage"
                :alt="playlist.name"
                class="sleeve-artwork"
                @error="imageFailed = true"
              />
              <div v-else class="generative-jacket" :style="generativeJacketStyle">
                <div class="jacket-geometry">
                  <svg viewBox="0 0 100 100" class="jacket-svg">
                    <circle cx="50" cy="50" r="40" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="4 2" />
                    <circle cx="50" cy="50" r="24" fill="none" stroke="currentColor" stroke-width="2" />
                    <circle cx="50" cy="50" r="8" fill="currentColor" />
                  </svg>
                </div>
                <span class="jacket-monogram font-display">{{ playlistMonogram }}</span>
              </div>

              <!-- Sleeve Lighting Highlight -->
              <div class="sleeve-sheen"></div>
            </div>
          </div>
        </div>

        <!-- Right: Editorial Typographic Title & Meta -->
        <div class="hero-narrative-stage">
          <div class="narrative-kicker font-mono">
            <span class="kicker-pill">ATELIER COLLECTION</span>
            <span class="kicker-index">#{{ playlist.songs?.length || 0 }} FREQUENCIES</span>
          </div>

          <h1 class="narrative-title font-display">{{ playlist.name }}</h1>

          <p v-if="playlist.description" class="narrative-description">
            {{ playlist.description }}
          </p>

          <!-- Metrics Ledger -->
          <div class="narrative-ledger font-mono">
            <div class="ledger-item">
              <span class="ledger-label">CURATOR</span>
              <span class="ledger-value">{{ playlist.user?.username || 'Curator' }}</span>
            </div>
            <div class="ledger-item">
              <span class="ledger-label">RUNTIME</span>
              <span class="ledger-value">{{ formattedDuration }}</span>
            </div>
            <div class="ledger-item">
              <span class="ledger-label">SOUND FORMAT</span>
              <span class="ledger-value accent">MULTI-FIDELITY</span>
            </div>
          </div>

          <!-- Tactical Action Cluster -->
          <div class="narrative-action-cluster">
            <button
              class="action-btn primary-resonance font-display"
              @click="handlePlayAll"
              :disabled="!playlist.songs?.length"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 3 20 12 6 21 6 3"></polygon>
              </svg>
              <span>{{ isThisPlaylistPlaying ? 'Pause Orbit' : 'Drop The Needle' }}</span>
            </button>

            <button
              class="action-btn secondary-glass font-mono"
              @click="handleShufflePlay"
              :disabled="!playlist.songs?.length"
              title="Shuffle all tracks"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="16 3 21 3 21 8"></polyline>
                <line x1="4" y1="20" x2="21" y2="3"></line>
                <polyline points="21 16 21 21 16 21"></polyline>
                <line x1="15" y1="15" x2="21" y2="21"></line>
                <line x1="4" y1="4" x2="9" y2="9"></line>
              </svg>
              <span>Shuffle</span>
            </button>

            <button
              class="action-btn outline-accent font-mono"
              @click="showAddSongModal = true"
            >
              <span class="btn-plus">+</span>
              <span>Inject Frequency</span>
            </button>

            <button
              class="action-btn icon-only"
              @click="showEditModal = true"
              title="Edit Collection Details"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
              </svg>
            </button>

            <button
              class="action-btn icon-only danger"
              @click="handleDeletePlaylist"
              title="Decommission Atelier"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"></polyline>
                <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
              </svg>
            </button>
          </div>
        </div>
      </section>

      <!-- 2. Acoustic Track Sequence (Replaces SongTable) -->
      <section class="atelier-sequence-section">
        <div class="sequence-header-row">
          <span class="sequence-kicker font-mono">ACOUSTIC STREAM</span>
          <h2 class="sequence-heading font-display">Frequency Sequence</h2>
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
        @playlist-updated="refreshPlaylist"
      />

      <EditSongModal
        v-if="selectedSongForEdit"
        :playlist-id="playlist._id"
        :song="selectedSongForEdit"
        @close="selectedSongForEdit = null"
        @song-updated="refreshPlaylist"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue';
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
const selectedSongForEdit = ref(null);
const imageFailed = ref(false);

const mouseTiltX = ref(0);
const mouseTiltY = ref(0);

const playlist = computed(() => playlistStore.currentPlaylist);

const isThisPlaylistPlaying = computed(() => {
  return (
    playerStore.isPlaying &&
    playerStore.currentPlaylistId === playlist.value?._id
  );
});

const playlistMonogram = computed(() => {
  if (!playlist.value?.name) return 'SW';
  return playlist.value.name.slice(0, 2).toUpperCase();
});

const formattedDuration = computed(() => {
  const songs = playlist.value?.songs || [];
  const total = songs.reduce((acc, s) => acc + (s.duration || 0), 0);
  if (total === 0) return '0 min';
  const m = Math.floor(total / 60);
  if (m >= 60) {
    const hrs = Math.floor(m / 60);
    const remM = m % 60;
    return `${hrs}h ${remM}m`;
  }
  return `${m} min`;
});

const generativeJacketStyle = computed(() => {
  const name = playlist.value?.name || 'Soundwave';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 45) % 360;
  return {
    background: `linear-gradient(135deg, hsl(${hue1}, 70%, 15%) 0%, hsl(${hue2}, 60%, 8%) 100%)`,
    color: `hsl(${hue1}, 80%, 65%)`,
  };
});

const haloStyle = computed(() => {
  const name = playlist.value?.name || 'Soundwave';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  return {
    background: `radial-gradient(circle at 40% 40%, hsla(${hue}, 80%, 55%, 0.18) 0%, transparent 70%)`,
  };
});

const sleeveTransformStyle = computed(() => {
  return {
    transform: `perspective(1000px) rotateY(${mouseTiltX.value}deg) rotateX(${-mouseTiltY.value}deg)`,
  };
});

const handleHeroMouseMove = (e) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = (e.clientX - rect.left) / rect.width - 0.5;
  const y = (e.clientY - rect.top) / rect.height - 0.5;
  mouseTiltX.value = x * 14;
  mouseTiltY.value = y * 14;
};

const handleHeroMouseLeave = () => {
  mouseTiltX.value = 0;
  mouseTiltY.value = 0;
};

const loadPlaylistData = async (id) => {
  if (!id) return;
  try {
    imageFailed.value = false;
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
  if (isThisPlaylistPlaying.value) {
    playerStore.togglePlay();
  } else {
    playerStore.playTrack(playlist.value.songs[0], playlist.value, playlist.value.songs);
    toastStore.info(`Resonating "${playlist.value.name}"`);
  }
};

const handleShufflePlay = () => {
  if (!playlist.value?.songs?.length) return;
  playerStore.shuffle = true;
  const randomIndex = Math.floor(Math.random() * playlist.value.songs.length);
  playerStore.playTrack(playlist.value.songs[randomIndex], playlist.value, playlist.value.songs);
  toastStore.info(`Shuffling "${playlist.value.name}"`);
};

const openEditSong = (song) => {
  selectedSongForEdit.value = song;
};

const handleDeleteSong = async (song) => {
  if (!confirm(`Are you sure you want to remove "${song.title}" from this atelier?`)) {
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
  } catch {
    toastStore.error('Failed to update song order');
  }
};

const handleDeletePlaylist = async () => {
  if (!confirm(`Are you sure you want to delete "${playlist.value?.name}"? This action cannot be undone.`)) {
    return;
  }
  try {
    await playlistStore.deletePlaylist(playlist.value._id);
    toastStore.success('Playlist decommissioned');
    router.push('/library');
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
.sw-spatial-playlist-view {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 36px;
  position: relative;
}

.back-nav-container {
  display: flex;
  align-items: center;
}

.back-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--sw-radius-full);
  color: var(--sw-text-secondary);
  font-size: 11px;
  letter-spacing: 0.08em;
  transition: all var(--sw-transition-fast);
}

.back-pill:hover {
  color: #fff;
  border-color: rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.08);
  transform: translateX(-2px);
}

/* Loading & Error States */
.spatial-loading,
.spatial-error {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 100px 24px;
  gap: 16px;
  text-align: center;
}

.loading-soundmark {
  display: flex;
  gap: 4px;
  height: 24px;
  align-items: flex-end;
}

.loading-soundmark span {
  width: 4px;
  background: var(--sw-accent);
  border-radius: 2px;
  animation: eq-bounce 0.8s ease-in-out infinite alternate;
}

.loading-soundmark span:nth-child(1) { height: 10px; }
.loading-soundmark span:nth-child(2) { height: 22px; animation-delay: 0.2s; }
.loading-soundmark span:nth-child(3) { height: 14px; animation-delay: 0.4s; }
.loading-soundmark span:nth-child(4) { height: 20px; animation-delay: 0.1s; }

/* 1. Asymmetric Hero Composition */
.atelier-hero-section {
  position: relative;
  display: grid;
  grid-template-columns: 320px 1fr;
  gap: 48px;
  align-items: center;
  padding: 40px;
  background: rgba(13, 16, 23, 0.45);
  backdrop-filter: blur(28px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--sw-radius-xl);
  overflow: hidden;
}

.hero-halo {
  position: absolute;
  inset: -50px;
  pointer-events: none;
  z-index: 0;
  transition: background 0.6s ease;
}

/* 3D Vinyl Sleeve Showcase */
.hero-vinyl-stage {
  position: relative;
  z-index: 1;
  transition: transform 0.2s cubic-bezier(0.16, 1, 0.3, 1);
  transform-style: preserve-3d;
}

.vinyl-sleeve-container {
  position: relative;
  width: 260px;
  height: 260px;
  margin: 0 auto;
}

.physical-vinyl-disc {
  position: absolute;
  top: 10px;
  left: 30px;
  width: 240px;
  height: 240px;
  border-radius: 50%;
  background: radial-gradient(circle at center, #222 15%, #080808 60%, #161616 100%);
  border: 1px solid rgba(255, 255, 255, 0.18);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.7);
  z-index: 1;
  transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
}

.vinyl-sleeve-container:hover .physical-vinyl-disc {
  transform: translateX(45px) rotate(15deg);
}

.physical-vinyl-disc.is-spinning {
  animation: spin-vinyl 4s linear infinite;
}

.disc-groove {
  position: absolute;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.14);
}
.disc-groove.g1 { inset: 24px; }
.disc-groove.g2 { inset: 50px; }

.disc-center-label {
  position: absolute;
  inset: 78px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--sw-accent), var(--sw-warm));
  display: flex;
  align-items: center;
  justify-content: center;
}

.disc-spindle {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #060709;
}

/* Sleeve Jacket */
.sleeve-jacket {
  position: absolute;
  inset: 0;
  border-radius: var(--sw-radius-md);
  overflow: hidden;
  box-shadow: 0 20px 45px -8px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.08);
  z-index: 2;
  background: #0d1017;
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
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
}

.jacket-geometry {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.3;
}

.jacket-svg {
  width: 140px;
  height: 140px;
}

.jacket-monogram {
  font-size: 56px;
  font-weight: 800;
  letter-spacing: -0.04em;
  z-index: 1;
}

.sleeve-sheen {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.12) 0%, transparent 60%);
  pointer-events: none;
}

/* Right: Narrative Stage */
.hero-narrative-stage {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.narrative-kicker {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
}

.kicker-pill {
  padding: 2px 8px;
  background: rgba(204, 255, 0, 0.12);
  border: 1px solid rgba(204, 255, 0, 0.35);
  color: var(--sw-accent);
  border-radius: var(--sw-radius-full);
}

.kicker-index {
  color: var(--sw-text-muted);
}

.narrative-title {
  font-size: clamp(32px, 4.5vw, 52px);
  font-weight: 800;
  line-height: 1.05;
  color: #fff;
  letter-spacing: -0.03em;
}

.narrative-description {
  font-size: 15px;
  color: var(--sw-text-secondary);
  line-height: 1.6;
  max-width: 600px;
}

.narrative-ledger {
  display: flex;
  align-items: center;
  gap: 24px;
  padding: 12px 18px;
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--sw-radius-md);
  width: fit-content;
}

.ledger-item {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.ledger-label {
  font-size: 9px;
  color: var(--sw-text-muted);
  letter-spacing: 0.1em;
}

.ledger-value {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.ledger-value.accent {
  color: var(--sw-accent);
}

/* Tactical Actions */
.narrative-action-cluster {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 22px;
  border-radius: var(--sw-radius-full);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.action-btn.primary-resonance {
  background: linear-gradient(135deg, var(--sw-accent), var(--sw-warm));
  color: #060709;
  box-shadow: 0 0 24px rgba(204, 255, 0, 0.4);
}

.action-btn.primary-resonance:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 0 32px rgba(204, 255, 0, 0.6);
}

.action-btn.secondary-glass {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
}

.action-btn.secondary-glass:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
}

.action-btn.outline-accent {
  background: transparent;
  border: 1px solid rgba(204, 255, 0, 0.35);
  color: var(--sw-accent);
}

.action-btn.outline-accent:hover {
  background: rgba(204, 255, 0, 0.1);
  border-color: var(--sw-accent);
}

.action-btn.icon-only {
  width: 42px;
  height: 42px;
  padding: 0;
  justify-content: center;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--sw-text-secondary);
}

.action-btn.icon-only:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.1);
}

.action-btn.icon-only.danger:hover {
  color: var(--sw-danger);
  border-color: var(--sw-danger);
  background: rgba(244, 63, 94, 0.12);
}

.action-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

/* 2. Sequence Section */
.atelier-sequence-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sequence-header-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.sequence-kicker {
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--sw-text-muted);
}

.sequence-heading {
  font-size: 24px;
  font-weight: 700;
  color: #fff;
}

@media (max-width: 900px) {
  .atelier-hero-section {
    grid-template-columns: 1fr;
    padding: 24px;
    gap: 28px;
    text-align: center;
  }
  .narrative-ledger {
    margin: 0 auto;
  }
  .narrative-action-cluster {
    justify-content: center;
  }
  .narrative-kicker {
    justify-content: center;
  }
}
</style>
