<template>
  <button
    :type="type"
    class="sw-btn"
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
  font-weight: 600;
  border-radius: var(--sw-radius-md);
  transition: all var(--sw-transition-fast);
  white-space: nowrap;
  user-select: none;
  border: 1px solid transparent;
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
  height: 32px;
  padding: 0 12px;
  font-size: 0.82rem;
  border-radius: var(--sw-radius-sm);
}

.size-md {
  height: 40px;
  padding: 0 18px;
  font-size: 0.88rem;
  border-radius: var(--sw-radius-md);
}

.size-lg {
  height: 48px;
  padding: 0 24px;
  font-size: 0.95rem;
  border-radius: var(--sw-radius-md);
}

/* VARIANTS */
.variant-primary {
  background: var(--sw-accent);
  color: #060709;
  font-weight: 700;
  border-color: var(--sw-accent);
  box-shadow: 0 2px 14px var(--sw-accent-soft);
}

.variant-primary:hover:not(:disabled) {
  background: var(--sw-accent-hover);
  border-color: var(--sw-accent-hover);
  box-shadow: 0 4px 22px var(--sw-accent-glow);
  transform: translateY(-1px);
}

.variant-warm {
  background: var(--sw-warm);
  color: #060709;
  font-weight: 700;
  border-color: var(--sw-warm);
  box-shadow: 0 2px 14px var(--sw-warm-soft);
}

.variant-warm:hover:not(:disabled) {
  background: #fbbf24;
  box-shadow: 0 4px 22px var(--sw-warm-glow);
  transform: translateY(-1px);
}

.variant-secondary {
  background: var(--sw-surface);
  color: var(--sw-text-primary);
  border-color: var(--sw-border);
}

.variant-secondary:hover:not(:disabled) {
  background: var(--sw-surface-hover);
  border-color: var(--sw-border-hover);
  color: #fff;
}

.variant-ghost {
  background: transparent;
  color: var(--sw-text-secondary);
}

.variant-ghost:hover:not(:disabled) {
  background: var(--sw-surface-hover);
  color: var(--sw-text-primary);
}

.variant-danger {
  background: rgba(244, 63, 94, 0.12);
  color: var(--sw-danger);
  border-color: rgba(244, 63, 94, 0.25);
}

.variant-danger:hover:not(:disabled) {
  background: var(--sw-danger);
  color: #fff;
  border-color: var(--sw-danger);
}

.variant-icon {
  background: transparent;
  color: var(--sw-text-secondary);
  border-radius: 50%;
  padding: 0;
}

.variant-icon.size-sm { width: 32px; height: 32px; }
.variant-icon.size-md { width: 40px; height: 40px; }
.variant-icon.size-lg { width: 48px; height: 48px; }

.variant-icon:hover:not(:disabled) {
  background: var(--sw-surface-hover);
  color: var(--sw-text-primary);
}

.sw-btn:disabled {
  opacity: 0.45;
  cursor: not-allowed;
  transform: none !important;
}

/* Spinner */
.spinner {
  width: 16px;
  height: 16px;
  border: 2px solid rgba(0, 0, 0, 0.3);
  border-top-color: currentColor;
  border-radius: 50%;
  animation: spin 0.6s linear infinite;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
