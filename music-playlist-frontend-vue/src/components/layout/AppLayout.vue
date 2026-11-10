<template>
  <div class="soundwave-app">
    <slot></slot>
    <ToastContainer />
    <KeyboardShortcutsModal
      :isOpen="showShortcutsModal"
      @close="showShortcutsModal = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { usePlayerStore } from '../../stores/player';
import ToastContainer from '../common/ToastContainer.vue';
import KeyboardShortcutsModal from '../common/KeyboardShortcutsModal.vue';

const playerStore = usePlayerStore();
const showShortcutsModal = ref(false);

const isInputElement = (el) => {
  if (!el) return false;
  const tag = el.tagName ? el.tagName.toLowerCase() : '';
  return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
};

const handleKeyDown = (e) => {
  // If typing inside form controls, don't trigger media shortcuts
  if (isInputElement(e.target) || isInputElement(document.activeElement)) {
    return;
  }

  // Never hijack browser modifier combinations (Ctrl, Alt, Meta/Cmd)
  // e.g. Ctrl+R (reload), Ctrl+S (save), Alt+Left (browser back), Cmd+R
  if (e.ctrlKey || e.metaKey || e.altKey) {
    return;
  }

  // Escape -> close shortcuts modal if open
  if (e.key === 'Escape' && showShortcutsModal.value) {
    e.preventDefault();
    showShortcutsModal.value = false;
    return;
  }

  // Space -> Play/Pause (ignore key repeat; let buttons handle Space natively)
  if (e.code === 'Space' || e.key === ' ') {
    const targetTag = (e.target?.tagName || '').toLowerCase();
    if (targetTag === 'button') {
      return;
    }
    if (e.repeat) return;
    e.preventDefault();
    playerStore.togglePlay();
    return;
  }

  // Left Arrow -> Seek back 5s
  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    playerStore.seek(Math.max(0, playerStore.currentTime - 5));
    return;
  }

  // Right Arrow -> Seek forward 5s
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    playerStore.seek(Math.min(playerStore.duration || 9999, playerStore.currentTime + 5));
    return;
  }

  // Up Arrow -> Volume up 5%
  if (e.key === 'ArrowUp') {
    e.preventDefault();
    playerStore.setVolume(Math.min(1, playerStore.volume + 0.05));
    return;
  }

  // Down Arrow -> Volume down 5%
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    playerStore.setVolume(Math.max(0, playerStore.volume - 0.05));
    return;
  }

  // 'M' or 'm' -> Mute / Unmute
  if (e.key === 'm' || e.key === 'M') {
    if (e.repeat) return;
    e.preventDefault();
    playerStore.setMuted(!playerStore.muted);
    return;
  }

  // 'S' or 's' -> Toggle Shuffle
  if (e.key === 's' || e.key === 'S') {
    if (e.repeat) return;
    e.preventDefault();
    playerStore.toggleShuffle();
    return;
  }

  // 'R' or 'r' -> Cycle Repeat
  if (e.key === 'r' || e.key === 'R') {
    if (e.repeat) return;
    e.preventDefault();
    playerStore.cycleRepeat();
    return;
  }

  // '?' or Shift+'/' -> Open Keyboard Shortcuts Guide
  if (e.key === '?' || (e.shiftKey && e.key === '/')) {
    if (e.repeat) return;
    e.preventDefault();
    showShortcutsModal.value = !showShortcutsModal.value;
    return;
  }
};

onMounted(() => {
  window.addEventListener('keydown', handleKeyDown);
  if (typeof window !== 'undefined') {
    window._soundwaveOpenShortcutsModal = () => {
      showShortcutsModal.value = true;
    };
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
});
</script>

<style scoped>
.soundwave-app {
  min-height: 100vh;
  width: 100%;
  position: relative;
}
</style>
