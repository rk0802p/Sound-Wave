<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="glass modal-card">
      <div class="modal-header">
        <h2 class="font-display">New Bubble</h2>
        <button class="close-btn" @click="$emit('close')" aria-label="Close modal">✕</button>
      </div>
      <p class="modal-subtitle">Pick an emoji, choose your colors, and name your sound bubble.</p>

      <!-- Live Bubble Preview -->
      <div class="preview-stage">
        <div
          class="orb preview-orb"
          :style="{
            '--o1': selectedGradient.o1,
            '--o2': selectedGradient.o2,
            '--sh': selectedGradient.o2 + '88',
          }"
        >
          {{ selectedEmoji }}
        </div>
        <div class="preview-text">
          <h3>{{ name || 'Untitled Bubble' }}</h3>
          <small>{{ description || 'No description yet' }}</small>
        </div>
      </div>

      <form @submit.prevent="handleSubmit" class="bubble-form">
        <!-- Name Input -->
        <div class="form-group">
          <label>Bubble Name</label>
          <input
            v-model="name"
            type="text"
            placeholder="e.g. Dreamy Afternoon"
            required
            maxlength="40"
            class="glass-input"
          />
        </div>

        <!-- Description Input -->
        <div class="form-group">
          <label>Mood Description</label>
          <input
            v-model="description"
            type="text"
            placeholder="e.g. Ambient haze and soft synth pulses."
            maxlength="80"
            class="glass-input"
          />
        </div>

        <!-- Emoji Selector -->
        <div class="form-group">
          <label>Bubble Icon</label>
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
          <label>Color Aura</label>
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

        <!-- Form Actions -->
        <div class="modal-actions">
          <button type="button" class="cancel-btn" @click="$emit('close')">
            Cancel
          </button>
          <button type="submit" class="cta submit-btn" :disabled="!name.trim() || isSubmitting">
            <span>{{ isSubmitting ? 'Creating...' : 'Create Bubble' }}</span>
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
      isPublic: true,
    });

    if (event) {
      const rect = event.currentTarget.getBoundingClientRect();
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
  z-index: 1000;
  background: rgba(43, 29, 90, 0.4);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  display: grid;
  place-items: center;
  padding: 1.5rem;
}

.modal-card {
  width: min(520px, 100%);
  border-radius: 40px;
  padding: 2.2rem;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: 0 25px 60px rgba(43, 29, 90, 0.25);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 0.4rem;
}

.modal-header h2 {
  font-size: 2.2rem;
  color: var(--ink);
}

.close-btn {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: rgba(43, 29, 90, 0.08);
  font-size: 1.1rem;
  display: grid;
  place-items: center;
  transition: transform 0.2s, background 0.2s;
}

.close-btn:hover {
  transform: scale(1.1);
  background: rgba(43, 29, 90, 0.15);
}

.modal-subtitle {
  color: var(--muted);
  font-size: 0.95rem;
  margin-bottom: 1.5rem;
}

.preview-stage {
  display: flex;
  align-items: center;
  gap: 1.2rem;
  padding: 1rem 1.4rem;
  border-radius: 28px;
  background: rgba(255, 255, 255, 0.6);
  border: 1.5px solid rgba(255, 255, 255, 0.9);
  margin-bottom: 1.5rem;
}

.preview-orb {
  width: 72px;
  height: 72px;
  font-size: 2rem;
  flex: none;
}

.preview-text h3 {
  font-size: 1.3rem;
  margin-bottom: 0.2rem;
}

.preview-text small {
  color: var(--muted);
  font-size: 0.85rem;
}

.bubble-form {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.form-group label {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.glass-input {
  width: 100%;
  padding: 0.85rem 1.2rem;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.7);
  border: 1.5px solid rgba(255, 255, 255, 0.9);
  color: var(--ink);
  font-size: 1rem;
  font-weight: 500;
  outline: none;
  transition: all 0.2s;
}

.glass-input:focus {
  background: #ffffff;
  border-color: var(--ink);
  box-shadow: 0 0 0 3px rgba(43, 29, 90, 0.1);
}

.emoji-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.emoji-btn {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  font-size: 1.3rem;
  display: grid;
  place-items: center;
  background: rgba(255, 255, 255, 0.6);
  border: 1.5px solid rgba(255, 255, 255, 0.9);
  transition: transform 0.2s, background 0.2s;
}

.emoji-btn:hover {
  transform: scale(1.15);
  background: #ffffff;
}

.emoji-btn.selected {
  background: #ffffff;
  border-color: var(--ink);
  transform: scale(1.2);
  box-shadow: 0 4px 12px rgba(43, 29, 90, 0.15);
}

.palette-picker {
  display: flex;
  gap: 0.8rem;
}

.palette-btn {
  width: 38px;
  height: 38px;
  border-radius: 50%;
  border: 2px solid #ffffff;
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s;
}

.palette-btn:hover {
  transform: scale(1.15);
}

.palette-btn.selected {
  outline: 3px solid var(--ink);
  outline-offset: 2px;
  transform: scale(1.2);
}

.modal-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 0.9rem;
  margin-top: 1rem;
}

.cancel-btn {
  padding: 0.8rem 1.4rem;
  border-radius: 99px;
  font-weight: 700;
  color: var(--muted);
  transition: color 0.2s;
}

.cancel-btn:hover {
  color: var(--ink);
}

.submit-btn {
  padding: 0.85rem 1.8rem;
}

.submit-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none !important;
}
</style>
