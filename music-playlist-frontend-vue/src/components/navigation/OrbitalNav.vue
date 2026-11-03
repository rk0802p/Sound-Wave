<template>
  <header class="sw-orbital-nav-wrapper">
    <nav class="sw-orbital-capsule">
      <!-- 1. Brand Soundmark Lockup -->
      <router-link to="/" class="orbital-brand" aria-label="Soundwave Home">
        <div class="brand-soundmark" :class="{ 'is-active': playerStore.isPlaying }">
          <span class="eq-bar bar-1"></span>
          <span class="eq-bar bar-2"></span>
          <span class="eq-bar bar-3"></span>
          <span class="eq-bar bar-4"></span>
          <span class="eq-bar bar-5"></span>
        </div>
        <div class="brand-text">
          <span class="brand-title font-display">SOUNDWAVE</span>
          <span class="brand-edition font-mono">ATELIER</span>
        </div>
      </router-link>

      <!-- 2. Primary Navigation Links (Desktop) -->
      <div class="orbital-links desktop-only">
        <router-link to="/" class="orbital-link" active-class="is-active" exact>
          <svg class="link-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
            <polyline points="9 22 9 12 15 12 15 22"></polyline>
          </svg>
          <span>Orbit</span>
        </router-link>

        <router-link to="/library" class="orbital-link" active-class="is-active">
          <svg class="link-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
            <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
          </svg>
          <span>Archive</span>
          <span v-if="playlistStore.playlists.length" class="link-badge font-mono">
            {{ playlistStore.playlists.length }}
          </span>
        </router-link>

        <router-link to="/search" class="orbital-link" active-class="is-active">
          <svg class="link-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <span>Discovery</span>
          <span class="kbd-hint font-mono">/</span>
        </router-link>
      </div>

      <!-- 3. Actions & Curator Profile Cluster -->
      <div class="orbital-actions">
        <!-- New Collection Button -->
        <button
          class="forge-collection-btn"
          @click="$emit('open-create-modal')"
          title="Create New Playlist Collection"
        >
          <span class="btn-plus">+</span>
          <span class="btn-label desktop-only font-display">Forge Collection</span>
        </button>

        <!-- Live Playing Vinyl Pill (If track is active) -->
        <button
          v-if="playerStore.hasTrack"
          class="live-playback-pill"
          :class="{ 'is-spinning': playerStore.isPlaying }"
          @click="playerStore.toggleExpanded()"
          title="Open Immersion Canvas"
        >
          <div class="mini-turntable">
            <div class="turntable-groove"></div>
            <div class="turntable-label"></div>
          </div>
          <span class="live-pill-text desktop-only font-mono">
            {{ playerStore.isPlaying ? 'RESONATING' : 'IDLE' }}
          </span>
        </button>

        <!-- Curator Profile Dropdown Trigger -->
        <div class="curator-profile-container" ref="dropdownRef">
          <button
            class="curator-badge-btn"
            :class="{ 'is-open': dropdownOpen }"
            @click="dropdownOpen = !dropdownOpen"
            aria-label="User Account Menu"
          >
            <div class="curator-avatar">
              {{ userInitials }}
            </div>
            <span class="curator-name desktop-only font-display">{{ authStore.username || 'Curator' }}</span>
            <svg class="dropdown-chevron desktop-only" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          <!-- Dropdown Overlay -->
          <transition name="sw-drop">
            <div v-if="dropdownOpen" class="curator-dropdown-menu">
              <div class="dropdown-header">
                <span class="dropdown-kicker font-mono">CURATOR SESSION</span>
                <span class="dropdown-username font-display">{{ authStore.username }}</span>
                <span class="dropdown-email font-mono">{{ authStore.user?.email || 'Active Session' }}</span>
              </div>

              <div class="dropdown-divider"></div>

              <div class="dropdown-stats font-mono">
                <div class="stat-item">
                  <span class="stat-num">{{ playlistStore.playlists.length }}</span>
                  <span class="stat-label">Collections</span>
                </div>
                <div class="stat-item">
                  <span class="stat-num">{{ playlistStore.totalTracksCount }}</span>
                  <span class="stat-label">Tracks</span>
                </div>
              </div>

              <div class="dropdown-divider"></div>

              <button class="dropdown-action-btn logout font-mono" @click="handleLogout">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                  <polyline points="16 17 21 12 16 7"></polyline>
                  <line x1="21" y1="12" x2="9" y2="12"></line>
                </svg>
                <span>Terminate Session</span>
              </button>
            </div>
          </transition>
        </div>
      </div>
    </nav>

    <!-- Mobile Floating Island Dock -->
    <nav class="mobile-orbital-dock mobile-only" aria-label="Mobile Navigation">
      <router-link to="/" class="mobile-dock-item" active-class="is-active" exact>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span class="font-mono">Orbit</span>
      </router-link>

      <router-link to="/library" class="mobile-dock-item" active-class="is-active">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
          <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
        </svg>
        <span class="font-mono">Archive</span>
      </router-link>

      <router-link to="/search" class="mobile-dock-item" active-class="is-active">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <span class="font-mono">Discover</span>
      </router-link>

      <button class="mobile-dock-item" @click="$emit('open-create-modal')" title="New Collection">
        <div class="mobile-add-circle">+</div>
        <span class="font-mono">Forge</span>
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
  authStore.logout();
  router.push('/login');
};

