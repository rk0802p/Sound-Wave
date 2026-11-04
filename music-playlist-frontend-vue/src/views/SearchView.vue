<template>
  <div class="pg-search-root">
    <!-- Background Wash & Drifting Orbs -->
    <div class="wash" id="wash" :style="{ backgroundColor: currentWashColor }"></div>
    <div class="bgb" aria-hidden="true">
      <i></i>
      <i></i>
      <i></i>
    </div>

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
              <a
                v-if="track.providerTrackUrl"
                :href="track.providerTrackUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="view-on-source-btn font-mono"
                :title="'Open original page on ' + (track.provider || 'Source')"
                @click.stop
              >
                ↗ {{ (track.provider === 'jamendo' ? 'Jamendo' : (track.provider || 'Source')).toUpperCase() }}
              </a>
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
              <a
                v-if="isJamendoTrack(t) && getTrackSourceUrl(t)"
                :href="getTrackSourceUrl(t)"
                target="_blank"
                rel="noopener noreferrer"
                class="queue-track-jamendo-link font-mono"
                title="Open track on Jamendo"
                @click.stop
              >
                ↗ JAMENDO
              </a>
              <template v-else>
                {{ (t.provider || t.source?.provider || '').toUpperCase() }}
              </template>
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
const currentWashColor = computed(() => playerStore.tint || '#d8faf6');

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

const isJamendoTrack = (t) => {
  if (!t) return false;
  return (
    t.provider === 'jamendo' ||
    t.source?.provider === 'jamendo' ||
    Boolean(t.providerTrackUrl && t.providerTrackUrl.includes('jamendo.com'))
  );
};

const getTrackSourceUrl = (t) => {
  if (!t) return null;
  const prov = t.provider || t.source?.provider;
  const extId = t.providerTrackId || t.source?.externalId;
  if (prov === 'jamendo' && extId) {
    return `https://www.jamendo.com/track/${extId}`;
  }
  if (t.providerTrackUrl) return t.providerTrackUrl;
  if (t.source?.url && t.source.url.includes('jamendo.com/track/')) return t.source.url;
  if (t.source?.trackUrl) return t.source.trackUrl;
  if (t.source?.url && !t.source.url.includes('storage.jamendo.com')) return t.source.url;
  return null;
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
  if (playerStore.isPlaying || playerStore.playbackState === 'playing') {
    toastStore.info(`Playing ${track.title} via ${getProviderLabel(track)}`);
  } else if (playerStore.playbackState === 'unavailable') {
    toastStore.warn(`"${track.title}" is currently unavailable for playback in this environment.`);
  }
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
/* SOUNDWAVE Bubbly Online Discovery Experience */
.pg-search-root {
  position: relative;
  min-height: 100vh;
  width: 100%;
  max-width: 1320px;
  margin: 0 auto;
  padding: 1.5rem 1.25rem 9rem;
  color: var(--ink, #2b1d5a);
  font-family: Figtree, system-ui, sans-serif;
  overflow-x: hidden;
  box-sizing: border-box;
}

/* Background Wash & Drifting Orbs */
.wash {
  position: fixed;
  inset: 0;
  z-index: -1;
  background-color: #d8faf6;
  transition: background-color 0.9s cubic-bezier(0.2, 0.8, 0.3, 1);
}

.wash::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.3), rgba(255, 255, 255, 0.85));
}

.bgb {
  position: fixed;
  inset: 0;
  z-index: -1;
  overflow: hidden;
  pointer-events: none;
}

.bgb i {
  position: absolute;
  width: 45vmax;
  height: 45vmax;
  border-radius: 50%;
  filter: blur(80px);
  opacity: 0.45;
  background: var(--o1, #7ff0e6);
  animation: drift 16s ease-in-out infinite alternate;
  transition: background 0.9s;
}

.bgb i:nth-child(1) {
  left: -12vmax;
  top: -10vmax;
}

.bgb i:nth-child(2) {
  right: -15vmax;
  top: 25vh;
  background: #ffd7a0;
  animation-duration: 20s;
}

.bgb i:nth-child(3) {
  left: 20vw;
  bottom: -15vmax;
  background: #e6dcff;
  animation-duration: 18s;
}

@keyframes drift {
  from {
    transform: translate(0, 0) scale(1);
  }
  to {
    transform: translate(4vw, 3vh) scale(1.08);
  }
}

/* 0. Top Floating Navbar */
.search-top-nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  padding: 0.6rem 1rem;
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border-radius: 99px;
  border: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: 0 16px 40px rgba(120, 80, 200, 0.12), 0 0 0 1px rgba(255, 255, 255, 0.8);
  margin-bottom: 2rem;
  transition: all 0.3s cubic-bezier(0.2, 1.2, 0.3, 1);
}

