<template>
  <div class="modal-backdrop font-mono" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h2 class="font-display">NEW PLAYLIST</h2>
        <button class="close-btn font-mono" @click="$emit('close')" aria-label="Close modal">✕</button>
      </div>
      <p class="modal-subtitle font-mono">Pick an icon, choose your palette aura, and name your playlist.</p>

      <!-- Live Preview -->
      <div class="preview-stage font-mono">
        <div
          class="preview-badge"
          :style="{
            backgroundColor: selectedGradient.tint || '#FFD84A',
          }"
        >
          {{ selectedEmoji }}
        </div>
        <div class="preview-text">
          <h3 class="font-display">{{ name || 'UNTITLED PLAYLIST' }}</h3>
          <small class="font-mono">{{ description || 'No description yet' }}</small>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="bubble-form font-mono">
        <!-- Name Input -->
        <div class="form-group">
          <label class="field-label font-mono">PLAYLIST NAME</label>
          <input
            v-model="name"
            type="text"
            placeholder="e.g. Midnight Lo-Fi Vibes"
            required
            maxlength="40"
            class="sw-text-input font-mono"
            autofocus
          />
        </div>

        <!-- Description Input -->
        <div class="form-group">
          <label class="field-label font-mono">DESCRIPTION</label>
          <input
            v-model="description"
            type="text"
            placeholder="e.g. Ambient haze and soft synth pulses."
            maxlength="80"
            class="sw-text-input font-mono"
          />
        </div>

        <!-- Emoji Selector -->
        <div class="form-group">
          <label class="field-label font-mono">PLAYLIST ICON</label>
          <div class="emoji-picker">
            <button
              v-for="em in emojiOptions"
              :key="em"
              type="button"
              class="emoji-btn"
              :class="{ selected: selectedEmoji === em }"
              @click="selectedEmoji = em"
            >
              {{ em }}
            </button>
          </div>
        </div>

        <!-- Gradient Palette Selector -->
        <div class="form-group">
          <label class="field-label font-mono">COLOR THEME</label>
          <div class="palette-picker">
            <button
              v-for="(pal, idx) in paletteOptions"
              :key="idx"
              type="button"
              class="palette-btn"
              :class="{ selected: selectedPaletteIndex === idx }"
              :style="{
                background: `linear-gradient(135deg, ${pal.o1}, ${pal.o2})`,
              }"
              @click="selectedPaletteIndex = idx"
              :title="pal.label"
            ></button>
          </div>
        </div>

        <!-- Public Sharing Toggle -->
        <div class="form-group public-toggle-group">
          <label class="toggle-label font-mono">
            <input
              type="checkbox"
              v-model="isPublic"
              class="toggle-checkbox"
            />
            <span class="toggle-text">
              <span class="toggle-title">🌐 MAKE PUBLIC ON EXPLORE</span>
              <small class="toggle-desc">Allow community discovery, social sharing, and forking</small>
            </span>
          </label>
        </div>

        <!-- Form Actions -->
        <div class="modal-actions">
          <button type="button" class="btn-cancel font-mono" @click="$emit('close')">
            CANCEL
          </button>
          <button type="submit" class="btn-submit font-mono" :disabled="!name.trim() || isSubmitting">
            <span>{{ isSubmitting ? 'CREATING...' : 'CREATE PLAYLIST' }}</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { usePlaylistStore } from '../../stores/playlist';
import { useToastStore } from '../../stores/toast';
import { popParticles } from '../../data/moodPlaylists';

const emit = defineEmits(['close', 'created']);

const playlistStore = usePlaylistStore();
const toastStore = useToastStore();

const name = ref('');
const description = ref('');
const selectedEmoji = ref('🫧');
const selectedPaletteIndex = ref(0);
const isPublic = ref(true);
const isSubmitting = ref(false);

const emojiOptions = ['🫧', '☀️', '🌙', '📚', '🔥', '🚗', '🎵', '💜', '🎶', '✨', '🎸', '🌈'];

const paletteOptions = [
  { label: 'Sunset Coral', o1: '#ff9bd2', o2: '#ff4f9a', tint: '#ffd9ec' },
  { label: 'Golden Honey', o1: '#ffd27a', o2: '#ffa24c', tint: '#ffe9c9' },
  { label: 'Lavender Dusk', o1: '#c9b6ff', o2: '#8a68ff', tint: '#e6dcff' },
  { label: 'Mint Breeze', o1: '#8ff2d3', o2: '#2fd3a2', tint: '#d3f8ec' },
  { label: 'Sky Azure', o1: '#9ad8ff', o2: '#3fa7ff', tint: '#d4eeff' },
];

const selectedGradient = computed(() => {
  return paletteOptions[selectedPaletteIndex.value];
});

