<template>
  <AppModal
    title="Edit Playlist Details"
    description="Update title, description, artwork, and visibility."
    width="640px"
    @close="$emit('close')"
  >
    <form @submit.prevent="savePlaylist" class="sw-edit-form" novalidate>
      <div class="modal-layout-grid">
        <!-- Live Preview Left -->
        <div class="art-preview-column">
          <div class="preview-tile">
            <img :src="form.coverImage" :alt="form.name || 'Preview'" class="preview-img" @error="onImgError" />
            <div class="preview-badge">{{ form.isPublic ? 'PUBLIC' : 'PRIVATE' }}</div>
          </div>
          <span class="preview-caption">Current Artwork</span>
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
            <label class="field-label">Description</label>
            <textarea
              v-model="form.description"
              rows="2"
              placeholder="A curated blend of chill beats..."
              class="sw-textarea"
            ></textarea>
          </div>

          <div class="sw-checkbox-row">
            <input id="edit-is-public" v-model="form.isPublic" type="checkbox" class="sw-checkbox" />
            <label for="edit-is-public" class="checkbox-label">Make playlist public to other members</label>
          </div>
        </div>
      </div>

      <!-- Presets Selection -->
      <div class="artwork-selection-section">
        <label class="section-label">Choose Curated Cover Art</label>
        <div class="presets-grid">
          <div
            v-for="preset in PLAYLIST_COVER_PRESETS"
            :key="preset.id"
            class="preset-card"
            :class="{ selected: form.coverImage === preset.url }"
            @click="form.coverImage = preset.url"
          >
            <img :src="preset.url" :alt="preset.name" class="preset-img" />
            <div class="preset-overlay">
              <span class="preset-name">{{ preset.name }}</span>
              <span class="preset-genre">{{ preset.genre }}</span>
            </div>
          </div>
        </div>

        <div class="custom-url-box">
          <AppInput
            label="Or Custom Cover URL"
            v-model="form.coverImage"
            placeholder="https://images.unsplash.com/..."
          />
        </div>
      </div>

      <!-- Footer -->
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
import { reactive, ref } from 'vue';
import { usePlaylistStore } from '../../stores/playlist';
import { useToastStore } from '../../stores/toast';
import { PLAYLIST_COVER_PRESETS, getDistinctArtwork } from '../../data/demoTracks';
import AppModal from '../common/AppModal.vue';
import AppInput from '../common/AppInput.vue';
import AppButton from '../common/AppButton.vue';

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
  name: props.playlist?.name || '',
  description: props.playlist?.description || '',
  coverImage: getDistinctArtwork(props.playlist, 0),
  isPublic: Boolean(props.playlist?.isPublic),
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
      coverImage: form.coverImage.trim() || PLAYLIST_COVER_PRESETS[0].url,
      isPublic: form.isPublic,
    });

    toastStore.success('Playlist details saved!');
    emit('playlist-updated', updated);
    emit('close');
  } catch (err) {
    toastStore.error(err.response?.data?.message || 'Failed to update playlist');
  } finally {
    loading.value = false;
  }
};

const onImgError = (e) => {
  e.target.src = PLAYLIST_COVER_PRESETS[0].url;
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
  grid-template-columns: 140px 1fr;
  gap: 20px;
  align-items: start;
}

.art-preview-column {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.preview-tile {
  position: relative;
  width: 130px;
  height: 130px;
  border-radius: var(--sw-radius-md);
  overflow: hidden;
  border: 1px solid var(--sw-border);
  background: #000;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.5);
}

.preview-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preview-badge {
  position: absolute;
  bottom: 6px;
  left: 6px;
  background: rgba(9, 9, 12, 0.75);
  backdrop-filter: blur(4px);
  padding: 2px 6px;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--sw-text-secondary);
}

.preview-caption {
  font-size: 0.72rem;
  color: var(--sw-text-muted);
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
  font-size: 0.82rem;
  font-weight: 500;
  color: var(--sw-text-secondary);
}

.sw-textarea {
  width: 100%;
  padding: 10px 14px;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-sm);
  color: var(--sw-text-primary);
  font-size: 0.88rem;
  outline: none;
  resize: vertical;
  transition: all var(--sw-transition-fast);
}

.sw-textarea:focus {
  border-color: var(--sw-accent);
  background: var(--sw-surface-hover);
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
  gap: 10px;
  padding-top: 12px;
  border-top: 1px solid var(--sw-border-subtle);
}

.section-label {
  font-size: 0.78rem;
  font-weight: 700;
  letter-spacing: 0.8px;
  color: var(--sw-text-muted);
  text-transform: uppercase;
}

.presets-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
}

.preset-card {
  position: relative;
  aspect-ratio: 1;
  border-radius: var(--sw-radius-sm);
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all var(--sw-transition-fast);
  background: #000;
}

.preset-card:hover {
  transform: translateY(-2px);
  border-color: rgba(255, 255, 255, 0.3);
}

.preset-card.selected {
  border-color: var(--sw-accent);
  box-shadow: 0 0 0 2px var(--sw-accent-soft);
}

.preset-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.preset-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, transparent 40%, rgba(9, 9, 12, 0.9) 100%);
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  padding: 6px;
}

.preset-name {
  font-size: 0.7rem;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.preset-genre {
  font-size: 0.6rem;
  color: var(--sw-accent-muted);
}

.custom-url-box {
  margin-top: 6px;
}

.form-actions-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 14px;
  border-top: 1px solid var(--sw-border-subtle);
}

@media (max-width: 600px) {
  .modal-layout-grid {
    grid-template-columns: 1fr;
  }
  .presets-grid {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
