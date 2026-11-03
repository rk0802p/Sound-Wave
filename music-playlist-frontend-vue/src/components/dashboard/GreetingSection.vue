<template>
  <header class="sw-greeting-section">
    <div class="greeting-text">
      <span class="greeting-eyebrow">YOUR WORKSTATION</span>
      <h1 class="greeting-title">{{ timeGreeting }}, {{ username }}.</h1>
      <p class="greeting-subtitle">Your playlists, your atmosphere.</p>
    </div>

    <div class="greeting-stats">
      <div class="stat-pill">
        <span class="stat-value tabular-nums">{{ playlistCount }}</span>
        <span class="stat-label">Playlists</span>
      </div>
      <div class="stat-pill">
        <span class="stat-value tabular-nums">{{ trackCount }}</span>
        <span class="stat-label">Tracks</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  username: {
    type: String,
    default: 'Friend',
  },
  playlistCount: {
    type: Number,
    default: 0,
  },
  trackCount: {
    type: Number,
    default: 0,
  },
});

const timeGreeting = computed(() => {
  const hr = new Date().getHours();
  if (hr < 12) return 'Good morning';
  if (hr < 18) return 'Good afternoon';
  return 'Good evening';
});
</script>

<style scoped>
.sw-greeting-section {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 20px;
  flex-wrap: wrap;
  padding-bottom: 24px;
  border-bottom: 1px solid var(--sw-border-subtle);
}

.greeting-text {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.greeting-eyebrow {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 1.5px;
  color: var(--sw-accent);
}

.greeting-title {
  font-size: 2.2rem;
  font-weight: 800;
  letter-spacing: -0.6px;
  color: var(--sw-text-primary);
  margin: 0;
}

.greeting-subtitle {
  font-size: 0.92rem;
  color: var(--sw-text-secondary);
}

.greeting-stats {
  display: flex;
  gap: 12px;
}

.stat-pill {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 18px;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-sm);
  min-width: 80px;
}

.stat-value {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--sw-accent-muted);
}

.stat-label {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--sw-text-muted);
}
</style>
