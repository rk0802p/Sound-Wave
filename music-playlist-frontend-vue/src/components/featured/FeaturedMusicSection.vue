<template>
  <section class="pg-discover-section">
    <!-- Header with Title and Refresh Action -->
    <div class="discover-masthead">
      <div class="masthead-left">
        <div class="discover-kicker font-mono">
          <span class="kicker-pill">CURATED STEREO PICKS</span>
          <span class="kicker-counter font-mono">{{ displayedTracks.length }} TRACKS</span>
        </div>
        <h3 class="discover-title font-display">Discover</h3>
        <p class="discover-subtitle font-mono">A fresh selection of music</p>
      </div>

      <div class="masthead-actions">
        <button
          class="btn-refresh font-mono"
          @click="refreshSelection"
          :title="'Refresh curated selection (' + FEATURED_SONGS.length + ' available)'"
        >
          <span class="refresh-icon" :class="{ 'is-spinning': isRefreshing }">↻</span>
          <span>REFRESH SELECTION</span>
        </button>
      </div>
    </div>

    <!-- Featured Tracks Grid -->
    <div class="discover-grid">
      <div
        v-for="(track, idx) in displayedTracks"
        :key="track._id || track.id || idx"
        class="track-card"
        :class="{ 'is-playing': isCurrentTrack(track) && playerStore.isPlaying, 'is-active': isCurrentTrack(track) }"
      >
        <!-- Artwork & Quick Play Overlay -->
        <div class="card-art-box" @click="handlePlayTrack(track, idx)">
          <img
            v-if="track.coverImage || track.artwork"
            :src="track.coverImage || track.artwork"
            :alt="track.title"
            class="card-img"
            loading="lazy"
          />
          <div v-else class="card-fallback font-display">
            {{ track.title?.slice(0, 2).toUpperCase() || 'SW' }}
          </div>

          <!-- Play / Pause Overlay Button -->
          <button
            class="art-play-btn font-mono"
            :class="{ 'is-active': isCurrentTrack(track) && playerStore.isPlaying }"
            :aria-label="isCurrentTrack(track) && playerStore.isPlaying ? 'Pause' : 'Play ' + track.title"
            @click.stop="handlePlayTrack(track, idx)"
          >
            <span v-if="isCurrentTrack(track) && playerStore.isPlaying">❚❚</span>
            <span v-else>▶</span>
          </button>

          <!-- Waveform Indicator when playing -->
          <div v-if="isCurrentTrack(track) && playerStore.isPlaying" class="playing-bars">
            <span class="bar bar-1"></span>
            <span class="bar bar-2"></span>
            <span class="bar bar-3"></span>
          </div>
        </div>

        <!-- Track Information & Metadata -->
        <div class="card-details">
          <div class="card-header-row">
            <span class="genre-tag font-mono">{{ track.genre }}</span>
            <span class="duration-tag font-mono tabular-nums">{{ formatDuration(track.duration) }}</span>
          </div>

          <h4
            class="track-title font-display"
            :title="track.title"
            @click="handlePlayTrack(track, idx)"
          >
            {{ track.title }}
          </h4>

          <div class="track-artist-row font-mono">
            <span class="track-artist" :title="track.artist">{{ track.artist }}</span>
            <span v-if="track.mood" class="track-mood">• {{ track.mood }}</span>
          </div>

          <!-- License & Attribution Info Strip -->
          <div class="license-strip">
            <button
              class="license-badge font-mono"
              @click.stop="openLicenseModal(track)"
              :title="'License & Source details for ' + track.title"
            >
              <span class="license-icon">⚖</span>
              <span>{{ track.license?.badge || 'OPEN LICENSE' }}</span>
              <span class="info-glyph">ⓘ</span>
            </button>
          </div>

          <!-- Bottom Actions: Add to Mixtape -->
          <div class="card-actions-row">
            <button
              class="btn-add-mixtape font-mono"
              @click.stop="openAddModal(track)"
              title="Add this track to one of your mixtapes"
            >
              <span>+ ADD TO MIXTAPE</span>
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- License & Attribution Modal -->
    <div
      v-if="selectedLicenseTrack"
      class="modal-backdrop"
      @click.self="selectedLicenseTrack = null"
      @keydown.esc="selectedLicenseTrack = null"
      tabindex="-1"
    >
      <div class="license-modal-card">
        <div class="modal-head">
          <div class="head-titles">
            <span class="eyebrow font-mono">LEGAL & PROVENANCE</span>
            <h3 class="modal-title font-display">License & Attribution</h3>
          </div>
          <button class="modal-close-btn font-mono" @click="selectedLicenseTrack = null">✕</button>
        </div>

        <div class="modal-body">
          <div class="track-summary-box">
            <div class="summary-title font-display">{{ selectedLicenseTrack.title }}</div>
            <div class="summary-artist font-mono">{{ selectedLicenseTrack.artist }}</div>
          </div>

          <div class="provenance-details font-mono">
            <div class="detail-row">
              <span class="label">LICENSE:</span>
              <span class="val highlight">{{ selectedLicenseTrack.license?.name || 'Creative Commons' }}</span>
            </div>
            <div class="detail-row" v-if="selectedLicenseTrack.license?.url">
              <span class="label">DEED URL:</span>
              <a :href="selectedLicenseTrack.license.url" target="_blank" rel="noopener noreferrer" class="link">
                {{ selectedLicenseTrack.license.url }} ↗
              </a>
            </div>
            <div class="detail-row">
              <span class="label">ARCHIVE SOURCE:</span>
              <a :href="selectedLicenseTrack.source?.pageUrl" target="_blank" rel="noopener noreferrer" class="link">
                {{ selectedLicenseTrack.source?.name || 'Internet Archive' }} ↗
              </a>
            </div>
            <div class="detail-row">
              <span class="label">STREAM RESOLUTION:</span>
              <span class="val">Verified Direct MP3 (Zero Runtime APIs)</span>
            </div>
            <div class="detail-attribution">
              <span class="label">ATTRIBUTION STATEMENT:</span>
              <p class="attribution-text">{{ selectedLicenseTrack.license?.attribution }}</p>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="action-btn secondary font-mono" @click="selectedLicenseTrack = null">
            DISMISS
          </button>
        </div>
      </div>
    </div>

    <!-- Quick Add to Mixtape Picker Modal -->
    <div
      v-if="showAddModal"
      class="modal-backdrop"
      @click.self="showAddModal = false"
      @keydown.esc="showAddModal = false"
      tabindex="-1"
    >
      <div class="mixtape-picker-card">
        <div class="picker-header">
          <div class="picker-titles">
            <span class="picker-kicker font-mono">TRACK ACQUISITION</span>
            <h4 class="picker-title font-display">{{ targetTrackForAdd?.title }}</h4>
            <span class="picker-artist font-mono">
              {{ targetTrackForAdd?.artist }} • {{ targetTrackForAdd?.genre }}
            </span>
          </div>
          <button class="modal-close-btn font-mono" @click="showAddModal = false">✕</button>
        </div>

        <div v-if="playlistStore.playlists.length === 0" class="no-playlists-box">
          <p class="font-mono">No mixtapes found in your collection.</p>
          <p class="sub-hint">Create a mixtape first to save this track.</p>
          <button class="action-btn primary font-display" @click="handleCreateMixtapeFirst">
            + Forge First Mixtape
          </button>
        </div>

        <div v-else class="mixtapes-picker-list">
          <p class="picker-instruction font-mono">SELECT DESTINATION MIXTAPE:</p>
          <button
            v-for="pl in playlistStore.playlists"
            :key="pl._id"
            class="picker-playlist-item"
            :disabled="isAddingToPlaylist"
            @click="addTrackToSelectedPlaylist(pl)"
          >
            <div class="picker-item-info">
              <span class="picker-item-name font-display">{{ pl.name }}</span>
              <span class="picker-item-count font-mono">{{ pl.songs?.length || 0 }} tracks</span>
            </div>
            <span class="picker-item-add font-mono">ADD →</span>
          </button>
        </div>

        <div class="modal-footer">
          <button class="action-btn secondary font-mono" @click="showAddModal = false">
            CANCEL
          </button>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { FEATURED_SONGS } from '../../data/featuredSongs.js';
