<template>
  <Teleport to="body">
    <div
      v-if="playerStore.isExpanded"
      class="expanded-listening-room"
      @keydown.esc="playerStore.closeExpanded()"
      @keydown.space.prevent="playerStore.togglePlay()"
      tabindex="0"
      ref="roomRef"
    >
      <!-- Dynamic Ambient Glow Backdrop -->
      <div
        class="ambient-backdrop"
        :style="{ backgroundImage: trackArtwork ? `url(${trackArtwork})` : 'none' }"
      ></div>
      <div class="ambient-dark-wash"></div>

      <!-- Top Header Navigation -->
      <header class="room-topbar">
        <button
          class="collapse-btn"
          @click="playerStore.closeExpanded()"
          title="Minimize Listening Room (Esc)"
          aria-label="Collapse Listening Room"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="6 9 12 15 18 9"></polyline>
          </svg>
          <span class="collapse-label">Minimize</span>
        </button>

        <div class="room-indicator font-display">
          <span class="pulse-dot" :class="{ playing: playerStore.isPlaying }"></span>
          RESONANT LISTENING ROOM
        </div>

        <button
          class="room-queue-btn"
          @click="playerStore.toggleQueue()"
          title="Open Playback Queue"
          aria-label="Playback Queue"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
          <span class="queue-count tabular-nums">{{ playerStore.queue.length }}</span>
        </button>
      </header>

      <!-- Center Stage: Artwork, Visualizer & Controls -->
      <main class="room-main-stage">
        <!-- Spotify Embed Case -->
        <div v-if="isSpotify && spotifyEmbedUrl" class="spotify-embed-card">
          <iframe
            :src="spotifyEmbedUrl"
            width="100%"
            height="352"
            frameBorder="0"
            allowfullscreen=""
            allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
            loading="lazy"
            class="spotify-iframe"
          ></iframe>
        </div>

        <!-- Direct / YouTube Audio Showcase -->
        <div v-else class="stage-grid">
          <!-- Left: Big Artwork Showcase with Vinyl Disc -->
          <div class="art-showcase-column">
            <div class="art-card-perspective">
              <ArtworkCover
                :src="trackArtwork"
                :alt="playerStore.currentTrack?.title"
                size="hero"
                :showVinyl="true"
                :glow="true"
                :isPlaying="playerStore.isPlaying"
              />
            </div>

            <!-- Integrated Visualizer Ribbon beneath Artwork -->
            <div class="art-visualizer-bar">
              <AudioVisualizer
                :isPlaying="playerStore.isPlaying"
                mode="bars"
                :barCount="36"
                accentColor="#3B4BFF"
                secondaryColor="#FF3E6C"
              />
            </div>
          </div>

          <!-- Right: Metadata & Deep Playback Console -->
          <div class="controls-showcase-column">
            <div class="track-header-box">
              <div class="track-genre-pill">
                <span class="provider-tag" :class="providerClass">
                  {{ playerStore.providerCapabilities.badge }}
                </span>
                <span class="workstation-tag">STUDIO HIGH-FIDELITY</span>
              </div>

              <h1 class="room-track-title font-display" :title="playerStore.currentTrack?.title">
                {{ playerStore.currentTrack?.title || 'No Track Selected' }}
              </h1>

              <h2 class="room-track-artist">
                {{ playerStore.currentTrack?.artist || 'Select a track to start listening' }}
              </h2>

              <p v-if="playerStore.currentTrack?.album" class="room-track-album">
                From the album <em>{{ playerStore.currentTrack.album }}</em>
              </p>
            </div>

            <!-- Playback warning or external info if any -->
            <div v-if="playerStore.error" class="room-status-alert">
              <span>{{ playerStore.error }}</span>
              <a
                v-if="playerStore.currentTrack?.url"
                :href="playerStore.currentTrack.url"
                target="_blank"
                rel="noopener noreferrer"
                class="room-ext-link"
              >
                Open Source Link ↗
              </a>
            </div>

            <!-- Progress Scrubber with Hover Time -->
            <div class="room-scrubber-block">
              <div class="time-readout-row">
                <span class="time-cur tabular-nums">{{ formatDuration(playerStore.currentTime) }}</span>
                <span class="time-dur tabular-nums">{{ formatDuration(playerStore.duration) }}</span>
              </div>

              <div
                class="room-scrubber-track"
                :class="{ disabled: !playerStore.providerCapabilities.canSeek }"
                @click="handleScrubClick"
                ref="scrubRef"
              >
                <div
                  class="room-scrubber-fill"
                  :style="{ width: `${playerStore.progressPercentage}%` }"
                >
                  <div class="room-scrubber-thumb"></div>
                </div>
              </div>
            </div>

            <!-- Primary Master Playback Controls -->
            <div class="room-controls-row">
              <button
                class="room-ctrl-btn"
                :class="{ active: playerStore.shuffle }"
                @click="playerStore.toggleShuffle()"
                title="Shuffle Queue"
                aria-label="Shuffle Queue"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
                </svg>
              </button>

              <button
                class="room-ctrl-btn"
                :disabled="!playerStore.hasPrevious && !playerStore.hasTrack"
                @click="playerStore.previous()"
                title="Previous Track"
                aria-label="Previous Track"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
                </svg>
              </button>

              <button
                class="room-play-btn"
                :class="{ playing: playerStore.isPlaying, loading: playerStore.isLoading }"
                @click="playerStore.togglePlay()"
                :title="playerStore.isPlaying ? 'Pause' : 'Play'"
                :aria-label="playerStore.isPlaying ? 'Pause' : 'Play'"
              >
                <span v-if="playerStore.isLoading" class="room-spinner"></span>
                <svg v-else-if="playerStore.isPlaying" width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                </svg>
                <svg v-else width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>

              <button
                class="room-ctrl-btn"
                :disabled="!playerStore.hasNext && !playerStore.hasTrack"
                @click="playerStore.next()"
                title="Next Track"
                aria-label="Next Track"
              >
                <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
                </svg>
              </button>

              <button
                class="room-ctrl-btn"
                :class="{ active: playerStore.repeatMode !== 'off' }"
                @click="playerStore.cycleRepeat()"
                :title="`Repeat Mode: ${playerStore.repeatMode}`"
                aria-label="Repeat Mode"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"/>
                </svg>
                <span v-if="playerStore.repeatMode === 'one'" class="repeat-tag">1</span>
              </button>
            </div>

            <!-- Volume Slider Console -->
            <div class="room-volume-box" v-if="playerStore.providerCapabilities.canVolume">
              <button class="room-vol-btn" @click="playerStore.toggleMute()" aria-label="Toggle Mute">
                <svg v-if="playerStore.muted || playerStore.volume === 0" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
                </svg>
                <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                </svg>
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                :value="playerStore.muted ? 0 : playerStore.volume"
                @input="playerStore.setVolume(parseFloat($event.target.value))"
                class="room-vol-slider"
                aria-label="Volume Slider"
              />
              <span class="vol-percentage tabular-nums">{{ Math.round((playerStore.muted ? 0 : playerStore.volume) * 100) }}%</span>
            </div>
          </div>
        </div>
      </main>
    </div>
  </Teleport>
