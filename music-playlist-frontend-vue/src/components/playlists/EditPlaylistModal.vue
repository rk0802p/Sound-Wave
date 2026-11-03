<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h2>Edit Playlist Details</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <form @submit.prevent="savePlaylist" class="modal-form">
        <div class="form-group">
          <label>Playlist Name *</label>
          <input v-model="form.name" type="text" required placeholder="e.g. Nocturnal Vibes" />
        </div>

        <div class="form-group">
          <label>Description</label>
          <textarea
            v-model="form.description"
            rows="3"
            placeholder="A curated blend of chill beats and nocturnal energy..."
          ></textarea>
        </div>

        <!-- Cover Presets -->
        <div class="form-group">
          <label>Select Cover Artwork</label>
          <div class="preset-covers-row">
            <div
              v-for="preset in PLAYLIST_COVER_PRESETS"
              :key="preset.id"
              class="preset-thumb-wrapper"
              :class="{ selected: form.coverImage === preset.url }"
              @click="form.coverImage = preset.url"
            >
              <img :src="preset.url" :alt="preset.name" class="preset-thumb" />
            </div>
          </div>
        </div>

        <div class="form-group">
          <label>Or Custom Artwork URL</label>
          <input v-model="form.coverImage" type="text" placeholder="https://example.com/artwork.jpg" />
        </div>

        <div class="form-checkbox">
          <input id="edit-public" v-model="form.isPublic" type="checkbox" />
          <label for="edit-public">Make this playlist public (visible to anyone)</label>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-cancel" @click="$emit('close')">Cancel</button>
          <button type="submit" class="btn-submit" :disabled="loading">
            <span v-if="loading">Saving...</span>
            <span v-else>Save Changes</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { usePlaylistStore } from '../../stores/playlist';
import { useToastStore } from '../../stores/toast';
import { PLAYLIST_COVER_PRESETS } from '../../data/demoTracks';

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

const form = reactive({
  name: props.playlist.name || '',
  description: props.playlist.description || '',
  coverImage: props.playlist.coverImage || '',
  isPublic: Boolean(props.playlist.isPublic),
});

const savePlaylist = async () => {
  if (!form.name.trim()) {
    toastStore.warning('Playlist name is required');
    return;
  }

  loading.value = true;
  try {
    await playlistStore.updatePlaylist(props.playlist._id, form);
    toastStore.success('Playlist updated successfully!');
    emit('playlist-updated');
    emit('close');
  } catch (err) {
    toastStore.error(err.response?.data?.message || 'Failed to update playlist');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.modal-card {
  width: 100%;
  max-width: 540px;
  background: #12131d;
  border-radius: 20px;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.8);
  padding: 28px;
  color: #fff;
  max-height: 90vh;
  overflow-y: auto;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-header h2 {
  font-size: 1.3rem;
  font-weight: 700;
  margin: 0;
}

.close-btn {
  background: transparent;
  border: none;
  color: #9ca3af;
  font-size: 1.2rem;
  cursor: pointer;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.82rem;
  font-weight: 600;
  color: #9ca3af;
}

.form-group input,
.form-group textarea {
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #fff;
  font-size: 0.9rem;
  resize: vertical;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #6366f1;
}

.preset-covers-row {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding-bottom: 6px;
}

.preset-thumb-wrapper {
  width: 60px;
  height: 60px;
  border-radius: 10px;
  overflow: hidden;
  cursor: pointer;
  border: 2px solid transparent;
  flex-shrink: 0;
  transition: all 0.2s;
}

.preset-thumb-wrapper:hover {
  transform: scale(1.05);
}

.preset-thumb-wrapper.selected {
  border-color: #6366f1;
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.5);
}

.preset-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.form-checkbox {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 0.85rem;
  color: #d1d5db;
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 10px;
}

.btn-cancel {
  padding: 10px 18px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.15);
  color: #fff;
  border-radius: 10px;
  cursor: pointer;
}

.btn-submit {
  padding: 10px 22px;
  background: #6366f1;
  color: #fff;
  border: none;
  border-radius: 10px;
  font-weight: 600;
  cursor: pointer;
}

.btn-submit:hover:not(:disabled) {
  background: #4f46e5;
}
</style>