import { getRandomFeaturedSongs, formatDuration } from '../../utils/featuredSongs.js';
import { usePlayerStore } from '../../stores/player';
import { usePlaylistStore } from '../../stores/playlist';
import { useToastStore } from '../../stores/toast';

const emit = defineEmits(['create-mixtape']);

const playerStore = usePlayerStore();
const playlistStore = usePlaylistStore();
const toastStore = useToastStore();

// Display 8 to 10 tracks randomly selected from curated collection
const displayedTracks = ref([]);
const isRefreshing = ref(false);

const selectedLicenseTrack = ref(null);
const showAddModal = ref(false);
const targetTrackForAdd = ref(null);
const isAddingToPlaylist = ref(false);

// Initialize with 8-10 tracks
onMounted(() => {
  displayedTracks.value = getRandomFeaturedSongs(FEATURED_SONGS, 8);
});

// Refresh selection without network calls or stopping active playback
const refreshSelection = () => {
  isRefreshing.value = true;
  // Non-mutating Fisher-Yates re-selection
  displayedTracks.value = getRandomFeaturedSongs(FEATURED_SONGS, 8);
  setTimeout(() => {
    isRefreshing.value = false;
  }, 300);
};

// Check if a track is the currently loaded track in the player
const isCurrentTrack = (track) => {
  if (!playerStore.currentTrack) return false;
  return (
    playerStore.currentTrack._id === track._id ||
    playerStore.currentTrack.id === track.id ||
    playerStore.currentTrack.url === track.url
  );
};

