<template>
  <button
    :type="type"
    class="sw-btn font-display"
    :class="[
      `variant-${variant}`,
      `size-${size}`,
      { 'is-loading': loading, 'is-full-width': fullWidth }
    ]"
    :disabled="disabled || loading"
    v-bind="$attrs"
  >
    <span v-if="loading" class="spinner"></span>
    <span v-else class="btn-content">
      <slot name="icon-left"></slot>
      <slot></slot>
      <slot name="icon-right"></slot>
    </span>
  </button>
</template>

<script setup>
defineProps({
  type: {
    type: String,
    default: 'button',
  },
  variant: {
    type: String,
    default: 'primary', // 'primary' | 'secondary' | 'ghost' | 'danger' | 'icon' | 'warm'
    validator: (v) => ['primary', 'secondary', 'ghost', 'danger', 'icon', 'warm'].includes(v),
  },
  size: {
    type: String,
    default: 'md', // 'sm' | 'md' | 'lg'
    validator: (v) => ['sm', 'md', 'lg'].includes(v),
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  loading: {
    type: Boolean,
    default: false,
  },
  fullWidth: {
    type: Boolean,
    default: false,
  },
});
</script>

<style scoped>
.sw-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  border-radius: var(--pg-radius-full);
  border: 2px solid var(--pg-border);
  transition: all var(--pg-transition-spring);
  white-space: nowrap;
  user-select: none;
  gap: 8px;
  cursor: pointer;
  letter-spacing: -0.01em;
}

.sw-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.sw-btn.is-full-width {
  width: 100%;
}

.btn-content {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

/* SIZES */
.size-sm {
  height: 34px;
  padding: 0 14px;
  font-size: 0.82rem;
}

.size-md {
  height: 42px;
  padding: 0 20px;
  font-size: 0.88rem;
}

.size-lg {
  height: 50px;
  padding: 0 28px;
  font-size: 0.98rem;
}

/* VARIANTS */
.variant-primary {
  background: var(--pg-cobalt);
  color: #fff;
  box-shadow: 3px 3px 0px var(--pg-border);
}

.variant-primary:hover:not(:disabled) {
  background: var(--pg-coral);
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0px var(--pg-border);
}

.variant-warm {
  background: var(--pg-citron);
  color: var(--pg-ink);
  box-shadow: 3px 3px 0px var(--pg-border);
}

.variant-warm:hover:not(:disabled) {
  background: var(--pg-coral);
  color: #fff;
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0px var(--pg-border);
}

.variant-secondary {
  background: var(--pg-canvas);
  color: var(--pg-ink);
  box-shadow: 2px 2px 0px var(--pg-border);
}

.variant-secondary:hover:not(:disabled) {
  background: var(--pg-surface-butter);
  transform: translateY(-2px);
  box-shadow: 4px 4px 0px var(--pg-border);
}

.variant-ghost {
  background: transparent;
  border-color: transparent;
  color: var(--pg-ink-secondary);
}

.variant-ghost:hover:not(:disabled) {
  background: var(--pg-surface-soft);
  color: var(--pg-ink);
}

.variant-danger {
  background: var(--pg-coral);
  color: #fff;
  box-shadow: 3px 3px 0px var(--pg-border);
}

.variant-danger:hover:not(:disabled) {
  background: #d91b48;
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0px var(--pg-border);
}

.variant-icon {
  width: 40px;
  height: 40px;
  padding: 0;
  border-radius: 50%;
  background: var(--pg-canvas);
  color: var(--pg-ink);
  box-shadow: 2px 2px 0px var(--pg-border);
}

.variant-icon:hover:not(:disabled) {
  background: var(--pg-citron);
  transform: translateY(-2px);
  box-shadow: 3px 3px 0px var(--pg-border);
}

.sw-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
  box-shadow: none;
  transform: none !important;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(20, 16, 30, 0.2);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
