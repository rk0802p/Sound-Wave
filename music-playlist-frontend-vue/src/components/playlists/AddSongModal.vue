<template>
  <div class="modal-backdrop" @click.self="$emit('close')" @keydown.esc="$emit('close')" tabindex="-1">
    <div class="modal-card">
      <div class="modal-header">
        <div class="header-titles">
          <span class="modal-eyebrow font-mono">TRACK ACQUISITION</span>
          <h2 class="modal-title font-display">Add Track to Playlist</h2>
        </div>
        <button class="close-btn" @click="$emit('close')" aria-label="Close modal">✕</button>
      </div>

      <!-- Tabs: Custom Track vs Curated Catalog -->
      <div class="modal-tabs font-mono">
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'custom' }"
          @click="activeTab = 'custom'"
        >
          Custom Audio / Web Link
        </button>
        <button
          class="tab-btn"
          :class="{ active: activeTab === 'catalog' }"
          @click="activeTab = 'catalog'"
        >
          Curated Sound Catalog
        </button>
      </div>

      <!-- Duplicate Track Warning Banner -->
      <div v-if="duplicateWarning" class="duplicate-alert">
        <div class="alert-content">
          <span class="alert-icon">⚠️</span>
          <div>
            <strong>Duplicate Track Detected</strong>
            <p>{{ duplicateWarning.message }}</p>
          </div>
        </div>
        <div class="alert-actions">
          <button class="btn-override font-mono" :disabled="loading" @click="submitSong(true)">
            Add Anyway
          </button>
          <button class="btn-dismiss font-mono" @click="duplicateWarning = null">Cancel</button>
        </div>
      </div>

      <!-- Tab 1: Custom Song Form with Live Preview -->
      <div v-if="activeTab === 'custom'" class="tab-pane">
        <!-- Live Preview Card -->
        <div v-if="form.title || form.artist" class="live-preview-box">
          <span class="preview-tag font-mono">LIVE PREVIEW</span>
          <div class="preview-row">
            <ArtworkCover
              :src="form.coverImage"
              :alt="form.title"
              size="sm"
              :fallbackSeed="form.title || 'Track'"
            />
            <div class="preview-info">
              <span class="preview-title font-display">{{ form.title || 'Untitled Track' }}</span>
              <span class="preview-artist">{{ form.artist || 'Unknown Artist' }}</span>
              <span class="preview-provider font-mono" :class="previewProviderClass">
                {{ previewProviderName }}
              </span>
            </div>
          </div>
        </div>

        <form @submit.prevent="submitSong(false)" class="song-form">
          <div class="form-row">
            <div class="form-group flex-2">
              <label class="field-label">Track Title <span class="req">*</span></label>
              <input v-model="form.title" type="text" placeholder="e.g. Clair de Lune" class="sw-field" required />
            </div>
            <div class="form-group flex-2">
              <label class="field-label">Artist / Ensemble <span class="req">*</span></label>
              <input v-model="form.artist" type="text" placeholder="e.g. Claude Debussy" class="sw-field" required />
            </div>
          </div>

          <div class="form-row">
            <div class="form-group flex-2">
              <label class="field-label">Album / Collection</label>
              <input v-model="form.album" type="text" placeholder="e.g. Suite Bergamasque" class="sw-field" />
            </div>
            <div class="form-group flex-1">
              <label class="field-label">Duration (sec)</label>
              <input v-model.number="form.duration" type="number" min="0" placeholder="e.g. 302" class="sw-field tabular-nums" />
            </div>
          </div>

          <div class="form-group">
            <label class="field-label">Audio Stream URL or Web Link</label>
            <input
              v-model="form.url"
              type="text"
              placeholder="Direct MP3 URL, Internet Archive link, or Spotify link"
              class="sw-field"
            />
            <span class="field-hint">Direct .mp3 audio streams play natively in the persistent player; Spotify streams play via the integrated Spotify player.</span>
          </div>

          <div class="form-group">
            <label class="field-label">Cover Artwork URL</label>
            <input v-model="form.coverImage" type="text" placeholder="https://images.unsplash.com/..." class="sw-field" />
          </div>

          <div class="modal-footer">
            <button type="button" class="btn-cancel font-mono" @click="$emit('close')">Cancel</button>
            <button type="submit" class="btn-submit font-mono" :disabled="loading">
              <span v-if="loading">ADDING...</span>
              <span v-else>ADD TRACK</span>
            </button>
          </div>
        </form>
      </div>

      <!-- Tab 2: Curated Catalog -->
      <div v-else class="tab-pane catalog-pane">
        <p class="catalog-hint">
          Verified royalty-free streams with lossless metadata and immediate persistent playback:
        </p>
        <div class="catalog-grid">
          <div
            v-for="track in CURATED_DEMO_TRACKS"
            :key="track.title"
            class="catalog-item"
            @click="addCatalogTrack(track)"
          >
            <ArtworkCover
              :src="track.coverImage"
              :alt="track.title"
              size="xs"
              :fallbackSeed="track.title"
            />
            <div class="catalog-info">
              <div class="cat-title font-display">{{ track.title }}</div>
              <div class="cat-artist">{{ track.artist }} • <span class="tabular-nums font-mono">{{ formatDuration(track.duration) }}</span></div>
            </div>
            <button class="cat-add-btn font-mono" :disabled="loading" title="Add to playlist">+</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch } from 'vue';
