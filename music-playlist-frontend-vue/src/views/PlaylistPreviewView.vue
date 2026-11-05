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
import { MOOD_PLAYLISTS } from '../data/moodPlaylists';
import FloatingPlayerDock from '../components/player/FloatingPlayerDock.vue';

const route = useRoute();
const router = useRouter();
const playerStore = usePlayerStore();
const toastStore = useToastStore();

const playlist = ref(null);
const isLoading = ref(true);
const error = ref(null);
const errorCode = ref(404);
const isForking = ref(false);

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

onMounted(() => {
  loadPlaylist();
});
</script>

<style scoped>
.pg-preview-root {
  min-height: 100vh;
  background-color: #0b0c10;
  color: #f1f1f1;
  padding: 1.5rem 1.5rem 8rem 1.5rem;
  box-sizing: border-box;
}

.preview-top-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 2rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}

.nav-pill {
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.12);
  border-radius: 999px;
  color: #00f2fe;
  text-decoration: none;
  font-size: 0.8rem;
  letter-spacing: 0.05em;
  transition: all 0.2s ease;
}

.nav-pill:hover {
  background: rgba(0, 242, 254, 0.1);
  border-color: #00f2fe;
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: #fff;
}

.preview-main {
  max-width: 1100px;
  margin: 0 auto;
}

.preview-loading, .preview-error {
  text-align: center;
  padding: 5rem 1rem;
}

.loading-spinner {
  width: 40px;
  height: 40px;
  border: 3px solid rgba(0, 242, 254, 0.2);
  border-top-color: #00f2fe;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1.5rem auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.error-glyph {
  font-size: 4rem;
  color: rgba(255, 0, 127, 0.6);
  margin-bottom: 0.5rem;
}

.error-title {
  font-size: 1.75rem;
  margin-bottom: 0.5rem;
  color: #fff;
}

.error-desc {
  color: rgba(255, 255, 255, 0.6);
  margin-bottom: 2rem;
  max-width: 500px;
  margin-left: auto;
  margin-right: auto;
}

.error-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.mixtape-header {
  display: flex;
  gap: 2.5rem;
  margin-bottom: 3rem;
  align-items: flex-start;
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 2rem;
}

.mixtape-artwork {
  width: 240px;
  height: 240px;
  flex-shrink: 0;
  border-radius: 12px;
  overflow: hidden;
  background: #151821;
  box-shadow: 0 12px 36px rgba(0, 0, 0, 0.5);
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
  font-size: 4rem;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.15);
  background: linear-gradient(135deg, #1e2230 0%, #0d0f17 100%);
}

.mixtape-meta {
  flex: 1;
}

.badge-row {
  display: flex;
  gap: 0.6rem;
  margin-bottom: 0.75rem;
  align-items: center;
}

.type-badge {
  background: rgba(0, 242, 254, 0.15);
  color: #00f2fe;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  border: 1px solid rgba(0, 242, 254, 0.3);
}

.fork-badge {
  background: rgba(255, 0, 127, 0.15);
  color: #ff007f;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  border: 1px solid rgba(255, 0, 127, 0.3);
}

.owner-badge {
  background: rgba(57, 255, 20, 0.15);
  color: #39ff14;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
}

.mixtape-title {
  font-size: 2.4rem;
  font-weight: 800;
  color: #fff;
  margin: 0 0 0.5rem 0;
  line-height: 1.1;
}

.curator-byline {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 1rem;
}

.curator-name {
  color: #00f2fe;
}

.meta-dot {
  margin: 0 0.5rem;
}

.mixtape-description {
  font-size: 1rem;
  line-height: 1.5;
  color: rgba(255, 255, 255, 0.75);
  margin-bottom: 1.25rem;
}

.mixtape-tags {
  display: flex;
  gap: 0.5rem;
  margin-bottom: 1.5rem;
  flex-wrap: wrap;
}

.tag-pill {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-size: 0.75rem;
}

.action-controls-bar {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  flex-wrap: wrap;
}

