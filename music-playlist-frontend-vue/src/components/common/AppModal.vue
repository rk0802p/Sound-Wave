<template>
  <Teleport to="body">
    <div
      v-if="isOpen"
      class="sw-modal-backdrop"
      @click.self="handleBackdropClick"
      @keydown="handleKeydown"
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

const handleKeydown = (e) => {
  if (e.key === 'Escape') {
    handleClose();
    return;
  }
  if (e.key === 'Tab') {
    if (!backdropRef.value) return;
    const focusable = backdropRef.value.querySelectorAll(
      'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (e.shiftKey) {
      if (document.activeElement === first || document.activeElement === backdropRef.value) {
        last.focus();
        e.preventDefault();
      }
    } else {
      if (document.activeElement === last) {
        first.focus();
        e.preventDefault();
      }
    }
  }
};

const focusInitialElement = () => {
  if (!backdropRef.value) return;
  const autofocusEl = backdropRef.value.querySelector('[autofocus]');
  if (autofocusEl && typeof autofocusEl.focus === 'function') {
    autofocusEl.focus();
    return;
  }
  const firstFocusable = backdropRef.value.querySelector(
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [href]'
  );
  if (firstFocusable && typeof firstFocusable.focus === 'function') {
    firstFocusable.focus();
  } else {
    backdropRef.value.focus();
  }
};

// Trap focus and prevent background scroll
watch(
  () => props.isOpen,
  (open) => {
    if (open) {
      document.body.style.overflow = 'hidden';
      nextTick(focusInitialElement);
    } else {
      document.body.style.overflow = '';
    }
  },
  { immediate: true }
);

onMounted(() => {
  if (props.isOpen) {
    document.body.style.overflow = 'hidden';
    nextTick(focusInitialElement);
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
  background: rgba(17, 17, 17, 0.65);
  z-index: 2100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  animation: fadeIn 150ms ease;
  outline: none;
}

@keyframes fadeIn {
  from { opacity: 0.5; }
  to { opacity: 1; }
}

.sw-modal-panel {
  width: 100%;
  background: #FFFFFF;
  border: 3px solid #111111;
  border-radius: 0;
  box-shadow: 6px 6px 0 #111111;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  animation: scaleIn 100ms cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes scaleIn {
  from {
    transform: scale(0.98) translateY(4px);
  }
  to {
    transform: scale(1) translateY(0);
  }
}

.sw-modal-header {
  padding: 20px 24px 16px 24px;
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  border-bottom: 2px solid #111111;
  background-color: #FFFDF8;
}

.modal-title {
  font-family: var(--font-display, "Bricolage Grotesque", Figtree, sans-serif);
  font-size: 1.45rem;
  font-weight: 900;
  color: #111111;
  margin-bottom: 4px;
  letter-spacing: -0.02em;
  text-transform: uppercase;
}

.modal-desc {
  font-family: var(--font-mono, monospace);
  font-size: 0.85rem;
  font-weight: 500;
  color: #555555;
}

.close-icon-btn {
  background: #FFFFFF;
  border: 2px solid #111111;
  color: #111111;
  font-size: 0.85rem;
  font-weight: 900;
  width: 32px;
  height: 32px;
  border-radius: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 2px 2px 0 #111111;
  transition: transform 0.08s ease, box-shadow 0.08s ease, background-color 0.08s ease;
  flex-shrink: 0;
}

.close-icon-btn:hover {
  background: #FF6B5E;
  color: #FFFFFF;
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #111111;
}

.close-icon-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #111111;
}

.sw-modal-body {
  padding: 24px;
  overflow-y: auto;
  max-height: calc(85vh - 140px);
  background-color: #FFFFFF;
}

.sw-modal-footer {
  padding: 16px 24px;
  border-top: 2px solid #111111;
  background-color: #FFFDF8;
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
    border-radius: 0;
    max-height: 90vh;
    border-bottom: none;
  }
}
</style>