const handleGlobalClick = (e) => {
  if (dropdownRef.value && !dropdownRef.value.contains(e.target)) {
    dropdownOpen.value = false;
  }
};

const handleKeyDown = (e) => {
  if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) {
    e.preventDefault();
    router.push('/search');
  }
};

onMounted(() => {
  window.addEventListener('click', handleGlobalClick);
  window.addEventListener('keydown', handleKeyDown);
});

onUnmounted(() => {
  window.removeEventListener('click', handleGlobalClick);
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.sw-orbital-nav-wrapper {
  position: fixed;
  top: 18px;
  left: 0;
  right: 0;
  display: flex;
  justify-content: center;
  padding: 0 24px;
  z-index: 90;
  pointer-events: none;
}

.sw-orbital-capsule {
  pointer-events: auto;
  width: 100%;
  max-width: 1140px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16px 0 20px;
  background: rgba(24, 13, 41, 0.82);
  backdrop-filter: blur(28px) saturate(190%);
  -webkit-backdrop-filter: blur(28px) saturate(190%);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--sw-radius-full);
  box-shadow:
    0 16px 36px -8px rgba(0, 0, 0, 0.75),
    0 0 0 1px rgba(255, 255, 255, 0.05),
    inset 0 1px 1px 0 rgba(255, 255, 255, 0.18);
  transition: all var(--sw-transition-normal);
}

.sw-orbital-capsule:hover {
  border-color: rgba(204, 255, 0, 0.38);
  box-shadow:
    0 20px 44px -8px rgba(0, 0, 0, 0.85),
    0 0 24px -4px rgba(204, 255, 0, 0.25),
    inset 0 1px 1px 0 rgba(255, 255, 255, 0.22);
}

/* 1. Brand Soundmark */
.orbital-brand {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: var(--sw-text-primary);
  user-select: none;
}

.brand-soundmark {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 20px;
  padding: 2px 0;
}

.eq-bar {
  width: 3px;
  height: 8px;
  background: var(--sw-accent);
  border-radius: 2px;
  transition: height 0.2s ease, background 0.3s ease;
}

.bar-1 { height: 10px; }
.bar-2 { height: 16px; }
.bar-3 { height: 12px; }
.bar-4 { height: 18px; }
.bar-5 { height: 8px; }

.brand-soundmark.is-active .eq-bar {
  animation: soundwave-eq 1.2s ease-in-out infinite alternate;
}
.brand-soundmark.is-active .bar-1 { animation-delay: 0.1s; }
.brand-soundmark.is-active .bar-2 { animation-delay: 0.4s; }
.brand-soundmark.is-active .bar-3 { animation-delay: 0.2s; }
.brand-soundmark.is-active .bar-4 { animation-delay: 0.5s; }
.brand-soundmark.is-active .bar-5 { animation-delay: 0.3s; }

@keyframes soundwave-eq {
  0% { height: 6px; }
  50% { height: 20px; background: var(--sw-warm); }
  100% { height: 10px; background: var(--sw-accent); }
}

.brand-text {
  display: flex;
  align-items: center;
  gap: 8px;
}

.brand-title {
  font-size: 15px;
  font-weight: 800;
  letter-spacing: 0.08em;
  color: #fff;
}

.brand-edition {
  font-size: 9px;
  font-weight: 700;
  letter-spacing: 0.16em;
  padding: 2px 7px;
  background: rgba(204, 255, 0, 0.12);
  border: 1px solid rgba(204, 255, 0, 0.35);
  border-radius: var(--sw-radius-full);
  color: var(--sw-accent);
}

/* 2. Primary Navigation Links */
.orbital-links {
  display: flex;
  align-items: center;
  gap: 6px;
  background: rgba(255, 255, 255, 0.04);
  padding: 4px;
  border-radius: var(--sw-radius-full);
  border: 1px solid rgba(255, 255, 255, 0.07);
}

.orbital-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border-radius: var(--sw-radius-full);
  font-size: 13px;
  font-weight: 500;
  color: var(--sw-text-secondary);
  text-decoration: none;
  transition: all var(--sw-transition-fast);
}

