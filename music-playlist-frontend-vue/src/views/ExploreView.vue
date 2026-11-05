<template>
  <div class="pg-explore-root">
    <!-- Top Navigation -->
    <nav class="explore-top-nav">
      <router-link to="/" class="nav-pill font-mono">
        ← BACK TO HOMEPAGE
      </router-link>
      <div class="nav-brand font-display">
        <span class="orb-icon">🌐</span>
        <span>SOUNDWAVE SOCIAL DISCOVERY</span>
      </div>
      <router-link to="/search" class="nav-pill font-mono">
        ONLINE SEARCH ↗
      </router-link>
    </nav>

    <!-- Header Stage -->
    <header class="explore-header">
      <div class="kicker-strip font-mono">
        <span class="kicker-tag">PUBLIC MIXTAPE EXPLORER</span>
        <span class="kicker-sub">COMMUNITY CURATIONS • FORKABLE FREQUENCIES • OPEN AUDIO</span>
      </div>

      <div class="explore-search-bar">
        <svg class="search-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Filter public mixtapes by title, description, or track artist..."
          class="search-input font-display"
          @input="handleSearchInput"
        />
        <button v-if="searchQuery" class="clear-btn font-mono" @click="clearSearch">✕</button>
      </div>

      <!-- Filters & Sorting Bar -->
      <div class="filters-bar font-mono">
        <div class="filter-group">
          <span class="filter-label">PROVIDER:</span>
          <button
            v-for="prov in providers"
            :key="prov.id"
            class="filter-chip"
            :class="{ 'is-active': selectedProvider === prov.id }"
            @click="setProvider(prov.id)"
          >
            {{ prov.name }}
          </button>
        </div>

        <div class="sort-group">
          <span class="filter-label">SORT:</span>
          <button
            class="filter-chip"
            :class="{ 'is-active': sortBy === 'newest' }"
            @click="setSort('newest')"
          >
            Newest
          </button>
          <button
            class="filter-chip"
            :class="{ 'is-active': sortBy === 'forks' }"
            @click="setSort('forks')"
          >
            Most Forked 🔥
          </button>
          <button
            class="filter-chip"
            :class="{ 'is-active': sortBy === 'updated' }"
            @click="setSort('updated')"
          >
            Updated
          </button>
        </div>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="explore-content">
      <!-- Loading State -->
      <div v-if="isLoading" class="explore-loading font-mono">
        <div class="loading-spinner"></div>
        <span>TUNING INTO COMMUNITY FREQUENCIES...</span>
      </div>

      <!-- Error State -->
      <div v-else-if="error" class="explore-error font-mono">
        <p class="error-msg">⚠️ {{ error }}</p>
        <button class="retry-btn" @click="fetchPlaylists">RETRY CONNECTION</button>
      </div>

      <!-- Zero Results State -->
      <div v-else-if="playlists.length === 0" class="explore-empty font-mono">
        <div class="empty-icon font-display">00</div>
        <h3 class="empty-title font-display">No Public Mixtapes Found</h3>
        <p class="empty-desc">No public playlists match your current filter. Try adjusting your search query or provider filter.</p>
        <button class="reset-btn" @click="resetFilters">RESET FILTERS</button>
      </div>

      <!-- Playlists Grid -->
      <div v-else class="playlists-grid">
        <article
          v-for="pl in playlists"
          :key="pl._id"
          class="mixtape-card"
        >
          <!-- Card Media -->
          <div class="card-media" @click="openPreview(pl._id)">
            <img
              v-if="pl.coverImage"
              :src="pl.coverImage"
              :alt="pl.name"
              class="cover-img"
              loading="lazy"
              @error="handleImgError($event)"
            />
            <div v-else class="cover-fallback font-display">
              <span>{{ pl.name.substring(0, 2).toUpperCase() }}</span>
            </div>
            <div class="media-overlay">
              <button
                class="play-overlay-btn"
                title="Play Mixtape"
                @click.stop="playMixtape(pl)"
              >
                ▶
              </button>
            </div>
            <div class="track-count-badge font-mono">
              {{ pl.songs?.length || 0 }} TRACKS
            </div>
            <div v-if="pl.forkCount > 0" class="fork-count-badge font-mono">
              🍴 {{ pl.forkCount }}
            </div>
          </div>

          <!-- Card Content -->
          <div class="card-body">
            <h3 class="card-title font-display" @click="openPreview(pl._id)">
              {{ pl.name }}
            </h3>
            <div class="card-curator font-mono">
              CURATED BY <span class="curator-name">@{{ pl.creator?.username || 'Soundwave Curator' }}</span>
            </div>
            <p v-if="pl.description" class="card-desc">
              {{ pl.description }}
            </p>

            <!-- Card Tags -->
            <div v-if="pl.tags && pl.tags.length" class="card-tags font-mono">
              <span v-for="tag in pl.tags.slice(0, 3)" :key="tag" class="tag-chip">
                #{{ tag }}
              </span>
            </div>

            <!-- Card Actions -->
            <div class="card-actions font-mono">
              <button
                class="action-btn play-btn"
                @click="playMixtape(pl)"
                title="Play all tracks"
              >
                ▶ PLAY
              </button>
              <button
                class="action-btn fork-btn"
                :disabled="isForking[pl._id]"
                @click="forkMixtape(pl)"
                title="Fork to your library"
              >
                <span v-if="isForking[pl._id]">FORKING...</span>
                <span v-else>🍴 FORK</span>
              </button>
              <button
                class="action-btn share-btn"
                @click="shareMixtape(pl)"
                title="Copy share link"
              >
                🔗 SHARE
              </button>
              <router-link
                :to="'/playlist/' + pl._id"
                class="action-btn view-btn"
              >
                VIEW →
              </router-link>
            </div>
          </div>
        </article>
      </div>

      <!-- Pagination -->
      <div v-if="pagination.totalPages > 1" class="explore-pagination font-mono">
        <button
          class="page-nav-btn"
          :disabled="pagination.page <= 1"
          @click="changePage(pagination.page - 1)"
        >
          ← PREVIOUS
        </button>
        <span class="page-indicator">
          PAGE {{ pagination.page }} OF {{ pagination.totalPages }} ({{ pagination.total }} MIXTAPES)
        </span>
        <button
          class="page-nav-btn"
          :disabled="pagination.page >= pagination.totalPages"
          @click="changePage(pagination.page + 1)"
        >
          NEXT →
        </button>
      </div>
    </main>

    <!-- Floating Player Dock -->
    <FloatingPlayerDock />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { playlistApi } from '../api/playlists';
