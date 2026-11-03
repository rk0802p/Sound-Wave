<template>
  <div class="sw-spatial-library">
    <!-- Header with Archival Metrics -->
    <header class="library-archival-header">
      <div class="header-titles">
        <div class="header-provenance font-mono">
          <span class="pulse-beacon"></span>
          <span>SONIC CRATE // ARCHITECTURAL VAULT</span>
        </div>
        <h1 class="header-headline font-display">Archival Repository</h1>
        <p class="header-tagline">
          Curated collection of acoustic records, physical vinyl sleeves, and multi-provider streaming frequencies.
        </p>
      </div>

      <div class="header-right-cluster">
        <div class="vault-metrics font-mono">
          <div class="vault-chip">
            <span class="vault-val">{{ playlistStore.playlists.length }}</span>
            <span class="vault-lbl">COLLECTIONS</span>
          </div>
          <div class="vault-chip">
            <span class="vault-val accent">{{ playlistStore.totalTracksCount }}</span>
            <span class="vault-lbl">FREQUENCIES</span>
          </div>
        </div>

        <button class="forge-btn font-mono" @click="showCreateModal = true">
          <span class="forge-plus">+</span>
          <span>Forge Collection</span>
        </button>
      </div>
    </header>

    <!-- Archival Control Island: Search, Sort, View Switcher -->
    <div class="archival-control-island">
      <!-- Search Filter Capsule -->
      <div class="search-filter-capsule">
        <svg class="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          v-model="searchQuery"
          type="text"
          placeholder="Filter archival records by title or description..."
          class="filter-input font-mono"
        />
        <button v-if="searchQuery" class="clear-btn" @click="searchQuery = ''" aria-label="Clear filter">✕</button>
      </div>

      <!-- Controls: Sort & Mode Switcher -->
      <div class="island-right-controls">
        <div class="sort-capsule font-mono">
          <span class="sort-label">SORT</span>
          <select v-model="sortBy" class="sort-select font-mono">
            <option value="updated">Recently Updated</option>
            <option value="created">Recently Created</option>
            <option value="name">Title (A–Z)</option>
            <option value="tracks">Frequencies</option>
          </select>
        </div>

        <div class="mode-switcher">
          <button
            class="mode-btn"
            :class="{ active: viewMode === 'crate' }"
            @click="viewMode = 'crate'"
            title="Vinyl Crate Mode"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="3" y="3" width="7" height="7"></rect>
              <rect x="14" y="3" width="7" height="7"></rect>
              <rect x="14" y="14" width="7" height="7"></rect>
              <rect x="3" y="14" width="7" height="7"></rect>
            </svg>
            <span class="desktop-only font-mono">Crate</span>
          </button>

          <button
            class="mode-btn"
            :class="{ active: viewMode === 'ledger' }"
            @click="viewMode = 'ledger'"
            title="Architectural Ledger Mode"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
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
    <div v-if="playlistStore.isLoading && !playlistStore.playlists.length" class="crate-grid">
      <div v-for="n in 6" :key="n" class="skeleton-crate-item">
        <div class="skeleton-sleeve"></div>
        <div class="skeleton-line w-75"></div>
        <div class="skeleton-line w-40"></div>
      </div>
    </div>

    <!-- Empty Vault State -->
    <div v-else-if="playlistStore.playlists.length === 0" class="empty-vault-box">
      <div class="empty-icon-art">
        <div class="ghost-circle g1"></div>
        <div class="ghost-circle g2"></div>
        <span class="font-mono">∅</span>
      </div>
      <h3 class="font-display">The Archival Vault is Empty</h3>
      <p>Forge your first playlist collection, or generate a master starter archive with verified high-fidelity playable audio.</p>
      <div class="empty-action-group">
        <button class="stage-btn primary font-display" @click="showCreateModal = true">
          + Forge Collection
        </button>
        <button class="stage-btn warm font-mono" :disabled="seeding" @click="seedStarter">
          {{ seeding ? 'Archiving...' : '✨ Generate Master Archive' }}
        </button>
      </div>
    </div>

    <!-- Empty Search Results -->
    <div v-else-if="sortedPlaylists.length === 0" class="empty-vault-box">
      <h3 class="font-display">No Collections Match "{{ searchQuery }}"</h3>
      <p>Adjust your search query or clear the filter to view all archived collections.</p>
      <button class="stage-btn secondary font-mono" @click="searchQuery = ''">Clear Filter</button>
    </div>

    <!-- MODE A: Vinyl Crate Exhibition View -->
    <div v-else-if="viewMode === 'crate'" class="crate-grid">
      <div
        v-for="(p, index) in sortedPlaylists"
        :key="p._id"
        class="crate-item-card"
        @click="openPlaylist(p._id)"
      >
        <!-- Vinyl Sleeve Stage -->
        <div class="crate-sleeve-stage">
          <!-- Sliding Disc -->
          <div class="crate-vinyl-disc" :class="{ 'is-spinning': isPlaylistActive(p) && playerStore.isPlaying }">
            <div class="disc-grooves"></div>
            <div class="disc-label"></div>
          </div>

          <!-- Sleeve Jacket -->
          <div class="crate-sleeve-jacket">
            <img
              v-if="p.coverImage"
              :src="p.coverImage"
              :alt="p.name"
              class="jacket-img"
              loading="lazy"
              @error="p.coverImage = null"
            />
            <div v-else class="generative-jacket-cover" :style="getGenerativeCoverStyle(p.name)">
              <span class="font-display">{{ getMonogram(p.name) }}</span>
            </div>

            <!-- 1-Click Play Overlay Button -->
            <button
              class="crate-quick-play-btn"
              @click.stop="handleQuickPlay(p)"
              :title="`Play ${p.name}`"
            >
              <svg v-if="isPlaylistActive(p) && playerStore.isPlaying" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <rect x="6" y="4" width="4" height="16"></rect>
                <rect x="14" y="4" width="4" height="16"></rect>
              </svg>
              <svg v-else width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 3 20 12 6 21 6 3"></polygon>
              </svg>
            </button>
          </div>
        </div>

        <!-- Metadata -->
        <div class="crate-meta">
          <div class="crate-meta-top font-mono">
            <span class="crate-index">#0{{ index + 1 }}</span>
            <span class="crate-freq-count">{{ p.songs?.length || 0 }} FREQ</span>
          </div>
          <h3 class="crate-title font-display">{{ p.name }}</h3>
          <p v-if="p.description" class="crate-desc">{{ p.description }}</p>
        </div>
      </div>
    </div>

    <!-- MODE B: Architectural Ledger View -->
    <div v-else class="ledger-table-container">
      <div
        v-for="(p, index) in sortedPlaylists"
        :key="p._id"
        class="ledger-row"
        @click="openPlaylist(p._id)"
      >
        <span class="ledger-index font-mono">{{ formatIndex(index + 1) }}</span>

        <div class="ledger-sleeve-thumb">
          <img v-if="p.coverImage" :src="p.coverImage" :alt="p.name" class="thumb-img" />
          <div v-else class="thumb-gen font-display" :style="getGenerativeCoverStyle(p.name)">
            {{ getMonogram(p.name) }}
          </div>
        </div>

        <div class="ledger-name-group">
          <span class="ledger-name font-display">{{ p.name }}</span>
          <span v-if="p.description" class="ledger-sub">{{ p.description }}</span>
        </div>

        <div class="ledger-stat-cell font-mono">
          <span class="stat-highlight">{{ p.songs?.length || 0 }}</span>
          <span class="stat-tag">FREQUENCIES</span>
        </div>

        <div class="ledger-stat-cell font-mono desktop-only">
          <span class="stat-highlight">{{ calculateDuration(p.songs) }}</span>
          <span class="stat-tag">RUNTIME</span>
        </div>

        <div class="ledger-actions" @click.stop>
          <button
            class="ledger-play-btn"
            @click="handleQuickPlay(p)"
            :title="`Play ${p.name}`"
          >
            <svg v-if="isPlaylistActive(p) && playerStore.isPlaying" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <rect x="6" y="4" width="4" height="16"></rect>
              <rect x="14" y="4" width="4" height="16"></rect>
            </svg>
            <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
              <polygon points="6 3 20 12 6 21 6 3"></polygon>
            </svg>
          </button>
        </div>
      </div>
    </div>

    <!-- Create Playlist Modal -->
    <CreatePlaylistModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
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

