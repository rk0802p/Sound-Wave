<template>
  <div class="modal-backdrop" @click.self="$emit('close')">
    <div class="modal-card">
      <div class="modal-header">
        <h2>Add Song to Playlist</h2>
        <button class="close-btn" @click="$emit('close')">✕</button>
      </div>

      <!-- Tabs -->
      <div class="modal-tabs">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'custom' }"
          @click="activeTab = 'custom'"
        >
          Custom Track
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'catalog' }"
          @click="activeTab = 'catalog'"
        >
          Curated Sound Catalog
        </button>
      </div>

      <!-- Duplicate Warning Banner -->
      <div v-if="duplicateWarning" class="duplicate-alert">
        <div class="alert-content">
          <span class="alert-icon">⚠️</span>
          <div>
            <strong>Duplicate Track Detected</strong>
            <p>{{ duplicateWarning.message }}</p>
          </div>
        </div>
        <div class="alert-actions">
          <button class="btn-override" :disabled="loading" @click="submitSong(true)">
            Add Anyway
          </button>
          <button class="btn-dismiss" @click="duplicateWarning = null">Cancel</button>
        </div>
      </div>

      <!-- Tab 1: Custom Song Form -->
      <div v-if="activeTab === 'custom'" class="tab-pane">
        <form @submit.prevent="submitSong(false)" class="song-form">
          <div class="form-row">
            <div class="form-group flex-2">
              <label>Title *</label>
              <input v-model="form.title" type="text" placeholder="e.g. Midnight City" required />
            </div>
            <div class="form-group flex-2">
              <label>Artist *</label>
              <input v-model="form.artist" type="text" placeholder="e.g. M83" required />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-2">
              <label>Album</label>
              <input v-model="form.album" type="text" placeholder="e.g. Hurry Up, We're Dreaming" />
            </div>
            <div class="form-group flex-1">
              <label>Duration (sec)</label>
              <input v-model.number="form.duration" type="number" min="0" placeholder="e.g. 244" />
            </div>
          </div>

          <div class="form-group">
            <label>Audio Stream URL or Web Link</label>
            <input
              v-model="form.url"
              type="text"
              placeholder="Direct .mp3 audio stream, YouTube link, or SoundCloud URL"
            />
            <span class="input-hint">Direct MP3/audio streams will play in the bottom player; external web links will open in source tab.</span>
          </div>

          <div class="form-group">
            <label>Cover Art Image URL</label>
            <input v-model="form.coverImage" type="text" placeholder="https://example.com/art.jpg" />
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-cancel" @click="$emit('close')">Cancel</button>
            <button type="submit" class="btn-submit" :disabled="loading">
              <span v-if="loading">Adding...</span>
              <span v-else>Add Song</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Tab 2: Curated Catalog -->
      <div v-else class="tab-pane catalog-pane">
        <p class="catalog-hint">
          Verified royalty-free streams with full metadata and persistent audio playback:
        </p>
        <div class="catalog-grid">
          <div
            v-for="track in CURATED_DEMO_TRACKS"
            :key="track.title"
            class="catalog-item"
            @click="addCatalogTrack(track)"
          >
            <img :src="track.coverImage" :alt="track.title" class="catalog-thumb" />
            <div class="catalog-info">
              <div class="cat-title">{{ track.title }}</div>
              <div class="cat-artist">{{ track.artist }} • {{ formatDuration(track.duration) }}</div>
            </div>
            <button class="cat-add-btn" :disabled="loading" title="Add to playlist">+</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive } from 'vue';
import { usePlaylistStore } from '../../stores/playlist';
import { useToastStore } from '../../stores/toast';
import { CURATED_DEMO_TRACKS, formatDuration } from '../../data/demoTracks';

const props = defineProps({
  playlistId: {
    type: String,
    required: true,
  },
});

const emit = defineEmits(['close', 'song-added']);

const playlistStore = usePlaylistStore();
const toastStore = useToastStore();

const activeTab = ref('custom');
const loading = ref(false);
const duplicateWarning = ref(null);

const form = reactive({
  title: '',
  artist: '',
  album: '',
  duration: 0,
  url: '',
  coverImage: '',
});

