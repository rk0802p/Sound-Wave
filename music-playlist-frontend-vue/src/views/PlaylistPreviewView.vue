<template>
  <div class="pg-preview-root">
    <!-- Top Nav -->
    <nav class="preview-top-nav">
      <router-link to="/explore" class="nav-pill font-mono">
        ← BACK TO EXPLORE
      </router-link>
      <div class="nav-brand font-display">
        <span class="orb-icon">📼</span>
        <span>SOUNDWAVE MIXTAPE PREVIEW</span>
      </div>
      <router-link to="/" class="nav-pill font-mono">
        HOMEPAGE ↗
      </router-link>
    </nav>

    <!-- Main Content -->
    <main class="preview-main">
      <!-- Loading State -->
      <div v-if="isLoading" class="preview-loading font-mono">
        <div class="loading-spinner"></div>
        <span>RETRIEVING MIXTAPE FREQUENCIES...</span>
      </div>

      <!-- Private or Error State -->
      <div v-else-if="error" class="preview-error font-mono">
        <div class="error-glyph font-display">{{ errorCode }}</div>
        <h2 class="error-title font-display">{{ errorCode === 400 ? "Invalid Mixtape Link" : errorCode === 404 ? "Mixtape Not Found" : "Mixtape Restricted" }}</h2>
        <p class="error-desc">{{ error }}</p>
        <div class="error-actions">
          <router-link to="/login" class="cta-pill-filled font-mono">
            LOG IN TO SOUNDWAVE
          </router-link>
          <router-link to="/explore" class="cta-pill-outline font-mono">
            EXPLORE PUBLIC MIXTAPES
          </router-link>
        </div>
      </div>

      <!-- Loaded Playlist View -->
      <div v-else-if="playlist" class="mixtape-presentation">
        <!-- Editorial Header Stage -->
        <header class="mixtape-header">
          <div class="mixtape-artwork">
            <img
              v-if="playlist.coverImage"
              :src="playlist.coverImage"
              :alt="playlist.name"
              class="artwork-img"
              @error="handleImgError($event)"
            />
            <div v-else class="artwork-fallback font-display">
              {{ playlist.name.substring(0, 2).toUpperCase() }}
            </div>
          </div>

          <div class="mixtape-meta">
            <div class="badge-row font-mono">
              <span class="type-badge">PUBLIC MIXTAPE</span>
              <span v-if="playlist.forkCount > 0" class="fork-badge">🍴 {{ playlist.forkCount }} FORKS</span>
              <span v-if="playlist.isOwner" class="owner-badge">YOU OWN THIS</span>
            </div>

            <h1 class="mixtape-title font-display">{{ playlist.name }}</h1>

            <div class="curator-byline font-mono">
              CURATED BY <span class="curator-name">@{{ playlist.creator?.username || 'Soundwave Curator' }}</span>
              <span class="meta-dot">•</span>
              <span>{{ playlist.songs?.length || 0 }} TRACKS</span>
            </div>

            <p v-if="playlist.description" class="mixtape-description">
              {{ playlist.description }}
            </p>

            <!-- Tags -->
            <div v-if="playlist.tags && playlist.tags.length" class="mixtape-tags font-mono">
              <span v-for="tag in playlist.tags" :key="tag" class="tag-pill">#{{ tag }}</span>
            </div>

            <!-- Action Controls Bar -->
            <div class="action-controls-bar font-mono">
              <button
                class="cta-pill-filled"
                :disabled="!playlist.songs || playlist.songs.length === 0"
                @click="playAll"
              >
                ▶ PLAY MIXTAPE
              </button>

              <button
                class="cta-pill-outline"
                :disabled="isForking"
                @click="forkMixtape"
              >
                <span v-if="isForking">FORKING...</span>
                <span v-else>🍴 FORK TO LIBRARY</span>
              </button>

              <button
                class="cta-pill-outline"
                @click="copyShareLink"
              >
                🔗 COPY SHARE LINK
              </button>

              <router-link
                v-if="playlist.isOwner"
                :to="'/?playlist=' + playlist._id + '#lists'"
                class="cta-pill-owner"
              >
                ✏️ EDIT IN LIBRARY
              </router-link>

              <button
                v-if="playlist.isOwner"
                class="cta-pill-danger"
                :disabled="isDeletingPlaylist"
                @click="deleteCurrentPlaylist"
                title="Delete this mixtape permanently"
              >
                <span v-if="isDeletingPlaylist">DELETING...</span>
                <span v-else>🗑️ DELETE PLAYLIST</span>
              </button>
            </div>
          </div>
        </header>

        <!-- Tracklist Section -->
        <section class="tracklist-section">
          <div class="tracklist-header font-mono">
            <span class="col-num">#</span>
            <span class="col-title">TITLE</span>
            <span class="col-artist">ARTIST</span>
            <span class="col-source">SOURCE</span>
            <span class="col-duration">TIME</span>
            <span class="col-action">PLAY</span>
            <span v-if="playlist.isOwner" class="col-delete">REMOVE</span>
          </div>

          <div v-if="!playlist.songs || playlist.songs.length === 0" class="empty-tracklist font-mono">
            NO AUDIO FREQUENCIES IN THIS MIXTAPE YET.
          </div>

          <div v-else class="track-rows">
            <div
              v-for="(track, index) in playlist.songs"
              :key="track._id || index"
              class="track-row"
              :class="{ 'is-active': isCurrentTrack(track) }"
              @click="playSingleTrack(track, index)"
            >
              <div class="col-num font-mono">
                <span v-if="isCurrentTrack(track) && playerStore.isPlaying" class="playing-equalizer">▶</span>
                <span v-else>{{ index + 1 }}</span>
              </div>

              <div class="col-title">
                <span class="track-title-text font-display">{{ track.title }}</span>
                <span v-if="track.album" class="track-album-sub font-mono">{{ track.album }}</span>
              </div>

              <div class="col-artist">
                <span class="artist-text">{{ track.artist }}</span>
              </div>

              <div class="col-source font-mono">
                <a
                  v-if="getProviderName(track) === 'jamendo'"
                  :href="getTrackSourceUrl(track)"
                  target="_blank"
                  rel="noopener noreferrer"
                  class="source-badge badge-jamendo"
                  title="Creative Commons music on Jamendo"
                  @click.stop
                >
                  ↗ JAMENDO
                </a>
                <span
                  v-else-if="getProviderName(track) === 'spotify'"
                  class="source-badge badge-spotify"
                  title="Spotify Track (Metadata)"
                >
                  SPOTIFY
                </span>
                <span v-else class="source-badge badge-direct">
                  DIRECT
                </span>
              </div>

              <div class="col-duration font-mono">
                {{ formatDuration(track.duration) }}
              </div>

              <div class="col-action">
                <button
                  class="row-play-btn"
                  title="Play Track"
                  @click.stop="playSingleTrack(track, index)"
                >
                  {{ isCurrentTrack(track) && playerStore.isPlaying ? '⏸' : '▶' }}
                </button>
              </div>

              <div v-if="playlist.isOwner" class="col-delete">
                <button
                  class="row-delete-btn"
                  title="Remove track from playlist"
                  @click.stop="removeTrackFromPlaylist(track)"
                >
                  ✕
                </button>
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>

    <!-- Floating Player Dock -->
    <FloatingPlayerDock />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { playlistApi } from '../api/playlists';
