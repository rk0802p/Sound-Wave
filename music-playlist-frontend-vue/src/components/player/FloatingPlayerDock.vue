<template>
  <footer
    class="jb-player-bar dock font-mono"
    :class="{ show: isVisible, playing: playerStore.isPlaying }"
    id="dock"
    role="region"
    aria-label="Persistent Audio Player"
    :style="{
      '--o1': playerStore.o1 || '#7ff0e6',
      '--o2': playerStore.o2 || '#19c9bd',
      '--sh': (playerStore.o2 || '#19c9bd') + '88',
    }"
  >
    <!-- Left: Artwork, Track Metadata & Favorite Toggle -->
    <div class="now jb-pb-track">
      <div
        class="jb-pb-art vin"
        :title="playerStore.isPlaying ? 'Now Playing' : 'Playback Paused'"
        @click="handleTogglePlay($event)"
      >
        <img
          v-if="currentTrackArtwork"
          :src="currentTrackArtwork"
          :alt="currentTrackTitle"
          class="jb-pb-cover"
          loading="lazy"
        />
        <div v-else class="jb-pb-fallback font-display">
          {{ currentTrackInitial }}
        </div>
      </div>

      <div class="nm jb-pb-text">
        <b id="nT" class="jb-pb-title font-display" :title="currentTrackTitle">{{ currentTrackTitle }}</b>
        <small id="nA" class="jb-pb-artist" :title="currentTrackArtist">
          {{ currentTrackArtist }}
          <span v-if="isUnavailable" class="unavailable-tag"> • Unavailable</span>
        </small>
        <div v-if="isPreviewTrack" class="dock-preview-meta">
          <span class="dock-preview-badge font-mono">30s PREVIEW</span>
          <span class="dock-provider-pill font-mono" :class="previewProviderClass">{{ previewProviderName }}</span>
        </div>
        <div v-else-if="isJamendoTrack" class="dock-jamendo-meta">
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

      <button
        type="button"
        class="jb-pb-fav font-mono"
        id="fav"
        :class="{ active: isFavorite }"
        :aria-pressed="isFavorite ? 'true' : 'false'"
        :aria-label="isFavorite ? 'Remove from Favourites' : 'Add to Favourites'"
        title="Like track"
        @click="toggleFavorite($event)"
      >
        ♥
      </button>
    </div>

    <!-- Center: Playback Controls & Progress Bar -->
    <div class="ctr jb-pb-controls">
      <div class="btns jb-pb-buttons">
        <button
          type="button"
          class="jb-btn-icon hm"
          id="rep"
          :class="{ on: playerStore.repeat !== 'off' }"
          :aria-pressed="playerStore.repeat !== 'off' ? 'true' : 'false'"
          :aria-label="'Repeat Mode: ' + playerStore.repeat"
          :title="'Repeat: ' + playerStore.repeat"
          @click="playerStore.cycleRepeat()"
        >
          🔁
        </button>

        <button
          type="button"
          class="jb-btn-icon"
          id="prev"
          aria-label="Previous Track"
          title="Previous track"
          @click="playerStore.prevTrack()"
        >
          ⏮
        </button>

        <button
          type="button"
          class="jb-btn-play font-display"
          id="pp"
          :aria-label="playerStore.isLoading && !playerStore.isPlaying ? 'Loading audio' : (playerStore.isPlaying ? 'Pause' : 'Play')"
          title="Play / Pause"
          @click="handleTogglePlay($event)"
        >
          <span v-if="playerStore.isLoading && !playerStore.isPlaying" class="dock-spinner" aria-hidden="true"></span>
          <span v-else>{{ playerStore.isPlaying ? '❚❚' : '▶' }}</span>
        </button>

        <button
          type="button"
          class="jb-btn-icon"
          id="next"
          aria-label="Next Track"
          title="Next track"
          @click="playerStore.nextTrack()"
        >
          ⏭
        </button>

        <button
          type="button"
          class="jb-btn-icon hm"
          id="shuf"
          :class="{ on: playerStore.shuffle }"
          :aria-pressed="playerStore.shuffle ? 'true' : 'false'"
          aria-label="Toggle Shuffle"
          :title="'Shuffle: ' + (playerStore.shuffle ? 'On' : 'Off')"
          @click="playerStore.toggleShuffle()"
        >
          🔀
        </button>
      </div>

      <div class="prog jb-pb-timeline">
        <span id="tc" class="jb-pb-time">{{ formatTime(playerStore.currentTime) }}</span>
        <div class="seek-track-wrapper">
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
          <div
            v-if="playerStore.loopA !== null && playerStore.duration > 0"
            class="scrubber-marker marker-a"
            :style="{ left: ((playerStore.loopA / playerStore.duration) * 100) + '%' }"
            title="Loop Marker A"
          >A</div>
          <div
            v-if="playerStore.loopB !== null && playerStore.duration > 0"
            class="scrubber-marker marker-b"
            :style="{ left: ((playerStore.loopB / playerStore.duration) * 100) + '%' }"
            title="Loop Marker B"
          >B</div>
        </div>
        <span id="td" class="jb-pb-time">{{ formatTime(playerStore.duration) }}</span>
      </div>
    </div>

    <!-- Right: Practice, Speed, License, Visualizer, Volume & Queue Pill -->
    <div class="ex jb-pb-extras">
      <button
        type="button"
        class="jb-dock-chip practice-btn font-mono"
        id="practiceBtn"
        :class="{ 'is-looping': playerStore.isLooping, 'is-open': showPracticePopover }"
        :aria-pressed="playerStore.isLooping ? 'true' : 'false'"
        aria-label="Practice Mode: A-B Loop & Speed"
        title="Open Play-Along & Practice Panel"
        @click="showPracticePopover = !showPracticePopover"
      >
        A⇄B
      </button>

      <button
        type="button"
        class="jb-dock-chip speed-btn font-mono"
        id="speedBtn"
        aria-label="Playback Speed"
        :title="'Playback Speed: ' + playerStore.playbackSpeed + 'x (Click to cycle)'"
        @click="playerStore.cyclePlaybackSpeed()"
      >
        {{ playerStore.playbackSpeed }}x
      </button>

      <button
        type="button"
        class="jb-btn-icon hm"
        id="lyr"
        aria-label="Track Rights & License Information"
        title="View License & Attribution"
        @click="$emit('open-info', playerStore.currentTrack)"
      >
        ⓘ
      </button>

      <button
        type="button"
        class="jb-btn-icon hm"
        id="visBtn"
        :class="{ 'is-active': showVisualizer }"
        :aria-pressed="showVisualizer ? 'true' : 'false'"
        aria-label="Toggle Audio Visualizer"
        title="Toggle Real-Time Audio Visualizer"
        @click="showVisualizer = !showVisualizer"
      >
        ılı
      </button>

      <button
        type="button"
        class="jb-btn-icon"
        id="mute"
        :aria-label="isMutedOrZero ? 'Unmute' : 'Mute'"
        :title="isMutedOrZero ? 'Unmute' : 'Mute'"
        @click="toggleMute"
      >
        {{ isMutedOrZero ? '🔇' : '🔊' }}
      </button>

      <input
        type="range"
        id="vol"
        min="0"
        max="100"
        :value="volumePercentage"
        :style="{ '--p': volumePercentage + '%' }"
        class="jb-vol-slider hm"
        aria-label="Volume Slider"
        @input="handleVolumeInput"
      />

      <button
        type="button"
        class="jb-queue-pill font-mono"
        id="que"
        aria-label="Toggle Queue"
        title="View Up Next Queue"
        @click="$emit('toggle-queue')"
      >
        ≡ {{ playerStore.queue?.length || 0 }}
      </button>
    </div>

    <!-- Play-Along / Practice Mode Popover Panel -->
    <div
      v-if="showPracticePopover"
      class="practice-popover neo-box font-mono"
      id="practicePopover"
      role="dialog"
      aria-label="Practice Mode Controls"
    >
      <div class="pop-header">
        <div class="pop-title font-display">⚡ PLAY-ALONG PRACTICE</div>
        <button type="button" class="pop-close" @click="showPracticePopover = false" aria-label="Close Practice Mode">✕</button>
      </div>

      <div class="pop-section">
        <div class="pop-label">PLAYBACK SPEED</div>
        <div class="speed-btn-group">
          <button
            v-for="s in [0.5, 0.75, 1, 1.25, 1.5, 2]"
            :key="s"
            type="button"
            class="speed-chip font-mono"
            :class="{ active: playerStore.playbackSpeed === s }"
            @click="playerStore.setPlaybackSpeed(s)"
          >
            {{ s }}x
          </button>
        </div>
      </div>

      <div class="pop-section">
        <div class="pop-label-row">
          <span class="pop-label">A-B LOOP MARKERS</span>
          <span v-if="playerStore.isLooping" class="loop-active-indicator">● ACTIVE LOOP</span>
        </div>

        <div class="loop-times-display">
          <div class="marker-pill">
            <span class="marker-tag">A</span>
            <span class="marker-val">{{ playerStore.loopA !== null ? formatTime(playerStore.loopA) : '--:--' }}</span>
          </div>
          <span class="arrow-sep">➔</span>
          <div class="marker-pill">
            <span class="marker-tag">B</span>
            <span class="marker-val">{{ playerStore.loopB !== null ? formatTime(playerStore.loopB) : '--:--' }}</span>
          </div>
        </div>

        <div class="loop-actions-row">
          <button type="button" class="neo-pop-btn btn-set-a font-mono" id="btnSetA" @click="playerStore.setLoopA()">
            SET A ({{ formatTime(playerStore.currentTime) }})
          </button>
          <button type="button" class="neo-pop-btn btn-set-b font-mono" id="btnSetB" @click="playerStore.setLoopB()">
            SET B ({{ formatTime(playerStore.currentTime) }})
          </button>
          <button
            type="button"
            class="neo-pop-btn btn-toggle-loop font-mono"
            id="btnToggleLoop"
            :class="{ 'is-active': playerStore.isLooping }"
            :disabled="playerStore.loopA === null || playerStore.loopB === null || playerStore.loopB <= playerStore.loopA"
            @click="playerStore.toggleLoop()"
          >
            {{ playerStore.isLooping ? 'LOOP: ON' : 'LOOP: OFF' }}
          </button>
          <button type="button" class="neo-pop-btn btn-clear-loop font-mono" id="btnClearLoop" @click="playerStore.clearLoop()">
            CLEAR
          </button>
        </div>
      </div>
    </div>

    <!-- Real-Time Audio Visualizer Component -->
    <AudioVisualizer
      :is-open="showVisualizer"
      @close="showVisualizer = false"
    />
  </footer>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { usePlayerStore } from '../../stores/player';
