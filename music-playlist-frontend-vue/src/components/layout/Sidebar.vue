<template>
  <div>
    <!-- Mobile Drawer Backdrop -->
    <div
      v-if="isOpen"
      class="mobile-backdrop"
      @click="$emit('close')"
    ></div>

    <aside class="sw-sidebar" :class="{ 'is-mobile-open': isOpen }">
      <!-- Brand Header -->
      <div class="sidebar-header">
        <router-link to="/" class="brand-link" @click="$emit('close')">
          <div class="brand-sound-mark">
            <span></span><span></span><span></span><span></span><span></span>
          </div>
          <div class="brand-text-lockup">
            <span class="brand-name font-display">SOUNDWAVE</span>
            <span class="brand-badge">ATELIER</span>
          </div>
        </router-link>
        <button class="mobile-close-btn" @click="$emit('close')" aria-label="Close Navigation">✕</button>
      </div>

      <!-- Main Navigation Rail -->
      <div class="nav-section">
        <div class="section-label">STUDIO SPACES</div>
        <nav class="sidebar-nav">
          <router-link to="/" class="nav-item" active-class="active" exact @click="$emit('close')">
            <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span class="nav-title">Home</span>
          </router-link>

          <router-link to="/library" class="nav-item" active-class="active" @click="$emit('close')">
            <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"></path>
              <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"></path>
            </svg>
            <span class="nav-title">Library</span>
          </router-link>

          <router-link to="/search" class="nav-item" active-class="active" @click="$emit('close')">
            <svg class="nav-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <circle cx="11" cy="11" r="8"></circle>
              <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
            </svg>
            <span class="nav-title">Search & Discovery</span>
          </router-link>

          <button class="nav-item create-action-item" @click="handleOpenCreate">
            <span class="plus-symbol">+</span>
            <span class="nav-title">Create Playlist</span>
          </button>
        </nav>
      </div>

      <!-- Playlists Quick Navigation Section -->
      <div class="playlists-section">
        <div class="playlists-header">
          <span class="section-label">YOUR ARCHIVES</span>
          <span class="playlist-count tabular-nums">{{ playlistStore.playlists.length }}</span>
        </div>

        <div v-if="playlistStore.isLoading && !playlistStore.playlists.length" class="playlist-skeleton">
          <div v-for="i in 5" :key="i" class="skeleton-line"></div>
        </div>

        <ul v-else class="playlist-scroll-list">
          <li
            v-for="pl in playlistStore.playlists"
            :key="pl._id"
            class="playlist-list-item"
          >
            <router-link
              :to="`/playlists/${pl._id}`"
              class="playlist-quick-link"
              :class="{
                active: currentRouteId === pl._id,
                'is-playing-source': playerStore.isPlaying && playerStore.currentPlaylistId === pl._id
              }"
              @click="$emit('close')"
            >
              <!-- Playing Equalizer in sidebar if current playlist is playing -->
              <div v-if="playerStore.isPlaying && playerStore.currentPlaylistId === pl._id" class="sidebar-mini-eq">
                <span></span><span></span><span></span>
              </div>
              <span v-else class="active-dot"></span>

              <span class="playlist-name-text" :title="pl.name">{{ pl.name }}</span>
              <span class="track-tally tabular-nums">{{ pl.songs?.length || 0 }}</span>
            </router-link>
          </li>
        </ul>
      </div>

      <!-- User Profile Workspace Footer -->
      <div class="sidebar-user-footer">
        <div class="user-profile-card">
          <div class="user-avatar-badge">{{ userInitials }}</div>
          <div class="user-text-meta">
            <div class="user-display-name" :title="authStore.username">{{ authStore.username || 'Listener' }}</div>
            <div class="user-membership-label">Personal Workstation</div>
          </div>
          <button class="logout-btn" @click="handleLogout" title="Sign out" aria-label="Sign Out">
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
            </svg>
          </button>
        </div>
      </div>
    </aside>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '../../stores/auth';
import { usePlaylistStore } from '../../stores/playlist';
import { usePlayerStore } from '../../stores/player';

defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
});

const emit = defineEmits(['close', 'open-create-modal']);

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();

const currentRouteId = computed(() => route.params.id);

const userInitials = computed(() => {
  const name = authStore.username || 'SW';
  return name.substring(0, 2).toUpperCase();
});

const handleOpenCreate = () => {
  emit('close');
  emit('open-create-modal');
};

const handleLogout = () => {
  emit('close');
  playerStore.resetPlayer();
  authStore.logout();
  router.push('/login');
};
</script>

<style scoped>
.sw-sidebar {
  width: var(--sw-sidebar-width);
  height: 100vh;
  background: var(--sw-sidebar);
  border-right: 1px solid var(--sw-border);
  display: flex;
  flex-direction: column;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
  color: var(--sw-text-primary);
  transition: transform var(--sw-transition-normal);
}

.mobile-backdrop {
  display: none;
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.7);
  backdrop-filter: blur(4px);
  z-index: 99;
}

.sidebar-header {
  height: var(--sw-topbar-height);
  padding: 0 20px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--sw-border-subtle);
}

.brand-link {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: var(--sw-text-primary);
}

/* Kinetic Soundwave Logo */
.brand-sound-mark {
  display: flex;
  align-items: center;
  gap: 2.5px;
  height: 20px;
}

.brand-sound-mark span {
  width: 3px;
  background: var(--sw-accent);
  border-radius: 2px;
  transition: height 200ms ease;
  animation: markWave 1.4s infinite ease-in-out alternate;
}

