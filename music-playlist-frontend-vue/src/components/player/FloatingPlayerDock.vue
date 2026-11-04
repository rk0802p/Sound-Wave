<template>
  <div
    class="dock glass"
    :class="{ show: isVisible, playing: playerStore.isPlaying }"
    id="dock"
    role="region"
    aria-label="Player"
    :style="{
      '--o1': playerStore.o1 || '#7ff0e6',
      '--o2': playerStore.o2 || '#19c9bd',
      '--sh': (playerStore.o2 || '#19c9bd') + '88',
    }"
  >
    <!-- Left: Now Playing Vinyl & Metadata -->
    <div class="now">
      <div
        class="vin"
        :title="playerStore.isPlaying ? 'Now Playing' : 'Playback Paused'"
        @click="handleTogglePlay($event)"
      >
        <img
          v-if="currentTrackArtwork"
          :src="currentTrackArtwork"
          :alt="currentTrackTitle"
          class="vin-img"
          loading="lazy"
        />
        <i v-else id="vE">{{ currentTrackEmoji }}</i>
      </div>
      <div class="nm">
        <b id="nT" :title="currentTrackTitle">{{ currentTrackTitle }}</b>
        <small id="nA" :title="currentTrackArtist">
          {{ currentTrackArtist }}
          <span v-if="isUnavailable" class="unavailable-tag"> • Unavailable</span>
        </small>
        <div v-if="isJamendoTrack" class="dock-jamendo-meta">
          <a
            v-if="jamendoTrackUrl"
            :href="jamendoTrackUrl"
            target="_blank"
            rel="noopener noreferrer"
            class="dock-jamendo-link"
            title="Open track on Jamendo"
            @click.stop
          >
            ↗ JAMENDO
          </a>
          <span v-else class="dock-jamendo-link">JAMENDO</span>
          <span class="dock-jamendo-license" :title="jamendoAttribution">
            {{ jamendoLicenseText }}
          </span>
        </div>
      </div>
    </div>

    <!-- Center: Playback Controls & Progress -->
    <div class="ctr">
      <div class="btns">
        <!-- Favourite Button -->
        <button
          class="cb fav"
          id="fav"
          :aria-pressed="isFavorite ? 'true' : 'false'"
          :aria-label="isFavorite ? 'Remove from Favourites' : 'Add to Favourites'"
          @click="toggleFavorite($event)"
        >
          <svg viewBox="0 0 24 24"><path :d="ICONS.heart" /></svg>
        </button>

        <!-- Repeat Button (Hidden on small mobile) -->
        <button
          class="cb hm"
          id="rep"
          :aria-pressed="playerStore.repeat !== 'off' ? 'true' : 'false'"
          :aria-label="'Repeat Mode: ' + playerStore.repeat"
          @click="playerStore.cycleRepeat()"
        >
          <svg viewBox="0 0 24 24"><path :d="ICONS.rep" /></svg>
        </button>

        <!-- Previous Button -->
        <button
          class="cb"
          id="prev"
          aria-label="Previous Track"
          @click="playerStore.prevTrack()"
        >
          <svg viewBox="0 0 24 24"><path :d="ICONS.prev" /></svg>
        </button>

        <!-- Big Play/Pause Bubble Button -->
        <button
          class="cb big orb"
          id="pp"
          :aria-label="playerStore.isPlaying ? 'Pause' : 'Play'"
          @click="handleTogglePlay($event)"
        >
          <svg v-if="playerStore.isPlaying" viewBox="0 0 24 24"><path :d="ICONS.pause" /></svg>
          <svg v-else viewBox="0 0 24 24"><path :d="ICONS.play" /></svg>
        </button>

        <!-- Next Button -->
        <button
          class="cb"
          id="next"
          aria-label="Next Track"
          @click="playerStore.nextTrack()"
        >
          <svg viewBox="0 0 24 24"><path :d="ICONS.next" /></svg>
        </button>

        <!-- Shuffle Button (Hidden on small mobile) -->
        <button
          class="cb hm"
          id="shuf"
          :aria-pressed="playerStore.shuffle ? 'true' : 'false'"
          aria-label="Toggle Shuffle"
          @click="playerStore.toggleShuffle()"
        >
          <svg viewBox="0 0 24 24"><path :d="ICONS.shuf" /></svg>
        </button>
      </div>

      <!-- Real Scrubbable Progress Bar -->
      <div class="prog">
        <span id="tc">{{ formatTime(playerStore.currentTime) }}</span>
        <input
          type="range"
          id="seek"
          min="0"
          max="1000"
          :value="seekProgressValue"
          :style="{ '--p': seekPercentage + '%' }"
          aria-label="Seek audio position"
          @input="handleSeekInput"
        />
        <span id="td">{{ formatTime(playerStore.duration) }}</span>
      </div>
    </div>

    <!-- Right: Secondary Controls (Info, Queue, Volume) -->
    <div class="ex">
      <!-- License / Attribution Info -->
      <button
        class="cb"
        id="lyr"
        aria-label="Track Rights & License Information"
        title="View License & Attribution"
        @click="$emit('open-info', playerStore.currentTrack)"
      >
        <svg viewBox="0 0 24 24"><path :d="ICONS.mic" /></svg>
      </button>

      <!-- Queue Toggle -->
      <button
        class="cb"
        id="que"
        aria-label="Toggle Queue"
        title="View Up Next Queue"
        @click="$emit('toggle-queue')"
      >
        <svg viewBox="0 0 24 24"><path :d="ICONS.que" /></svg>
      </button>

      <!-- Volume Mute Toggle -->
      <button
        class="cb"
        id="mute"
        :aria-label="isMutedOrZero ? 'Unmute' : 'Mute'"
        :title="isMutedOrZero ? 'Unmute' : 'Mute'"
        @click="toggleMute"
      >
        <svg v-if="isMutedOrZero" viewBox="0 0 24 24"><path :d="ICONS.mute" /></svg>
        <svg v-else viewBox="0 0 24 24"><path :d="ICONS.vol" /></svg>
      </button>

      <!-- Volume Range Slider -->
      <input
        type="range"
        id="vol"
        min="0"
        max="100"
        :value="volumePercentage"
        :style="{ '--p': volumePercentage + '%' }"
        aria-label="Volume Slider"
        @input="handleVolumeInput"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { usePlayerStore } from '../../stores/player';
