<template>
  <div class="pg-search-root" data-accent="lavender">
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
                :class="getProviderStatusClass('jamendo')"
                title="Jamendo Creative Commons Catalog"
              >
                JAMENDO: {{ getProviderStatusLabel('jamendo') }}
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
          <article
            v-for="(track, idx) in onlineTracks"
            :key="track.id || track._id || idx"
            class="result-track-row online-track-row"
            :class="{ 'is-active': isTrackPlaying(track) }"
          >
            <!-- Artwork Thumbnail + Fallback + Play overlay -->
            <button
              type="button"
              class="sr-art-wrap"
              :aria-label="isTrackPlaying(track) && playerStore.isPlaying ? `Pause ${track.title}` : `Play ${track.title}`"
              @click="handlePlayOnlineTrack(track)"
            >
              <img
                v-if="(track.coverImage || track.artwork) && !failedImgMap[getTrackKey(track, idx)]"
                :src="track.coverImage || track.artwork"
                :alt="track.title"
                class="sr-art-img"
                loading="lazy"
                @error="markImageFailed(track, idx)"
              />
              <div v-else class="sr-art-fallback font-display">
                {{ getTrackMonogram(track.title) }}
              </div>
              <span class="sr-art-overlay font-mono">
                {{ isTrackPlaying(track) && playerStore.isLoading ? '⏳' : (isTrackPlaying(track) && playerStore.isPlaying ? '❚❚' : '▶') }}
              </span>
            </button>

            <!-- Track Details -->
            <div class="result-track-details">
              <div class="result-track-top">
                <h5 class="track-title-text font-display" :title="track.title">{{ track.title }}</h5>

                <div class="result-badges-row font-mono">
                  <span class="track-source-pill font-mono" :class="getProviderPillClass(track)">
                    {{ getProviderLabel(track) }}
                  </span>
                  <span v-if="track.license" class="track-license-pill font-mono">
                    <a
                      v-if="track.licenseUrl"
                      :href="track.licenseUrl"
                      target="_blank"
                      rel="noopener noreferrer"
                    >{{ track.license }}</a>
                    <span v-else>{{ track.license }}</span>
                  </span>
                  <button
                    v-if="track.alternatives && track.alternatives.length > 0"
                    type="button"
                    class="alt-sources-pill font-mono"
                    @click="switchAlternativeSource(track, 0)"
                    title="Click to toggle alternate source stream"
                  >
                    +{{ track.alternatives.length }} ALT SOURCE
                  </button>
                  <span class="result-track-time font-mono">
                    {{ formatDuration(track.duration) }}
                  </span>
                </div>
              </div>

              <div class="result-track-sub font-mono">
                <span class="sr-artist">{{ track.artist || 'Unknown Artist' }}</span>
                <span v-if="track.album" class="sr-album">• {{ track.album }}</span>
              </div>

              <div v-if="track.attribution" class="track-attribution font-mono" :title="track.attribution">
                {{ track.attribution }}
              </div>
            </div>

            <!-- Action Controls -->
            <div class="result-actions">
              <button
                type="button"
                class="result-play-btn font-mono"
                @click="handlePlayOnlineTrack(track)"
              >
                {{ isTrackPlaying(track) && playerStore.isLoading ? 'LOADING...' : (isTrackPlaying(track) && playerStore.isPlaying ? 'PAUSE ❚❚' : 'PLAY ▶') }}
              </button>

              <button
                type="button"
                class="add-to-queue-btn font-mono"
                @click="handleAddToQueue(track)"
                title="Add to Up Next Queue"
              >
                + QUEUE
              </button>

              <AddToPlaylistMenu :track="track">
                <template #trigger>
                  <button
                    type="button"
                    class="add-to-mixtape-btn font-mono"
                    title="Add to Playlist"
                  >
                    + PLAYLIST
                  </button>
                </template>
              </AddToPlaylistMenu>

              <a
                v-if="track.providerTrackUrl"
                :href="track.providerTrackUrl"
                target="_blank"
                rel="noopener noreferrer"
                class="view-on-source-btn font-mono"
                :title="'Open original page on ' + (track.provider || 'Source')"
              >
                ↗ {{ (track.provider === 'jamendo' ? 'Jamendo' : (track.provider || 'Source')).toUpperCase() }}
              </a>
            </div>
          </article>
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
              {{ isTrackPlaying(item.song) && playerStore.isLoading ? '⏳' : (isTrackPlaying(item.song) && playerStore.isPlaying ? '❚❚' : '▶') }}
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
              <AddToPlaylistMenu :track="item.song">
                <template #trigger>
                  <button
                    class="add-to-mixtape-btn font-mono"
                    title="Add to Playlist"
                  >
                    + ADD TO PLAYLIST
                  </button>
                </template>
              </AddToPlaylistMenu>
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
  </div>
