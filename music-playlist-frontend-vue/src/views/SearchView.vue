<template>
  <div class="search-view-wrapper">
    <!-- Big Search Input Header -->
    <header class="search-header">
      <div class="search-bar-prominent">
        <svg class="search-icon-big" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>
        <input
          v-model="query"
          type="text"
          placeholder="Search by track title, artist, album, or playlist..."
          class="prominent-search-input"
          autofocus
        />
        <button v-if="query" class="prominent-clear-btn" @click="query = ''">✕</button>
      </div>

      <div class="filter-pills" v-if="query">
        <button
          class="filter-pill"
          :class="{ active: activeFilter === 'all' }"
          @click="activeFilter = 'all'"
        >
          All ({{ matchedPlaylists.length + matchedTracks.length }})
        </button>
        <button
          class="filter-pill"
          :class="{ active: activeFilter === 'playlists' }"
          @click="activeFilter = 'playlists'"
        >
          Playlists ({{ matchedPlaylists.length }})
        </button>
        <button
          class="filter-pill"
          :class="{ active: activeFilter === 'tracks' }"
          @click="activeFilter = 'tracks'"
        >
          Tracks ({{ matchedTracks.length }})
        </button>
      </div>
    </header>

    <!-- Initial Search Prompt (When query is empty) -->
    <div v-if="!query.trim()" class="search-idle-state">
      <div class="idle-icon">🔍</div>
      <h2>Search Your Collection</h2>
      <p>Find playlists, tracks, albums, and artists in your personal library workstation.</p>

      <!-- Quick Suggested Tags from existing playlists -->
      <div v-if="suggestedQueries.length" class="suggestions-box">
        <span class="suggest-label">Suggestions:</span>
        <div class="suggest-tags">
          <button
            v-for="s in suggestedQueries"
            :key="s"
            class="suggest-tag-btn"
            @click="query = s"
          >
            {{ s }}
          </button>
        </div>
      </div>
    </div>

    <!-- No Results State -->
    <div v-else-if="matchedPlaylists.length === 0 && matchedTracks.length === 0" class="no-results-state">
      <div class="no-results-icon">📻</div>
      <h2>No matches for "{{ query }}"</h2>
      <p>Try searching for a different keyword, artist name, or track title.</p>
      <button class="ghost-btn" @click="query = ''">Clear Search</button>
    </div>

    <!-- Search Results Section -->
    <div v-else class="results-container">
      <!-- 1. Playlists Results -->
      <section v-if="(activeFilter === 'all' || activeFilter === 'playlists') && matchedPlaylists.length" class="result-section">
        <div class="section-title-row">
          <h3>Playlists ({{ matchedPlaylists.length }})</h3>
        </div>

        <div class="playlist-grid">
          <div
            v-for="pl in matchedPlaylists"
            :key="pl._id"
            class="playlist-card"
            @click="goToPlaylist(pl._id)"
          >
            <div class="card-art-box">
              <img :src="pl.coverImage || defaultCover" :alt="pl.name" class="card-art" @error="onImgError" />
              <button
                class="hover-play-btn"
                :disabled="!pl.songs?.length"
                @click.stop="quickPlayPlaylist(pl)"
                title="Play Playlist"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z"/>
                </svg>
              </button>
            </div>
            <div class="card-info">
              <span class="card-title">{{ pl.name }}</span>
              <span class="card-sub">{{ pl.songs?.length || 0 }} tracks</span>
            </div>
          </div>
        </div>
      </section>

      <!-- 2. Tracks Results -->
      <section v-if="(activeFilter === 'all' || activeFilter === 'tracks') && matchedTracks.length" class="result-section">
        <div class="section-title-row">
          <h3>Tracks ({{ matchedTracks.length }})</h3>
        </div>

        <div class="track-list-card">
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
                    <span v-if="!isCurrentTrack(item.song)" class="num-idx">{{ idx + 1 }}</span>
                    <span v-else-if="playerStore.isPlaying" class="playing-bars">
                      <span></span><span></span><span></span>
                    </span>
                    <span v-else class="pause-icon">⏸</span>

                    <button class="row-play-btn">
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
                  <div class="track-title-cell">
                    <img :src="item.song.coverImage || defaultCover" :alt="item.song.title" class="track-thumb" @error="onImgError" />
                    <span class="track-name" :class="{ highlight: isCurrentTrack(item.song) }">{{ item.song.title }}</span>
                  </div>
                </td>

                <td class="td-artist">
                  <span class="cell-text">{{ item.song.artist }}</span>
                </td>

                <td class="td-album">
                  <span class="cell-text dim">{{ item.song.album || '—' }}</span>
                </td>

                <td class="td-from">
                  <router-link :to="`/playlists/${item.playlistId}`" class="playlist-pill-link" @click.stop>
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
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { usePlaylistStore } from '../stores/playlist';
import { usePlayerStore } from '../stores/player';
import { formatDuration } from '../data/demoTracks';

