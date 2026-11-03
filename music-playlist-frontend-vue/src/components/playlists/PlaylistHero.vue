<template>
  <div class="hero-wrapper">
    <div class="hero-cover-container">
      <img
        :src="playlist?.coverImage || defaultCover"
        :alt="playlist?.name"
        class="hero-cover"
        @error="onImgError"
      />
      <div class="hero-cover-glow" :style="{ backgroundImage: `url(${playlist?.coverImage || defaultCover})` }"></div>
    </div>

    <div class="hero-content">
      <div class="hero-badge-row">
        <span class="hero-badge">PLAYLIST</span>
        <span class="hero-privacy-badge">{{ playlist?.isPublic ? 'PUBLIC' : 'PRIVATE' }}</span>
      </div>

      <h1 class="hero-title" :title="playlist?.name">{{ playlist?.name || 'Untitled Playlist' }}</h1>

      <p class="hero-description" v-if="playlist?.description">
        {{ playlist.description }}
      </p>

      <div class="hero-stats-row">
        <span class="hero-owner">{{ authStore.username }}</span>
        <span class="stats-sep">•</span>
        <span class="hero-stat-item">{{ songCount }} tracks</span>
        <span class="stats-sep">•</span>
        <span class="hero-stat-item">{{ formattedTotalDuration }}</span>
      </div>

      <div class="hero-actions">
        <button
          class="hero-btn btn-play-all"
          :disabled="!playlist?.songs?.length"
          @click="$emit('play-all')"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M8 5v14l11-7z"/>
          </svg>
          <span>Play All</span>
        </button>

        <button
          class="hero-btn btn-shuffle"
          :disabled="!playlist?.songs?.length"
          @click="$emit('shuffle-play')"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M16 3h5v5M4 20L21 3M21 16v5h-5M15 15l6 6M4 4l5 5"/>
          </svg>
          <span>Shuffle</span>
        </button>

        <button class="hero-btn btn-secondary" @click="$emit('open-add-song')">
          <span>+ Add Song</span>
        </button>

        <button class="hero-btn btn-icon" @click="$emit('open-edit')" title="Edit Playlist Details">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
          </svg>
        </button>

        <button class="hero-btn btn-icon btn-danger" @click="$emit('delete-playlist')" title="Delete Playlist">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="3 6 5 6 21 6"></polyline>
            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
          </svg>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useAuthStore } from '../../stores/auth';

const props = defineProps({
  playlist: {
    type: Object,
    required: true,
  },
});

defineEmits(['play-all', 'shuffle-play', 'open-add-song', 'open-edit', 'delete-playlist']);

const authStore = useAuthStore();
const defaultCover = 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=600&auto=format&fit=crop';

const songCount = computed(() => props.playlist?.songs?.length || 0);

const formattedTotalDuration = computed(() => {
  const songs = props.playlist?.songs || [];
  const totalSeconds = songs.reduce((sum, s) => sum + (s.duration || 0), 0);
  if (totalSeconds === 0) return '0 min';

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours} hr ${minutes} min`;
  }
  return `${minutes} min ${seconds} sec`;
});

const onImgError = (e) => {
  e.target.src = defaultCover;
};
</script>

<style scoped>
.hero-wrapper {
  display: flex;
  align-items: flex-end;
  gap: 32px;
  padding: 36px 32px;
  background: linear-gradient(180deg, rgba(99, 102, 241, 0.15) 0%, rgba(13, 14, 22, 0.4) 100%);
  border-radius: 20px;
  margin-bottom: 28px;
  position: relative;
  overflow: hidden;
  border: 1px solid rgba(255, 255, 255, 0.05);
}

.hero-cover-container {
  position: relative;
  width: 220px;
  height: 220px;
  flex-shrink: 0;
  border-radius: 16px;
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
}

.hero-cover {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border-radius: 16px;
  position: relative;
  z-index: 2;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.hero-cover-glow {
  position: absolute;
  top: 10px;
  left: 0;
  right: 0;
  bottom: -10px;
  background-size: cover;
  filter: blur(25px);
  opacity: 0.6;
  z-index: 1;
  border-radius: 20px;
}

.hero-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 10px;
  z-index: 3;
}

.hero-badge-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.hero-badge {
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 1.5px;
  color: #6366f1;
}

.hero-privacy-badge {
  font-size: 0.7rem;
  font-weight: 600;
  background: rgba(255, 255, 255, 0.08);
  padding: 2px 8px;
  border-radius: 4px;
  color: #9ca3af;
}

.hero-title {
  font-size: 2.8rem;
  font-weight: 800;
  color: #fff;
  margin: 0;
  line-height: 1.1;
  letter-spacing: -0.5px;
}

.hero-description {
  font-size: 0.95rem;
  color: #9ca3af;
  margin: 0;
  line-height: 1.5;
  max-width: 700px;
}

.hero-stats-row {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.88rem;
  color: #d1d5db;
  margin-top: 4px;
}

.hero-owner {
  font-weight: 600;
  color: #fff;
}

.stats-sep {
  color: #6b7280;
}

.hero-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 14px;
  flex-wrap: wrap;
}

.hero-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  border-radius: 24px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  border: none;
  transition: all 0.2s ease;
}

.btn-play-all {
  background: #6366f1;
  color: #fff;
  box-shadow: 0 4px 18px rgba(99, 102, 241, 0.4);
}

.btn-play-all:hover:not(:disabled) {
  background: #4f46e5;
  transform: translateY(-2px);
  box-shadow: 0 6px 22px rgba(99, 102, 241, 0.6);
}

.btn-shuffle {
  background: rgba(255, 255, 255, 0.08);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-shuffle:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}

.btn-secondary {
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.btn-secondary:hover {
  background: rgba(255, 255, 255, 0.12);
  transform: translateY(-2px);
}

.btn-icon {
  width: 40px;
  height: 40px;
  padding: 0;
  justify-content: center;
  background: rgba(255, 255, 255, 0.05);
  color: #9ca3af;
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 50%;
}

.btn-icon:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.12);
}

.btn-danger:hover {
  color: #f87171;
  background: rgba(248, 113, 113, 0.15);
  border-color: rgba(248, 113, 113, 0.3);
}

.hero-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  transform: none !important;
}

@media (max-width: 900px) {
  .hero-wrapper {
    flex-direction: column;
    align-items: center;
    text-align: center;
    padding: 24px;
  }
  .hero-cover-container {
    width: 180px;
    height: 180px;
  }
  .hero-title {
    font-size: 2rem;
  }
  .hero-actions {
    justify-content: center;
  }
}
</style>
