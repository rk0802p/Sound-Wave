<template>
  <div v-if="playlist" class="sw-featured-card">
    <div class="featured-art-wrapper" @click="openPlaylist">
      <img :src="artwork" :alt="playlist.name" class="featured-art" @error="onImgError" />
      <button class="featured-hover-play" @click.stop="quickPlay" title="Play Now">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </button>
    </div>

    <div class="featured-content">
      <div class="featured-tag">FEATURED SELECTION</div>
      <h2 class="featured-title" @click="openPlaylist">{{ playlist.name }}</h2>
      <p class="featured-desc">{{ playlist.description || 'Curated soundscape for focus, atmosphere, and flow.' }}</p>

      <div class="featured-meta-row">
        <span>{{ playlist.songs?.length || 0 }} tracks</span>
        <span class="meta-dot">•</span>
        <span class="tabular-nums">{{ durationFormatted }}</span>
      </div>

      <div class="featured-actions-row">
        <AppButton
          variant="primary"
          size="md"
          :disabled="!playlist.songs?.length"
          @click="quickPlay"
        >
          <template #icon-left>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </template>
          Play Playlist
        </AppButton>

        <AppButton
          variant="secondary"
          size="md"
          @click="openPlaylist"
        >
          View Workstation
        </AppButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePlayerStore } from '../../stores/player';
import { getDistinctArtwork, formatDuration } from '../../data/demoTracks';
import AppButton from '../common/AppButton.vue';

const props = defineProps({
  playlist: {
    type: Object,
    default: null,
  },
});

const router = useRouter();
const playerStore = usePlayerStore();

const artwork = computed(() => {
  return getDistinctArtwork(props.playlist, 0);
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
    playerStore.playTrack(props.playlist.songs[0], props.playlist.songs, 0);
  }
};

const onImgError = (e) => {
  e.target.src = getDistinctArtwork(null, 1);
};
</script>

<style scoped>
.sw-featured-card {
  display: flex;
  align-items: center;
  gap: 28px;
  padding: 24px 28px;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-lg);
  position: relative;
  overflow: hidden;
  transition: border-color var(--sw-transition-fast);
}

.sw-featured-card:hover {
  border-color: rgba(121, 104, 255, 0.35);
}

.featured-art-wrapper {
  position: relative;
  width: 170px;
  height: 170px;
  border-radius: var(--sw-radius-md);
  overflow: hidden;
  flex-shrink: 0;
  cursor: pointer;
  background: #000;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5);
}

.featured-art {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--sw-transition-normal);
}

.featured-art-wrapper:hover .featured-art {
  transform: scale(1.05);
}

.featured-hover-play {
  position: absolute;
  inset: 0;
  margin: auto;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: var(--sw-accent);
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.9);
  transition: all var(--sw-transition-fast);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
}

.featured-art-wrapper:hover .featured-hover-play {
  opacity: 1;
  transform: scale(1);
}

.featured-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.featured-tag {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: var(--sw-accent);
}

.featured-title {
  font-size: 1.7rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: var(--sw-text-primary);
  margin: 0;
  cursor: pointer;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.featured-title:hover {
  color: var(--sw-accent-muted);
}

.featured-desc {
  font-size: 0.88rem;
  color: var(--sw-text-secondary);
  line-height: 1.5;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  max-width: 600px;
}

.featured-meta-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.8rem;
  color: var(--sw-text-muted);
  margin-top: 2px;
}

.meta-dot {
  opacity: 0.5;
}

.featured-actions-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 10px;
}

@media (max-width: 768px) {
  .sw-featured-card {
    flex-direction: column;
    align-items: flex-start;
  }
  .featured-art-wrapper {
    width: 100%;
    height: 200px;
  }
}
</style>
