<template>
  <AppModal
    :isOpen="isOpen"
    title="Add Audio Tracks"
    description="Search the catalog, pick from your liked tracks, or paste a music link."
    width="720px"
    @close="$emit('close')"
  >
    <div class="add-songs-drawer-content font-mono">
      <!-- Tabs Navigation -->
      <div class="drawer-tabs-header font-mono">
        <button
          type="button"
          class="tab-btn font-mono"
          :class="{ active: activeTab === 'search' }"
          @click="activeTab = 'search'"
        >
          🔍 1. SEARCH CATALOG
        </button>
        <button
          type="button"
          class="tab-btn font-mono"
          :class="{ active: activeTab === 'liked' }"
          @click="activeTab = 'liked'"
        >
          ♥ 2. LIKED TRACKS ({{ likedTracksList.length }})
        </button>
        <button
          type="button"
          class="tab-btn font-mono"
          :class="{ active: activeTab === 'link' }"
          @click="activeTab = 'link'"
        >
          🔗 3. PASTE A LINK
        </button>
      </div>

      <!-- TAB 1: SEARCH -->
      <div v-if="activeTab === 'search'" class="tab-pane">
        <div class="search-input-bar">
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Search by track name, artist, genre..."
            class="sw-text-input font-mono"
            @keydown.enter="handlePerformSearch"
            autofocus
          />
          <button
            type="button"
            class="btn-search-trigger font-mono"
            :disabled="isSearching"
            @click="handlePerformSearch"
          >
            {{ isSearching ? 'SEARCHING...' : 'SEARCH' }}
          </button>
        </div>

        <div v-if="isSearching" class="results-loading font-mono">
          Searching audio catalog...
        </div>

        <div v-else-if="searchResults.length === 0 && hasSearched" class="no-results font-mono">
          No tracks found for "{{ searchQuery }}".
        </div>

        <div v-else class="results-list">
          <div
            v-for="track in displaySearchTracks"
            :key="track.id || track._id"
            class="track-candidate-row"
          >
            <input
              type="checkbox"
              :value="track"
              v-model="selectedBatchTracks"
              class="candidate-checkbox"
            />
            <div class="candidate-cover">
              <img
                v-if="track.coverImage || track.artwork"
                :src="track.coverImage || track.artwork"
                :alt="track.title"
                class="cover-thumbnail"
              />
              <span v-else class="cover-fallback font-display">
                {{ (track.title || 'SW').substring(0, 2).toUpperCase() }}
              </span>
            </div>
            <div class="candidate-info">
              <span class="candidate-title font-display">{{ track.title }}</span>
              <span class="candidate-artist font-mono">{{ track.artist }}</span>
            </div>
            <span class="candidate-source-pill font-mono">
              {{ (track.provider || track.source?.provider || 'JAMENDO').toUpperCase() }}
            </span>
            <div class="candidate-action">
              <span v-if="isAdded(track)" class="badge-added font-mono">
                Added ✓
              </span>
              <div v-else-if="isInPlaylist(track)" class="already-added-wrap">
                <span class="badge-already font-mono">Already added</span>
                <button
                  type="button"
                  class="btn-add-anyway font-mono"
                  @click="handleAddTrack(track, true)"
                >
                  + Add anyway
                </button>
              </div>
              <button
                v-else
                type="button"
                class="btn-add-track font-mono"
                @click="handleAddTrack(track, false)"
              >
                ＋ ADD
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 2: LIKED TRACKS -->
      <div v-else-if="activeTab === 'liked'" class="tab-pane">
        <div v-if="likedTracksList.length === 0" class="no-results font-mono">
          You have no liked tracks yet. Like tracks with the heart icon to add them easily.
        </div>
        <div v-else class="results-list">
          <div
            v-for="track in likedTracksList"
            :key="track.id || track._id"
            class="track-candidate-row"
          >
            <input
              type="checkbox"
              :value="track"
              v-model="selectedBatchTracks"
              class="candidate-checkbox"
            />
            <div class="candidate-cover">
              <img
                v-if="track.coverImage || track.artwork"
                :src="track.coverImage || track.artwork"
                :alt="track.title"
                class="cover-thumbnail"
              />
              <span v-else class="cover-fallback font-display">
                {{ (track.title || 'SW').substring(0, 2).toUpperCase() }}
              </span>
            </div>
            <div class="candidate-info">
              <span class="candidate-title font-display">{{ track.title }}</span>
              <span class="candidate-artist font-mono">{{ track.artist }}</span>
            </div>
            <span class="candidate-source-pill font-mono">
              {{ (track.provider || track.source?.provider || 'JAMENDO').toUpperCase() }}
            </span>
            <div class="candidate-action">
              <span v-if="isAdded(track)" class="badge-added font-mono">
                Added ✓
              </span>
              <div v-else-if="isInPlaylist(track)" class="already-added-wrap">
                <span class="badge-already font-mono">Already added</span>
                <button
                  type="button"
                  class="btn-add-anyway font-mono"
                  @click="handleAddTrack(track, true)"
                >
                  + Add anyway
                </button>
              </div>
              <button
                v-else
                type="button"
                class="btn-add-track font-mono"
                @click="handleAddTrack(track, false)"
              >
                ＋ ADD
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- TAB 3: PASTE A LINK -->
      <div v-else-if="activeTab === 'link'" class="tab-pane">
        <div class="link-resolve-box">
          <label class="link-label font-mono">
            PASTE MUSIC SOURCE LINK (JAMENDO, AUDIUS, OR INTERNET ARCHIVE):
          </label>
          <div class="link-input-row">
            <input
              v-model="pasteUrl"
              type="url"
              placeholder="https://www.jamendo.com/track/..."
              class="sw-text-input font-mono"
              @keydown.enter="handleResolveLink"
            />
            <button
              type="button"
              class="btn-resolve font-mono"
              :disabled="isResolving || !pasteUrl.trim()"
              @click="handleResolveLink"
            >
              {{ isResolving ? 'RESOLVING...' : 'PREVIEW METADATA' }}
            </button>
          </div>
          <p v-if="resolveError" class="resolve-error-msg font-mono">
            {{ resolveError }}
          </p>
        </div>

        <!-- Resolved Preview Card -->
        <div v-if="resolvedTrack" class="resolved-preview-card font-mono">
          <div class="resolved-badge font-mono">METADATA RESOLVED ✓</div>
          <div class="resolved-content">
            <div class="candidate-cover lg">
              <img
                v-if="resolvedTrack.coverImage"
                :src="resolvedTrack.coverImage"
                :alt="resolvedTrack.title"
                class="cover-thumbnail"
              />
              <span v-else class="cover-fallback font-display">
                {{ (resolvedTrack.title || 'SW').substring(0, 2).toUpperCase() }}
              </span>
            </div>
            <div class="resolved-meta">
              <h4 class="resolved-title font-display">{{ resolvedTrack.title }}</h4>
              <p class="resolved-artist font-mono">Artist: {{ resolvedTrack.artist }}</p>
              <p v-if="resolvedTrack.provider" class="resolved-provider font-mono">
                Provider: {{ resolvedTrack.provider.toUpperCase() }}
              </p>
              <p v-if="resolvedTrack.license" class="resolved-license font-mono">
                License: {{ resolvedTrack.license }}
              </p>
            </div>
          </div>
          <div class="resolved-actions">
            <button
              type="button"
              class="btn-add-track font-mono"
              :disabled="isAddingTrack"
              @click="handleAddTrack(resolvedTrack, false)"
            >
              {{ isAdded(resolvedTrack) ? 'Added ✓' : '＋ ADD TO PLAYLIST' }}
            </button>
          </div>
        </div>
      </div>

      <!-- Batch Footer -->
      <div v-if="selectedBatchTracks.length > 0" class="drawer-batch-footer font-mono">
        <span>Selected {{ selectedBatchTracks.length }} tracks</span>
        <button
          type="button"
          class="btn-batch-add font-mono"
          :disabled="isBatchAdding"
          @click="handleBatchAdd"
        >
          {{ isBatchAdding ? 'ADDING...' : `ADD ${selectedBatchTracks.length} SONGS` }}
        </button>
      </div>
    </div>
  </AppModal>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import AppModal from '../common/AppModal.vue';