import { usePlaylistStore } from '../../stores/playlist';
import { useToastStore } from '../../stores/toast';
import { CURATED_DEMO_TRACKS, formatDuration } from '../../data/demoTracks';
import { detectProviderType } from '../../services/providers/detector';
import ArtworkCover from '../common/ArtworkCover.vue';

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

const previewProviderType = computed(() => {
  return detectProviderType(form.url);
});

let resolveDebounceTimer = null;
const isResolving = ref(false);

const previewProviderName = computed(() => {
  if (isResolving.value) return 'RESOLVING LINK...';
  const t = previewProviderType.value;
  if (t === 'youtube') return 'YOUTUBE (UNSUPPORTED)';
  if (t === 'spotify') return 'SPOTIFY EMBED';
  if (t === 'direct') return 'DIRECT FLAC/MP3';
  return 'EXTERNAL AUDIO LINK';
});

const previewProviderClass = computed(() => {
  const t = previewProviderType.value;
  if (t === 'youtube') return 'prov-yt';
  if (t === 'spotify') return 'prov-sp';
  return 'prov-flac';
});

watch(
  () => form.url,
  (newVal) => {
    if (resolveDebounceTimer) clearTimeout(resolveDebounceTimer);
    const trimmed = (newVal || '').trim();
    if (!trimmed) return;

    const prov = detectProviderType(trimmed);
    if (prov === 'youtube' || prov === 'spotify') {
      resolveDebounceTimer = setTimeout(async () => {
        isResolving.value = true;
        try {
          const resolved = await playlistStore.resolveTrack(trimmed);
          if (resolved) {
            if (resolved.title && (!form.title.trim() || form.title === 'Untitled Track')) {
              form.title = resolved.title;
            }
            if (resolved.artist && (!form.artist.trim() || form.artist === 'Unknown Artist')) {
              form.artist = resolved.artist;
            }
            if (resolved.coverImage && !form.coverImage) {
              form.coverImage = resolved.coverImage;
            }
            if (resolved.duration && (!form.duration || form.duration === 0)) {
              form.duration = resolved.duration;
            }
          }
        } catch (e) {
          // Fallback: user retains manual entry
        } finally {
          isResolving.value = false;
        }
      }, 450);
    }
  }
);

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
  max-width: 620px;
  background: var(--sw-surface);
  border-radius: var(--sw-radius-xl);
  border: 1px solid var(--sw-border);
  box-shadow: 0 25px 60px rgba(0, 0, 0, 0.8);
  padding: 30px;
  max-height: 90vh;
  overflow-y: auto;
  color: var(--sw-text-primary);
  animation: modalPop 240ms var(--sw-ease-out);
}

@keyframes modalPop {
  from {
    opacity: 0;
    transform: scale(0.96) translateY(10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
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
  font-size: 1.45rem;
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

/* Tabs */
.modal-tabs {
  display: flex;
  background: var(--sw-surface-hover);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-md);
  padding: 3px;
  margin-bottom: 20px;
}

.tab-btn {
  flex: 1;
  padding: 8px 12px;
  border-radius: var(--sw-radius-sm);
  color: var(--sw-text-secondary);
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.tab-btn:hover {
  color: #fff;
}

.tab-btn.active {
  background: var(--sw-surface-active);
  color: var(--sw-accent);
}

/* Duplicate Alert */
.duplicate-alert {
  background: rgba(245, 158, 11, 0.12);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: var(--sw-radius-md);
  padding: 14px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.alert-content {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  font-size: 0.85rem;
  color: #fde68a;
}

.alert-icon {
  font-size: 1.2rem;
}

.alert-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
}

.btn-override {
  background: var(--sw-warm);
  color: #060709;
  border-radius: var(--sw-radius-sm);
  padding: 6px 14px;
  font-weight: 700;
  font-size: 0.75rem;
  cursor: pointer;
}

.btn-dismiss {
  background: transparent;
  color: var(--sw-text-muted);
  font-size: 0.75rem;
  padding: 6px 12px;
  cursor: pointer;
}

/* Live Preview Box */
.live-preview-box {
  background: var(--sw-surface-hover);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-md);
  padding: 12px;
  margin-bottom: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.preview-tag {
  font-size: 0.62rem;
  color: var(--sw-accent);
  letter-spacing: 0.08em;
}

.preview-row {
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

.preview-provider {
  font-size: 0.62rem;
  font-weight: 700;
  display: inline-block;
  margin-top: 2px;
}

.prov-flac { color: var(--sw-accent); }
.prov-yt { color: #fb7185; }
.prov-sp { color: #34d399; }

/* Form Fields */
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

.field-hint {
  font-size: 0.72rem;
  color: var(--sw-text-muted);
  line-height: 1.35;
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

/* Catalog tab */
.catalog-hint {
  font-size: 0.82rem;
  color: var(--sw-text-secondary);
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
  padding: 8px 12px;
  border-radius: var(--sw-radius-md);
  background: var(--sw-surface-hover);
  border: 1px solid var(--sw-border);
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.catalog-item:hover {
  background: var(--sw-surface-active);
  border-color: var(--sw-border-hover);
}

.catalog-info {
  flex: 1;
  min-width: 0;
}

.cat-title {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--sw-text-primary);
}

.cat-artist {
  font-size: 0.74rem;
  color: var(--sw-text-secondary);
}

.cat-add-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: var(--sw-accent);
  color: #060709;
  font-size: 1.1rem;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}
</style>