import { resolvePlayableAudioUrl } from '../../services/providers/detector';

const emit = defineEmits(['open-info', 'toggle-queue', 'bubble-pop']);
const playerStore = usePlayerStore();
const isVisible = ref(true);

// Persistent favorites in localStorage
const favoritesSet = ref(new Set());

onMounted(() => {
  if (typeof window !== 'undefined') {
    window._soundwavePlayerStore = playerStore;
  }
  try {
    const saved = localStorage.getItem('soundwave_favorites');
    if (saved) {
      favoritesSet.value = new Set(JSON.parse(saved));
    }
  } catch (e) {}
});

const isFavorite = computed(() => {
  const id = playerStore.currentTrack?._id || playerStore.currentTrack?.id;
  return id ? favoritesSet.value.has(id) : false;
});

const toggleFavorite = (event) => {
  const id = playerStore.currentTrack?._id || playerStore.currentTrack?.id;
  if (!id) return;
  if (favoritesSet.value.has(id)) {
    favoritesSet.value.delete(id);
  } else {
    favoritesSet.value.add(id);
    if (event) {
      emit('bubble-pop', { target: event.currentTarget, count: 12 });
    }
  }
  try {
    localStorage.setItem('soundwave_favorites', JSON.stringify([...favoritesSet.value]));
  } catch (e) {}
};

// Track metadata
const currentTrackTitle = computed(() => {
  return playerStore.currentTrack?.title || playerStore.currentTrack?.[0] || 'Select a Song';
});

const currentTrackArtist = computed(() => {
  return playerStore.currentTrack?.artist || playerStore.currentTrack?.[1] || 'Soundwave Audio Workstation';
});

const currentTrackArtwork = computed(() => {
  return playerStore.currentTrack?.coverImage || playerStore.currentTrack?.artwork || null;
});

const currentTrackEmoji = computed(() => {
  return playerStore.currentTrack?.emoji || playerStore.currentTrack?.e || '🎵';
});

const isJamendoTrack = computed(() => {
  const t = playerStore.currentTrack;
  if (!t) return false;
  return (
    t.provider === 'jamendo' ||
    t.source?.provider === 'jamendo' ||
    Boolean(t.providerTrackUrl && t.providerTrackUrl.includes('jamendo.com'))
  );
});

const jamendoTrackUrl = computed(() => {
  const t = playerStore.currentTrack;
  return t?.providerTrackUrl || t?.source?.trackUrl || null;
});

