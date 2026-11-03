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
            <h2 v-if="title" class="modal-title font-display">{{ title }}</h2>
            <p v-if="description" class="modal-desc">{{ description }}</p>
          </div>
          <button v-if="showClose" class="close-icon-btn font-mono" @click="handleClose" title="Close (Esc)">
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

// Trap focus and prevent background scroll
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

onMounted(() => {
  if (props.isOpen) {
    document.body.style.overflow = 'hidden';
    nextTick(() => {
      backdropRef.value?.focus();
    });
  }
});

onUnmounted(() => {
  document.body.style.overflow = '';
});
</script>

<style scoped>
.sw-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(20, 16, 30, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: fadeIn 200ms ease;
  outline: none;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

.sw-modal-panel {
  width: 100%;
  background: var(--pg-canvas);
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-xl);
  box-shadow: var(--pg-shadow-solid-xl);
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: scaleIn var(--pg-transition-spring);
}

@keyframes scaleIn {
  from {
    transform: scale(0.96) translateY(12px);
    opacity: 0;
  }
  to {
    transform: scale(1) translateY(0);
    opacity: 1;
  }
}

.sw-modal-header {
  padding: 24px 28px 18px 28px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 2px solid var(--pg-border);
}

.modal-title {
  font-size: 1.45rem;
  font-weight: 800;
  color: var(--pg-ink);
  margin-bottom: 4px;
  letter-spacing: -0.03em;
}

.modal-desc {
  font-size: 0.88rem;
  color: var(--pg-ink-secondary);
}

.close-icon-btn {
  background: var(--pg-surface-soft);
  border: 1.5px solid var(--pg-border);
  color: var(--pg-ink);
  font-size: 0.85rem;
  font-weight: 800;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 2px 2px 0px var(--pg-border);
  transition: all var(--pg-transition-spring);
}

.close-icon-btn:hover {
  background: var(--pg-coral);
  color: #fff;
  transform: translate(-1px, -1px);
}

.sw-modal-body {
  padding: 24px 28px;
  overflow-y: auto;
  max-height: calc(85vh - 140px);
}

.sw-modal-footer {
  padding: 18px 28px 24px 28px;
  border-top: 2px solid var(--pg-border);
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
    border-radius: var(--pg-radius-xl) var(--pg-radius-xl) 0 0;
    max-height: 90vh;
  }
}
</style>
