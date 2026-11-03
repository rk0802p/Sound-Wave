<template>
  <div class="audio-player-bar" :class="{ 'has-track': playerStore.hasTrack }">
    <div class="player-container">
      <!-- Left Section: Track Info & Artwork -->
      <div class="track-info-section">
        <template v-if="playerStore.currentTrack">
          <div
            class="track-art-wrapper"
            @click="playerStore.toggleExpanded()"
            title="Open Fullscreen Listening Room (Click)"
            role="button"
            tabindex="0"
          >
            <ArtworkCover
              :src="playerStore.currentTrack.coverImage"
              :alt="playerStore.currentTrack.title"
              size="sm"
              :isPlaying="playerStore.isPlaying"
            />
          </div>

          <div class="track-meta">
            <div
              class="track-title font-display"
              :title="playerStore.currentTrack.title"
              @click="playerStore.toggleExpanded()"
            >
              {{ playerStore.currentTrack.title }}
            </div>
            <div class="track-artist-row" :title="playerStore.currentTrack.artist">
              <span class="track-artist">{{ playerStore.currentTrack.artist }}</span>
              <span v-if="playerStore.currentTrack.album" class="track-album">
                • {{ playerStore.currentTrack.album }}
              </span>
            </div>

            <!-- Provider Badge & Link -->
            <div class="provider-badge-row">
              <span class="provider-pill" :class="providerBadgeClass">
                {{ playerStore.providerCapabilities.badge || 'Audio' }}
              </span>
              <a
                v-if="isExternalLink"
                :href="playerStore.currentTrack.url"
                target="_blank"
                rel="noopener noreferrer"
                class="ext-btn"
                title="Open original media source in new tab"
              >
                Source ↗
              </a>
            </div>
          </div>
        </template>

        <template v-else>
          <div class="empty-track-info">
            <div class="empty-sound-icon">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M9 18V5l12-2v13"></path>
                <circle cx="6" cy="18" r="3"></circle>
                <circle cx="18" cy="16" r="3"></circle>
              </svg>
            </div>
            <div class="empty-text">
              <span class="empty-headline">Soundwave Engine Ready</span>
              <span class="empty-sub">Select any track to stream</span>
            </div>
          </div>
        </template>
      </div>

      <!-- Center Section: Master Playback Controls & Scrubber -->
      <div class="player-controls-section">
        <div class="control-buttons">
          <!-- Shuffle -->
          <button
            class="ctrl-btn shuffle-btn"
            :class="{ active: playerStore.shuffle }"
            @click="playerStore.toggleShuffle()"
            title="Toggle Shuffle"
            aria-label="Toggle Shuffle"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
            </svg>
          </button>

          <!-- Previous -->
          <button
            class="ctrl-btn prev-btn"
            :disabled="!playerStore.hasPrevious && !playerStore.hasTrack"
            @click="playerStore.previous()"
            title="Previous Track"
            aria-label="Previous Track"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          <!-- Main Play / Pause -->
          <button
            class="ctrl-btn play-main-btn"
            :class="{ playing: playerStore.isPlaying, loading: playerStore.isLoading }"
            @click="playerStore.togglePlay()"
            :title="playerStore.isPlaying ? 'Pause' : 'Play'"
            :aria-label="playerStore.isPlaying ? 'Pause' : 'Play'"
          >
            <span v-if="playerStore.isLoading" class="play-spinner"></span>
            <svg v-else-if="playerStore.isPlaying" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
            <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>

          <!-- Next -->
          <button
            class="ctrl-btn next-btn"
            :disabled="!playerStore.hasNext && !playerStore.hasTrack"
            @click="playerStore.next()"
            title="Next Track"
            aria-label="Next Track"
          >
            <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>

          <!-- Repeat -->
          <button
            class="ctrl-btn repeat-btn"
            :class="{ active: playerStore.repeatMode !== 'off' }"
            @click="playerStore.cycleRepeat()"
            :title="`Repeat Mode: ${playerStore.repeatMode}`"
            aria-label="Cycle Repeat Mode"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"/>
            </svg>
            <span v-if="playerStore.repeatMode === 'one'" class="repeat-one-badge">1</span>
          </button>
        </div>

        <!-- Progress Timeline Scrubber with Hover Tooltip -->
        <div class="progress-container">
          <span class="time-label tabular-nums">{{ formatDuration(playerStore.currentTime) }}</span>

          <div
            class="scrubber-bar"
            :class="{ disabled: !playerStore.providerCapabilities.canSeek }"
            @click="handleScrubberClick"
            @mousemove="handleScrubberHover"
            @mouseleave="hoverTime = null"
            ref="scrubberRef"
          >
            <!-- Hover Tooltip -->
            <div
              v-if="hoverTime !== null && playerStore.providerCapabilities.canSeek"
              class="scrub-tooltip tabular-nums"
              :style="{ left: `${hoverPercent}%` }"
            >
              {{ formatDuration(hoverTime) }}
            </div>

            <div class="scrubber-track">
              <div
                class="scrubber-fill"
                :style="{ width: `${playerStore.progressPercentage}%` }"
              >
                <div class="scrubber-handle"></div>
              </div>
            </div>
          </div>

          <span class="time-label tabular-nums">{{ formatDuration(playerStore.duration) }}</span>
        </div>
      </div>

      <!-- Right Section: Volume, Queue & Expanded Listening Room -->
      <div class="player-utilities-section">
        <!-- Volume Control -->
        <div class="volume-control" v-if="playerStore.providerCapabilities.canVolume">
          <button
            class="vol-btn"
            @click="playerStore.toggleMute()"
            :title="playerStore.muted ? 'Unmute' : 'Mute'"
            aria-label="Toggle Mute"
          >
            <svg v-if="playerStore.muted || playerStore.volume === 0" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
            <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
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
            class="volume-slider"
            aria-label="Volume Slider"
          />
        </div>

        <!-- Queue Drawer Button -->
        <button
          class="util-btn queue-btn"
          :class="{ active: playerStore.isQueueOpen }"
          @click="playerStore.toggleQueue()"
          title="Toggle Playback Queue"
          aria-label="Toggle Playback Queue"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <line x1="8" y1="6" x2="21" y2="6"></line>
            <line x1="8" y1="12" x2="21" y2="12"></line>
            <line x1="8" y1="18" x2="21" y2="18"></line>
            <line x1="3" y1="6" x2="3.01" y2="6"></line>
            <line x1="3" y1="12" x2="3.01" y2="12"></line>
            <line x1="3" y1="18" x2="3.01" y2="18"></line>
          </svg>
          <span v-if="playerStore.queue.length" class="queue-badge tabular-nums">
            {{ playerStore.queue.length }}
          </span>
        </button>

        <!-- Fullscreen / Expand Listening Room Trigger -->
        <button
          class="util-btn expand-btn"
          @click="playerStore.toggleExpanded()"
          title="Expand Listening Room (Esc to close)"
          aria-label="Expand Listening Room"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
