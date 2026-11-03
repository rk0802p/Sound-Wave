<template>
  <div
    class="sw-playlist-card"
    :class="{ 'is-active-playing': isCurrentPlaylistPlaying }"
    @click="handleCardClick"
    tabindex="0"
    role="button"
    :aria-label="`Open playlist ${playlist.name}`"
    @keydown.enter="handleCardClick"
  >
    <!-- Artwork with Vinyl Disc Reveal -->
    <div class="card-art-box">
      <ArtworkCover
        :src="playlist.coverImage"
        :alt="playlist.name"
        size="lg"
        :showVinyl="true"
        :isPlaying="isCurrentPlaylistPlaying"
        :fallbackSeed="playlist.name"
      />

      <!-- Quick Play Button -->
      <button
        class="card-play-btn"
        :class="{ playing: isCurrentPlaylistPlaying }"
        :disabled="!playlist.songs?.length"
        @click.stop="handlePlayClick"
        :title="isCurrentPlaylistPlaying ? 'Pause' : 'Play Playlist'"
        :aria-label="isCurrentPlaylistPlaying ? 'Pause' : 'Play Playlist'"
      >
        <svg v-if="isCurrentPlaylistPlaying" width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
        </svg>
        <svg v-else width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </button>

      <!-- Track count badge -->
      <div class="card-track-badge tabular-nums">
        {{ playlist.songs?.length || 0 }} {{ playlist.songs?.length === 1 ? 'track' : 'tracks' }}
      </div>
    </div>

    <!-- Metadata Content -->
    <div class="card-info-box">
      <div class="card-tag-row">
        <span class="privacy-tag font-mono">{{ playlist.isPublic ? 'PUBLIC' : 'PRIVATE' }}</span>
        <span v-if="totalDurationText" class="runtime-tag tabular-nums font-mono">{{ totalDurationText }}</span>
      </div>

      <h3 class="card-title font-display" :title="playlist.name">{{ playlist.name }}</h3>

      <p class="card-desc" :title="playlist.description || 'No description provided.'">
        {{ playlist.description || 'Curated personal sound collection.' }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePlayerStore } from '../../stores/player';
import { formatDuration } from '../../data/demoTracks';
import ArtworkCover from '../common/ArtworkCover.vue';

const props = defineProps({
  playlist: {
    type: Object,
    required: true,
  },
  index: {
    type: Number,
    default: 0,
  },
});

const router = useRouter();
const playerStore = usePlayerStore();

const isCurrentPlaylistPlaying = computed(() => {
  return playerStore.isPlaying && playerStore.currentPlaylistId === props.playlist._id;
});

const totalDurationText = computed(() => {
  if (!props.playlist.songs || !props.playlist.songs.length) return null;
  const total = props.playlist.songs.reduce((acc, s) => acc + (s.duration || 0), 0);
  if (total === 0) return null;
  return formatDuration(total);
});

const handleCardClick = () => {
  router.push(`/playlists/${props.playlist._id}`);
};

const handlePlayClick = () => {
  if (props.playlist.songs && props.playlist.songs.length) {
    if (isCurrentPlaylistPlaying.value) {
      playerStore.togglePlay();
    } else {
      playerStore.playTrack(props.playlist.songs[0], props.playlist.songs, 0, props.playlist._id);
    }
  }
};
</script>

<style scoped>
.sw-playlist-card {
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-xl);
  padding: 16px;
  cursor: pointer;
  transition: all var(--sw-transition-normal);
  display: flex;
  flex-direction: column;
  position: relative;
  outline: none;
}

.sw-playlist-card:hover {
  background: var(--sw-surface-hover);
  border-color: var(--sw-border-hover);
  transform: translateY(-3px);
  box-shadow: var(--sw-shadow-lg);
}

.sw-playlist-card.is-active-playing {
  border-color: rgba(56, 189, 248, 0.4);
  box-shadow: 0 0 25px rgba(56, 189, 248, 0.15);
}

.card-art-box {
  position: relative;
  width: 100%;
  display: flex;
  justify-content: center;
  margin-bottom: 14px;
}

.card-play-btn {
  position: absolute;
  right: 14px;
  bottom: 14px;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--sw-accent);
  color: #060709;
  border: none;
  box-shadow: 0 4px 18px var(--sw-accent-glow);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transform: translateY(8px) scale(0.9);
  transition: all var(--sw-transition-fast);
  z-index: 10;
}

.sw-playlist-card:hover .card-play-btn,
.card-play-btn.playing {
  opacity: 1;
  transform: translateY(0) scale(1);
}

.card-play-btn:hover {
  background: #fff;
  transform: scale(1.08);
}

.card-track-badge {
  position: absolute;
  left: 12px;
  bottom: 12px;
  background: rgba(6, 7, 9, 0.75);
  backdrop-filter: blur(6px);
  color: var(--sw-text-primary);
  font-size: 0.68rem;
  font-weight: 600;
  padding: 2px 8px;
  border-radius: var(--sw-radius-full);
  z-index: 5;
}

.card-info-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-tag-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 2px;
}

.privacy-tag {
  font-size: 0.62rem;
  color: var(--sw-text-muted);
  letter-spacing: 0.08em;
}

.runtime-tag {
  font-size: 0.68rem;
  color: var(--sw-text-muted);
}

.card-title {
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--sw-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  letter-spacing: -0.01em;
}

.sw-playlist-card:hover .card-title {
  color: var(--sw-accent);
}

.card-desc {
  font-size: 0.8rem;
  color: var(--sw-text-secondary);
  line-height: 1.35;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
</style>
