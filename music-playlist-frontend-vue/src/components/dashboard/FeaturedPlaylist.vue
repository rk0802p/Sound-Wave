<template>
  <div v-if="playlist" class="sw-featured-banner">
    <!-- Ambient dynamic backdrop glow -->
    <div
      class="featured-backdrop-glow"
      :style="{ backgroundImage: playlist.coverImage ? `url(${playlist.coverImage})` : 'none' }"
    ></div>

    <div class="featured-banner-inner">
      <div class="featured-art-container" @click="openPlaylist">
        <ArtworkCover
          :src="playlist.coverImage"
          :alt="playlist.name"
          size="xl"
          :showVinyl="true"
          :glow="true"
          :isPlaying="isCurrentlyPlaying"
          :fallbackSeed="playlist.name"
        />
      </div>

      <div class="featured-editorial-content">
        <div class="featured-badge-row">
          <span class="editorial-badge font-mono">NOW IN ORBIT</span>
          <span class="privacy-badge font-mono">{{ playlist.isPublic ? 'PUBLIC ARCHIVE' : 'PRIVATE WORKSPACE' }}</span>
        </div>

        <h2 class="featured-title font-display" @click="openPlaylist" :title="playlist.name">
          {{ playlist.name }}
        </h2>

        <p class="featured-description">
          {{ playlist.description || 'A curated sanctuary of audio frequencies, hand-assembled for uninterrupted listening and focus.' }}
        </p>

        <div class="featured-metrics-row font-mono">
          <span class="metric-item">
            <strong class="tabular-nums">{{ playlist.songs?.length || 0 }}</strong> {{ playlist.songs?.length === 1 ? 'track' : 'tracks' }}
          </span>
          <span class="metric-divider">•</span>
          <span class="metric-item tabular-nums">{{ durationFormatted }}</span>
          <span class="metric-divider">•</span>
          <span class="metric-item">Lossless Audio Ready</span>
        </div>

        <div class="featured-cta-row">
          <AppButton
            variant="primary"
            size="lg"
            :disabled="!playlist.songs?.length"
            @click="quickPlay"
          >
            <template #icon-left>
              <svg v-if="isCurrentlyPlaying" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </template>
            {{ isCurrentlyPlaying ? 'Pause Playback' : 'Stream Playlist' }}
          </AppButton>

          <AppButton
            variant="secondary"
            size="lg"
            @click="openPlaylist"
          >
            View Workstation
          </AppButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePlayerStore } from '../../stores/player';
import { formatDuration } from '../../data/demoTracks';
import ArtworkCover from '../common/ArtworkCover.vue';
import AppButton from '../common/AppButton.vue';

const props = defineProps({
  playlist: {
    type: Object,
    default: null,
  },
});

const router = useRouter();
const playerStore = usePlayerStore();

const isCurrentlyPlaying = computed(() => {
  return playerStore.isPlaying && playerStore.currentPlaylistId === props.playlist?._id;
});

const durationFormatted = computed(() => {
  const songs = props.playlist?.songs || [];
  const secs = songs.reduce((sum, s) => sum + (s.duration || 0), 0);
  return formatDuration(secs);
});

const openPlaylist = () => {
  if (props.playlist?._id) {
    router.push(`/playlists/${props.playlist._id}`);
  }
};

const quickPlay = () => {
  if (props.playlist?.songs?.length) {
    if (isCurrentlyPlaying.value) {
      playerStore.togglePlay();
    } else {
      playerStore.playTrack(props.playlist.songs[0], props.playlist.songs, 0, props.playlist._id);
    }
  }
};
</script>

<style scoped>
.sw-featured-banner {
  position: relative;
  border-radius: var(--sw-radius-xl);
  overflow: hidden;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  box-shadow: var(--sw-shadow-lg);
  padding: 32px 36px;
}

.featured-backdrop-glow {
  position: absolute;
  inset: -60px;
  background-size: cover;
  background-position: center;
  filter: blur(60px);
  opacity: 0.18;
  pointer-events: none;
  z-index: 0;
}

.featured-banner-inner {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: center;
  gap: 40px;
}

.featured-art-container {
  cursor: pointer;
  flex-shrink: 0;
  transition: transform var(--sw-transition-fast);
}

.featured-art-container:hover {
  transform: scale(1.02);
}

.featured-editorial-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  flex: 1;
}

.featured-badge-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.editorial-badge {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--sw-accent);
  background: rgba(56, 189, 248, 0.12);
  padding: 2px 10px;
  border-radius: 4px;
  letter-spacing: 0.1em;
}

.privacy-badge {
  font-size: 0.65rem;
  color: var(--sw-text-muted);
  letter-spacing: 0.08em;
}

.featured-title {
  font-size: 2.2rem;
  font-weight: 800;
  line-height: 1.15;
  color: var(--sw-text-primary);
  cursor: pointer;
  letter-spacing: -0.02em;
  transition: color var(--sw-transition-fast);
}

.featured-title:hover {
  color: var(--sw-accent);
}

.featured-description {
  font-size: 0.94rem;
  color: var(--sw-text-secondary);
  line-height: 1.5;
  max-width: 640px;
}

.featured-metrics-row {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.78rem;
  color: var(--sw-text-muted);
  padding: 8px 0;
}

.metric-divider {
  opacity: 0.5;
}

.metric-item strong {
  color: var(--sw-text-primary);
}

.featured-cta-row {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 8px;
}

@media (max-width: 900px) {
  .featured-banner-inner {
    flex-direction: column;
    align-items: flex-start;
    gap: 24px;
  }
  .sw-featured-banner {
    padding: 24px 20px;
  }
  .featured-title {
    font-size: 1.6rem;
  }
  .featured-cta-row {
    flex-wrap: wrap;
  }
}
</style>
