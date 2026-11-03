<template>
  <div class="audio-player-bar" :class="{ 'has-track': playerStore.hasTrack }">
    <div class="player-container">
      <!-- Left Section: Track Info -->
      <div class="track-info-section">
        <template v-if="playerStore.currentTrack">
          <div class="track-art-wrapper">
            <img
              :src="playerStore.currentTrack.coverImage || defaultCover"
              :alt="playerStore.currentTrack.title"
              class="track-cover"
              @error="onImgError"
            />
            <div v-if="playerStore.isPlaying" class="playing-equalizer-bars">
              <span></span><span></span><span></span>
            </div>
          </div>
          <div class="track-meta">
            <div class="track-title" :title="playerStore.currentTrack.title">
              {{ playerStore.currentTrack.title }}
            </div>
            <div class="track-artist" :title="playerStore.currentTrack.artist">
              {{ playerStore.currentTrack.artist }}
              <span v-if="playerStore.currentTrack.album" class="track-album">
                • {{ playerStore.currentTrack.album }}
              </span>
            </div>
            <div v-if="isExternal" class="external-pill">
              <span>{{ externalService }}</span>
              <a :href="playerStore.currentTrack.url" target="_blank" rel="noopener noreferrer" class="ext-btn">
                Open ↗
              </a>
            </div>
          </div>
        </template>
        <template v-else>
          <div class="empty-track-info">
            <div class="empty-disc">🎵</div>
            <div class="empty-text">Select a track to start playback</div>
          </div>
        </template>
      </div>

      <!-- Center Section: Controls & Progress -->
      <div class="player-controls-section">
        <div class="control-buttons">
          <!-- Shuffle -->
          <button
            class="ctrl-btn shuffle-btn"
            :class="{ active: playerStore.shuffle }"
            @click="playerStore.toggleShuffle()"
            title="Toggle Shuffle"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
            </svg>
          </button>

          <!-- Previous -->
          <button
            class="ctrl-btn prev-btn"
            :disabled="!playerStore.hasPrevious && !playerStore.hasTrack"
            @click="playerStore.previous()"
            title="Previous"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
            </svg>
          </button>

          <!-- Play / Pause -->
          <button
            class="ctrl-btn play-main-btn"
            :class="{ playing: playerStore.isPlaying }"
            @click="playerStore.togglePlay()"
            :title="playerStore.isPlaying ? 'Pause' : 'Play'"
          >
            <svg v-if="playerStore.isPlaying" width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
            </svg>
            <svg v-else width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </button>

          <!-- Next -->
          <button
            class="ctrl-btn next-btn"
            :disabled="!playerStore.hasNext && !playerStore.hasTrack"
            @click="playerStore.next()"
            title="Next"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
            </svg>
          </button>

          <!-- Repeat -->
          <button
            class="ctrl-btn repeat-btn"
            :class="{ active: playerStore.repeatMode !== 'off' }"
            @click="playerStore.cycleRepeat()"
            :title="`Repeat: ${playerStore.repeatMode}`"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M17 1l4 4-4 4M3 11V9a4 4 0 014-4h14M7 23l-4-4 4-4M21 13v2a4 4 0 01-4 4H3"/>
            </svg>
            <span v-if="playerStore.repeatMode === 'one'" class="repeat-one-badge">1</span>
          </button>
        </div>

        <!-- Progress Bar -->
        <div class="progress-container">
          <span class="time-label">{{ formatDuration(playerStore.currentTime) }}</span>
          <div class="scrubber-bar" @click="handleScrubberClick" ref="scrubberRef">
            <div class="scrubber-fill" :style="{ width: `${playerStore.progressPercentage}%` }">
              <div class="scrubber-handle"></div>
            </div>
          </div>
          <span class="time-label">{{ formatDuration(playerStore.duration) }}</span>
        </div>
      </div>

      <!-- Right Section: Volume & Queue Quick Stats -->
      <div class="player-utilities-section">
        <div class="volume-control">
          <button class="vol-btn" @click="playerStore.toggleMute()" :title="playerStore.isMuted ? 'Unmute' : 'Mute'">
            <svg v-if="playerStore.isMuted || playerStore.volume === 0" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/>
            </svg>
            <svg v-else-if="playerStore.volume < 0.5" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M7 9v6h4l5 5V4l-5 5H7z"/>
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
            :value="playerStore.isMuted ? 0 : playerStore.volume"
            @input="handleVolumeChange"
            class="volume-slider"
          />
        </div>

        <div v-if="playerStore.queue.length > 0" class="queue-badge" :title="`${playerStore.queue.length} tracks in queue`">
          <span>Queue: {{ playerStore.queueIndex + 1 }}/{{ playerStore.queue.length }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue';
import { usePlayerStore } from '../../stores/player';
import { formatDuration, isExternalMediaUrl, getExternalServiceName } from '../../data/demoTracks';

const playerStore = usePlayerStore();
const scrubberRef = ref(null);

const defaultCover = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=400&auto=format&fit=crop';

const isExternal = computed(() => {
  return playerStore.currentTrack ? isExternalMediaUrl(playerStore.currentTrack.url) : false;
});

const externalService = computed(() => {
  return playerStore.currentTrack ? getExternalServiceName(playerStore.currentTrack.url) : '';
});

const handleScrubberClick = (event) => {
  if (!scrubberRef.value || !playerStore.duration) return;
  const rect = scrubberRef.value.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const percentage = (clickX / rect.width) * 100;
  playerStore.seekByPercentage(percentage);
};

const handleVolumeChange = (event) => {
  playerStore.setVolume(parseFloat(event.target.value));
};

const onImgError = (e) => {
  e.target.src = defaultCover;
};
</script>

<style scoped>
.audio-player-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  height: 88px;
  background: rgba(13, 14, 22, 0.95);
  backdrop-filter: blur(20px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.6);
  z-index: 1000;
  display: flex;
  align-items: center;
  padding: 0 28px;
  color: #fff;
  transition: all 0.3s ease;
}

