<template>
  <div class="pg-search-root">
    <!-- 1. Editorial Search Header Stage -->
    <header class="pg-search-header">
      <div class="search-kicker-strip font-mono">
        <span class="search-kicker-tag">EXPLORATION</span>
        <span class="search-kicker-sub">DISCOVER MIXTAPES, TRACKS & SONIC GENRES</span>
      </div>

      <!-- Massive Editorial Search Bar -->
      <div class="pg-search-input-box">
        <svg class="search-input-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>

        <input
          v-model="query"
          type="text"
          placeholder="Search by track title, artist, album, or genre..."
          class="search-text-input font-display"
          autofocus
          @keydown.esc="query = ''"
        />

        <button v-if="query" class="search-clear-btn font-mono" @click="query = ''" aria-label="Clear Search">
          ✕
        </button>

        <span v-else class="search-esc-hint font-mono desktop-only">ESC TO CLEAR</span>
      </div>

      <!-- Filter Category Tabs (Visible when typing) -->
      <div v-if="query.trim()" class="search-filter-tabs font-mono">
        <button
          class="category-tab-btn"
          :class="{ 'is-active': activeCategory === 'all' }"
          @click="activeCategory = 'all'"
        >
          All Results ({{ totalResultCount }})
        </button>
        <button
          class="category-tab-btn"
          :class="{ 'is-active': activeCategory === 'playlists' }"
          @click="activeCategory = 'playlists'"
        >
          Mixtapes ({{ matchedPlaylists.length }})
        </button>
        <button
          class="category-tab-btn"
          :class="{ 'is-active': activeCategory === 'tracks' }"
          @click="activeCategory = 'tracks'"
        >
          Tracks ({{ matchedTracks.length }})
        </button>
      </div>
    </header>

    <!-- 2. Idle Discovery State: 6 Editorial Genre Portals -->
    <div v-if="!query.trim()" class="pg-portals-view">
      <div class="portals-header">
        <h3 class="portals-title font-display">Curated Sound Portals</h3>
        <span class="portals-subtitle font-mono">TAP TO INSTANTLY EXPLORE</span>
      </div>

      <div class="editorial-portals-grid">
        <div
          v-for="vibe in genreVibes"
          :key="vibe.name"
          class="editorial-portal-tile"
          :style="{ '--tile-bg': vibe.tint }"
          @click="query = vibe.query"
        >
          <div class="tile-code font-mono">{{ vibe.code }}</div>
          <h4 class="tile-title font-display">{{ vibe.name }}</h4>
          <p class="tile-desc">{{ vibe.desc }}</p>
          <span class="tile-cta font-mono">EXPLORE FREQUENCY →</span>
        </div>
      </div>

      <!-- Suggested Archival Keywords -->
      <div v-if="suggestedKeywords.length" class="keywords-pill-strip">
        <span class="keywords-label font-mono">POPULAR TAGS:</span>
        <div class="keywords-row">
          <button
            v-for="kw in suggestedKeywords"
            :key="kw"
            class="tag-pill font-mono"
            @click="query = kw"
          >
            {{ kw }}
          </button>
        </div>
      </div>
    </div>

    <!-- 3. Zero Results State -->
    <div v-else-if="matchedPlaylists.length === 0 && matchedTracks.length === 0" class="pg-empty-search">
      <div class="empty-glyph font-display">00</div>
      <h3 class="empty-title font-display">No Results for "{{ query }}"</h3>
      <p class="empty-text">Check your spelling or explore one of the curated sound portals below.</p>
      <button class="reset-search-btn font-mono" @click="query = ''">Reset Search</button>
    </div>

    <!-- 4. Active Results State -->
    <div v-else class="pg-results-stage">
      <!-- Matched Mixtapes Section -->
      <section v-if="(activeCategory === 'all' || activeCategory === 'playlists') && matchedPlaylists.length" class="results-section">
        <div class="results-header">
          <h4 class="results-title font-display">Archived Mixtapes</h4>
          <span class="results-count font-mono">{{ matchedPlaylists.length }} FOUND</span>
        </div>

        <div class="mixtapes-results-grid">
          <div
            v-for="playlist in matchedPlaylists"
            :key="playlist._id"
            class="result-mixtape-card"
            @click="router.push(`/playlists/${playlist._id}`)"
          >
            <div class="result-cover-box">
              <img
                v-if="playlist.coverImage"
                :src="playlist.coverImage"
                :alt="playlist.name"
                class="result-cover-img"
              />
              <div v-else class="result-cover-fallback font-display">
                {{ playlist.name?.slice(0, 2).toUpperCase() || 'SW' }}
              </div>
            </div>
            <div class="result-info">
              <span class="result-track-tag font-mono">{{ playlist.songs?.length || 0 }} Tracks</span>
              <h5 class="result-name font-display">{{ playlist.name }}</h5>
              <p v-if="playlist.description" class="result-desc">{{ playlist.description }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- Matched Tracks Section -->
      <section v-if="(activeCategory === 'all' || activeCategory === 'tracks') && matchedTracks.length" class="results-section">
        <div class="results-header">
          <h4 class="results-title font-display">Audio Tracks</h4>
          <span class="results-count font-mono">{{ matchedTracks.length }} FOUND</span>
        </div>

        <div class="tracks-results-list">
          <div
            v-for="(item, idx) in matchedTracks"
            :key="item.song._id || idx"
            class="result-track-row"
            :class="{ 'is-active': isTrackPlaying(item.song) }"
            @click="handlePlayResultTrack(item)"
          >
            <button class="result-play-icon font-mono">
              {{ isTrackPlaying(item.song) && playerStore.isPlaying ? '❚❚' : '▶' }}
            </button>

            <div class="result-track-details">
              <div class="result-track-top">
                <span class="track-title-text font-display">{{ item.song.title }}</span>
                <span class="track-source-pill font-mono" :class="getProviderPillClass(item.song)">
                  {{ getProviderLabel(item.song) }}
                </span>
              </div>
              <div class="result-track-sub font-mono">
                <span>{{ item.song.artist || 'Unknown Artist' }}</span>
                <span v-if="item.song.album">/ {{ item.song.album }}</span>
                <span class="from-mixtape">• From {{ item.playlistName }}</span>
              </div>
            </div>

            <span class="result-track-time font-mono">
              {{ formatDuration(item.song.duration) }}
            </span>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePlaylistStore } from '../stores/playlist';
