<template>
  <div class="toast-container" aria-live="polite">
    <transition-group name="toast-anim" tag="div" class="toast-list">
      <div
        v-for="toast in toastStore.toasts"
        :key="toast.id"
        class="toast-item font-display"
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
  bottom: 110px;
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
  border-radius: var(--pg-radius-full);
  font-size: 0.88rem;
  font-weight: 800;
  border: 2px solid var(--pg-border);
  box-shadow: var(--pg-shadow-solid);
  transition: all var(--pg-transition-spring);
}

.toast-item:hover {
  transform: translateY(-2px);
  box-shadow: var(--pg-shadow-solid-lg);
}

.toast-success {
  background: var(--pg-surface-mint);
  color: var(--pg-ink);
}

.toast-error {
  background: var(--pg-surface-peach);
  color: var(--pg-coral);
}

.toast-warning {
  background: var(--pg-surface-butter);
  color: var(--pg-ink);
}

.toast-info {
  background: var(--pg-surface-lavender);
  color: var(--pg-cobalt);
}

.toast-icon {
  font-size: 1rem;
  font-weight: 800;
}

.toast-anim-enter-active,
.toast-anim-leave-active {
  transition: all 0.25s var(--pg-ease-spring);
}

.toast-anim-enter-from {
  opacity: 0;
  transform: translateY(20px) scale(0.9);
}

.toast-anim-leave-to {
  opacity: 0;
  transform: translateX(40px);
}
</style>
