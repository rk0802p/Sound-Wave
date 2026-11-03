<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="sw-modal-backdrop"
      @click.self="handleBackdropClick"
      @keydown.esc="handleClose"
      tabindex="-1"
      ref="backdropRef"
    >
      <div
        class="sw-modal-panel"
        :style="{ maxWidth: width }"
        role="dialog"
        aria-modal="true"
      >
        <!-- Modal Header -->
        <div class="sw-modal-header">
          <div class="header-titles">
            <h2 v-if="title" class="modal-title">{{ title }}</h2>
            <p v-if="description" class="modal-desc">{{ description }}</p>
          </div>
          <button v-if="showClose" class="close-icon-btn" @click="handleClose" title="Close (Esc)">
            ✕
          </button>
        </div>

        <!-- Modal Body -->
        <div class="sw-modal-body">
          <slot></slot>
        </div>

        <!-- Modal Footer -->
        <div v-if="$slots.footer" class="sw-modal-footer">
          <slot name="footer"></slot>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: true,
  },
  title: {
    type: String,
    default: '',
  },
  description: {
    type: String,
    default: '',
  },
  width: {
    type: String,
    default: '540px',
  },
  closeOnBackdrop: {
    type: Boolean,
    default: true,
  },
  showClose: {
    type: Boolean,
    default: true,
  },
});

const emit = defineEmits(['close']);
const backdropRef = ref(null);

const handleClose = () => {
  emit('close');
};

const handleBackdropClick = () => {
  if (props.closeOnBackdrop) {
    handleClose();
  }
};

watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      document.body.style.overflow = 'hidden';
      nextTick(() => {
        backdropRef.value?.focus();
      });
    } else {
      document.body.style.overflow = '';
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>

<style scoped>
.sw-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(4, 4, 6, 0.75);
  backdrop-filter: blur(8px);
  z-index: 1050;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  animation: fadeIn var(--sw-transition-fast);
  outline: none;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.sw-modal-panel {
  width: 100%;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-lg);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.6);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: scaleIn var(--sw-transition-normal);
}

@keyframes scaleIn {
  from {
    transform: scale(0.96) translateY(8px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.sw-modal-header {
  padding: 24px 28px 16px 28px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 1px solid var(--sw-border-subtle);
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--sw-text-primary);
  margin-bottom: 4px;
}

.modal-desc {
  font-size: 0.85rem;
  color: var(--sw-text-secondary);
}

.close-icon-btn {
  background: transparent;
  border: none;
  color: var(--sw-text-muted);
  font-size: 1.1rem;
  padding: 6px;
  border-radius: var(--sw-radius-sm);
  cursor: pointer;
  transition: all var(--sw-transition-fast);
  line-height: 1;
}

.close-icon-btn:hover {
  background: var(--sw-surface-hover);
  color: var(--sw-text-primary);
}

.sw-modal-body {
  padding: 24px 28px;
  overflow-y: auto;
  max-height: calc(85vh - 140px);
}

.sw-modal-footer {
  padding: 16px 28px 24px 28px;
  border-top: 1px solid var(--sw-border-subtle);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
}

@media (max-width: 640px) {
  .sw-modal-backdrop {
    padding: 0;
    align-items: flex-end;
  }
  .sw-modal-panel {
    border-radius: var(--sw-radius-lg) var(--sw-radius-lg) 0 0;
    max-height: 90vh;
  }
}
</style>
