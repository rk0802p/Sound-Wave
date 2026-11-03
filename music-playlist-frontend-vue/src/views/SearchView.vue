<template>
  <div class="sw-spatial-discovery">
    <!-- 1. Kinetic Discovery Scanner Input -->
    <header class="discovery-hero-stage">
      <div class="discovery-kicker font-mono">
        <span class="scanner-dot" :class="{ 'is-scanning': query.trim().length > 0 }"></span>
        <span>FREQUENCY SCANNER // SPATIAL DISCOVERY</span>
      </div>

      <div class="scanner-search-capsule">
        <svg class="scanner-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="11" cy="11" r="8"></circle>
          <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
        </svg>

        <input
          v-model="query"
          type="text"
          placeholder="Scan frequencies by track, artist, album, or collection... (Esc to reset)"
          class="scanner-input font-display"
          autofocus
          @keydown.esc="query = ''"
        />

        <button v-if="query" class="scanner-clear-btn" @click="query = ''" title="Clear scanner" aria-label="Clear Search">
          ✕
        </button>

        <span v-else class="scanner-shortcut-hint font-mono desktop-only">ESC TO CLEAR</span>
      </div>

      <!-- Filter Category Tabs (Active when searching) -->
      <div v-if="query.trim()" class="scanner-filter-pills font-mono">
        <button
          class="filter-tab-pill"
          :class="{ active: activeCategory === 'all' }"
          @click="activeCategory = 'all'"
        >
          All Results ({{ totalResultCount }})
        </button>
        <button
          class="filter-tab-pill"
          :class="{ active: activeCategory === 'playlists' }"
          @click="activeCategory = 'playlists'"
        >
          Collections ({{ matchedPlaylists.length }})
        </button>
        <button
          class="filter-tab-pill"
          :class="{ active: activeCategory === 'tracks' }"
          @click="activeCategory = 'tracks'"
        >
          Frequencies ({{ matchedTracks.length }})
        </button>
      </div>
    </header>

    <!-- 2. Idle Discovery State: Atmospheric Frequency Tiles -->
    <div v-if="!query.trim()" class="discovery-portals-view">
      <div class="discovery-section-label font-mono">CURATED ATMOSPHERIC PORTALS</div>

      <div class="frequency-portals-grid">
        <div
          v-for="vibe in genreVibes"
          :key="vibe.name"
          class="frequency-portal-card"
          @click="query = vibe.query"
        >
          <div class="portal-halo" :style="{ background: vibe.color }"></div>
          <span class="portal-badge font-mono">{{ vibe.code }}</span>
          <div class="portal-text">
            <h3 class="portal-title font-display">{{ vibe.name }}</h3>
            <p class="portal-desc">{{ vibe.desc }}</p>
          </div>
          <div class="portal-foot font-mono">SCAN FREQUENCY →</div>
        </div>
      </div>

      <!-- Suggested Archival Keywords -->
      <div v-if="suggestedKeywords.length" class="archival-keywords-strip">
        <span class="keywords-label font-mono">ARCHIVED KEYWORDS:</span>
        <div class="keywords-wrap">
          <button
            v-for="kw in suggestedKeywords"
            :key="kw"
            class="kw-pill font-mono"
            @click="query = kw"
          >
            {{ kw }}
          </button>
        </div>
      </div>
    </div>

    <!-- 3. Zero Results State -->
    <div v-else-if="matchedPlaylists.length === 0 && matchedTracks.length === 0" class="discovery-empty-state">
      <div class="empty-scanner-ring font-mono">∅</div>
      <h2 class="font-display">No Resonance Detected for "{{ query }}"</h2>
      <p>Try searching for a different keyword, artist name, or track title in your collection.</p>
      <button class="stage-btn secondary font-mono" @click="query = ''">Reset Scanner</button>
    </div>

    <!-- 4. Populated Search Results -->
    <div v-else class="discovery-results-stream">
      <!-- A. Matching Collections / Playlists -->
      <section
        v-if="(activeCategory === 'all' || activeCategory === 'playlists') && matchedPlaylists.length"
        class="results-block"
      >
        <div class="block-header">
          <span class="block-kicker font-mono">MATCHING ARCHIVES</span>
          <h3 class="block-title font-display">Collections ({{ matchedPlaylists.length }})</h3>
        </div>

        <div class="results-collections-grid">
          <div
            v-for="(p, idx) in matchedPlaylists"
            :key="p._id"
            class="result-collection-card"
            @click="router.push(`/playlists/${p._id}`)"
          >
            <div class="collection-sleeve-thumb">
              <img v-if="p.coverImage" :src="p.coverImage" :alt="p.name" class="thumb-img" />
              <div v-else class="thumb-gen font-display" :style="getGenerativeCoverStyle(p.name)">
                {{ getMonogram(p.name) }}
              </div>
            </div>

            <div class="collection-info">
              <div class="collection-top font-mono">
                <span class="col-count">{{ p.songs?.length || 0 }} FREQ</span>
              </div>
              <h4 class="col-name font-display">{{ p.name }}</h4>
              <p v-if="p.description" class="col-desc">{{ p.description }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- B. Matching Acoustic Tracks -->
      <section
        v-if="(activeCategory === 'all' || activeCategory === 'tracks') && matchedTracks.length"
        class="results-block"
      >
        <div class="block-header">
          <span class="block-kicker font-mono">MATCHING FREQUENCIES</span>
          <h3 class="block-title font-display">Acoustic Tracks ({{ matchedTracks.length }})</h3>
        </div>

        <div class="results-tracks-sequence">
          <div
            v-for="(item, idx) in matchedTracks"
            :key="item.song._id || idx"
            class="result-track-strip"
            :class="{ 'is-active': isCurrentTrack(item.song), 'is-playing': isCurrentTrack(item.song) && playerStore.isPlaying }"
            @click="handlePlaySearchResult(item)"
          >
            <!-- Play trigger / index -->
            <button class="track-strip-play-btn font-mono">
              <div v-if="isCurrentTrack(item.song) && playerStore.isPlaying" class="strip-eq">
                <span></span><span></span><span></span>
              </div>
              <span v-else class="play-arrow">▶</span>
            </button>

            <!-- Metadata -->
            <div class="track-strip-info">
              <div class="strip-row">
                <span class="track-name font-display">{{ item.song.title }}</span>
                <span class="track-provider font-mono" :class="getProviderClass(item.song.url)">
                  {{ getProviderName(item.song.url) }}
                </span>
              </div>
              <div class="strip-sub font-mono">
                <span>{{ item.song.artist || 'Unknown Artist' }}</span>
                <span v-if="item.playlistName" class="strip-playlist-parent">
                  • IN ARCHIVE: {{ item.playlistName }}
                </span>
              </div>
            </div>

            <!-- Duration -->
            <div class="track-strip-duration font-mono">
              {{ formatDuration(item.song.duration) }}
            </div>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { usePlaylistStore } from '../stores/playlist';
import { usePlayerStore } from '../stores/player';
import { useToastStore } from '../stores/toast';
import { detectProviderType } from '../services/providers/detector';

const route = useRoute();
const router = useRouter();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();
const toastStore = useToastStore();

const query = ref('');
const activeCategory = ref('all'); // 'all' | 'playlists' | 'tracks'

const genreVibes = [
  { name: 'Late Night Lo-Fi', desc: 'Analog tape warmth & vinyl dust', code: 'FREQ // 01', query: 'Lo-Fi', color: 'rgba(204, 255, 0, 0.22)' },
  { name: 'Deep Space Ambient', desc: 'Infinite reverberations & drones', code: 'FREQ // 02', query: 'Ambient', color: 'rgba(168, 85, 247, 0.22)' },
  { name: 'Cyberpunk Synthwave', desc: '80s analog neon voltage', code: 'FREQ // 03', query: 'Synthwave', color: 'rgba(244, 63, 94, 0.22)' },
  { name: 'Velvet Midnight Jazz', desc: 'Acoustic brass, double bass & smoke', code: 'FREQ // 04', query: 'Jazz', color: 'rgba(245, 158, 11, 0.22)' },
  { name: 'Neo-Classical Piano', desc: 'Felt piano & acoustic spatial strings', code: 'FREQ // 05', query: 'Classical', color: 'rgba(16, 185, 129, 0.22)' },
  { name: 'Electronic Modular', desc: 'Analog synthesis & hypnotic sub-bass', code: 'FREQ // 06', query: 'Electronic', color: 'rgba(234, 179, 8, 0.22)' },
];

const getMonogram = (name) => {
  if (!name) return 'SW';
  return name.slice(0, 2).toUpperCase();
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

const formatDuration = (sec) => {
  if (!sec || isNaN(sec)) return '--:--';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const isCurrentTrack = (song) => {
  if (!playerStore.currentTrack) return false;
  return (
    playerStore.currentTrack._id === song._id ||
    (playerStore.currentTrack.title === song.title &&
      playerStore.currentTrack.artist === song.artist)
  );
};

const getProviderName = (url) => {
  if (!url) return 'MP3';
  const type = detectProviderType(url);
  if (type === 'youtube') return 'YOUTUBE';
  if (type === 'spotify') return 'SPOTIFY';
  return 'LOSSLESS';
};

const getProviderClass = (url) => {
  if (!url) return 'prov-direct';
  const type = detectProviderType(url);
  return `prov-${type}`;
};

// Matched Playlists
const matchedPlaylists = computed(() => {
  if (!query.value.trim()) return [];
  const q = query.value.toLowerCase().trim();
  return playlistStore.playlists.filter(
    (p) =>
      p.name.toLowerCase().includes(q) ||
      (p.description && p.description.toLowerCase().includes(q))
  );
});

// Matched Individual Tracks across all playlists
const matchedTracks = computed(() => {
  if (!query.value.trim()) return [];
  const q = query.value.toLowerCase().trim();
  const results = [];

  playlistStore.playlists.forEach((playlist) => {
    (playlist.songs || []).forEach((song) => {
      if (
        (song.title && song.title.toLowerCase().includes(q)) ||
        (song.artist && song.artist.toLowerCase().includes(q)) ||
        (song.album && song.album.toLowerCase().includes(q))
      ) {
        results.push({
          song,
          playlistId: playlist._id,
          playlistName: playlist.name,
          playlist,
        });
      }
    });
  });

  return results;
});

const totalResultCount = computed(() => {
  return matchedPlaylists.value.length + matchedTracks.value.length;
});

const suggestedKeywords = computed(() => {
  const words = new Set();
  playlistStore.playlists.forEach((p) => {
    (p.songs || []).forEach((s) => {
      if (s.artist) words.add(s.artist);
    });
  });
  return Array.from(words).slice(0, 6);
});

const handlePlaySearchResult = (item) => {
  if (isCurrentTrack(item.song)) {
    playerStore.togglePlay();
  } else {
    playerStore.playTrack(item.song, item.playlist, item.playlist?.songs || [item.song]);
    toastStore.info(`Resonating "${item.song.title}"`);
  }
};

watch(
  () => route.query.q,
  (newQ) => {
    if (newQ !== undefined) query.value = newQ;
  },
  { immediate: true }
);

watch(query, (newQ) => {
  if (newQ !== route.query.q) {
    router.replace({ query: newQ ? { q: newQ } : {} });
  }
});
</script>

<style scoped>
.sw-spatial-discovery {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 40px;
}

/* 1. Scanner Hero Stage */
.discovery-hero-stage {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.discovery-kicker {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--sw-text-muted);
}

.scanner-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--sw-accent);
}

.scanner-dot.is-scanning {
  animation: pulse-beacon-anim 1s infinite;
}

.scanner-search-capsule {
  position: relative;
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 24px;
  background: rgba(13, 16, 23, 0.7);
  backdrop-filter: blur(28px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: var(--sw-radius-full);
  box-shadow: 0 16px 40px rgba(0, 0, 0, 0.6);
  transition: all var(--sw-transition-normal);
}

.scanner-search-capsule:focus-within {
  border-color: rgba(204, 255, 0, 0.5);
  box-shadow: 0 20px 48px rgba(0, 0, 0, 0.75), 0 0 28px rgba(204, 255, 0, 0.2);
}

.scanner-icon {
  color: var(--sw-accent);
}

.scanner-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: clamp(16px, 2.5vw, 22px);
  font-weight: 600;
  color: #fff;
}

.scanner-input::placeholder {
  color: var(--sw-text-dim);
}

.scanner-clear-btn {
  color: var(--sw-text-muted);
  cursor: pointer;
  font-size: 16px;
}

.scanner-clear-btn:hover {
  color: #fff;
}

.scanner-shortcut-hint {
  font-size: 10px;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  color: var(--sw-text-muted);
}

.scanner-filter-pills {
  display: flex;
  gap: 8px;
  margin-top: 4px;
}

.filter-tab-pill {
  padding: 6px 16px;
  border-radius: var(--sw-radius-full);
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  color: var(--sw-text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.filter-tab-pill:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.08);
}

.filter-tab-pill.active {
  background: rgba(204, 255, 0, 0.15);
  border-color: rgba(204, 255, 0, 0.35);
  color: #fff;
}

/* 2. Frequency Portals (Idle) */
.discovery-portals-view {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.discovery-section-label {
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--sw-text-muted);
}

.frequency-portals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 20px;
}