import { computed, ref } from 'vue';
import { usePlayerStore } from '../../stores/player';
import { formatDuration, isExternalMediaUrl } from '../../data/demoTracks';
import ArtworkCover from '../common/ArtworkCover.vue';

const playerStore = usePlayerStore();
const scrubberRef = ref(null);
const hoverTime = ref(null);
const hoverPercent = ref(0);

const isExternalLink = computed(() => {
  return playerStore.currentTrack ? isExternalMediaUrl(playerStore.currentTrack.url) : false;
});

const providerBadgeClass = computed(() => {
  const badge = playerStore.providerCapabilities?.badge?.toLowerCase() || '';
  if (badge.includes('youtube')) return 'badge-youtube';
  if (badge.includes('spotify')) return 'badge-spotify';
  return 'badge-direct';
});

const handleScrubberClick = (event) => {
  if (!scrubberRef.value || !playerStore.duration || !playerStore.providerCapabilities.canSeek) return;
  const rect = scrubberRef.value.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const percentage = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
  playerStore.seekByPercentage(percentage);
};

const handleScrubberHover = (event) => {
  if (!scrubberRef.value || !playerStore.duration || !playerStore.providerCapabilities.canSeek) return;
  const rect = scrubberRef.value.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const pct = Math.max(0, Math.min(100, (clickX / rect.width) * 100));
  hoverPercent.value = pct;
  hoverTime.value = (pct / 100) * playerStore.duration;
};
</script>

