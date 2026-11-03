<template>
  <Teleport to="body">
    <div
      v-if="playerStore.isQueueOpen"
      class="queue-backdrop"
      @click.self="playerStore.closeQueue()"
      @keydown.esc="playerStore.closeQueue()"
      tabindex="-1"
      ref="drawerBackdropRef"
    >
      <aside class="queue-drawer">
        <!-- Header -->
        <div class="queue-header">
          <div class="header-titles">
            <span class="queue-eyebrow font-mono">PLAYLIST SEQUENCE</span>
            <h3 class="queue-title font-display">Current Queue</h3>
            <span class="queue-count-badge tabular-nums">
              {{ playerStore.queue.length }} {{ playerStore.queue.length === 1 ? 'track' : 'tracks' }}
            </span>
          </div>

          <div class="header-actions">
            <button
              v-if="playerStore.queue.length"
              class="clear-queue-btn"
              @click="handleClearQueue"
              title="Clear Queue"
            >
              Clear
            </button>
            <button
              class="drawer-close-btn"
              @click="playerStore.closeQueue()"
              title="Close Queue (Esc)"
              aria-label="Close Queue"
            >
              ✕
            </button>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="playerStore.queue.length === 0" class="queue-empty-box">
          <div class="empty-icon-ring">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
            </svg>
          </div>
          <h4>Queue is Empty</h4>
          <p>Stream any playlist or track to start generating your playback queue.</p>
        </div>

        <!-- Populated Queue -->
        <div v-else class="queue-content-scroller">
          <!-- Currently Playing Card -->
          <div v-if="playerStore.currentTrack" class="now-playing-card">
            <span class="now-playing-tag font-mono">NOW RESONATING</span>
            <div class="now-playing-row">
              <ArtworkCover
                :src="playerStore.currentTrack.coverImage"
                :alt="playerStore.currentTrack.title"
                size="xs"
                :isPlaying="playerStore.isPlaying"
              />
              <div class="np-info">
                <span class="np-title">{{ playerStore.currentTrack.title }}</span>
                <span class="np-artist">{{ playerStore.currentTrack.artist }}</span>
              </div>
              <div class="np-eq" :class="{ active: playerStore.isPlaying }">
                <span></span><span></span><span></span>
              </div>
            </div>
          </div>

          <!-- Next Up List -->
          <div class="next-up-header font-mono">UP NEXT</div>

          <ul class="queue-list">
            <li
              v-for="(track, index) in playerStore.queue"
              :key="track._id || index"
              class="queue-item"
              :class="{ 'is-active-row': index === playerStore.queueIndex }"
              @click="playerStore.playTrack(track, playerStore.queue, index)"
            >
              <span class="track-num tabular-nums">{{ index + 1 }}</span>

              <ArtworkCover
                :src="track.coverImage"
                :alt="track.title"
                size="xs"
              />

              <div class="track-info">
                <span class="track-title" :title="track.title">{{ track.title }}</span>
                <span class="track-artist" :title="track.artist">{{ track.artist }}</span>
              </div>

              <span class="track-duration tabular-nums">{{ formatDuration(track.duration) }}</span>

              <button
                class="remove-item-btn"
                @click.stop="handleRemoveTrack(index)"
                title="Remove from queue"
                aria-label="Remove from queue"
              >
                ✕
              </button>
            </li>
          </ul>
        </div>
      </aside>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, onMounted, nextTick, watch } from 'vue';
import { usePlayerStore } from '../../stores/player';
import { formatDuration } from '../../data/demoTracks';
import ArtworkCover from '../common/ArtworkCover.vue';

const playerStore = usePlayerStore();
const drawerBackdropRef = ref(null);

const handleClearQueue = () => {
  playerStore.queue = [];
  playerStore.queueIndex = -1;
};

const handleRemoveTrack = (index) => {
  playerStore.queue.splice(index, 1);
  if (playerStore.queueIndex > index) {
    playerStore.queueIndex--;
  } else if (playerStore.queueIndex === index && playerStore.queue.length > 0) {
    playerStore.playTrack(playerStore.queue[0], playerStore.queue, 0);
  }
};

watch(
  () => playerStore.isQueueOpen,
  (open) => {
    if (open) {
      nextTick(() => {
        drawerBackdropRef.value?.focus();
      });
    }
  }
);
</script>

<style scoped>
.queue-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(6, 7, 9, 0.75);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 1200;
  display: flex;
  justify-content: flex-end;
  outline: none;
}

