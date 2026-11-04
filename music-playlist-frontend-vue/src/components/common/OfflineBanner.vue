<template>
  <transition name="slide-fade">
    <div
      v-if="!isOnline"
      class="offline-banner font-mono"
      role="status"
      aria-live="polite"
    >
      <div class="banner-content">
        <span class="offline-icon">📡</span>
        <span class="offline-text">
          <strong>OFFLINE MODE</strong> — Displaying cached metadata. Remote audio streaming requires internet.
        </span>
      </div>
      <button class="dismiss-btn" @click="isDismissed = true" aria-label="Dismiss banner">✕</button>
    </div>

    <div
      v-else-if="showBackOnlineNotice"
      class="online-restored-banner font-mono"
      role="status"
      aria-live="polite"
    >
      <div class="banner-content">
        <span class="online-icon">⚡</span>
        <span class="online-text">
          <strong>BACK ONLINE</strong> — Multi-source streams & catalog search reconnected.
        </span>
      </div>
    </div>
  </transition>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue';

const isOnline = ref(typeof navigator !== 'undefined' ? navigator.onLine : true);
const isDismissed = ref(false);
const showBackOnlineNotice = ref(false);

let onlineNoticeTimer = null;

const handleOnline = () => {
  isOnline.value = true;
  isDismissed.value = false;
  showBackOnlineNotice.value = true;
  clearTimeout(onlineNoticeTimer);
  onlineNoticeTimer = setTimeout(() => {
    showBackOnlineNotice.value = false;
  }, 4000);
};

const handleOffline = () => {
  isOnline.value = false;
  isDismissed.value = false;
  showBackOnlineNotice.value = false;
};

onMounted(() => {
  if (typeof window !== 'undefined') {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
  }
});

onBeforeUnmount(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener('online', handleOnline);
    window.removeEventListener('offline', handleOffline);
  }
  clearTimeout(onlineNoticeTimer);
});
</script>

<style scoped>
.offline-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background: rgba(255, 0, 127, 0.95);
  color: #fff;
  padding: 0.5rem 1.5rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
}

.online-restored-banner {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  z-index: 9999;
  background: rgba(0, 242, 254, 0.95);
  color: #0b0c10;
  padding: 0.5rem 1.5rem;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 0.8rem;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(8px);
  animation: pulse 0.5s ease;
}

.banner-content {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  justify-content: center;
  flex: 1;
}

.offline-icon, .online-icon {
  font-size: 1rem;
}

.dismiss-btn {
  background: none;
  border: none;
  color: #fff;
  font-size: 1rem;
  cursor: pointer;
  padding: 0.2rem 0.5rem;
  opacity: 0.8;
}

.dismiss-btn:hover {
  opacity: 1;
}

.slide-fade-enter-active,
.slide-fade-leave-active {
  transition: all 0.3s ease-out;
}

.slide-fade-enter-from,
.slide-fade-leave-to {
  transform: translateY(-100%);
  opacity: 0;
}
</style>
