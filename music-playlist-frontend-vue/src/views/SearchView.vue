<template>
  <div class="sw-search-view">
    <!-- Prominent Search Bar Header -->
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
        <button v-if="query" class="clear-query-btn" @click="query = ''" title="Clear search">✕</button>
      </div>

      <!-- Filter Category Pills (When searching) -->
      <div v-if="query.trim()" class="search-filter-pills">
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
        <h2 class="discovery-title">Explore Your Soundscape</h2>
        <p class="discovery-sub">Instant search across playlists, track titles, albums, and artists in your personal library workstation.</p>
      </div>

      <!-- Genre & Atmosphere Tags -->
      <div class="vibes-section">
        <span class="vibes-label">Atmosphere & Moods</span>
        <div class="vibes-tags-grid">
          <button
            v-for="vibe in genreVibes"
            :key="vibe.name"
            class="vibe-card"
            @click="query = vibe.query"
          >
            <span class="vibe-emoji">{{ vibe.icon }}</span>
            <div class="vibe-text">
              <span class="vibe-name">{{ vibe.name }}</span>
              <span class="vibe-sub">{{ vibe.desc }}</span>
            </div>
          </button>
        </div>
      </div>

      <!-- Suggested Searches from Collection -->
      <div v-if="suggestedKeywords.length" class="quick-keywords-box">
        <span class="keywords-label">Quick Suggestions:</span>
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
      <h2>No matches found for "{{ query }}"</h2>
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
          <h3 class="group-title">Playlists ({{ matchedPlaylists.length }})</h3>
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
          <h3 class="group-title">Tracks ({{ matchedTracks.length }})</h3>
        </div>

        <div class="tracks-card">
          <table class="tracks-table">
            <thead>
              <tr>
                <th class="th-num">#</th>
                <th class="th-title">TITLE</th>
                <th class="th-artist">ARTIST</th>
                <th class="th-album">ALBUM</th>
                <th class="th-from">PLAYLIST</th>
                <th class="th-duration">TIME</th>
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
                    <span v-if="!isCurrentTrack(item.song)" class="num-text tabular-nums">{{ idx + 1 }}</span>
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
                    <img :src="getTrackArt(item.song, idx)" :alt="item.song.title" class="track-thumb" @error="onImgError" />
                    <span class="track-title-label" :class="{ highlight: isCurrentTrack(item.song) }">{{ item.song.title }}</span>
                  </div>
                </td>

                <td class="td-artist">
                  <span class="cell-text">{{ item.song.artist }}</span>
                </td>

                <td class="td-album">
                  <span class="cell-text dim">{{ item.song.album || '—' }}</span>
                </td>

                <td class="td-from">
                  <router-link :to="`/playlists/${item.playlistId}`" class="playlist-chip-link" @click.stop>
                    {{ item.playlistName }}
                  </router-link>
                </td>

                <td class="td-duration">
                  <span class="tabular-nums">{{ formatDuration(item.song.duration) }}</span>
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
import { formatDuration, getDistinctArtwork } from '../data/demoTracks';
import PlaylistCard from '../components/dashboard/PlaylistCard.vue';
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
  { name: 'Cosmic & Electronic', desc: 'Soundscapes & Waves', query: 'Focus', icon: '🌌' },
];