.cta-pill-filled {
  background: #00f2fe;
  color: #0b0c10;
  border: none;
  padding: 0.65rem 1.4rem;
  border-radius: 999px;
  font-weight: 700;
  font-size: 0.85rem;
  cursor: pointer;
  letter-spacing: 0.05em;
  text-decoration: none;
  transition: all 0.2s ease;
}

.cta-pill-filled:hover:not(:disabled) {
  box-shadow: 0 0 20px rgba(0, 242, 254, 0.5);
  transform: translateY(-1px);
}

.cta-pill-outline {
  background: rgba(255, 255, 255, 0.04);
  color: #fff;
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 0.65rem 1.2rem;
  border-radius: 999px;
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: none;
  letter-spacing: 0.05em;
  transition: all 0.2s ease;
}

.cta-pill-outline:hover:not(:disabled) {
  border-color: #00f2fe;
  color: #00f2fe;
}

.cta-pill-owner {
  background: rgba(57, 255, 20, 0.1);
  color: #39ff14;
  border: 1px solid rgba(57, 255, 20, 0.3);
  padding: 0.65rem 1.2rem;
  border-radius: 999px;
  font-size: 0.85rem;
  cursor: pointer;
  text-decoration: none;
  letter-spacing: 0.05em;
}

.tracklist-section {
  background: rgba(255, 255, 255, 0.02);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  overflow: hidden;
}

.tracklist-header {
  display: grid;
  grid-template-columns: 40px 3fr 2fr 1.5fr 80px 60px;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
}

.track-row {
  display: grid;
  grid-template-columns: 40px 3fr 2fr 1.5fr 80px 60px;
  align-items: center;
  padding: 0.9rem 1.5rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.04);
  cursor: pointer;
  transition: background-color 0.15s ease;
}

.track-row:hover {
  background: rgba(255, 255, 255, 0.04);
}

.track-row.is-active {
  background: rgba(0, 242, 254, 0.08);
}

.track-row.is-active .track-title-text {
  color: #00f2fe;
}

.col-num {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
}

.playing-equalizer {
  color: #00f2fe;
}

.col-title {
  display: flex;
  flex-direction: column;
}

.track-title-text {
  font-size: 0.95rem;
  font-weight: 600;
  color: #fff;
}

.track-album-sub {
  font-size: 0.75rem;
  color: rgba(255, 255, 255, 0.4);
}

.col-artist {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.9rem;
}

.source-badge {
  display: inline-block;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.65rem;
  text-decoration: none;
  font-weight: 700;
}

.badge-jamendo {
  background: rgba(255, 0, 127, 0.15);
  color: #ff007f;
  border: 1px solid rgba(255, 0, 127, 0.3);
  transition: all 0.2s ease;
}

.badge-jamendo:hover {
  background: #ff007f;
  color: #fff;
}

.badge-archive {
  background: rgba(0, 242, 254, 0.15);
  color: #00f2fe;
  border: 1px solid rgba(0, 242, 254, 0.3);
}

.badge-audius {
  background: rgba(204, 0, 255, 0.15);
  color: #cc00ff;
  border: 1px solid rgba(204, 0, 255, 0.3);
}

.badge-spotify {
  background: rgba(29, 185, 84, 0.15);
  color: #1db954;
  border: 1px solid rgba(29, 185, 84, 0.3);
}

.badge-direct {
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
}

.col-duration {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
}

.row-play-btn {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #00f2fe;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  transition: all 0.15s ease;
}

.row-play-btn:hover {
  background: #00f2fe;
  color: #0b0c10;
}

.empty-tracklist {
  padding: 4rem 1rem;
  text-align: center;
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.85rem;
  letter-spacing: 0.08em;
}

@media (max-width: 768px) {
  .mixtape-header {
    flex-direction: column;
    align-items: center;
    text-align: center;
  }
  .mixtape-artwork {
    width: 180px;
    height: 180px;
  }
  .badge-row, .curator-byline, .action-controls-bar {
    justify-content: center;
  }
  .tracklist-header, .track-row {
    grid-template-columns: 30px 2fr 1fr 40px;
  }
  .col-source, .col-duration {
    display: none;
  }
}
</style>