import { usePlayerStore } from '../stores/player';
import { useToastStore } from '../stores/toast';
import { usePlaylistStore } from '../stores/playlist';
import { MOOD_PLAYLISTS } from '../data/moodPlaylists';
import FloatingPlayerDock from '../components/player/FloatingPlayerDock.vue';

const route = useRoute();
const router = useRouter();
const playerStore = usePlayerStore();
const playlistStore = usePlaylistStore();
const toastStore = useToastStore();

const playlist = ref(null);
const isLoading = ref(true);
const error = ref(null);
const errorCode = ref(404);
const isForking = ref(false);
const isDeletingPlaylist = ref(false);

const loadPlaylist = async () => {
  const id = route.params.id;
  if (!id) {
    error.value = 'No playlist ID specified';
    isLoading.value = false;
    return;
  }

  isLoading.value = true;
  error.value = null;

  try {
    const data = await playlistApi.getPlaylistById(id);
    playlist.value = data;
  } catch (err) {
    console.error('Error fetching playlist preview:', err);
    errorCode.value = err.response?.status || 404;

    // Check if requested ID matches a curated mood playlist
    const moodMatch = MOOD_PLAYLISTS.find(
      (m) => m._id === id || m.id === id || `archive-${m._id}` === id || m._id === String(id).replace(/^archive-/, '')
    );
    if (moodMatch) {
      playlist.value = {
        ...moodMatch,
        creator: { username: 'Soundwave Curator' },
        isPublic: true,
        forkCount: 0,
      };
      error.value = null;
      return;
    }

    if (err.response?.status === 401) {
      errorCode.value = 401;
      error.value = 'Authentication required to view this private mixtape.';
    } else if (err.response?.status === 403) {
      errorCode.value = 403;
      error.value = 'This mixtape is private or requires authorization to view.';
    } else if (err.response?.status === 404) {
      errorCode.value = 404;
      error.value = 'Mixtape not found or has been removed.';
    } else if (err.response?.status === 400) {
      errorCode.value = 400;
      error.value = err.response?.data?.message || 'Invalid playlist ID format.';
    } else {
      errorCode.value = err.response?.status || 500;
      error.value = err.response?.data?.message || 'Failed to load mixtape preview';
    }
  } finally {
    isLoading.value = false;
  }
};

