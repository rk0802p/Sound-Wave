<template>
  <div v-if="playerStore.isExpanded" class="expanded-player-modal" @keydown.esc="playerStore.closeExpanded()" tabindex="0" ref="modalRef">
    <!-- Ambient Glow Layer -->
    <div
      class="ambient-backdrop"
      :style="{ backgroundImage: `url(${trackArtwork})` }"
    ></div>
    <div class="ambient-dark-wash"></div>

    <!-- Top Bar -->
    <div class="expanded-topbar">
      <button class="icon-btn close-expand-btn" @click="playerStore.closeExpanded()" title="Collapse (Esc)">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polyline points="6 9 12 15 18 9"></polyline>
        </svg>
      </button>
      <div class="now-playing-label">NOW PLAYING</div>
      <button class="icon-btn queue-toggle-btn" @click="playerStore.toggleQueue()" title="Queue">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <line x1="8" y1="6" x2="21" y2="6"></line>
          <line x1="8" y1="12" x2="21" y2="12"></line>
          <line x1="8" y1="18" x2="21" y2="18"></line>
          <line x1="3" y1="6" x2="3.01" y2="6"></line>
          <line x1="3" y1="12" x2="3.01" y2="12"></line>
          <line x1="3" y1="18" x2="3.01" y2="18"></line>
        </svg>
      </button>
    </div>

    <!-- Main Content Area -->
    <div class="expanded-content-grid">
      <!-- Left: Big Artwork Tile -->
      <div class="art-showcase">
        <div class="art-card">
          <img
            :src="trackArtwork"
            :alt="playerStore.currentTrack?.title"
            class="art-image"
          />
        </div>
      </div>

      <!-- Right: Metadata & Deep Controls -->
      <div class="controls-showcase">
        <div class="track-header">
          <h1 class="track-title" :title="playerStore.currentTrack?.title">
            {{ playerStore.currentTrack?.title || 'No Track Selected' }}
          </h1>
          <h2 class="track-artist">
            {{ playerStore.currentTrack?.artist || 'Select a track to play' }}
          </h2>
          <span v-if="playerStore.currentTrack?.album" class="track-album">
            {{ playerStore.currentTrack.album }}
          </span>
        </div>

        <!-- External link or error warning -->
        <div v-if="playerStore.error" class="status-warning">
          <span>{{ playerStore.error }}</span>
          <a
            v-if="playerStore.currentTrack?.url"
            :href="playerStore.currentTrack.url"
            target="_blank"
            rel="noopener noreferrer"
            class="ext-open-btn"
          >
            Open Source Link ↗
          </a>
        </div>

        <!-- Progress Scrubber -->
        <div class="progress-block">
          <div class="time-row">
            <span class="tabular-nums">{{ formatDuration(playerStore.currentTime) }}</span>
            <span class="tabular-nums">{{ formatDuration(playerStore.duration) }}</span>
          </div>
          <div class="scrub-track" @click="handleScrubClick" ref="scrubRef">
            <div class="scrub-fill" :style="{ width: `${playerStore.progressPercentage}%` }">
              <div class="scrub-thumb"></div>
            </div>
          </div>
        </div>

        <!-- Main Playback Controls -->
        <div class="playback-buttons-row">
          <button
            class="ctrl-icon-btn"
            :class="{ active: playerStore.shuffle }"
            @click="playerStore.toggleShuffle()"
            title="Toggle Shuffle"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
            </svg>
          </button>

          <button
            class="ctrl-icon-btn"
            :disabled="!playerStore.hasPrevious && !playerStore.hasTrack"
            @click="playerStore.previous()"
            title="Previous"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          <button
            class="ctrl-play-hero-btn"
            @click="playerStore.togglePlay()"
            :title="playerStore.isPlaying ? 'Pause' : 'Play'"
          >
            <svg v-if="playerStore.isPlaying" width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
            <svg v-else width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>

          <button
            class="ctrl-icon-btn"
            :disabled="!playerStore.hasNext && !playerStore.hasTrack"
            @click="playerStore.next()"
            title="Next"
          >
            <svg width="26" height="26" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>

          <button
            class="ctrl-icon-btn"
            :class="{ active: playerStore.repeatMode !== 'off' }"
            @click="playerStore.cycleRepeat()"
            :title="`Repeat: ${playerStore.repeatMode}`"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"/>
            </svg>
            <span v-if="playerStore.repeatMode === 'one'" class="one-badge">1</span>
          </button>
        </div>

        <!-- Bottom Utilities (Volume) -->
        <div class="utilities-row">
          <button class="vol-icon" @click="playerStore.toggleMute()">
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
            class="vol-slider"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, nextTick } from 'vue';
