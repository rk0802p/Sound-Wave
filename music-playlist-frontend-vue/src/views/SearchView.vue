<template>
  <div class="sw-search-view">
    <!-- Prominent Discovery Search Header -->
    <header class="search-hero-box">
      <div class="prominent-search-wrapper">
        <svg class="search-icon-lg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          v-model="query"
          type="text"
          placeholder="Search by track title, artist, album, or playlist... (Esc to clear)"
          class="prominent-search-input"
          autofocus
          @keydown.esc="query = ''"
        />
        <button v-if="query" class="clear-query-btn" @click="query = ''" title="Clear search" aria-label="Clear Search">✕</button>
      </div>

      <!-- Filter Category Pills (When searching) -->
      <div v-if="query.trim()" class="search-filter-pills font-mono">
        <button
          class="pill-btn"
          :class="{ active: activeCategory === 'all' }"
          @click="activeCategory = 'all'"
        >
          All Results ({{ totalResultCount }})
        </button>
        <button
          class="pill-btn"
          :class="{ active: activeCategory === 'playlists' }"
          @click="activeCategory = 'playlists'"
        >
          Playlists ({{ matchedPlaylists.length }})
        </button>
        <button
          class="pill-btn"
          :class="{ active: activeCategory === 'tracks' }"
          @click="activeCategory = 'tracks'"
        >
          Tracks ({{ matchedTracks.length }})
        </button>
      </div>
    </header>

    <!-- Initial Idle State: Music Exploration & Tags -->
    <div v-if="!query.trim()" class="search-discovery-area">
      <div class="discovery-header">
        <span class="discovery-eyebrow font-mono">EXPLORATION & CATALOG DISCOVERY</span>
        <h2 class="discovery-title font-display">Sonic Search & Atmospheres</h2>
        <p class="discovery-sub">Instant search across playlists, track titles, albums, and artists in your personal library workstation.</p>
      </div>

      <!-- Genre & Atmosphere Tags -->
      <div class="vibes-section">
        <span class="vibes-label font-mono">ATMOSPHERES & MOODS</span>
        <div class="vibes-tags-grid">
          <button
            v-for="vibe in genreVibes"
            :key="vibe.name"
            class="vibe-card"
            @click="query = vibe.query"
          >
            <span class="vibe-emoji">{{ vibe.icon }}</span>
            <div class="vibe-text">
              <span class="vibe-name font-display">{{ vibe.name }}</span>
              <span class="vibe-sub">{{ vibe.desc }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Suggested Searches from Collection -->
      <div v-if="suggestedKeywords.length" class="quick-keywords-box">
        <span class="keywords-label font-mono">QUICK FREQUENCIES:</span>
        <div class="keywords-row">
          <button
            v-for="kw in suggestedKeywords"
            :key="kw"
            class="keyword-chip"
            @click="query = kw"
          >
            {{ kw }}
          </button>
        </div>
      </div>
    </div>

    <!-- No Results State -->
    <div v-else-if="matchedPlaylists.length === 0 && matchedTracks.length === 0" class="no-results-box">
      <div class="no-results-icon">📻</div>
      <h2 class="font-display">No matches found for "{{ query }}"</h2>
      <p>Try searching for a different keyword, artist name, or track title.</p>
      <AppButton variant="secondary" size="sm" @click="query = ''">
        Clear Search
      </AppButton>
    </div>

    <!-- Results Section -->
    <div v-else class="search-results-layout">
      <!-- 1. Playlists Group -->
      <section v-if="(activeCategory === 'all' || activeCategory === 'playlists') && matchedPlaylists.length" class="results-group">
        <div class="group-header">
          <span class="group-kicker font-mono">PLAYLISTS</span>
          <h3 class="group-title font-display">Matching Playlists ({{ matchedPlaylists.length }})</h3>
        </div>

        <div class="playlists-grid">
          <PlaylistCard
            v-for="(pl, idx) in matchedPlaylists"
            :key="pl._id"
            :playlist="pl"
            :index="idx"
          />
        </div>
      </section>

      <!-- 2. Tracks Group -->
      <section v-if="(activeCategory === 'all' || activeCategory === 'tracks') && matchedTracks.length" class="results-group">
        <div class="group-header">
          <span class="group-kicker font-mono">TRACKS</span>
          <h3 class="group-title font-display">Matching Tracks ({{ matchedTracks.length }})</h3>
        </div>

        <div class="tracks-card">
          <table class="tracks-table">
            <thead>
              <tr>
                <th class="th-num font-mono">#</th>
                <th class="th-title font-mono">TRACK</th>
                <th class="th-artist font-mono">ARTIST</th>
                <th class="th-album font-mono">ALBUM</th>
                <th class="th-from font-mono">PLAYLIST</th>
                <th class="th-duration font-mono">TIME</th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="(item, idx) in matchedTracks"
                :key="item.song._id || idx"
                class="track-row"
                :class="{ 'is-active': isCurrentTrack(item.song) }"
                @click="playFoundTrack(item)"
              >
                <td class="td-num">
                  <div class="num-wrapper">
                    <span v-if="!isCurrentTrack(item.song)" class="num-text tabular-nums font-mono">{{ idx + 1 }}</span>
                    <span v-else-if="playerStore.isPlaying" class="playing-bars">
                      <span></span><span></span><span></span>
                    </span>
                    <span v-else class="pause-icon">⏸</span>

                    <button class="row-play-btn" title="Play">
                      <svg v-if="isCurrentTrack(item.song) && playerStore.isPlaying" width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                      </svg>
                      <svg v-else width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M8 5v14l11-7z"/>
                      </svg>
                    </button>
                  </div>
                </td>

                <td class="td-title">
                  <div class="track-cell">
                    <ArtworkCover
                      :src="item.song.coverImage"
                      :alt="item.song.title"
                      size="xs"
                      :fallbackSeed="item.song.title"
                    />
                    <span class="track-title-label font-display" :class="{ highlight: isCurrentTrack(item.song) }">{{ item.song.title }}</span>
                  </div>
                </td>

                <td class="td-artist">
                  <span class="cell-text">{{ item.song.artist }}</span>
                </td>

                <td class="td-album">
                  <span class="cell-text dim">{{ item.song.album || '—' }}</span>
                </td>

                <td class="td-from">
                  <router-link :to="`/playlists/${item.playlistId}`" class="playlist-chip-link font-mono" @click.stop>
                    {{ item.playlistName }}
                  </router-link>
                </td>

                <td class="td-duration">
                  <span class="tabular-nums font-mono">{{ formatDuration(item.song.duration) }}</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRoute } from 'vue-router';
