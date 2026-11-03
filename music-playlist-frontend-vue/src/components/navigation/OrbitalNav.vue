<template>
  <header class="pg-masthead-wrapper">
    <nav class="pg-masthead">
      <!-- 1. Brand Logo Lockup -->
      <router-link to="/" class="pg-brand" aria-label="Soundwave Playground Home">
        <div class="brand-equalizer" :class="{ 'is-playing': playerStore.isPlaying }">
          <span class="eq-col col-1"></span>
          <span class="eq-col col-2"></span>
          <span class="eq-col col-3"></span>
          <span class="eq-col col-4"></span>
        </div>
        <div class="brand-typography">
          <span class="brand-name font-display">SOUNDWAVE</span>
          <span class="brand-edition font-mono">PLAYGROUND</span>
        </div>
      </router-link>

      <!-- 2. Primary Editorial Navigation Links (Desktop) -->
      <div class="pg-nav-links desktop-only">
        <router-link to="/" class="pg-nav-pill" active-class="is-active" exact>
          <span class="pill-num font-mono">01</span>
          <span class="pill-text font-display">Playground</span>
        </router-link>

        <router-link to="/library" class="pg-nav-pill" active-class="is-active">
          <span class="pill-num font-mono">02</span>
          <span class="pill-text font-display">Archive</span>
          <span v-if="playlistStore.playlists.length" class="pill-badge font-mono">
            {{ playlistStore.playlists.length }}
          </span>
        </router-link>

        <router-link to="/search" class="pg-nav-pill" active-class="is-active">
          <span class="pill-num font-mono">03</span>
          <span class="pill-text font-display">Explore</span>
          <span class="kbd-badge font-mono">/</span>
        </router-link>
      </div>

      <!-- 3. Actions & Curator Profile Cluster -->
      <div class="pg-masthead-actions">
        <!-- New Mixtape Button -->
        <button
          class="create-mixtape-btn font-display"
          @click="$emit('open-create-modal')"
          title="Create New Mixtape"
        >
          <span class="btn-icon">+</span>
          <span class="btn-label desktop-only">New Mixtape</span>
        </button>

        <!-- Live Turntable Status Pill -->
        <button
          v-if="playerStore.hasTrack"
          class="live-status-pill"
          :class="{ 'is-playing': playerStore.isPlaying }"
          @click="playerStore.toggleExpanded()"
          title="Open Listening Salon"
        >
          <div class="mini-disc" :class="{ 'is-spinning': playerStore.isPlaying }">
            <div class="disc-label"></div>
          </div>
          <span class="live-label desktop-only font-mono">
            {{ playerStore.isPlaying ? 'STEREO ON' : 'PAUSED' }}
          </span>
        </button>

        <!-- Curator Profile Dropdown Trigger -->
        <div class="curator-profile-container" ref="dropdownRef">
          <button
            class="curator-avatar-btn"
            :class="{ 'is-open': dropdownOpen }"
            @click="dropdownOpen = !dropdownOpen"
            aria-label="User Account Menu"
          >
            <div class="curator-avatar font-mono">
              {{ userInitials }}
            </div>
            <span class="curator-handle desktop-only font-display">{{ authStore.username || 'Curator' }}</span>
            <svg class="dropdown-chevron desktop-only" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <!-- Dropdown Overlay -->
          <transition name="pg-pop">
            <div v-if="dropdownOpen" class="curator-popover">
              <div class="popover-mast">
                <span class="popover-kicker font-mono">CURATOR IDENT</span>
                <span class="popover-username font-display">{{ authStore.username }}</span>
                <span class="popover-email font-mono">{{ authStore.user?.email || 'curator@soundwave.internal' }}</span>
              </div>

              <div class="popover-strip"></div>

              <div class="popover-stats font-mono">
                <div class="popover-stat-cell">
                  <span class="stat-number">{{ playlistStore.playlists.length }}</span>
                  <span class="stat-text">Mixtapes</span>
                </div>
                <div class="popover-stat-cell">
                  <span class="stat-number">{{ playlistStore.totalTracksCount }}</span>
                  <span class="stat-text">Tracks</span>
                </div>
              </div>

              <div class="popover-strip"></div>

              <button class="popover-action-btn logout font-mono" @click="handleLogout">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>End Session</span>
              </button>
            </div>
          </transition>
        </div>
      </div>
    </nav>

    <!-- Mobile Bottom Editorial Dock -->
    <nav class="pg-mobile-dock mobile-only" aria-label="Mobile Navigation">
      <router-link to="/" class="dock-link" active-class="is-active" exact>
        <span class="dock-glyph">★</span>
        <span class="dock-text font-display">Playground</span>
      </router-link>

      <router-link to="/library" class="dock-link" active-class="is-active">
        <span class="dock-glyph">▦</span>
        <span class="dock-text font-display">Archive</span>
        <span v-if="playlistStore.playlists.length" class="dock-bubble font-mono">
          {{ playlistStore.playlists.length }}
        </span>
      </router-link>

      <router-link to="/search" class="dock-link" active-class="is-active">
        <span class="dock-glyph">⚲</span>
        <span class="dock-text font-display">Explore</span>
      </router-link>

      <button class="dock-link create-dock-btn" @click="$emit('open-create-modal')">
        <span class="dock-glyph font-mono">+</span>
        <span class="dock-text font-display">Create</span>
      </button>
    </nav>
  </header>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { usePlaylistStore } from '../../stores/playlist';
