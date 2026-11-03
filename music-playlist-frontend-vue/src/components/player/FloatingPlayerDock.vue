<template>
  <div
    class="dock glass"
    :class="{ show: isVisible }"
    id="dock"
    role="region"
    aria-label="Player"
  >
    <!-- Play/Pause Bubble Button -->
    <button
      class="pp"
      id="pp"
      :aria-label="playerStore.isPlaying ? 'Pause' : 'Play'"
      @click="handleTogglePlay"
    >
      <svg v-if="playerStore.isPlaying" viewBox="0 0 24 24">
        <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
      </svg>
      <svg v-else viewBox="0 0 24 24">
        <path d="M7 4v16l13-8z" />
      </svg>
    </button>

    <!-- Track Metadata & Interactive Progress Bar -->
    <div class="dm">
      <strong id="dT">{{ currentTrackTitle }}</strong>
      <small id="dA">{{ currentTrackArtist }}</small>
      <div
        class="pb"
        ref="progressBarRef"
        @click="handleSeek"
        role="progressbar"
        :aria-valuenow="Math.round(playerStore.currentTime)"
        :aria-valuemax="Math.round(playerStore.duration)"
        aria-valuemin="0"
        tabindex="0"
        @keydown.left.prevent="playerStore.seek(playerStore.currentTime - 5)"
        @keydown.right.prevent="playerStore.seek(playerStore.currentTime + 5)"
      >
        <div id="fill" :style="{ width: progressPercentage + '%' }"></div>
      </div>
    </div>

    <!-- Previous Track Button -->
    <button
      class="sk"
      id="prev"
      aria-label="Previous"
      @click="playerStore.prevTrack()"
    >
      <svg viewBox="0 0 24 24">
        <path d="M6 5h2v14H6zM20 5v14L9 12z" />
      </svg>
    </button>

    <!-- Next Track Button -->
    <button
      class="sk"
      id="next"
      aria-label="Next"
      @click="playerStore.nextTrack()"
    >
      <svg viewBox="0 0 24 24">
        <path d="M16 5h2v14h-2zM4 5v14l11-7z" />
      </svg>
    </button>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { usePlayerStore } from '../../stores/player';
import { popParticles } from '../../data/moodPlaylists';

const playerStore = usePlayerStore();
const progressBarRef = ref(null);
const isVisible = ref(false);

const currentTrackTitle = computed(() => {
  return playerStore.currentTrack?.title || playerStore.currentTrack?.[0] || 'No track selected';
});

const currentTrackArtist = computed(() => {
  return playerStore.currentTrack?.artist || playerStore.currentTrack?.[1] || 'Soundwave Audio';
});

const progressPercentage = computed(() => {
  if (!playerStore.duration || playerStore.duration <= 0) return 0;
  return Math.min(100, Math.max(0, (playerStore.currentTime / playerStore.duration) * 100));
});

const handleTogglePlay = (event) => {
  playerStore.togglePlay();
  if (playerStore.isPlaying && event) {
    const rect = event.currentTarget.getBoundingClientRect();
    popParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 22, {
      o1: playerStore.o1,
      o2: playerStore.o2,
    });
  }
};

const handleSeek = (event) => {
  if (!progressBarRef.value || !playerStore.duration) return;
  const rect = progressBarRef.value.getBoundingClientRect();
  const clickX = event.clientX - rect.left;
  const fraction = Math.max(0, Math.min(1, clickX / rect.width));
  const targetSeconds = fraction * playerStore.duration;
  playerStore.seek(targetSeconds);
};

const handleScroll = () => {
  if (typeof window === 'undefined') return;
  const sp = new URLSearchParams(window.location.search).get('section');
  if (sp === 'lists' || sp === 'now') {
    isVisible.value = true;
    return;
  }
  const sy = window.scrollY;
  const vh = window.innerHeight;
  isVisible.value = sy > vh * 0.7;
};

onMounted(() => {
  handleScroll();
  window.addEventListener('scroll', handleScroll, { passive: true });
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
});
</script>

<style scoped>
.dock {
  position: fixed;
  z-index: 40;
  left: 50%;
  bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  width: min(520px, calc(100% - 1.5rem));
  display: flex;
  align-items: center;
  gap: 0.9rem;
  border-radius: 99px;
  padding: 0.5rem 1rem 0.5rem 0.5rem;
  transform: translate(-50%, 160%);
  transition: transform 0.7s cubic-bezier(0.2, 1.5, 0.3, 1);
}

.dock.show {
  transform: translate(-50%, 0);
}

.dock .pp {
  width: 56px;
  height: 56px;
  border-radius: 50%;
  flex: none;
  color: #fff;
  background: radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.7), transparent 30%), linear-gradient(var(--o1), var(--o2));
  box-shadow: inset -4px -6px 10px rgba(0, 0, 0, 0.15), 0 8px 18px var(--sh);
  display: grid;
  place-items: center;
  transition: transform 0.25s cubic-bezier(0.2, 2, 0.4, 1);
}

.dock .pp:hover {
  transform: scale(1.12);
}

.dock .pp:active {
  transform: scale(0.9);
}

.dm {
  min-width: 0;
  flex: 1;
}

.dm strong,
.dm small {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dm small {
  color: var(--muted);
}

.pb {
  height: 6px;
  border-radius: 9px;
  background: rgba(43, 29, 90, 0.1);
  margin-top: 0.3rem;
  overflow: hidden;
  cursor: pointer;
  position: relative;
}

#fill {
  height: 100%;
  width: 0%;
  background: linear-gradient(90deg, var(--o1), var(--o2));
  border-radius: 9px;
  transition: width 0.1s linear;
}

.sk {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  transition: transform 0.2s;
  color: var(--ink);
}

.sk:hover {
  transform: scale(1.25);
}

svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}
</style>
