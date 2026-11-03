<template>
  <div class="modal-backdrop" @click.self="$emit('close')" @keydown.esc="$emit('close')" tabindex="-1">
    <div class="modal-card">
      <div class="modal-header">
        <div class="header-titles">
          <span class="modal-eyebrow font-mono">TRACK METADATA</span>
          <h2 class="modal-title font-display">Edit Track</h2>
        </div>
        <button class="close-btn" @click="$emit('close')" aria-label="Close modal">✕</button>
      </div>

      <!-- Live Preview -->
      <div class="live-preview-box">
        <ArtworkCover
          :src="form.coverImage"
          :alt="form.title"
          size="sm"
          :fallbackSeed="form.title || 'Track'"
        />
        <div class="preview-info">
          <span class="preview-title font-display">{{ form.title || 'Untitled Track' }}</span>
          <span class="preview-artist">{{ form.artist || 'Unknown Artist' }}</span>
          <span v-if="form.album" class="preview-album">{{ form.album }}</span>
        </div>
      </div>

      <form @submit.prevent="saveSong" class="song-form">
        <div class="form-row">
          <div class="form-group flex-2">
            <label class="field-label">Track Title <span class="req">*</span></label>
            <input v-model="form.title" type="text" class="sw-field" required />
          </div>
          <div class="form-group flex-2">
            <label class="field-label">Artist <span class="req">*</span></label>
            <input v-model="form.artist" type="text" class="sw-field" required />
          </div>
        </div>

        <div class="form-row">
          <div class="form-group flex-2">
            <label class="field-label">Album</label>
            <input v-model="form.album" type="text" class="sw-field" />
          </div>
          <div class="form-group flex-1">
            <label class="field-label">Duration (sec)</label>
            <input v-model.number="form.duration" type="number" min="0" class="sw-field tabular-nums font-mono" />
          </div>
        </div>

        <div class="form-group">
          <label class="field-label">Audio Stream URL or Web Link</label>
          <input v-model="form.url" type="text" class="sw-field" />
        </div>

        <div class="form-group">
          <label class="field-label">Cover Artwork URL</label>
          <input v-model="form.coverImage" type="text" class="sw-field" />
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-cancel font-mono" @click="$emit('close')">Cancel</button>
          <button type="submit" class="btn-submit font-mono" :disabled="loading">
            <span v-if="loading">SAVING...</span>
            <span v-else>SAVE CHANGES</span>
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, onMounted } from 'vue';
import { usePlaylistStore } from '../../stores/playlist';
import { useToastStore } from '../../stores/toast';
import ArtworkCover from '../common/ArtworkCover.vue';

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
  title: '',
  artist: '',
  album: '',
  duration: 0,
  url: '',
  coverImage: '',
});

onMounted(() => {
  if (props.song) {
    form.title = props.song.title || '';
    form.artist = props.song.artist || '';
    form.album = props.song.album || '';
    form.duration = props.song.duration || 0;
    form.url = props.song.url || '';
    form.coverImage = props.song.coverImage || '';
  }
});

const saveSong = async () => {
  if (!form.title.trim() || !form.artist.trim()) {
    toastStore.warning('Title and Artist are required');
    return;
  }

  loading.value = true;
  try {
    await playlistStore.updateSong(props.playlistId, props.song._id, {
      title: form.title.trim(),
      artist: form.artist.trim(),
      album: form.album.trim(),
      duration: form.duration,
      url: form.url.trim(),
      coverImage: form.coverImage.trim(),
    });
    toastStore.success(`Updated "${form.title}"`);
    emit('song-updated');
    emit('close');
  } catch (err) {
    toastStore.error(err.response?.data?.message || 'Failed to update song');
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(6, 7, 9, 0.8);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  outline: none;
}

.modal-card {
  width: 100%;
  max-width: 580px;
  background: var(--sw-surface);
  border-radius: var(--sw-radius-xl);
  border: 1px solid var(--sw-border);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
  padding: 28px;
  max-height: 90vh;
  overflow-y: auto;
  color: var(--sw-text-primary);
  animation: modalPop 240ms var(--sw-ease-out);
}

@keyframes modalPop {
  from { opacity: 0; transform: scale(0.96) translateY(10px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
}

.modal-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 20px;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.modal-eyebrow {
  font-size: 0.65rem;
  color: var(--sw-accent);
  letter-spacing: 0.1em;
  font-weight: 700;
}

.modal-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--sw-text-primary);
}

.close-btn {
  color: var(--sw-text-muted);
  font-size: 1.2rem;
  padding: 4px 8px;
  border-radius: var(--sw-radius-sm);
  cursor: pointer;
}

.close-btn:hover {
  color: #fff;
  background: var(--sw-surface-hover);
}

.live-preview-box {
  background: var(--sw-surface-hover);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-md);
  padding: 12px;
  margin-bottom: 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}

.preview-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.preview-title {
  font-size: 0.9rem;
  font-weight: 700;
  color: var(--sw-text-primary);
}

.preview-artist {
  font-size: 0.78rem;
  color: var(--sw-text-secondary);
}

.preview-album {
  font-size: 0.72rem;
  color: var(--sw-text-muted);
}

.song-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-row {
  display: flex;
  gap: 14px;
}

.flex-1 { flex: 1; }
.flex-2 { flex: 2; }

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field-label {
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--sw-text-secondary);
}

.req {
  color: var(--sw-accent);
}

.sw-field {
  background: var(--sw-surface-hover);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-md);
  padding: 10px 14px;
  color: var(--sw-text-primary);
  font-size: 0.88rem;
  outline: none;
  transition: all var(--sw-transition-fast);
}

.sw-field:focus {
  border-color: var(--sw-accent);
  background: var(--sw-surface-active);
  box-shadow: 0 0 14px var(--sw-accent-soft);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 8px;
}

.btn-cancel {
  padding: 10px 18px;
  color: var(--sw-text-muted);
  font-size: 0.8rem;
  border-radius: var(--sw-radius-md);
  cursor: pointer;
}

.btn-cancel:hover {
  color: #fff;
}

.btn-submit {
  padding: 10px 22px;
  background: var(--sw-accent);
  color: #060709;
  font-weight: 700;
  font-size: 0.8rem;
  border-radius: var(--sw-radius-md);
  cursor: pointer;
  box-shadow: 0 4px 14px var(--sw-accent-soft);
  transition: all var(--sw-transition-fast);
}

.btn-submit:hover:not(:disabled) {
  background: var(--sw-accent-hover);
  transform: translateY(-1px);
}

.btn-submit:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}
</style>
