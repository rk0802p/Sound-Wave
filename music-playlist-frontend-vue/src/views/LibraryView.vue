<template>
  <div class="pg-library-root">
    <!-- Header with Archival Metrics -->
    <header class="pg-library-header">
      <div class="header-titles">
        <div class="header-kicker font-mono">
          <span class="kicker-tag">MIXTAPE VAULT</span>
          <span class="kicker-sub">EST. 2026 // PHYSICAL ARCHIVES</span>
        </div>
        <h1 class="header-title font-display">The Mixtape Vault.</h1>
        <p class="header-desc">
          Your personal repository of curated analog sound collections, physical vinyl records, and streaming frequencies.
        </p>
      </div>

      <div class="header-actions-cluster">
        <div class="vault-counter-box font-mono">
          <div class="counter-cell">
            <span class="counter-num font-display">{{ playlistStore.playlists.length }}</span>
            <span class="counter-label">MIXTAPES</span>
          </div>
          <div class="counter-divider"></div>
          <div class="counter-cell">
            <span class="counter-num font-display accent-coral">{{ playlistStore.totalTracksCount }}</span>
            <span class="counter-label">TRACKS</span>
          </div>
        </div>

        <button class="create-btn font-display" @click="showCreateModal = true">
          <span class="btn-icon">+</span>
          <span>New Mixtape</span>
        </button>
      </div>
    </header>

    <!-- Archival Control Island: Search, Sort, View Switcher -->
    <div class="pg-control-island">
      <!-- Search Filter Capsule -->
      <div class="search-capsule">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Filter mixtapes by title or description..."
          class="filter-input font-mono"
        />
        <button v-if="searchQuery" class="clear-search-btn" @click="searchQuery = ''" aria-label="Clear filter">✕</button>
      </div>

      <!-- Controls: Sort & Mode Switcher -->
      <div class="island-right-controls">
        <div class="sort-box font-mono">
          <span class="sort-tag">SORT</span>
          <select v-model="sortBy" class="sort-dropdown font-mono">
            <option value="updated">Recently Updated</option>
            <option value="created">Recently Created</option>
            <option value="name">Title (A–Z)</option>
            <option value="tracks">Track Count</option>
          </select>
        </div>

        <div class="view-switcher-box">
          <button
            class="view-mode-btn"
            :class="{ 'is-active': viewMode === 'crate' }"
            @click="viewMode = 'crate'"
            title="Vinyl Crate Mode"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span class="desktop-only font-mono">Crate</span>
          </button>

          <button
            class="view-mode-btn"
            :class="{ 'is-active': viewMode === 'ledger' }"
            @click="viewMode = 'ledger'"
            title="Ledger Mode"
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
              <line x1="8" y1="6" x2="21" y2="6"></line>
              <line x1="8" y1="12" x2="21" y2="12"></line>
              <line x1="8" y1="18" x2="21" y2="18"></line>
              <line x1="3" y1="6" x2="3.01" y2="6"></line>
              <line x1="3" y1="12" x2="3.01" y2="12"></line>
              <line x1="3" y1="18" x2="3.01" y2="18"></line>
            </svg>
            <span class="desktop-only font-mono">Ledger</span>
          </button>
        </div>
      </div>
    </div>

    <!-- Skeletons While Loading -->
    <div v-if="playlistStore.loading" class="crate-grid">
      <div v-for="i in 6" :key="i" class="crate-skeleton-card"></div>
    </div>

    <!-- No Match Found -->
    <div
      v-else-if="sortedPlaylists.length === 0 && searchQuery"
      class="empty-search-card"
    >
      <div class="empty-icon font-mono">NO RESULTS</div>
      <h3 class="empty-title font-display">No Mixtapes Match "{{ searchQuery }}"</h3>
      <p class="empty-desc">Check your spelling or reset the filter to view all archived collections.</p>
      <button class="clear-btn font-mono" @click="searchQuery = ''">Reset Filter</button>
    </div>

    <!-- Empty Vault -->
    <div
      v-else-if="sortedPlaylists.length === 0 && !searchQuery"
      class="empty-vault-card"
    >
      <div class="vault-empty-art font-display">00</div>
      <h3 class="vault-empty-title font-display">Your Mixtape Vault is Empty.</h3>
      <p class="vault-empty-desc">
        Start forging your personal music archives, or load our handcrafted studio demo playlists.
      </p>
      <div class="vault-actions-row">
        <button class="create-btn font-display" @click="showCreateModal = true">
          + Create First Mixtape
        </button>
        <button
          class="demo-btn font-mono"
          :disabled="seeding"
          @click="seedStarter"
        >
          {{ seeding ? 'Seeding Studio...' : 'Load Curated Analog Starter' }}
        </button>
      </div>
    </div>

    <!-- Crate Poster Mode Grid -->
    <div v-else-if="viewMode === 'crate'" class="crate-grid">
      <div
        v-for="(playlist, index) in sortedPlaylists"
        :key="playlist._id"
        class="crate-card"
        @click="openPlaylist(playlist._id)"
      >
        <div class="crate-sleeve-stage">
          <!-- Protruding Vinyl Disc -->
          <div
            class="crate-vinyl-disc"
            :class="{ 'is-spinning': isPlaylistActive(playlist) && playerStore.isPlaying }"
          >
            <div class="disc-label font-mono">SW</div>
          </div>

          <!-- Front Sleeve Cover -->
          <div class="crate-cover-sleeve">
            <img
              v-if="playlist.coverImage"
              :src="playlist.coverImage"
              :alt="playlist.name"
              class="sleeve-art"
              loading="lazy"
            />
            <div v-else class="sleeve-generative font-display">
              {{ playlist.name?.slice(0, 2).toUpperCase() || 'SW' }}
            </div>
            <button
              class="sleeve-play-btn"
              @click.stop="handleQuickPlay(playlist)"
              :title="isPlaylistActive(playlist) && playerStore.isPlaying ? 'Pause' : 'Play Mixtape'"
            >
              {{ isPlaylistActive(playlist) && playerStore.isPlaying ? '❚❚' : '▶' }}
            </button>
          </div>
        </div>

        <div class="crate-info-row">
          <div class="crate-meta-top">
            <span class="crate-index font-mono">VOL. {{ String(index + 1).padStart(2, '0') }}</span>
            <span class="crate-track-count font-mono">{{ playlist.songs?.length || 0 }} TRACKS</span>
          </div>
          <h3 class="crate-title font-display">{{ playlist.name }}</h3>
          <p v-if="playlist.description" class="crate-description">{{ playlist.description }}</p>
        </div>
      </div>
    </div>

    <!-- Ledger Mode Table -->
    <div v-else class="ledger-container">
      <div class="ledger-header-row font-mono">
        <span class="col-num">#</span>
        <span class="col-title">MIXTAPE TITLE</span>
        <span class="col-tracks">TRACKS</span>
        <span class="col-date">UPDATED</span>
        <span class="col-action">ACTION</span>
      </div>

      <div class="ledger-rows-list">
        <div
          v-for="(playlist, idx) in sortedPlaylists"
          :key="playlist._id"
          class="ledger-row-item"
          @click="openPlaylist(playlist._id)"
        >
          <span class="col-num font-mono">{{ String(idx + 1).padStart(2, '0') }}</span>

          <div class="col-title ledger-title-cell">
            <div class="ledger-thumb-box">
              <img
                v-if="playlist.coverImage"
                :src="playlist.coverImage"
                :alt="playlist.name"
                class="ledger-thumb"
              />
              <div v-else class="ledger-fallback font-display">
                {{ playlist.name?.slice(0, 2).toUpperCase() || 'SW' }}
              </div>
            </div>
            <div class="ledger-name-block">
              <span class="ledger-playlist-name font-display">{{ playlist.name }}</span>
              <span v-if="playlist.description" class="ledger-playlist-desc">{{ playlist.description }}</span>
            </div>
          </div>

          <span class="col-tracks font-mono">{{ playlist.songs?.length || 0 }} Tracks</span>
          <span class="col-date font-mono">{{ formatDate(playlist.updatedAt || playlist.createdAt) }}</span>

          <div class="col-action" @click.stop>
            <button
              class="ledger-play-btn"
              @click="handleQuickPlay(playlist)"
              :title="isPlaylistActive(playlist) && playerStore.isPlaying ? 'Pause' : 'Play'"
            >
              {{ isPlaylistActive(playlist) && playerStore.isPlaying ? '❚❚' : '▶' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Modals -->
    <CreatePlaylistModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onCreated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { usePlaylistStore } from '../stores/playlist';
import { usePlayerStore } from '../stores/player';
import { useToastStore } from '../stores/toast';
import CreatePlaylistModal from '../components/playlists/CreatePlaylistModal.vue';
import { CURATED_DEMO_TRACKS, PLAYLIST_COVER_PRESETS } from '../data/demoTracks';

const router = useRouter();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();
const toastStore = useToastStore();

const searchQuery = ref('');
const sortBy = ref('updated');
const viewMode = ref('crate'); // 'crate' | 'ledger'
const showCreateModal = ref(false);
const seeding = ref(false);

const isPlaylistActive = (playlist) => {
  return playerStore.currentPlaylistId === playlist._id;
};

const formatDate = (dateStr) => {
  if (!dateStr) return 'Recently';
  const d = new Date(dateStr);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const sortedPlaylists = computed(() => {
  let list = [...playlistStore.playlists];

  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }

  if (sortBy.value === 'name') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy.value === 'tracks') {
    list.sort((a, b) => (b.songs?.length || 0) - (a.songs?.length || 0));
  } else if (sortBy.value === 'created') {
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } else {
    list.sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
  }

  return list;
});

const openPlaylist = (id) => {
  router.push(`/playlists/${id}`);
};

const handleQuickPlay = (playlist) => {
  if (!playlist.songs || !playlist.songs.length) {
    toastStore.info(`"${playlist.name}" is empty`);
    router.push(`/playlists/${playlist._id}`);
    return;
  }
  if (isPlaylistActive(playlist) && playerStore.isPlaying) {
    playerStore.togglePlay();
  } else {
    playerStore.playTrack(playlist.songs[0], playlist, playlist.songs);
    toastStore.info(`Playing "${playlist.name}"`);
  }
};

const onCreated = (newPlaylist) => {
  showCreateModal.value = false;
  toastStore.success(`Created mixtape "${newPlaylist.name}"`);
  router.push(`/playlists/${newPlaylist._id}`);
};

const seedStarter = async () => {
  seeding.value = true;
  try {
    const starter = await playlistStore.createPlaylist({
      name: 'Nocturnal Resonance Atelier',
      description: 'Handcrafted selection of verified high-fidelity ambient, classical, and electronic audio streams.',
      coverImage: PLAYLIST_COVER_PRESETS[1].url,
      isPublic: true,
      songs: CURATED_DEMO_TRACKS,
    });
    toastStore.success('Generated starter mixtape with playable audio!');
    router.push(`/playlists/${starter._id}`);
  } catch (err) {
    toastStore.error(err.response?.data?.message || 'Failed to generate starter');
  } finally {
    seeding.value = false;
  }
};

onMounted(async () => {
  await playlistStore.fetchPlaylists();
});
</script>

<style scoped>
.pg-library-root {
  display: flex;
  flex-direction: column;
  gap: 36px;
  padding-bottom: 40px;
}

/* 1. Header */
.pg-library-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
  padding-top: 10px;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.header-kicker {
  display: flex;
  align-items: center;
  gap: 8px;
}

.kicker-tag {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 3px 8px;
  background: var(--pg-coral);
  color: #fff;
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
}

.kicker-sub {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--pg-ink-secondary);
}