<style scoped>
.audio-player-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: var(--sw-player-height);
  background: var(--sw-player-bg);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  border-top: 1px solid var(--sw-border);
  box-shadow: 0 -8px 30px rgba(0, 0, 0, 0.5);
  z-index: 1000;
  display: flex;
  align-items: center;
  padding: 0 28px;
  color: var(--sw-text-primary);
  user-select: none;
}

.player-container {
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 280px 1fr 240px;
  align-items: center;
  gap: 24px;
}

/* Track Info */
.track-info-section {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.track-art-wrapper {
  cursor: pointer;
  border-radius: var(--sw-radius-md);
  transition: transform var(--sw-transition-fast);
}

.track-art-wrapper:hover {
  transform: scale(1.05);
}

.track-meta {
  display: flex;
  flex-direction: column;
  min-width: 0;
  overflow: hidden;
  gap: 2px;
}

.track-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--sw-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  cursor: pointer;
  letter-spacing: -0.01em;
}

.track-title:hover {
  color: var(--sw-accent);
}

.track-artist-row {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 0.76rem;
  color: var(--sw-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.provider-badge-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 2px;
}

.provider-pill {
  font-family: var(--sw-font-mono);
  font-size: 0.62rem;
  font-weight: 600;
  padding: 1px 6px;
  border-radius: 4px;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.badge-direct {
  background: rgba(56, 189, 248, 0.12);
  color: var(--sw-accent);
  border: 1px solid rgba(56, 189, 248, 0.25);
}

.badge-youtube {
  background: rgba(244, 63, 94, 0.12);
  color: #fb7185;
  border: 1px solid rgba(244, 63, 94, 0.25);
}

.badge-spotify {
  background: rgba(16, 185, 129, 0.12);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.25);
}

.ext-btn {
  font-size: 0.68rem;
  color: var(--sw-text-muted);
  text-decoration: underline;
}

.ext-btn:hover {
  color: var(--sw-text-primary);
}

.empty-track-info {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--sw-text-muted);
}

.empty-sound-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--sw-radius-sm);
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  display: flex;
  align-items: center;
  justify-content: center;
}

.empty-text {
  display: flex;
  flex-direction: column;
}

.empty-headline {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--sw-text-secondary);
}

.empty-sub {
  font-size: 0.72rem;
  color: var(--sw-text-muted);
}

/* Center Controls & Scrubber */
.player-controls-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  width: 100%;
  max-width: 680px;
  margin: 0 auto;
}

.control-buttons {
  display: flex;
  align-items: center;
  gap: 14px;
}