// Handle Play / Pause for a curated track
const handlePlayTrack = async (track, index) => {
  if (isCurrentTrack(track)) {
    await playerStore.togglePlay();
  } else {
    // Play with current displayed collection as queue
    await playerStore.playTrack(track, displayedTracks.value, index);
  }
};

// Open License / Provenance Modal
const openLicenseModal = (track) => {
  selectedLicenseTrack.value = track;
};

// Open Add to Mixtape Modal
const openAddModal = (track) => {
  targetTrackForAdd.value = track;
  showAddModal.value = true;
};

// Forward create mixtape request to parent HomeView
const handleCreateMixtapeFirst = () => {
  showAddModal.value = false;
  emit('create-mixtape');
};

// Add Track to Selected Playlist
const addTrackToSelectedPlaylist = async (playlist) => {
  if (!targetTrackForAdd.value || isAddingToPlaylist.value) return;

  isAddingToPlaylist.value = true;
  try {
    const track = targetTrackForAdd.value;
    const songPayload = {
      title: track.title,
      artist: track.artist,
      album: track.album || '',
      duration: track.duration || 0,
      url: track.url || track.audioUrl,
      coverImage: track.coverImage || track.artwork || '',
      license: track.license?.name,
      licenseUrl: track.license?.url,
      attribution: track.license?.attribution,
    };

    await playlistStore.addSong(playlist._id, songPayload);
    toastStore.success(`Added "${track.title}" to ${playlist.name}`);
    showAddModal.value = false;
  } catch (err) {
    toastStore.error(err.response?.data?.message || 'Failed to add track to mixtape');
  } finally {
    isAddingToPlaylist.value = false;
  }
};
</script>

<style scoped>
.pg-discover-section {
  display: flex;
  flex-direction: column;
  gap: 24px;
  padding: 32px 0;
  border-top: 1px solid var(--sw-border-subtle, rgba(255, 255, 255, 0.08));
  border-bottom: 1px solid var(--sw-border-subtle, rgba(255, 255, 255, 0.08));
}

/* Masthead Header */
.discover-masthead {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 16px;
  flex-wrap: wrap;
}

.discover-kicker {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 6px;
}

.kicker-pill {
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  padding: 3px 8px;
  background: rgba(255, 82, 56, 0.12);
  color: #ff5238;
  border: 1px solid rgba(255, 82, 56, 0.3);
  text-transform: uppercase;
}

