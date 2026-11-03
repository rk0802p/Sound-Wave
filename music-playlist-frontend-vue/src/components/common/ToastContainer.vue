<template>
  <div class="toast-container" aria-live="polite">
    <transition-group name="toast-anim" tag="div" class="toast-list">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="toast-item glass"
        :class="`toast-${toast.type}`"
        @click="toastStore.remove(toast.id)"
      >
        <span class="toast-icon">
          <span v-if="toast.type === 'success'">✓</span>
          <span v-else-if="toast.type === 'error'">✕</span>
          <span v-else-if="toast.type === 'warning'">!</span>
          <span v-else>★</span>
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
  bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px));
  right: 20px;
  z-index: 9999;
  pointer-events: none;
}

.toast-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.toast-item {
  pointer-events: auto;
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 18px;
  border-radius: 99px;
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--ink);
  box-shadow: 0 10px 25px rgba(43, 29, 90, 0.15);
  transition: transform 0.2s;
}

.toast-item:hover {
  transform: translateY(-2px);
}

.toast-icon {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  background: var(--ink);
  color: #fff;
}

.toast-success .toast-icon {
  background: #2fd3a2;
}

.toast-error .toast-icon {
  background: #ff4f9a;
}

.toast-warning .toast-icon {
  background: #ffa24c;
}

.toast-anim-enter-active,
.toast-anim-leave-active {
  transition: all 0.3s cubic-bezier(0.2, 1.5, 0.3, 1);
}

.toast-anim-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.8);
}

.toast-anim-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.9);
}
</style>
