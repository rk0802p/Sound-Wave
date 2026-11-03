<template>
  <aside class="sidebar-wrapper" :class="{ 'mobile-open': isOpen }">
    <div class="sidebar-header">
      <router-link to="/" class="brand-logo">
        <div class="logo-icon">
          <span></span><span></span><span></span><span></span>
        </div>
        <span class="brand-name">SOUNDWAVE</span>
      </router-link>
      <button class="mobile-close-btn" @click="$emit('close')">✕</button>
    </div>

    <!-- Main Navigation -->
    <nav class="sidebar-nav">
      <router-link to="/" class="nav-item" active-class="active" exact>
        <span class="nav-icon">🏠</span>
        <span class="nav-label">Library</span>
      </router-link>
      <button class="nav-item create-nav-btn" @click="$emit('open-create-modal')">
        <span class="nav-icon add-icon">+</span>
        <span class="nav-label">Create Playlist</span>
      </button>
    </nav>

    <div class="nav-divider"></div>

    <!-- Playlists Quick Navigation -->
    <div class="sidebar-playlists-section">
      <div class="section-heading">
        <span>YOUR PLAYLISTS</span>
        <span class="playlist-count-badge">{{ playlistStore.playlists.length }}</span>
      </div>

      <div v-if="playlistStore.isLoading && !playlistStore.playlists.length" class="playlist-loading">
        Loading vibes...
      </div>

      <ul v-else class="playlist-quick-list">
        <li
          v-for="pl in playlistStore.playlists"
          :key="pl._id"
          class="playlist-quick-item"
          :class="{ active: currentRouteId === pl._id }"
        >
          <router-link :to="`/playlists/${pl._id}`" class="playlist-link" @click="$emit('close')">
            <span class="playlist-dot"></span>
            <span class="playlist-title" :title="pl.name">{{ pl.name }}</span>
            <span class="playlist-tracks">{{ pl.songs?.length || 0 }}</span>
          </router-link>
        </li>
      </ul>
    </div>

    <!-- Bottom User Profile Card -->
    <div class="sidebar-footer">
      <div class="user-chip">
        <div class="user-avatar">
          {{ userInitials }}
        </div>
        <div class="user-details">
          <div class="user-name" :title="authStore.username">{{ authStore.username }}</div>
          <div class="user-role">Free Member</div>
        </div>
        <button class="logout-icon-btn" @click="handleLogout" title="Logout">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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

defineEmits(['close', 'open-create-modal']);

const route = useRoute();
const router = useRouter();
const authStore = useAuthStore();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();

const currentRouteId = computed(() => route.params.id);

const userInitials = computed(() => {
  const name = authStore.username || 'U';
  return name.substring(0, 2).toUpperCase();
});

const handleLogout = () => {
  playerStore.cleanup();
  authStore.logout();
  router.push('/login');
};
</script>

<style scoped>
.sidebar-wrapper {
  width: 260px;
  height: 100vh;
  background: #0d0e16;
  border-right: 1px solid rgba(255, 255, 255, 0.06);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  z-index: 100;
  color: #fff;
  transition: transform 0.3s ease;
}

.sidebar-header {
  height: 72px;
  padding: 0 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 12px;
  text-decoration: none;
  color: #fff;
}

.logo-icon {
  display: flex;
  align-items: center;
  gap: 3px;
  height: 22px;
}

.logo-icon span {
  width: 3px;
  background: #6366f1;
  border-radius: 2px;
  animation: logoWave 1.2s infinite ease-in-out alternate;
}

.logo-icon span:nth-child(1) { height: 12px; animation-delay: 0.1s; }
.logo-icon span:nth-child(2) { height: 22px; animation-delay: 0.3s; }
.logo-icon span:nth-child(3) { height: 16px; animation-delay: 0.2s; }
.logo-icon span:nth-child(4) { height: 10px; animation-delay: 0.4s; }

@keyframes logoWave {
  from { transform: scaleY(0.6); }
  to { transform: scaleY(1.1); }
}

.brand-name {
  font-size: 1.15rem;
  font-weight: 800;
  letter-spacing: 1px;
  background: linear-gradient(135deg, #fff, #a5b4fc);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
}

.mobile-close-btn {
  display: none;
  background: transparent;
  border: none;
  color: #9ca3af;
  font-size: 1.3rem;
  cursor: pointer;
}

.sidebar-nav {
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.nav-item {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 10px 14px;
  border-radius: 10px;
  color: #9ca3af;
  text-decoration: none;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.2s ease;
  background: transparent;
  border: none;
  cursor: pointer;
  width: 100%;
  text-align: left;
}

.nav-item:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.05);
}

.nav-item.active {
  color: #fff;
  background: rgba(99, 102, 241, 0.15);
  font-weight: 600;
}

.add-icon {
  font-size: 1.2rem;
  font-weight: bold;
  color: #6366f1;
}

.nav-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.06);
  margin: 8px 16px;
}

.sidebar-playlists-section {
  flex: 1;
  padding: 12px 16px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 0.72rem;
  letter-spacing: 1px;
  font-weight: 700;
  color: #6b7280;
  margin-bottom: 12px;
  padding: 0 8px;
}

.playlist-count-badge {
  background: rgba(255, 255, 255, 0.08);
  color: #9ca3af;
  padding: 2px 6px;
  border-radius: 10px;
  font-size: 0.7rem;
}

.playlist-loading {
  font-size: 0.85rem;
  color: #6b7280;
  padding: 12px 8px;
  font-style: italic;
}

.playlist-quick-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.playlist-quick-item {
  border-radius: 8px;
  transition: background 0.2s;
}

.playlist-quick-item:hover {
  background: rgba(255, 255, 255, 0.04);
}

.playlist-quick-item.active {
  background: rgba(99, 102, 241, 0.12);
}

.playlist-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 10px;
  text-decoration: none;
  color: #9ca3af;
  font-size: 0.88rem;
}

.playlist-quick-item.active .playlist-link {
  color: #fff;
  font-weight: 600;
}

.playlist-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4b5563;
  flex-shrink: 0;
}

.playlist-quick-item.active .playlist-dot {
  background: #6366f1;
  box-shadow: 0 0 8px #6366f1;
}

.playlist-title {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.playlist-tracks {
  font-size: 0.75rem;
  color: #6b7280;
}

.sidebar-footer {
  padding: 16px;
  padding-bottom: 100px; /* Space above persistent audio player */
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}

.user-chip {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 10px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.user-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: linear-gradient(135deg, #6366f1, #8b5cf6);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
}

.user-details {
  flex: 1;
  min-width: 0;
}

.user-name {
  font-size: 0.88rem;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-role {
  font-size: 0.72rem;
  color: #6b7280;
}

.logout-icon-btn {
  background: transparent;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 6px;
  border-radius: 6px;
  transition: all 0.2s;
  display: flex;
  align-items: center;
}

.logout-icon-btn:hover {
  color: #f87171;
  background: rgba(248, 113, 113, 0.1);
}

@media (max-width: 900px) {
  .sidebar-wrapper {
    transform: translateX(-100%);
  }
  .sidebar-wrapper.mobile-open {
    transform: translateX(0);
  }
  .mobile-close-btn {
    display: block;
  }
}
</style>
