<template>
  <div
    v-if="playerStore.hasTrack"
    class="sw-acoustic-capsule-wrapper"
    :class="{ 'is-active': playerStore.isPlaying, 'is-embedded': isEmbeddedProvider }"
  >
    <div class="sw-acoustic-capsule">
      <!-- 1. Left Cluster: Vinyl Turntable Disc & Metadata -->
      <div class="capsule-track-group">
        <!-- Spinning Tactile Vinyl Disc -->
        <div
          class="vinyl-turntable-disc"
          :class="{ 'is-spinning': playerStore.isPlaying }"
          @click="playerStore.toggleExpanded()"
          title="Open Full Immersion Canvas"
        >
          <div class="turntable-grooves"></div>
          <div class="turntable-label">
            <span class="label-spindle"></span>
          </div>
        </div>

        <!-- Track Info & Provider Badge -->
        <div class="track-info" @click="playerStore.toggleExpanded()">
          <div class="title-row">
            <span class="track-title font-display">{{ playerStore.currentTrack.title }}</span>
            <!-- Provider Pill Badge -->
            <span
              class="provider-pill font-mono"
              :class="providerBadgeClass"
            >
              {{ providerLabel }}
            </span>
          </div>
          <div class="artist-row">
            <span class="track-artist">{{ playerStore.currentTrack.artist || 'Unknown Artist' }}</span>
            <span v-if="playerStore.currentTrack.album" class="track-album font-mono">
              • {{ playerStore.currentTrack.album }}
            </span>
          </div>
        </div>
      </div>

      <!-- 2. Center Cluster: Controls & Scrubbing Ribbon -->
      <div class="capsule-controls-group">
        <!-- Transport Buttons -->
        <div class="transport-bar">
          <button
            class="control-btn"
            :class="{ active: playerStore.shuffle }"
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
            class="control-btn"
            :disabled="!playerStore.hasPrevious"
            @click="playerStore.prevTrack()"
            title="Previous (K)"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="19 20 9 12 19 4 19 20"></polygon>
              <line x1="5" y1="19" x2="5" y2="5" stroke="currentColor" stroke-width="2"></line>
            </svg>
          </button>

          <!-- Main Play/Pause Magnetic Button -->
          <button
            class="main-play-btn"
            :disabled="playerStore.isLoading"
            @click="playerStore.togglePlay()"
            title="Play / Pause (Space)"
          >
            <div v-if="playerStore.isLoading" class="play-spinner"></div>
            <svg
              v-else-if="!playerStore.isPlaying"
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <polygon points="6 3 20 12 6 21 6 3"></polygon>
            </svg>
            <svg
              v-else
              width="20"
              height="20"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
          </button>

          <button
            class="control-btn"
            :disabled="!playerStore.hasNext"
            @click="playerStore.nextTrack()"
            title="Next (J)"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="5 4 15 12 5 20 5 4"></polygon>
              <line x1="19" y1="5" x2="19" y2="19" stroke="currentColor" stroke-width="2"></line>
            </svg>
          </button>

          <button
            class="control-btn"
            :class="{ active: playerStore.repeatMode !== 'off' }"
            @click="playerStore.cycleRepeat()"
            title="Repeat Mode (R)"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="17 1 21 5 17 9"></polyline>
              <path d="M3 11V9a4 4 0 0 1 4-4h14"></path>
              <polyline points="7 23 3 19 7 15"></polyline>
              <path d="M21 13v2a4 4 0 0 1-4 4H3"></path>
            </svg>
            <span v-if="playerStore.repeatMode === 'one'" class="repeat-one-pill font-mono">1</span>
          </button>
        </div>

        <!-- Scrubbing Ribbon with Hover Tooltip -->
        <div class="scrubbing-ribbon" v-if="!isEmbeddedProvider">
          <span class="time-readout font-mono">{{ formattedCurrentTime }}</span>

          <div
            class="scrubber-track"
            ref="scrubberRef"
            @mousemove="handleScrubberHover"
            @mouseleave="hoverTime = null"
            @click="handleScrubberSeek"
          >
            <!-- Background Micro-Waveform Rhythm -->
            <div class="micro-waveform-bg">
              <span v-for="n in 36" :key="n" class="micro-wave-tick" :style="{ height: `${((n * 7) % 10) + 4}px` }"></span>
            </div>

            <!-- Filled Progress Bar in Acid Lime & Coral -->
            <div
              class="scrubber-fill"
              :style="{ width: `${playerStore.progressPercentage}%` }"
            >
              <div class="scrubber-head"></div>
            </div>

            <!-- Hover Preview Tooltip -->
            <div
              v-if="hoverTime !== null"
              class="scrubber-tooltip font-mono"
              :style="{ left: `${hoverX}px` }"
            >
              {{ formatSeconds(hoverTime) }}
            </div>
          </div>

          <span class="time-readout font-mono">{{ formattedDuration }}</span>
        </div>

        <div v-else class="embedded-provider-notice font-mono">
          <span>HOSTED STREAM ACTIVE • INTERACT VIA EMBED</span>
        </div>
      </div>

      <!-- 3. Right Cluster: Volume, Queue, Immersion -->
      <div class="capsule-aux-group">
        <!-- Volume Control with Floating Popover -->
        <div class="volume-container" ref="volumeContainerRef">
          <button
            class="aux-btn"
            @click="toggleVolumePopover"
            title="Volume"
          >
            <svg v-if="playerStore.muted || playerStore.volume === 0" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <line x1="23" y1="9" x2="17" y2="15"></line>
              <line x1="17" y1="9" x2="23" y2="15"></line>
            </svg>
            <svg v-else-if="playerStore.volume < 0.5" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
            </svg>
            <svg v-else width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon>
              <path d="M15.54 8.46a5 5 0 0 1 0 7.07"></path>
              <path d="M19.07 4.93a10 10 0 0 1 0 14.14"></path>
            </svg>
          </button>

          <!-- Volume Popover Slider -->
          <transition name="sw-drop">
            <div v-if="showVolumePopover" class="volume-popover">
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                :value="playerStore.muted ? 0 : playerStore.volume"
                @input="handleVolumeChange"
                class="volume-slider"
              />
              <span class="vol-percent font-mono">{{ Math.round((playerStore.muted ? 0 : playerStore.volume) * 100) }}%</span>
            </div>
          </transition>
        </div>

        <!-- Queue Drawer Button -->
        <button
          class="aux-btn queue-btn"
          :class="{ active: playerStore.isQueueOpen }"
          @click="playerStore.toggleQueue()"
          title="Listening Queue (Q)"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
          <span v-if="playerStore.queue.length" class="queue-badge font-mono">
            {{ playerStore.queue.length }}
          </span>
        </button>

        <!-- Full Immersion Expand Button -->
        <button
          class="aux-btn expand-btn desktop-only"
          @click="playerStore.toggleExpanded()"
          title="Expand Immersion Canvas (E)"
        >
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
const volumeContainerRef = ref(null);
const hoverTime = ref(null);
const hoverX = ref(0);
const showVolumePopover = ref(false);

