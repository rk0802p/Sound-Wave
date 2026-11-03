<template>
  <div class="sw-playlist-hero">
    <!-- Compact Square Artwork -->
    <div class="hero-art-container">
      <img
        :src="artworkUrl"
        :alt="playlist?.name"
        class="hero-art-img"
        @error="onImgError"
      />
    </div>

    <!-- Editorial Metadata & Actions -->
    <div class="hero-info-container">
      <div class="hero-eyebrow-row">
        <span class="eyebrow-badge">PLAYLIST</span>
        <span class="privacy-badge">{{ playlist?.isPublic ? 'PUBLIC' : 'PRIVATE' }}</span>
      </div>

      <h1 class="hero-title" :title="playlist?.name">{{ playlist?.name || 'Untitled Playlist' }}</h1>

      <p v-if="playlist?.description" class="hero-description">
        {{ playlist.description }}
      </p>

      <div class="hero-metadata-row">
        <span class="owner-name">{{ authStore.username }}</span>
        <span class="sep-dot">•</span>
        <span class="meta-item">{{ songCount }} {{ songCount === 1 ? 'track' : 'tracks' }}</span>
        <span class="sep-dot">•</span>
        <span class="meta-item tabular-nums">{{ formattedTotalDuration }}</span>
      </div>

      <!-- Action Row -->
      <div class="hero-actions-row">
        <AppButton
          variant="primary"
          size="md"
          :disabled="!songCount"
          @click="$emit('play-all')"
        >
          <template #icon-left>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z"/>
            </svg>
          </template>
          Play All
        </AppButton>

        <AppButton
          variant="secondary"
          size="md"
          :disabled="!songCount"
          @click="$emit('shuffle-play')"
        >
          <template #icon-left>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
            </svg>
          </template>
          Shuffle
        </AppButton>

        <AppButton
          variant="secondary"
          size="md"
          @click="$emit('open-add-song')"
        >
          <template #icon-left>+</template>
          Add Song
        </AppButton>

        <AppButton
          variant="ghost"
          size="md"
          @click="$emit('open-edit')"
          title="Edit Playlist"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </AppButton>

        <AppButton
          variant="danger"
          size="md"
          @click="$emit('delete-playlist')"
          title="Delete Playlist"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </AppButton>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { getDistinctArtwork, formatDuration } from '../../data/demoTracks';
import AppButton from '../common/AppButton.vue';

const props = defineProps({
  playlist: {
    type: Object,
    required: true,
  },
});

defineEmits(['play-all', 'shuffle-play', 'open-add-song', 'open-edit', 'delete-playlist']);

const authStore = useAuthStore();

const artworkUrl = computed(() => {
  return getDistinctArtwork(props.playlist, 0);
});

const songCount = computed(() => props.playlist?.songs?.length || 0);

const formattedTotalDuration = computed(() => {
  const songs = props.playlist?.songs || [];
  const totalSeconds = songs.reduce((sum, s) => sum + (s.duration || 0), 0);
  if (totalSeconds === 0) return '0 min';
  return formatDuration(totalSeconds);
});

const onImgError = (e) => {
  e.target.src = getDistinctArtwork(null, 1);
};
</script>

<style scoped>
.sw-playlist-hero {
  display: flex;
  align-items: flex-end;
  gap: 28px;
  padding: 28px;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-lg);
  margin-bottom: 24px;
  position: relative;
  /* Neutral surface without oversized purple gradients */
}

.hero-art-container {
  width: 210px;
  height: 210px;
  border-radius: var(--sw-radius-md);
  overflow: hidden;
  flex-shrink: 0;
  background: #000;
  border: 1px solid var(--sw-border);
  box-shadow: 0 14px 34px rgba(0, 0, 0, 0.6);
}

.hero-art-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-info-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8px;
  min-width: 0;
}

.hero-eyebrow-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.eyebrow-badge {
  font-size: 0.72rem;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: var(--sw-accent);
}

.privacy-badge {
  font-size: 0.68rem;
  font-weight: 600;
  background: var(--sw-surface-hover);
  border: 1px solid var(--sw-border-subtle);
  padding: 2px 7px;
  border-radius: 4px;
  color: var(--sw-text-muted);
}

.hero-title {
  font-size: 2.4rem;
  font-weight: 800;
  letter-spacing: -0.6px;
  color: var(--sw-text-primary);
  margin: 0;
  line-height: 1.15;
}

.hero-description {
  font-size: 0.9rem;
  color: var(--sw-text-secondary);
  line-height: 1.5;
  margin: 2px 0 4px 0;
  max-width: 680px;
}

.hero-metadata-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  color: var(--sw-text-muted);
}

.owner-name {
  color: var(--sw-text-primary);
  font-weight: 600;
}

.sep-dot {
  opacity: 0.4;
}

.hero-actions-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .sw-playlist-hero {
    flex-direction: column;
    align-items: flex-start;
    padding: 20px;
    gap: 20px;
  }
  .hero-art-container {
    width: 160px;
    height: 160px;
  }
  .hero-title {
    font-size: 1.8rem;
  }
}
</style>