import { useUiStore } from '../../stores/ui';
import { useToastStore } from '../../stores/toast';
import { resolvePlayableAudioUrl } from '../../services/providers/detector';
import AudioVisualizer from './AudioVisualizer.vue';

const emit = defineEmits(['open-info', 'toggle-queue', 'bubble-pop']);
const playerStore = usePlayerStore();
const uiStore = useUiStore();
const toastStore = useToastStore();

const isVisible = ref(true);
const showVisualizer = ref(false);
const showPracticePopover = ref(false);

onMounted(() => {
  if (typeof window !== 'undefined') {
    window._soundwavePlayerStore = playerStore;
  }
  uiStore.loadFavorites();
});

const isPreviewTrack = computed(() => {
  const t = playerStore.currentTrack;
  if (!t) return false;
  const p = (t.provider || t.source?.provider || '').toLowerCase();
  return p === 'deezer' || p === 'itunes' || p === 'apple' || t.isPreview === true;
});

const previewProviderName = computed(() => {
  const t = playerStore.currentTrack;
  if (!t) return '';
  const p = (t.provider || t.source?.provider || '').toLowerCase();
  if (p === 'deezer') return 'DEEZER';
  if (p === 'itunes' || p === 'apple') return 'ITUNES';
  return p ? p.toUpperCase() : 'PREVIEW';
});