import { usePlayerStore } from '../stores/player';
import { useToastStore } from '../stores/toast';
import FloatingPlayerDock from '../components/player/FloatingPlayerDock.vue';

const router = useRouter();
const playerStore = usePlayerStore();
const toastStore = useToastStore();

const searchQuery = ref('');
const selectedProvider = ref('all');
const sortBy = ref('newest');
const isLoading = ref(false);
const error = ref(null);
const playlists = ref([]);
const isForking = reactive({});

const pagination = reactive({
  page: 1,
  limit: 12,
  total: 0,
  totalPages: 1,
});

const providers = [
  { id: 'all', name: 'All Networks' },
  { id: 'jamendo', name: 'Jamendo CC' },
  { id: 'spotify', name: 'Spotify' },
];

let searchDebounceTimer = null;

const fetchPlaylists = async () => {
  isLoading.value = true;
  error.value = null;

  try {
    const params = {
      page: pagination.page,
      limit: pagination.limit,
      sort: sortBy.value,
    };

    if (searchQuery.value && searchQuery.value.trim()) {
      params.search = searchQuery.value.trim();
    }
    if (selectedProvider.value && selectedProvider.value !== 'all') {
      params.provider = selectedProvider.value;
    }

    const res = await playlistApi.getPublicExplore(params);
    playlists.value = res.playlists || [];
    if (res.pagination) {
      pagination.page = res.pagination.page;
      pagination.limit = res.pagination.limit;
      pagination.total = res.pagination.total;
      pagination.totalPages = res.pagination.totalPages;
    }
  } catch (err) {
    console.error('Error fetching public playlists:', err);
    error.value = err.response?.data?.message || 'Failed to load public mixtapes';
  } finally {
    isLoading.value = false;
  }
};

