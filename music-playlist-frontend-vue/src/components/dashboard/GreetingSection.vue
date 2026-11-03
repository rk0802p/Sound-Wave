<template>
  <header class="sw-greeting-section">
    <div class="greeting-text-lockup">
      <div class="eyebrow-row">
        <span class="greeting-dot"></span>
        <span class="greeting-eyebrow font-mono">ACOUSTIC ATELIER / SESSION ACTIVE</span>
      </div>
      <h1 class="greeting-title font-display">
        {{ timeGreeting }}, <span class="highlight-name">{{ username }}</span>.
      </h1>
      <p class="greeting-subtitle">Your sound archives, curated frequencies, and personalized listening spaces.</p>
    </div>

    <div class="greeting-stats-grid">
      <div class="stat-box">
        <span class="stat-number tabular-nums">{{ playlistCount }}</span>
        <span class="stat-label font-mono">PLAYLISTS</span>
      </div>

      <div class="stat-box">
        <span class="stat-number tabular-nums">{{ trackCount }}</span>
        <span class="stat-label font-mono">TRACKS</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({
  username: {
    type: String,
    default: 'Listener',
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
  gap: 24px;
  flex-wrap: wrap;
  padding-bottom: 28px;
  border-bottom: 1px solid var(--sw-border-subtle);
  margin-bottom: 32px;
}

.greeting-text-lockup {
  display: flex;
  flex-direction: column;
  gap: 6px;
  max-width: 680px;
}

.eyebrow-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.greeting-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--sw-accent);
  box-shadow: 0 0 8px var(--sw-accent);
}

.greeting-eyebrow {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--sw-accent);
}

.greeting-title {
  font-size: 2.5rem;
  font-weight: 800;
  line-height: 1.15;
  letter-spacing: -0.03em;
  color: var(--sw-text-primary);
}

.highlight-name {
  color: #fff;
  background: linear-gradient(135deg, #ffffff 30%, var(--sw-accent) 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.greeting-subtitle {
  font-size: 0.95rem;
  color: var(--sw-text-secondary);
  line-height: 1.4;
}

.greeting-stats-grid {
  display: flex;
  gap: 12px;
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 10px 22px;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-lg);
  min-width: 90px;
}

.stat-number {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--sw-text-primary);
  line-height: 1.2;
}

.stat-label {
  font-size: 0.65rem;
  font-weight: 600;
  color: var(--sw-text-muted);
  letter-spacing: 0.08em;
}

@media (max-width: 768px) {
  .greeting-title {
    font-size: 1.8rem;
  }
}
</style>