.queue-drawer {
  width: 100%;
  max-width: 400px;
  height: 100%;
  background: var(--pg-canvas);
  border-left: 2px solid var(--pg-border);
  display: flex;
  flex-direction: column;
  padding: 24px 20px;
  box-shadow: -6px 0 0px var(--pg-border);
  animation: drawerSlide 260ms var(--sw-ease-out);
}

@keyframes drawerSlide {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.queue-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--sw-border-subtle);
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.queue-eyebrow {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--sw-accent);
  letter-spacing: 0.1em;
}

.queue-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--sw-text-primary);
}

.queue-count-badge {
  font-size: 0.72rem;
  color: var(--sw-text-muted);
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.clear-queue-btn {
  font-size: 0.75rem;
  color: var(--sw-text-muted);
  padding: 4px 10px;
  border-radius: var(--sw-radius-sm);
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.clear-queue-btn:hover {
  color: var(--sw-danger);
  border-color: rgba(244, 63, 94, 0.3);
}

.drawer-close-btn {
  color: var(--sw-text-secondary);
  font-size: 1.1rem;
  padding: 4px 8px;
  border-radius: var(--sw-radius-sm);
  cursor: pointer;
}

.drawer-close-btn:hover {
  color: #fff;
  background: var(--sw-surface-hover);
}

.queue-content-scroller {
  flex: 1;
  overflow-y: auto;
  margin-top: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Now Playing Highlight Card */
.now-playing-card {
  background: rgba(204, 255, 0, 0.08);
  border: 1px solid rgba(204, 255, 0, 0.25);
  border-radius: var(--sw-radius-md);
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.now-playing-tag {
  font-size: 0.62rem;
  font-weight: 700;
  color: var(--sw-accent);
  letter-spacing: 0.08em;
}

.now-playing-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.np-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.np-title {
  font-size: 0.84rem;
  font-weight: 700;
  color: var(--sw-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.np-artist {
  font-size: 0.74rem;
  color: var(--sw-text-secondary);
}

.np-eq {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 14px;
}

.np-eq span {
  width: 2px;
  background: var(--sw-accent);
  border-radius: 1px;
}

.np-eq.active span {
  animation: eqBounce 0.8s ease-in-out infinite alternate;
}

.np-eq.active span:nth-child(1) { height: 40%; animation-delay: 0.1s; }
.np-eq.active span:nth-child(2) { height: 100%; animation-delay: 0.3s; }
.np-eq.active span:nth-child(3) { height: 60%; animation-delay: 0.2s; }

@keyframes eqBounce {
  0% { height: 25%; }
  100% { height: 100%; }
}

.next-up-header {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--sw-text-muted);
  letter-spacing: 0.1em;
  margin-top: 8px;
}

.queue-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--sw-radius-md);
  cursor: pointer;
  background: var(--sw-surface);
  border: 1px solid transparent;
  transition: all var(--sw-transition-fast);
}

.queue-item:hover {
  background: var(--sw-surface-hover);
  border-color: var(--sw-border);
}

.queue-item.is-active-row {
  border-color: rgba(204, 255, 0, 0.4);
  background: rgba(204, 255, 0, 0.08);
}

.track-num {
  font-size: 0.72rem;
  color: var(--sw-text-muted);
  min-width: 18px;
  text-align: center;
}

.track-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.track-title {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--sw-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  font-size: 0.72rem;
  color: var(--sw-text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-duration {
  font-size: 0.72rem;
  color: var(--sw-text-muted);
}

.remove-item-btn {
  opacity: 0;
  color: var(--sw-text-muted);
  padding: 4px 6px;
  font-size: 0.75rem;
  border-radius: 4px;
  transition: all var(--sw-transition-fast);
}

.queue-item:hover .remove-item-btn {
  opacity: 1;
}

.remove-item-btn:hover {
  color: var(--sw-danger);
  background: rgba(244, 63, 94, 0.12);
}

.queue-empty-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  gap: 8px;
  color: var(--sw-text-muted);
  padding: 40px 20px;
}

.empty-icon-ring {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--sw-surface);
  border: 1px dashed var(--sw-border);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--sw-text-secondary);
}

.queue-empty-box h4 {
  font-size: 1rem;
  color: var(--sw-text-primary);
}

.queue-empty-box p {
  font-size: 0.82rem;
  line-height: 1.4;
}
</style>