const jamendoLicenseText = computed(() => {
  const t = playerStore.currentTrack;
  if (!t) return 'Unknown License';
  if (typeof t.license === 'string') return t.license;
  if (t.license?.badge) return t.license.badge;
  if (t.licenseMeta?.shortName) return t.licenseMeta.shortName;
  if (t.source?.license) return t.source.license;
  return 'CC (Jamendo)';
});

const jamendoAttribution = computed(() => {
  const t = playerStore.currentTrack;
  if (!t) return '';
  return t.attribution || (t.artist ? `Music by ${t.artist} via Jamendo (Creative Commons)` : 'Jamendo Creative Commons');
});

// Real progress calculation
const seekProgressValue = computed(() => {
  if (!playerStore.duration || playerStore.duration <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, playerStore.currentTime / playerStore.duration));
  return Math.round(ratio * 1000);
});

const seekPercentage = computed(() => {
  if (!playerStore.duration || playerStore.duration <= 0) return 0;
  return Math.max(0, Math.min(100, (playerStore.currentTime / playerStore.duration) * 100));
});

const handleSeekInput = (event) => {
  if (!playerStore.duration || playerStore.duration <= 0) return;
  const val = parseFloat(event.target.value);
  const targetTime = (val / 1000) * playerStore.duration;
  playerStore.seek(targetTime);
};

// Volume calculation
const isMutedOrZero = computed(() => {
  return playerStore.muted || playerStore.volume <= 0.01;
});

const volumePercentage = computed(() => {
  if (playerStore.muted) return 0;
  return Math.round(playerStore.volume * 100);
});

const handleVolumeInput = (event) => {
  const val = parseFloat(event.target.value) / 100;
  playerStore.setVolume(val);
  if (playerStore.muted && val > 0) {
    playerStore.setMuted(false);
  }
};

const toggleMute = () => {
  playerStore.setMuted(!playerStore.muted);
};

const isUnavailable = computed(() => {
  const t = playerStore.currentTrack;
  if (!t) return false;
  if (t.isUnavailable) return true;
  const audioUrl = resolvePlayableAudioUrl(t);
  const canResolve = Boolean(t.needsResolution && t.providerTrackId && t.provider && t.provider !== 'spotify');
  return !audioUrl && !canResolve;
});

const handleTogglePlay = (event) => {
  if (isUnavailable.value) {
    if (event) emit('bubble-pop', { target: event.currentTarget, count: 10 });
    return;
  }
  const t = playerStore.currentTrack;
  if (!playerStore.isPlaying && t && t.needsResolution && !resolvePlayableAudioUrl(t) && t.providerTrackId) {
    playerStore.playTrack(t);
    return;
  }
  playerStore.togglePlay();
  if (playerStore.isPlaying && event) {
    emit('bubble-pop', { target: event.currentTarget, count: 20 });
  }
};

// Time formatting helper
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};

// High-fidelity SVG Icon paths from reference
const ICONS = {
  play: 'M7 4v16l13-8z',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
  prev: 'M6 5h2v14H6zM20 5v14L9 12z',
  next: 'M16 5h2v14h-2zM4 5v14l11-7z',
  rep: 'M7 7h10v3l4-4-4-4v3H5v6h2zM17 17H7v-3l-4 4 4 4v-3h12v-6h-2z',
  shuf: 'M10.590 9.170L5.410 4 4 5.410l5.170 5.170 1.420-1.410zM14.500 4l2.040 2.040L4 18.590 5.410 20 17.960 7.460 20 9.500V4h-5.500zm.33 9.410l-1.410 1.410 3.130 3.130L14.500 20H20v-5.500l-2.040 2.040-3.130-3.130z',
  heart: 'M12 21s-8-5.200-8-11a4.600 4.600 0 0 1 8-3 4.600 4.600 0 0 1 8 3c0 5.800-8 11-8 11z',
  mic: 'M12 14a3 3 0 0 0 3-3V5a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.900V21h2v-3.100A7 7 0 0 0 19 11z',
  que: 'M4 6h12v2H4zM4 10h12v2H4zM4 14h8v2H4zM18 12h2v3h3v2h-3v3h-2v-3h-3v-2h3z',
  vol: 'M3 9v6h4l5 4V5L7 9zm13.500 3a4.500 4.500 0 0 0-2.500-4v8a4.500 4.500 0 0 0 2.500-4z',
  mute: 'M3 9v6h4l5 4V5L7 9zm11 1.400L15.400 9 17 10.600 18.600 9 20 10.400 18.400 12 20 13.600 18.600 15 17 13.400 15.400 15 14 13.600 15.600 12z',
};
</script>