const handleSearchInput = () => {
  clearTimeout(searchDebounceTimer);
  searchDebounceTimer = setTimeout(() => {
    pagination.page = 1;
    fetchPlaylists();
  }, 350);
};

const clearSearch = () => {
  searchQuery.value = '';
  pagination.page = 1;
  fetchPlaylists();
};

const setProvider = (providerId) => {
  selectedProvider.value = providerId;
  pagination.page = 1;
  fetchPlaylists();
};

const setSort = (sortOption) => {
  sortBy.value = sortOption;
  pagination.page = 1;
  fetchPlaylists();
};

const resetFilters = () => {
  searchQuery.value = '';
  selectedProvider.value = 'all';
  sortBy.value = 'newest';
  pagination.page = 1;
  fetchPlaylists();
};

const changePage = (newPage) => {
  if (newPage < 1 || newPage > pagination.totalPages) return;
  pagination.page = newPage;
  fetchPlaylists();
  window.scrollTo({ top: 0, behavior: 'smooth' });
};

const openPreview = (playlistId) => {
  router.push(`/playlist/${playlistId}`);
};

const playMixtape = (pl) => {
  if (!pl.songs || pl.songs.length === 0) {
    toastStore.show('This mixtape has no songs yet', 'info');
    return;
  }

  const formattedQueue = pl.songs.map((s, idx) => ({
    ...s,
    id: s._id || `explore-${pl._id}-${idx}`,
    title: s.title,
    artist: s.artist,
    url: s.url || s.source?.url || '',
    streamUrl: s.url || s.source?.url || '',
    source: s.source || { provider: 'direct' },
    provider: s.source?.provider || 'direct',
    coverImage: s.coverImage || pl.coverImage || '',
    duration: s.duration || 180,
  }));

  playerStore.playTrack(formattedQueue[0], formattedQueue, 0);
  toastStore.show(`Now playing: ${pl.name} (${formattedQueue.length} tracks)`, 'success');
};

const forkMixtape = async (pl) => {
  const token = localStorage.getItem('token');
  if (!token) {
    toastStore.show('Please log in to fork mixtapes into your library', 'info');
    router.push({ name: 'Login', query: { redirect: `/playlist/${pl._id}` } });
    return;
  }

  isForking[pl._id] = true;
  try {
    const forked = await playlistApi.forkPlaylist(pl._id);
    pl.forkCount = (pl.forkCount || 0) + 1;
    toastStore.show(`Forked "${pl.name}" to your library!`, 'success');
  } catch (err) {
    console.error('Fork error:', err);
    toastStore.show(err.response?.data?.message || 'Failed to fork playlist', 'error');
  } finally {
    isForking[pl._id] = false;
  }
};

const shareMixtape = async (pl) => {
  const url = `${window.location.origin}/playlist/${pl._id}`;
  if (typeof window !== 'undefined') {
    window.__lastCopiedShareUrl = url;
  }
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(url);
      toastStore.show(`Mixtape link copied to clipboard!`, 'success');
    } else {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toastStore.show(`Mixtape link copied to clipboard!`, 'success');
    }
  } catch (e) {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = url;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      toastStore.show(`Mixtape link copied to clipboard!`, 'success');
    } catch (err2) {
      prompt('Copy mixtape link:', url);
    }
  }
};

