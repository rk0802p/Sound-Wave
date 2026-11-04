<template>
  <div class="pg-search-root">
    <!-- 0. Editorial Top Nav -->
    <nav class="search-top-nav">
      <router-link to="/" class="back-home-pill font-mono">
        ← BACK TO HOMEPAGE
      </router-link>
      <div class="nav-brand font-display">
        <span class="orb-icon">🎧</span>
        <span>SOUNDWAVE ONLINE DISCOVERY</span>
      </div>
      <button class="queue-toggle-top font-mono" @click="showQueueDrawer = !showQueueDrawer">
        UP NEXT QUEUE ({{ playerStore.queue?.length || 0 }})
      </button>
    </nav>

    <!-- 1. Editorial Search Header Stage -->
    <header class="pg-search-header">
      <div class="search-kicker-strip font-mono">
        <span class="search-kicker-tag">MULTI-SOURCE DISCOVERY</span>
        <span class="search-kicker-sub">INTERNET ARCHIVE • OPEN AUDIO NETWORKS • MIXTAPES</span>
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
          :class="{ 'is-active': activeCategory === 'online' }"
          @click="activeCategory === 'online'"
        >
          Online Discoveries ({{ onlineTracks.length }})
        </button>
        <button
          class="category-tab-btn"
          :class="{ 'is-active': activeCategory === 'playlists' }"
          @click="activeCategory === 'playlists'"
        >
          Mixtapes ({{ matchedPlaylists.length }})
        </button>
        <button
          class="category-tab-btn"
          :class="{ 'is-active': activeCategory === 'tracks' }"
          @click="activeCategory === 'tracks'"
        >
          Saved Tracks ({{ matchedTracks.length }})
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
    <div
      v-else-if="!isSearchingOnline && matchedPlaylists.length === 0 && matchedTracks.length === 0 && onlineTracks.length === 0"
      class="pg-empty-search"
    >
      <div class="empty-glyph font-display">00</div>
      <h3 class="empty-title font-display">No Results for "{{ query }}"</h3>
      <p class="empty-text">Check your spelling or explore one of the curated sound portals below.</p>
      <button class="reset-search-btn font-mono" @click="query = ''">Reset Search</button>
    </div>

    <!-- 4. Active Results State -->
    <div v-else class="pg-results-stage">
      <!-- Section A: Online Multi-Source Music Discoveries -->
      <section
        v-if="(activeCategory === 'all' || activeCategory === 'online')"
        class="results-section"
      >
        <div class="results-header">
          <div class="header-with-status">
            <h4 class="results-title font-display">Online Music Discoveries</h4>
            <!-- Provider Status Badges -->
            <div class="provider-status-strip font-mono">
              <span
                class="status-indicator"
                :class="getProviderStatusClass('archive')"
                title="Internet Archive Audio Network"
              >
                ARCHIVE: {{ getProviderStatusLabel('archive') }}
              </span>
              <span
                class="status-indicator"
                :class="getProviderStatusClass('jamendo')"
                title="Jamendo Creative Commons Catalog"
              >
                JAMENDO: {{ getProviderStatusLabel('jamendo') }}
              </span>
              <span
                class="status-indicator"
                :class="getProviderStatusClass('audius')"
                title="Audius Decentralized Music Network"
              >
                AUDIUS: {{ getProviderStatusLabel('audius') }}
              </span>
              <span
                class="status-indicator"
                :class="getProviderStatusClass('saavn')"
                title="JioSaavn Development Provider (Experimental PoC)"
              >
                DEV-SAAVN: {{ getProviderStatusLabel('saavn') }}
              </span>
            </div>
          </div>

          <span class="results-count font-mono">
            <span v-if="isSearchingOnline" class="searching-pulse">SEARCHING NETWORK...</span>
            <span v-else>{{ onlineTracks.length }} DISCOVERED</span>
          </span>
        </div>

        <!-- Searching Spinner State -->
        <div v-if="isSearchingOnline && !onlineTracks.length" class="online-searching-indicator font-mono">
          <div class="spinner-dot"></div> Aggregating legal streams from Internet Archive & Open Music Networks...
        </div>

        <!-- Online Track Results -->
        <div v-else-if="onlineTracks.length" class="tracks-results-list">
          <div
            v-for="(track, idx) in onlineTracks"
            :key="track.id || track._id || idx"
            class="result-track-row online-track-row"
            :class="{ 'is-active': isTrackPlaying(track) }"
            @click="handlePlayOnlineTrack(track)"
          >
            <button class="result-play-icon font-mono" @click.stop="handlePlayOnlineTrack(track)">
              {{ isTrackPlaying(track) && playerStore.isPlaying ? '❚❚' : '▶' }}
            </button>

            <div class="result-track-details">
              <div class="result-track-top">
                <span class="track-title-text font-display">{{ track.title }}</span>
                <span class="track-source-pill font-mono" :class="getProviderPillClass(track)">
                  {{ getProviderLabel(track) }}
                </span>
                <span v-if="track.license" class="track-license-pill font-mono">
                  <a
                    v-if="track.licenseUrl"
                    :href="track.licenseUrl"
                    target="_blank"
                    rel="noopener noreferrer"
                    @click.stop
                  >{{ track.license }}</a>
                  <span v-else>{{ track.license }}</span>
                </span>
                <button
                  v-if="track.alternatives && track.alternatives.length > 0"
                  class="alt-sources-pill font-mono"
                  @click.stop="switchAlternativeSource(track, 0)"
                  title="Click to toggle alternate source stream"
                >
                  +{{ track.alternatives.length }} ALT SOURCE
                </button>
              </div>

              <div class="result-track-sub font-mono">
                <span>{{ track.artist || 'Unknown Artist' }}</span>
                <span v-if="track.album">/ {{ track.album }}</span>
                <span v-if="track.attribution" class="track-attribution">• {{ track.attribution }}</span>
              </div>
            </div>

            <div class="result-actions" @click.stop>
              <button
                class="add-to-queue-btn font-mono"
                @click="handleAddToQueue(track)"
                title="Add to Up Next Queue"
              >
                + QUEUE
              </button>
              <button
                class="add-to-mixtape-btn font-mono"
                @click="openAddModal(track)"
                title="Add to Mixtape"
              >
                + ADD TO MIXTAPE
              </button>
            </div>

            <span class="result-track-time font-mono">
              {{ formatDuration(track.duration) }}
            </span>
          </div>
        </div>
      </section>

      <!-- Section B: Matched Mixtapes Section -->
      <section
        v-if="(activeCategory === 'all' || activeCategory === 'playlists') && matchedPlaylists.length"
        class="results-section"
      >
        <div class="results-header">
          <h4 class="results-title font-display">Archived Mixtapes</h4>
          <span class="results-count font-mono">{{ matchedPlaylists.length }} FOUND</span>
        </div>

        <div class="mixtapes-results-grid">
          <div
            v-for="playlist in matchedPlaylists"
            :key="playlist._id"
            class="result-mixtape-card"
            @click="router.push('/playlists/' + playlist._id)"
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

      <!-- Section C: Matched Saved Tracks Section -->
      <section
        v-if="(activeCategory === 'all' || activeCategory === 'tracks') && matchedTracks.length"
        class="results-section"
      >
        <div class="results-header">
          <h4 class="results-title font-display">Saved Mixtape Tracks</h4>
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

            <div class="result-actions" @click.stop>
              <button
                class="add-to-queue-btn font-mono"
                @click="handleAddToQueue(item.song)"
                title="Add to Up Next Queue"
              >
                + QUEUE
              </button>
            </div>

            <span class="result-track-time font-mono">
              {{ formatDuration(item.song.duration) }}
            </span>
          </div>
        </div>
      </section>
    </div>

    <!-- Quick Add to Mixtape Picker Modal -->
    <div v-if="showAddModal" class="mixtape-picker-overlay" @click.self="showAddModal = false">
      <div class="mixtape-picker-card">
        <div class="picker-header">
          <span class="picker-kicker font-mono">TRACK ACQUISITION</span>
          <h4 class="picker-title font-display">{{ targetTrackForAdd?.title }}</h4>
          <span class="picker-artist font-mono">
            {{ targetTrackForAdd?.artist }} • {{ getProviderLabel(targetTrackForAdd) }}
          </span>
        </div>

        <div v-if="playlistStore.playlists.length === 0" class="no-playlists-hint">
          <p>No mixtapes available. Create a mixtape to save this track.</p>
        </div>

        <div v-else class="mixtapes-picker-list">
          <button
            v-for="pl in playlistStore.playlists"
            :key="pl._id"
            class="picker-playlist-item"
            :disabled="isAddingToPlaylist"
            @click="addTrackToSelectedPlaylist(pl)"
          >
            <div class="picker-item-info">
              <span class="picker-item-name font-display">{{ pl.name }}</span>
              <span class="picker-item-count font-mono">{{ pl.songs?.length || 0 }} tracks</span>
            </div>
            <span class="picker-item-add font-mono">ADD →</span>
          </button>
        </div>

        <button class="picker-close-btn font-mono" @click="showAddModal = false">
          CANCEL
        </button>
      </div>
    </div>

    <!-- Up Next Queue Drawer Overlay -->
    <div
      v-if="showQueueDrawer"
      class="queue-drawer-overlay"
      @click.self="showQueueDrawer = false"
    >
      <aside class="queue-drawer-panel glass" role="dialog" aria-label="Up Next Queue">
        <div class="queue-drawer-header">
          <div class="queue-title-wrap">
            <h3 class="queue-title font-display">Up Next Queue</h3>
            <span class="queue-badge font-mono">{{ playerStore.queue?.length || 0 }} TRACKS</span>
          </div>
          <button class="queue-close-btn font-mono" @click="showQueueDrawer = false">✕</button>
        </div>

        <div v-if="!playerStore.queue || playerStore.queue.length === 0" class="queue-empty font-mono">
          Queue is empty. Select tracks and click "+ QUEUE" to add music.
        </div>

        <div v-else class="queue-track-list">
          <div
            v-for="(t, qIdx) in playerStore.queue"
            :key="t._id || t.id || qIdx"
            class="queue-track-row"
            :class="{ 'is-active': playerStore.trackIndex === qIdx }"
            @click="handlePlayQueueIndex(qIdx)"
          >
            <span class="queue-track-idx font-mono">{{ qIdx + 1 }}</span>
            <div class="queue-track-meta">
              <span class="queue-track-name font-display">{{ t.title || t[0] }}</span>
              <span class="queue-track-sub font-mono">{{ t.artist || t[1] }}</span>
            </div>
            <span v-if="t.provider || t.source?.provider" class="queue-track-prov font-mono">
              {{ (t.provider || t.source?.provider || '').toUpperCase() }}
            </span>
            <button
              class="queue-remove-btn font-mono"
              @click.stop="playerStore.removeFromQueue(qIdx)"
              title="Remove from queue"
            >
              ✕
            </button>
          </div>
        </div>
      </aside>
    </div>

    <!-- Floating Player Dock -->
    <FloatingPlayerDock
      @toggle-queue="showQueueDrawer = !showQueueDrawer"
    />
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { usePlaylistStore } from '../stores/playlist';
import { usePlayerStore } from '../stores/player';
import { useToastStore } from '../stores/toast';
import { detectProviderType } from '../services/providers/detector';
import { searchApi } from '../api/search';
import FloatingPlayerDock from '../components/player/FloatingPlayerDock.vue';

