<template>
  <div v-if="playerStore.isQueueOpen" class="queue-backdrop" @click.self="playerStore.closeQueue()">
    <aside class="queue-drawer">
      <div class="queue-header">
        <div class="header-title">
          <h3>Playback Queue</h3>
          <span class="queue-count">{{ playerStore.queue.length }} tracks</span>
        </div>
        <button class="close-btn" @click="playerStore.closeQueue()">✕</button>
      </div>

      <div v-if="playerStore.queue.length === 0" class="queue-empty">
        <p>Queue is empty</p>
      </div>

      <ul v-else class="queue-list">
        <li
          v-for="(track, index) in playerStore.queue"
          :key="track._id || index"
          class="queue-item"
          :class="{ 'is-now-playing': index === playerStore.queueIndex }"
          @click="playerStore.playTrack(track, playerStore.queue, index)"
        >
          <span class="track-index">{{ index + 1 }}</span>
          <img :src="track.coverImage || defaultCover" :alt="track.title" class="track-thumb" />
          <div class="track-info">
            <span class="track-name">{{ track.title }}</span>
            <span class="track-artist">{{ track.artist }}</span>
          </div>
          <span class="track-duration tabular-nums">{{ formatDuration(track.duration) }}</span>
        </li>
      </ul>
    </aside>
  </div>
</template>

<script setup>
import { usePlayerStore } from '../../stores/player';
import { formatDuration } from '../../data/demoTracks';

const playerStore = usePlayerStore();
const defaultCover = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=200&auto=format&fit=crop';
</script>

<style scoped>
.queue-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  z-index: 1100;
  display: flex;
  justify-content: flex-end;
}

.queue-drawer {
  width: 100%;
  max-width: 380px;
  height: 100%;
  background: var(--bg-surface);
  border-left: 1px solid var(--border-default);
  display: flex;
  flex-direction: column;
  padding: 24px;
  animation: slideLeft 0.25s ease;
}

@keyframes slideLeft {
  from { transform: translateX(100%); }
  to { transform: translateX(0); }
}

.queue-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
  padding-bottom: 16px;
  border-bottom: 1px solid var(--border-default);
}

.header-title h3 {
  font-size: 1.15rem;
  font-weight: 700;
  margin: 0;
}

.queue-count {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--text-secondary);
  font-size: 1.2rem;
  cursor: pointer;
}

.close-btn:hover {
  color: var(--text-primary);
}

.queue-empty {
  padding: 40px 0;
  text-align: center;
  color: var(--text-muted);
}

.queue-list {
  list-style: none;
  padding: 0;
  margin: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.queue-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-md);
  cursor: pointer;
  transition: background 0.15s;
}

.queue-item:hover {
  background: var(--bg-hover);
}

.queue-item.is-now-playing {
  background: var(--accent-soft);
  border: 1px solid rgba(118, 107, 255, 0.3);
}

.track-index {
  font-size: 0.8rem;
  color: var(--text-muted);
  width: 20px;
  text-align: center;
}

.is-now-playing .track-index {
  color: var(--accent-primary);
  font-weight: 700;
}

.track-thumb {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  object-fit: cover;
  flex-shrink: 0;
}

.track-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.track-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.is-now-playing .track-name {
  color: var(--accent-primary);
}

.track-artist {
  font-size: 0.78rem;
  color: var(--text-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-duration {
  font-size: 0.8rem;
  color: var(--text-muted);
}
</style>