import { usePlaylistStore } from '../stores/playlist';
import { usePlayerStore } from '../stores/player';
import { formatDuration } from '../data/demoTracks';
import PlaylistCard from '../components/dashboard/PlaylistCard.vue';
import ArtworkCover from '../components/common/ArtworkCover.vue';
import AppButton from '../components/common/AppButton.vue';

const route = useRoute();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();

const query = ref('');
const activeCategory = ref('all'); // 'all' | 'playlists' | 'tracks'

onMounted(() => {
  if (route.query.q) {
    query.value = route.query.q;
  }
});

const genreVibes = [
  { name: 'Classical & Ambient', desc: 'Debussy, Satie, Piano', query: 'Debussy', icon: '🎹' },
  { name: 'Lo-Fi & Study', desc: 'Chill beats, Focus flow', query: 'Lo-Fi', icon: '☕' },
  { name: 'Synthwave & Retro', desc: 'Neon, Analog Bass', query: 'Synthwave', icon: '🌆' },
  { name: 'Cosmic & Electronic', desc: 'Soundscapes & Waves', query: 'Electronic', icon: '🌌' },
];

const suggestedKeywords = computed(() => {
  const set = new Set();
  playlistStore.playlists.slice(0, 6).forEach((p) => {
    set.add(p.name);
    if (p.songs && p.songs.length) {
      p.songs.slice(0, 2).forEach((s) => {
        if (s.artist) set.add(s.artist);
      });
    }
  });
  return Array.from(set).slice(0, 6);
});

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
  const list = [];

  playlistStore.playlists.forEach((playlist) => {
    if (!playlist.songs) return;
    playlist.songs.forEach((song) => {
      const match =
        song.title.toLowerCase().includes(q) ||
        song.artist.toLowerCase().includes(q) ||
        (song.album && song.album.toLowerCase().includes(q));

      if (match) {
        list.push({
          song,
          playlistId: playlist._id,
          playlistName: playlist.name,
          siblingSongs: playlist.songs,
        });
      }
    });
  });

  return list;
});