const isEmbeddedProvider = computed(() => {
  return playerStore.providerCapabilities?.isEmbedded || playerStore.currentProviderType === 'spotify';
});

const providerLabel = computed(() => {
  const type = playerStore.currentProviderType;
  if (type === 'youtube') return 'YOUTUBE HQ';
  if (type === 'spotify') return 'SPOTIFY';
  return 'LOSSLESS MP3';
});

const providerBadgeClass = computed(() => {
  const type = playerStore.currentProviderType;
  return `provider-${type}`;
});

const formatSeconds = (sec) => {
  if (isNaN(sec) || sec === null || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const formattedCurrentTime = computed(() => formatSeconds(playerStore.currentTime));
const formattedDuration = computed(() => formatSeconds(playerStore.duration));

const handleScrubberHover = (e) => {
  if (!scrubberRef.value || !playerStore.duration) return;
  const rect = scrubberRef.value.getBoundingClientRect();
  const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
  const ratio = clickX / rect.width;
  hoverTime.value = ratio * playerStore.duration;
  hoverX.value = clickX;
};

const handleScrubberSeek = (e) => {
  if (!scrubberRef.value || !playerStore.duration) return;
  const rect = scrubberRef.value.getBoundingClientRect();
  const clickX = Math.max(0, Math.min(e.clientX - rect.left, rect.width));
  const ratio = clickX / rect.width;
  playerStore.seekTo(ratio * playerStore.duration);
};

const toggleVolumePopover = () => {
  showVolumePopover.value = !showVolumePopover.value;
};

const handleVolumeChange = (e) => {
  const val = parseFloat(e.target.value);
  playerStore.setVolume(val);
  if (playerStore.muted && val > 0) {
    playerStore.toggleMute();
  }
};

const handleGlobalClick = (e) => {
  if (volumeContainerRef.value && !volumeContainerRef.value.contains(e.target)) {
    showVolumePopover.value = false;
  }
};

const handleKeyDown = (e) => {
  if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

  if (e.code === 'Space') {
    e.preventDefault();
    playerStore.togglePlay();
  } else if (e.key === 'j' || e.key === 'J') {
    if (playerStore.hasNext) playerStore.nextTrack();
  } else if (e.key === 'k' || e.key === 'K') {
    if (playerStore.hasPrevious) playerStore.prevTrack();
  } else if (e.key === 'q' || e.key === 'Q') {
    playerStore.toggleQueue();
  } else if (e.key === 'e' || e.key === 'E') {
    playerStore.toggleExpanded();
  }
};

onMounted(() => {
  window.addEventListener('click', handleGlobalClick);
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('click', handleGlobalClick);
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.sw-acoustic-capsule-wrapper {
  position: fixed;
  bottom: 22px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  padding: 0 24px;
  z-index: 85;
  pointer-events: none;
}

.sw-acoustic-capsule {
  pointer-events: auto;
  width: 100%;
  max-width: 1020px;
  height: 74px;
  background: rgba(24, 13, 41, 0.88);
  backdrop-filter: blur(32px) saturate(190%);
  -webkit-backdrop-filter: blur(32px) saturate(190%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--sw-radius-full);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px;
  box-shadow:
    0 24px 50px -10px rgba(0, 0, 0, 0.85),
    0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 1px 1px 0 rgba(255, 255, 255, 0.16);
  transition: all var(--sw-transition-normal);
}

.sw-acoustic-capsule-wrapper.is-active .sw-acoustic-capsule {
  border-color: rgba(204, 255, 0, 0.45);
  box-shadow:
    0 24px 50px -10px rgba(0, 0, 0, 0.9),
    0 0 30px -4px rgba(204, 255, 0, 0.3),
    inset 0 1px 1px 0 rgba(255, 255, 255, 0.22);
}

/* 1. Left Cluster */
.capsule-track-group {
  display: flex;
  align-items: center;
  gap: 14px;
  max-width: 300px;
  flex: 1 1 240px;
  overflow: hidden;
}

.vinyl-turntable-disc {
  position: relative;
  width: 44px;
  height: 44px;
  flex-shrink: 0;
  border-radius: 50%;
  background: radial-gradient(circle at center, #222 15%, #0d0d0d 60%, #151515 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.6);
  transition: transform var(--sw-transition-fast);
}

.vinyl-turntable-disc:hover {
  transform: scale(1.08);
}

.turntable-grooves {
  position: absolute;
  inset: 4px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.18);
}

.turntable-label {
  position: absolute;
  inset: 12px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--sw-accent), var(--sw-warm));
  display: flex;
  align-items: center;
  justify-content: center;
}

.label-spindle {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: #09040e;
}

.vinyl-turntable-disc.is-spinning {
  animation: spin-vinyl 4s linear infinite;
}

.track-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  overflow: hidden;
  cursor: pointer;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.track-title {
  font-size: 14px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.provider-pill {
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 1px 6px;
  border-radius: var(--sw-radius-full);
  flex-shrink: 0;
}

.provider-pill.provider-direct {
  color: var(--sw-accent);
  background: rgba(204, 255, 0, 0.14);
  border: 1px solid rgba(204, 255, 0, 0.35);
}

.provider-pill.provider-youtube {
  color: var(--sw-warm);
  background: rgba(255, 87, 34, 0.14);
  border: 1px solid rgba(255, 87, 34, 0.35);
}

.provider-pill.provider-spotify {
  color: #10b981;
  background: rgba(16, 185, 129, 0.14);
  border: 1px solid rgba(16, 185, 129, 0.35);
}

.artist-row {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--sw-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-album {
  font-size: 11px;
  color: var(--sw-text-muted);
}

/* 2. Center Cluster */
.capsule-controls-group {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  flex: 2 1 400px;
  max-width: 480px;
}

.transport-bar {
  display: flex;
  align-items: center;
  gap: 12px;
}

.control-btn {
  position: relative;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sw-text-secondary);
  border-radius: 50%;
  transition: all var(--sw-transition-fast);
}

.control-btn:hover:not(:disabled) {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.control-btn:disabled {
  opacity: 0.35;
  cursor: not-allowed;
}

.control-btn.active {
  color: var(--sw-accent);
}

.repeat-one-pill {
  position: absolute;
  top: 4px;
  right: 2px;
  font-size: 8px;
  font-weight: 800;
  color: var(--sw-accent);
}

.main-play-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--sw-accent);
  color: #0e0717;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 20px rgba(204, 255, 0, 0.4);
  transition: transform var(--sw-transition-fast), background var(--sw-transition-fast), box-shadow var(--sw-transition-fast);
}

.main-play-btn:hover:not(:disabled) {
  transform: scale(1.12);
  background: #d9ff33;
  box-shadow: 0 0 28px rgba(204, 255, 0, 0.6);
}

.play-spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(0, 0, 0, 0.2);
  border-top-color: #000;
  border-radius: 50%;
  animation: spin-vinyl 0.8s linear infinite;
}

/* Scrubbing Ribbon */
.scrubbing-ribbon {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
}

.time-readout {
  font-size: 11px;
  color: var(--sw-text-muted);
  width: 32px;
  text-align: center;
}

.scrubber-track {
  position: relative;
  flex: 1;
  height: 16px;
  display: flex;
  align-items: center;
  cursor: pointer;
}

.micro-waveform-bg {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  opacity: 0.25;
  pointer-events: none;
}

.micro-wave-tick {
  width: 2px;
  background: rgba(255, 255, 255, 0.35);
  border-radius: 1px;
}

.scrubber-fill {
  position: relative;
  height: 4px;
  background: linear-gradient(90deg, var(--sw-accent), var(--sw-warm));
  border-radius: var(--sw-radius-full);
  box-shadow: 0 0 12px rgba(204, 255, 0, 0.45);
  transition: height var(--sw-transition-fast);
}

.scrubber-track:hover .scrubber-fill {
  height: 6px;
}

.scrubber-head {
  position: absolute;
  right: -5px;
  top: 50%;
  transform: translateY(-50%) scale(0);
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.85);
  transition: transform var(--sw-transition-fast);
}