const router = useRouter();
const route = useRoute();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();
const toastStore = useToastStore();

const query = ref('');
const activeCategory = ref('all'); // 'all' | 'online' | 'playlists' | 'tracks'
const showQueueDrawer = ref(false);

// Online Multi-Source Search State
const onlineTracks = ref([]);
const isSearchingOnline = ref(false);
const providerStatuses = ref({});
const showAddModal = ref(false);
const targetTrackForAdd = ref(null);
const isAddingToPlaylist = ref(false);
let searchDebounceTimer = null;
let currentSearchSeq = 0;

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
  return matchedPlaylists.value.length + matchedTracks.value.length + onlineTracks.value.length;
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
  if (!playerStore.currentTrack || !song) return false;
  return (
    (song._id && playerStore.currentTrack._id === song._id) ||
    (playerStore.currentTrack.title?.toLowerCase() === song.title?.toLowerCase() &&
      playerStore.currentTrack.artist?.toLowerCase() === song.artist?.toLowerCase()) ||
    (song.streamUrl &&
      (playerStore.currentTrack.url === song.streamUrl ||
        playerStore.currentTrack.streamUrl === song.streamUrl))
  );
};

const getProviderLabel = (input) => {
  if (!input) return 'MP3';
  const type =
    typeof input === 'object'
      ? input.provider ||
        input.source?.provider ||
        (input.url ? detectProviderType(input.url) : 'direct')
      : detectProviderType(input);

  if (type === 'youtube') return 'YOUTUBE';
  if (type === 'spotify') return 'SPOTIFY';
  if (type === 'archive') return 'ARCHIVE';
  if (type === 'jamendo') return 'JAMENDO';
  if (type === 'audius') return 'AUDIUS';
  if (type === 'saavn') return 'DEV-SAAVN';
  return 'LOSSLESS';
};