const handleImgError = (event) => {
  event.target.style.display = 'none';
};

onMounted(() => {
  fetchPlaylists();
});
</script>

<style scoped>
.pg-explore-root {
  min-height: 100vh;
  background-color: #0b0c10;
  color: #f1f1f1;
  padding: 1.5rem 1.5rem 8rem 1.5rem;
  box-sizing: border-box;
}

.explore-top-nav {
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

.explore-header {
  max-width: 1200px;
  margin: 0 auto 2.5rem auto;
}

.kicker-strip {
  display: flex;
  align-items: center;
  gap: 1rem;
  font-size: 0.75rem;
  margin-bottom: 1rem;
  flex-wrap: wrap;
}

.kicker-tag {
  background: #ff007f;
  color: #fff;
  padding: 0.2rem 0.6rem;
  border-radius: 4px;
  font-weight: 700;
}

.kicker-sub {
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.08em;
}

.explore-search-bar {
  display: flex;
  align-items: center;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: 12px;
  padding: 0.75rem 1.25rem;
  margin-bottom: 1.5rem;
  transition: border-color 0.2s ease;
}

.explore-search-bar:focus-within {
  border-color: #00f2fe;
  box-shadow: 0 0 15px rgba(0, 242, 254, 0.2);
}

.search-icon {
  color: rgba(255, 255, 255, 0.4);
  margin-right: 0.75rem;
}

.search-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 1.1rem;
}

.clear-btn {
  background: none;
  border: none;
  color: rgba(255, 255, 255, 0.4);
  font-size: 1rem;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
}

.clear-btn:hover {
  color: #fff;
}

.filters-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1.5rem;
  flex-wrap: wrap;
  font-size: 0.8rem;
}

.filter-group, .sort-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.filter-label {
  color: rgba(255, 255, 255, 0.4);
  font-size: 0.75rem;
  letter-spacing: 0.08em;
}

.filter-chip {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: rgba(255, 255, 255, 0.7);
  padding: 0.35rem 0.75rem;
  border-radius: 999px;
  cursor: pointer;
  font-size: 0.75rem;
  transition: all 0.2s ease;
}

.filter-chip:hover {
  border-color: rgba(255, 255, 255, 0.3);
  color: #fff;
}

.filter-chip.is-active {
  background: #00f2fe;
  color: #0b0c10;
  border-color: #00f2fe;
  font-weight: 700;
}

.explore-content {
  max-width: 1200px;
  margin: 0 auto;
}

.explore-loading, .explore-error, .explore-empty {
  text-align: center;
  padding: 5rem 1rem;
  color: rgba(255, 255, 255, 0.6);
}

.loading-spinner {
  width: 36px;
  height: 36px;
  border: 3px solid rgba(0, 242, 254, 0.2);
  border-top-color: #00f2fe;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
  margin: 0 auto 1.5rem auto;
}

@keyframes spin {
  to { transform: rotate(360deg); }
}

.empty-icon {
  font-size: 4rem;
  color: rgba(255, 255, 255, 0.1);
  margin-bottom: 1rem;
}

.empty-title {
  font-size: 1.5rem;
  color: #fff;
  margin-bottom: 0.5rem;
}

.empty-desc {
  max-width: 400px;
  margin: 0 auto 1.5rem auto;
  font-size: 0.9rem;
}

.reset-btn, .retry-btn {
  background: #00f2fe;
  color: #0b0c10;
  border: none;
  padding: 0.6rem 1.25rem;
  border-radius: 6px;
  font-weight: 700;
  cursor: pointer;
  letter-spacing: 0.05em;
}

.playlists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
}

.mixtape-card {
  background: rgba(255, 255, 255, 0.03);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: transform 0.2s ease, border-color 0.2s ease, box-shadow 0.2s ease;
}

.mixtape-card:hover {
  transform: translateY(-4px);
  border-color: rgba(0, 242, 254, 0.4);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.4);
}

