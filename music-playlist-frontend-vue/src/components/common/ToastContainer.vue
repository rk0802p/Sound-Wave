<template>
  <div class="toast-container" aria-live="polite">
    <transition-group name="toast-anim" tag="div" class="toast-list">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="toast-item"
        :class="`toast-${toast.type}`"
        @click="toastStore.remove(toast.id)"
      >
        <span class="toast-icon">
          <span v-if="toast.type === 'success'">✓</span>
          <span v-else-if="toast.type === 'error'">✕</span>
          <span v-else-if="toast.type === 'warning'">⚠️</span>
          <span v-else>ℹ</span>
        </span>
        <span class="toast-message">{{ toast.message }}</span>
      </div>
    </transition-group>
  </div>
</template>

<script setup>
import { useToastStore } from '../../stores/toast';

const toastStore = useToastStore();
</script>

<style scoped>
.toast-container {
  position: fixed;
  bottom: 100px;
  right: 24px;
  z-index: 9999;
  pointer-events: none;
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.toast-item {
  pointer-events: auto;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 500;
  box-shadow: 0 10px 25px rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: all 0.2s ease;
}

.toast-item:hover {
  transform: translateY(-2px);
}

.toast-success {
  background: rgba(16, 36, 25, 0.95);
  color: #34d399;
  border-color: rgba(52, 211, 153, 0.3);
}

.toast-error {
  background: rgba(40, 16, 22, 0.95);
  color: #f87171;
  border-color: rgba(248, 113, 113, 0.3);
}

.toast-warning {
  background: rgba(40, 32, 16, 0.95);
  color: #fbbf24;
  border-color: rgba(251, 191, 36, 0.3);
}

.toast-info {
  background: rgba(20, 22, 36, 0.95);
  color: #818cf8;
  border-color: rgba(129, 140, 248, 0.3);
}

.toast-icon {
  font-size: 1.1rem;
  font-weight: bold;
}

.toast-anim-enter-active,
.toast-anim-leave-active {
  transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

.toast-anim-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.95);
}

.toast-anim-leave-to {
  opacity: 0;
  transform: translateX(30px);
}
</style>
