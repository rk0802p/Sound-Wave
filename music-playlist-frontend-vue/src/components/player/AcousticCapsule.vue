<template>
  <div
    v-if="playerStore.hasTrack"
    class="pg-deck-wrapper"
    :class="{ 'is-active': playerStore.isPlaying, 'is-embedded': isEmbeddedProvider }"
  >
    <div class="pg-deck">
      <!-- 1. Left Cluster: Tactile Vinyl Disc & Track Meta -->
      <div class="deck-track-cluster">
        <!-- Spinning Physical Vinyl Disc -->
        <div
          class="deck-vinyl-disc"
          :class="{ 'is-spinning': playerStore.isPlaying }"
          @click="playerStore.toggleExpanded()"
          title="Open Listening Salon"
        >
          <div class="vinyl-groove-lines"></div>
          <div class="vinyl-center-label">
            <span class="vinyl-hole"></span>
          </div>
        </div>

        <!-- Track Info & Format Sticker -->
        <div class="deck-track-info" @click="playerStore.toggleExpanded()">
          <div class="track-header-row">
            <span class="track-title font-display">{{ playerStore.currentTrack.title }}</span>
            <span class="format-sticker font-mono" :class="providerBadgeClass">
              {{ providerLabel }}
            </span>
          </div>
          <div class="track-sub-row">
            <span class="track-artist">{{ playerStore.currentTrack.artist || 'Unknown Artist' }}</span>
            <span v-if="playerStore.currentTrack.album" class="track-album font-mono">
              / {{ playerStore.currentTrack.album }}
            </span>
          </div>
        </div>
      </div>

      <!-- 2. Center Cluster: Controls & Graphic Scrubber Ribbon -->
      <div class="deck-controls-cluster">
        <!-- Transport Buttons -->
        <div class="deck-transport-bar">
          <button
            class="deck-btn"
            :class="{ 'is-active': playerStore.shuffle }"
            @click="playerStore.toggleShuffle()"
            title="Shuffle (S)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="16 3 21 3 21 8"></polyline>
              <line x1="4" y1="20" x2="21" y2="3"></line>
              <polyline points="21 16 21 21 16 21"></polyline>
              <line x1="15" y1="15" x2="21" y2="21"></line>
              <line x1="4" y1="4" x2="9" y2="9"></line>
            </svg>
          </button>

          <button
            class="deck-btn"
            :disabled="!playerStore.hasPrevious"
            @click="playerStore.prevTrack()"
            title="Previous (K)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="19 20 9 12 19 4 19 20"></polygon>
              <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="2.5"></line>
            </svg>
          </button>

          <!-- Main Play/Pause Button -->
          <button
            class="deck-main-play-btn"
            :disabled="playerStore.isLoading"
            @click="playerStore.togglePlay()"
            title="Play / Pause (Space)"
          >
            <div v-if="playerStore.isLoading" class="deck-play-spinner"></div>
            <svg
              v-else-if="!playerStore.isPlaying"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <polygon points="6 3 20 12 6 21 6 3"></polygon>
            </svg>
            <svg
              v-else
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          </button>

          <button
            class="deck-btn"
            :disabled="!playerStore.hasNext"
            @click="playerStore.nextTrack()"
            title="Next (J)"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 4 15 12 5 20 5 4"></polygon>
              <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2.5"></line>
            </svg>
          </button>

          <button
            class="deck-btn"
            :class="{ 'is-active': playerStore.repeatMode !== 'off' }"
            @click="playerStore.cycleRepeat()"
            title="Repeat Mode (R)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="17 1 21 5 17 9"></polyline>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
              <polyline points="7 23 3 19 7 15"></polyline>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            </svg>
            <span v-if="playerStore.repeatMode === 'one'" class="repeat-one-badge font-mono">1</span>
          </button>
        </div>

        <!-- Graphic Scrubber Ribbon -->
        <div class="deck-scrubber-bar" v-if="!isEmbeddedProvider">
          <span class="time-code font-mono">{{ formattedCurrentTime }}</span>

          <div
            class="scrubber-track"
            ref="scrubberRef"
            @mousemove="handleScrubberHover"
            @mouseleave="hoverTime = null"
            @click="handleScrubberClick"
            role="slider"
            :aria-valuenow="playerStore.currentTime"
            :aria-valuemin="0"
            :aria-valuemax="playerStore.duration"
            aria-label="Playback Position"
          >
            <!-- Background Rail -->
            <div class="rail-bg"></div>

            <!-- Buffered / Fill Progress Rail -->
            <div
              class="rail-fill"
              :style="{ width: `${playerStore.progressPercentage}%` }"
            >
              <span class="scrubber-thumb"></span>
            </div>

            <!-- Hover Preview Time -->
            <div
              v-if="hoverTime !== null"
              class="scrubber-tooltip font-mono"
              :style="{ left: `${hoverPosition}%` }"
            >
              {{ formattedHoverTime }}
            </div>
          </div>

          <span class="time-code font-mono">{{ formattedDuration }}</span>
        </div>

        <!-- Embedded Provider Notice -->
        <div v-else class="embedded-source-pill font-mono">
          <span>HOSTED AUDIO STREAM: {{ playerStore.providerCapabilities.providerName }}</span>
        </div>
      </div>

      <!-- 3. Right Cluster: Volume, Queue, and Expanded Salon Toggle -->
      <div class="deck-meta-cluster">
        <!-- Volume Control Popover Trigger -->
        <div class="volume-container">
          <button
            class="deck-tool-btn"
            :class="{ 'is-muted': playerStore.muted }"
            @click="playerStore.toggleMute()"
            title="Volume / Mute (M)"
          >
            <svg v-if="playerStore.muted || playerStore.volume === 0" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <line x1="23" y1="9" x2="17" y2="15"></line>
              <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
            <svg v-else-if="playerStore.volume < 0.5" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
          </button>

          <!-- Desktop Volume Slider -->
          <div class="desktop-volume-bar desktop-only">
            <input
              type="range"
              min="0"
              max="1"
              step="0.01"
              :value="playerStore.muted ? 0 : playerStore.volume"
              @input="handleVolumeInput"
              class="volume-range-input"
              aria-label="Volume Slider"
            />
          </div>
        </div>

        <!-- Queue Slide-out Button -->
        <button
          class="deck-tool-btn queue-trigger"
          :class="{ 'is-active': playerStore.isQueueOpen }"
          @click="playerStore.toggleQueue()"
          title="Playback Queue (Q)"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
          <span class="queue-counter font-mono">{{ playerStore.queue.length }}</span>
        </button>

        <!-- Listening Salon Expand Button -->
        <button
          class="deck-tool-btn expand-trigger"
          @click="playerStore.toggleExpanded()"
          title="Expand Listening Salon (L)"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="15 3 21 3 21 9"></polyline>
            <polyline points="9 21 3 21 3 15"></polyline>
            <line x1="21" y1="3" x2="14" y2="10"></line>
            <line x1="3" y1="21" x2="10" y2="14"></line>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { usePlayerStore } from '../../stores/player';

