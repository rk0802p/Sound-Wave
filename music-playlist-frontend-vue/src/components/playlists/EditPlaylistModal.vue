<template>
  <AppModal
    title="Edit Mixtape"
    description="Update playlist title, atmosphere description, and artwork sleeve."
    width="680px"
    @close="$emit('close')"
  >
    <form @submit.prevent="savePlaylist" class="sw-edit-form" novalidate>
      <div class="modal-layout-grid">
        <!-- Live Preview Left -->
        <div class="art-preview-column">
          <ArtworkCover
            :src="form.coverImage"
            :alt="form.name || 'Preview'"
            size="lg"
            :showVinyl="true"
            :fallbackSeed="form.name || 'Playlist'"
          />
          <span class="preview-caption font-mono">CURRENT SLEEVE</span>
        </div>

        <!-- Inputs Right -->
        <div class="form-inputs-column">
          <AppInput
            label="Playlist Name"
            v-model="form.name"
            placeholder="e.g. Nocturnal Vibes"
            required
            :error="fieldError"
            autofocus
          />

          <div class="sw-field-group">
            <label class="field-label">Description & Atmosphere</label>
            <textarea
              v-model="form.description"
              rows="3"
              placeholder="Sonic atmosphere, listening context..."
              class="sw-textarea"
            ></textarea>
          </div>

          <div class="sw-checkbox-row">
            <input id="edit-is-public" v-model="form.isPublic" type="checkbox" class="sw-checkbox" />
            <label for="edit-is-public" class="checkbox-label">Publish as Public Archive to the Atelier</label>
          </div>
        </div>
      </div>

      <!-- Presets Selection -->
      <div class="artwork-selection-section">
        <label class="section-label font-mono">CHOOSE FROM CURATED ARTWORK PRESETS</label>
        <div class="presets-grid">
          <div
            v-for="preset in PLAYLIST_COVER_PRESETS"
            :key="preset.id"
            class="preset-card"
            :class="{ selected: form.coverImage === preset.url }"
            @click="form.coverImage = preset.url"
          >
            <img :src="preset.url" :alt="preset.name" class="preset-img" loading="lazy" />
            <div class="preset-overlay">
              <span class="preset-name font-display">{{ preset.name }}</span>
              <span class="preset-genre font-mono">{{ preset.genre }}</span>
            </div>
          </div>
        </div>

        <!-- Custom Image URL -->
        <div class="custom-url-box">
          <AppInput
            label="Or Custom Cover URL"
            v-model="form.coverImage"
            placeholder="https://images.unsplash.com/..."
          />
        </div>
      </div>

      <!-- Form Actions -->
      <div class="form-actions-footer">
        <button type="button" class="btn-cancel font-mono" @click="$emit('close')">
          CANCEL
        </button>
        <button
          type="submit"
          class="btn-save font-mono"
          :disabled="loading"
        >
          {{ loading ? 'SAVING...' : 'SAVE CHANGES' }}
        </button>
      </div>
    </form>
  </AppModal>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import { usePlaylistStore } from '../../stores/playlist';
import { useToastStore } from '../../stores/toast';
import { PLAYLIST_COVER_PRESETS } from '../../data/demoTracks';
import AppModal from '../common/AppModal.vue';
import AppInput from '../common/AppInput.vue';
import AppButton from '../common/AppButton.vue';
import ArtworkCover from '../common/ArtworkCover.vue';

const props = defineProps({
  playlist: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['close', 'playlist-updated']);
const playlistStore = usePlaylistStore();
const toastStore = useToastStore();
const loading = ref(false);
const fieldError = ref('');

const form = reactive({
  name: '',
  description: '',
  coverImage: '',
  isPublic: false,
});

onMounted(() => {
  if (props.playlist) {
    form.name = props.playlist.name || '';
    form.description = props.playlist.description || '';
    form.coverImage = props.playlist.coverImage || '';
    form.isPublic = Boolean(props.playlist.isPublic);
  }
});

const savePlaylist = async () => {
  fieldError.value = '';
  if (!form.name.trim()) {
    fieldError.value = 'Playlist name is required';
    return;
  }

  loading.value = true;
  try {
    const updated = await playlistStore.updatePlaylist(props.playlist._id, {
      name: form.name.trim(),
      description: form.description.trim(),
      coverImage: form.coverImage.trim(),
      isPublic: form.isPublic,
    });
    toastStore.success(`Updated playlist "${updated.name}"`);
    emit('playlist-updated', updated);
    emit('close');
  } catch (err) {
    const msg = err.response?.data?.message || err.message || 'Failed to update playlist';
    fieldError.value = msg;
    toastStore.error(msg);
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.sw-edit-form {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.modal-layout-grid {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 24px;
  align-items: flex-start;
}

.art-preview-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.preview-caption {
  font-family: var(--font-mono, monospace);
  font-size: 0.68rem;
  font-weight: 800;
  color: #111111;
  background-color: #EFEAE1;
  border: 1.5px solid #111111;
  padding: 2px 8px;
  letter-spacing: 0.08em;
}

.form-inputs-column {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.sw-field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #111111;
}

.sw-textarea {
  background-color: #FFFFFF;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
  border-radius: 0;
  padding: 10px 14px;
  color: #111111;
  font-family: var(--font-mono, monospace);
  font-size: 0.86rem;
  resize: vertical;
  outline: none;
  transition: box-shadow 0.08s ease, background-color 0.08s ease;
}

.sw-textarea:focus {
  background-color: #FFFDE6;
  box-shadow: 4px 4px 0 #111111;
}

.sw-checkbox-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.sw-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #111111;
  cursor: pointer;
}

.checkbox-label {
  font-family: var(--font-mono, monospace);
  font-size: 0.82rem;
  font-weight: 700;
  color: #111111;
  cursor: pointer;
}

.artwork-selection-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 2px solid #111111;
  padding-top: 16px;
}

.section-label {
  font-family: var(--font-mono, monospace);
  font-size: 0.72rem;
  font-weight: 800;
  color: #111111;
  letter-spacing: 0.06em;
}

.presets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 10px;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 4px;
}

.preset-card {
  position: relative;
  aspect-ratio: 1;
  border: 2px solid #111111;
  box-shadow: 2px 2px 0 #111111;
  border-radius: 0;
  overflow: hidden;
  cursor: pointer;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

.preset-card:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #111111;
}

.preset-card.selected {
  border: 3px solid #111111;
  box-shadow: 4px 4px 0 #111111;
  outline: 2px solid #FFD84A;
}

.preset-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.preset-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(17, 17, 17, 0.9) 100%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 6px 8px;
}

.preset-name {
  font-size: 0.72rem;
  font-weight: 800;
  color: #FFFFFF;
}

.preset-genre {
  font-family: var(--font-mono, monospace);
  font-size: 0.62rem;
  font-weight: 700;
  color: #FFD84A;
}

.custom-url-box {
  margin-top: 4px;
}

.form-actions-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  border-top: 2px solid #111111;
  padding-top: 16px;
}

.btn-cancel,
.btn-save {
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

.btn-save {
  background-color: #5DE3A6;
  color: #111111;
}

.btn-save:hover:not(:disabled) {
  background-color: #4BD898;
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #111111;
}

.btn-cancel:active,
.btn-save:active:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #111111;
}

.btn-save:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

@media (max-width: 640px) {
  .modal-layout-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  .art-preview-column {
    display: none;
  }
}
</style>