import { usePlaylistStore } from '../../stores/playlist';
import { useToastStore } from '../../stores/toast';
import { useUiStore } from '../../stores/ui';
import { searchApi } from '../../api/search';
import { FEATURED_SONGS } from '../../data/featuredSongs';

const props = defineProps({
  isOpen: {
    type: Boolean,
    default: true,
  },
  playlistId: {
    type: String,
    required: true,
  },
  existingSongs: {
    type: Array,
    default: () => [],
  },
});

const emit = defineEmits(['close', 'songs-added']);

const playlistStore = usePlaylistStore();
const toastStore = useToastStore();
const uiStore = useUiStore();

const activeTab = ref('search');
const searchQuery = ref('');
const isSearching = ref(false);
const hasSearched = ref(false);
const searchResults = ref([]);
const addedTrackIds = ref(new Set());
const selectedBatchTracks = ref([]);
const isBatchAdding = ref(false);
const isAddingTrack = ref(false);

// Link resolve state
const pasteUrl = ref('');
const isResolving = ref(false);
const resolveError = ref('');
const resolvedTrack = ref(null);

const displaySearchTracks = computed(() => {
  if (hasSearched.value) {
    return searchResults.value;
  }
  return FEATURED_SONGS.slice(0, 10);
});

// Canonical Liked tracks synced with uiStore
const likedTracksList = computed(() => uiStore.likedTracks);