const totalResultCount = computed(() => {
  return matchedPlaylists.value.length + matchedTracks.value.length;
});

const isCurrentTrack = (song) => {
  return playerStore.currentTrack && playerStore.currentTrack._id === song._id;
};

const playFoundTrack = (item) => {
  const trackIndex = item.siblingSongs.findIndex((s) => s._id === item.song._id);
  playerStore.playTrack(item.song, item.siblingSongs, trackIndex >= 0 ? trackIndex : 0, item.playlistId);
};
</script>

<style scoped>
.sw-search-view {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 32px;
}

/* Search Box */
.search-hero-box {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.prominent-search-wrapper {
  display: flex;
  align-items: center;
  gap: 14px;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-xl);
  padding: 0 20px;
  height: 56px;
  transition: all var(--sw-transition-fast);
}

.prominent-search-wrapper:focus-within {
  border-color: var(--sw-accent);
  background: var(--sw-surface-hover);
  box-shadow: 0 0 25px var(--sw-accent-soft);
}

.search-icon-lg {
  color: var(--sw-text-muted);
}

.prominent-search-input {
  background: transparent;
  border: none;
  outline: none;
  color: var(--sw-text-primary);
  font-size: 1.05rem;
  width: 100%;
}

.prominent-search-input::placeholder {
  color: var(--sw-text-muted);
}

.clear-query-btn {
  color: var(--sw-text-muted);
  cursor: pointer;
  font-size: 1rem;
}

/* Filter category pills */
.search-filter-pills {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.pill-btn {
  padding: 6px 14px;
  border-radius: var(--sw-radius-full);
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  color: var(--sw-text-secondary);
  font-size: 0.76rem;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.pill-btn:hover {
  color: var(--sw-text-primary);
  border-color: var(--sw-border-hover);
}

.pill-btn.active {
  background: rgba(56, 189, 248, 0.15);
  color: var(--sw-accent);
  border-color: rgba(56, 189, 248, 0.35);
}

/* Discovery Area */
.search-discovery-area {
  display: flex;
  flex-direction: column;
  gap: 32px;
}

.discovery-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.discovery-eyebrow {
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: var(--sw-accent);
}

.discovery-title {
  font-size: 2rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  color: var(--sw-text-primary);
}

.discovery-sub {
  font-size: 0.95rem;
  color: var(--sw-text-secondary);
}

.vibes-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.vibes-label {
  font-size: 0.68rem;
  font-weight: 700;
  color: var(--sw-text-muted);
  letter-spacing: 0.1em;
}

.vibes-tags-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 16px;
}

.vibe-card {
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-lg);
  padding: 18px;
  display: flex;
  align-items: center;
  gap: 14px;
  cursor: pointer;
  text-align: left;
  transition: all var(--sw-transition-fast);
}

.vibe-card:hover {
  background: var(--sw-surface-hover);
  border-color: var(--sw-border-hover);
  transform: translateY(-2px);
}

.vibe-emoji {
  font-size: 1.8rem;
}

.vibe-text {
  display: flex;
  flex-direction: column;
}

.vibe-name {
  font-size: 0.95rem;
  font-weight: 700;
  color: var(--sw-text-primary);
}