const handleSubmit = async (event) => {
  if (!name.value.trim()) return;
  isSubmitting.value = true;
  const targetEl = event?.currentTarget || event?.target;
  const rect = targetEl && typeof targetEl.getBoundingClientRect === 'function'
    ? targetEl.getBoundingClientRect()
    : null;

  try {
    const palette = selectedGradient.value;
    const created = await playlistStore.createPlaylist({
      name: name.value.trim(),
      description: description.value.trim(),
      emoji: selectedEmoji.value,
      e: selectedEmoji.value,
      o1: palette.o1,
      o2: palette.o2,
      tint: palette.tint,
      isPublic: isPublic.value,
    });

    if (rect) {
      popParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 25, {
        o1: palette.o1,
        o2: palette.o2,
      });
    }

    toastStore.success(`Created bubble "${created.name}"!`);
    emit('created', created);
    emit('close');
  } catch (err) {
    toastStore.error(err.message || 'Failed to create playlist');
  } finally {
    isSubmitting.value = false;
  }
};
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 2100;
  background: rgba(17, 17, 17, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.modal-card {
  width: min(520px, 100%);
  border-radius: 0;
  padding: 24px;
  background: #FFFFFF;
  border: 3px solid #111111;
  box-shadow: 6px 6px 0 #111111;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
  border-bottom: 2px solid #111111;
  padding-bottom: 12px;
}

.modal-header h2 {
  font-family: var(--font-display, "Bricolage Grotesque", sans-serif);
  font-size: 1.6rem;
  font-weight: 900;
  color: #111111;
  letter-spacing: -0.02em;
  text-transform: uppercase;
}

.close-btn {
  width: 32px;
  height: 32px;
  border-radius: 0;
  background: #FFFFFF;
  border: 2px solid #111111;
  box-shadow: 2px 2px 0 #111111;
  font-size: 0.85rem;
  font-weight: 900;
  color: #111111;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: transform 0.08s ease, background-color 0.08s ease;
}

.close-btn:hover {
  background: #FF6B5E;
  color: #FFFFFF;
  transform: translate(-1px, -1px);
}

.modal-subtitle {
  color: #555555;
  font-size: 0.82rem;
  margin: 10px 0 16px;
  font-weight: 500;
}

.preview-stage {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 14px;
  border-radius: 0;
  background: #FFFDF8;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
  margin-bottom: 18px;
}

.preview-badge {
  width: 56px;
  height: 56px;
  font-size: 2rem;
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #111111;
  box-shadow: 2px 2px 0 #111111;
}

.preview-text h3 {
  font-family: var(--font-display, "Bricolage Grotesque", sans-serif);
  font-size: 1.15rem;
  font-weight: 900;
  color: #111111;
  margin-bottom: 2px;
  letter-spacing: -0.02em;
  text-transform: uppercase;
}

.preview-text small {
  color: #666666;
  font-size: 0.78rem;
}

.bubble-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  font-weight: 800;
  color: #111111;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.sw-text-input {
  width: 100%;
  padding: 10px 14px;
  border-radius: 0;
  background: #FFFFFF;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
  color: #111111;
  font-family: var(--font-mono, monospace);
  font-size: 0.88rem;
  font-weight: 600;
  outline: none;
  transition: box-shadow 0.08s ease, background-color 0.08s ease;
}

.sw-text-input:focus {
  background: #FFFDE6;
  box-shadow: 4px 4px 0 #111111;
}

.emoji-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.emoji-btn {
  width: 38px;
  height: 38px;
  border-radius: 0;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
  border: 1.5px solid #111111;
  box-shadow: 2px 2px 0 #111111;
  cursor: pointer;
  transition: transform 0.08s ease, background-color 0.08s ease;
}

.emoji-btn:hover {
  background: #FFFDF8;
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #111111;
}

.emoji-btn.selected {
  background: #FFD84A;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
  transform: translate(-1px, -1px);
}

.palette-picker {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.palette-btn {
  width: 36px;
  height: 36px;
  border-radius: 0;
  border: 2px solid #111111;
  box-shadow: 2px 2px 0 #111111;
  cursor: pointer;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

.palette-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #111111;
}

.palette-btn.selected {
  outline: 2px solid #111111;
  box-shadow: 4px 4px 0 #111111;
  transform: translate(-1px, -1px);
}

.public-toggle-group {
  margin-top: 4px;
  background: #FFFDF8;
  padding: 10px 14px;
  border-radius: 0;
  border: 2px solid #111111;
  box-shadow: 2px 2px 0 #111111;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 10px;
  cursor: pointer;
}

.toggle-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #111111;
  cursor: pointer;
}

.toggle-text {
  display: flex;
  flex-direction: column;
}

.toggle-title {
  font-size: 0.82rem;
  font-weight: 800;
  color: #111111;
  letter-spacing: 0.03em;
}

.toggle-desc {
  font-size: 0.72rem;
  color: #666666;
}

.modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
  border-top: 2px solid #111111;
  padding-top: 16px;
}

.btn-cancel,
.btn-submit {
  padding: 10px 18px;
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
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

.btn-cancel:hover {
  background-color: #F3EFE8;
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #111111;
}

.btn-submit {
  background-color: #5DE3A6;
  color: #111111;
}

.btn-submit:hover:not(:disabled) {
  background-color: #4BD898;
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #111111;
}

.btn-cancel:active,
.btn-submit:active:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #111111;
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