const loadLikedTracks = () => {
  uiStore.loadFavorites();
};

const isInPlaylist = (track) => {
  const current = playlistStore.currentPlaylist?.songs || props.existingSongs || [];
  const trackId = track.id || track._id;
  const extId = track.providerTrackId || track.source?.externalId;
  const rawUrl = track.url || track.source?.url;

  return current.some((s) => {
    if (trackId && (s.id === trackId || s._id === trackId)) return true;
    if (extId && (s.providerTrackId === extId || s.source?.externalId === extId)) return true;
    if (rawUrl && (s.url === rawUrl || s.source?.url === rawUrl)) return true;
    if (
      s.title &&
      track.title &&
      s.artist &&
      track.artist &&
      s.title.toLowerCase() === track.title.toLowerCase() &&
      s.artist.toLowerCase() === track.artist.toLowerCase()
    ) {
      return true;
    }
    return false;
  });
};

const isAdded = (track) => {
  const id = track.id || track._id || track.url;
  return addedTrackIds.value.has(id);
};

const handlePerformSearch = async () => {
  const q = searchQuery.value.trim();
  if (!q) {
    searchResults.value = [];
    hasSearched.value = false;
    return;
  }

  isSearching.value = true;
  hasSearched.value = true;
  try {
    const data = await searchApi.search(q, { limit: 20 });
    const tracks = data.tracks || data.results || (Array.isArray(data) ? data : []);
    if (tracks.length > 0) {
      searchResults.value = tracks;
    } else {
      // Local fallback matching
      const lower = q.toLowerCase();
      searchResults.value = FEATURED_SONGS.filter(
        (t) =>
          t.title.toLowerCase().includes(lower) ||
          t.artist.toLowerCase().includes(lower) ||
          (t.genre && t.genre.toLowerCase().includes(lower))
      );
    }
  } catch {
    const lower = q.toLowerCase();
    searchResults.value = FEATURED_SONGS.filter(
      (t) =>
        t.title.toLowerCase().includes(lower) ||
        t.artist.toLowerCase().includes(lower) ||
        (t.genre && t.genre.toLowerCase().includes(lower))
    );
  } finally {
    isSearching.value = false;
  }
};

