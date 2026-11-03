<template>
  <div
    class="sw-artwork-wrapper"
    :class="[
      `size-${size}`,
      { 'has-vinyl': showVinyl, 'has-glow': glow, 'is-spinning': isPlaying && showVinyl }
    ]"
  >
    <!-- Vinyl Disc (Peeks out on hover or spins when playing) -->
    <div v-if="showVinyl" class="vinyl-disc" :class="{ spinning: isPlaying }">
      <div class="vinyl-groove groove-1"></div>
      <div class="vinyl-groove groove-2"></div>
      <div class="vinyl-center-label">
        <div class="vinyl-hole"></div>
      </div>
    </div>

    <!-- Main Album / Playlist Sleeve Cover -->
    <div class="sleeve-card">
      <img
        v-if="src && !hasError"
        :src="src"
        :alt="alt || 'Cover Artwork'"
        class="artwork-img"
        :class="{ loaded: isLoaded }"
        @load="isLoaded = true"
        @error="hasError = true"
        loading="lazy"
      />

      <!-- Generative Acoustic Fallback (When no cover or broken link) -->
      <div v-else class="artwork-fallback" :style="fallbackStyle">
        <div class="fallback-pattern">
          <svg viewBox="0 0 100 100" class="fallback-waveform">
            <path d="M10 50 Q 25 20, 40 50 T 70 50 T 90 50" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" />
            <path d="M10 50 Q 30 75, 50 50 T 75 50 T 90 50" fill="none" stroke="currentColor" stroke-width="1.5" stroke-dasharray="2,3" opacity="0.6" />
          </svg>
        </div>
        <div class="fallback-monogram">{{ monogram }}</div>
      </div>

      <!-- Shimmer Placeholder while loading -->
      <div v-if="src && !isLoaded && !hasError" class="artwork-shimmer"></div>

      <!-- Playing Indicator Overlay (Optional) -->
      <div v-if="isPlaying && !showVinyl" class="playing-pulse-badge">
        <div class="mini-equalizer">
          <span></span><span></span><span></span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  src: {
    type: String,
    default: '',
  },
  alt: {
    type: String,
    default: '',
  },
  size: {
    type: String,
    default: 'md', // 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'hero'
  },
  showVinyl: {
    type: Boolean,
    default: false,
  },
  glow: {
    type: Boolean,
    default: false,
  },
  isPlaying: {
    type: Boolean,
    default: false,
  },
  fallbackSeed: {
    type: String,
    default: 'Soundwave',
  },
});

const isLoaded = ref(false);
const hasError = ref(false);

const monogram = computed(() => {
  const seed = props.alt || props.fallbackSeed || 'SW';
  return seed
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('') || 'SW';
});

// Deterministic pleasing acoustic gradients based on string hash
const fallbackStyle = computed(() => {
  const str = props.alt || props.fallbackSeed || 'Soundwave';
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = str.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hues = [
    'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
    'linear-gradient(135deg, #042f2e 0%, #0f172a 100%)',
    'linear-gradient(135deg, #1c1917 0%, #2e1065 100%)',
    'linear-gradient(135deg, #09090b 0%, #172554 100%)',
    'linear-gradient(135deg, #18181b 0%, #311042 100%)',
  ];
  const bg = hues[Math.abs(hash) % hues.length];
  return { background: bg };
});
</script>

<style scoped>
.sw-artwork-wrapper {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  user-select: none;
}

/* Sizing */
.size-xs { width: 36px; height: 36px; }
.size-sm { width: 48px; height: 48px; }
.size-md { width: 68px; height: 68px; }
.size-lg { width: 140px; height: 140px; }
.size-xl { width: 220px; height: 220px; }
.size-hero { width: 260px; height: 260px; }

@media (max-width: 640px) {
  .size-hero { width: 180px; height: 180px; }
  .size-xl { width: 160px; height: 160px; }
}

.sleeve-card {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: var(--sw-radius-md);
  overflow: hidden;
  background: var(--sw-surface-2, #1a202e);
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: var(--sw-shadow-md);
  z-index: 2;
  transition: transform var(--sw-transition-normal), box-shadow var(--sw-transition-normal);
}

.has-glow .sleeve-card {
  box-shadow: var(--sw-shadow-glow), var(--sw-shadow-lg);
}

.artwork-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  opacity: 0;
  transform: scale(1.04);
  transition: opacity 300ms ease, transform 400ms var(--sw-ease-out);
}

.artwork-img.loaded {
  opacity: 1;
  transform: scale(1);
}

/* Fallback Generative Card */
.artwork-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  color: var(--sw-accent);
}

.fallback-pattern {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0.25;
}

.fallback-waveform {
  width: 70%;
  height: 70%;
}

.fallback-monogram {
  font-family: var(--sw-font-display);
  font-weight: 700;
  font-size: 1.4em;
  letter-spacing: 0.06em;
  color: var(--sw-text-primary);
  opacity: 0.9;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.6);
  z-index: 2;
}

/* Shimmer Skeleton */
.artwork-shimmer {
  position: absolute;
  inset: 0;
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.02) 0%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.02) 100%
  );
  background-size: 200% 100%;
  animation: swShimmer 1.8s infinite;
}

@keyframes swShimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

/* Playing Equalizer Overlay */
.playing-pulse-badge {
  position: absolute;
  inset: 0;
  background: rgba(6, 7, 9, 0.65);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 3;
}

.mini-equalizer {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 18px;
}

.mini-equalizer span {
  width: 3px;
  background: var(--sw-accent);
  border-radius: 2px;
  animation: eqBounce 0.8s ease-in-out infinite alternate;
}

.mini-equalizer span:nth-child(1) { height: 40%; animation-delay: 0.1s; }
.mini-equalizer span:nth-child(2) { height: 95%; animation-delay: 0.3s; }
.mini-equalizer span:nth-child(3) { height: 60%; animation-delay: 0.2s; }

@keyframes eqBounce {
  0% { height: 25%; }
  100% { height: 100%; }
}

/* Tactile Vinyl Disc Animation */
.vinyl-disc {
  position: absolute;
  top: 5%;
  right: 0%;
  width: 90%;
  height: 90%;
  border-radius: 50%;
  background: radial-gradient(circle at center, #1e2029 0%, #0d0e12 60%, #060709 100%);
  border: 2px solid rgba(255, 255, 255, 0.1);
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.9);
  z-index: 1;
  transform: translateX(0);
  transition: transform 400ms var(--sw-ease-spring);
  display: flex;
  align-items: center;
  justify-content: center;
}

.sw-artwork-wrapper:hover .vinyl-disc,
.sw-artwork-wrapper.has-vinyl.is-spinning .vinyl-disc {
  transform: translateX(38%);
}

.vinyl-disc.spinning {
  animation: vinylRotate 4s linear infinite;
}

@keyframes vinylRotate {
  from { transform: translateX(38%) rotate(0deg); }
  to { transform: translateX(38%) rotate(360deg); }
}

.vinyl-groove {
  position: absolute;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.05);
}
.groove-1 { width: 75%; height: 75%; }
.groove-2 { width: 50%; height: 50%; }

.vinyl-center-label {
  width: 32%;
  height: 32%;
  border-radius: 50%;
  background: var(--sw-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 0 10px rgba(0, 0, 0, 0.5);
}

.vinyl-hole {
  width: 25%;
  height: 25%;
  border-radius: 50%;
  background: #060709;
}
</style>
