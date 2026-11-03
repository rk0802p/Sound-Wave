<template>
  <aside class="sw-sidebar" :class="{ 'is-mobile-open': isOpen }">
    <!-- Brand Header -->
    <div class="sidebar-header">
      <router-link to="/" class="brand-link" @click="$emit('close')">
        <div class="brand-wave">
          <span></span><span></span><span></span><span></span>
        </div>
        <span class="brand-name">SOUNDWAVE</span>
      </router-link>
      <button class="mobile-close-btn" @click="$emit('close')">✕</button>
    </div>

    <!-- Main Navigation Section -->
    <div class="nav-section">
      <div class="section-label">YOUR SPACE</div>
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
          <span class="nav-title">Search</span>
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
        <span class="section-label">PLAYLISTS</span>
        <span class="playlist-count">{{ playlistStore.playlists.length }}</span>
      </div>

      <div v-if="playlistStore.isLoading && !playlistStore.playlists.length" class="playlist-skeleton">
        <div v-for="i in 4" :key="i" class="skeleton-line"></div>
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
            :class="{ active: currentRouteId === pl._id }"
            @click="$emit('close')"
          >
            <span class="active-dot"></span>
            <span class="playlist-name-text" :title="pl.name">{{ pl.name }}</span>
            <span class="track-tally">{{ pl.songs?.length || 0 }}</span>
          </router-link>
        </li>
      </ul>
    </div>

    <!-- User Profile Footer -->
    <div class="sidebar-user-footer">
      <div class="user-profile-card">
        <div class="user-avatar-badge">{{ userInitials }}</div>
        <div class="user-text-meta">
          <div class="user-display-name" :title="authStore.username">{{ authStore.username || 'User' }}</div>
          <div class="user-membership-label">Personal Workstation</div>
        </div>
        <button class="logout-btn" @click="handleLogout" title="Sign out">
          <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>
          </svg>
        </button>
      </div>
    </div>
  </aside>
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
  gap: 10px;
  text-decoration: none;
  color: var(--sw-text-primary);
}

.brand-wave {
  display: flex;
  align-items: center;
  gap: 2.5px;
  height: 18px;
}

.brand-wave span {
  width: 2.5px;
  background: var(--sw-accent);
  border-radius: 1px;
  animation: logoPulse 1.2s infinite ease-in-out alternate;
}

.brand-wave span:nth-child(1) { height: 8px; animation-delay: 0.1s; }
.brand-wave span:nth-child(2) { height: 18px; animation-delay: 0.3s; }
.brand-wave span:nth-child(3) { height: 12px; animation-delay: 0.2s; }
.brand-wave span:nth-child(4) { height: 15px; animation-delay: 0.4s; }

@keyframes logoPulse {
  0% { transform: scaleY(0.4); }
  100% { transform: scaleY(1); }
}

.brand-name {
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 1.2px;
  color: var(--sw-text-primary);
}

.mobile-close-btn {
  display: none;
  background: transparent;
  border: none;
  color: var(--sw-text-secondary);
  font-size: 1.2rem;
  cursor: pointer;
}

.section-label {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--sw-text-muted);
  padding: 0 8px;
  margin-bottom: 6px;
}

.nav-section {
  padding: 16px 14px 10px 14px;
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
  padding: 8px 12px;
  border-radius: var(--sw-radius-sm);
  color: var(--sw-text-secondary);
  text-decoration: none;
  font-size: 0.88rem;
  font-weight: 500;
  transition: all var(--sw-transition-fast);
  background: transparent;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
}

.nav-item:hover {
  background: var(--sw-surface-hover);
  color: var(--sw-text-primary);
}

.nav-item.active {
  background: var(--sw-accent-soft);
  color: var(--sw-accent-muted);
  font-weight: 600;
}

.nav-icon {
  flex-shrink: 0;
  opacity: 0.8;
}

.nav-item.active .nav-icon {
  opacity: 1;
  color: var(--sw-accent);
}

.create-action-item {
  margin-top: 4px;
  color: var(--sw-text-primary);
}

.plus-symbol {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  font-weight: 700;
  color: var(--sw-accent);
}

.playlists-section {
  flex: 1;
  padding: 14px 14px 10px 14px;
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
}

.playlist-count {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--sw-text-muted);
  padding: 0 8px;
}

.playlist-scroll-list {
  list-style: none;
  overflow-y: auto;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin: 0;
  padding: 0;
}

.playlist-quick-link {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border-radius: var(--sw-radius-sm);
  color: var(--sw-text-secondary);
  font-size: 0.84rem;
  transition: all var(--sw-transition-fast);
  text-decoration: none;
}

.playlist-quick-link:hover {
  background: var(--sw-surface-hover);
  color: var(--sw-text-primary);
}

.playlist-quick-link.active {
  background: var(--sw-surface-active);
  color: var(--sw-accent-muted);
  font-weight: 600;
}

.active-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: transparent;
  flex-shrink: 0;
}

.playlist-quick-link.active .active-dot {
  background: var(--sw-accent);
}

.playlist-name-text {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-tally {
  font-size: 0.75rem;
  color: var(--sw-text-muted);
}

.playlist-skeleton {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 8px;
}

.skeleton-line {
  height: 14px;
  background: var(--sw-surface-hover);
  border-radius: 4px;
  animation: pulse 1.4s infinite;
}

@keyframes pulse {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 0.8; }
}

.sidebar-user-footer {
  padding: 14px;
  border-top: 1px solid var(--sw-border-subtle);
  background: var(--sw-sidebar);
}

.user-profile-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border-subtle);
  border-radius: var(--sw-radius-sm);
}

.user-avatar-badge {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--sw-accent-soft);
  color: var(--sw-accent-muted);
  font-size: 0.75rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 1px solid var(--sw-border);
}

.user-text-meta {
  flex: 1;
  min-width: 0;
}

.user-display-name {
  font-size: 0.85rem;
  font-weight: 600;
  color: var(--sw-text-primary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-membership-label {
  font-size: 0.72rem;
  color: var(--sw-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.logout-btn {
  background: transparent;
  border: none;
  color: var(--sw-text-muted);
  cursor: pointer;
  padding: 6px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--sw-transition-fast);
}

.logout-btn:hover {
  background: rgba(237, 116, 125, 0.15);
  color: var(--sw-danger);
}

@media (max-width: 900px) {
  .sw-sidebar {
    transform: translateX(-100%);
  }
  .sw-sidebar.is-mobile-open {
    transform: translateX(0);
  }
  .mobile-close-btn {
    display: block;
  }
}
</style>
