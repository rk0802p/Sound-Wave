<template>
  <AppModal
    title="Edit Sound Archive"
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
        <AppButton variant="ghost" size="md" @click="$emit('close')">
          Cancel
        </AppButton>
        <AppButton
          type="submit"
          variant="primary"
          size="md"
          :loading="loading"
        >
          Save Changes
        </AppButton>
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
  gap: 24px;
}

.modal-layout-grid {
  display: grid;
  grid-template-columns: 160px 1fr;
  gap: 28px;
  align-items: flex-start;
}

.art-preview-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.preview-caption {
  font-size: 0.65rem;
  color: var(--sw-text-muted);
  letter-spacing: 0.08em;
}

.form-inputs-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.sw-field-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--sw-text-secondary);
}

.sw-textarea {
  background: var(--sw-surface-hover);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-md);
  padding: 10px 14px;
  color: var(--sw-text-primary);
  font-size: 0.86rem;
  font-family: inherit;
  resize: vertical;
  outline: none;
  transition: all var(--sw-transition-fast);
}

.sw-textarea:focus {
  border-color: var(--sw-accent);
  background: var(--sw-surface-active);
  box-shadow: 0 0 14px var(--sw-accent-soft);
}

.sw-checkbox-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.sw-checkbox {
  width: 16px;
  height: 16px;
  accent-color: var(--sw-accent);
  cursor: pointer;
}

.checkbox-label {
  font-size: 0.82rem;
  color: var(--sw-text-secondary);
  cursor: pointer;
}

.artwork-selection-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-top: 1px solid var(--sw-border-subtle);
  padding-top: 18px;
}

.section-label {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--sw-text-muted);
  letter-spacing: 0.1em;
}

.presets-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(130px, 1fr));
  gap: 10px;
  max-height: 220px;
  overflow-y: auto;
  padding-right: 4px;
}

.preset-card {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--sw-radius-md);
  overflow: hidden;
  border: 2px solid transparent;
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.preset-card:hover {
  transform: scale(1.03);
  border-color: var(--sw-border-hover);
}

.preset-card.selected {
  border-color: var(--sw-accent);
  box-shadow: 0 0 14px var(--sw-accent-glow);
}

.preset-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preset-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(6, 7, 9, 0.9) 100%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 8px;
}

.preset-name {
  font-size: 0.72rem;
  font-weight: 700;
  color: #fff;
}

.preset-genre {
  font-size: 0.6rem;
  color: var(--sw-accent);
}

.custom-url-box {
  margin-top: 4px;
}

.form-actions-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  border-top: 1px solid var(--sw-border-subtle);
  padding-top: 18px;
}

@media (max-width: 640px) {
  .modal-layout-grid {
    grid-template-columns: 1fr;
    gap: 18px;
  }
  .art-preview-column {
    display: none;
  }
}
</style>