const getProviderPillClass = (input) => {
  if (!input) return 'prov-direct';
  const type =
    typeof input === 'object'
      ? input.provider ||
        input.source?.provider ||
        (input.url ? detectProviderType(input.url) : 'direct')
      : detectProviderType(input);

  return `prov-${type}`;
};

const getProviderStatusLabel = (name) => {
  const prov = providerStatuses.value[name];
  if (!prov) return 'ACTIVE';
  if (prov.status === 'unconfigured') return 'OFF';
  if (prov.status === 'rate_limited') return 'LIMIT';
  if (prov.status === 'circuit_broken') return 'COOLDOWN';
  if (prov.status === 'unavailable' || prov.status === 'down') return 'DOWN';
  return 'ACTIVE';
};

const getProviderStatusClass = (name) => {
  const prov = providerStatuses.value[name];
  if (!prov || prov.status === 'available') return 'status-online';
  if (prov.status === 'unconfigured') return 'status-unconfigured';
  if (prov.status === 'rate_limited' || prov.status === 'circuit_broken') return 'status-limited';
  return 'status-down';
};

const fetchOnlineTracks = async (q) => {
  if (!q || q.trim().length < 2) {
    onlineTracks.value = [];
    isSearchingOnline.value = false;
    return;
  }

  const seq = ++currentSearchSeq;
  isSearchingOnline.value = true;
  try {
    const res = await searchApi.search(q.trim());
    if (seq !== currentSearchSeq) return;
    const data = res?.results ? res : res?.data;
    if (data) {
      onlineTracks.value = data.results || data.tracks || [];
      if (data.providers) {
        providerStatuses.value = data.providers;
      }
    }
  } catch (err) {
    if (seq !== currentSearchSeq) return;
    console.warn('Online search error:', err);
    onlineTracks.value = [];
  } finally {
    if (seq === currentSearchSeq) {
      isSearchingOnline.value = false;
    }
  }
};