import { usePlayerStore } from '../../stores/player';
import { formatDuration, getDistinctArtwork } from '../../data/demoTracks';

const playerStore = usePlayerStore();
const modalRef = ref(null);
const scrubRef = ref(null);

const trackArtwork = computed(() => {
  return getDistinctArtwork(playerStore.currentTrack, 0);
});

const handleScrubClick = (e) => {
  if (!scrubRef.value || !playerStore.duration) return;
  const rect = scrubRef.value.getBoundingClientRect();
  const clickX = e.clientX - rect.left;
  const percent = (clickX / rect.width) * 100;
  playerStore.seekByPercentage(percent);
};

onMounted(async () => {
  await nextTick();
  modalRef.value?.focus();
});
</script>

<style scoped>
.expanded-player-modal {
  position: fixed;
  inset: 0;
  background-color: var(--bg-app);
  z-index: 1050;
  display: flex;
  flex-direction: column;
  padding: 32px 48px;
  overflow: hidden;
  outline: none;
  animation: fadeIn 0.25s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: scale(0.98); }
  to { opacity: 1; transform: scale(1); }
}

.ambient-backdrop {
  position: absolute;
  inset: -40px;
  background-size: cover;
  background-position: center;
  filter: blur(80px);
  opacity: 0.25;
  pointer-events: none;
}

.ambient-dark-wash {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at center, transparent 0%, rgba(9, 9, 12, 0.8) 100%);
  pointer-events: none;
}

.expanded-topbar {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.icon-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s;
  display: flex;
  align-items: center;
}

.icon-btn:hover {
  color: var(--text-primary);
  background: var(--bg-hover);
}

.now-playing-label {
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 2px;
  color: var(--text-muted);
}

/* Content Grid */
.expanded-content-grid {
  position: relative;
  z-index: 2;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 64px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.art-showcase {
  flex: 1;
  max-width: 460px;
  display: flex;
  justify-content: center;
}

.art-card {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--radius-xl);
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8);
  border: 1px solid rgba(255, 255, 255, 0.08);
}

.art-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.controls-showcase {
  flex: 1;
  max-width: 520px;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.track-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.track-title {
  font-size: 2.2rem;
  font-weight: 800;
  color: var(--text-primary);
  line-height: 1.2;
}

.track-artist {
  font-size: 1.25rem;
  font-weight: 500;
  color: var(--text-secondary);
}

.track-album {
  font-size: 0.9rem;
  color: var(--text-muted);
}

.status-warning {
  padding: 10px 14px;
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.25);
  border-radius: var(--radius-md);
  color: #fbbf24;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ext-open-btn {
  color: #fff;
  text-decoration: underline;
  font-weight: 600;
}

/* Scrubber */
.progress-block {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.time-row {
  display: flex;
  justify-content: space-between;
  font-size: 0.82rem;
  color: var(--text-muted);
}

.scrub-track {
  height: 6px;
  background: var(--bg-hover);
  border-radius: 3px;
  cursor: pointer;
  position: relative;
}

.scrub-track:hover {
  height: 8px;
}

.scrub-fill {
  height: 100%;
  background: var(--accent-primary);
  border-radius: 3px;
  position: relative;
}

.scrub-thumb {
  position: absolute;
  right: -6px;
  top: 50%;
  transform: translateY(-50%);
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 10px rgba(118, 107, 255, 0.8);
}

/* Buttons */
.playback-buttons-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 28px;
}

.ctrl-icon-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  padding: 8px;
  border-radius: 50%;
  transition: all 0.2s;
  display: flex;
  align-items: center;
  position: relative;
}

.ctrl-icon-btn:hover:not(:disabled) {
  color: var(--text-primary);
  transform: scale(1.1);
}

.ctrl-icon-btn.active {
  color: var(--accent-primary);
}

.ctrl-icon-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.ctrl-play-hero-btn {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--accent-primary);
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 8px 24px rgba(118, 107, 255, 0.5);
  transition: all 0.2s;
}

.ctrl-play-hero-btn:hover {
  background: var(--accent-hover);
  transform: scale(1.06);
}

.one-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  background: var(--accent-primary);
  color: #fff;
  font-size: 0.65rem;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.utilities-row {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 200px;
}

.vol-icon {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
}

.vol-slider {
  flex: 1;
  accent-color: var(--accent-primary);
  height: 4px;
  cursor: pointer;
}

@media (max-width: 900px) {
  .expanded-content-grid {
    flex-direction: column;
    gap: 28px;
    text-align: center;
  }
  .art-showcase {
    max-width: 260px;
  }
  .track-title {
    font-size: 1.6rem;
  }
  .track-artist {
    font-size: 1.05rem;
  }
  .utilities-row {
    margin: 0 auto;
  }
}
</style>