</template>

<script setup>
import { computed, ref, onMounted, nextTick, watch } from 'vue';
import { usePlayerStore } from '../../stores/player';
import { formatDuration } from '../../data/demoTracks';
import ArtworkCover from '../common/ArtworkCover.vue';
import AudioVisualizer from '../common/AudioVisualizer.vue';

const playerStore = usePlayerStore();
const roomRef = ref(null);
const scrubRef = ref(null);

const trackArtwork = computed(() => {
  return playerStore.currentTrack?.coverImage || '';
});

const isSpotify = computed(() => {
  return playerStore.currentProviderType === 'spotify';
});

const spotifyEmbedUrl = computed(() => {
  return playerStore.providerCapabilities?.embedUrl;
});

const providerClass = computed(() => {
  const badge = playerStore.providerCapabilities?.badge?.toLowerCase() || '';
  if (badge.includes('youtube')) return 'tag-youtube';
  if (badge.includes('spotify')) return 'tag-spotify';
  return 'tag-direct';
});

const handleScrubClick = (e) => {
  if (!scrubRef.value || !playerStore.duration || !playerStore.providerCapabilities.canSeek) return;
  const rect = scrubRef.value.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const percentage = (clickX / rect.width) * 100;
  playerStore.seekByPercentage(percentage);
};