watch(query, (newVal) => {
  if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
  if (!newVal || newVal.trim().length < 2) {
    onlineTracks.value = [];
    isSearchingOnline.value = false;
    return;
  }
  searchDebounceTimer = setTimeout(() => {
    fetchOnlineTracks(newVal);
  }, 350);
});

watch(
  () => route.query.q,
  (newQ) => {
    if (newQ && newQ !== query.value) {
      query.value = String(newQ);
      fetchOnlineTracks(query.value);
    }
  }
);

onMounted(async () => {
  if (route.query.q) {
    query.value = String(route.query.q);
    fetchOnlineTracks(query.value);
  }
  try {
    const res = await searchApi.getProviders();
    const data = res?.providers ? res : res?.data;
    if (data && data.providers) {
      providerStatuses.value = data.providers;
    }
  } catch (err) {
    // Non-blocking provider check
  }
});

const handlePlayResultTrack = (item) => {
  if (isTrackPlaying(item.song)) {
    playerStore.togglePlay();
  } else {
    playerStore.playTrack(item.song, item.playlist, item.playlist.songs);
    toastStore.info(`Playing ${item.song.title}`);
  }
};

const handleAddToQueue = (track) => {
  if (!track) return;
  const playableTrack = {
    _id: track.id || track._id || `online-${track.provider}-${Date.now()}`,
    title: track.title,
    artist: track.artist || 'Unknown Artist',
    album: track.album || '',
    duration: track.duration || 0,
    url: track.streamUrl || track.url,
    streamUrl: track.streamUrl || track.url,
    coverImage: track.coverImage || track.artwork || '',
    source: {
      provider: track.provider || 'direct',
      url: track.url || track.streamUrl,
      externalId: track.providerTrackId || track.externalId || (track.id ? String(track.id).replace(/^[a-z0-9_-]+:/i, '') : ''),
    },
    provider: track.provider,
    providerTrackId: track.providerTrackId || (track.id ? String(track.id).replace(/^[a-z0-9_-]+:/i, '') : ''),
    needsResolution: Boolean(track.needsResolution),
    isUnavailable: !track.isPlayable && !track.needsResolution,
    license: track.license,
    licenseUrl: track.licenseUrl,
    attribution: track.attribution,
  };

  playerStore.addToQueue(playableTrack);
  toastStore.success(`Added "${track.title}" to Up Next queue`);
};