</template>

<script setup>
import { ref, reactive, computed, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { usePlaylistStore } from '../stores/playlist';
import { usePlayerStore } from '../stores/player';
import { useToastStore } from '../stores/toast';
import { detectProviderType } from '../services/providers/detector';
import { searchApi } from '../api/search';
import AddToPlaylistMenu from '../components/playlists/AddToPlaylistMenu.vue';

const router = useRouter();
const route = useRoute();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();
const toastStore = useToastStore();

const query = ref('');
const activeCategory = ref('all'); // 'all' | 'online' | 'playlists' | 'tracks'

// Online Multi-Source Search State
const onlineTracks = ref([]);
const isSearchingOnline = ref(false);
const providerStatuses = ref({});
const showAddModal = ref(false);
const targetTrackForAdd = ref(null);
const isAddingToPlaylist = ref(false);
const failedImgMap = reactive({});
let searchDebounceTimer = null;
let currentSearchSeq = 0;

const getTrackKey = (track, idx) => track?.id || track?._id || `row-${idx}`;
const markImageFailed = (track, idx) => {
  failedImgMap[getTrackKey(track, idx)] = true;
};
const getTrackMonogram = (title) => {
  return String(title || 'SW').trim().substring(0, 2).toUpperCase() || 'SW';
};

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
  if (!prov || prov.status === 'unconfigured' || prov.isConfigured === false) return 'OFF';
  if (prov.status === 'rate_limited') return 'LIMIT';
  if (prov.status === 'circuit_broken') return 'COOLDOWN';
  if (prov.status === 'unavailable' || prov.status === 'down') return 'DOWN';
  return 'ACTIVE';
};