const playerStore = usePlayerStore();
const scrubberRef = ref(null);
const hoverTime = ref(null);
const hoverPosition = ref(0);

const formatTime = (secs) => {
  if (isNaN(secs) || secs < 0) return '0:00';
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const formattedCurrentTime = computed(() => formatTime(playerStore.currentTime));
const formattedDuration = computed(() => formatTime(playerStore.duration));
const formattedHoverTime = computed(() => formatTime(hoverTime.value || 0));

const isEmbeddedProvider = computed(() => playerStore.providerCapabilities.isEmbedded);

const providerLabel = computed(() => {
  const prov = playerStore.currentProviderType;
  if (prov === 'youtube') return 'YOUTUBE';
  if (prov === 'spotify') {
    return playerStore.providerCapabilities.isEmbedded ? 'SPOTIFY EMBED' : 'SPOTIFY PREMIUM';
  }
  return 'LOSSLESS MP3';
});

const providerBadgeClass = computed(() => {
  const prov = playerStore.currentProviderType;
  return {
    'badge-direct': prov === 'direct',
    'badge-youtube': prov === 'youtube',
    'badge-spotify': prov === 'spotify',
  };
});

const handleScrubberHover = (e) => {
  if (!scrubberRef.value || !playerStore.duration) return;
  const rect = scrubberRef.value.getBoundingClientRect();
  const relX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
  const ratio = relX / rect.width;
  hoverPosition.value = ratio * 100;
  hoverTime.value = ratio * playerStore.duration;
};

const handleScrubberClick = (e) => {
  if (!scrubberRef.value || !playerStore.duration) return;
  const rect = scrubberRef.value.getBoundingClientRect();
  const relX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
  const targetTime = (relX / rect.width) * playerStore.duration;
  playerStore.seek(targetTime);
};

const handleVolumeInput = (e) => {
  const val = parseFloat(e.target.value);
  playerStore.setVolume(val);
};

// Global Hotkeys
const handleKeyDown = (e) => {
  const activeEl = document.activeElement;
  const isInput = activeEl && ['INPUT', 'TEXTAREA'].includes(activeEl.tagName);
  if (isInput) return;

  switch (e.code) {
    case 'Space':
      e.preventDefault();
      playerStore.togglePlay();
      break;
    case 'KeyJ':
      playerStore.nextTrack();
      break;
    case 'KeyK':
      playerStore.prevTrack();
      break;
    case 'KeyS':
      playerStore.toggleShuffle();
      break;
    case 'KeyR':
      playerStore.cycleRepeat();
      break;
    case 'KeyM':
      playerStore.toggleMute();
      break;
    case 'KeyL':
      playerStore.toggleExpanded();
      break;
    case 'KeyQ':
      playerStore.toggleQueue();
      break;
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.pg-deck-wrapper {
  position: fixed;
  bottom: 20px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  padding: 0 24px;
  z-index: 990;
  pointer-events: none;
}

.pg-deck {
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 20px;
  width: 100%;
  max-width: 1320px;
  padding: 10px 20px;
  background: var(--pg-canvas);
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  box-shadow: var(--pg-shadow-solid-lg);
  transition: transform var(--pg-transition-spring);
}

/* 1. Track Cluster */
.deck-track-cluster {
  display: flex;
  align-items: center;
  gap: 14px;
  min-width: 240px;
  max-width: 320px;
  cursor: pointer;
}

.deck-vinyl-disc {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #14101E;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid var(--pg-border);
  box-shadow: 2px 2px 0px var(--pg-border);
  flex-shrink: 0;
  transition: transform var(--pg-transition-spring);
}

.deck-track-cluster:hover .deck-vinyl-disc {
  transform: scale(1.05) rotate(15deg);
}

.vinyl-groove-lines {
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.2);
}

.vinyl-center-label {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: var(--pg-coral);
  display: flex;
  align-items: center;
  justify-content: center;
}

.vinyl-hole {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: #14101E;
}

.deck-vinyl-disc.is-spinning {
  animation: vinylSpin 3s linear infinite;
}

@keyframes vinylSpin {
  100% { transform: rotate(360deg); }
}

.deck-track-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.track-header-row {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.track-title {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--pg-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.format-sticker {
  font-size: 0.62rem;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: var(--pg-radius-full);
  border: 1px solid var(--pg-border);
  flex-shrink: 0;
}

.badge-direct {
  background: var(--pg-citron);
  color: var(--pg-ink);
}

.badge-youtube {
  background: var(--pg-coral);
  color: #fff;
}

.badge-spotify {
  background: var(--pg-mint);
  color: var(--pg-ink);
}

.track-sub-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.76rem;
  color: var(--pg-ink-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  font-weight: 700;
  color: var(--pg-ink-secondary);
}

.track-album {
  color: var(--pg-ink-muted);
}

/* 2. Center Controls Cluster */
.deck-controls-cluster {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 1;
  max-width: 540px;
}

.deck-transport-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.deck-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--pg-ink-secondary);
  border: 1.5px solid transparent;
  background: transparent;
  cursor: pointer;
  position: relative;
  transition: all var(--pg-transition-spring);
}

.deck-btn:hover:not(:disabled) {
  background: var(--pg-surface-soft);
  color: var(--pg-ink);
  border-color: var(--pg-border);
  transform: translateY(-2px);
  box-shadow: 2px 2px 0px var(--pg-border);
}

.deck-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.deck-btn.is-active {
  background: var(--pg-surface-butter);
  color: var(--pg-ink);
  border-color: var(--pg-border);
  box-shadow: 2px 2px 0px var(--pg-border);
}

.repeat-one-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  font-size: 0.55rem;
  font-weight: 800;
  background: var(--pg-coral);
  color: #fff;
  padding: 0 4px;
  border-radius: var(--pg-radius-full);
}

.deck-main-play-btn {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--pg-cobalt);
  color: #fff;
  border: 2px solid var(--pg-border);
  box-shadow: 3px 3px 0px var(--pg-border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all var(--pg-transition-spring);
}

.deck-main-play-btn:hover:not(:disabled) {
  background: var(--pg-coral);
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0px var(--pg-border);
}

.deck-play-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  100% { transform: rotate(360deg); }
}