.header-title {
  font-size: clamp(2.4rem, 5vw, 4.2rem);
  font-weight: 800;
  line-height: 1.05;
  color: var(--pg-ink);
  letter-spacing: -0.04em;
}

.header-desc {
  font-size: 1rem;
  color: var(--pg-ink-secondary);
  max-width: 600px;
  line-height: 1.5;
}

.header-actions-cluster {
  display: flex;
  align-items: center;
  gap: 16px;
}

.vault-counter-box {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 18px;
  background: var(--pg-canvas);
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-lg);
  box-shadow: 2px 2px 0px var(--pg-border);
}

.counter-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.counter-num {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--pg-cobalt);
}

.counter-num.accent-coral {
  color: var(--pg-coral);
}

.counter-label {
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--pg-ink-muted);
}

.counter-divider {
  width: 2px;
  height: 28px;
  background: var(--pg-border);
  opacity: 0.2;
}

.create-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  background: var(--pg-cobalt);
  color: #fff;
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  font-size: 0.92rem;
  font-weight: 800;
  cursor: pointer;
  box-shadow: var(--pg-shadow-solid);
  transition: all var(--pg-transition-spring);
}

.create-btn:hover {
  background: var(--pg-coral);
  transform: translate(-2px, -2px);
  box-shadow: var(--pg-shadow-solid-lg);
}