const getProviderName = (track) => {
  return (track.source?.provider || track.provider || 'direct').toLowerCase();
};

const getTrackSourceUrl = (track) => {
  const prov = getProviderName(track);
  const extId = track.source?.externalId || track.externalId;
  if (prov === 'jamendo') {
    if (extId) return `https://www.jamendo.com/track/${extId}`;
    if (track.source?.url && !track.source.url.includes('storage.jamendo.com')) return track.source.url;
    return 'https://www.jamendo.com';
  }
  return track.source?.url || track.url || '#';
};

const formatDuration = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const isCurrentTrack = (track) => {
  return (
    playerStore.currentTrack &&
    (playerStore.currentTrack._id === track._id ||
      (playerStore.currentTrack.title === track.title &&
        playerStore.currentTrack.artist === track.artist))
  );
};

const formatQueue = (songs) => {
  return songs.map((s, idx) => ({
    ...s,
    id: s._id || `preview-${playlist.value._id}-${idx}`,
    title: s.title,
    artist: s.artist,
    url: s.url || s.source?.url || '',
    streamUrl: s.url || s.source?.url || '',
    source: s.source || { provider: 'direct' },
    provider: s.source?.provider || 'direct',
    coverImage: s.coverImage || playlist.value?.coverImage || '',
    duration: s.duration || 180,
  }));
};

const playAll = () => {
  if (!playlist.value?.songs || playlist.value.songs.length === 0) return;
  const queue = formatQueue(playlist.value.songs);
  playerStore.playTrack(queue[0], queue, 0);
  toastStore.show(`Playing: ${playlist.value.name}`, 'success');
};

const playSingleTrack = (track, index) => {
  if (isCurrentTrack(track)) {
    playerStore.togglePlay();
    return;
  }
  const queue = formatQueue(playlist.value.songs);
  playerStore.playTrack(queue[index], queue, index);
};

const forkMixtape = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    toastStore.show('Please log in to fork mixtapes into your library', 'info');
    router.push({ name: 'Login', query: { redirect: `/playlist/${playlist.value._id}` } });
    return;
  }

  isForking.value = true;
  try {
    const forked = await playlistApi.forkPlaylist(playlist.value._id);
    playlist.value.forkCount = (playlist.value.forkCount || 0) + 1;
    toastStore.show(`Forked "${playlist.value.name}" to your library!`, 'success');
  } catch (err) {
    console.error('Fork error:', err);
    toastStore.show(err.response?.data?.message || 'Failed to fork mixtape', 'error');
  } finally {
    isForking.value = false;
  }
};

const copyShareLink = async () => {
  const url = window.location.href;
  if (typeof window !== 'undefined') {
    window.__lastCopiedShareUrl = url;
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      toastStore.show('Shareable mixtape link copied to clipboard!', 'success');
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toastStore.show('Shareable mixtape link copied to clipboard!', 'success');
    }
  } catch (e) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toastStore.show('Shareable mixtape link copied to clipboard!', 'success');
    } catch (err2) {
      prompt('Copy mixtape link:', url);
    }
  }
};

const handleImgError = (event) => {
  event.target.style.display = 'none';
};

