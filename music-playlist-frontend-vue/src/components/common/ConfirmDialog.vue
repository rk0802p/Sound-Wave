<template>
  <AppModal
    :isOpen="isOpen"
    :title="title"
    width="440px"
    @close="$emit('cancel')"
  >
    <div class="confirm-dialog-content font-mono">
      <p class="confirm-message">{{ message }}</p>

      <div class="confirm-actions">
        <button
          type="button"
          class="btn-cancel font-mono"
          @click="$emit('cancel')"
          :disabled="loading"
        >
          {{ cancelText }}
        </button>
        <button
          type="button"
          class="btn-confirm font-mono"
          :class="{ danger: isDanger }"
          @click="$emit('confirm')"
          :disabled="loading"
          autofocus
        >
          <span v-if="loading">Processing...</span>
          <span v-else>{{ confirmText }}</span>
        </button>
      </div>
    </div>
  </AppModal>
</template>

<script setup>
import AppModal from './AppModal.vue';

defineProps({
  isOpen: {
    type: Boolean,
    default: true,
  },
  title: {
    type: String,
    default: 'Confirm Action',
  },
  message: {
    type: String,
    required: true,
  },
  confirmText: {
    type: String,
    default: 'Delete',
  },
  cancelText: {
    type: String,
    default: 'Cancel',
  },
  isDanger: {
    type: Boolean,
    default: true,
  },
  loading: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['confirm', 'cancel']);
</script>

<style scoped>
.confirm-dialog-content {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.confirm-message {
  font-family: var(--font-mono, monospace);
  font-size: 0.95rem;
  font-weight: 600;
  line-height: 1.5;
  color: #111111;
  background-color: #FFFDF8;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
  padding: 14px 16px;
  margin: 4px 0;
}

.confirm-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 4px;
}

.btn-cancel,
.btn-confirm {
  padding: 10px 20px;
  font-family: var(--font-mono, monospace);
  font-size: 0.85rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
  cursor: pointer;
  border-radius: 0;
  transition: transform 0.08s ease, box-shadow 0.08s ease, background-color 0.08s ease;
}

.btn-cancel {
  background-color: #FFFFFF;
  color: #111111;
}

.btn-cancel:hover:not(:disabled) {
  background-color: #F3EFE8;
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #111111;
}

.btn-cancel:active:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #111111;
}

.btn-confirm {
  background-color: #5DE3A6;
  color: #111111;
  font-weight: 900;
}

.btn-confirm:hover:not(:disabled) {
  background-color: #4BD898;
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #111111;
}

.btn-confirm:active:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #111111;
}

.btn-confirm.danger {
  background-color: #FF6B5E;
  color: #FFFFFF;
}

.btn-confirm.danger:hover:not(:disabled) {
  background-color: #FF5242;
}

.btn-cancel:disabled,
.btn-confirm:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