const handlePlayOnlineTrack = async (track) => {
  if (isTrackPlaying(track)) {
    playerStore.togglePlay();
    return;
  }

  if (track.isPlayable === false && !track.needsResolution) {
    const reason = track.playbackCapabilities?.restrictionReason || 'This track has no authorized playback stream';
    toastStore.warn(`Playback unavailable: ${reason}`);
    return;
  }

  const playableTrack = {
    _id: track.id || track._id || `online-${track.provider}-${Date.now()}`,
    title: track.title,
    artist: track.artist || 'Unknown Artist',
    album: track.album || '',
    duration: track.duration || 0,
    url: track.streamUrl || track.url,
    streamUrl: track.streamUrl || track.url,
    coverImage: track.coverImage || track.artwork || '',
    source: {
      provider: track.provider || 'direct',
      url: track.url || track.streamUrl,
      externalId: track.providerTrackId || track.externalId || (track.id ? String(track.id).replace(/^[a-z0-9_-]+:/i, '') : ''),
    },
    provider: track.provider,
    providerTrackId: track.providerTrackId || (track.id ? String(track.id).replace(/^[a-z0-9_-]+:/i, '') : ''),
    needsResolution: Boolean(track.needsResolution),
    isUnavailable: !track.isPlayable && !track.needsResolution,
    license: track.license,
    licenseUrl: track.licenseUrl,
    attribution: track.attribution,
  };

  await playerStore.playTrack(playableTrack, onlineTracks.value);
  toastStore.info(`Playing ${track.title} via ${getProviderLabel(track)}`);
};

const handlePlayQueueIndex = (index) => {
  if (!playerStore.queue || !playerStore.queue[index]) return;
  playerStore.trackIndex = index;
  playerStore.playTrack(playerStore.queue[index], playerStore.queue, index);
};

const switchAlternativeSource = (track, altIndex) => {
  if (!track.alternatives || !track.alternatives[altIndex]) return;
  const alt = track.alternatives[altIndex];

  const currentPrimary = {
    provider: track.provider,
    url: track.url,
    streamUrl: track.streamUrl,
    license: track.license,
    licenseUrl: track.licenseUrl,
    attribution: track.attribution,
  };

  track.provider = alt.provider;
  track.url = alt.url;
  track.streamUrl = alt.streamUrl;
  track.license = alt.license;
  track.licenseUrl = alt.licenseUrl;
  track.attribution = alt.attribution;
  track.alternatives[altIndex] = currentPrimary;

  toastStore.info(`Switched stream to ${getProviderLabel(track)}`);
};

