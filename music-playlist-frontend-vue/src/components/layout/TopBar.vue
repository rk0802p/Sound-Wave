<template>
  <header class="topbar-wrapper">
    <div class="topbar-left">
      <button class="menu-toggle-btn" @click="$emit('toggle-sidebar')" title="Toggle Menu">
        <span></span><span></span><span></span>
      </button>

      <!-- Global Search Bar -->
      <div class="search-box">
        <svg class="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          v-model="playlistStore.searchQuery"
          type="text"
          placeholder="Search playlists or songs..."
          class="search-input"
        />
        <button
          v-if="playlistStore.searchQuery"
          class="clear-search-btn"
          @click="playlistStore.searchQuery = ''"
        >
          ✕
        </button>
      </div>
    </div>

    <div class="topbar-right">
      <div class="user-pill">
        <span class="user-greeting">Hi, {{ authStore.username }}</span>
      </div>
    </div>
  </header>
</template>

<script setup>
import { useAuthStore } from '../../stores/auth';
import { usePlaylistStore } from '../../stores/playlist';

defineEmits(['toggle-sidebar']);

const authStore = useAuthStore();
const playlistStore = usePlaylistStore();
</script>

<style scoped>
.topbar-wrapper {
  height: 72px;
  padding: 0 32px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: rgba(10, 11, 16, 0.7);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.05);
  position: sticky;
  top: 0;
  z-index: 50;
}

.topbar-left {
  display: flex;
  align-items: center;
  gap: 16px;
  flex: 1;
  max-width: 480px;
}

.menu-toggle-btn {
  display: none;
  background: transparent;
  border: none;
  flex-direction: column;
  gap: 4px;
  cursor: pointer;
  padding: 8px;
}

.menu-toggle-btn span {
  width: 20px;
  height: 2px;
  background: #fff;
  border-radius: 2px;
}

.search-box {
  position: relative;
  width: 100%;
  display: flex;
  align-items: center;
}

.search-icon {
  position: absolute;
  left: 14px;
  color: #6b7280;
  pointer-events: none;
}

.search-input {
  width: 100%;
  height: 40px;
  padding: 0 36px 0 42px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 20px;
  color: #fff;
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.search-input:focus {
  outline: none;
  background: rgba(255, 255, 255, 0.08);
  border-color: rgba(99, 102, 241, 0.5);
  box-shadow: 0 0 15px rgba(99, 102, 241, 0.2);
}

.search-input::placeholder {
  color: #6b7280;
}

.clear-search-btn {
  position: absolute;
  right: 12px;
  background: transparent;
  border: none;
  color: #6b7280;
  cursor: pointer;
  font-size: 0.85rem;
}

.clear-search-btn:hover {
  color: #fff;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user-pill {
  padding: 6px 14px;
  border-radius: 20px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.06);
  font-size: 0.85rem;
  color: #d1d5db;
  font-weight: 500;
}

@media (max-width: 900px) {
  .topbar-wrapper {
    padding: 0 16px;
  }
  .menu-toggle-btn {
    display: flex;
  }
  .user-greeting {
    display: none;
  }
}
</style>