const router = useRouter();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();

const query = ref('');
const activeFilter = ref('all'); // 'all' | 'playlists' | 'tracks'
const defaultCover = 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=200&auto=format&fit=crop';

const suggestedQueries = computed(() => {
  const suggestions = new Set();
  playlistStore.playlists.slice(0, 5).forEach((p) => {
    suggestions.add(p.name);
    if (p.songs && p.songs.length) {
      p.songs.slice(0, 2).forEach((s) => {
        if (s.artist) suggestions.add(s.artist);
      });
    }
  });
  return Array.from(suggestions).slice(0, 6);
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
  const results = [];

  playlistStore.playlists.forEach((playlist) => {
    if (!playlist.songs) return;
    playlist.songs.forEach((song) => {
      const match =
        song.title.toLowerCase().includes(q) ||
        song.artist.toLowerCase().includes(q) ||
        (song.album && song.album.toLowerCase().includes(q));

      if (match) {
        results.push({
          song,
          playlistId: playlist._id,
          playlistName: playlist.name,
          siblingSongs: playlist.songs,
        });
      }
    });
  });

  return results;
});

const isCurrentTrack = (song) => {
  return playerStore.currentTrack && playerStore.currentTrack._id === song._id;
};

const goToPlaylist = (id) => {
  router.push(`/playlists/${id}`);
};

const quickPlayPlaylist = (playlist) => {
  if (playlist.songs && playlist.songs.length) {
    playerStore.playTrack(playlist.songs[0], playlist.songs, 0);
  }
};

const playFoundTrack = (item) => {
  const trackIndex = item.siblingSongs.findIndex((s) => s._id === item.song._id);
  playerStore.playTrack(item.song, item.siblingSongs, trackIndex >= 0 ? trackIndex : 0);
};

const onImgError = (e) => {
  e.target.src = defaultCover;
};
</script>

<style scoped>
.search-view-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  display: flex;
  flex-direction: column;
  gap: 28px;
}