.frequency-portal-card {
  position: relative;
  padding: 24px;
  background: rgba(13, 16, 23, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--sw-radius-xl);
  overflow: hidden;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 180px;
  transition: all var(--sw-transition-fast);
}

.frequency-portal-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.7);
}

.portal-halo {
  position: absolute;
  inset: 0;
  opacity: 0.15;
  transition: opacity var(--sw-transition-fast);
}

.frequency-portal-card:hover .portal-halo {
  opacity: 0.35;
}

.portal-badge {
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--sw-accent);
  position: relative;
  z-index: 1;
}

.portal-text {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.portal-title {
  font-size: 20px;
  font-weight: 700;
  color: #fff;
}

.portal-desc {
  font-size: 13px;
  color: var(--sw-text-secondary);
  line-height: 1.5;
}

.portal-foot {
  font-size: 10px;
  color: var(--sw-text-muted);
  position: relative;
  z-index: 1;
  transition: color var(--sw-transition-fast);
}

.frequency-portal-card:hover .portal-foot {
  color: #fff;
}

.archival-keywords-strip {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 16px 20px;
  background: rgba(13, 16, 23, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--sw-radius-md);
  flex-wrap: wrap;
}

.keywords-label {
  font-size: 10px;
  color: var(--sw-text-muted);
}

.keywords-wrap {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.kw-pill {
  padding: 4px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--sw-radius-full);
  color: var(--sw-text-secondary);
  font-size: 11px;
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.kw-pill:hover {
  background: rgba(204, 255, 0, 0.12);
  border-color: var(--sw-accent);
  color: #fff;
}

/* 3. Empty State */
.discovery-empty-state {
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

.empty-scanner-ring {
  width: 60px;
  height: 60px;
  border-radius: 50%;
  border: 1px solid var(--sw-accent);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  color: var(--sw-accent);
}

.stage-btn.secondary {
  padding: 10px 20px;
  background: rgba(255, 255, 255, 0.08);
  border: 1px solid rgba(255, 255, 255, 0.15);
  border-radius: var(--sw-radius-full);
  color: #fff;
  cursor: pointer;
}

/* 4. Results Stream */
.discovery-results-stream {
  display: flex;
  flex-direction: column;
  gap: 40px;
}

.results-block {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.block-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.block-kicker {
  font-size: 10px;
  color: var(--sw-text-muted);
  letter-spacing: 0.12em;
}

.block-title {
  font-size: 22px;
  font-weight: 700;
  color: #fff;
}

.results-collections-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
}

.result-collection-card {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px;
  background: rgba(13, 16, 23, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--sw-radius-md);
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.result-collection-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-2px);
}

.collection-sleeve-thumb {
  width: 52px;
  height: 52px;
  border-radius: var(--sw-radius-sm);
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
  font-size: 16px;
  font-weight: 700;
}

.collection-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.col-count {
  font-size: 9px;
  color: var(--sw-accent);
}

.col-name {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.col-desc {
  font-size: 11px;
  color: var(--sw-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Results Tracks Sequence */
.results-tracks-sequence {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.result-track-strip {
  display: flex;
  align-items: center;
  gap: 14px;
  padding: 12px 18px;
  background: rgba(13, 16, 23, 0.5);
  border: 1px solid rgba(255, 255, 255, 0.05);
  border-radius: var(--sw-radius-md);
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.result-track-strip:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.12);
  transform: translateX(4px);
}

.result-track-strip.is-active {
  background: rgba(204, 255, 0, 0.08);
  border-color: rgba(204, 255, 0, 0.35);
}

.track-strip-play-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.04);
  color: var(--sw-text-secondary);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: all var(--sw-transition-fast);
}

.result-track-strip:hover .track-strip-play-btn {
  background: var(--sw-accent);
  color: #060709;
}

.strip-eq {
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 12px;
}

.strip-eq span {
  width: 3px;
  background: var(--sw-accent);
  animation: eq-bounce 0.8s ease-in-out infinite alternate;
}

.track-strip-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
  overflow: hidden;
}

.strip-row {
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
}

.track-name {
  font-size: 14px;
  font-weight: 600;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-provider {
  font-size: 8px;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--sw-radius-full);
}

.prov-direct {
  background: rgba(204, 255, 0, 0.15);
  color: var(--sw-accent);
}

.prov-youtube {
  background: rgba(244, 63, 94, 0.15);
  color: #f43f5e;
}

.prov-spotify {
  background: rgba(16, 185, 129, 0.15);
  color: #10b981;
}

.strip-sub {
  font-size: 11px;
  color: var(--sw-text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.strip-playlist-parent {
  color: var(--sw-text-dim);
}

.track-strip-duration {
  font-size: 12px;
  color: var(--sw-text-secondary);
  text-align: right;
  width: 44px;
}
</style>