.kicker-counter {
  font-size: 0.68rem;
  color: var(--sw-text-muted, #717d90);
  letter-spacing: 0.08em;
}

.discover-title {
  font-size: 2.2rem;
  font-weight: 800;
  line-height: 1.1;
  color: var(--sw-text-primary, #ffffff);
  letter-spacing: -0.02em;
  margin: 0;
}

.discover-subtitle {
  font-size: 0.82rem;
  color: var(--sw-text-secondary, #9ba3af);
  letter-spacing: 0.04em;
  margin: 4px 0 0;
}

.masthead-actions {
  display: flex;
  align-items: center;
}

.btn-refresh {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  background: var(--sw-bg-surface, #161a22);
  border: 1px solid var(--sw-border-medium, rgba(255, 255, 255, 0.18));
  color: var(--sw-text-primary, #f0f3f8);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
  padding: 9px 16px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.btn-refresh:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: #ff5238;
  color: #ff5238;
}

.refresh-icon {
  font-size: 1rem;
  display: inline-block;
  transition: transform 0.3s ease;
}

.refresh-icon.is-spinning {
  transform: rotate(180deg);
}

/* Grid Layout */
.discover-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}

@media (min-width: 1200px) {
  .discover-grid {
    grid-template-columns: repeat(4, 1fr);
  }
}

/* Track Card */
.track-card {
  display: flex;
  flex-direction: column;
  background: var(--sw-bg-surface, #14171f);
  border: 1px solid var(--sw-border-subtle, rgba(255, 255, 255, 0.08));
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
  position: relative;
  overflow: hidden;
}

.track-card:hover {
  border-color: var(--sw-border-medium, rgba(255, 255, 255, 0.22));
  transform: translateY(-2px);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.track-card.is-active {
  border-color: #ff5238;
}

.track-card.is-playing {
  box-shadow: 0 0 20px rgba(255, 82, 56, 0.18);
}

/* Card Artwork Box */
.card-art-box {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background: #0d0f14;
  overflow: hidden;
  cursor: pointer;
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
}

.track-card:hover .card-img {
  transform: scale(1.05);
}

.card-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.4rem;
  color: var(--sw-text-muted, #5a6474);
  background: #1a1e28;
}

/* Play/Pause Button on Artwork */
.art-play-btn {
  position: absolute;
  bottom: 12px;
  right: 12px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: #ff5238;
  color: #ffffff;
  border: none;
  font-size: 0.95rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.5);
  transition: transform 0.2s ease, background 0.2s ease;
  z-index: 2;
}

.art-play-btn:hover {
  transform: scale(1.1);
  background: #ff6850;
}

.art-play-btn.is-active {
  background: #ffffff;
  color: #ff5238;
}

/* Playing Waveform Bars */
.playing-bars {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 18px;
  background: rgba(0, 0, 0, 0.6);
  padding: 3px 6px;
  border-radius: 4px;
  z-index: 2;
}

.bar {
  width: 3px;
  background: #ff5238;
  border-radius: 1px;
  animation: bounce 0.8s ease-in-out infinite alternate;
}

.bar-1 { height: 60%; animation-delay: 0.1s; }
.bar-2 { height: 100%; animation-delay: 0.3s; }
.bar-3 { height: 40%; animation-delay: 0.2s; }

@keyframes bounce {
  from { height: 20%; }
  to { height: 100%; }
}

/* Card Details */
.card-details {
  display: flex;
  flex-direction: column;
  padding: 16px;
  flex: 1;
}

.card-header-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.genre-tag {
  font-size: 0.66rem;
  color: #d4e157;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.duration-tag {
  font-size: 0.72rem;
  color: var(--sw-text-muted, #717d90);
}

.track-title {
  font-size: 1.05rem;
  font-weight: 700;
  line-height: 1.25;
  color: var(--sw-text-primary, #ffffff);
  margin: 0 0 4px;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.2s ease;
}

.track-title:hover {
  color: #ff5238;
}

.track-artist-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--sw-text-secondary, #9ba3af);
  margin-bottom: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-mood {
  color: var(--sw-text-muted, #717d90);
}

/* License Strip */
.license-strip {
  display: flex;
  align-items: center;
  margin-bottom: 14px;
}

.license-badge {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: var(--sw-text-secondary, #a0aec0);
  font-size: 0.65rem;
  letter-spacing: 0.06em;
  padding: 3px 7px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.license-badge:hover {
  background: rgba(41, 121, 255, 0.12);
  border-color: rgba(41, 121, 255, 0.4);
  color: #70a1ff;
}

.license-icon {
  font-size: 0.75rem;
}

.info-glyph {
  font-size: 0.7rem;
  opacity: 0.8;
}

/* Card Actions Row */
.card-actions-row {
  margin-top: auto;
  display: flex;
}

.btn-add-mixtape {
  width: 100%;
  background: transparent;
  border: 1px solid var(--sw-border-subtle, rgba(255, 255, 255, 0.12));
  color: var(--sw-text-primary, #e2e8f0);
  font-size: 0.68rem;
  letter-spacing: 0.1em;
  padding: 8px 12px;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
}

.btn-add-mixtape:hover {
  background: rgba(255, 255, 255, 0.08);
  border-color: #ff5238;
  color: #ff5238;
}

/* Modals */
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(5, 7, 10, 0.82);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  z-index: 1000;
}

.license-modal-card,
.mixtape-picker-card {
  width: 100%;
  max-width: 480px;
  background: #141720;
  border: 1px solid var(--sw-border-medium, rgba(255, 255, 255, 0.2));
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
}

.modal-head,
.picker-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  padding: 20px 24px;
  border-bottom: 1px solid var(--sw-border-subtle, rgba(255, 255, 255, 0.08));
}

.eyebrow,
.picker-kicker {
  font-size: 0.68rem;
  color: #ff5238;
  letter-spacing: 0.12em;
  display: block;
  margin-bottom: 4px;
}

.modal-title,
.picker-title {
  font-size: 1.3rem;
  color: #ffffff;
  margin: 0;
}

.picker-artist {
  font-size: 0.75rem;
  color: var(--sw-text-muted, #717d90);
  margin-top: 4px;
  display: block;
}

.modal-close-btn {
  background: transparent;
  border: none;
  color: var(--sw-text-muted, #717d90);
  font-size: 1.1rem;
  cursor: pointer;
  padding: 4px;
  transition: color 0.2s;
}

.modal-close-btn:hover {
  color: #ffffff;
}

.modal-body {
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.track-summary-box {
  padding: 12px 16px;
  background: rgba(255, 255, 255, 0.03);
  border-left: 3px solid #ff5238;
}

.summary-title {
  font-size: 1.1rem;
  font-weight: 700;
  color: #ffffff;
}

.summary-artist {
  font-size: 0.78rem;
  color: var(--sw-text-secondary, #9ba3af);
  margin-top: 2px;
}

.provenance-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 0.75rem;
}

.detail-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.detail-row .label,
.detail-attribution .label {
  color: var(--sw-text-muted, #717d90);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
}

.detail-row .val {
  color: var(--sw-text-primary, #ffffff);
}

.detail-row .val.highlight {
  color: #d4e157;
}

.detail-row .link {
  color: #70a1ff;
  text-decoration: none;
  word-break: break-all;
}

.detail-row .link:hover {
  text-decoration: underline;
}

.attribution-text {
  margin: 4px 0 0;
  color: var(--sw-text-secondary, #cbd5e1);
  line-height: 1.45;
  background: rgba(0, 0, 0, 0.3);
  padding: 10px;
  border-radius: 2px;
}

.modal-footer {
  padding: 16px 24px;
  border-top: 1px solid var(--sw-border-subtle, rgba(255, 255, 255, 0.08));
  display: flex;
  justify-content: flex-end;
}

.action-btn {
  padding: 8px 18px;
  font-size: 0.78rem;
  letter-spacing: 0.08em;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.action-btn.secondary {
  background: rgba(255, 255, 255, 0.06);
  border-color: rgba(255, 255, 255, 0.15);
  color: #ffffff;
}

.action-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.12);
}

.action-btn.primary {
  background: #ff5238;
  color: #ffffff;
}

.action-btn.primary:hover {
  background: #ff6850;
}

/* Mixtape Picker List */
.no-playlists-box {
  padding: 32px 24px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.no-playlists-box p {
  margin: 0;
  color: var(--sw-text-primary, #ffffff);
}

.sub-hint {
  font-size: 0.8rem;
  color: var(--sw-text-muted, #717d90);
}

.mixtapes-picker-list {
  padding: 16px 24px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 280px;
  overflow-y: auto;
}

.picker-instruction {
  font-size: 0.68rem;
  color: var(--sw-text-muted, #717d90);
  letter-spacing: 0.08em;
  margin: 0 0 4px;
}

.picker-playlist-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 14px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--sw-text-primary, #ffffff);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
}

.picker-playlist-item:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.08);
  border-color: #ff5238;
}

.picker-item-name {
  font-size: 0.95rem;
  font-weight: 700;
  display: block;
}

.picker-item-count {
  font-size: 0.72rem;
  color: var(--sw-text-muted, #717d90);
  margin-top: 2px;
  display: block;
}

.picker-item-add {
  font-size: 0.75rem;
  color: #ff5238;
  font-weight: 700;
}
</style>