<style scoped>
/* Floating Glass Dock */
.dock {
  position: fixed;
  z-index: 50;
  left: 50%;
  transform: translate(-50%, 0);
  bottom: calc(0.8rem + env(safe-area-inset-bottom, 0px));
  width: min(1240px, calc(100% - 1.5rem));
  max-width: calc(100vw - 1rem);
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 1fr minmax(0, 1.5fr) 1fr;
  align-items: center;
  gap: 1rem;
  padding: 0.7rem 1.2rem 0.7rem 0.8rem;
  border-radius: 40px;
  box-shadow: 0 16px 40px rgba(120, 80, 200, 0.18), 0 0 0 1px rgba(255, 255, 255, 0.9);
  transition: transform 0.6s cubic-bezier(0.2, 1.4, 0.3, 1), background-color 0.4s;
}

/* Left: Vinyl & Metadata */
.now {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  min-width: 0;
}

.vin {
  width: 62px;
  height: 62px;
  flex: none;
  border-radius: 50%;
  background: repeating-radial-gradient(circle, #2b1d5a 0 2px, #4a2f86 2px 4px);
  display: grid;
  place-items: center;
  animation: spin 4s linear infinite;
  animation-play-state: paused;
  box-shadow: 0 10px 20px var(--sh);
  position: relative;
  cursor: pointer;
  overflow: hidden;
  transition: transform 0.3s;
}

.vin:hover {
  transform: scale(1.05);
}

.vin::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: conic-gradient(
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent 25%,
    transparent 50%,
    rgba(255, 255, 255, 0.3),
    transparent 75%
  );
}

.vin i {
  position: relative;
  width: 48%;
  height: 48%;
  border-radius: 50%;
  font-style: normal;
  display: grid;
  place-items: center;
  font-size: 0.95rem;
  background: linear-gradient(135deg, var(--o1), var(--o2));
  color: #fff;
  z-index: 2;
  box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.5);
}

.vin-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 50%;
  z-index: 1;
}