import { usePlayerStore } from '../stores/player';
import { useToastStore } from '../stores/toast';
import { detectProviderType } from '../services/providers/detector';

const router = useRouter();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();
const toastStore = useToastStore();

const query = ref('');
const activeCategory = ref('all'); // 'all' | 'playlists' | 'tracks'

const genreVibes = [
  { name: 'Late Night Lo-Fi', desc: 'Analog tape warmth, dust & cracked vinyl', code: 'FREQ // 01', query: 'Lo-Fi', tint: '#FFEFE7' },
  { name: 'Deep Space Ambient', desc: 'Infinite reverberations & acoustic spatial drones', code: 'FREQ // 02', query: 'Ambient', tint: '#F1ECFF' },
  { name: 'Cyberpunk Synthwave', desc: '80s analog neon voltage & highway arpeggios', code: 'FREQ // 03', query: 'Synthwave', tint: '#E7FAF2' },
  { name: 'Velvet Midnight Jazz', desc: 'Acoustic brass, double bass & smoky rooms', code: 'FREQ // 04', query: 'Jazz', tint: '#FFF7D1' },
  { name: 'Neo-Classical Piano', desc: 'Felt piano & acoustic spatial strings', code: 'FREQ // 05', query: 'Classical', tint: '#FFE5EC' },
  { name: 'Electronic Modular', desc: 'Analog synthesis & hypnotic sub-bass', code: 'FREQ // 06', query: 'Electronic', tint: '#E8F4FF' },
];

const matchedPlaylists = computed(() => {
  if (!query.value.trim()) return [];
  const q = query.value.toLowerCase().trim();
  return playlistStore.playlists.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
  );
});

const matchedTracks = computed(() => {
  if (!query.value.trim()) return [];
  const q = query.value.toLowerCase().trim();
  const results = [];

  playlistStore.playlists.forEach((playlist) => {
    if (playlist.songs && playlist.songs.length) {
      playlist.songs.forEach((song) => {
        const matchesTitle = song.title && song.title.toLowerCase().includes(q);
        const matchesArtist = song.artist && song.artist.toLowerCase().includes(q);
        const matchesAlbum = song.album && song.album.toLowerCase().includes(q);

        if (matchesTitle || matchesArtist || matchesAlbum) {
          results.push({
            song,
            playlistId: playlist._id,
            playlistName: playlist.name,
            playlist,
          });
        }
      });
    }
  });

  return results;
});

const totalResultCount = computed(() => {
  return matchedPlaylists.value.length + matchedTracks.value.length;
});