const getProviderStatusClass = (name) => {
  const prov = providerStatuses.value[name];
  if (!prov || prov.status === 'unconfigured' || prov.isConfigured === false) return 'status-unconfigured';
  if (prov.status === 'available') return 'status-online';
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
  if (playerStore.isPlaying || playerStore.playbackState === 'playing' || playerStore.playbackState === 'loading') {
    toastStore.info(`Playing ${track.title} via ${getProviderLabel(track)}`);
  } else if (playerStore.playbackState === 'unavailable') {
    toastStore.warn(`"${track.title}" is currently unavailable for playback in this environment.`);
  }
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
  background-color: var(--bg, #F3EFE8);
  color: var(--ink, #111111);
  padding: 2rem;
  max-width: 1240px;
  margin: 0 auto;
  width: 100%;
  box-sizing: border-box;
  font-family: var(--font-body);
}

.pg-search-header {
  margin: 0 auto 2rem auto;
  display: flex;
  flex-direction: column;
  gap: 1.15rem;
}

.search-kicker-strip {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.search-kicker-tag {
  font-size: 0.72rem;
  font-weight: 800;
  padding: 0.25rem 0.65rem;
  background: var(--c-lavender, #B9A6FF);
  color: var(--ink, #111111);
  border: 1.5px solid var(--border, #111111);
  border-radius: 4px;
  box-shadow: 2px 2px 0 var(--border, #111111);
}

.search-kicker-sub {
  font-size: 0.78rem;
  font-weight: 700;
  color: var(--ink-muted, #4A4740);
  letter-spacing: 0.05em;
}

.pg-search-input-box {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.85rem 1.25rem;
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-md, 5px 5px 0 var(--border, #111111));
  border-radius: var(--r-md, 12px);
}

.pg-search-input-box:focus-within {
  border-color: var(--ink, #111111);
  outline: 2px solid var(--focus, #3B5BFF);
}

.search-input-icon {
  color: var(--ink, #111111);
  flex-shrink: 0;
}

.search-text-input {
  flex: 1;
  background: transparent;
  border: none;
  outline: none;
  font-size: 1.2rem;
  font-weight: 700;
  color: var(--ink, #111111);
}

.search-clear-btn {
  font-size: 0.85rem;
  font-weight: 900;
  color: var(--ink-muted, #4A4740);
  width: 28px;
  height: 28px;
  border-radius: 4px;
  display: grid;
  place-items: center;
  background: none;
  border: 1.5px solid var(--border, #111111);
  cursor: pointer;
}

.search-clear-btn:hover {
  background: var(--danger, #E5372B);
  color: #FFFFFF;
}

.search-esc-hint {
  font-size: 0.7rem;
  font-weight: 800;
  color: var(--ink-muted, #4A4740);
  background: #EFEAE1;
  border: 1px solid var(--border, #111111);
  padding: 0.15rem 0.4rem;
  border-radius: 4px;
}

.search-filter-tabs {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.category-tab-btn {
  background: var(--surface-2, #FFFFFF);
  border: 1.5px solid var(--border, #111111);
  box-shadow: 2px 2px 0 var(--border, #111111);
  padding: 0.4rem 0.85rem;
  border-radius: var(--r-pill, 999px);
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
  color: var(--ink, #111111);
}

.category-tab-btn.is-active {
  background: var(--ink, #111111);
  color: var(--bg, #F3EFE8);
}

.pg-search-main {
  max-width: 1400px;
  margin: 0 auto;
}

.search-section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.25rem;
  border-bottom: var(--bw, 2px) solid var(--border, #111111);
  padding-bottom: 0.75rem;
}

.search-section-title {
  font-size: 1.35rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  text-transform: uppercase;
}

.search-count-badge {
  font-size: 0.75rem;
  font-weight: 800;
  padding: 0.2rem 0.5rem;
  background: var(--c-sun, #FFD84A);
  border: 1.5px solid var(--border, #111111);
  border-radius: 4px;
}

.search-results-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.search-track-card {
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
  border-radius: var(--r-md, 12px);
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  transition: transform 0.08s ease;
}

.search-track-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: var(--shadow-md, 5px 5px 0 var(--border, #111111));
}

.search-track-card.is-active {
  background: #FFFDF8;
  border-color: var(--c-blue, #4D6BFF);
}

.st-title {
  font-size: 1.05rem;
  font-weight: 900;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.st-artist {
  font-size: 0.85rem;
  color: var(--ink-muted, #4A4740);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.st-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1.5px solid rgba(17, 17, 17, 0.08);
  padding-top: 0.65rem;
  margin-top: auto;
}

.st-play-btn {
  background: var(--surface, #FFFDF8);
  border: 1.5px solid var(--border, #111111);
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;
}

.st-play-btn:hover {
  background: var(--yellow, #FFD84A);
}

.st-meta-cluster {
  display: flex;
  gap: 0.35rem;
}

.st-icon-btn {
  background: none;
  border: 1.5px solid var(--border, #111111);
  width: 26px;
  height: 26px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  cursor: pointer;
  text-decoration: none;
  color: var(--ink, #111111);
}

.st-icon-btn.active {
  background: var(--c-hotpink, #FF4F9A);
  color: #fff;
}

.search-empty-state {
  text-align: center;
  padding: 5rem 1rem;
  color: var(--ink-muted, #4A4740);
}

/* Portals & Discovery Idle State */
.pg-portals-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.portals-header {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.75rem;
  border-bottom: var(--bw, 2px) solid var(--border, #111111);
  padding-bottom: 0.65rem;
}

.portals-title {
  font-size: 1.4rem;
  font-weight: 900;
  text-transform: uppercase;
}

.portals-subtitle {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--ink-muted, #4A4740);
}

.editorial-portals-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.editorial-portal-tile {
  background: var(--tile-bg, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
  border-radius: var(--r-md, 12px);
  padding: 1.15rem;
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  cursor: pointer;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

.editorial-portal-tile:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 var(--border, #111111);
}

.tile-code {
  font-size: 0.7rem;
  font-weight: 900;
  color: var(--ink-muted, #4A4740);
}

.tile-title {
  font-size: 1.15rem;
  font-weight: 900;
  text-transform: uppercase;
}

.tile-desc {
  font-size: 0.85rem;
  color: #333333;
  line-height: 1.35;
}

.tile-cta {
  margin-top: auto;
  padding-top: 0.45rem;
  font-size: 0.75rem;
  font-weight: 900;
}

.keywords-pill-strip {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.6rem;
}

.keywords-label {
  font-size: 0.75rem;
  font-weight: 900;
}

.keywords-row {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.tag-pill {
  background: #FFFFFF;
  border: 1.5px solid #111111;
  box-shadow: 2px 2px 0 #111111;
  padding: 0.25rem 0.65rem;
  font-size: 0.75rem;
  font-weight: 800;
  cursor: pointer;
}

/* Empty Search State */
.pg-empty-search {
  background: #FFFFFF;
  border: 3px solid #111111;
  box-shadow: 5px 5px 0 #111111;
  padding: 3rem 1.5rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.75rem;
}

.empty-glyph {
  font-size: 2.5rem;
  font-weight: 900;
}

.empty-title {
  font-size: 1.4rem;
  font-weight: 900;
}

.empty-text {
  color: var(--ink-muted, #4A4740);
}

.reset-search-btn {
  background: #FFD84A;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
  padding: 0.55rem 1.15rem;
  font-weight: 900;
  font-size: 0.8rem;
  cursor: pointer;
}

/* Active Search Results Stage */
.pg-results-stage {
  display: flex;
  flex-direction: column;
  gap: 2.25rem;
}

.results-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  min-width: 0;
}

.results-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
  border-bottom: var(--bw, 2px) solid var(--border, #111111);
  padding-bottom: 0.65rem;
}

.header-with-status {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.results-title {
  font-size: 1.35rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.02em;
}

.provider-status-strip {
  display: flex;
  gap: 0.4rem;
}

.status-indicator {
  font-size: 0.7rem;
  font-weight: 900;
  padding: 0.2rem 0.55rem;
  border: 1.5px solid #111111;
  background: #EFEAE1;
}

.status-indicator.status-online {
  background: #5DE3A6;
}

.status-indicator.status-limited {
  background: #FFD84A;
}

.status-indicator.status-down {
  background: #FF6B5E;
  color: #FFFFFF;
}

.results-count {
  font-size: 0.75rem;
  font-weight: 900;
  padding: 0.2rem 0.55rem;
  background: #FFD84A;
  border: 1.5px solid #111111;
}

.online-searching-indicator {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  padding: 1.25rem;
  background: #FFFFFF;
  border: 2px solid #111111;
  font-size: 0.85rem;
  font-weight: 700;
}

.spinner-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: #4D6BFF;
  border: 1.5px solid #111111;
}

/* Boxed Track Cards List */
.tracks-results-list {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
  min-width: 0;
}

.result-track-row {
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
  border-radius: var(--r-md, 12px);
  padding: 0.9rem 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  min-width: 0;
  max-width: 100%;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

.result-track-row:hover {
  transform: translate(-1px, -1px);
  box-shadow: 5px 5px 0 var(--border, #111111);
}

.result-track-row.is-active {
  background: #FFFDF8;
  border-color: var(--c-blue, #4D6BFF);
  box-shadow: 4px 4px 0 var(--c-blue, #4D6BFF);
}

.sr-art-wrap {
  position: relative;
  width: 58px;
  height: 58px;
  flex-shrink: 0;
  padding: 0;
  background: none;
  border: var(--bw, 2px) solid var(--border, #111111);
  border-radius: var(--r-sm, 8px);
  overflow: hidden;
  cursor: pointer;
}

.sr-art-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

.sr-art-fallback {
  width: 100%;
  height: 100%;
  background: var(--c-sun, #FFD84A);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  font-weight: 900;
  color: #111111;
}

.sr-art-overlay {
  position: absolute;
  inset: 0;
  background: rgba(17, 17, 17, 0.55);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.05rem;
  opacity: 0;
  transition: opacity 0.12s ease;
}

.sr-art-wrap:hover .sr-art-overlay,
.sr-art-wrap:focus-visible .sr-art-overlay,
.result-track-row.is-active .sr-art-overlay {
  opacity: 1;
}

.result-play-icon {
  width: 40px;
  height: 40px;
  flex-shrink: 0;
  background: #FFD84A;
  border: 2px solid #111111;
  box-shadow: 2px 2px 0 #111111;
  border-radius: var(--r-sm, 8px);
  font-weight: 900;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-track-details {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.3rem;
}

.result-track-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.45rem;
  min-width: 0;
}

.track-title-text {
  font-size: 1.05rem;
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.02em;
  color: #111111;
  margin: 0;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-badges-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.35rem;
  flex-shrink: 0;
}

.track-source-pill,
.track-license-pill,
.alt-sources-pill {
  font-size: 0.68rem;
  font-weight: 900;
  padding: 0.15rem 0.45rem;
  border: 1.5px solid #111111;
  border-radius: 4px;
  text-transform: uppercase;
  white-space: nowrap;
}

.track-source-pill.prov-jamendo {
  background: #FF6B5E;
  color: #FFFFFF;
}

.track-source-pill.prov-deezer {
  background: #FF007F;
  color: #FFFFFF;
}

.track-source-pill.prov-itunes,
.track-source-pill.prov-apple {
  background: #B9A6FF;
  color: #111111;
}

.track-source-pill {
  background: #FFD84A;
  color: #111111;
}

.track-license-pill {
  background: #EFEAE1;
  color: #111111;
}

.track-license-pill a {
  text-decoration: underline;
  color: inherit;
}

.alt-sources-pill {
  background: #5DE3A6;
  cursor: pointer;
}

.result-track-time {
  font-size: 0.76rem;
  font-weight: 800;
  color: var(--ink-muted, #4A4740);
  white-space: nowrap;
}

.result-track-sub {
  font-size: 0.82rem;
  font-weight: 700;
  color: var(--ink-muted, #4A4740);
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
  min-width: 0;
}

.sr-artist,
.sr-album {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.track-attribution {
  font-size: 0.72rem;
  font-weight: 600;
  color: #5C574E;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  max-width: 100%;
}

.result-actions {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
  flex-shrink: 0;
}

.result-play-btn,
.add-to-queue-btn,
.add-to-mixtape-btn,
.view-on-source-btn {
  padding: 0.38rem 0.65rem;
  border: 1.5px solid #111111;
  box-shadow: 2px 2px 0 #111111;
  font-size: 0.72rem;
  font-weight: 900;
  text-transform: uppercase;
  cursor: pointer;
  text-decoration: none;
  color: #111111;
  background: #FFFFFF;
  white-space: nowrap;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

.result-play-btn {
  background: #FFD84A;
}

.add-to-mixtape-btn {
  background: #5DE3A6;
}

.view-on-source-btn {
  background: #EFEAE1;
}

.result-play-btn:hover,
.add-to-queue-btn:hover,
.add-to-mixtape-btn:hover,
.view-on-source-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 #111111;
}

/* Mixtape Grid */
.mixtapes-results-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.result-mixtape-card {
  background: #FFFFFF;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
  border-radius: var(--r-md, 12px);
  padding: 0.9rem;
  display: flex;
  gap: 0.85rem;
  align-items: center;
  cursor: pointer;
  min-width: 0;
}

.result-cover-box {
  width: 56px;
  height: 56px;
  flex-shrink: 0;
  border: 2px solid #111111;
  border-radius: 6px;
  overflow: hidden;
  background: #FFD84A;
  display: flex;
  align-items: center;
  justify-content: center;
}

.result-cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.result-cover-fallback {
  font-weight: 900;
  font-size: 1.1rem;
}

.result-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.result-track-tag {
  font-size: 0.68rem;
  font-weight: 800;
  color: var(--ink-muted, #4A4740);
}

.result-name {
  font-size: 1rem;
  font-weight: 900;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.result-desc {
  font-size: 0.8rem;
  color: var(--ink-muted, #4A4740);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 1024px) {
  .editorial-portals-grid,
  .mixtapes-results-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .result-track-row {
    flex-wrap: wrap;
  }
  .result-actions {
    width: 100%;
    padding-top: 0.55rem;
    border-top: 1.5px solid rgba(17, 17, 17, 0.08);
  }
}

@media (max-width: 768px) {
  .pg-search-root {
    padding: 1rem;
  }
  .editorial-portals-grid,
  .mixtapes-results-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .result-track-row {
    padding: 0.8rem;
    gap: 0.75rem;
  }
  .track-title-text {
    white-space: normal;
  }
}
</style>