.scrubber-track:hover .scrubber-head {
  transform: translateY(-50%) scale(1);
}

.scrubber-tooltip {
  position: absolute;
  bottom: 22px;
  transform: translateX(-50%);
  padding: 2px 6px;
  font-size: 10px;
  background: rgba(14, 7, 23, 0.95);
  border: 1px solid rgba(204, 255, 0, 0.3);
  border-radius: 4px;
  color: #fff;
  pointer-events: none;
}

.embedded-provider-notice {
  font-size: 10px;
  color: var(--sw-text-muted);
  letter-spacing: 0.08em;
}

/* 3. Right Cluster */
.capsule-aux-group {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1 1 140px;
  justify-content: flex-end;
}

.aux-btn {
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sw-text-secondary);
  border-radius: 50%;
  transition: all var(--sw-transition-fast);
  position: relative;
}

.aux-btn:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.aux-btn.active {
  color: var(--sw-accent);
}

.queue-badge {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 9px;
  font-weight: 800;
  padding: 1px 4px;
  background: var(--sw-accent);
  color: #0e0717;
  border-radius: var(--sw-radius-full);
}

/* Volume Popover */
.volume-container {
  position: relative;
}

.volume-popover {
  position: absolute;
  bottom: calc(100% + 14px);
  right: 50%;
  transform: translateX(50%);
  width: 140px;
  background: rgba(24, 13, 41, 0.96);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--sw-radius-md);
  padding: 10px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.8);
}

.volume-slider {
  flex: 1;
  accent-color: var(--sw-accent);
  cursor: pointer;
}

.vol-percent {
  font-size: 10px;
  color: var(--sw-text-muted);
  width: 28px;
  text-align: right;
}

@media (max-width: 900px) {
  .sw-acoustic-capsule-wrapper {
    bottom: 96px;
    padding: 0 12px;
  }
  .sw-acoustic-capsule {
    height: 56px;
    padding: 0 12px;
  }
  .vinyl-turntable-disc {
    width: 36px;
    height: 36px;
  }
  .turntable-label {
    inset: 9px;
  }
  .main-play-btn {
    width: 32px;
    height: 32px;
  }
  .scrubbing-ribbon {
    display: none;
  }
  .capsule-track-group {
    max-width: 170px;
    gap: 10px;
  }
  .track-title {
    font-size: 12px;
  }
  .track-artist {
    font-size: 11px;
  }
  .provider-pill {
    display: none;
  }
}
</style>