const suggestedKeywords = computed(() => {
  const words = new Set();
  playlistStore.playlists.forEach((p) => {
    if (p.songs) {
      p.songs.forEach((s) => {
        if (s.artist) words.add(s.artist);
      });
    }
  });
  return Array.from(words).slice(0, 6);
});

const formatDuration = (sec) => {
  if (!sec || isNaN(sec)) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const isTrackPlaying = (song) => {
  if (!playerStore.currentTrack) return false;
  return (
    playerStore.currentTrack._id === song._id ||
    (playerStore.currentTrack.title === song.title &&
      playerStore.currentTrack.artist === song.artist)
  );
};

const getProviderLabel = (input) => {
  if (!input) return 'MP3';
  const type = typeof input === 'object'
    ? (input.source?.provider || (input.url ? detectProviderType(input.url) : 'direct'))
    : detectProviderType(input);
  if (type === 'youtube') return 'YOUTUBE';
  if (type === 'spotify') return 'SPOTIFY';
  return 'LOSSLESS';
};

const getProviderPillClass = (input) => {
  if (!input) return 'prov-direct';
  const type = typeof input === 'object'
    ? (input.source?.provider || (input.url ? detectProviderType(input.url) : 'direct'))
    : detectProviderType(input);
  return `prov-${type}`;
};

const handlePlayResultTrack = (item) => {
  if (isTrackPlaying(item.song)) {
    playerStore.togglePlay();
  } else {
    playerStore.playTrack(item.song, item.playlist, item.playlist.songs);
    toastStore.info(`Playing ${item.song.title}`);
  }
};
</script>

<style scoped>
.pg-search-root {
  display: flex;
  flex-direction: column;
  gap: 36px;
  padding-bottom: 40px;
}

/* 1. Header */
.pg-search-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-top: 10px;
}

.search-kicker-strip {
  display: flex;
  align-items: center;
  gap: 10px;
}

.search-kicker-tag {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 3px 8px;
  background: var(--pg-coral);
  color: #fff;
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
}

.search-kicker-sub {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--pg-ink-secondary);
}

.pg-search-input-box {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 14px 24px;
  background: var(--pg-canvas);
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  box-shadow: var(--pg-shadow-solid-lg);
  transition: all var(--pg-transition-spring);
}

.pg-search-input-box:focus-within {
  transform: translateY(-2px);
  box-shadow: 6px 6px 0px var(--pg-cobalt);
}

.search-input-icon {
  color: var(--pg-cobalt);
  flex-shrink: 0;
}

.search-text-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: clamp(1.1rem, 2.5vw, 1.45rem);
  font-weight: 700;
  color: var(--pg-ink);
}

.search-text-input::placeholder {
  color: var(--pg-ink-muted);
}

.search-clear-btn {
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--pg-ink);
  padding: 4px 10px;
  background: var(--pg-surface-soft);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  cursor: pointer;
}

.search-esc-hint {
  font-size: 0.68rem;
  font-weight: 800;
  color: var(--pg-ink-muted);
  letter-spacing: 0.05em;
}

/* Category Tabs */
.search-filter-tabs {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.category-tab-btn {
  padding: 7px 16px;
  background: var(--pg-canvas);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  box-shadow: 2px 2px 0px var(--pg-border);
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--pg-ink-secondary);
  cursor: pointer;
  transition: all var(--pg-transition-spring);
}

.category-tab-btn:hover {
  background: var(--pg-surface-soft);
  color: var(--pg-ink);
  transform: translateY(-2px);
  box-shadow: 3px 3px 0px var(--pg-border);
}

.category-tab-btn.is-active {
  background: var(--pg-cobalt);
  color: #fff;
  border-color: var(--pg-border);
  box-shadow: 2px 2px 0px var(--pg-border);
}

/* 2. Genre Portals (Idle) */
.pg-portals-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.portals-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.portals-title {
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--pg-ink);
  letter-spacing: -0.03em;
}

.portals-subtitle {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--pg-ink-muted);
}

.editorial-portals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}

.editorial-portal-tile {
  background: var(--tile-bg);
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-lg);
  box-shadow: var(--pg-shadow-solid);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  cursor: pointer;
  transition: all var(--pg-transition-spring);
}

.editorial-portal-tile:hover {
  transform: translate(-3px, -3px);
  box-shadow: var(--pg-shadow-solid-lg);
}

.tile-code {
  font-size: 0.68rem;
  font-weight: 800;
  color: var(--pg-ink-secondary);
}

.tile-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--pg-ink);
}