/* Scrubber */
.deck-scrubber-bar {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
}

.time-code {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--pg-ink-secondary);
  min-width: 32px;
}

.scrubber-track {
  flex: 1;
  height: 18px;
  display: flex;
  align-items: center;
  position: relative;
  cursor: pointer;
}

.rail-bg {
  position: absolute;
  left: 0;
  right: 0;
  height: 6px;
  background: var(--pg-surface-soft);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
}

.rail-fill {
  position: relative;
  height: 6px;
  background: var(--pg-cobalt);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  z-index: 2;
}

.scrubber-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--pg-citron);
  border: 2px solid var(--pg-border);
  box-shadow: 1.5px 1.5px 0px var(--pg-border);
  transform: translateX(50%);
  transition: transform var(--pg-transition-spring);
}

.scrubber-track:hover .scrubber-thumb {
  transform: translateX(50%) scale(1.25);
  background: var(--pg-coral);
}

.scrubber-tooltip {
  position: absolute;
  bottom: 22px;
  transform: translateX(-50%);
  background: var(--pg-ink);
  color: var(--pg-canvas);
  font-size: 0.65rem;
  font-weight: 800;
  padding: 2px 6px;
  border-radius: 4px;
  pointer-events: none;
}

.embedded-source-pill {
  font-size: 0.7rem;
  font-weight: 800;
  padding: 4px 12px;
  background: var(--pg-surface-soft);
  border: 1px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  color: var(--pg-ink-secondary);
}