.vibe-sub {
  font-size: 0.74rem;
  color: var(--sw-text-secondary);
}

.quick-keywords-box {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.keywords-label {
  font-size: 0.72rem;
  color: var(--sw-text-muted);
  letter-spacing: 0.08em;
}

.keywords-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.keyword-chip {
  padding: 4px 12px;
  border-radius: var(--sw-radius-full);
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  color: var(--sw-text-secondary);
  font-size: 0.78rem;
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.keyword-chip:hover {
  color: var(--sw-text-primary);
  border-color: var(--sw-accent);
}

/* No Results */
.no-results-box {
  text-align: center;
  padding: 64px 20px;
  background: var(--sw-surface);
  border: 1px dashed var(--sw-border);
  border-radius: var(--sw-radius-xl);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.no-results-icon {
  font-size: 3rem;
}

.no-results-box h2 {
  font-size: 1.4rem;
  color: var(--sw-text-primary);
}

.no-results-box p {
  color: var(--sw-text-secondary);
  font-size: 0.88rem;
}

/* Results layout */
.search-results-layout {
  display: flex;
  flex-direction: column;
  gap: 36px;
}

.results-group {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.group-header {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.group-kicker {
  font-size: 0.65rem;
  font-weight: 700;
  color: var(--sw-accent);
  letter-spacing: 0.1em;
}

.group-title {
  font-size: 1.3rem;
  font-weight: 700;
  color: var(--sw-text-primary);
}

.playlists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 24px;
}

/* Tracks Table */
.tracks-card {
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-xl);
  overflow-x: auto;
}

.tracks-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.tracks-table th {
  padding: 12px 18px;
  font-size: 0.68rem;
  color: var(--sw-text-muted);
  border-bottom: 1px solid var(--sw-border);
  letter-spacing: 0.08em;
}

.track-row {
  cursor: pointer;
  border-bottom: 1px solid var(--sw-border-subtle);
  transition: background var(--sw-transition-fast);
}

.track-row:hover {
  background: var(--sw-surface-hover);
}

.track-row.is-active {
  background: rgba(56, 189, 248, 0.06);
}

.tracks-table td {
  padding: 10px 18px;
  font-size: 0.84rem;
  color: var(--sw-text-secondary);
}

.num-wrapper {
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
}

.num-text {
  font-size: 0.78rem;
  color: var(--sw-text-muted);
}

.row-play-btn {
  display: none;
  background: transparent;
  border: none;
  color: var(--sw-text-primary);
  padding: 0;
}

.track-row:hover .num-text,
.track-row:hover .playing-bars,
.track-row:hover .pause-icon {
  display: none;
}

.track-row:hover .row-play-btn {
  display: flex;
}

.playing-bars {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
}

.playing-bars span {
  width: 2px;
  background: var(--sw-accent);
  border-radius: 1px;
  animation: eqBounce 0.8s ease-in-out infinite alternate;
}

.playing-bars span:nth-child(1) { height: 40%; animation-delay: 0.1s; }
.playing-bars span:nth-child(2) { height: 100%; animation-delay: 0.3s; }
.playing-bars span:nth-child(3) { height: 60%; animation-delay: 0.2s; }

@keyframes eqBounce {
  0% { height: 20%; }
  100% { height: 100%; }
}

.pause-icon {
  font-size: 0.75rem;
  color: var(--sw-accent);
}

.track-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.track-title-label {
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--sw-text-primary);
}

.track-title-label.highlight {
  color: var(--sw-accent);
}

.playlist-chip-link {
  font-size: 0.75rem;
  color: var(--sw-text-muted);
  background: var(--sw-surface-hover);
  padding: 3px 8px;
  border-radius: 4px;
  display: inline-block;
  transition: all var(--sw-transition-fast);
}

.playlist-chip-link:hover {
  color: var(--sw-accent);
  background: rgba(56, 189, 248, 0.12);
}

.cell-text.dim {
  color: var(--sw-text-muted);
}
</style>