.btn-icon {
  font-size: 1.1rem;
}

/* 2. Control Island */
.pg-control-island {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.search-capsule {
  flex: 1;
  min-width: 280px;
  max-width: 520px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: var(--pg-canvas);
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  box-shadow: 2px 2px 0px var(--pg-border);
}

.search-icon {
  color: var(--pg-ink-secondary);
  flex-shrink: 0;
}

.filter-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 0.88rem;
  color: var(--pg-ink);
}

.clear-search-btn {
  color: var(--pg-ink-muted);
  font-size: 0.8rem;
  cursor: pointer;
}

.island-right-controls {
  display: flex;
  align-items: center;
  gap: 12px;
}

.sort-box {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: var(--pg-canvas);
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  box-shadow: 2px 2px 0px var(--pg-border);
  font-size: 0.78rem;
}

.sort-tag {
  font-weight: 800;
  color: var(--pg-ink-muted);
}

.sort-dropdown {
  background: transparent;
  border: none;
  outline: none;
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--pg-ink);
  cursor: pointer;
}

.view-switcher-box {
  display: flex;
  align-items: center;
  background: var(--pg-canvas);
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  padding: 3px;
  box-shadow: 2px 2px 0px var(--pg-border);
}

.view-mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 5px 12px;
  border-radius: var(--pg-radius-full);
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--pg-ink-secondary);
  cursor: pointer;
  transition: all var(--pg-transition-spring);
}

