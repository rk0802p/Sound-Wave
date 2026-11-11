<template>
  <div
    v-if="uiStore.isQueueOpen"
    class="jb-modal-backdrop"
    @click.self="uiStore.closeQueue()"
  >
    <aside class="jb-queue-drawer font-mono" role="dialog" aria-label="Up Next Queue">
      <div class="jb-drawer-head">
        <div class="jb-drawer-head-left">
          <h3 class="jb-drawer-title font-display">UP NEXT QUEUE</h3>
          <span class="jb-drawer-count">{{ playerStore.queue?.length || 0 }} TRACKS</span>
        </div>
        <button
          type="button"
          class="jb-drawer-close"
          @click="uiStore.closeQueue()"
          aria-label="Close queue drawer"
        >
          ✕
        </button>
      </div>

      <div v-if="!playerStore.queue || playerStore.queue.length === 0" class="jb-empty-queue">
        NO TRACKS IN QUEUE.
      </div>

      <div v-else class="jb-queue-items">
        <div
          v-for="(t, qIdx) in playerStore.queue"
          :key="t._id || t.id || qIdx"
          class="jb-queue-row"
          :class="{ 'is-current': playerStore.trackIndex === qIdx }"
          @click="handlePlayQueueItem(qIdx)"
        >
          <span class="jb-qr-num">{{ qIdx + 1 }}</span>
          <div class="jb-qr-info">
            <span class="jb-qr-title font-display">{{ t.title || t[0] }}</span>
            <span class="jb-qr-artist">{{ t.artist || t[1] }}</span>
          </div>
          <a
            v-if="isJamendoTrack(t) && getTrackSourceUrl(t)"
            :href="getTrackSourceUrl(t)"
            target="_blank"
            rel="noopener noreferrer"
            class="jb-qr-prov"
            title="Open track on Jamendo"
            @click.stop
          >
            ↗ JAMENDO
          </a>
          <button
            type="button"
            class="jb-qr-del"
            @click.stop="playerStore.removeFromQueue(qIdx)"
            title="Remove from queue"
            aria-label="Remove track from queue"
          >
            ✕
          </button>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { useUiStore } from '../../stores/ui';
import { usePlayerStore } from '../../stores/player';

const uiStore = useUiStore();
const playerStore = usePlayerStore();

const handlePlayQueueItem = (idx) => {
  if (!playerStore.queue || !playerStore.queue[idx]) return;
  playerStore.playTrack(playerStore.queue[idx], playerStore.queue, idx);
};

const isJamendoTrack = (t) => {
  return t?.provider === 'jamendo' || t?.source?.provider === 'jamendo';
};

const getTrackSourceUrl = (t) => {
  const extId = t?.providerTrackId || t?.source?.externalId;
  if (extId) return `https://www.jamendo.com/track/${extId}`;
  return t?.source?.pageUrl || t?.source?.url || null;
};
</script>

<style scoped>
.jb-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(17, 17, 17, 0.6);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}

.jb-queue-drawer {
  position: fixed;
  right: 0;
  top: 0;
  bottom: 0;
  width: 360px;
  max-width: 90vw;
  background: var(--surface, #FFFDF8);
  border-left: var(--bw, 2px) solid var(--border, #111111);
  display: flex;
  flex-direction: column;
  z-index: 2100;
  padding-bottom: calc(var(--dock-height, 88px) + env(safe-area-inset-bottom, 0px));
}

.jb-drawer-head {
  padding: 1.25rem;
  border-bottom: var(--bw, 2px) solid var(--border, #111111);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.jb-drawer-head-left {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.jb-drawer-title {
  font-size: 1.15rem;
  font-weight: 900;
}

.jb-drawer-count {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--ink-muted, #4A4740);
}

.jb-drawer-close {
  background: none;
  border: 1.5px solid var(--border, #111111);
  border-radius: 4px;
  font-size: 0.85rem;
  font-weight: bold;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
}

.jb-empty-queue {
  padding: 3rem 1rem;
  text-align: center;
  color: var(--ink-muted, #4A4740);
  font-size: 0.85rem;
}

.jb-queue-items {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.jb-queue-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgba(17, 17, 17, 0.08);
  cursor: pointer;
}

.jb-queue-row:hover {
  background: rgba(17, 17, 17, 0.04);
}

.jb-queue-row.is-current {
  background: rgba(77, 107, 255, 0.12);
  border-left: 4px solid var(--c-blue, #4D6BFF);
}

.jb-qr-num {
  font-size: 0.75rem;
  color: var(--ink-muted, #4A4740);
}

.jb-qr-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.jb-qr-title {
  font-size: 0.88rem;
  font-weight: 900;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jb-qr-artist {
  font-size: 0.75rem;
  color: var(--ink-muted, #4A4740);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jb-qr-prov {
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--c-blue, #4D6BFF);
  text-decoration: none;
  white-space: nowrap;
}

.jb-qr-del {
  background: none;
  border: none;
  cursor: pointer;
  font-weight: bold;
  color: var(--danger, #E5372B);
}
</style>