.back-home-pill {
  font-size: 0.75rem;
  font-weight: 800;
  padding: 8px 18px;
  background: linear-gradient(135deg, var(--ink, #2b1d5a), #3f2d80);
  color: #fff;
  border-radius: 99px;
  text-decoration: none;
  box-shadow: 0 4px 14px rgba(43, 29, 90, 0.2);
  transition: transform 0.25s cubic-bezier(0.2, 2.4, 0.4, 1), box-shadow 0.2s;
  letter-spacing: 0.04em;
}

.back-home-pill:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 8px 20px rgba(43, 29, 90, 0.3);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-family: "Bricolage Grotesque", Figtree, sans-serif;
  font-size: 1.1rem;
  font-weight: 800;
  letter-spacing: -0.01em;
  color: var(--ink, #2b1d5a);
}

.orb-icon {
  font-size: 1.25rem;
  display: inline-block;
  animation: floatOrb 3s ease-in-out infinite alternate;
}

@keyframes floatOrb {
  0% { transform: translateY(0); }
  100% { transform: translateY(-3px) rotate(6deg); }
}

.queue-toggle-top {
  font-size: 0.75rem;
  font-weight: 800;
  padding: 8px 16px;
  background: radial-gradient(circle at 30% 24%, #fff 0 10%, rgba(255, 255, 255, 0) 30%),
              linear-gradient(135deg, #ffd27a, #ffa24c);
  color: #2b1d5a;
  border-radius: 99px;
  cursor: pointer;
  box-shadow: 0 6px 18px rgba(255, 162, 76, 0.35);
  transition: transform 0.25s cubic-bezier(0.2, 2.4, 0.4, 1), box-shadow 0.2s;
  letter-spacing: 0.03em;
}

.queue-toggle-top:hover {
  transform: translateY(-2px) scale(1.03);
  box-shadow: 0 10px 24px rgba(255, 162, 76, 0.45);
}

/* 1. Header Stage */
.pg-search-header {
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  margin-bottom: 2.5rem;
}

.search-kicker-strip {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.search-kicker-tag {
  font-size: 0.7rem;
  font-weight: 800;
  padding: 4px 12px;
  background: linear-gradient(135deg, #ff6fb5, #ff4f9a);
  color: #fff;
  border-radius: 99px;
  letter-spacing: 0.06em;
  box-shadow: 0 4px 12px rgba(255, 79, 154, 0.3);
}

.search-kicker-sub {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--muted, #6f63a0);
  letter-spacing: 0.05em;
}

/* Pill Search Bar */
.pg-search-input-box {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.6rem;
  background: rgba(255, 255, 255, 0.88);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.95);
  border-radius: 99px;
  box-shadow: inset 0 2px 6px rgba(43, 29, 90, 0.06), 0 12px 36px rgba(120, 80, 200, 0.1);
  transition: all 0.35s cubic-bezier(0.2, 1.4, 0.3, 1);
}

.pg-search-input-box:focus-within {
  background: rgba(255, 255, 255, 0.98);
  transform: translateY(-2px);
  box-shadow: inset 0 2px 6px rgba(43, 29, 90, 0.06), 0 0 0 3px var(--o2, #19c9bd), 0 18px 45px rgba(25, 201, 189, 0.28);
}

.search-input-icon {
  color: var(--o2, #19c9bd);
  flex-shrink: 0;
  filter: drop-shadow(0 2px 6px rgba(25, 201, 189, 0.3));
}

.search-text-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-family: "Bricolage Grotesque", Figtree, sans-serif;
  font-size: clamp(1.05rem, 2.5vw, 1.35rem);
  font-weight: 700;
  color: var(--ink, #2b1d5a);
}

.search-text-input::placeholder {
  color: rgba(111, 99, 160, 0.55);
  font-weight: 600;
}

.search-clear-btn {
  font-size: 0.85rem;
  font-weight: 800;
  color: var(--muted, #6f63a0);
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(43, 29, 90, 0.08);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
}

.search-clear-btn:hover {
  background: var(--ink, #2b1d5a);
  color: #fff;
  transform: scale(1.1);
}

.search-esc-hint {
  font-size: 0.68rem;
  font-weight: 800;
  color: var(--muted, #6f63a0);
  opacity: 0.7;
  letter-spacing: 0.06em;
}

/* Category Filter Tabs */
.search-filter-tabs {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.category-tab-btn {
  padding: 8px 18px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 99px;
  font-family: Figtree, sans-serif;
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--muted, #6f63a0);
  cursor: pointer;
  box-shadow: 0 4px 14px rgba(120, 80, 200, 0.06);
  transition: all 0.25s cubic-bezier(0.2, 2.4, 0.4, 1);
}

.category-tab-btn:hover {
  background: rgba(255, 255, 255, 0.95);
  color: var(--ink, #2b1d5a);
  transform: translateY(-2px) scale(1.04);
  box-shadow: 0 8px 20px rgba(120, 80, 200, 0.12);
}

.category-tab-btn.is-active {
  color: #fff;
  background: linear-gradient(135deg, var(--o1, #7ff0e6), var(--o2, #19c9bd));
  border-color: rgba(255, 255, 255, 0.9);
  box-shadow: 0 8px 22px var(--sh, rgba(25, 201, 189, 0.4));
}

/* 2. Idle State: Genre Portals */
.pg-portals-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.portals-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 0.5rem;
}

.portals-title {
  font-family: "Bricolage Grotesque", Figtree, sans-serif;
  font-size: 1.8rem;
  font-weight: 800;
  color: var(--ink, #2b1d5a);
  letter-spacing: -0.02em;
}

.portals-subtitle {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--muted, #6f63a0);
  letter-spacing: 0.06em;
}

.editorial-portals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.25rem;
}

.editorial-portal-tile {
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 28px;
  padding: 1.6rem;
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  cursor: pointer;
  box-shadow: 0 12px 32px rgba(120, 80, 200, 0.08), 0 0 0 1px rgba(255, 255, 255, 0.8);
  transition: transform 0.35s cubic-bezier(0.2, 2.4, 0.4, 1), box-shadow 0.3s;
  position: relative;
  overflow: hidden;
}

.editorial-portal-tile:hover {
  transform: translateY(-8px) scale(1.02);
  box-shadow: 0 20px 45px rgba(120, 80, 200, 0.16), 0 0 0 1px #fff;
}

.editorial-portal-tile::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 6px;
  background: var(--tile-bg, linear-gradient(90deg, #7ff0e6, #ff6fb5));
  border-radius: 28px 28px 0 0;
}

.tile-code {
  font-size: 0.68rem;
  font-weight: 800;
  color: var(--muted, #6f63a0);
  letter-spacing: 0.08em;
}

.tile-title {
  font-family: "Bricolage Grotesque", Figtree, sans-serif;
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--ink, #2b1d5a);
  letter-spacing: -0.01em;
}

.tile-desc {
  font-size: 0.88rem;
  color: var(--muted, #6f63a0);
  line-height: 1.45;
  margin: 0;
}

.tile-cta {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--o2, #19c9bd);
  margin-top: auto;
  letter-spacing: 0.04em;
  transition: transform 0.2s;
}

.editorial-portal-tile:hover .tile-cta {
  transform: translateX(4px);
}

/* Suggested Keywords */
.keywords-pill-strip {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
  margin-top: 1rem;
}

.keywords-label {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--muted, #6f63a0);
  letter-spacing: 0.06em;
}

.keywords-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.tag-pill {
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.7);
  border: 1px solid rgba(255, 255, 255, 0.85);
  border-radius: 99px;
  font-size: 0.75rem;
  font-weight: 700;
  color: var(--ink, #2b1d5a);
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.2, 2.4, 0.4, 1);
}

.tag-pill:hover {
  background: #fff;
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 16px rgba(120, 80, 200, 0.12);
}

/* 3. Results Section */
.results-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  margin-bottom: 2.5rem;
}

.results-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  padding: 0 0.25rem;
}

.results-title {
  font-family: "Bricolage Grotesque", Figtree, sans-serif;
  font-size: 1.5rem;
  font-weight: 800;
  color: var(--ink, #2b1d5a);
  letter-spacing: -0.02em;
}

.results-count {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--muted, #6f63a0);
  letter-spacing: 0.06em;
}

.provider-health-pills {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.prov-health-pill {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 3px 10px;
  border-radius: 99px;
  border: 1px solid rgba(255, 255, 255, 0.8);
  background: rgba(255, 255, 255, 0.6);
  color: var(--muted, #6f63a0);
}

.prov-health-pill.prov-available {
  background: rgba(25, 201, 189, 0.15);
  color: #0f8e85;
  border-color: rgba(25, 201, 189, 0.3);
}

.prov-health-pill.prov-rate_limited,
.prov-health-pill.prov-degraded {
  background: rgba(255, 162, 76, 0.15);
  color: #c46816;
  border-color: rgba(255, 162, 76, 0.3);
}

.prov-health-pill.prov-unconfigured {
  background: rgba(111, 99, 160, 0.12);
  color: #6f63a0;
  border-color: rgba(111, 99, 160, 0.2);
}

/* Track Results List */
.tracks-results-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.result-track-row {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 1rem 1.4rem;
  background: rgba(255, 255, 255, 0.75);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 20px;
  box-shadow: 0 8px 24px rgba(120, 80, 200, 0.06);
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.2, 1.4, 0.3, 1);
  position: relative;
}

.result-track-row:hover {
  background: rgba(255, 255, 255, 0.95);
  transform: translateY(-3px) scale(1.008);
  box-shadow: 0 16px 36px rgba(120, 80, 200, 0.14), 0 0 0 1px #fff;
}

.result-track-row.is-active {
  background: rgba(255, 255, 255, 0.98);
  border-color: var(--o2, #19c9bd);
  box-shadow: 0 12px 32px rgba(25, 201, 189, 0.25), 0 0 0 2px var(--o2, #19c9bd);
}

.result-play-icon {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  flex-shrink: 0;
  display: grid;
  place-items: center;
  background: radial-gradient(circle at 30% 24%, #fff 0 10%, rgba(255, 255, 255, 0) 30%),
              linear-gradient(135deg, var(--o1, #7ff0e6), var(--o2, #19c9bd));
  color: #fff;
  font-size: 0.9rem;
  font-weight: 800;
  border: none;
  cursor: pointer;
  box-shadow: inset -3px -5px 8px rgba(0, 0, 0, 0.12), inset 3px 4px 6px rgba(255, 255, 255, 0.5), 0 6px 16px var(--sh, rgba(25, 201, 189, 0.4));
  transition: transform 0.25s cubic-bezier(0.2, 2.4, 0.4, 1);
}

.result-track-row:hover .result-play-icon {
  transform: scale(1.1);
}

.result-track-details {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  min-width: 0;
}

.result-track-top {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.track-title-text {
  font-family: "Bricolage Grotesque", Figtree, sans-serif;
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--ink, #2b1d5a);
  letter-spacing: -0.01em;
}

/* Provider Badges */
.track-source-pill {
  font-size: 0.65rem;
  font-weight: 800;
  padding: 3px 9px;
  border-radius: 99px;
  letter-spacing: 0.05em;
}

.source-jamendo {
  background: rgba(25, 201, 189, 0.16);
  color: #0d837b;
  border: 1px solid rgba(25, 201, 189, 0.35);
}

.source-archive {
  background: rgba(76, 184, 255, 0.16);
  color: #1573b2;
  border: 1px solid rgba(76, 184, 255, 0.35);
}

.source-audius {
  background: rgba(155, 123, 255, 0.16);
  color: #633cd4;
  border: 1px solid rgba(155, 123, 255, 0.35);
}

.source-spotify {
  background: rgba(29, 185, 84, 0.16);
  color: #0f7332;
  border: 1px solid rgba(29, 185, 84, 0.35);
}

.source-saavn {
  background: rgba(255, 162, 76, 0.16);
  color: #c46816;
  border: 1px solid rgba(255, 162, 76, 0.35);
}

.source-direct {
  background: rgba(255, 111, 181, 0.16);
  color: #b8236f;
  border: 1px solid rgba(255, 111, 181, 0.35);
}

/* License Pill */
.track-license-pill {
  font-size: 0.65rem;
  font-weight: 800;
  padding: 3px 8px;
  background: rgba(43, 29, 90, 0.06);
  color: var(--muted, #6f63a0);
  border-radius: 99px;
  border: 1px solid rgba(43, 29, 90, 0.12);
}

.track-license-pill a {
  color: inherit;
  text-decoration: underline;
  text-underline-offset: 2px;
}

.alt-sources-pill {
  font-size: 0.65rem;
  font-weight: 800;
  padding: 3px 8px;
  background: rgba(255, 210, 122, 0.25);
  color: #b36e00;
  border: 1px solid rgba(255, 210, 122, 0.5);
  border-radius: 99px;
  cursor: pointer;
}

.result-track-sub {
  font-size: 0.82rem;
  color: var(--muted, #6f63a0);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  flex-wrap: wrap;
}

.track-attribution {
  opacity: 0.85;
}

/* Actions in Result Row */
.result-actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.add-to-queue-btn,
.add-to-mixtape-btn {
  font-size: 0.72rem;
  font-weight: 800;
  padding: 6px 14px;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(43, 29, 90, 0.15);
  border-radius: 99px;
  color: var(--ink, #2b1d5a);
  cursor: pointer;
  box-shadow: 0 2px 8px rgba(120, 80, 200, 0.06);
  transition: all 0.2s cubic-bezier(0.2, 2.4, 0.4, 1);
  letter-spacing: 0.02em;
}

.add-to-queue-btn:hover,
.add-to-mixtape-btn:hover {
  background: var(--ink, #2b1d5a);
  color: #fff;
  transform: translateY(-2px);
  box-shadow: 0 6px 16px rgba(43, 29, 90, 0.25);
}

.view-on-source-btn {
  font-size: 0.72rem;
  font-weight: 800;
  padding: 6px 12px;
  background: rgba(25, 201, 189, 0.12);
  border: 1px solid rgba(25, 201, 189, 0.3);
  border-radius: 99px;
  color: #0f8e85;
  text-decoration: none;
  transition: all 0.2s ease;
}

.view-on-source-btn:hover {
  background: #0f8e85;
  color: #fff;
  transform: translateY(-2px);
}

.result-track-time {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--muted, #6f63a0);
  min-width: 44px;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

/* Mixtapes Results Grid */
.mixtapes-results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1.25rem;
}

.result-mixtape-card {
  background: rgba(255, 255, 255, 0.78);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(255, 255, 255, 0.9);
  border-radius: 24px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  cursor: pointer;
  box-shadow: 0 10px 28px rgba(120, 80, 200, 0.08);
  transition: all 0.3s cubic-bezier(0.2, 2.4, 0.4, 1);
}

.result-mixtape-card:hover {
  transform: translateY(-6px) scale(1.02);
  box-shadow: 0 18px 40px rgba(120, 80, 200, 0.16);
}

.result-cover-box {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 18px;
  overflow: hidden;
  background: linear-gradient(135deg, var(--o1, #7ff0e6), var(--o2, #19c9bd));
  display: grid;
  place-items: center;
}

.result-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.result-cover-fallback {
  font-size: 2.5rem;
  font-weight: 800;
  color: #fff;
}

.result-track-tag {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--muted, #6f63a0);
}

.result-name {
  font-family: "Bricolage Grotesque", Figtree, sans-serif;
  font-size: 1.15rem;
  font-weight: 800;
  color: var(--ink, #2b1d5a);
  margin: 0;
}

.result-desc {
  font-size: 0.82rem;
  color: var(--muted, #6f63a0);
  line-height: 1.4;
  margin: 0;
}

/* Modal: Mixtape Picker */
.mixtape-picker-overlay {
  position: fixed;
  inset: 0;
  z-index: 100;
  background: rgba(43, 29, 90, 0.35);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  display: grid;
  place-items: center;
  padding: 1.5rem;
}

.mixtape-picker-card {
  background: rgba(255, 255, 255, 0.95);
  backdrop-filter: blur(24px);
  border: 1px solid #fff;
  border-radius: 28px;
  padding: 2rem;
  width: min(500px, 94vw);
  box-shadow: 0 24px 60px rgba(43, 29, 90, 0.25);
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.picker-header {
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.picker-kicker {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--o2, #19c9bd);
  letter-spacing: 0.08em;
}

.picker-title {
  font-family: "Bricolage Grotesque", Figtree, sans-serif;
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--ink, #2b1d5a);
  margin: 0;
}

.picker-artist {
  font-size: 0.85rem;
  color: var(--muted, #6f63a0);
}

.mixtapes-picker-list {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  max-height: 280px;
  overflow-y: auto;
}

.picker-playlist-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.2rem;
  background: rgba(255, 255, 255, 0.8);
  border: 1px solid rgba(43, 29, 90, 0.08);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s cubic-bezier(0.2, 2.4, 0.4, 1);
}

.picker-playlist-item:hover {
  background: #fff;
  border-color: var(--o2, #19c9bd);
  transform: translateX(4px);
  box-shadow: 0 6px 16px rgba(120, 80, 200, 0.1);
}

.picker-item-name {
  font-weight: 800;
  color: var(--ink, #2b1d5a);
  font-size: 0.95rem;
}

.picker-item-count {
  font-size: 0.75rem;
  color: var(--muted, #6f63a0);
}

.picker-item-add {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--o2, #19c9bd);
}

.picker-close-btn {
  padding: 10px;
  background: rgba(43, 29, 90, 0.06);
  border-radius: 99px;
  font-weight: 800;
  font-size: 0.78rem;
  color: var(--muted, #6f63a0);
  cursor: pointer;
  transition: all 0.2s;
}

.picker-close-btn:hover {
  background: var(--ink, #2b1d5a);
  color: #fff;
}

/* Drawer: Queue */
.queue-drawer-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  background: rgba(43, 29, 90, 0.25);
  backdrop-filter: blur(8px);
  display: flex;
  justify-content: flex-end;
}

.queue-drawer-panel {
  width: min(440px, 90vw);
  height: 100%;
  background: rgba(255, 255, 255, 0.92);
  backdrop-filter: blur(24px);
  border-left: 1px solid rgba(255, 255, 255, 0.9);
  box-shadow: -12px 0 40px rgba(43, 29, 90, 0.18);
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  box-sizing: border-box;
}

.queue-drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.queue-title {
  font-family: "Bricolage Grotesque", Figtree, sans-serif;
  font-size: 1.35rem;
  font-weight: 800;
  color: var(--ink, #2b1d5a);
  margin: 0;
}

.queue-badge {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--muted, #6f63a0);
  background: rgba(43, 29, 90, 0.06);
  padding: 3px 8px;
  border-radius: 99px;
}

.queue-close-btn {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: grid;
  place-items: center;
  background: rgba(43, 29, 90, 0.06);
  color: var(--ink, #2b1d5a);
  font-weight: 800;
  cursor: pointer;
  transition: all 0.2s;
}

.queue-close-btn:hover {
  background: var(--ink, #2b1d5a);
  color: #fff;
}

.queue-track-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  overflow-y: auto;
  flex: 1;
}

.queue-track-row {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.75rem 1rem;
  background: rgba(255, 255, 255, 0.75);
  border: 1px solid rgba(255, 255, 255, 0.8);
  border-radius: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.queue-track-row:hover {
  background: #fff;
  transform: translateX(4px);
  box-shadow: 0 4px 14px rgba(120, 80, 200, 0.08);
}

.queue-track-row.is-active {
  background: #fff;
  border-color: var(--o2, #19c9bd);
  box-shadow: 0 6px 18px rgba(25, 201, 189, 0.2);
}

.queue-track-idx {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--muted, #6f63a0);
  min-width: 20px;
}

.queue-track-meta {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.queue-track-name {
  font-family: "Bricolage Grotesque", Figtree, sans-serif;
  font-size: 0.95rem;
  font-weight: 800;
  color: var(--ink, #2b1d5a);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.queue-track-sub {
  font-size: 0.75rem;
  color: var(--muted, #6f63a0);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.queue-track-jamendo-link {
  font-size: 0.65rem;
  font-weight: 800;
  color: #0f8e85;
  text-decoration: underline;
}

.queue-remove-btn {
  font-size: 0.75rem;
  color: var(--muted, #6f63a0);
  padding: 4px;
  cursor: pointer;
}

.queue-remove-btn:hover {
  color: #ff4f9a;
}

/* Responsive Breakpoints */
@media (max-width: 768px) {
  .pg-search-root {
    padding: 1rem 0.75rem 8rem;
  }

  .search-top-nav {
    flex-wrap: wrap;
    border-radius: 20px;
    padding: 0.8rem 1rem;
  }

  .nav-brand {
    order: -1;
    width: 100%;
    justify-content: center;
  }

  .editorial-portals-grid {
    grid-template-columns: 1fr;
  }

  .result-track-row {
    flex-wrap: wrap;
    gap: 0.75rem;
    padding: 1rem;
  }

  .result-actions {
    width: 100%;
    justify-content: flex-start;
    flex-wrap: wrap;
  }

  .result-track-time {
    margin-left: auto;
  }

  .desktop-only {
    display: none;
  }
}

@media (max-width: 480px) {
  .pg-search-input-box {
    padding: 0.75rem 1.2rem;
  }

  .category-tab-btn {
    padding: 6px 14px;
    font-size: 0.75rem;
  }
}
</style>