.view-mode-btn.is-active {
  background: var(--pg-ink);
  color: var(--pg-canvas);
}

/* 3. Crate Mode Grid */
.crate-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 28px;
}

.crate-card {
  background: var(--pg-canvas);
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-xl);
  box-shadow: var(--pg-shadow-solid);
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  cursor: pointer;
  transition: all var(--pg-transition-spring);
}

.crate-card:hover {
  transform: translate(-3px, -3px);
  box-shadow: var(--pg-shadow-solid-lg);
}

.crate-sleeve-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
}

.crate-vinyl-disc {
  position: absolute;
  top: 0;
  left: 20px;
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #14101E;
  border: 2px solid var(--pg-border);
  box-shadow: var(--pg-shadow-solid);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 400ms var(--pg-ease-spring);
  z-index: 1;
}

.crate-card:hover .crate-vinyl-disc {
  transform: translateX(35px) rotate(20deg);
}

.crate-vinyl-disc.is-spinning {
  animation: vinylSpin 3s linear infinite;
}

.disc-label {
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--pg-citron);
  padding: 6px;
  background: var(--pg-coral);
  border-radius: 50%;
}

.crate-cover-sleeve {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: var(--pg-radius-md);
  border: 2px solid var(--pg-border);
  box-shadow: var(--pg-shadow-solid-sm);
  overflow: hidden;
  background: var(--pg-surface-peach);
  z-index: 2;
}