const removeTrackFromPlaylist = async (track) => {
  if (!playlist.value?._id) return;
  const trackId = track?._id || track?.id;
  const trackTitle = track?.title || 'this track';
  if (!confirm(`Remove "${trackTitle}" from "${playlist.value.name}"?`)) return;

  try {
    await playlistStore.removeSong(playlist.value._id, trackId);
    if (playlist.value.songs) {
      playlist.value.songs = playlist.value.songs.filter((s) => (s._id || s.id) !== trackId);
    }
    toastStore.show(`Removed "${trackTitle}" from mixtape`, 'success');
  } catch (err) {
    console.error('Error removing song from playlist:', err);
    toastStore.show(err.response?.data?.message || 'Failed to remove song from mixtape', 'error');
  }
};

const deleteCurrentPlaylist = async () => {
  if (!playlist.value?._id) return;
  const name = playlist.value.name || 'this mixtape';
  if (!confirm(`Are you sure you want to permanently delete the playlist "${name}"? This action cannot be undone.`)) {
    return;
  }

  isDeletingPlaylist.value = true;
  try {
    await playlistStore.deletePlaylist(playlist.value._id);
    toastStore.show(`Deleted playlist "${name}"`, 'success');
    router.push('/explore');
  } catch (err) {
    console.error('Error deleting playlist:', err);
    toastStore.show(err.response?.data?.message || 'Failed to delete playlist', 'error');
  } finally {
    isDeletingPlaylist.value = false;
  }
};

onMounted(() => {
  loadPlaylist();
});
</script>

