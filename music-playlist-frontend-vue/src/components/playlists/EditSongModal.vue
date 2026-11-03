<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h2>Edit Track</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <form @submit.prevent="saveSong" class="song-form">
        <div class="form-row">
          <div class="form-group flex-2">
            <label>Title *</label>
            <input v-model="form.title" type="text" required />
          </div>
          <div class="form-group flex-2">
            <label>Artist *</label>
            <input v-model="form.artist" type="text" required />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-2">
            <label>Album</label>
            <input v-model="form.album" type="text" />
          </div>
          <div class="form-group flex-1">
            <label>Duration (sec)</label>
            <input v-model.number="form.duration" type="number" min="0" />
          </div>
        </div>

        <div class="form-group">
          <label>Audio Stream URL or Web Link</label>
          <input v-model="form.url" type="text" />
        </div>

        <div class="form-group">
          <label>Cover Art URL</label>
          <input v-model="form.coverImage" type="text" />
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

const props = defineProps({
  playlistId: {
    type: String,
    required: true,
  },
  song: {
    type: Object,
    required: true,
  },
});

const emit = defineEmits(['close', 'song-updated']);

const playlistStore = usePlaylistStore();
const toastStore = useToastStore();
const loading = ref(false);

const form = reactive({
  title: props.song.title || '',
  artist: props.song.artist || '',
  album: props.song.album || '',
  duration: props.song.duration || 0,
  url: props.song.url || '',
  coverImage: props.song.coverImage || '',
});

const saveSong = async () => {
  if (!form.title.trim() || !form.artist.trim()) {
    toastStore.warning('Title and Artist are required');
    return;
  }

  loading.value = true;
  try {
    await playlistStore.updateSong(props.playlistId, props.song._id, form);
    toastStore.success('Track updated successfully');
    emit('song-updated');
    emit('close');
  } catch (err) {
    toastStore.error(err.response?.data?.message || 'Failed to update track');
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
  background: var(--sw-surface);
  border-radius: var(--sw-radius-lg);
  border: 1px solid var(--sw-border);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
  padding: 28px;
  color: var(--sw-text-primary);
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
  color: var(--sw-text-primary);
}

.close-btn {
  background: transparent;
  border: none;
  color: var(--sw-text-muted);
  font-size: 1.2rem;
  cursor: pointer;
}

.close-btn:hover {
  color: var(--sw-text-primary);
}

.song-form {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.form-row {
  display: flex;
  gap: 12px;
}

.flex-1 { flex: 1; }
.flex-2 { flex: 2; }

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--sw-text-secondary);
}

.form-group input {
  padding: 10px 14px;
  background: var(--sw-surface-hover);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-sm);
  color: var(--sw-text-primary);
  font-size: 0.9rem;
  transition: all var(--sw-transition-fast);
}

.form-group input:focus {
  outline: none;
  border-color: var(--sw-accent);
}

.modal-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 10px;
  padding-top: 14px;
  border-top: 1px solid var(--sw-border-subtle);
}

.btn-cancel {
  padding: 9px 18px;
  background: transparent;
  border: 1px solid var(--sw-border);
  color: var(--sw-text-secondary);
  border-radius: var(--sw-radius-sm);
  cursor: pointer;
}

.btn-cancel:hover {
  background: var(--sw-surface-hover);
  color: var(--sw-text-primary);
}

.btn-submit {
  padding: 9px 22px;
  background: var(--sw-accent);
  color: #fff;
  border: none;
  border-radius: var(--sw-radius-sm);
  font-weight: 600;
  cursor: pointer;
  transition: background var(--sw-transition-fast);
}

.btn-submit:hover:not(:disabled) {
  background: var(--sw-accent-hover);
}
</style>