.player-container {
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 320px 1fr 280px;
  align-items: center;
  gap: 24px;
}

/* Track Info */
.track-info-section {
  display: flex;
  align-items: center;
  gap: 16px;
  min-width: 0;
}

.track-art-wrapper {
  position: relative;
  width: 56px;
  height: 56px;
  border-radius: 10px;
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.track-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.playing-equalizer-bars {
  position: absolute;
  bottom: 4px;
  right: 4px;
  display: flex;
  gap: 2px;
  height: 14px;
  align-items: flex-end;
  background: rgba(0, 0, 0, 0.6);
  padding: 2px 3px;
  border-radius: 4px;
}

.playing-equalizer-bars span {
  width: 2px;
  background: #6366f1;
  border-radius: 1px;
  animation: equalize 0.8s ease-in-out infinite alternate;
}

.playing-equalizer-bars span:nth-child(1) { height: 60%; animation-delay: 0.1s; }
.playing-equalizer-bars span:nth-child(2) { height: 100%; animation-delay: 0.3s; }
.playing-equalizer-bars span:nth-child(3) { height: 40%; animation-delay: 0.2s; }

@keyframes equalize {
  from { height: 20%; }
  to { height: 100%; }
}

.track-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.track-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  font-size: 0.8rem;
  color: #9ca3af;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-album {
  color: #6b7280;
}

.external-pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-size: 0.72rem;
  background: rgba(99, 102, 241, 0.15);
  color: #818cf8;
  padding: 2px 8px;
  border-radius: 6px;
  border: 1px solid rgba(99, 102, 241, 0.3);
  margin-top: 2px;
  width: fit-content;
}

.ext-btn {
  color: #a5b4fc;
  text-decoration: underline;
  font-weight: 600;
}

.empty-track-info {
  display: flex;
  align-items: center;
  gap: 12px;
  color: #6b7280;
}

.empty-disc {
  font-size: 1.6rem;
  opacity: 0.4;
}

.empty-text {
  font-size: 0.85rem;
  font-style: italic;
}

/* Controls */
.player-controls-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.control-buttons {
  display: flex;
  align-items: center;
  gap: 18px;
}

.ctrl-btn {
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  transition: all 0.2s ease;
  padding: 6px;
  border-radius: 50%;
}

.ctrl-btn:hover:not(:disabled) {
  color: #fff;
  transform: scale(1.1);
}

.ctrl-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.ctrl-btn.active {
  color: #6366f1;
}

.play-main-btn {
  width: 42px;
  height: 42px;
  background: #6366f1;
  color: #fff;
  border-radius: 50%;
  box-shadow: 0 4px 18px rgba(99, 102, 241, 0.5);
  transition: all 0.2s ease;
}

.play-main-btn:hover {
  background: #4f46e5;
  transform: scale(1.08) !important;
  box-shadow: 0 6px 22px rgba(99, 102, 241, 0.7);
}

.repeat-one-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  font-size: 0.65rem;
  font-weight: bold;
  background: #6366f1;
  color: #fff;
  width: 13px;
  height: 13px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Scrubber */
.progress-container {
  width: 100%;
  max-width: 580px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.time-label {
  font-size: 0.75rem;
  color: #9ca3af;
  font-variant-numeric: tabular-nums;
  width: 38px;
}

.scrubber-bar {
  flex: 1;
  height: 5px;
  background: rgba(255, 255, 255, 0.12);
  border-radius: 3px;
  cursor: pointer;
  position: relative;
  transition: height 0.15s ease;
}

.scrubber-bar:hover {
  height: 7px;
}

.scrubber-fill {
  height: 100%;
  background: linear-gradient(90deg, #6366f1, #8b5cf6);
  border-radius: 3px;
  position: relative;
}

.scrubber-handle {
  position: absolute;
  right: -5px;
  top: 50%;
  transform: translateY(-50%);
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 0 8px rgba(99, 102, 241, 0.8);
  opacity: 0;
  transition: opacity 0.15s;
}

.scrubber-bar:hover .scrubber-handle {
  opacity: 1;
}

/* Utilities */
.player-utilities-section {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 16px;
}

.volume-control {
  display: flex;
  align-items: center;
  gap: 8px;
}

.vol-btn {
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  display: flex;
  align-items: center;
}

.vol-btn:hover {
  color: #fff;
}

.volume-slider {
  width: 90px;
  accent-color: #6366f1;
  height: 4px;
  cursor: pointer;
}

.queue-badge {
  font-size: 0.75rem;
  color: #9ca3af;
  background: rgba(255, 255, 255, 0.06);
  padding: 4px 10px;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.08);
}

@media (max-width: 900px) {
  .player-container {
    grid-template-columns: 1fr auto;
  }
  .player-utilities-section {
    display: none;
  }
}
</style>