<style scoped>
.pg-preview-root {
  min-height: 100vh;
  background-color: var(--bg, #F3EFE8);
  color: var(--ink, #111111);
  padding: 1.5rem 2rem calc(var(--player-h, 88px) + 2.5rem);
  box-sizing: border-box;
  font-family: var(--font-body);
}

.preview-top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: var(--bw, 2px) solid var(--border, #111111);
}

.nav-pill {
  padding: 0.45rem 1rem;
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
  border-radius: var(--r-pill, 999px);
  color: var(--ink, #111111);
  text-decoration: none;
  font-size: 0.8rem;
  font-weight: 800;
  letter-spacing: 0.05em;
  transition: transform 0.08s ease;
}

.nav-pill:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.nav-pill:hover {
  background: var(--yellow, #FFD84A);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.25rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  color: var(--ink, #111111);
  text-transform: uppercase;
}

.preview-main {
  max-width: 1200px;
  margin: 0 auto;
}

.preview-loading, .preview-error {
  text-align: center;
  padding: 6rem 1rem;
  color: var(--ink-muted, #4A4740);
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid #EFEAE1;
  border-top-color: var(--ink, #111111);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1.5rem auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-glyph {
  font-size: 4rem;
  font-weight: 900;
  color: var(--danger, #E5372B);
  margin-bottom: 1rem;
}

.error-title {
  font-size: 1.8rem;
  font-weight: 900;
  color: var(--ink, #111111);
  margin-bottom: 0.75rem;
}

.error-desc {
  max-width: 480px;
  margin: 0 auto 2rem auto;
  font-size: 1rem;
  color: var(--ink-muted, #4A4740);
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.cta-pill-filled, .cta-pill-outline {
  padding: 0.65rem 1.5rem;
  border-radius: var(--r-sm, 8px);
  font-size: 0.85rem;
  font-weight: 800;
  text-decoration: none;
  cursor: pointer;
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
}

.cta-pill-filled {
  background: var(--yellow, #FFD84A);
  color: var(--ink, #111111);
}

.cta-pill-outline {
  background: var(--surface-2, #FFFFFF);
  color: var(--ink, #111111);
}

.mixtape-header {
  display: flex;
  gap: 2.5rem;
  align-items: center;
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-lg, 8px 8px 0 var(--border, #111111));
  border-radius: var(--r-lg, 18px);
  padding: 2.5rem;
  margin-bottom: 2.5rem;
}

.mixtape-artwork {
  width: 220px;
  height: 220px;
  flex-shrink: 0;
  border: var(--bw, 2px) solid var(--border, #111111);
  border-radius: var(--r-md, 12px);
  overflow: hidden;
  background: var(--c-sun, #FFD84A);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
}

.artwork-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.artwork-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3.5rem;
  font-weight: 900;
  color: var(--ink, #111111);
}

.mixtape-meta {
  flex: 1;
  min-width: 0;
}

.badge-row {
  display: flex;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.type-badge {
  background: var(--mint, #5DE3A6);
  color: var(--ink, #111111);
  padding: 0.25rem 0.65rem;
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 800;
  border: 1.5px solid var(--border, #111111);
}

.fork-badge {
  background: var(--c-hotpink, #FF4F9A);
  color: #FFFFFF;
  padding: 0.25rem 0.65rem;
  border-radius: 4px;
  font-size: 0.72rem;
  font-weight: 800;
  border: 1.5px solid var(--border, #111111);
}

.mixtape-title {
  font-size: 2.5rem;
  font-weight: 900;
  letter-spacing: -0.04em;
  color: var(--ink, #111111);
  margin: 0 0 0.5rem 0;
  text-transform: uppercase;
}

.mixtape-desc {
  font-size: 1rem;
  color: var(--ink-muted, #4A4740);
  line-height: 1.5;
  margin-bottom: 1rem;
}

.stats-row {
  display: flex;
  gap: 1.5rem;
  font-size: 0.82rem;
  color: var(--ink-muted, #4A4740);
  font-weight: 700;
  margin-bottom: 1.5rem;
}

.stats-row b {
  color: var(--ink, #111111);
}

.curator-tag {
  color: var(--c-blue, #4D6BFF);
}

.mixtape-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.header-btn {
  padding: 0.65rem 1.4rem;
  border-radius: var(--r-sm, 8px);
  font-weight: 800;
  font-size: 0.85rem;
  cursor: pointer;
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
  transition: transform 0.08s ease;
}

.header-btn:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.play-all-btn {
  background: var(--yellow, #FFD84A);
  color: var(--ink, #111111);
}

.fork-all-btn {
  background: var(--surface-2, #FFFFFF);
  color: var(--ink, #111111);
}

.share-all-btn {
  background: var(--surface-2, #FFFFFF);
  color: var(--ink, #111111);
}

.delete-mixtape-btn {
  background: var(--surface-2, #FFFFFF);
  color: var(--danger, #E5372B);
  border-color: var(--danger, #E5372B);
}

.delete-mixtape-btn:hover {
  background: var(--danger, #E5372B);
  color: #FFFFFF;
}

.fork-origin-callout {
  background: #EFEAE1;
  border: 1.5px solid var(--border, #111111);
  padding: 0.85rem 1.25rem;
  border-radius: var(--r-sm, 8px);
  margin-bottom: 2rem;
  font-size: 0.85rem;
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.origin-link {
  color: var(--c-blue, #4D6BFF);
  font-weight: 800;
  text-decoration: underline;
}

.tracklist-section {
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-md, 5px 5px 0 var(--border, #111111));
  border-radius: var(--r-lg, 18px);
  padding: 1.5rem;
}

.tracklist-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-bottom: var(--bw, 2px) solid var(--border, #111111);
  padding-bottom: 1rem;
  margin-bottom: 1rem;
}

.tracklist-title {
  font-size: 1.2rem;
  font-weight: 900;
  letter-spacing: -0.02em;
}

.track-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  border: 1.5px solid transparent;
  border-radius: var(--r-sm, 8px);
  transition: all 0.1s ease;
  cursor: pointer;
}

.track-row:hover {
  background: #EFEAE1;
  border-color: var(--border, #111111);
}

.track-row.is-current {
  background: rgba(77, 107, 255, 0.12);
  border-color: var(--c-blue, #4D6BFF);
}

.track-idx {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--ink-muted, #4A4740);
  width: 28px;
}

.track-info {
  flex: 1;
  min-width: 0;
}

.track-name {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--ink, #111111);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-artist {
  font-size: 0.85rem;
  color: var(--ink-muted, #4A4740);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-meta {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.track-time {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--ink-muted, #4A4740);
}

.track-remove-btn {
  background: none;
  border: 1.5px solid var(--border, #111111);
  width: 26px;
  height: 26px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  color: var(--danger, #E5372B);
  font-weight: 900;
  font-size: 0.75rem;
}

.track-remove-btn:hover {
  background: var(--danger, #E5372B);
  color: #FFFFFF;
}

.tracklist-empty {
  text-align: center;
  padding: 4rem 1rem;
  color: var(--ink-muted, #4A4740);
}

@media (max-width: 768px) {
  .mixtape-header {
    flex-direction: column;
    padding: 1.5rem;
  }
  .mixtape-artwork {
    width: 140px;
    height: 140px;
  }
  .mixtape-title {
    font-size: 1.8rem;
  }
}
</style>