const formatSongPayload = (track) => {
  return {
    title: track.title || track.name,
    artist: track.artist || 'Unknown Artist',
    album: track.album || '',
    duration: track.duration || 0,
    url: track.url || track.streamUrl || '',
    coverImage: track.coverImage || track.artwork || '',
    provider: track.provider || track.source?.provider || 'direct',
    providerTrackId: track.providerTrackId || track.source?.externalId || null,
    source: track.source || undefined,
    license: track.license || undefined,
    licenseUrl: track.licenseUrl || undefined,
    attribution: track.attribution || undefined,
    isPreview: track.isPreview || undefined,
    previewDurationMs: track.previewDurationMs || undefined,
  };
};

const handleAddTrack = async (track, allowDuplicate = false) => {
  isAddingTrack.value = true;
  try {
    const payload = formatSongPayload(track);
    await playlistStore.addSong(props.playlistId, payload, allowDuplicate);
    const key = track.id || track._id || track.url;
    addedTrackIds.value.add(key);
    toastStore.show(`Added "${track.title}" to playlist!`, 'success');
    emit('songs-added');
  } catch (err) {
    if (err.response?.status === 409) {
      toastStore.show(`"${track.title}" is already in the playlist.`, 'warning');
    } else {
      toastStore.show(err.response?.data?.message || 'Failed to add track', 'error');
    }
  } finally {
    isAddingTrack.value = false;
  }
};

const handleBatchAdd = async () => {
  if (selectedBatchTracks.value.length === 0) return;
  isBatchAdding.value = true;
  try {
    const payloads = selectedBatchTracks.value.map(formatSongPayload);
    const res = await playlistStore.addSongs(props.playlistId, payloads);
    const addedCount = res?.added?.length || payloads.length;
    const dupCount = res?.duplicates?.length || 0;
    if (dupCount > 0) {
      toastStore.show(`Added ${addedCount} songs (${dupCount} duplicate${dupCount > 1 ? 's' : ''} skipped)`, 'success');
    } else {
      toastStore.show(`Added ${addedCount} songs to playlist!`, 'success');
    }
    selectedBatchTracks.value.forEach((t) => {
      addedTrackIds.value.add(t.id || t._id || t.url);
    });
    selectedBatchTracks.value = [];
    emit('songs-added');
  } catch (err) {
    toastStore.show(err.response?.data?.message || 'Failed to batch add songs', 'error');
  } finally {
    isBatchAdding.value = false;
  }
};

const handleResolveLink = async () => {
  const url = pasteUrl.value.trim();
  if (!url) return;
  isResolving.value = true;
  resolveError.value = '';
  resolvedTrack.value = null;
  try {
    const resolved = await playlistStore.resolveTrack(url);
    resolvedTrack.value = {
      title: resolved.title || 'Untitled Track',
      artist: resolved.artist || 'Unknown Artist',
      album: resolved.album || '',
      duration: resolved.duration || 0,
      url: resolved.url || url,
      coverImage: resolved.coverImage || '',
      provider: resolved.provider || 'direct',
      providerTrackId: resolved.providerTrackId || null,
      license: resolved.license || '',
      source: resolved.source || undefined,
    };
  } catch (err) {
    resolveError.value =
      err.response?.data?.message ||
      'Could not resolve link metadata. Please check the URL format.';
  } finally {
    isResolving.value = false;
  }
};

onMounted(() => {
  loadLikedTracks();
});
</script>