const showCreateModal = ref(false);
const seeding = ref(false);
const searchQuery = ref('');
const sortBy = ref('updated');
const viewMode = ref('crate'); // 'crate' | 'ledger'

const isPlaylistActive = (playlist) => {
  return playerStore.currentPlaylistId === playlist._id;
};

const getMonogram = (name) => {
  if (!name) return 'SW';
  return name.slice(0, 2).toUpperCase();
};

const formatIndex = (n) => (n < 10 ? `0${n}` : `${n}`);

const calculateDuration = (songs) => {
  if (!songs || !songs.length) return '0 min';
  const total = songs.reduce((acc, s) => acc + (s.duration || 0), 0);
  const m = Math.floor(total / 60);
  return `${m}m`;
};

const getGenerativeCoverStyle = (name) => {
  let hash = 0;
  for (let i = 0; i < (name || 'SW').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 45) % 360;
  return {
    background: `linear-gradient(135deg, hsl(${hue1}, 70%, 14%) 0%, hsl(${hue2}, 60%, 8%) 100%)`,
    color: `hsl(${hue1}, 80%, 65%)`,
  };
};

const sortedPlaylists = computed(() => {
  let list = [...playlistStore.playlists];

  // Search filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q))
    );
  }

  // Sorting
  if (sortBy.value === 'name') {
    list.sort((a, b) => a.name.localeCompare(b.name));
  } else if (sortBy.value === 'tracks') {
    list.sort((a, b) => (b.songs?.length || 0) - (a.songs?.length || 0));
  } else if (sortBy.value === 'created') {
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
  } else {
    // updated
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
    toastStore.info(`Resonating "${playlist.name}"`);
  }
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
    toastStore.success('Generated starter archive with playable audio!');
    router.push(`/playlists/${starter._id}`);
  } catch (err) {
    toastStore.error(err.response?.data?.message || 'Failed to generate starter');
  } finally {
    seeding.value = false;
  }
};
</script>