.orbital-link:hover {
  color: var(--sw-text-primary);
  background: rgba(255, 255, 255, 0.06);
}

.orbital-link.is-active {
  color: #0e0717;
  background: var(--sw-accent);
  font-weight: 700;
  box-shadow: 0 0 20px rgba(204, 255, 0, 0.4);
}

.link-icon {
  opacity: 0.85;
  transition: transform var(--sw-transition-fast);
}

.orbital-link:hover .link-icon {
  transform: translateY(-1px);
  opacity: 1;
}

.link-badge {
  font-size: 10px;
  padding: 1px 6px;
  background: rgba(0, 0, 0, 0.2);
  border-radius: var(--sw-radius-full);
  color: inherit;
  font-weight: 700;
}

.kbd-hint {
  font-size: 10px;
  padding: 2px 5px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 4px;
  color: var(--sw-text-muted);
}

/* 3. Actions & Profile */
.orbital-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.forge-collection-btn {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px 16px;
  border-radius: var(--sw-radius-full);
  background: linear-gradient(135deg, var(--sw-warm), #e02678);
  color: #fff;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 0 20px rgba(255, 87, 34, 0.35);
  transition: all var(--sw-transition-fast);
}

.forge-collection-btn:hover {
  transform: translateY(-1px) scale(1.02);
  box-shadow: 0 0 28px rgba(255, 87, 34, 0.5);
}

.btn-plus {
  font-size: 15px;
  line-height: 1;
}

.live-playback-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(204, 255, 0, 0.12);
  border: 1px solid rgba(204, 255, 0, 0.35);
  border-radius: var(--sw-radius-full);
  color: var(--sw-accent);
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.live-playback-pill:hover {
  background: rgba(204, 255, 0, 0.22);
  box-shadow: 0 0 16px rgba(204, 255, 0, 0.3);
}

.mini-turntable {
  position: relative;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #111;
  border: 1px solid rgba(255, 255, 255, 0.25);
}

.turntable-groove {
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.2);
}

.turntable-label {
  position: absolute;
  inset: 6px;
  border-radius: 50%;
  background: var(--sw-accent);
}

.live-playback-pill.is-spinning .mini-turntable {
  animation: spin-vinyl 3s linear infinite;
}