import { usePlayerStore } from '../../stores/player';

defineEmits(['open-create-modal']);

const router = useRouter();
const authStore = useAuthStore();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();

const dropdownOpen = ref(false);
const dropdownRef = ref(null);

const userInitials = computed(() => {
  const name = authStore.username || 'Curator';
  return name.slice(0, 2).toUpperCase();
});

const handleLogout = async () => {
  dropdownOpen.value = false;
  await authStore.logout();
  router.push('/login');
};

const handleClickOutside = (event) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target)) {
    dropdownOpen.value = false;
  }
};

onMounted(() => {
  document.addEventListener('click', handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener('click', handleClickOutside);
});
</script>

<style scoped>
.pg-masthead-wrapper {
  position: fixed;
  top: 16px;
  left: 0;
  right: 0;
  z-index: 1000;
  display: flex;
  justify-content: center;
  padding: 0 24px;
  pointer-events: none;
}

.pg-masthead {
  pointer-events: auto;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  max-width: 1320px;
  padding: 10px 18px;
  background: var(--pg-canvas);
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  box-shadow: var(--pg-shadow-solid);
  transition: transform var(--pg-transition-spring);
}

/* 1. Brand */
.pg-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: var(--pg-ink);
  user-select: none;
}

.brand-equalizer {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 22px;
  padding: 2px 4px;
  background: var(--pg-ink);
  border-radius: var(--pg-radius-xs);
}

.eq-col {
  width: 3.5px;
  background: var(--pg-citron);
  border-radius: 1px;
  height: 8px;
  transition: height 200ms ease;
}

.brand-equalizer.is-playing .col-1 { animation: eqPlay 600ms infinite ease-in-out alternate; }
.brand-equalizer.is-playing .col-2 { animation: eqPlay 800ms infinite ease-in-out alternate 100ms; }
.brand-equalizer.is-playing .col-3 { animation: eqPlay 500ms infinite ease-in-out alternate 200ms; }
.brand-equalizer.is-playing .col-4 { animation: eqPlay 700ms infinite ease-in-out alternate 300ms; }

@keyframes eqPlay {
  0% { height: 4px; }
  100% { height: 18px; }
}

.brand-typography {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-name {
  font-size: 1.05rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  color: var(--pg-ink);
}

.brand-edition {
  font-size: 0.65rem;
  font-weight: 800;
  letter-spacing: 0.08em;
  padding: 2px 8px;
  background: var(--pg-citron);
  color: var(--pg-ink);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
}

/* 2. Navigation Pills */
.pg-nav-links {
  display: flex;
  align-items: center;
  gap: 8px;
}

.pg-nav-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 16px;
  border-radius: var(--pg-radius-full);
  border: 1.5px solid transparent;
  background: transparent;
  color: var(--pg-ink-secondary);
  font-size: 0.88rem;
  font-weight: 700;
  text-decoration: none;
  transition: all var(--pg-transition-spring);
}

.pg-nav-pill:hover {
  background: var(--pg-surface-soft);
  color: var(--pg-ink);
  border-color: var(--pg-border);
  transform: translateY(-2px);
  box-shadow: 2px 2px 0px var(--pg-border);
}

.pg-nav-pill.is-active {
  background: var(--pg-ink);
  color: #FFFFFF;
  border-color: var(--pg-ink);
  box-shadow: 2px 2px 0px var(--pg-coral);
}

.pg-nav-pill.is-active .pill-text {
  color: #FFFFFF;
}

.pill-num {
  font-size: 0.7rem;
  font-weight: 700;
  opacity: 0.7;
}

.pg-nav-pill.is-active .pill-num {
  color: var(--pg-citron);
  opacity: 1;
}

.pill-badge {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 1px 6px;
  background: var(--pg-coral);
  color: #fff;
  border-radius: var(--pg-radius-full);
}

.kbd-badge {
  font-size: 0.7rem;
  font-weight: 700;
  padding: 1px 6px;
  background: var(--pg-surface-soft);
  border: 1px solid var(--pg-border);
  border-radius: 4px;
}

.pg-nav-pill.is-active .kbd-badge {
  background: rgba(255, 255, 255, 0.2);
  color: #fff;
  border-color: rgba(255, 255, 255, 0.3);
}

/* 3. Actions Cluster */
.pg-masthead-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.create-mixtape-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  background: var(--pg-cobalt);
  color: #fff;
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  font-size: 0.88rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 3px 3px 0px var(--pg-border);
  transition: all var(--pg-transition-spring);
}

.create-mixtape-btn:hover {
  background: var(--pg-coral);
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0px var(--pg-border);
}