<style scoped>
.sw-spatial-library {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 36px;
}

/* 1. Header */
.library-archival-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 24px;
}

.header-titles {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.header-provenance {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--sw-text-muted);
}

.pulse-beacon {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--sw-accent);
}

.header-headline {
  font-size: clamp(34px, 5vw, 54px);
  font-weight: 800;
  line-height: 1.05;
  color: #fff;
  letter-spacing: -0.03em;
}

.header-tagline {
  font-size: 15px;
  color: var(--sw-text-secondary);
  max-width: 580px;
  line-height: 1.5;
}

.header-right-cluster {
  display: flex;
  align-items: center;
  gap: 16px;
}

.vault-metrics {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 10px 18px;
  background: rgba(13, 16, 23, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--sw-radius-md);
}

.vault-chip {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.vault-val {
  font-size: 15px;
  font-weight: 700;
  color: #fff;
}

.vault-val.accent {
  color: var(--sw-accent);
}

.vault-lbl {
  font-size: 9px;
  letter-spacing: 0.1em;
  color: var(--sw-text-muted);
}

.forge-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 22px;
  background: linear-gradient(135deg, var(--sw-accent), var(--sw-warm));
  border-radius: var(--sw-radius-full);
  color: #fffdf7;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  box-shadow: 0 0 24px rgba(204, 255, 0, 0.4);
  transition: transform var(--sw-transition-fast);
}

.forge-btn:hover {
  transform: translateY(-2px);
}

.forge-plus {
  font-size: 16px;
}

/* 2. Control Island */
.archival-control-island {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 20px;
  background: rgba(13, 16, 23, 0.55);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--sw-radius-lg);
}

.search-filter-capsule {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px 16px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--sw-radius-full);
  flex: 1;
  max-width: 440px;
}

.search-icon {
  color: var(--sw-text-muted);
}

.filter-input {
  background: transparent;
  border: none;
  outline: none;
  color: #fff;
  font-size: 12px;
  width: 100%;
}

.filter-input::placeholder {
  color: var(--sw-text-muted);
}

.clear-btn {
  color: var(--sw-text-muted);
  cursor: pointer;
}

.island-right-controls {
  display: flex;
  align-items: center;
  gap: 14px;
}

.sort-capsule {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
}

.sort-label {
  color: var(--sw-text-muted);
}

.sort-select {
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.1);
  color: #fff;
  padding: 6px 12px;
  border-radius: var(--sw-radius-sm);
  outline: none;
  cursor: pointer;
}

.sort-select option {
  background: #0d1017;
  color: #fff;
}

.mode-switcher {
  display: flex;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--sw-radius-full);
  padding: 3px;
}