watch(
  () => playerStore.isExpanded,
  (open) => {
    if (open) {
      nextTick(() => {
        roomRef.value?.focus();
      });
    }
  }
);
</script>

<style scoped>
.expanded-listening-room {
  position: fixed;
  inset: 0;
  z-index: 2000;
  background: var(--pg-bg);
  display: flex;
  flex-direction: column;
  color: var(--sw-text-primary);
  overflow-y: auto;
  outline: none;
  animation: roomEnter 300ms var(--sw-ease-out);
}

@keyframes roomEnter {
  from {
    opacity: 0;
    transform: scale(0.97);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}

/* Ambient Glow Layer */
.ambient-backdrop {
  position: absolute;
  inset: -100px;
  background-size: cover;
  background-position: center;
  filter: blur(80px) saturate(180%);
  opacity: 0.35;
  pointer-events: none;
  z-index: 0;
  transform: scale(1.1);
  transition: background-image 600ms ease;
}

.ambient-dark-wash {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, rgba(255, 249, 238, 0.4) 0%, rgba(255, 249, 238, 0.95) 90%);
  pointer-events: none;
  z-index: 1;
}

/* Top Header Bar */
.room-topbar {
  position: relative;
  z-index: 10;
  height: 80px;
  padding: 0 40px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.collapse-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--sw-text-secondary);
  background: var(--pg-canvas);
  border: 2px solid var(--pg-border);
  box-shadow: 2px 2px 0px var(--pg-border);
  padding: 8px 16px;
  border-radius: var(--sw-radius-full);
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.collapse-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-1px);
}

.room-indicator {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.15em;
  color: var(--sw-text-muted);
}

.pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--sw-text-muted);
}

.pulse-dot.playing {
  background: var(--sw-accent);
  box-shadow: 0 0 10px var(--sw-accent);
  animation: pulseDot 1.5s infinite;
}

@keyframes pulseDot {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.4); opacity: 0.6; }
  100% { transform: scale(1); opacity: 1; }
}

.room-queue-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  background: var(--pg-canvas);
  border: 2px solid var(--pg-border);
  box-shadow: 2px 2px 0px var(--pg-border);
  color: var(--sw-text-secondary);
  padding: 8px 14px;
  border-radius: var(--sw-radius-full);
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.room-queue-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
}

.queue-count {
  font-family: var(--sw-font-mono);
  font-size: 0.75rem;
  background: var(--sw-accent);
  color: #060709;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--sw-radius-full);
}

/* Main Stage */
.room-main-stage {
  position: relative;
  z-index: 10;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 40px 60px 40px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.stage-grid {
  display: grid;
  grid-template-columns: 340px 1fr;
  align-items: center;
  gap: 64px;
  width: 100%;
}

.art-showcase-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24px;
}

.art-card-perspective {
  perspective: 1000px;
}

.art-visualizer-bar {
  width: 100%;
  height: 48px;
  background: var(--pg-canvas);
  border: 2px solid var(--pg-border);
  box-shadow: 3px 3px 0px var(--pg-border);
  border: 2px solid var(--pg-border);
  box-shadow: 2px 2px 0px var(--pg-border);
  border-radius: var(--sw-radius-md);
  padding: 6px 12px;
}

.controls-showcase-column {
  display: flex;
  flex-direction: column;
  gap: 24px;
}