const submitSong = async (allowDuplicate = false) => {
  if (!form.title.trim() || !form.artist.trim()) {
    toastStore.warning('Title and Artist are required');
    return;
  }

  loading.value = true;
  try {
    await playlistStore.addSong(props.playlistId, {
      ...form,
      allowDuplicate,
    });
    toastStore.success(`Added "${form.title}" to playlist!`);
    emit('song-added');
    emit('close');
  } catch (err) {
    if (err.response?.status === 409 && err.response?.data?.isDuplicate) {
      duplicateWarning.value = err.response.data;
    } else {
      toastStore.error(err.response?.data?.message || 'Failed to add song');
    }
  } finally {
    loading.value = false;
  }
};

const addCatalogTrack = async (track) => {
  loading.value = true;
  duplicateWarning.value = null;
  try {
    await playlistStore.addSong(props.playlistId, {
      title: track.title,
      artist: track.artist,
      album: track.album,
      duration: track.duration,
      url: track.url,
      coverImage: track.coverImage,
      allowDuplicate: false,
    });
    toastStore.success(`Added "${track.title}" to playlist!`);
    emit('song-added');
    emit('close');
  } catch (err) {
    if (err.response?.status === 409 && err.response?.data?.isDuplicate) {
      // Prompt override for catalog track
      form.title = track.title;
      form.artist = track.artist;
      form.album = track.album;
      form.duration = track.duration;
      form.url = track.url;
      form.coverImage = track.coverImage;
      activeTab.value = 'custom';
      duplicateWarning.value = err.response.data;
    } else {
      toastStore.error(err.response?.data?.message || 'Failed to add catalog track');
    }
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
  max-width: 580px;
  background: var(--sw-surface);
  border-radius: var(--sw-radius-lg);
  border: 1px solid var(--sw-border);
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.7);
  padding: 28px;
  max-height: 90vh;
  overflow-y: auto;
  color: var(--sw-text-primary);
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20px;
}

.modal-header h2 {
  font-size: 1.4rem;
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

.close-btn:hover {
  color: #fff;
}

.modal-tabs {
  display: flex;
  gap: 8px;
  margin-bottom: 20px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
  padding-bottom: 12px;
}

.tab-btn {
  padding: 8px 16px;
  background: transparent;
  border: none;
  color: #9ca3af;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
}

.tab-btn.active {
  background: var(--sw-accent-soft);
  color: var(--sw-accent-muted);
}

.duplicate-alert {
  background: rgba(251, 191, 36, 0.1);
  border: 1px solid rgba(251, 191, 36, 0.3);
  padding: 14px;
  border-radius: 12px;
  margin-bottom: 18px;
}

.alert-content {
  display: flex;
  gap: 12px;
  color: #fbbf24;
  font-size: 0.88rem;
  margin-bottom: 10px;
}

.alert-content p {
  margin: 4px 0 0 0;
  color: #d1d5db;
}

.alert-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-override {
  padding: 6px 14px;
  background: #fbbf24;
  color: #000;
  border: none;
  border-radius: 6px;
  font-weight: 600;
  font-size: 0.85rem;
  cursor: pointer;
}

.btn-dismiss {
  padding: 6px 14px;
  background: transparent;
  border: 1px solid rgba(255, 255, 255, 0.2);
  color: #fff;
  border-radius: 6px;
  font-size: 0.85rem;
  cursor: pointer;
}

/* Form */
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
  color: #9ca3af;
}

.form-group input {
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 10px;
  color: #fff;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.form-group input:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 10px rgba(99, 102, 241, 0.2);
}

.input-hint {
  font-size: 0.72rem;
  color: #6b7280;
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
  padding: 10px 22px;
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

/* Catalog */
.catalog-hint {
  font-size: 0.85rem;
  color: #9ca3af;
  margin-bottom: 14px;
}

.catalog-grid {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 380px;
  overflow-y: auto;
}

.catalog-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 10px;
  border: 1px solid rgba(255, 255, 255, 0.06);
  cursor: pointer;
  transition: all 0.15s;
}

.catalog-item:hover {
  background: rgba(99, 102, 241, 0.12);
  border-color: rgba(99, 102, 241, 0.3);
}

.catalog-thumb {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  object-fit: cover;
}

.catalog-info {
  flex: 1;
  min-width: 0;
}

.cat-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #fff;
}

.cat-artist {
  font-size: 0.78rem;
  color: #9ca3af;
}

.cat-add-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.08);
  border: none;
  color: #fff;
  font-size: 1.2rem;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.catalog-item:hover .cat-add-btn {
  background: #6366f1;
}
</style>