.btn-icon {
  font-size: 1.1rem;
  line-height: 1;
}

.live-status-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: var(--pg-surface-butter);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  cursor: pointer;
  box-shadow: 2px 2px 0px var(--pg-border);
  transition: transform var(--pg-transition-spring);
}

.live-status-pill:hover {
  transform: translateY(-2px);
  box-shadow: 3px 3px 0px var(--pg-border);
}

.mini-disc {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #14101E;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255, 255, 255, 0.3);
}

.disc-label {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--pg-coral);
}

.mini-disc.is-spinning {
  animation: discSpin 2.5s linear infinite;
}

@keyframes discSpin {
  100% { transform: rotate(360deg); }
}

.live-label {
  font-size: 0.68rem;
  font-weight: 800;
  color: var(--pg-ink);
  letter-spacing: 0.05em;
}

/* Curator Avatar & Popover */
.curator-profile-container {
  position: relative;
}

.curator-avatar-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 4px;
  background: var(--pg-surface-soft);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  cursor: pointer;
  box-shadow: 2px 2px 0px var(--pg-border);
  transition: all var(--pg-transition-spring);
}

.curator-avatar-btn:hover {
  background: var(--pg-surface);
  transform: translateY(-2px);
  box-shadow: 3px 3px 0px var(--pg-border);
}

.curator-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--pg-ink);
  color: var(--pg-citron);
  font-size: 0.72rem;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.curator-handle {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--pg-ink);
}

.dropdown-chevron {
  color: var(--pg-ink-secondary);
}

/* Curator Popover */
.curator-popover {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 250px;
  background: var(--pg-canvas);
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-lg);
  box-shadow: var(--pg-shadow-solid-lg);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  z-index: 1001;
}

.popover-mast {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.popover-kicker {
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--pg-ink-muted);
  letter-spacing: 0.08em;
}

.popover-username {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--pg-ink);
}

.popover-email {
  font-size: 0.72rem;
  color: var(--pg-ink-secondary);
  word-break: break-all;
}

.popover-strip {
  height: 2px;
  background: var(--pg-border);
  opacity: 0.15;
}

.popover-stats {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  background: var(--pg-surface-soft);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-sm);
  padding: 8px;
}

.popover-stat-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-number {
  font-size: 1.1rem;
  font-weight: 800;
  color: var(--pg-cobalt);
}

.stat-text {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--pg-ink-muted);
  text-transform: uppercase;
}

.popover-action-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-md);
  font-size: 0.78rem;
  font-weight: 700;
  cursor: pointer;
  background: var(--pg-surface-peach);
  color: var(--pg-coral);
  box-shadow: 2px 2px 0px var(--pg-border);
  transition: all var(--pg-transition-spring);
}

.popover-action-btn:hover {
  background: var(--pg-coral);
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 3px 3px 0px var(--pg-border);
}

/* Popover Animation */
.pg-pop-enter-active,
.pg-pop-leave-active {
  transition: all var(--pg-transition-spring);
}

.pg-pop-enter-from,
.pg-pop-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

/* Mobile Bottom Editorial Dock */
.pg-mobile-dock {
  display: none;
}

@media (max-width: 900px) {
  .desktop-only {
    display: none !important;
  }

  .mobile-only {
    display: flex !important;
  }

  .pg-masthead-wrapper {
    top: 10px;
    padding: 0 12px;
  }

  .pg-masthead {
    padding: 8px 12px;
  }

  .pg-mobile-dock {
    position: fixed;
    bottom: 14px;
    left: 12px;
    right: 12px;
    height: 58px;
    background: var(--pg-canvas);
    border: 2px solid var(--pg-border);
    border-radius: var(--pg-radius-full);
    box-shadow: var(--pg-shadow-solid-lg);
    display: flex;
    align-items: center;
    justify-content: space-around;
    padding: 0 8px;
    pointer-events: auto;
    z-index: 1000;
  }

  .dock-link {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    color: var(--pg-ink-secondary);
    text-decoration: none;
    font-size: 0.65rem;
    font-weight: 700;
    position: relative;
    padding: 4px 8px;
    border-radius: var(--pg-radius-md);
  }

  .dock-glyph {
    font-size: 1.1rem;
    line-height: 1;
  }

  .dock-link.is-active {
    color: var(--pg-cobalt);
  }

  .dock-bubble {
    position: absolute;
    top: 2px;
    right: 4px;
    font-size: 0.55rem;
    padding: 1px 4px;
    background: var(--pg-coral);
    color: #fff;
    border-radius: var(--pg-radius-full);
  }

  .create-dock-btn {
    background: var(--pg-cobalt);
    color: #fff;
    border: 1.5px solid var(--pg-border);
    border-radius: var(--pg-radius-full);
    padding: 4px 10px;
    box-shadow: 2px 2px 0px var(--pg-border);
  }

  .create-dock-btn .dock-glyph {
    color: #fff;
  }

  .create-dock-btn .dock-text {
    color: #fff;
  }
}
</style>