.ctrl-btn {
  background: transparent;
  border: none;
  color: var(--sw-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  padding: 6px;
  border-radius: 50%;
  transition: all var(--sw-transition-fast);
  position: relative;
}

.ctrl-btn:hover:not(:disabled) {
  color: var(--sw-text-primary);
  transform: scale(1.08);
}

.ctrl-btn:active:not(:disabled) {
  transform: scale(0.95);
}

.ctrl-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.ctrl-btn.active {
  color: var(--sw-accent);
}

.repeat-one-badge {
  position: absolute;
  top: 1px;
  right: 1px;
  font-size: 0.6rem;
  font-family: var(--sw-font-mono);
  font-weight: 700;
  background: var(--sw-accent);
  color: #060709;
  border-radius: 50%;
  width: 12px;
  height: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Master Play Button */
.play-main-btn {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--sw-text-primary);
  color: #060709;
  box-shadow: 0 4px 14px rgba(255, 255, 255, 0.15);
}

.play-main-btn:hover:not(:disabled) {
  background: var(--sw-accent);
  color: #060709;
  box-shadow: 0 4px 20px var(--sw-accent-glow);
  transform: scale(1.06);
}

.play-spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(0, 0, 0, 0.2);
  border-top-color: #000;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

/* Progress Timeline */
.progress-container {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
}

.time-label {
  font-size: 0.72rem;
  color: var(--sw-text-muted);
  min-width: 34px;
  text-align: center;
}

.scrubber-bar {
  flex: 1;
  height: 18px;
  display: flex;
  align-items: center;
  cursor: pointer;
  position: relative;
}

.scrubber-bar.disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.scrubber-track {
  width: 100%;
  height: 4px;
  border-radius: var(--sw-radius-full);
  background: rgba(255, 255, 255, 0.1);
  position: relative;
  overflow: visible;
  transition: height var(--sw-transition-fast);
}

.scrubber-bar:hover:not(.disabled) .scrubber-track {
  height: 6px;
}

.scrubber-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--sw-accent), #60a5fa);
  border-radius: var(--sw-radius-full);
  position: relative;
  transition: width 80ms linear;
}

.scrubber-handle {
  position: absolute;
  right: -5px;
  top: 50%;
  transform: translateY(-50%) scale(0);
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
  transition: transform var(--sw-transition-fast);
}

.scrubber-bar:hover:not(.disabled) .scrubber-handle {
  transform: translateY(-50%) scale(1);
}

.scrub-tooltip {
  position: absolute;
  top: -24px;
  transform: translateX(-50%);
  background: var(--sw-surface-3, #242938);
  color: var(--sw-text-primary);
  font-size: 0.68rem;
  padding: 2px 6px;
  border-radius: 4px;
  border: 1px solid var(--sw-border);
  box-shadow: var(--sw-shadow-sm);
  pointer-events: none;
}

/* Utilities Section */
.player-utilities-section {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 120px;
}

.vol-btn {
  background: transparent;
  border: none;
  color: var(--sw-text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  padding: 4px;
}

.vol-btn:hover {
  color: var(--sw-text-primary);
}

.volume-slider {
  width: 100%;
  height: 4px;
  border-radius: var(--sw-radius-full);
  appearance: none;
  background: rgba(255, 255, 255, 0.12);
  outline: none;
  cursor: pointer;
}

.volume-slider::-webkit-slider-thumb {
  appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--sw-text-primary);
  cursor: pointer;
  transition: transform var(--sw-transition-fast);
}

.volume-slider::-webkit-slider-thumb:hover {
  transform: scale(1.3);
  background: var(--sw-accent);
}

.util-btn {
  background: transparent;
  border: none;
  color: var(--sw-text-secondary);
  cursor: pointer;
  padding: 6px;
  border-radius: var(--sw-radius-sm);
  display: flex;
  align-items: center;
  position: relative;
  transition: all var(--sw-transition-fast);
}

.util-btn:hover {
  color: var(--sw-text-primary);
  background: var(--sw-surface-hover);
}

.util-btn.active {
  color: var(--sw-accent);
}

.queue-badge {
  position: absolute;
  top: 0;
  right: -2px;
  font-size: 0.6rem;
  background: var(--sw-accent);
  color: #060709;
  font-weight: 700;
  border-radius: var(--sw-radius-full);
  padding: 1px 5px;
}

@media (max-width: 900px) {
  .player-container {
    grid-template-columns: 1fr auto;
    gap: 12px;
  }
  .player-controls-section {
    grid-column: 1 / -1;
    order: 3;
    padding-top: 4px;
  }
  .audio-player-bar {
    height: auto;
    padding: 12px 16px;
  }
  .volume-control {
    display: none;
  }
}
</style>