.track-header-box {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.track-genre-pill {
  display: flex;
  align-items: center;
  gap: 8px;
}

.provider-tag {
  font-family: var(--sw-font-mono);
  font-size: 0.68rem;
  font-weight: 700;
  padding: 2px 8px;
  border-radius: 4px;
  text-transform: uppercase;
}

.tag-direct {
  background: rgba(204, 255, 0, 0.15);
  color: var(--sw-accent);
  border: 1px solid rgba(204, 255, 0, 0.3);
}

.tag-youtube {
  background: rgba(244, 63, 94, 0.15);
  color: #fb7185;
  border: 1px solid rgba(244, 63, 94, 0.3);
}

.tag-spotify {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
}

.workstation-tag {
  font-family: var(--sw-font-mono);
  font-size: 0.68rem;
  color: var(--sw-text-muted);
  letter-spacing: 0.08em;
}

.room-track-title {
  font-size: 2.2rem;
  font-weight: 800;
  line-height: 1.15;
  color: var(--sw-text-primary);
  letter-spacing: -0.03em;
}

.room-track-artist {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--sw-text-secondary);
}

.room-track-album {
  font-size: 0.9rem;
  color: var(--sw-text-muted);
}

.room-status-alert {
  padding: 10px 14px;
  border-radius: var(--sw-radius-sm);
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.25);
  color: #fde68a;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.room-ext-link {
  color: var(--sw-warm);
  text-decoration: underline;
  font-weight: 600;
}

/* Scrubber */
.room-scrubber-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-readout-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  color: var(--sw-text-muted);
}

.room-scrubber-track {
  width: 100%;
  height: 6px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: var(--sw-radius-full);
  cursor: pointer;
  position: relative;
  transition: height var(--sw-transition-fast);
}

.room-scrubber-track:hover:not(.disabled) {
  height: 9px;
}

.room-scrubber-track.disabled {
  cursor: not-allowed;
  opacity: 0.4;
}

.room-scrubber-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--sw-accent), #60a5fa);
  border-radius: var(--sw-radius-full);
  position: relative;
}

.room-scrubber-thumb {
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.8);
}

/* Controls */
.room-controls-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 24px;
}

.room-ctrl-btn {
  background: transparent;
  border: none;
  color: var(--sw-text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  position: relative;
  transition: all var(--sw-transition-fast);
}

.room-ctrl-btn:hover:not(:disabled) {
  color: #fff;
  transform: scale(1.1);
}

.room-ctrl-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.room-ctrl-btn.active {
  color: var(--sw-accent);
}

.repeat-tag {
  position: absolute;
  top: 2px;
  right: 2px;
  font-family: var(--sw-font-mono);
  font-size: 0.6rem;
  font-weight: 700;
  background: var(--sw-accent);
  color: #060709;
  border-radius: 50%;
  width: 14px;
  height: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.room-play-btn {
  width: 68px;
  height: 68px;
  border-radius: 50%;
  background: var(--sw-text-primary);
  color: #060709;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 30px rgba(255, 255, 255, 0.2);
  transition: all var(--sw-transition-spring);
}

.room-play-btn:hover {
  background: var(--sw-accent);
  color: #060709;
  box-shadow: 0 8px 35px var(--sw-accent-glow);
  transform: scale(1.08);
}

.room-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(0, 0, 0, 0.2);
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

/* Volume */
.room-volume-box {
  display: flex;
  align-items: center;
  gap: 12px;
  max-width: 320px;
}

.room-vol-btn {
  color: var(--sw-text-secondary);
  cursor: pointer;
}

.room-vol-btn:hover {
  color: #fff;
}

.room-vol-slider {
  flex: 1;
  height: 4px;
  border-radius: var(--sw-radius-full);
  appearance: none;
  background: rgba(255, 255, 255, 0.15);
  outline: none;
  cursor: pointer;
}

.room-vol-slider::-webkit-slider-thumb {
  appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #fff;
  cursor: pointer;
}

.vol-percentage {
  font-size: 0.78rem;
  color: var(--sw-text-muted);
  width: 36px;
}

/* Spotify Embed Card */
.spotify-embed-card {
  width: 100%;
  max-width: 640px;
  background: #121212;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
}

.spotify-iframe {
  border: none;
  display: block;
}

@media (max-width: 900px) {
  .stage-grid {
    grid-template-columns: 1fr;
    gap: 32px;
    text-align: center;
  }
  .room-track-title {
    font-size: 1.6rem;
  }
  .track-header-box {
    align-items: center;
  }
  .room-volume-box {
    margin: 0 auto;
  }
}
</style>