<style scoped>
.add-songs-drawer-content {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

/* Tabs */
.drawer-tabs-header {
  display: flex;
  border-bottom: 2px solid #111111;
  gap: 8px;
  padding-bottom: 12px;
  flex-wrap: wrap;
}

.tab-btn {
  padding: 8px 14px;
  background: #FFFFFF;
  border: 2px solid #111111;
  box-shadow: 2px 2px 0 #111111;
  font-family: var(--font-mono, monospace);
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
  color: #111111;
  border-radius: 0;
  text-transform: uppercase;
  letter-spacing: 0.04em;
  transition: transform 0.08s ease, box-shadow 0.08s ease, background-color 0.08s ease;
}

.tab-btn:hover {
  background-color: #FFFDF8;
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #111111;
}

.tab-btn.active {
  color: #111111;
  background-color: #FFD84A;
  border-color: #111111;
  box-shadow: 2px 2px 0 #111111;
  font-weight: 900;
  transform: none;
}

.tab-pane {
  min-height: 280px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

/* Search Bar */
.search-input-bar {
  display: flex;
  gap: 8px;
}

.sw-text-input {
  flex: 1;
  padding: 10px 14px;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
  background-color: #FFFFFF;
  font-family: var(--font-mono, monospace);
  font-size: 0.88rem;
  font-weight: 600;
  color: #111111;
  border-radius: 0;
  transition: box-shadow 0.08s ease, background-color 0.08s ease;
}

.sw-text-input:focus {
  outline: none;
  background-color: #FFFDE6;
  box-shadow: 4px 4px 0 #111111;
}

.btn-search-trigger {
  padding: 10px 18px;
  background-color: #FFD84A;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
  color: #111111;
  font-family: var(--font-mono, monospace);
  font-weight: 900;
  font-size: 0.82rem;
  cursor: pointer;
  text-transform: uppercase;
  border-radius: 0;
  transition: transform 0.08s ease, box-shadow 0.08s ease, background-color 0.08s ease;
}

.btn-search-trigger:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #111111;
  background-color: #FFE066;
}

.btn-search-trigger:active:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #111111;
}

.btn-search-trigger:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.results-loading,
.no-results {
  text-align: center;
  padding: 40px 20px;
  color: #555555;
  font-size: 0.9rem;
  font-weight: 700;
  background: #FFFDF8;
  border: 2px dashed #111111;
}

/* Candidate Row */
.results-list {
  max-height: 320px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
}

.track-candidate-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  background-color: #FFFFFF;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
  border-radius: 0;
  transition: background-color 0.08s ease;
}

.track-candidate-row:hover {
  background-color: #FFFDF8;
}

.candidate-checkbox {
  width: 18px;
  height: 18px;
  cursor: pointer;
  accent-color: #111111;
}

.candidate-cover {
  width: 42px;
  height: 42px;
  border: 2px solid #111111;
  box-shadow: 2px 2px 0 #111111;
  overflow: hidden;
  background-color: #FFD84A;
  flex-shrink: 0;
  border-radius: 0;
}

.candidate-cover.lg {
  width: 64px;
  height: 64px;
}

.cover-thumbnail {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  font-weight: 900;
  color: #111111;
}

.candidate-info {
  flex: 1;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.candidate-title {
  font-family: var(--font-display, "Bricolage Grotesque", sans-serif);
  font-size: 0.92rem;
  font-weight: 800;
  color: #111111;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.candidate-artist {
  font-family: var(--font-mono, monospace);
  font-size: 0.78rem;
  font-weight: 600;
  color: #666666;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.candidate-source-pill {
  font-family: var(--font-mono, monospace);
  font-size: 0.68rem;
  font-weight: 800;
  padding: 2px 6px;
  border: 1.5px solid #111111;
  box-shadow: 1.5px 1.5px 0 #111111;
  background-color: #EFEAE1;
  color: #111111;
  border-radius: 0;
}

.candidate-action {
  display: flex;
  align-items: center;
  gap: 6px;
}

.btn-add-track {
  background-color: #5DE3A6;
  color: #111111;
  border: 2px solid #111111;
  box-shadow: 2px 2px 0 #111111;
  padding: 6px 12px;
  font-family: var(--font-mono, monospace);
  font-size: 0.78rem;
  font-weight: 900;
  cursor: pointer;
  text-transform: uppercase;
  border-radius: 0;
  transition: transform 0.08s ease, box-shadow 0.08s ease, background-color 0.08s ease;
}

.btn-add-track:hover {
  background-color: #4BD898;
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #111111;
}

.btn-add-track:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #111111;
}