.mode-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 14px;
  border-radius: var(--sw-radius-full);
  color: var(--sw-text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.mode-btn.active {
  background: rgba(204, 255, 0, 0.15);
  color: #fff;
  border: 1px solid rgba(204, 255, 0, 0.35);
}

/* 3. Crate Mode Grid */
.crate-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 28px;
}

.crate-item-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 18px;
  background: rgba(13, 16, 23, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--sw-radius-lg);
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.crate-item-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.16);
  transform: translateY(-4px);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.7);
}

.crate-sleeve-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
}

.crate-vinyl-disc {
  position: absolute;
  top: 6px;
  right: 0;
  width: 90%;
  height: 90%;
  border-radius: 50%;
  background: radial-gradient(circle at center, #222 15%, #080808 60%, #151515 100%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 1;
}

.crate-item-card:hover .crate-vinyl-disc {
  transform: translateX(25px) rotate(25deg);
}

.crate-vinyl-disc.is-spinning {
  animation: spin-vinyl 3s linear infinite;
}

.disc-grooves {
  position: absolute;
  inset: 12px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.14);
}

.disc-label {
  position: absolute;
  inset: 38%;
  border-radius: 50%;
  background: var(--sw-accent);
}

.crate-sleeve-jacket {
  position: relative;
  width: 90%;
  height: 90%;
  border-radius: var(--sw-radius-md);
  overflow: hidden;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.6);
  z-index: 2;
  background: #0d1017;
}

.jacket-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.generative-jacket-cover {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 800;
}

.crate-quick-play-btn {
  position: absolute;
  bottom: 12px;
  right: 12px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--sw-accent);
  color: #fffdf7;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
  opacity: 0;
  transform: translateY(8px);
  transition: all var(--sw-transition-fast);
}

.crate-item-card:hover .crate-quick-play-btn {
  opacity: 1;
  transform: translateY(0);
}

.crate-quick-play-btn:hover {
  transform: scale(1.1);
  background: #fff;
}

.crate-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.crate-meta-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  color: var(--sw-text-muted);
}

.crate-freq-count {
  color: var(--sw-accent);
}

.crate-title {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.crate-desc {
  font-size: 12px;
  color: var(--sw-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

/* 4. Ledger Mode */
.ledger-table-container {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.ledger-row {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 12px 20px;
  background: rgba(13, 16, 23, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: var(--sw-radius-md);
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.ledger-row:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateX(4px);
}

.ledger-index {
  font-size: 11px;
  color: var(--sw-text-muted);
  width: 24px;
}

.ledger-sleeve-thumb {
  width: 44px;
  height: 44px;
  border-radius: var(--sw-radius-xs);
  overflow: hidden;
  flex-shrink: 0;
}

.thumb-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.thumb-gen {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
}

.ledger-name-group {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.ledger-name {
  font-size: 15px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ledger-sub {
  font-size: 12px;
  color: var(--sw-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ledger-stat-cell {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  width: 100px;
}

.stat-highlight {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.stat-tag {
  font-size: 8px;
  color: var(--sw-text-muted);
  letter-spacing: 0.1em;
}

.ledger-actions {
  display: flex;
  align-items: center;
}

.ledger-play-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.06);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all var(--sw-transition-fast);
}

.ledger-row:hover .ledger-play-btn {
  background: var(--sw-accent);
  color: #fffdf7;
}

/* Empty Vault */
.empty-vault-box {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  text-align: center;
  gap: 16px;
  background: rgba(13, 16, 23, 0.35);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: var(--sw-radius-xl);
}

.empty-icon-art {
  position: relative;
  width: 70px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--sw-accent);
}

.ghost-circle {
  position: absolute;
  border-radius: 50%;
  border: 1px solid var(--sw-accent);
  opacity: 0.25;
}

.g1 { inset: 0; }
.g2 { inset: 12px; }

.empty-action-group {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
}

.stage-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: var(--sw-radius-full);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.stage-btn.primary {
  background: linear-gradient(135deg, var(--sw-accent), var(--sw-warm));
  color: #fffdf7;
}

.stage-btn.secondary {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
}

.stage-btn.warm {
  background: linear-gradient(135deg, var(--sw-warm), var(--sw-magenta));
  color: #fffdf7;
}

@media (max-width: 900px) {
  .library-archival-header {
    flex-direction: column;
    align-items: flex-start;
  }
  .archival-control-island {
    flex-direction: column;
    align-items: stretch;
  }
  .search-filter-capsule {
    max-width: 100%;
  }
  .island-right-controls {
    justify-content: space-between;
  }
}
</style>