.dock.playing .vin {
  animation-play-state: running;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.nm {
  min-width: 0;
}

.nm b,
.nm small {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.nm b {
  font: 800 1.1rem "Bricolage Grotesque", sans-serif;
  color: var(--ink);
  line-height: 1.1;
}

.nm small {
  color: var(--muted);
  font-weight: 600;
  font-size: 0.9rem;
}

.unavailable-tag {
  color: #ff4f9a;
  font-weight: 800;
  font-size: 0.72rem;
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.dock-jamendo-meta {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  margin-top: 0.15rem;
  font-size: 0.68rem;
  font-weight: 700;
  line-height: 1;
}

.dock-jamendo-link {
  color: #ff3366;
  text-decoration: none;
  font-size: 0.65rem;
  letter-spacing: 0.04em;
  background: rgba(255, 51, 102, 0.1);
  padding: 0.12rem 0.35rem;
  border-radius: 4px;
  transition: background 0.2s, color 0.2s;
  display: inline-flex;
  align-items: center;
}

.dock-jamendo-link:hover {
  background: rgba(255, 51, 102, 0.22);
  color: #ff1050;
  text-decoration: underline;
}

.dock-jamendo-license {
  color: var(--muted, #8b7bb0);
  background: rgba(0, 0, 0, 0.05);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
  font-size: 0.62rem;
  max-width: 120px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Center: Controls & Slider */
.ctr {
  display: grid;
  gap: 0.35rem;
  justify-items: center;
  min-width: 0;
}

.btns {
  display: flex;
  align-items: center;
  gap: 0.3rem;
}

.cb {
  width: 42px;
  height: 42px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  color: var(--ink);
  background: none;
  border: 0;
  cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.2, 2.4, 0.4, 1), color 0.2s;
}

.cb:hover {
  transform: scale(1.25);
  color: var(--o2);
}

.cb:active {
  transform: scale(0.85);
}

.cb[aria-pressed="true"] {
  color: var(--o2);
  filter: brightness(0.85);
}

.cb.fav[aria-pressed="true"] {
  color: #ff4f9a;
  animation: beat 0.5s cubic-bezier(0.2, 2, 0.4, 1);
}

@keyframes beat {
  40% {
    transform: scale(1.5);
  }
}

.cb.big {
  width: 58px;
  height: 58px;
  color: #fff;
  margin: 0 0.35rem;
}

.cb.big svg {
  width: 26px;
  height: 26px;
}

/* Progress bar */
.prog {
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.7rem;
  width: 100%;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--muted);
}

input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  height: 8px;
  border-radius: 9px;
  margin: 0;
  width: 100%;
  background: linear-gradient(90deg, var(--o2) var(--p, 0%), rgba(43, 29, 90, 0.12) var(--p, 0%));
  cursor: pointer;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 25%, #fff, var(--o1) 40%, var(--o2));
  box-shadow: 0 3px 8px var(--sh);
  cursor: pointer;
  border: 0;
  transition: transform 0.15s ease;
}

input[type="range"]::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

input[type="range"]::-moz-range-thumb {
  width: 20px;
  height: 20px;
  border: 0;
  border-radius: 50%;
  background: radial-gradient(circle at 30% 25%, #fff, var(--o1) 40%, var(--o2));
  box-shadow: 0 3px 8px var(--sh);
  cursor: pointer;
}

/* Right: Secondary Controls */
.ex {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.4rem;
}

.ex input[type="range"] {
  width: 96px;
}

svg {
  width: 22px;
  height: 22px;
  fill: currentColor;
  flex: none;
}

/* Responsive Dock */
@media (max-width: 860px) {
  .dock {
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    row-gap: 0.3rem;
    column-gap: 0.5rem;
    align-items: center;
    border-radius: 30px;
    padding: 0.45rem 0.85rem 0.5rem 0.75rem;
    width: min(720px, calc(100% - 1.2rem));
    bottom: calc(0.5rem + env(safe-area-inset-bottom, 0px));
  }
  .ex {
    display: none;
  }
  .now {
    grid-column: 1;
    grid-row: 1;
    min-width: 0;
  }
  .ctr {
    display: contents;
  }
  .btns {
    grid-column: 2;
    grid-row: 1;
    justify-self: end;
    gap: 0.2rem;
  }
  .cb.hm {
    display: none;
  }
  .cb {
    width: 36px;
    height: 36px;
  }
  .cb svg {
    width: 18px;
    height: 18px;
  }
  .cb.big {
    width: 44px;
    height: 44px;
    margin: 0 0.15rem;
  }
  .cb.big svg {
    width: 20px;
    height: 20px;
  }
  .prog {
    grid-column: 1 / -1;
    grid-row: 2;
    gap: 0.45rem;
    font-size: 0.75rem;
    padding: 0 0.2rem;
  }
  .vin {
    width: 44px;
    height: 44px;
  }
  .nm b {
    font-size: 0.96rem;
  }
  .nm small {
    font-size: 0.78rem;
  }
}

@media (max-width: 480px) {
  .dock {
    width: calc(100% - 0.9rem);
    padding: 0.4rem 0.65rem 0.45rem 0.6rem;
    border-radius: 24px;
    row-gap: 0.2rem;
    column-gap: 0.35rem;
    bottom: calc(0.35rem + env(safe-area-inset-bottom, 0px));
  }
  .vin {
    width: 38px;
    height: 38px;
  }
  .vin i {
    font-size: 0.82rem;
  }
  .nm b {
    font-size: 0.86rem;
  }
  .nm small {
    font-size: 0.72rem;
  }
  .dock-jamendo-meta {
    font-size: 0.6rem;
    gap: 0.25rem;
    margin-top: 0.1rem;
  }
  .dock-jamendo-link {
    font-size: 0.58rem;
    padding: 0.1rem 0.25rem;
  }
  .dock-jamendo-license {
    font-size: 0.55rem;
    max-width: 80px;
  }
  .btns {
    gap: 0.1rem;
  }
  .cb {
    width: 30px;
    height: 30px;
  }
  .cb svg {
    width: 15px;
    height: 15px;
  }
  .cb.big {
    width: 36px;
    height: 36px;
    margin: 0 0.05rem;
  }
  .cb.big svg {
    width: 17px;
    height: 17px;
  }
  .prog {
    font-size: 0.7rem;
    gap: 0.3rem;
  }
  input[type="range"] {
    height: 6px;
  }
  input[type="range"]::-webkit-slider-thumb {
    width: 14px;
    height: 14px;
  }
  input[type="range"]::-moz-range-thumb {
    width: 14px;
    height: 14px;
  }
}

@media (max-width: 340px) {
  .dock {
    width: calc(100% - 0.5rem);
    padding: 0.35rem 0.45rem 0.4rem;
  }
  .nm b {
    max-width: 80px;
  }
  .nm small {
    max-width: 80px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .vin,
  .dock,
  .cb {
    animation: none !important;
    transition: none !important;
  }
}
</style>