const previewProviderClass = computed(() => {
  const p = (playerStore.currentTrack?.provider || playerStore.currentTrack?.source?.provider || '').toLowerCase();
  return p === 'deezer' ? 'pill-deezer' : 'pill-itunes';
});

const isFavorite = computed(() => uiStore.isFavoriteTrack(playerStore.currentTrack));

const toggleFavorite = (event) => {
  const track = playerStore.currentTrack;
  if (!track) return;
  const added = uiStore.toggleFavorite(track);
  if (added && event) {
    emit('bubble-pop', { target: event.currentTarget, count: 12 });
  }
  toastStore.show(added ? 'Added to Liked Tracks' : 'Removed from Liked Tracks', added ? 'success' : 'info');
};

const currentTrackTitle = computed(() => {
  return playerStore.currentTrack?.title || playerStore.currentTrack?.[0] || 'No Track Loaded';
});

const currentTrackArtist = computed(() => {
  return playerStore.currentTrack?.artist || playerStore.currentTrack?.[1] || 'Soundwave Jamendo Stream';
});

const currentTrackArtwork = computed(() => {
  const t = playerStore.currentTrack;
  return t?.coverImage || t?.artwork || t?.albumArt || null;
});

const currentTrackInitial = computed(() => {
  return currentTrackTitle.value.substring(0, 2).toUpperCase();
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
  if (!t) return null;
  const prov = t.provider || t.source?.provider;
  const extId = t.providerTrackId || t.source?.externalId;
  if (prov === 'jamendo' && extId) {
    return `https://www.jamendo.com/track/${extId}`;
  }
  if (t.providerTrackUrl) return t.providerTrackUrl;
  if (t.source?.url && t.source.url.includes('jamendo.com/track/')) return t.source.url;
  if (t.source?.trackUrl) return t.source.trackUrl;
  if (t.source?.url && !t.source.url.includes('storage.jamendo.com')) return t.source.url;
  return null;
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
  if (t.isUnavailable || playerStore.playbackState === 'unavailable') return true;
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
  if (!playerStore.isPlaying && !playerStore.isLoading && t && t.needsResolution && !resolvePlayableAudioUrl(t) && t.providerTrackId) {
    playerStore.playTrack(t);
    return;
  }
  playerStore.togglePlay();
  if (playerStore.isPlaying && event) {
    emit('bubble-pop', { target: event.currentTarget, count: 20 });
  }
};

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
};
</script>