/* 3. Meta Cluster */
.deck-meta-cluster {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 180px;
  justify-content: flex-end;
}

.deck-tool-btn {
  width: 34px;
  height: 34px;
  border-radius: var(--pg-radius-md);
  border: 1.5px solid var(--pg-border);
  background: var(--pg-surface-soft);
  color: var(--pg-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 2px 2px 0px var(--pg-border);
  transition: all var(--pg-transition-spring);
  position: relative;
}

.deck-tool-btn:hover {
  background: var(--pg-canvas);
  transform: translateY(-2px);
  box-shadow: 3px 3px 0px var(--pg-border);
}

.deck-tool-btn.is-active {
  background: var(--pg-citron);
}

.queue-counter {
  position: absolute;
  top: -4px;
  right: -4px;
  font-size: 0.62rem;
  font-weight: 800;
  background: var(--pg-coral);
  color: #fff;
  border-radius: var(--pg-radius-full);
  padding: 0 4px;
  border: 1px solid var(--pg-border);
}

.volume-container {
  display: flex;
  align-items: center;
  gap: 6px;
}

.desktop-volume-bar {
  width: 72px;
  display: flex;
  align-items: center;
}

.volume-range-input {
  width: 100%;
  accent-color: var(--pg-cobalt);
  cursor: pointer;
  height: 6px;
}

@media (max-width: 900px) {
  .desktop-only {
    display: none !important;
  }

  .pg-deck-wrapper {
    bottom: 82px; /* Positioned directly above the mobile bottom dock with clear separation */
    padding: 0 12px;
  }

  .pg-deck {
    padding: 8px 14px;
    gap: 10px;
  }

  .deck-track-cluster {
    min-width: unset;
    max-width: 180px;
  }

  .deck-vinyl-disc {
    width: 36px;
    height: 36px;
  }

  .track-title {
    font-size: 0.82rem;
  }

  .deck-main-play-btn {
    width: 36px;
    height: 36px;
  }

  .deck-scrubber-bar {
    display: none;
  }

  .deck-meta-cluster {
    min-width: unset;
  }
}
</style>