.card-media {
  position: relative;
  width: 100%;
  aspect-ratio: 16 / 10;
  background: #151821;
  cursor: pointer;
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.3s ease;
}

.mixtape-card:hover .cover-img {
  transform: scale(1.05);
}

.cover-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 800;
  color: rgba(255, 255, 255, 0.2);
  background: linear-gradient(135deg, #1e2230 0%, #0d0f17 100%);
}

.media-overlay {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  opacity: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: opacity 0.2s ease;
}

.card-media:hover .media-overlay {
  opacity: 1;
}

.play-overlay-btn {
  width: 52px;
  height: 52px;
  border-radius: 50%;
  background: #00f2fe;
  color: #0b0c10;
  border: none;
  font-size: 1.4rem;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 4px 16px rgba(0, 242, 254, 0.4);
  transition: transform 0.15s ease;
}

.play-overlay-btn:hover {
  transform: scale(1.1);
}

.track-count-badge {
  position: absolute;
  top: 0.5rem;
  left: 0.5rem;
  background: rgba(0, 0, 0, 0.7);
  color: #fff;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.65rem;
  letter-spacing: 0.05em;
}

.fork-count-badge {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  background: rgba(255, 0, 127, 0.8);
  color: #fff;
  padding: 0.2rem 0.5rem;
  border-radius: 4px;
  font-size: 0.65rem;
  font-weight: 700;
}

.card-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  flex: 1;
}

.card-title {
  font-size: 1.15rem;
  font-weight: 700;
  color: #fff;
  margin: 0 0 0.35rem 0;
  cursor: pointer;
  transition: color 0.15s ease;
}

.card-title:hover {
  color: #00f2fe;
}

.card-curator {
  font-size: 0.7rem;
  color: rgba(255, 255, 255, 0.4);
  margin-bottom: 0.6rem;
  letter-spacing: 0.05em;
}

.curator-name {
  color: #00f2fe;
}

.card-desc {
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.7);
  line-height: 1.4;
  margin: 0 0 1rem 0;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  flex: 1;
}

.card-tags {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  margin-bottom: 1rem;
}

.tag-chip {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.6);
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
  font-size: 0.65rem;
}

.card-actions {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  padding-top: 0.85rem;
  margin-top: auto;
}

.action-btn {
  flex: 1;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 0.45rem 0.25rem;
  border-radius: 6px;
  font-size: 0.7rem;
  cursor: pointer;
  text-align: center;
  text-decoration: none;
  transition: all 0.15s ease;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.25);
}

.play-btn {
  background: rgba(0, 242, 254, 0.12);
  border-color: rgba(0, 242, 254, 0.3);
  color: #00f2fe;
}

.play-btn:hover {
  background: #00f2fe;
  color: #0b0c10;
}

.fork-btn {
  background: rgba(255, 0, 127, 0.1);
  border-color: rgba(255, 0, 127, 0.3);
  color: #ff007f;
}

.fork-btn:hover:not(:disabled) {
  background: #ff007f;
  color: #fff;
}

.fork-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.explore-pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1.5rem;
  margin-top: 3rem;
  padding-top: 1.5rem;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  font-size: 0.8rem;
}

.page-nav-btn {
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #00f2fe;
  padding: 0.5rem 1rem;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.page-nav-btn:hover:not(:disabled) {
  background: rgba(0, 242, 254, 0.1);
  border-color: #00f2fe;
}

.page-nav-btn:disabled {
  opacity: 0.3;
  cursor: not-allowed;
}

.page-indicator {
  color: rgba(255, 255, 255, 0.5);
  letter-spacing: 0.05em;
}

@media (max-width: 768px) {
  .explore-top-nav {
    flex-direction: column;
    gap: 1rem;
    align-items: flex-start;
  }
  .filters-bar {
    flex-direction: column;
    align-items: flex-start;
  }
  .playlists-grid {
    grid-template-columns: 1fr;
  }
}
</style>