<style scoped>
/* Neo-Brutalist Persistent Bottom Player Bar (matches Home "before" screenshot) */
.jb-player-bar {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  min-height: 88px;
  background: var(--surface, #FFFDF8);
  border-top: var(--bw, 2px) solid var(--border, #111111);
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.45rem 1.5rem calc(0.45rem + env(safe-area-inset-bottom, 0px));
  z-index: 1000;
  box-sizing: border-box;
  color: var(--ink, #111111);
}

.jb-pb-track {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 290px;
  min-width: 0;
}

.jb-pb-art {
  width: 50px;
  height: 50px;
  flex-shrink: 0;
  cursor: pointer;
}

.jb-pb-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: 1.5px solid var(--border, #111111);
  border-radius: 6px;
}

.jb-pb-fallback {
  width: 100%;
  height: 100%;
  background: var(--c-sun, #FFD84A);
  border: 1.5px solid var(--border, #111111);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.15rem;
  font-weight: 900;
}

.jb-pb-text {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.jb-pb-title {
  display: block;
  font-size: 0.92rem;
  font-weight: 900;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--ink, #111111);
}

.jb-pb-artist {
  display: block;
  font-size: 0.74rem;
  color: var(--ink-muted, #4A4740);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.unavailable-tag {
  color: #ff4f9a;
  font-weight: 800;
  font-size: 0.68rem;
  text-transform: uppercase;
}

.dock-jamendo-meta,
.dock-preview-meta {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.15rem;
  font-size: 0.64rem;
  font-weight: 700;
  line-height: 1;
}

.dock-jamendo-link {
  color: #ff3366;
  text-decoration: none;
  font-size: 0.62rem;
  background: rgba(255, 51, 102, 0.1);
  padding: 0.1rem 0.3rem;
  border-radius: 4px;
}

.dock-jamendo-license {
  color: var(--ink-muted, #4A4740);
  background: rgba(0, 0, 0, 0.05);
  padding: 0.1rem 0.25rem;
  border-radius: 4px;
  font-size: 0.6rem;
  max-width: 100px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dock-preview-badge {
  background: #ffcc00;
  color: #000;
  border: 1.5px solid #000;
  font-size: 0.6rem;
  font-weight: 900;
  padding: 0.08rem 0.3rem;
  border-radius: 4px;
  box-shadow: 1.5px 1.5px 0px #000;
  text-transform: uppercase;
}

.dock-provider-pill {
  font-size: 0.6rem;
  font-weight: 900;
  padding: 0.08rem 0.3rem;
  border-radius: 4px;
  border: 1.5px solid #000;
}

.pill-deezer { background: #ff007f; color: #fff; }
.pill-itunes { background: #fa233b; color: #fff; }

.jb-pb-fav {
  background: none;
  border: 1.5px solid var(--border, #111111);
  width: 28px;
  height: 28px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  flex-shrink: 0;
}

.jb-pb-fav.active {
  background: var(--c-hotpink, #FF4F9A);
  color: #fff;
}

.jb-pb-controls {
  flex: 1;
  max-width: 580px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.35rem;
  min-width: 0;
}

.jb-pb-buttons {
  display: flex;
  align-items: center;
  gap: 0.85rem;
}

.jb-btn-icon {
  background: none;
  border: none;
  font-size: 1rem;
  cursor: pointer;
  padding: 0.15rem;
  color: var(--ink, #111111);
}

.jb-btn-icon.on,
.jb-btn-icon.is-active {
  color: var(--c-blue, #4D6BFF);
}

.jb-btn-play {
  width: 44px;
  height: 44px;
  border-radius: var(--r-sm, 8px);
  background: var(--yellow, #FFD84A);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: 2px 2px 0 var(--border, #111111);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
  font-weight: 900;
  cursor: pointer;
  transition: transform 0.08s ease;
}

.jb-btn-play:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.dock-spinner {
  display: inline-block;
  width: 18px;
  height: 18px;
  border: 2px solid rgba(17, 17, 17, 0.25);
  border-top-color: #111111;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.jb-pb-timeline {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 0.65rem;
}

.jb-pb-time {
  font-size: 0.72rem;
  color: var(--ink-muted, #4A4740);
  width: 40px;
  text-align: center;
  flex-shrink: 0;
}

.seek-track-wrapper {
  position: relative;
  flex: 1;
  display: flex;
  align-items: center;
}

#seek {
  -webkit-appearance: none;
  appearance: none;
  width: 100%;
  height: 10px;
  background: linear-gradient(90deg, var(--c-blue, #4D6BFF) var(--p, 0%), #EFEAE1 var(--p, 0%));
  border: 1.5px solid var(--border, #111111);
  border-radius: 999px;
  cursor: pointer;
  margin: 0;
}

#seek::-webkit-slider-thumb {
  -webkit-appearance: none;
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--yellow, #FFD84A);
  border: 1.5px solid #111111;
  cursor: pointer;
}

#seek::-moz-range-thumb {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: var(--yellow, #FFD84A);
  border: 1.5px solid #111111;
  cursor: pointer;
}

.scrubber-marker {
  position: absolute;
  top: -16px;
  transform: translateX(-50%);
  font-size: 0.6rem;
  font-weight: 900;
  width: 15px;
  height: 15px;
  border-radius: 3px;
  display: grid;
  place-items: center;
  border: 1px solid #000;
  pointer-events: none;
  z-index: 2;
}

.marker-a { background: #00e5ff; color: #000; }
.marker-b { background: #ff007f; color: #fff; }

.jb-pb-extras {
  display: flex;
  align-items: center;
  gap: 0.55rem;
  justify-content: flex-end;
  flex-shrink: 0;
}

.jb-dock-chip {
  font-size: 0.72rem;
  font-weight: 900;
  background: var(--surface-2, #FFFFFF);
  border: 1.5px solid var(--border, #111111);
  border-radius: 6px;
  padding: 0 0.45rem;
  height: 28px;
  cursor: pointer;
}

.jb-dock-chip.is-looping {
  background: #00ff88;
  color: #000;
  box-shadow: 2px 2px 0 #111111;
}

.jb-vol-slider {
  width: 76px;
  accent-color: var(--ink, #111111);
}

.jb-queue-pill {
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  padding: 0.35rem 0.75rem;
  border-radius: var(--r-pill, 999px);
  font-weight: 800;
  font-size: 0.75rem;
  cursor: pointer;
}

/* Practice Popover */
.practice-popover.neo-box {
  position: absolute;
  bottom: calc(100% + 14px);
  right: 2rem;
  width: 340px;
  max-width: calc(100vw - 2rem);
  background: #ffffff;
  border: 3px solid #000000;
  box-shadow: 6px 6px 0px #000000;
  border-radius: 12px;
  padding: 1rem;
  z-index: 1200;
  color: #000;
}

.pop-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: 2px solid #000;
  padding-bottom: 0.4rem;
  margin-bottom: 0.8rem;
}

.pop-title {
  font-weight: 900;
  font-size: 0.92rem;
}

.pop-close {
  background: #ff4d4d;
  color: #fff;
  border: 1.5px solid #000;
  font-weight: 900;
  font-size: 0.8rem;
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  display: grid;
  place-items: center;
}

.pop-section { margin-bottom: 0.8rem; }
.pop-label { font-size: 0.72rem; font-weight: 800; color: #555; margin-bottom: 0.35rem; }
.pop-label-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.35rem; }
.loop-active-indicator {
  font-size: 0.68rem;
  font-weight: 900;
  color: #00aa55;
  background: #e6ffed;
  border: 1px solid #00aa55;
  padding: 0.1rem 0.35rem;
  border-radius: 4px;
}

.speed-btn-group { display: flex; gap: 0.3rem; flex-wrap: wrap; }
.speed-chip {
  background: #f0f0f0;
  border: 1.5px solid #000;
  border-radius: 6px;
  padding: 0.25rem 0.5rem;
  font-size: 0.75rem;
  font-weight: 800;
  cursor: pointer;
}

.speed-chip.active {
  background: #ffeb3b;
  color: #000;
  box-shadow: 2px 2px 0px #000;
}

.loop-times-display {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  margin-bottom: 0.6rem;
  background: #f8f8f8;
  border: 2px solid #000;
  border-radius: 8px;
  padding: 0.4rem 0.6rem;
}

.marker-pill { display: flex; align-items: center; gap: 0.3rem; font-size: 0.8rem; font-weight: 800; }
.marker-tag {
  background: #000;
  color: #fff;
  width: 18px;
  height: 18px;
  border-radius: 3px;
  display: grid;
  place-items: center;
  font-size: 0.65rem;
}

.loop-actions-row { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; }
.neo-pop-btn {
  background: #fff;
  border: 2px solid #000;
  border-radius: 6px;
  padding: 0.4rem 0.3rem;
  font-size: 0.72rem;
  font-weight: 900;
  cursor: pointer;
  box-shadow: 2px 2px 0px #000;
}

.neo-pop-btn:disabled { opacity: 0.4; cursor: not-allowed; box-shadow: none; }
.btn-set-a { background: #e0f7fa; }
.btn-set-b { background: #fce4ec; }
.btn-toggle-loop.is-active { background: #00ff88; color: #000; }
.btn-clear-loop { background: #ffebee; color: #c62828; }

@media (max-width: 960px) {
  .jb-pb-track {
    width: 200px;
  }
  .jb-vol-slider {
    display: none;
  }
}

@media (max-width: 768px) {
  .jb-player-bar {
    display: grid;
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
    gap: 0.35rem 0.5rem;
    padding: 0.45rem 0.75rem calc(0.45rem + env(safe-area-inset-bottom, 0px));
    min-height: 92px;
  }

  .jb-pb-track {
    width: auto;
    grid-column: 1;
    grid-row: 1;
  }

  .jb-pb-art {
    width: 40px;
    height: 40px;
  }

  .jb-pb-controls {
    display: contents;
  }

  .jb-pb-buttons {
    grid-column: 2;
    grid-row: 1;
    gap: 0.35rem;
  }

  .jb-pb-timeline {
    grid-column: 1 / -1;
    grid-row: 2;
  }

  .jb-pb-extras,
  .hm {
    display: none;
  }

  .jb-btn-play {
    width: 38px;
    height: 38px;
  }
}
</style>