const openAddModal = (track) => {
  targetTrackForAdd.value = track;
  showAddModal.value = true;
};

const addTrackToSelectedPlaylist = async (playlist) => {
  if (!targetTrackForAdd.value || !playlist) return;
  isAddingToPlaylist.value = true;
  try {
    const songPayload = {
      title: targetTrackForAdd.value.title,
      artist: targetTrackForAdd.value.artist || 'Unknown Artist',
      album: targetTrackForAdd.value.album || '',
      duration: targetTrackForAdd.value.duration || 0,
      url: targetTrackForAdd.value.streamUrl || targetTrackForAdd.value.url,
      coverImage: targetTrackForAdd.value.coverImage || '',
      source: {
        provider: targetTrackForAdd.value.provider || 'direct',
        url: targetTrackForAdd.value.url || targetTrackForAdd.value.streamUrl,
        externalId: targetTrackForAdd.value.providerTrackId || targetTrackForAdd.value.externalId || (targetTrackForAdd.value.id ? targetTrackForAdd.value.id.replace(/^(archive|jamendo|audius):/, '') : ''),
      },
      license: targetTrackForAdd.value.license,
      licenseUrl: targetTrackForAdd.value.licenseUrl,
      attribution: targetTrackForAdd.value.attribution,
    };

    await playlistStore.addSong(playlist._id, songPayload);
    toastStore.success(`Added "${targetTrackForAdd.value.title}" to ${playlist.name}`);
    showAddModal.value = false;
  } catch (err) {
    toastStore.error(err.response?.data?.message || 'Failed to add track to mixtape');
  } finally {
    isAddingToPlaylist.value = false;
  }
};
</script>

<style scoped>
.pg-search-root {
  display: flex;
  flex-direction: column;
  gap: 28px;
  padding: 16px 24px 140px 24px;
  max-width: 1400px;
  margin: 0 auto;
}

