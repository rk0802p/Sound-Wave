<template>
  <div
    v-if="visible"
    class="undo-toast-wrap font-mono"
    role="status"
    aria-live="polite"
  >
    <div class="undo-toast-card">
      <div class="undo-info">
        <span class="undo-icon">🗑️</span>
        <span class="undo-text">
          Removed <strong>"{{ song?.title || 'track' }}"</strong>
        </span>
      </div>

      <div class="undo-actions">
        <button
          type="button"
          class="btn-undo font-mono"
          @click="handleUndo"
          title="Restore track at original position"
        >
          UNDO ({{ remainingSeconds }}s)
        </button>
        <button
          type="button"
          class="btn-dismiss font-mono"
          @click="dismiss"
          title="Dismiss"
        >
          ✕
        </button>
      </div>

      <div class="undo-progress-bar" :style="{ width: progressPercent + '%' }"></div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  song: {
    type: Object,
    default: null,
  },
  position: {
    type: Number,
    default: 0,
  },
  durationMs: {
    type: Number,
    default: 5000,
  },
});

const emit = defineEmits(['undo', 'dismiss']);

const visible = ref(true);
const elapsedMs = ref(0);
let intervalId = null;

const remainingSeconds = computed(() => {
  const rem = Math.max(0, props.durationMs - elapsedMs.value);
  return Math.ceil(rem / 1000);
});

const progressPercent = computed(() => {
  return Math.max(0, 100 - (elapsedMs.value / props.durationMs) * 100);
});

const startTimer = () => {
  elapsedMs.value = 0;
  visible.value = true;
  clearInterval(intervalId);
  const stepMs = 50;
  intervalId = setInterval(() => {
    elapsedMs.value += stepMs;
    if (elapsedMs.value >= props.durationMs) {
      dismiss();
    }
  }, stepMs);
};

const handleUndo = () => {
  clearInterval(intervalId);
  visible.value = false;
  emit('undo', { song: props.song, position: props.position });
};

const dismiss = () => {
  clearInterval(intervalId);
  visible.value = false;
  emit('dismiss');
};

watch(
  () => props.song,
  (newVal) => {
    if (newVal) {
      startTimer();
    }
  },
  { immediate: true }
);

onUnmounted(() => {
  clearInterval(intervalId);
});
</script>

<style scoped>
.undo-toast-wrap {
  position: fixed;
  bottom: calc(5.5rem + env(safe-area-inset-bottom, 0px));
  left: 50%;
  transform: translateX(-50%);
  z-index: 99999;
  pointer-events: auto;
  animation: slideUpToast 0.2s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideUpToast {
  from {
    transform: translate(-50%, 20px);
    opacity: 0;
  }
  to {
    transform: translate(-50%, 0);
    opacity: 1;
  }
}

.undo-toast-card {
  position: relative;
  overflow: hidden;
  background-color: #FFFFFF;
  color: #111111;
  border: 3px solid #111111;
  box-shadow: 5px 5px 0 #111111;
  padding: 12px 18px 16px;
  display: flex;
  align-items: center;
  gap: 16px;
  border-radius: 0;
}

.undo-info {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.9rem;
  font-weight: 700;
  color: #111111;
}

.undo-text strong {
  color: #111111;
  background-color: #FFD84A;
  border: 1px solid #111111;
  padding: 1px 6px;
}

.undo-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.btn-undo {
  background-color: #5DE3A6;
  color: #111111;
  border: 2px solid #111111;
  box-shadow: 2px 2px 0 #111111;
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  font-weight: 900;
  padding: 6px 14px;
  cursor: pointer;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border-radius: 0;
  transition: transform 0.08s ease, box-shadow 0.08s ease, background-color 0.08s ease;
}

.btn-undo:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #111111;
  background-color: #4BD898;
}

.btn-undo:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #111111;
}

.btn-dismiss {
  background: #FFFFFF;
  border: 2px solid #111111;
  box-shadow: 2px 2px 0 #111111;
  color: #111111;
  font-size: 0.85rem;
  font-weight: 900;
  cursor: pointer;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0;
  transition: transform 0.08s ease, background-color 0.08s ease;
}

.btn-dismiss:hover {
  background-color: #FF6B5E;
  color: #FFFFFF;
  transform: translate(-1px, -1px);
}

.btn-dismiss:active {
  transform: translate(1px, 1px);
}

.undo-progress-bar {
  position: absolute;
  bottom: 0;
  left: 0;
  height: 4px;
  background-color: #FFD84A;
  border-top: 1px solid #111111;
  transition: width 0.05s linear;
}
</style>