@keyframes spin-vinyl {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.live-pill-text {
  font-size: 10px;
  letter-spacing: 0.08em;
  font-weight: 700;
}

/* Curator Profile */
.curator-profile-container {
  position: relative;
}

.curator-badge-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 10px 4px 4px;
  border-radius: var(--sw-radius-full);
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.curator-badge-btn:hover,
.curator-badge-btn.is-open {
  background: rgba(255, 255, 255, 0.09);
  border-color: rgba(255, 255, 255, 0.2);
}

.curator-avatar {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: linear-gradient(135deg, #ccff00, #ff5722);
  color: #0e0717;
  font-size: 11px;
  font-weight: 800;
  display: flex;
  align-items: center;
  justify-content: center;
}

.curator-name {
  font-size: 13px;
  font-weight: 600;
  color: var(--sw-text-primary);
  max-width: 110px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-chevron {
  opacity: 0.6;
  transition: transform var(--sw-transition-fast);
}

.curator-badge-btn.is-open .dropdown-chevron {
  transform: rotate(180deg);
}

/* Dropdown Menu */
.curator-dropdown-menu {
  position: absolute;
  top: calc(100% + 12px);
  right: 0;
  width: 240px;
  background: rgba(24, 13, 41, 0.96);
  backdrop-filter: blur(28px);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: var(--sw-radius-lg);
  padding: 16px;
  box-shadow: 0 20px 45px rgba(0, 0, 0, 0.85);
  z-index: 100;
}

.dropdown-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.dropdown-kicker {
  font-size: 9px;
  letter-spacing: 0.14em;
  color: var(--sw-text-muted);
}

.dropdown-username {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.dropdown-email {
  font-size: 11px;
  color: var(--sw-text-secondary);
  overflow: hidden;
  text-overflow: ellipsis;
}

.dropdown-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.08);
  margin: 12px 0;
}

.dropdown-stats {
  display: flex;
  justify-content: space-around;
  padding: 8px 0;
  background: rgba(255, 255, 255, 0.03);
  border-radius: var(--sw-radius-sm);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 16px;
  font-weight: 800;
  color: var(--sw-accent);
}

.stat-label {
  font-size: 10px;
  color: var(--sw-text-muted);
}

.dropdown-action-btn {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border-radius: var(--sw-radius-sm);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.dropdown-action-btn.logout {
  color: var(--sw-danger);
  background: rgba(255, 51, 102, 0.1);
  border: 1px solid rgba(255, 51, 102, 0.25);
}

.dropdown-action-btn.logout:hover {
  background: rgba(255, 51, 102, 0.2);
  border-color: var(--sw-danger);
}

/* Mobile Floating Bottom Dock */
.mobile-orbital-dock {
  position: fixed;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 32px);
  max-width: 380px;
  height: 60px;
  background: rgba(24, 13, 41, 0.94);
  backdrop-filter: blur(28px);
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: var(--sw-radius-full);
  display: flex;
  align-items: center;
  justify-content: space-around;
  padding: 0 12px;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.85);
  z-index: 89;
  pointer-events: auto;
}

.mobile-dock-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  color: var(--sw-text-secondary);
  font-size: 10px;
  text-decoration: none;
  padding: 6px 12px;
  border-radius: var(--sw-radius-md);
  transition: all var(--sw-transition-fast);
}

.mobile-dock-item.is-active {
  color: var(--sw-accent);
}

.mobile-add-circle {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: var(--sw-accent);
  color: #0e0717;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 15px;
  font-weight: 800;
}

.mobile-only {
  display: none;
}

@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }
  .mobile-only {
    display: flex !important;
  }
  .sw-orbital-nav-wrapper {
    top: 12px;
    padding: 0 12px;
  }
  .sw-orbital-capsule {
    height: 52px;
    padding: 0 12px;
  }
}

.sw-drop-enter-active,
.sw-drop-leave-active {
  transition: all 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}
.sw-drop-enter-from,
.sw-drop-leave-to {
  opacity: 0;
  transform: translateY(-8px) scale(0.96);
}
</style>
