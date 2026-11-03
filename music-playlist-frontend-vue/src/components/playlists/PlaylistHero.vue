<template>
  <div class="sw-playlist-hero">
    <!-- Ambient Backdrop Light from Artwork -->
    <div
      class="hero-ambient-glow"
      :style="{ backgroundImage: playlist?.coverImage ? `url(${playlist.coverImage})` : 'none' }"
    ></div>

    <div class="hero-inner-layout">
      <!-- Vinyl Showcase Artwork -->
      <div class="hero-art-showcase">
        <ArtworkCover
          :src="playlist?.coverImage"
          :alt="playlist?.name"
          size="xl"
          :showVinyl="true"
          :glow="true"
          :isPlaying="isPlayingThisPlaylist"
          :fallbackSeed="playlist?.name"
        />
      </div>

      <!-- Editorial Metadata & Actions -->
      <div class="hero-info-container">
        <div class="hero-eyebrow-row">
          <span class="eyebrow-badge font-mono">PLAYLIST ARCHIVE</span>
          <span class="privacy-badge font-mono">{{ playlist?.isPublic ? 'PUBLIC ACCESS' : 'PRIVATE WORKSTATION' }}</span>
        </div>

        <h1 class="hero-title font-display" :title="playlist?.name">
          {{ playlist?.name || 'Untitled Playlist' }}
        </h1>

        <p v-if="playlist?.description" class="hero-description">
          {{ playlist.description }}
        </p>

        <div class="hero-metadata-row font-mono">
          <span class="owner-pill font-mono">
            <span class="owner-dot"></span>
            {{ authStore.username }}
          </span>
          <span class="sep-dot">•</span>
          <span class="meta-item">
            <strong class="tabular-nums">{{ songCount }}</strong> {{ songCount === 1 ? 'track' : 'tracks' }}
          </span>
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
              <svg v-if="isPlayingThisPlaylist" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
              </svg>
              <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z"/>
              </svg>
            </template>
            {{ isPlayingThisPlaylist ? 'Pause Playlist' : 'Play All' }}
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
            Add Track
          </AppButton>

          <AppButton
            variant="ghost"
            size="md"
            @click="$emit('open-edit')"
            title="Edit Playlist Details"
            aria-label="Edit Playlist"
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
            aria-label="Delete Playlist"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="3 6 5 6 21 6"></polyline>
              <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
            </svg>
          </AppButton>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAuthStore } from '../../stores/auth';
import { usePlayerStore } from '../../stores/player';
import { formatDuration } from '../../data/demoTracks';
import ArtworkCover from '../common/ArtworkCover.vue';
import AppButton from '../common/AppButton.vue';

const props = defineProps({
  playlist: {
    type: Object,
    required: true,
  },
});

defineEmits(['play-all', 'shuffle-play', 'open-add-song', 'open-edit', 'delete-playlist']);

const authStore = useAuthStore();
const playerStore = usePlayerStore();

const isPlayingThisPlaylist = computed(() => {
  return playerStore.isPlaying && playerStore.currentPlaylistId === props.playlist?._id;
});

const songCount = computed(() => props.playlist?.songs?.length || 0);

const formattedTotalDuration = computed(() => {
  const songs = props.playlist?.songs || [];
  const totalSeconds = songs.reduce((sum, s) => sum + (s.duration || 0), 0);
  if (totalSeconds === 0) return '0 min';
  return formatDuration(totalSeconds);
});
</script>

<style scoped>
.sw-playlist-hero {
  position: relative;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-xl);
  padding: 32px;
  margin-bottom: 28px;
  overflow: hidden;
  box-shadow: var(--sw-shadow-lg);
}

.hero-ambient-glow {
  position: absolute;
  inset: -60px;
  background-size: cover;
  background-position: center;
  filter: blur(80px);
  opacity: 0.16;
  pointer-events: none;
  z-index: 0;
}

.hero-inner-layout {
  position: relative;
  z-index: 2;
  display: flex;
  align-items: flex-end;
  gap: 36px;
}

.hero-art-showcase {
  flex-shrink: 0;
}

.hero-info-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
}

.hero-eyebrow-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.eyebrow-badge {
  font-size: 0.65rem;
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

.hero-title {
  font-size: 2.6rem;
  font-weight: 800;
  line-height: 1.1;
  letter-spacing: -0.03em;
  color: var(--sw-text-primary);
  margin: 0;
}

.hero-description {
  font-size: 0.95rem;
  color: var(--sw-text-secondary);
  line-height: 1.5;
  max-width: 680px;
}

.hero-metadata-row {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.8rem;
  color: var(--sw-text-muted);
  padding: 4px 0;
}

.owner-pill {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--sw-text-secondary);
  font-weight: 600;
}

.owner-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--sw-accent);
}

.meta-item strong {
  color: var(--sw-text-primary);
}

.sep-dot {
  opacity: 0.4;
}

.hero-actions-row {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 6px;
}

@media (max-width: 900px) {
  .hero-inner-layout {
    flex-direction: column;
    align-items: flex-start;
    gap: 20px;
  }
  .sw-playlist-hero {
    padding: 24px 20px;
  }
  .hero-title {
    font-size: 1.8rem;
  }
}
</style>
