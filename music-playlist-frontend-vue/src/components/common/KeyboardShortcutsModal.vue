<template>
  <AppModal
    :isOpen="isOpen"
    title="KEYBOARD SHORTCUTS"
    description="GLOBAL WORKSTATION CONTROLS"
    width="540px"
    @close="$emit('close')"
  >
    <div class="shortcuts-guide font-mono">
      <div class="shortcuts-list">
        <div v-for="sc in shortcuts" :key="sc.action" class="shortcut-row">
          <div class="shortcut-keys">
            <kbd v-for="key in sc.keys" :key="key" class="neo-key">{{ key }}</kbd>
          </div>
          <div class="shortcut-desc">
            <span class="action-name font-display">{{ sc.action }}</span>
            <small class="action-sub">{{ sc.detail }}</small>
          </div>
        </div>
      </div>

      <div class="shortcuts-footer font-mono">
        <span class="footer-tip">💡 Shortcuts work globally across all mixtape views and explorer</span>
        <button class="btn-got-it font-mono" id="btnGotItShortcuts" @click="$emit('close')">GOT IT (ESC)</button>
      </div>
    </div>
  </AppModal>
</template>

<script setup>
import AppModal from './AppModal.vue';

defineProps({
  isOpen: {
    type: Boolean,
    default: false,
  },
});

defineEmits(['close']);

const shortcuts = [
  { keys: ['SPACE'], action: 'Play / Pause', detail: 'Toggle active playback' },
  { keys: ['←', '→'], action: 'Seek 5s', detail: 'Rewind / fast-forward track position' },
  { keys: ['↑', '↓'], action: 'Volume ±5%', detail: 'Adjust master playback volume' },
  { keys: ['M'], action: 'Mute / Unmute', detail: 'Quick toggle audio output' },
  { keys: ['S'], action: 'Toggle Shuffle', detail: 'Randomize next track queue sequence' },
  { keys: ['R'], action: 'Cycle Repeat', detail: 'Off → All → One track loop' },
  { keys: ['?', 'Shift + /'], action: 'Shortcuts Guide', detail: 'Toggle this keyboard shortcut guide' },
  { keys: ['ESC'], action: 'Close Modal', detail: 'Dismiss any open dialog or overlay' },
];
</script>

<style scoped>
.shortcuts-guide {
  padding: 0.5rem 0;
}

.shortcuts-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  margin-bottom: 1.2rem;
}

.shortcut-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.5rem 0.75rem;
  background: #f7f7f7;
  border: 2px solid #000;
  border-radius: 8px;
  box-shadow: 2px 2px 0px #000;
}

.shortcut-keys {
  display: flex;
  align-items: center;
  gap: 0.35rem;
  flex-wrap: wrap;
}

.neo-key {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  font-family: inherit;
  font-size: 0.75rem;
  font-weight: 900;
  color: #000;
  background: #fff;
  border: 2px solid #000;
  border-radius: 4px;
  box-shadow: 2px 2px 0px #000;
  min-width: 24px;
  text-align: center;
}

.shortcut-desc {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  text-align: right;
}

.action-name {
  font-size: 0.85rem;
  font-weight: 800;
  color: #000;
  letter-spacing: -0.01em;
}

.action-sub {
  font-size: 0.68rem;
  color: #666;
}

.shortcuts-footer {
  display: flex;
  flex-direction: column;
  gap: 0.8rem;
  border-top: 2px solid #000;
  padding-top: 1rem;
  align-items: center;
}

.footer-tip {
  font-size: 0.7rem;
  color: #555;
  text-align: center;
}

.btn-got-it {
  width: 100%;
  padding: 0.6rem 1rem;
  background: #ffeb3b;
  color: #000;
  border: 2px solid #000;
  font-weight: 900;
  font-size: 0.82rem;
  border-radius: 6px;
  box-shadow: 3px 3px 0px #000;
  cursor: pointer;
  transition: transform 0.1s, box-shadow 0.1s;
}

.btn-got-it:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0px #000;
}

.btn-got-it:active {
  transform: translate(1px, 1px);
  box-shadow: 2px 2px 0px #000;
}
</style>