.sleeve-art {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sleeve-generative {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3rem;
  font-weight: 800;
  color: var(--pg-coral);
}

.sleeve-play-btn {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--pg-citron);
  color: var(--pg-ink);
  border: 2px solid var(--pg-border);
  box-shadow: 2px 2px 0px var(--pg-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.85rem;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.8);
  transition: all var(--pg-transition-spring);
}

.crate-card:hover .sleeve-play-btn {
  opacity: 1;
  transform: scale(1);
}

.sleeve-play-btn:hover {
  background: var(--pg-coral);
  color: #fff;
  transform: scale(1.1);
}

.crate-info-row {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.crate-meta-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.crate-index {
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--pg-coral);
}

.crate-track-count {
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--pg-cobalt);
}

.crate-title {
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--pg-ink);
  line-height: 1.2;
}

.crate-description {
  font-size: 0.8rem;
  color: var(--pg-ink-secondary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 4. Ledger Table Mode */
.ledger-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ledger-header-row {
  display: grid;
  grid-template-columns: 48px 1fr 120px 140px 80px;
  align-items: center;
  padding: 10px 16px;
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--pg-ink-muted);
  border-bottom: 2px solid var(--pg-border);
}

.ledger-rows-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ledger-row-item {
  display: grid;
  grid-template-columns: 48px 1fr 120px 140px 80px;
  align-items: center;
  padding: 12px 16px;
  background: var(--pg-canvas);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-md);
  box-shadow: 2px 2px 0px var(--pg-border);
  cursor: pointer;
  transition: all var(--pg-transition-spring);
}

.ledger-row-item:hover {
  transform: translateX(4px);
  box-shadow: 4px 4px 0px var(--pg-border);
  border-color: var(--pg-cobalt);
}

.ledger-title-cell {
  display: flex;
  align-items: center;
  gap: 14px;
}

.ledger-thumb-box {
  width: 44px;
  height: 44px;
  border-radius: var(--pg-radius-sm);
  border: 1.5px solid var(--pg-border);
  overflow: hidden;
  background: var(--pg-surface-peach);
  flex-shrink: 0;
}

.ledger-thumb {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.ledger-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  font-size: 0.9rem;
  color: var(--pg-coral);
}

.ledger-name-block {
  display: flex;
  flex-direction: column;
}

.ledger-playlist-name {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--pg-ink);
}

.ledger-playlist-desc {
  font-size: 0.75rem;
  color: var(--pg-ink-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 380px;
}

.ledger-play-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--pg-citron);
  color: var(--pg-ink);
  border: 1.5px solid var(--pg-border);
  box-shadow: 1.5px 1.5px 0px var(--pg-border);
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 0.75rem;
}

.ledger-play-btn:hover {
  background: var(--pg-coral);
  color: #fff;
}

/* Empty Vault */
.empty-vault-card {
  background: var(--pg-surface-soft);
  border: 2px dashed var(--pg-border);
  border-radius: var(--pg-radius-xl);
  padding: 60px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
}

.vault-empty-art {
  font-size: 4rem;
  font-weight: 800;
  color: var(--pg-ink-dim);
}

.vault-empty-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--pg-ink);
}

.vault-empty-desc {
  font-size: 0.92rem;
  color: var(--pg-ink-secondary);
  max-width: 480px;
}

.vault-actions-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

.demo-btn {
  padding: 12px 24px;
  background: var(--pg-canvas);
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  font-size: 0.88rem;
  font-weight: 800;
  color: var(--pg-ink);
  box-shadow: 2px 2px 0px var(--pg-border);
  cursor: pointer;
}

.demo-btn:hover {
  background: var(--pg-surface-butter);
  transform: translateY(-2px);
  box-shadow: 4px 4px 0px var(--pg-border);
}

@media (max-width: 900px) {
  .pg-library-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .header-actions-cluster {
    width: 100%;
    justify-content: space-between;
  }

  .ledger-header-row,
  .ledger-row-item {
    grid-template-columns: 36px 1fr 70px 50px;
  }

  .col-date {
    display: none;
  }
}
</style>