const suggestedKeywords = computed(() => {
  const set = new Set();
  playlistStore.playlists.slice(0, 5).forEach((p) => {
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

const getTrackArt = (song, idx) => {
  return getDistinctArtwork(song, idx);
};

const playFoundTrack = (item) => {
  const trackIndex = item.siblingSongs.findIndex((s) => s._id === item.song._id);
  playerStore.playTrack(item.song, item.siblingSongs, trackIndex >= 0 ? trackIndex : 0);
};

const onImgError = (e) => {
  e.target.src = getDistinctArtwork(null, 1);
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

.search-hero-box {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.prominent-search-wrapper {
  position: relative;
  width: 100%;
}

.search-icon-lg {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--sw-text-muted);
  pointer-events: none;
}

.prominent-search-input {
  width: 100%;
  height: 54px;
  padding: 0 48px 0 52px;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-md);
  color: var(--sw-text-primary);
  font-size: 1.05rem;
  outline: none;
  transition: all var(--sw-transition-fast);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.prominent-search-input:focus {
  border-color: var(--sw-accent);
  background: var(--sw-surface-hover);
  box-shadow: 0 0 0 1px var(--sw-accent);
}

.prominent-search-input::placeholder {
  color: var(--sw-text-muted);
}

.clear-query-btn {
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--sw-text-muted);
  font-size: 1.1rem;
  cursor: pointer;
}

.clear-query-btn:hover {
  color: var(--sw-text-primary);
}

.search-filter-pills {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.pill-btn {
  padding: 6px 16px;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: 20px;
  color: var(--sw-text-secondary);
  font-size: 0.82rem;
  font-weight: 500;
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.pill-btn:hover {
  background: var(--sw-surface-hover);
  color: var(--sw-text-primary);
}

.pill-btn.active {
  background: var(--sw-accent-soft);
  border-color: var(--sw-accent);
  color: var(--sw-accent-muted);
}

/* Discovery Area */
.search-discovery-area {
  display: flex;
  flex-direction: column;
  gap: 28px;
}

.discovery-header {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.discovery-title {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--sw-text-primary);
}

.discovery-sub {
  font-size: 0.9rem;
  color: var(--sw-text-secondary);
  max-width: 600px;
}

.vibes-section {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.vibes-label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: var(--sw-text-muted);
}

.vibes-tags-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 16px;
}

.vibe-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 16px;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-md);
  cursor: pointer;
  transition: all var(--sw-transition-fast);
  text-align: left;
}

.vibe-card:hover {
  background: var(--sw-surface-hover);
  border-color: var(--sw-accent);
  transform: translateY(-2px);
}

.vibe-emoji {
  font-size: 1.8rem;
}

.vibe-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.vibe-name {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--sw-text-primary);
}

.vibe-sub {
  font-size: 0.78rem;
  color: var(--sw-text-muted);
}

.quick-keywords-box {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.keywords-label {
  font-size: 0.82rem;
  color: var(--sw-text-muted);
}

.keywords-row {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.keyword-chip {
  padding: 5px 12px;
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: 14px;
  color: var(--sw-text-secondary);
  font-size: 0.8rem;
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.keyword-chip:hover {
  background: var(--sw-surface-hover);
  color: var(--sw-text-primary);
  border-color: var(--sw-accent);
}

/* No Results */
.no-results-box {
  text-align: center;
  padding: 70px 24px;
  background: var(--sw-surface);
  border: 1px dashed var(--sw-border);
  border-radius: var(--sw-radius-lg);
}

.no-results-icon {
  font-size: 3rem;
  margin-bottom: 12px;
}

.no-results-box h2 {
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--sw-text-primary);
  margin-bottom: 8px;
}

.no-results-box p {
  color: var(--sw-text-secondary);
  font-size: 0.9rem;
  margin-bottom: 20px;
}

/* Results Layout */
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

.group-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--sw-text-primary);
}

.playlists-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(210px, 1fr));
  gap: 20px;
}

.tracks-card {
  background: var(--sw-surface);
  border: 1px solid var(--sw-border);
  border-radius: var(--sw-radius-md);
  overflow-x: auto;
}

.tracks-table {
  width: 100%;
  border-collapse: collapse;
  text-align: left;
}

.tracks-table th {
  padding: 12px 16px;
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: var(--sw-text-muted);
  border-bottom: 1px solid var(--sw-border-subtle);
}

.th-num { width: 44px; text-align: center; }
.th-title { min-width: 220px; }
.th-artist { min-width: 140px; }
.th-album { min-width: 130px; }
.th-from { min-width: 150px; }
.th-duration { width: 70px; text-align: right; }

.track-row {
  cursor: pointer;
  transition: background var(--sw-transition-fast);
}

.track-row:hover {
  background: var(--sw-surface-hover);
}

.track-row.is-active {
  background: var(--sw-accent-soft);
}

.track-row td {
  padding: 10px 16px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.03);
  vertical-align: middle;
  font-size: 0.88rem;
}

.num-wrapper {
  position: relative;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

.num-text {
  color: var(--sw-text-muted);
  font-size: 0.82rem;
}

.row-play-btn {
  display: none;
  background: transparent;
  border: none;
  color: var(--sw-text-primary);
  cursor: pointer;
  padding: 0;
}

.track-row:hover .num-text,
.track-row:hover .playing-bars,
.track-row:hover .pause-icon {
  display: none;
}

.track-row:hover .row-play-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}

.track-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.track-thumb {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.track-title-label {
  font-weight: 500;
  color: var(--sw-text-primary);
}

.track-title-label.highlight {
  color: var(--sw-accent-muted);
  font-weight: 600;
}

.cell-text {
  color: var(--sw-text-secondary);
  font-size: 0.85rem;
}

.cell-text.dim {
  color: var(--sw-text-muted);
}

.playlist-chip-link {
  display: inline-block;
  padding: 3px 8px;
  background: var(--sw-surface-hover);
  border: 1px solid var(--sw-border-subtle);
  border-radius: 12px;
  color: var(--sw-text-secondary);
  font-size: 0.78rem;
  text-decoration: none;
  transition: all var(--sw-transition-fast);
}

.playlist-chip-link:hover {
  background: var(--sw-accent-soft);
  color: var(--sw-accent-muted);
}

.playing-bars {
  display: flex;
  gap: 2px;
  height: 12px;
  align-items: flex-end;
}

.playing-bars span {
  width: 2px;
  background: var(--sw-accent);
  border-radius: 1px;
  animation: barEqualizer 0.7s infinite alternate;
}

.playing-bars span:nth-child(1) { height: 40%; }
.playing-bars span:nth-child(2) { height: 100%; animation-delay: 0.2s; }
.playing-bars span:nth-child(3) { height: 60%; animation-delay: 0.1s; }

@keyframes barEqualizer {
  0% { height: 20%; }
  100% { height: 100%; }
}

@media (max-width: 800px) {
  .th-album, .td-album,
  .th-from, .td-from {
    display: none;
  }
}
</style>