.brand-sound-mark span:nth-child(1) { height: 6px; animation-delay: 0.1s; }
.brand-sound-mark span:nth-child(2) { height: 16px; animation-delay: 0.3s; }
.brand-sound-mark span:nth-child(3) { height: 10px; animation-delay: 0.15s; }
.brand-sound-mark span:nth-child(4) { height: 20px; animation-delay: 0.4s; }
.brand-sound-mark span:nth-child(5) { height: 8px; animation-delay: 0.25s; }

.brand-link:hover .brand-sound-mark span {
  background: var(--sw-warm);
}

@keyframes markWave {
  0% { transform: scaleY(0.4); }
  100% { transform: scaleY(1.1); }
}

.brand-text-lockup {
  display: flex;
  flex-direction: column;
}

.brand-name {
  font-size: 0.98rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  color: var(--sw-text-primary);
}

.brand-badge {
  font-family: var(--sw-font-mono);
  font-size: 0.58rem;
  font-weight: 600;
  color: var(--sw-accent);
  letter-spacing: 0.14em;
}

.mobile-close-btn {
  display: none;
  color: var(--sw-text-secondary);
  font-size: 1.2rem;
  cursor: pointer;
}

.section-label {
  font-family: var(--sw-font-mono);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.1em;
  color: var(--sw-text-muted);
  padding: 0 8px;
  margin-bottom: 6px;
}

.nav-section {
  padding: 18px 14px 10px 14px;
  display: flex;
  flex-direction: column;
}

.sidebar-nav {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border-radius: var(--sw-radius-md);
  color: var(--sw-text-secondary);
  font-size: 0.88rem;
  font-weight: 500;
  transition: all var(--sw-transition-fast);
  cursor: pointer;
  width: 100%;
}

.nav-item:hover {
  color: var(--sw-text-primary);
  background: var(--sw-surface-hover);
}

.nav-item.active {
  color: var(--sw-accent);
  background: rgba(56, 189, 248, 0.08);
  font-weight: 600;
}

.create-action-item {
  margin-top: 6px;
  border: 1px dashed var(--sw-border);
  color: var(--sw-accent);
  background: rgba(56, 189, 248, 0.04);
}

.create-action-item:hover {
  background: rgba(56, 189, 248, 0.1);
  border-color: var(--sw-accent);
  color: #fff;
}

.plus-symbol {
  font-size: 1.1rem;
  font-weight: 700;
  line-height: 1;
}

/* Playlists Quick Section */
.playlists-section {
  flex: 1;
  padding: 16px 14px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border-top: 1px solid var(--sw-border-subtle);
}

.playlists-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
  padding: 0 8px;
}

.playlist-count {
  font-size: 0.72rem;
  color: var(--sw-text-muted);
  background: var(--sw-surface);
  padding: 1px 7px;
  border-radius: var(--sw-radius-full);
}

.playlist-scroll-list {
  list-style: none;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-right: 4px;
}

.playlist-quick-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--sw-radius-sm);
  color: var(--sw-text-secondary);
  font-size: 0.84rem;
  transition: all var(--sw-transition-fast);
}

.playlist-quick-link:hover {
  color: var(--sw-text-primary);
  background: var(--sw-surface-hover);
}

.playlist-quick-link.active {
  color: var(--sw-accent);
  background: rgba(56, 189, 248, 0.08);
  font-weight: 600;
}

.active-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--sw-text-muted);
  flex-shrink: 0;
  transition: all var(--sw-transition-fast);
}

.playlist-quick-link.active .active-dot {
  background: var(--sw-accent);
  box-shadow: 0 0 6px var(--sw-accent);
}

.playlist-name-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-tally {
  font-size: 0.72rem;
  color: var(--sw-text-muted);
}

/* Sidebar Mini Equalizer for playing source */
.sidebar-mini-eq {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 10px;
  flex-shrink: 0;
}

.sidebar-mini-eq span {
  width: 2px;
  background: var(--sw-accent);
  border-radius: 1px;
  animation: eqBounce 0.8s ease-in-out infinite alternate;
}

.sidebar-mini-eq span:nth-child(1) { height: 40%; animation-delay: 0.1s; }
.sidebar-mini-eq span:nth-child(2) { height: 95%; animation-delay: 0.3s; }
.sidebar-mini-eq span:nth-child(3) { height: 60%; animation-delay: 0.2s; }

@keyframes eqBounce {
  0% { height: 25%; }
  100% { height: 100%; }
}

/* User Profile Footer */
.sidebar-user-footer {
  padding: 14px;
  border-top: 1px solid var(--sw-border-subtle);
  background: rgba(10, 12, 16, 0.4);
}

.user-profile-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  border-radius: var(--sw-radius-md);
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
}

.user-avatar-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--sw-accent), #2563eb);
  color: #fff;
  font-size: 0.78rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.user-text-meta {
  flex: 1;
  overflow: hidden;
}

.user-display-name {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--sw-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-membership-label {
  font-family: var(--sw-font-mono);
  font-size: 0.65rem;
  color: var(--sw-text-muted);
}

.logout-btn {
  color: var(--sw-text-muted);
  padding: 6px;
  border-radius: var(--sw-radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--sw-transition-fast);
}

.logout-btn:hover {
  color: var(--sw-danger);
  background: rgba(244, 63, 94, 0.12);
}

.playlist-skeleton {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
}

.skeleton-line {
  height: 24px;
  border-radius: 4px;
  background: linear-gradient(90deg, rgba(255, 255, 255, 0.02), rgba(255, 255, 255, 0.06), rgba(255, 255, 255, 0.02));
  background-size: 200% 100%;
  animation: swShimmer 1.8s infinite;
}

@keyframes swShimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}

@media (max-width: 900px) {
  .sw-sidebar {
    transform: translateX(-100%);
  }
  .sw-sidebar.is-mobile-open {
    transform: translateX(0);
  }
  .mobile-backdrop {
    display: block;
  }
  .mobile-close-btn {
    display: block;
  }
}
</style>