/* 0. Top Navigation Strip */
.search-top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 18px;
  background: rgba(255, 255, 255, 0.65);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1.5px solid var(--pg-border, #111);
  border-radius: 9999px;
  box-shadow: 3px 3px 0px var(--pg-border, #111);
}

.back-home-pill {
  font-size: 0.75rem;
  font-weight: 800;
  padding: 6px 14px;
  background: #111;
  color: #fff;
  border-radius: 9999px;
  text-decoration: none;
  transition: all 0.15s ease;
}

.back-home-pill:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.95rem;
  font-weight: 900;
  color: var(--pg-ink, #111);
  letter-spacing: -0.02em;
}

.orb-icon {
  font-size: 1.1rem;
}

.queue-toggle-top {
  font-size: 0.72rem;
  font-weight: 800;
  padding: 6px 14px;
  background: var(--pg-citron, #fef08a);
  color: #111;
  border: 1.5px solid var(--pg-border, #111);
  border-radius: 9999px;
  cursor: pointer;
  box-shadow: 2px 2px 0px var(--pg-border, #111);
  transition: all 0.15s ease;
}

.queue-toggle-top:hover {
  transform: translateY(-1px);
  box-shadow: 3px 3px 0px var(--pg-border, #111);
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
  flex-wrap: wrap;
  gap: 12px;
}

.header-with-status {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.provider-status-strip {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.status-indicator {
  font-size: 0.62rem;
  font-weight: 800;
  padding: 2px 7px;
  border-radius: var(--pg-radius-full);
  border: 1px solid var(--pg-border);
  letter-spacing: 0.04em;
}

.status-indicator.status-online {
  background: rgba(46, 204, 113, 0.15);
  color: #27ae60;
  border-color: #2ecc71;
}

.status-indicator.status-unconfigured {
  background: rgba(189, 195, 199, 0.2);
  color: var(--pg-ink-muted);
  border-color: var(--pg-border);
}

.status-indicator.status-limited {
  background: rgba(243, 156, 18, 0.15);
  color: #d35400;
  border-color: #f39c12;
}

.status-indicator.status-down {
  background: rgba(231, 76, 60, 0.15);
  color: #c0392b;
  border-color: #e74c3c;
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

.searching-pulse {
  animation: pulse-op 1.2s infinite ease-in-out;
}

@keyframes pulse-op {
  0%, 100% { opacity: 0.4; }
  50% { opacity: 1; }
}

.online-searching-indicator {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 16px 20px;
  background: var(--pg-surface-soft);
  border: 1.5px dashed var(--pg-border);
  border-radius: var(--pg-radius-md);
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--pg-ink-secondary);
}

.spinner-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--pg-cobalt);
  animation: pulse-op 0.8s infinite ease-in-out;
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
  flex-wrap: wrap;
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
  letter-spacing: 0.03em;
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

.track-source-pill.prov-archive {
  background: #d4edda;
  color: #155724;
  border-color: #c3e6cb;
}

.track-source-pill.prov-jamendo {
  background: #f8d7da;
  color: #721c24;
  border-color: #f5c6cb;
}

.track-source-pill.prov-audius {
  background: #e2d9f3;
  color: #4a154b;
  border-color: #d1c2ea;
}

.track-source-pill.prov-saavn {
  background: #ffe4e6;
  color: #e11d48;
  border-color: #fda4af;
}

.add-to-queue-btn {
  padding: 4px 10px;
  font-size: 0.68rem;
  font-weight: 800;
  background: #fdf2f8;
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  color: #be185d;
  cursor: pointer;
  transition: all var(--pg-transition-spring);
  box-shadow: 1px 1px 0px var(--pg-border);
}

.add-to-queue-btn:hover {
  background: #fbcfe8;
  color: #9d174d;
  transform: translateY(-1px);
  box-shadow: 2px 2px 0px var(--pg-border);
}

.track-license-pill {
  font-size: 0.6rem;
  font-weight: 700;
  padding: 1px 6px;
  border-radius: var(--pg-radius-sm);
  background: var(--pg-surface-soft);
  color: var(--pg-ink-secondary);
  border: 1px solid var(--pg-border);
}

.track-license-pill a {
  color: inherit;
  text-decoration: underline;
}

.alt-sources-pill {
  font-size: 0.6rem;
  font-weight: 800;
  padding: 1px 6px;
  border-radius: var(--pg-radius-full);
  background: var(--pg-surface-peach);
  color: var(--pg-coral);
  border: 1px solid var(--pg-border);
  cursor: pointer;
  transition: all var(--pg-transition-spring);
}

.alt-sources-pill:hover {
  background: var(--pg-coral);
  color: #fff;
}

.result-track-sub {
  font-size: 0.76rem;
  color: var(--pg-ink-secondary);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.track-attribution {
  color: var(--pg-ink-muted);
}

.from-mixtape {
  color: var(--pg-ink-muted);
}

.result-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.add-to-mixtape-btn {
  padding: 4px 10px;
  font-size: 0.68rem;
  font-weight: 800;
  background: var(--pg-canvas);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  color: var(--pg-ink);
  cursor: pointer;
  transition: all var(--pg-transition-spring);
  box-shadow: 1px 1px 0px var(--pg-border);
}

.add-to-mixtape-btn:hover {
  background: var(--pg-citron);
  transform: translateY(-1px);
  box-shadow: 2px 2px 0px var(--pg-border);
}

.result-track-time {
  font-size: 0.76rem;
  font-weight: 700;
  color: var(--pg-ink-secondary);
}

/* Mixtape Quick Picker Modal */
.mixtape-picker-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.mixtape-picker-card {
  width: 100%;
  max-width: 440px;
  background: var(--pg-canvas);
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-lg);
  box-shadow: 8px 8px 0px var(--pg-border);
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.picker-header {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.picker-kicker {
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--pg-cobalt);
}

.picker-title {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--pg-ink);
}

.picker-artist {
  font-size: 0.76rem;
  color: var(--pg-ink-secondary);
}

.mixtapes-picker-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 240px;
  overflow-y: auto;
}

.picker-playlist-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 14px;
  background: var(--pg-surface-soft);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-md);
  cursor: pointer;
  text-align: left;
  transition: all var(--pg-transition-spring);
}

.picker-playlist-item:hover {
  background: var(--pg-surface-butter);
  transform: translateX(3px);
  border-color: var(--pg-cobalt);
}

.picker-item-info {
  display: flex;
  flex-direction: column;
}

.picker-item-name {
  font-size: 0.9rem;
  font-weight: 800;
  color: var(--pg-ink);
}

.picker-item-count {
  font-size: 0.68rem;
  color: var(--pg-ink-muted);
}

.picker-item-add {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--pg-cobalt);
}

.picker-close-btn {
  align-self: flex-end;
  padding: 6px 14px;
  background: var(--pg-surface-soft);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--pg-ink);
  cursor: pointer;
}

.no-playlists-hint {
  padding: 14px;
  background: var(--pg-surface-soft);
  border: 1px dashed var(--pg-border);
  border-radius: var(--pg-radius-md);
  font-size: 0.8rem;
  color: var(--pg-ink-secondary);
}

/* Queue Drawer Styles */
.queue-drawer-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  z-index: 1000;
  display: flex;
  justify-content: flex-end;
}