.tile-desc {
  font-size: 0.82rem;
  color: var(--pg-ink-secondary);
  line-height: 1.4;
  flex: 1;
}

.tile-cta {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--pg-cobalt);
  margin-top: 8px;
}

.keywords-pill-strip {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 14px 20px;
  background: var(--pg-canvas);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-lg);
  box-shadow: 2px 2px 0px var(--pg-border);
}

.keywords-label {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--pg-ink-muted);
}

.keywords-row {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-pill {
  padding: 4px 12px;
  background: var(--pg-surface-soft);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--pg-ink);
  cursor: pointer;
  transition: all var(--pg-transition-spring);
}

.tag-pill:hover {
  background: var(--pg-citron);
  transform: translateY(-2px);
  box-shadow: 2px 2px 0px var(--pg-border);
}

/* 3. Empty Search */
.pg-empty-search {
  padding: 60px 24px;
  text-align: center;
  background: var(--pg-surface-soft);
  border: 2px dashed var(--pg-border);
  border-radius: var(--pg-radius-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.empty-glyph {
  font-size: 3.5rem;
  font-weight: 800;
  color: var(--pg-ink-dim);
}

.empty-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--pg-ink);
}

.empty-text {
  font-size: 0.88rem;
  color: var(--pg-ink-secondary);
  max-width: 440px;
}

.reset-search-btn {
  padding: 10px 22px;
  background: var(--pg-cobalt);
  color: #fff;
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  font-size: 0.85rem;
  font-weight: 800;
  box-shadow: 2px 2px 0px var(--pg-border);
  cursor: pointer;
}

.reset-search-btn:hover {
  background: var(--pg-coral);
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0px var(--pg-border);
}

/* 4. Active Results */
.pg-results-stage {
  display: flex;
  flex-direction: column;
  gap: 36px;
}

.results-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.results-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.results-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--pg-ink);
}

.results-count {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--pg-cobalt);
}

.mixtapes-results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 20px;
}

.result-mixtape-card {
  background: var(--pg-canvas);
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-lg);
  box-shadow: var(--pg-shadow-solid);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  cursor: pointer;
  transition: all var(--pg-transition-spring);
}

.result-mixtape-card:hover {
  transform: translate(-3px, -3px);
  box-shadow: var(--pg-shadow-solid-lg);
}

.result-cover-box {
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--pg-radius-sm);
  border: 1.5px solid var(--pg-border);
  overflow: hidden;
  background: var(--pg-surface-peach);
}

.result-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.result-cover-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2rem;
  font-weight: 800;
  color: var(--pg-coral);
}

.result-info {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.result-track-tag {
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--pg-cobalt);
}

.result-name {
  font-size: 1rem;
  font-weight: 800;
  color: var(--pg-ink);
}

.result-desc {
  font-size: 0.75rem;
  color: var(--pg-ink-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Track Results List */
.tracks-results-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.result-track-row {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px;
  background: var(--pg-canvas);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-md);
  box-shadow: 2px 2px 0px var(--pg-border);
  cursor: pointer;
  transition: all var(--pg-transition-spring);
}

.result-track-row:hover {
  transform: translateX(4px);
  box-shadow: 4px 4px 0px var(--pg-border);
  border-color: var(--pg-cobalt);
}

.result-track-row.is-active {
  background: var(--pg-surface-butter);
  border-color: var(--pg-border);
  box-shadow: 3px 3px 0px var(--pg-coral);
}

.result-play-icon {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: var(--pg-surface-soft);
  border: 1.5px solid var(--pg-border);
  color: var(--pg-ink);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  flex-shrink: 0;
}

.result-track-row:hover .result-play-icon {
  background: var(--pg-citron);
}

.result-track-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.result-track-top {
  display: flex;
  align-items: center;
  gap: 10px;
}

.track-title-text {
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--pg-ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-source-pill {
  font-size: 0.62rem;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: var(--pg-radius-full);
  border: 1px solid var(--pg-border);
}

.track-source-pill.prov-direct {
  background: var(--pg-citron);
  color: var(--pg-ink);
}

.track-source-pill.prov-youtube {
  background: var(--pg-coral);
  color: #fff;
}

.track-source-pill.prov-spotify {
  background: var(--pg-mint);
  color: var(--pg-ink);
}

.result-track-sub {
  font-size: 0.76rem;
  color: var(--pg-ink-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.from-mixtape {
  color: var(--pg-ink-muted);
}

.result-track-time {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--pg-ink-secondary);
}
</style>