.badge-added {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  font-weight: 900;
  color: #111111;
  background-color: #5DE3A6;
  border: 1.5px solid #111111;
  box-shadow: 1.5px 1.5px 0 #111111;
  padding: 4px 8px;
  border-radius: 0;
}

.already-added-wrap {
  display: flex;
  align-items: center;
  gap: 4px;
}

.badge-already {
  font-family: var(--font-mono, monospace);
  font-size: 0.72rem;
  font-weight: 700;
  color: #666666;
}

.btn-add-anyway {
  background: #FFFFFF;
  border: 1.5px solid #111111;
  box-shadow: 1.5px 1.5px 0 #111111;
  font-family: var(--font-mono, monospace);
  font-size: 0.7rem;
  font-weight: 800;
  color: #111111;
  cursor: pointer;
  padding: 3px 8px;
  border-radius: 0;
  transition: background-color 0.08s ease;
}

.btn-add-anyway:hover {
  background-color: #FFD84A;
}

/* Link Tab */
.link-resolve-box {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.link-label {
  font-family: var(--font-mono, monospace);
  font-size: 0.75rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: #111111;
}

.link-input-row {
  display: flex;
  gap: 8px;
}

.btn-resolve {
  padding: 10px 18px;
  background-color: #FFD84A;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
  color: #111111;
  font-family: var(--font-mono, monospace);
  font-weight: 900;
  font-size: 0.82rem;
  text-transform: uppercase;
  cursor: pointer;
  border-radius: 0;
  transition: transform 0.08s ease, box-shadow 0.08s ease, background-color 0.08s ease;
}

.btn-resolve:hover:not(:disabled) {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #111111;
  background-color: #FFE066;
}

.btn-resolve:active:not(:disabled) {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #111111;
}

.resolve-error-msg {
  color: #FF6B5E;
  font-size: 0.82rem;
  font-weight: 700;
  margin: 0;
}

.resolved-preview-card {
  border: 3px solid #111111;
  box-shadow: 4px 4px 0 #111111;
  padding: 16px;
  background-color: #FFFFFF;
  display: flex;
  flex-direction: column;
  gap: 12px;
  border-radius: 0;
}

.resolved-badge {
  font-family: var(--font-mono, monospace);
  font-size: 0.72rem;
  font-weight: 900;
  color: #111111;
  background: #5DE3A6;
  border: 1.5px solid #111111;
  padding: 2px 6px;
  display: inline-block;
  align-self: flex-start;
}

.resolved-content {
  display: flex;
  gap: 14px;
  align-items: center;
}

.resolved-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.resolved-title {
  font-family: var(--font-display, "Bricolage Grotesque", sans-serif);
  font-size: 1.15rem;
  font-weight: 900;
  color: #111111;
  margin: 0;
}

.resolved-artist,
.resolved-provider,
.resolved-license {
  font-family: var(--font-mono, monospace);
  font-size: 0.8rem;
  color: #555555;
  margin: 0;
}

.resolved-actions {
  display: flex;
  justify-content: flex-end;
}

/* Batch Footer */
.drawer-batch-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 18px;
  background-color: #FFD84A;
  border: 2px solid #111111;
  box-shadow: 4px 4px 0 #111111;
  font-family: var(--font-mono, monospace);
  font-weight: 800;
  margin-top: 10px;
  border-radius: 0;
}

.btn-batch-add {
  padding: 8px 18px;
  background-color: #111111;
  color: #FFD84A;
  border: 2px solid #111111;
  box-shadow: 2px 2px 0 #111111;
  font-family: var(--font-mono, monospace);
  font-weight: 900;
  font-size: 0.82rem;
  cursor: pointer;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  border-radius: 0;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

.btn-batch-add:hover {
  background-color: #222222;
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #111111;
}

.btn-batch-add:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #111111;
}
</style>