/* Header & Prominent Search */
.search-header {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.search-bar-prominent {
  position: relative;
  width: 100%;
}

.search-icon-big {
  position: absolute;
  left: 18px;
  top: 50%;
  transform: translateY(-50%);
  color: var(--text-muted, #71717A);
  pointer-events: none;
}

.prominent-search-input {
  width: 100%;
  padding: 16px 48px 16px 52px;
  background: var(--bg-surface, #101117);
  border: 1px solid var(--border-default, #25252F);
  border-radius: 14px;
  color: var(--text-primary, #F4F3FA);
  font-size: 1.1rem;
  outline: none;
  transition: all 0.2s ease;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
}

.prominent-search-input:focus {
  border-color: var(--accent-primary, #766BFF);
  box-shadow: 0 4px 24px rgba(118, 107, 255, 0.15);
}

.prominent-clear-btn {
  position: absolute;
  right: 18px;
  top: 50%;
  transform: translateY(-50%);
  background: transparent;
  border: none;
  color: var(--text-muted, #71717A);
  font-size: 1.1rem;
  cursor: pointer;
}

.filter-pills {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
}

.filter-pill {
  padding: 6px 16px;
  background: var(--bg-surface, #101117);
  border: 1px solid var(--border-default, #25252F);
  border-radius: 20px;
  color: var(--text-secondary, #A1A1AA);
  font-size: 0.85rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.filter-pill:hover {
  background: var(--bg-hover, #24242F);
  color: var(--text-primary, #F4F3FA);
}

.filter-pill.active {
  background: var(--accent-soft, #24213F);
  border-color: var(--accent-primary, #766BFF);
  color: var(--accent-primary, #766BFF);
}

/* States */
.search-idle-state,
.no-results-state {
  text-align: center;
  padding: 80px 24px;
  background: var(--bg-surface, #101117);
  border: 1px dashed var(--border-default, #25252F);
  border-radius: 16px;
}

.idle-icon,
.no-results-icon {
  font-size: 3rem;
  margin-bottom: 14px;
}

.search-idle-state h2,
.no-results-state h2 {
  font-size: 1.5rem;
  font-weight: 700;
  color: var(--text-primary, #F4F3FA);
  margin-bottom: 8px;
}

.search-idle-state p,
.no-results-state p {
  color: var(--text-secondary, #A1A1AA);
  font-size: 0.95rem;
  max-width: 500px;
  margin: 0 auto 24px auto;
}

.suggestions-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  flex-wrap: wrap;
  margin-top: 10px;
}

.suggest-label {
  font-size: 0.85rem;
  color: var(--text-muted, #71717A);
}

.suggest-tags {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.suggest-tag-btn {
  padding: 5px 12px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid var(--border-default, #25252F);
  border-radius: 14px;
  color: var(--text-secondary, #A1A1AA);
  font-size: 0.82rem;
  cursor: pointer;
  transition: all 0.15s;
}

.suggest-tag-btn:hover {
  background: var(--bg-hover, #24242F);
  color: var(--text-primary, #F4F3FA);
  border-color: var(--accent-primary, #766BFF);
}

.ghost-btn {
  padding: 8px 18px;
  background: transparent;
  border: 1px solid var(--border-default, #25252F);
  color: var(--text-primary, #F4F3FA);
  border-radius: 8px;
  cursor: pointer;
}

/* Results */
.results-container {
  display: flex;
  flex-direction: column;
  gap: 36px;
}

.result-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.section-title-row h3 {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text-primary, #F4F3FA);
}

/* Playlists Grid */
.playlist-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 18px;
}

.playlist-card {
  background: var(--bg-surface, #101117);
  border: 1px solid var(--border-default, #25252F);
  border-radius: 12px;
  padding: 14px;
  cursor: pointer;
  transition: all 0.2s;
}

.playlist-card:hover {
  transform: translateY(-3px);
  border-color: rgba(118, 107, 255, 0.4);
  background: var(--bg-elevated, #191922);
}

.card-art-box {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: 8px;
  overflow: hidden;
  margin-bottom: 12px;
  background: #000;
}

.card-art {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hover-play-btn {
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--accent-primary, #766BFF);
  color: #fff;
  border: none;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  opacity: 0;
  transform: translateY(6px);
  transition: all 0.2s;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
}

.playlist-card:hover .hover-play-btn {
  opacity: 1;
  transform: translateY(0);
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-title {
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--text-primary, #F4F3FA);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-sub {
  font-size: 0.8rem;
  color: var(--text-muted, #71717A);
}

/* Track List Table */
.track-list-card {
  background: var(--bg-surface, #101117);
  border: 1px solid var(--border-default, #25252F);
  border-radius: 14px;
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
  color: var(--text-muted, #71717A);
  border-bottom: 1px solid var(--border-default, #25252F);
}

.th-num { width: 44px; text-align: center; }
.th-title { min-width: 220px; }
.th-artist { min-width: 140px; }
.th-album { min-width: 130px; }
.th-from { min-width: 150px; }
.th-duration { width: 70px; text-align: right; }

.track-row {
  cursor: pointer;
  transition: background 0.15s;
}

.track-row:hover {
  background: var(--bg-hover, #24242F);
}

.track-row.is-active {
  background: rgba(118, 107, 255, 0.1);
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

.num-idx {
  color: var(--text-muted, #71717A);
  font-size: 0.85rem;
}

.row-play-btn {
  display: none;
  background: transparent;
  border: none;
  color: #fff;
  cursor: pointer;
  padding: 0;
}

.track-row:hover .num-idx,
.track-row:hover .playing-bars,
.track-row:hover .pause-icon {
  display: none;
}

.track-row:hover .row-play-btn {
  display: flex;
  align-items: center;
  justify-content: center;
}

.track-title-cell {
  display: flex;
  align-items: center;
  gap: 12px;
}

.track-thumb {
  width: 36px;
  height: 36px;
  border-radius: 6px;
  object-fit: cover;
}

.track-name {
  font-weight: 500;
  color: var(--text-primary, #F4F3FA);
}

.track-name.highlight {
  color: var(--accent-primary, #766BFF);
  font-weight: 600;
}

.cell-text {
  color: var(--text-secondary, #A1A1AA);
  font-size: 0.85rem;
}

.cell-text.dim {
  color: var(--text-muted, #71717A);
}

.playlist-pill-link {
  display: inline-block;
  padding: 4px 10px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 12px;
  color: var(--text-secondary, #A1A1AA);
  font-size: 0.78rem;
  text-decoration: none;
  transition: all 0.15s;
}

.playlist-pill-link:hover {
  background: var(--accent-soft, #24213F);
  color: var(--accent-primary, #766BFF);
}

.playing-bars {
  display: flex;
  gap: 2px;
  height: 12px;
  align-items: flex-end;
}

.playing-bars span {
  width: 2px;
  background: var(--accent-primary, #766BFF);
  border-radius: 1px;
  animation: barAnim 0.7s infinite alternate;
}

.playing-bars span:nth-child(1) { height: 40%; }
.playing-bars span:nth-child(2) { height: 100%; animation-delay: 0.2s; }
.playing-bars span:nth-child(3) { height: 60%; animation-delay: 0.1s; }

@keyframes barAnim {
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