.queue-drawer-panel {
  width: min(420px, 92vw);
  height: 100%;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border-left: 2px solid var(--pg-border, #111);
  display: flex;
  flex-direction: column;
  padding: 24px;
  box-shadow: -8px 0 32px rgba(0, 0, 0, 0.2);
  animation: slideInRight 0.25s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes slideInRight {
  from {
    transform: translateX(100%);
  }
  to {
    transform: translateX(0);
  }
}

.queue-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 2px solid var(--pg-border, #111);
  margin-bottom: 16px;
}

.queue-title-wrap {
  display: flex;
  align-items: center;
  gap: 10px;
}

.queue-title {
  font-size: 1.25rem;
  font-weight: 900;
  margin: 0;
  color: var(--pg-ink, #111);
}

.queue-badge {
  font-size: 0.65rem;
  font-weight: 800;
  padding: 2px 8px;
  background: #111;
  color: #fff;
  border-radius: 9999px;
}

.queue-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  border: 1.5px solid var(--pg-border, #111);
  background: #fff;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 800;
  box-shadow: 2px 2px 0px var(--pg-border, #111);
}

.queue-empty {
  font-size: 0.85rem;
  color: var(--pg-ink-muted, #71717a);
  text-align: center;
  padding: 40px 16px;
  line-height: 1.6;
}

.queue-track-list {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-right: 4px;
}

.queue-track-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 14px;
  background: rgba(255, 255, 255, 0.7);
  border: 1.5px solid var(--pg-border, #111);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.15s ease;
  box-shadow: 2px 2px 0px var(--pg-border, #111);
}

.queue-track-row:hover {
  background: #fff;
  transform: translateY(-1px);
  box-shadow: 3px 3px 0px var(--pg-border, #111);
}

.queue-track-row.is-active {
  background: #fdf2f8;
  border-color: #e11d48;
  box-shadow: 3px 3px 0px #e11d48;
}

.queue-track-idx {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--pg-ink-muted, #888);
  width: 20px;
}

.queue-track-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.queue-track-name {
  font-size: 0.88rem;
  font-weight: 800;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--pg-ink, #111);
}

.queue-track-sub {
  font-size: 0.72rem;
  color: var(--pg-ink-secondary, #666);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.queue-track-prov {
  font-size: 0.6rem;
  font-weight: 800;
  padding: 2px 6px;
  background: rgba(0, 0, 0, 0.06);
  border-radius: 4px;
}

.queue-remove-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 0.8rem;
  color: var(--pg-ink-muted, #999);
  padding: 4px 6px;
  border-radius: 4px;
}

.queue-remove-btn:hover {
  color: #e11d48;
  background: rgba(225, 29, 72, 0.1);
}
</style>
