<template>
  <div class="sw-playlist-card" @click="handleCardClick">
    <!-- Artwork Tile Container -->
    <div class="card-art-box">
      <img
        :src="artworkUrl"
        :alt="playlist.name"
        class="card-art-img"
        @error="onImgError"
      />
      <!-- Hover Play Overlay Button -->
      <button
        class="card-play-btn"
        :disabled="!playlist.songs?.length"
        @click.stop="handlePlayClick"
        title="Play Playlist"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M8 5v14l11-7z"/>
        </svg>
      </button>

      <!-- Badge for track count -->
      <div class="card-art-badge">
        {{ playlist.songs?.length || 0 }} {{ playlist.songs?.length === 1 ? 'track' : 'tracks' }}
      </div>
    </div>

    <!-- Playlist Metadata -->
    <div class="card-info-box">
      <h3 class="card-title" :title="playlist.name">{{ playlist.name }}</h3>
      <p v-if="playlist.description" class="card-desc" :title="playlist.description">
        {{ playlist.description }}
      </p>
      <div class="card-footer-meta">
        <span class="meta-label">{{ playlist.isPublic ? 'Public' : 'Private' }}</span>
        <span v-if="totalDurationText" class="meta-dot">•</span>
        <span v-if="totalDurationText" class="meta-duration tabular-nums">{{ totalDurationText }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePlayerStore } from '../../stores/player';
import { getDistinctArtwork, formatDuration } from '../../data/demoTracks';

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

const artworkUrl = computed(() => {
  return getDistinctArtwork(props.playlist, props.index);
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
    playerStore.playTrack(props.playlist.songs[0], props.playlist.songs, 0);
  }
};

const onImgError = (e) => {
  e.target.src = getDistinctArtwork(null, props.index + 1);
};
</script>

<style scoped>
.sw-playlist-card {
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-md);
  padding: 14px;
  cursor: pointer;
  transition: all var(--sw-transition-normal);
  display: flex;
  flex-direction: column;
}

.sw-playlist-card:hover {
  transform: translateY(-3px);
  background: var(--sw-surface-hover);
  border-color: rgba(121, 104, 255, 0.35);
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.4);
}

.card-art-box {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--sw-radius-sm);
  overflow: hidden;
  background: #000;
  margin-bottom: 12px;
}

.card-art-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--sw-transition-normal);
}

.sw-playlist-card:hover .card-art-img {
  transform: scale(1.05);
}

.card-play-btn {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 42px;
  height: 42px;
  border-radius: 50%;
  background: var(--sw-accent);
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transform: translateY(8px);
  transition: all var(--sw-transition-fast);
  box-shadow: 0 4px 14px rgba(0, 0, 0, 0.6);
  z-index: 2;
}

.sw-playlist-card:hover .card-play-btn {
  opacity: 1;
  transform: translateY(0);
}

.card-play-btn:hover {
  background: var(--sw-accent-hover);
  transform: scale(1.08) translateY(0);
}

.card-art-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: rgba(9, 9, 12, 0.75);
  backdrop-filter: blur(4px);
  padding: 3px 8px;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 600;
  color: var(--sw-text-secondary);
}

.card-info-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
  flex: 1;
}

.card-title {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--sw-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-desc {
  font-size: 0.8rem;
  color: var(--sw-text-secondary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  min-height: 2.2em;
}

.card-footer-meta {
  margin-top: auto;
  padding-top: 8px;
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.75rem;
  color: var(--sw-text-muted);
}

.meta-dot {
  opacity: 0.5;
}
</style>
