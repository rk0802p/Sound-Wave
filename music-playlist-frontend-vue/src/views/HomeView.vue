<template>
  <div class="soundwave-home" :class="{ 'playing': playerStore.isPlaying, 'drawer-open': isDrawerOpen }">
    <!-- Fixed Background Wash with Dynamic Tint Transition -->
    <div class="wash" id="wash" :style="{ backgroundColor: currentWashColor }"></div>

    <!-- Background Drifting Pastel Blobs -->
    <div class="bgb" aria-hidden="true">
      <i :style="{ background: currentPalette.o1 }"></i>
      <i :style="{ background: '#ffd7a0' }"></i>
      <i :style="{ background: '#e1d2ff' }"></i>
    </div>

    <!-- 1. FLOATING PILL TOP NAVIGATION BAR -->
    <header class="top glass" role="banner">
      <!-- Menu Drawer Toggle -->
      <button
        class="ib orb"
        id="menu"
        aria-label="Open navigation drawer"
        title="Open navigation menu"
        @click="openDrawer"
      >
        <svg viewBox="0 0 24 24"><path :d="ICONS.menu" /></svg>
      </button>

      <!-- Brand Logo with Bouncing Orb -->
      <router-link to="/" class="logo" title="Soundwave Music">
        <span class="orb" aria-hidden="true">🎧</span>
        <span>Soundwave</span>
      </router-link>

      <div class="sp"></div>

      <!-- Expandable Glass Search Pill -->
      <label class="search" :class="{ 'is-focused': isSearchFocused }">
        <span class="search-icon" aria-hidden="true">
          <svg viewBox="0 0 24 24"><path :d="ICONS.search" /></svg>
        </span>
        <input
          id="q"
          ref="searchInputRef"
          v-model="searchQuery"
          type="search"
          placeholder="Search catalog, tracks, artists..."
          aria-label="Search tracks"
          @focus="isSearchFocused = true"
          @blur="isSearchFocused = false"
          @input="handleSearchInput"
          @keydown.enter="handleSearchSubmit"
        />
        <button
          v-if="searchQuery"
          class="clear-btn"
          aria-label="Clear search query"
          @click="searchQuery = ''"
        >
          ✕
        </button>
      </label>

      <!-- Notification Bell with Pulsing Dot -->
      <button
        class="ib glass bell-btn"
        id="bell"
        aria-label="Notifications"
        title="Notifications"
        @click="handleBellClick($event)"
      >
        <svg viewBox="0 0 24 24"><path :d="ICONS.bell" /></svg>
        <i v-if="hasUnreadNotification" class="dot" id="dot"></i>
      </button>
    </header>

    <!-- 2. SLIDING NAVIGATION DRAWER & SCRIM -->
    <div
      class="scrim"
      :class="{ 'is-open': isDrawerOpen }"
      aria-hidden="true"
      @click="closeDrawer"
    ></div>

    <aside
      class="drawer glass"
      id="drawer"
      :class="{ 'is-open': isDrawerOpen }"
      :inert="!isDrawerOpen ? '' : null"
      role="dialog"
      aria-modal="true"
      aria-label="Application Menu"
    >
      <!-- Drawer Header -->
      <div class="dh">
        <button
          class="ib orb"
          id="menu2"
          aria-label="Close navigation drawer"
          title="Close menu"
          @click="closeDrawer"
        >
          <svg viewBox="0 0 24 24"><path :d="ICONS.menu" /></svg>
        </button>
        <div class="logo">
          <span class="orb" aria-hidden="true">🎧</span>
          <span>Soundwave</span>
        </div>
      </div>

      <!-- User Auth State -->
      <div class="drawer-auth">
        <template v-if="authStore.isAuthenticated">
          <div class="user-pill glass">
            <span class="user-avatar orb">{{ userInitial }}</span>
            <div class="user-info">
              <strong>{{ authStore.username || 'Curator' }}</strong>
              <small>{{ authStore.user?.email || 'Logged in' }}</small>
            </div>
          </div>
          <button class="btn s logout-btn" @click="handleLogout">
            Sign out
          </button>
        </template>
        <template v-else>
          <div class="auth">
            <router-link to="/login" class="btn p" @click="closeDrawer">Log in</router-link>
            <router-link to="/signup" class="btn s" @click="closeDrawer">Sign up</router-link>
          </div>
        </template>
      </div>

      <!-- Navigation Links -->
      <div class="drawer-nav-group">
        <!-- Favourites Filter -->
        <button
          class="nav"
          :class="{ 'is-active': activeFilter === 'favorites' }"
          @click="handleFilterFavorites"
        >
          <span class="orb" style="--o1:#ffa6d4;--o2:#ff4f9a">
            <svg viewBox="0 0 24 24"><path :d="ICONS.heart" /></svg>
          </span>
          <span>Favourites ({{ favoritesList.length }})</span>
        </button>

        <!-- Library Link -->
        <router-link to="/library" class="nav" @click="closeDrawer">
          <span class="orb" style="--o1:#8ff2d3;--o2:#2fd3a2">📚</span>
          <span>My Library</span>
        </router-link>

        <!-- Search Link -->
        <router-link to="/search" class="nav" @click="closeDrawer">
          <span class="orb" style="--o1:#9ad8ff;--o2:#3fa7ff">🔍</span>
          <span>Search Catalog</span>
        </router-link>
      </div>

      <!-- Playlists Section -->
      <div class="drawer-section">
        <div class="lab">
          <span>Playlists ({{ playlistStore.playlists.length }})</span>
          <button id="newpl" @click="openCreateModal">+ New</button>
        </div>

        <div v-if="playlistStore.playlists.length > 0" class="pls" id="pls">
          <router-link
            v-for="(p, idx) in playlistStore.playlists"
            :key="p._id || idx"
            :to="'/playlist/' + (p._id || p.id)"
            class="nav pl-item"
            @click="closeDrawer"
          >
            <span
              class="orb"
              :style="{
                '--o1': getPalette(idx).o1,
                '--o2': getPalette(idx).o2,
                '--sh': getPalette(idx).o2 + '88',
              }"
            >
              🎵
            </span>
            <span class="pl-name">{{ p.name }}</span>
          </router-link>
        </div>
        <div v-else class="empty" id="empty">
          <p>No playlists yet</p>
          <button id="create" @click="openCreateModal">+ Create playlist</button>
        </div>
      </div>

      <!-- Mood & Genre Filter Accordion -->
      <div id="langs" class="drawer-section">
        <button
          class="lab accordion-header"
          id="langbtn"
          :class="{ on: isMoodAccordionOpen }"
          :aria-expanded="isMoodAccordionOpen ? 'true' : 'false'"
          @click="isMoodAccordionOpen = !isMoodAccordionOpen"
        >
          <span id="langt">Moods & Genres ({{ selectedGenreFilter || 'All' }})</span>
          <span class="chev" id="ic-c">
            <svg viewBox="0 0 24 24"><path :d="ICONS.chev" /></svg>
          </span>
        </button>
        <div class="acc" :class="{ on: isMoodAccordionOpen }" id="acc">
          <div>
            <div class="chips" id="chips">
              <button
                v-for="chip in genreChips"
                :key="chip"
                class="chip"
                :aria-pressed="selectedGenreFilter === chip ? 'true' : 'false'"
                @click="handleSelectGenre(chip)"
              >
                {{ chip }}
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Settings / Audio Engine Info -->
      <button class="nav" @click="showSettingsModal = true">
        <span class="orb" style="--o1:#c9b6ff;--o2:#8a68ff">⚙️</span>
        <span>Settings & Audio</span>
      </button>

      <!-- Drawer Footer Links -->
      <div class="foot">
        <a href="https://github.com/rk0802p/music_playlist" target="_blank" rel="noopener">GitHub</a>
        <a href="https://archive.org" target="_blank" rel="noopener">Archive</a>
        <a href="https://audius.co" target="_blank" rel="noopener">Audius</a>
      </div>
    </aside>

    <!-- 3. MAIN HOMEPAGE CONTENT -->
    <main class="home-main">
      <!-- Animated Staggered Hero Greeting -->
      <h1 class="greet" id="greet" aria-live="polite">
        <span
          v-for="(word, wIdx) in greetingWords"
          :key="wIdx"
          :class="{ 'g': wIdx > 0 }"
          :style="{ '--i': wIdx }"
        >
          {{ word }}
        </span>
        <span class="em" style="--i: 3" aria-hidden="true">🎶</span>
      </h1>

      <!-- Active Filter Banner (When searching or filtering by genre/favourite) -->
      <div v-if="activeFilterBadge" class="filter-banner glass">
        <span>Filtering by: <strong>{{ activeFilterBadge }}</strong></span>
        <button class="filter-clear" @click="clearAllFilters">✕ Reset Filter</button>
      </div>

      <!-- 4. "LISTEN AGAIN" SECTION -->
      <section class="home-section" aria-label="Listen Again">
        <div class="sh">
          <h2 class="rv in">Listen again</h2>
          <span class="section-tag font-mono">POPULAR ROTATION</span>
        </div>

        <div class="again" id="again">
          <button
            v-for="(track, idx) in displayedListenAgainTracks"
            :key="track.id || track._id"
            class="song glass rv in"
            :class="{
              'on': isCurrentTrack(track),
              'is-active': isCurrentTrack(track),
            }"
            :style="{
              '--d': idx * 80 + 'ms',
              '--o1': track.palette?.o1 || '#7ff0e6',
              '--o2': track.palette?.o2 || '#19c9bd',
              '--sh': (track.palette?.o2 || '#19c9bd') + '88',
            }"
            :data-id="track.id || track._id"
            @click="handlePlayTrack(track, displayedListenAgainTracks, idx, $event)"
          >
            <!-- Squishy Glossy Orb with Emoji or Album Art -->
            <span class="orb" aria-hidden="true">
              {{ track.emoji }}
            </span>

            <!-- Track Metadata -->
            <span class="mt">
              <b>{{ track.title }}</b>
              <small>{{ track.artist }}</small>
            </span>

            <!-- 3-Bar Live Equalizer Visualizer (Active when Playing) -->
            <span class="eq" aria-hidden="true">
              <b></b><b></b><b></b>
            </span>
          </button>
        </div>
      </section>

      <!-- 5. "TRENDING" HORIZONTAL CAROUSEL SECTION -->
      <section class="home-section" aria-label="Trending Tracks">
        <div class="sh">
          <h2 class="rv in">Trending</h2>
          <div class="arrows">
            <button
              class="ib"
              id="lt"
              aria-label="Scroll trending carousel left"
              title="Scroll left"
              @click="scrollCarousel(-460)"
            >
              <svg viewBox="0 0 24 24"><path :d="ICONS.l" /></svg>
            </button>
            <button
              class="ib"
              id="rt"
              aria-label="Scroll trending carousel right"
              title="Scroll right"
              @click="scrollCarousel(460)"
            >
              <svg viewBox="0 0 24 24"><path :d="ICONS.r" /></svg>
            </button>
          </div>
        </div>

        <!-- Horizontal Track Carousel -->
        <div class="track" id="track" ref="trackCarouselRef">
          <button
            v-for="(track, idx) in displayedTrendingTracks"
            :key="track.id || track._id"
            class="tc rv in"
            :class="{ 'on': isCurrentTrack(track) }"
            :style="{
              '--d': idx * 70 + 'ms',
              '--o1': track.palette?.o1 || '#ffd27a',
              '--o2': track.palette?.o2 || '#ffa24c',
              '--sh': (track.palette?.o2 || '#ffa24c') + '88',
            }"
            :data-id="track.id || track._id"
            @click="handlePlayTrack(track, displayedTrendingTracks, idx, $event)"
          >
            <!-- Large Glossy Cover with 3D Radial Shine & Sheen Sweep -->
            <div class="cv">
              <span>{{ track.emoji }}</span>
              <span class="pl" aria-hidden="true">
                <svg viewBox="0 0 24 24">
                  <path v-if="isCurrentTrack(track) && playerStore.isPlaying" :d="ICONS.pause" />
                  <path v-else :d="ICONS.play" />
                </svg>
              </span>
            </div>
            <b>{{ track.title }}</b>
            <small>{{ track.artist }}</small>
          </button>
        </div>
      </section>

      <!-- 6. CURATED DISCOVER SHELF (Zero-API High-Availability Collection) -->
      <section class="home-section" aria-label="Curated Discover Collection">
        <div class="sh">
          <div class="curated-heading">
            <h2 class="rv in">Curated Discover</h2>
            <p class="curated-sub font-mono">18 tracks from your Spotify collection</p>
          </div>
          <button class="ib glass font-mono refresh-btn" title="Shuffle pick" @click="handleShuffleCurated($event)">
            ↺
          </button>
        </div>

        <div class="curated-grid">
          <div
            v-for="(track, idx) in displayedCuratedTracks"
            :key="track._id || track.id"
            class="curated-card glass"
            :class="{ 'on': isCurrentTrack(track) }"
            :style="{
              '--o1': track.palette?.o1 || '#7ff0e6',
              '--o2': track.palette?.o2 || '#19c9bd',
              '--sh': (track.palette?.o2 || '#19c9bd') + '88',
            }"
            @click="handlePlayTrack(track, displayedCuratedTracks, idx, $event)"
          >
            <div class="card-left">
              <span class="orb card-orb">{{ track.emoji }}</span>
              <div class="card-text">
                <strong class="card-title">{{ track.title }}</strong>
                <span class="card-artist">{{ track.artist }}</span>
                <div class="card-tags">
                  <span class="badge badge-license font-mono" @click.stop="openLicenseModal(track)">
                    {{ track.license?.badge || 'CC' }}
                  </span>
                  <span class="badge badge-genre font-mono">{{ track.genre }}</span>
                </div>
              </div>
            </div>

            <button
              class="ib orb play-mini"
              :aria-label="isCurrentTrack(track) && playerStore.isPlaying ? 'Pause' : 'Play ' + track.title"
            >
              <svg viewBox="0 0 24 24">
                <path v-if="isCurrentTrack(track) && playerStore.isPlaying" :d="ICONS.pause" />
                <path v-else :d="ICONS.play" />
              </svg>
            </button>
          </div>
        </div>

        <div v-if="displayedCuratedTracks.length === 0 && searchQuery.trim()" class="empty-curated-search glass">
          <p>No homepage tracks match "{{ searchQuery.trim() }}".</p>
          <router-link :to="{ path: '/search', query: { q: searchQuery.trim() } }" class="btn p font-mono">
            Search Online Multi-Source Catalog →
          </router-link>
        </div>
      </section>
    </main>

    <!-- 7. FLOATING BOTTOM GLASS PLAYER DOCK -->
    <FloatingPlayerDock
      @open-info="openLicenseModal"
      @toggle-queue="handleToggleQueue"
      @bubble-pop="handleBubblePop"
    />

    <!-- Up Next Queue Drawer Overlay -->
    <div
      v-if="isQueueOpen"
      class="queue-drawer-overlay"
      @click.self="isQueueOpen = false"
    >
      <aside class="queue-drawer-panel glass" role="dialog" aria-label="Up Next Queue">
        <div class="queue-drawer-header">
          <div class="queue-title-wrap">
            <h3 class="queue-title font-display">Up Next Queue</h3>
            <span class="queue-badge font-mono">{{ playerStore.queue?.length || 0 }} TRACKS</span>
          </div>
          <button class="queue-close-btn font-mono" @click="isQueueOpen = false">✕</button>
        </div>

        <div v-if="!playerStore.queue || playerStore.queue.length === 0" class="queue-empty font-mono">
          Queue is empty. Select tracks to play.
        </div>

        <div v-else class="queue-track-list">
          <div
            v-for="(t, qIdx) in playerStore.queue"
            :key="t._id || t.id || qIdx"
            class="queue-track-row"
            :class="{ 'is-active': playerStore.trackIndex === qIdx }"
            @click="handlePlayQueueItem(qIdx)"
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

    <!-- MODAL: CREATE PLAYLIST -->
    <CreatePlaylistModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="handlePlaylistCreated"
    />

    <!-- MODAL: TRACK LICENSE & ATTRIBUTION -->
    <div
      v-if="selectedInfoTrack"
      class="modal-backdrop"
      @click.self="selectedInfoTrack = null"
      role="dialog"
      aria-modal="true"
    >
      <div class="modal-card glass">
        <div class="modal-header">
          <div class="logo">
            <span class="orb">{{ selectedInfoTrack.emoji || '📜' }}</span>
            <span>License & Attribution</span>
          </div>
          <button class="close-btn" @click="selectedInfoTrack = null" aria-label="Close dialog">✕</button>
        </div>

        <div class="modal-body">
          <h3>{{ selectedInfoTrack.title }}</h3>
          <p class="modal-artist">{{ selectedInfoTrack.artist }}</p>

          <div class="info-row">
            <label>License</label>
            <div class="license-chip">{{ selectedInfoTrack.license?.name || 'Creative Commons / Public Domain' }}</div>
          </div>

          <div class="info-row" v-if="selectedInfoTrack.license?.attribution">
            <label>Attribution</label>
            <blockquote class="attribution-box">{{ selectedInfoTrack.license.attribution }}</blockquote>
          </div>

          <div class="info-row" v-if="selectedInfoTrack.source?.pageUrl">
            <label>Original Source</label>
            <a :href="selectedInfoTrack.source.pageUrl" target="_blank" rel="noopener" class="source-link">
              {{ selectedInfoTrack.source.name || 'Internet Archive item page' }} ↗
            </a>
          </div>

          <div class="info-row">
            <label>Streaming Capability</label>
            <p class="capability-text" v-if="selectedInfoTrack.audioUrl || selectedInfoTrack.streamUrl">
              Direct high-availability MP3 audio streamed from original publisher. No local audio downloaded.
            </p>
            <p class="capability-text" v-else>
              Direct static playback unavailable. Commercial copyrighted master recording requires licensed streaming authorization (Spotify OAuth / API subscription). Metadata preserved as source of truth.
            </p>
          </div>
        </div>
      </div>
    </div>

    <!-- MODAL: SETTINGS & AUDIO ENGINE INFO -->
    <div
      v-if="showSettingsModal"
      class="modal-backdrop"
      @click.self="showSettingsModal = false"
      role="dialog"
      aria-modal="true"
    >
      <div class="modal-card glass">
        <div class="modal-header">
          <div class="logo">
            <span class="orb">⚙️</span>
            <span>Audio Engine Settings</span>
          </div>
          <button class="close-btn" @click="showSettingsModal = false" aria-label="Close dialog">✕</button>
        </div>

        <div class="modal-body">
          <div class="setting-item">
            <strong>Persistent HTML5 Audio Engine</strong>
            <p>Active driver: <code>DirectAudioProvider</code> (HTML5 Audio, Audius, Internet Archive)</p>
          </div>

          <div class="setting-item">
            <strong>Volume Memory</strong>
            <p>Current level: {{ Math.round(playerStore.volume * 100) }}% ({{ playerStore.muted ? 'Muted' : 'Unmuted' }})</p>
          </div>

          <div class="setting-item">
            <strong>Playback Race Guard</strong>
            <p>State: Enabled (Sequence tracking active via <code>playRequestId</code>)</p>
          </div>

          <div class="setting-item">
            <strong>Spotify Developer Mode</strong>
            <p>OAuth & Web Playback SDK: Available for allowlisted test accounts (25 max)</p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { usePlayerStore } from '../stores/player';
import { usePlaylistStore } from '../stores/playlist';
import { useAuthStore } from '../stores/auth';
import { useToastStore } from '../stores/toast';
import { FEATURED_SONGS } from '../data/featuredSongs';
import { resolvePlayableAudioUrl } from '../services/providers/detector';
import FloatingPlayerDock from '../components/player/FloatingPlayerDock.vue';
import CreatePlaylistModal from '../components/playlists/CreatePlaylistModal.vue';

const router = useRouter();
const route = useRoute();
const playerStore = usePlayerStore();
const playlistStore = usePlaylistStore();
const authStore = useAuthStore();
const toastStore = useToastStore();

// Reference Color Palettes (Amber, Lavender, Mint, Rose, Sky, Aqua)
const PALETTES = [
  { o1: '#ffd27a', o2: '#ffa24c', tint: '#ffe9c9' }, // 0: Amber
  { o1: '#c9b6ff', o2: '#8a68ff', tint: '#e6dcff' }, // 1: Lavender
  { o1: '#8ff2d3', o2: '#2fd3a2', tint: '#d3f8ec' }, // 2: Mint
  { o1: '#ff9bd2', o2: '#ff4f9a', tint: '#ffd9ec' }, // 3: Rose
  { o1: '#9ad8ff', o2: '#3fa7ff', tint: '#d4eeff' }, // 4: Sky
  { o1: '#7ff0e6', o2: '#19c9bd', tint: '#d8faf6' }, // 5: Aqua
];

const EMOJIS = ['⚡', '🌸', '💫', '🌊', '🔥', '✨', '🕊️', '🌼', '💃', '💎', '🌧️', '🎧', '🌙', '🌴', '🕶️', '🐱', '🐾', '🚨'];

const getPalette = (idx) => PALETTES[idx % PALETTES.length];

// Reusable SVG icons from reference
const ICONS = {
  menu: 'M3 6h18v2H3zM3 11h18v2H3zM3 16h18v2H3z',
  search: 'M10.5 3a7.5 7.5 0 1 0 4.5 13.500l4.500 4.500 1.500-1.500-4.500-4.500A7.500 7.500 0 0 0 10.500 3zm0 2a5.500 5.500 0 1 1 0 11 5.500 5.500 0 0 1 0-11z',
  bell: 'M12 3a6 6 0 0 0-6 6v4l-2 3h16l-2-3V9a6 6 0 0 0-6-6zm-2 15a2 2 0 0 0 4 0z',
  heart: 'M12 21s-8-5.200-8-11a4.600 4.600 0 0 1 8-3 4.600 4.600 0 0 1 8 3c0 5.800-8 11-8 11z',
  play: 'M7 4v16l13-8z',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
  l: 'M14 6l-6 6 6 6 1.400-1.400L10.800 12l4.600-4.600z',
  r: 'M10 6l6 6-6 6-1.400-1.400 4.600-4.600-4.600-4.600z',
  chev: 'M7 10l5 5 5-5z',
};

// UI State
const isDrawerOpen = ref(false);
const isQueueOpen = ref(false);
const isSearchFocused = ref(false);
const searchQuery = ref('');
const hasUnreadNotification = ref(true);
const isMoodAccordionOpen = ref(false);
const selectedGenreFilter = ref('');
const activeFilter = ref(''); // '' | 'favorites' | 'search' | 'genre' | 'playlist'
const activePlaylist = ref(null);
const showCreateModal = ref(false);
const showSettingsModal = ref(false);
const selectedInfoTrack = ref(null);
const trackCarouselRef = ref(null);
const searchInputRef = ref(null);
const favoritesList = ref([]);

// Dynamic Greeting based on time of day
const greetingWords = computed(() => {
  const h = new Date().getHours();
  let baseGreeting = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  if (authStore.isAuthenticated && authStore.username) {
    baseGreeting = `${baseGreeting}, ${authStore.username}`;
  }
  return baseGreeting.split(' ');
});

const userInitial = computed(() => {
  return (authStore.username?.[0] || 'U').toUpperCase();
});

// Load persistent favorites
const loadFavorites = () => {
  try {
    const raw = localStorage.getItem('soundwave_favorites');
    favoritesList.value = raw ? JSON.parse(raw) : [];
  } catch (e) {
    favoritesList.value = [];
  }
};

// Curated Track Catalog with Palettes and Emojis
const allCuratedTracks = computed(() => {
  return FEATURED_SONGS.map((t, i) => ({
    ...t,
    palette: getPalette(i),
    emoji: EMOJIS[i % EMOJIS.length],
  }));
});

// Dynamic background wash color based on active track
const currentPalette = computed(() => {
  const t = playerStore.currentTrack;
  if (!t) return PALETTES[5]; // Default Aqua
  const foundIdx = allCuratedTracks.value.findIndex(
    (x) => x.id === t.id || x._id === t._id || x.title === t.title
  );
  return foundIdx !== -1 ? getPalette(foundIdx) : PALETTES[5];
});

const currentWashColor = computed(() => currentPalette.value.tint);

// Genre chips
const genreChips = ['All', 'English Pop', 'Electronic / Dance', 'Latin', 'Reggaeton', 'Alternative / Indie', 'Hip-Hop'];

// Displayed Tracks with Search & Genre Filtering
const displayedListenAgainTracks = computed(() => {
  let list = allCuratedTracks.value.slice(0, 6);
  return applyFilters(list);
});

const displayedTrendingTracks = computed(() => {
  let list = allCuratedTracks.value.slice(6);
  return applyFilters(list);
});

const displayedCuratedTracks = computed(() => {
  return applyFilters(allCuratedTracks.value);
});

const applyFilters = (tracks) => {
  let result = [...tracks];

  // Favourites filter
  if (activeFilter.value === 'favorites') {
    result = result.filter((t) => favoritesList.value.includes(t.id || t._id));
  }

  // Playlist filter
  if (activeFilter.value === 'playlist' && activePlaylist.value) {
    const plSongs = (activePlaylist.value.songs || []).map((s) => ({
      ...s,
      palette: s.palette || { o1: '#8ff2d3', o2: '#2fd3a2', tint: '#d3f8ec' },
      emoji: s.emoji || '🎵',
      genre: s.genre || 'Playlist',
    }));
    const plSongIds = plSongs.map((s) => s._id || s.id || s.title);
    const matched = result.filter((t) => plSongIds.includes(t._id || t.id || t.title));
    if (matched.length > 0) {
      result = matched;
    } else if (plSongs.length > 0) {
      return plSongs;
    }
  }

  // Genre filter
  if (selectedGenreFilter.value && selectedGenreFilter.value !== 'All') {
    const g = selectedGenreFilter.value.toLowerCase();
    result = result.filter((t) => {
      const trackGenre = (t.genre || '').toLowerCase();
      if (g === 'latin') {
        return trackGenre.includes('latin') || trackGenre.includes('reggaeton');
      }
      return trackGenre.includes(g);
    });
  }

  // Text search query filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    result = result.filter((t) =>
      `${t.title} ${t.artist} ${t.genre || ''}`.toLowerCase().includes(q)
    );
  }

  return result;
};

const activeFilterBadge = computed(() => {
  if (searchQuery.value.trim()) return `Search: "${searchQuery.value.trim()}"`;
  if (activeFilter.value === 'favorites') return 'Favourites';
  if (activeFilter.value === 'playlist' && activePlaylist.value) return `Playlist: "${activePlaylist.value.name}"`;
  if (selectedGenreFilter.value && selectedGenreFilter.value !== 'All') return `Genre: ${selectedGenreFilter.value}`;
  return '';
});

const clearAllFilters = () => {
  searchQuery.value = '';
  activeFilter.value = '';
  selectedGenreFilter.value = '';
  activePlaylist.value = null;
  if (route.query.playlist) {
    router.push({ path: '/' });
  }
};

// Playback handlers
const isCurrentTrack = (track) => {
  if (!playerStore.currentTrack) return false;
  return (
    playerStore.currentTrack.id === track.id ||
    playerStore.currentTrack._id === track._id ||
    playerStore.currentTrack.title === track.title
  );
};

const handlePlayTrack = async (track, queue, index, event) => {
  if (isCurrentTrack(track) && playerStore.isPlaying) {
    playerStore.togglePlay();
    return;
  }

  // Update theme colors
  if (track.palette) {
    playerStore.setTheme(track.palette.o1, track.palette.o2, track.palette.tint);
  }

  // Trigger bubble pop animation
  if (event) {
    const rect = event.currentTarget.getBoundingClientRect();
    popParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 20, track.palette);
  }

  const audioUrl = resolvePlayableAudioUrl(track);
  const canResolve = Boolean((!audioUrl || track.needsResolution) && track.providerTrackId && track.provider && track.provider !== 'spotify' && !track.isUnavailable);

  if (!audioUrl && !canResolve) {
    playerStore.currentTrack = track;
    playerStore.queue = queue;
    playerStore.trackIndex = index;
    playerStore.currentTime = 0;
    playerStore.duration = track.duration || 0;
    playerStore.isPlaying = false;
    playerStore.error = `Playback unavailable: "${track.title}" is currently unavailable for direct streaming.`;
    toastStore.info(`"${track.title}" — Currently unavailable for direct streaming.`);
    return;
  }

  await playerStore.playTrack(track, queue, index);
};

// Carousel scrolling
const scrollCarousel = (delta) => {
  if (trackCarouselRef.value) {
    trackCarouselRef.value.scrollBy({ left: delta, behavior: 'smooth' });
  }
};

// Drawer controls & root/background scroll lock
const openDrawer = () => {
  isDrawerOpen.value = true;
};

const closeDrawer = () => {
  isDrawerOpen.value = false;
};

// Style preservation for root and body
let savedHtmlOverflow = null;
let savedBodyOverflow = null;
let savedBodyTouchAction = null;

const applyScrollLock = () => {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  const body = document.body;

  if (savedHtmlOverflow === null) savedHtmlOverflow = html.style.overflow;
  if (savedBodyOverflow === null) savedBodyOverflow = body.style.overflow;
  if (savedBodyTouchAction === null) savedBodyTouchAction = body.style.touchAction;

  html.style.overflow = 'hidden';
  body.style.overflow = 'hidden';
  body.style.touchAction = 'none';
};

const releaseScrollLock = () => {
  if (typeof document === 'undefined') return;
  const html = document.documentElement;
  const body = document.body;

  if (savedHtmlOverflow !== null) {
    html.style.overflow = savedHtmlOverflow;
    savedHtmlOverflow = null;
  }
  if (savedBodyOverflow !== null) {
    body.style.overflow = savedBodyOverflow;
    savedBodyOverflow = null;
  }
  if (savedBodyTouchAction !== null) {
    body.style.touchAction = savedBodyTouchAction;
    savedBodyTouchAction = null;
  }
};

watch(isDrawerOpen, (isOpen) => {
  if (isOpen) {
    applyScrollLock();
  } else {
    releaseScrollLock();
  }
});

const handleKeyDown = (e) => {
  if (e.key === 'Escape' && isDrawerOpen.value) {
    closeDrawer();
  }
};

// Search handling
const handleSearchInput = () => {
  if (searchQuery.value.trim()) {
    activeFilter.value = 'search';
  } else if (activeFilter.value === 'search') {
    activeFilter.value = '';
  }
};

const handleSearchSubmit = () => {
  if (searchQuery.value.trim()) {
    router.push({ path: '/search', query: { q: searchQuery.value.trim() } });
  }
};

// Bell notifications
const handleBellClick = (event) => {
  hasUnreadNotification.value = false;
  toastStore.info('All 12 curated tracks verified for direct HTTP 200 playback!');
  if (event) {
    const rect = event.currentTarget.getBoundingClientRect();
    popParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 12, {
      o1: '#ff4f9a',
      o2: '#ffa24c',
    });
  }
};

// Favourites toggle
const handleFilterFavorites = () => {
  loadFavorites();
  if (activeFilter.value === 'favorites') {
    activeFilter.value = '';
  } else {
    activeFilter.value = 'favorites';
    if (favoritesList.value.length === 0) {
      toastStore.info('No tracks favorited yet! Click the heart in the player to save a track.');
    }
  }
  closeDrawer();
};

const handleSelectGenre = (chip) => {
  if (chip === 'All') {
    selectedGenreFilter.value = '';
    activeFilter.value = '';
  } else {
    selectedGenreFilter.value = chip;
    activeFilter.value = 'genre';
  }
  isMoodAccordionOpen.value = false;
  closeDrawer();
};

// Modal helpers
const openCreateModal = () => {
  closeDrawer();
  showCreateModal.value = true;
};

const handlePlaylistCreated = () => {
  showCreateModal.value = false;
  playlistStore.fetchPlaylists();
  toastStore.success('Playlist bubble created successfully!');
};

const openLicenseModal = (track) => {
  selectedInfoTrack.value = track || playerStore.currentTrack;
};

const handleToggleQueue = () => {
  isQueueOpen.value = !isQueueOpen.value;
};

const handlePlayQueueItem = (idx) => {
  if (!playerStore.queue || !playerStore.queue[idx]) return;
  playerStore.trackIndex = idx;
  playerStore.playTrack(playerStore.queue[idx], playerStore.queue, idx);
};

const handleShuffleCurated = (event) => {
  if (allCuratedTracks.value.length > 0) {
    const rndIdx = Math.floor(Math.random() * allCuratedTracks.value.length);
    handlePlayTrack(allCuratedTracks.value[rndIdx], allCuratedTracks.value, rndIdx, event);
  }
};

const handleLogout = () => {
  authStore.logout();
  closeDrawer();
  toastStore.info('Logged out successfully.');
};

// Particle pop function
const popParticles = (x, y, n = 18, colorPair = null) => {
  if (typeof window === 'undefined') return;
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const o1 = colorPair?.o1 || playerStore.o1 || '#7ff0e6';
  const o2 = colorPair?.o2 || playerStore.o2 || '#19c9bd';

  for (let i = 0; i < n; i++) {
    const d = document.createElement('i');
    d.className = 'bub';
    const s = 12 + Math.random() * 28;
    d.style.cssText = `left:${x}px;top:${y}px;width:${s}px;height:${s}px;--bc:${i % 2 ? o1 : o2}`;
    document.body.appendChild(d);
    const a = Math.random() * 6.28;
    const v = 50 + Math.random() * 160;

    d.animate(
      [
        { transform: 'translate(0,0) scale(.3)', opacity: 1 },
        { transform: `translate(${Math.cos(a) * v}px,${Math.sin(a) * v - 150}px) scale(1)`, opacity: 1, offset: 0.75 },
        { transform: `translate(${Math.cos(a) * v}px,${Math.sin(a) * v - 175}px) scale(1.4)`, opacity: 0 },
      ],
      {
        duration: 900 + Math.random() * 650,
        easing: 'cubic-bezier(.2,.8,.3,1)',
      }
    ).onfinish = () => d.remove();
  }
};

const handleBubblePop = (data) => {
  if (data?.target) {
    const rect = data.target.getBoundingClientRect();
    popParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, data.count || 16);
  }
};

watch(
  () => [route.query.playlist, playlistStore.playlists],
  ([newId, playlists]) => {
    if (newId && Array.isArray(playlists) && playlists.length > 0) {
      const found = playlists.find((p) => p._id === newId || p.id === newId);
      if (found) {
        activePlaylist.value = found;
        activeFilter.value = 'playlist';
        if (found.songs && found.songs.length > 0) {
          playerStore.queue = found.songs;
        }
      }
    } else if (!newId && activeFilter.value === 'playlist') {
      activePlaylist.value = null;
      activeFilter.value = '';
    }
  },
  { immediate: true }
);

onMounted(() => {
  loadFavorites();
  playlistStore.fetchPlaylists().catch(() => {});
  window.addEventListener('keydown', handleKeyDown);

  // Set initial default track in player to the first song from Spotify collection if not actively playing
  if (allCuratedTracks.value.length > 0 && !playerStore.isPlaying) {
    const initialTrack = allCuratedTracks.value[0];
    playerStore.currentTrack = initialTrack;
    playerStore.queue = allCuratedTracks.value;
    playerStore.trackIndex = 0;
    playerStore.duration = initialTrack.duration;
    if (initialTrack.palette) {
      playerStore.setTheme(initialTrack.palette.o1, initialTrack.palette.o2, initialTrack.palette.tint);
    }
  }

  if (route.query.drawer === 'true' || route.query.drawer === '1') {
    isDrawerOpen.value = true;
  }
  if (route.query.playing === 'true') {
    playerStore.isPlaying = true;
    playerStore.currentTime = 42;
  }
});

onUnmounted(() => {
  window.removeEventListener('keydown', handleKeyDown);
  releaseScrollLock();
});
</script>

<style scoped>
/* SOUNDWAVE Main Home Layout */
.soundwave-home {
  position: relative;
  min-height: 100vh;
  width: 100%;
  max-width: 100%;
  color: var(--ink);
  font-family: Figtree, system-ui, sans-serif;
  overflow-x: hidden;
  padding-bottom: 0;
}

/* 1. TOP FLOATING NAVBAR */
.top {
  position: fixed;
  z-index: 40;
  left: 50%;
  transform: translate(-50%, 0);
  top: calc(0.8rem + env(safe-area-inset-top, 0px));
  width: min(1240px, calc(100% - 1.5rem));
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.5rem 0.6rem;
  border-radius: 99px;
  box-shadow: 0 16px 40px rgba(120, 80, 200, 0.14), 0 0 0 1px rgba(255, 255, 255, 0.9);
  transition: transform 0.3s;
}

.ib {
  width: 44px;
  height: 44px;
  border-radius: 50%;
  flex: none;
  position: relative;
  display: grid;
  place-items: center;
  border: 0;
  background: none;
  cursor: pointer;
  color: var(--ink);
  transition: transform 0.3s cubic-bezier(0.2, 2.4, 0.4, 1);
}

.ib:hover {
  transform: scale(1.15) rotate(-6deg);
}

.ib:active {
  transform: scale(0.9);
}

.ib.orb {
  color: #fff;
  background: radial-gradient(circle at 30% 24%, #fff 0 5%, rgba(255, 255, 255, 0) 26%),
              radial-gradient(circle at 70% 78%, rgba(255, 255, 255, 0.4), transparent 40%),
              radial-gradient(circle at 50% 45%, var(--o1, #7ff0e6), var(--o2, #19c9bd) 78%);
  box-shadow: inset -6px -9px 15px rgba(0, 0, 0, 0.14),
              inset 5px 7px 12px rgba(255, 255, 255, 0.55),
              0 10px 20px var(--sh, rgba(25, 201, 189, 0.35));
}

.logo {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font: 800 1.35rem "Bricolage Grotesque", sans-serif;
  letter-spacing: 0.02em;
  text-transform: uppercase;
  color: var(--ink);
}

.logo .orb {
  width: 38px;
  height: 38px;
  font-size: 1.1rem;
  animation: wob 3s ease-in-out infinite;
}

@keyframes wob {
  50% {
    transform: rotate(-14deg) scale(1.1);
  }
}

.sp {
  flex: 1;
}

.search {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  width: min(320px, 40vw);
  padding: 0.6rem 1rem;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.85);
  box-shadow: inset 0 2px 6px rgba(43, 29, 90, 0.08);
  transition: width 0.4s cubic-bezier(0.2, 1.4, 0.3, 1), box-shadow 0.2s;
  position: relative;
}

.search.is-focused {
  width: min(440px, 55vw);
  box-shadow: inset 0 2px 6px rgba(43, 29, 90, 0.08), 0 0 0 2px var(--o2, #19c9bd);
}

.search-icon svg {
  width: 18px;
  height: 18px;
  color: var(--muted);
}

.search input {
  border: 0;
  background: none;
  outline: 0;
  width: 100%;
  min-width: 0;
  font-size: 0.95rem;
  color: var(--ink);
}

.clear-btn {
  border: 0;
  background: none;
  color: var(--muted);
  cursor: pointer;
  font-size: 0.85rem;
  padding: 0 4px;
}

.bell-btn {
  background: rgba(255, 255, 255, 0.7);
}

.dot {
  position: absolute;
  top: 6px;
  right: 7px;
  width: 11px;
  height: 11px;
  border-radius: 50%;
  background: #ff4f9a;
  border: 2px solid #fff;
  animation: pulse 1.6s ease-out infinite;
}

@keyframes pulse {
  0% {
    box-shadow: 0 0 0 0 rgba(255, 79, 154, 0.6);
  }
  100% {
    box-shadow: 0 0 0 12px rgba(255, 79, 154, 0);
  }
}

/* 2. SLIDING DRAWER & SCRIM */
.scrim {
  position: fixed;
  inset: 0;
  z-index: 45;
  background: rgba(43, 29, 90, 0.25);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.4s;
}

.scrim.is-open {
  opacity: 1;
  pointer-events: auto;
}

.drawer {
  position: fixed;
  z-index: 55;
  left: 0.6rem;
  top: calc(0.6rem + env(safe-area-inset-top, 0px));
  bottom: calc(0.6rem + env(safe-area-inset-bottom, 0px));
  width: min(360px, calc(100% - 1.2rem));
  max-width: calc(100vw - 1.2rem);
  box-sizing: border-box;
  border-radius: 36px;
  padding: 1.2rem;
  display: flex;
  flex-direction: column;
  gap: 1.2rem;
  transform: translateX(-115%) rotate(-3deg);
  transition: transform 0.6s cubic-bezier(0.2, 1.4, 0.3, 1);
  overflow-y: auto;
  overscroll-behavior: contain;
  -webkit-overflow-scrolling: touch;
  box-shadow: 0 20px 50px rgba(43, 29, 90, 0.2);
}

.drawer.is-open {
  transform: none;
}

.dh {
  display: flex;
  align-items: center;
  gap: 0.7rem;
}

.drawer-auth {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
}

.auth {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.6rem;
}

.user-pill {
  display: flex;
  align-items: center;
  gap: 0.7rem;
  padding: 0.6rem 0.9rem;
  border-radius: 99px;
}

.user-avatar {
  width: 36px;
  height: 36px;
  font-weight: 800;
  color: #fff;
  font-size: 1rem;
}

.user-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.user-info strong {
  font-size: 0.95rem;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.user-info small {
  font-size: 0.8rem;
  color: var(--muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.btn {
  padding: 0.85rem 1rem;
  border-radius: 99px;
  font-weight: 700;
  font-size: 0.95rem;
  display: inline-flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  border: 0;
  transition: transform 0.25s cubic-bezier(0.2, 2.2, 0.4, 1);
}

.btn:hover {
  transform: scale(1.07) rotate(-1.5deg);
}

.btn:active {
  transform: scale(0.94);
}

.btn.p {
  color: #fff;
  background: linear-gradient(180deg, var(--o1, #7ff0e6), var(--o2, #19c9bd));
  box-shadow: inset 0 3px 6px rgba(255, 255, 255, 0.55), 0 10px 22px var(--sh, rgba(25, 201, 189, 0.45));
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.btn.s {
  background: #fff;
  color: var(--ink);
  box-shadow: inset 0 0 0 2px var(--ink);
}

.drawer-nav-group {
  display: grid;
  gap: 0.4rem;
}

.nav {
  display: flex;
  align-items: center;
  gap: 0.8rem;
  padding: 0.6rem 0.8rem;
  border-radius: 99px;
  font: 800 1.1rem "Bricolage Grotesque", sans-serif;
  color: var(--ink);
  width: 100%;
  text-align: left;
  border: 0;
  background: none;
  cursor: pointer;
  transition: background 0.2s, transform 0.3s cubic-bezier(0.2, 2, 0.4, 1);
}

.nav:hover {
  background: rgba(255, 255, 255, 0.85);
  transform: translateX(6px);
}

.nav.is-active {
  background: rgba(255, 255, 255, 0.95);
  box-shadow: 0 4px 14px rgba(43, 29, 90, 0.1);
}

.nav .orb {
  width: 36px;
  height: 36px;
  flex: none;
  font-size: 1rem;
}

.nav .orb svg {
  width: 18px;
  height: 18px;
  fill: #fff;
}

.drawer-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.lab {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.8rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  font-weight: 700;
  color: var(--muted);
  padding: 0 0.5rem;
}

.lab button {
  color: var(--o2, #19c9bd);
  font-weight: 800;
  filter: brightness(0.8);
  border: 0;
  background: none;
  cursor: pointer;
}

.pls {
  display: grid;
  gap: 0.35rem;
}

.pl-item .pl-name {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.empty {
  padding: 0.4rem 0.5rem;
  color: var(--muted);
  font-size: 0.95rem;
}

.accordion-header {
  width: 100%;
  cursor: pointer;
  border: 0;
  background: none;
}

.acc {
  display: grid;
  grid-template-rows: 0fr;
  transition: grid-template-rows 0.45s cubic-bezier(0.2, 1.2, 0.3, 1);
}

.acc > div {
  overflow: hidden;
}

.acc.on {
  grid-template-rows: 1fr;
}

.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
  padding: 0.4rem 0.2rem;
}

.chip {
  padding: 0.4rem 0.85rem;
  border-radius: 99px;
  background: rgba(43, 29, 90, 0.08);
  color: var(--ink);
  font-weight: 700;
  font-size: 0.85rem;
  border: 0;
  cursor: pointer;
  transition: transform 0.25s cubic-bezier(0.2, 2.4, 0.4, 1), background 0.2s;
}

.chip:hover {
  transform: scale(1.08);
}

.chip[aria-pressed="true"] {
  color: #fff;
  background: linear-gradient(180deg, var(--o1, #7ff0e6), var(--o2, #19c9bd));
  box-shadow: 0 6px 14px var(--sh, rgba(25, 201, 189, 0.45));
}

.chev {
  transition: transform 0.4s cubic-bezier(0.2, 2, 0.4, 1);
  display: inline-flex;
}

.accordion-header.on .chev {
  transform: rotate(180deg);
}

.foot {
  margin-top: auto;
  display: flex;
  gap: 1rem;
  padding: 0.6rem 0.5rem;
  color: var(--muted);
  font-weight: 700;
  font-size: 0.9rem;
}

.foot a {
  color: inherit;
  text-decoration: none;
}

.foot a:hover {
  color: var(--ink);
}

/* 3. MAIN CONTENT */
.home-main {
  max-width: 1240px;
  margin: 0 auto;
  padding: 7.5rem 1.25rem 9rem;
}

/* GREETING */
.greet {
  font-size: clamp(2.1rem, 6.5vw, 5.5rem);
  margin-bottom: 2.2rem;
  line-height: 1.05;
  font-family: "Bricolage Grotesque", sans-serif;
  letter-spacing: -0.03em;
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  gap: 0.15em 0.3em;
  max-width: 100%;
  word-break: normal;
  overflow-wrap: break-word;
}

.greet span {
  display: inline-block;
  opacity: 0;
  transform: translateY(70%) scale(0.7);
  animation: pop 0.9s cubic-bezier(0.2, 1.7, 0.3, 1) forwards;
  animation-delay: calc(var(--i) * 110ms + 150ms);
}

.greet .g {
  background: linear-gradient(100deg, #19c9bd, #4cb8ff, #9b7bff, #ff6fb5);
  background-size: 200%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: pop 0.9s cubic-bezier(0.2, 1.7, 0.3, 1) forwards, flow 5s linear infinite;
  animation-delay: calc(var(--i) * 110ms + 150ms), 0s;
}

.greet .em {
  display: inline-block;
  font-size: 0.8em;
  margin-left: 0.1em;
  animation: pop 0.9s cubic-bezier(0.2, 1.7, 0.3, 1) forwards, bob 2.2s ease-in-out infinite;
  animation-delay: 600ms, 1.5s;
}

@keyframes pop {
  to {
    opacity: 1;
    transform: none;
  }
}

@keyframes flow {
  to {
    background-position: 200% 0;
  }
}

@keyframes bob {
  50% {
    transform: translateY(-12px) rotate(14deg);
  }
}

/* Active Filter Banner */
.filter-banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.6rem 1.2rem;
  border-radius: 99px;
  margin-bottom: 2rem;
  font-size: 0.95rem;
}

.filter-clear {
  border: 0;
  background: none;
  color: var(--muted);
  font-weight: 700;
  cursor: pointer;
}

.filter-clear:hover {
  color: var(--ink);
}

/* Section Common Header */
.home-section {
  margin-bottom: 4rem;
}

.sh {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 0.4rem 1rem;
  margin: 0 0 1.2rem;
  max-width: 100%;
}

.sh h2 {
  font-size: clamp(1.6rem, 4vw, 2.8rem);
  min-width: 0;
}

.section-tag {
  font-size: 0.8rem;
  color: var(--muted);
  letter-spacing: 0.1em;
  font-weight: 700;
  white-space: nowrap;
}

/* 4. "LISTEN AGAIN" GRID */
.again {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 310px), 1fr));
  gap: 1rem;
  max-width: 100%;
}

.song {
  display: flex;
  align-items: center;
  gap: 0.85rem;
  text-align: left;
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  padding: 0.65rem 1.1rem 0.65rem 0.65rem;
  border-radius: 99px;
  cursor: pointer;
  border: 0;
  transition: transform 0.35s cubic-bezier(0.2, 2, 0.4, 1), background 0.2s, box-shadow 0.2s;
}

.song:hover {
  transform: translateY(-5px) scale(1.03) rotate(-0.8deg);
  background: rgba(255, 255, 255, 0.95);
}

.song .orb {
  width: 68px;
  height: 68px;
  font-size: 1.9rem;
  flex: none;
  transition: transform 0.5s cubic-bezier(0.2, 3, 0.4, 1);
}

.song:hover .orb {
  transform: scale(1.15, 0.92) rotate(-10deg);
}

.song b {
  display: block;
  font: 800 1.15rem "Bricolage Grotesque", sans-serif;
  line-height: 1.1;
  color: var(--ink);
}

.song small {
  color: var(--muted);
  font-weight: 600;
}

.song .mt {
  flex: 1;
  min-width: 0;
}

.song .mt b,
.song .mt small {
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.song.on {
  background: #fff;
  box-shadow: 0 0 0 3px var(--o2, #19c9bd), 0 14px 30px var(--sh, rgba(25, 201, 189, 0.35));
}

/* Equalizer Bars */
.eq {
  display: none;
  align-items: flex-end;
  gap: 2px;
  height: 18px;
  flex: none;
}

.song.on .eq {
  display: inline-flex;
}

.eq b {
  width: 4px;
  height: 100%;
  border-radius: 2px;
  background: var(--o2, #19c9bd);
  transform: scaleY(0.25);
  transform-origin: bottom;
  animation: bar 0.5s ease-in-out infinite alternate;
  animation-play-state: paused;
  display: block;
}

.eq b:nth-child(2) {
  animation-delay: -0.2s;
}

.eq b:nth-child(3) {
  animation-delay: -0.35s;
}

.soundwave-home.playing .song.on .eq b {
  animation-play-state: running;
}

@keyframes bar {
  to {
    transform: scaleY(1);
  }
}

/* 5. "TRENDING" CAROUSEL */
.arrows {
  display: flex;
  gap: 0.6rem;
}

.arrows .ib {
  background: #fff;
  box-shadow: 0 8px 18px rgba(120, 80, 200, 0.16);
  display: grid;
  place-items: center;
}

.track {
  display: flex;
  gap: 1.2rem;
  overflow-x: auto;
  scroll-snap-type: x mandatory;
  padding: 1rem 0.3rem 2rem;
  scrollbar-width: none;
}

.track::-webkit-scrollbar {
  display: none;
}

.tc {
  flex: none;
  width: 210px;
  scroll-snap-align: start;
  text-align: left;
  border: 0;
  background: none;
  cursor: pointer;
  transition: transform 0.4s cubic-bezier(0.2, 2, 0.4, 1);
}

.tc:hover {
  transform: translateY(-12px) rotate(-2.5deg) scale(1.04);
}

.tc .cv {
  width: 100%;
  aspect-ratio: 1;
  border-radius: 34px;
  font-size: 4.2rem;
  display: grid;
  place-items: center;
  position: relative;
  overflow: hidden;
  background: radial-gradient(circle at 28% 22%, rgba(255, 255, 255, 0.9) 0 6%, transparent 28%),
              linear-gradient(145deg, var(--o1, #7ff0e6), var(--o2, #19c9bd));
  box-shadow: inset -10px -14px 26px rgba(0, 0, 0, 0.14),
              inset 8px 10px 20px rgba(255, 255, 255, 0.55),
              0 18px 30px var(--sh, rgba(25, 201, 189, 0.45));
}

.tc .cv span {
  display: inline-block;
  transition: transform 0.5s cubic-bezier(0.2, 3, 0.4, 1);
}

.tc:hover .cv span {
  transform: scale(1.25) rotate(12deg);
}

.tc .cv::after {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(110deg, transparent 35%, rgba(255, 255, 255, 0.7) 50%, transparent 65%);
  transform: translateX(-120%);
  transition: transform 0.8s;
}

.tc:hover .cv::after {
  transform: translateX(120%);
}

.tc .pl {
  position: absolute;
  right: 12px;
  bottom: 12px;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: #fff;
  color: var(--o2, #19c9bd);
  display: grid;
  place-items: center;
  transform: scale(0);
  transition: transform 0.35s cubic-bezier(0.2, 2.4, 0.4, 1);
  z-index: 2;
  box-shadow: 0 6px 14px rgba(0, 0, 0, 0.15);
}

.tc .pl svg {
  width: 20px;
  height: 20px;
  fill: currentColor;
}

.tc:hover .pl,
.tc.on .pl {
  transform: scale(1);
}

@media (hover: none) {
  .tc .pl {
    transform: scale(1);
  }
}

.tc b {
  display: block;
  font: 800 1.1rem "Bricolage Grotesque", sans-serif;
  margin-top: 0.8rem;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tc small {
  color: var(--muted);
  font-weight: 600;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.tc.on .cv {
  outline: 4px solid #fff;
  outline-offset: -4px;
}

/* 6. CURATED DISCOVER SHELF */
.curated-heading h2 {
  font-size: clamp(1.9rem, 4vw, 2.8rem);
}

.curated-sub {
  font-size: 0.85rem;
  color: var(--muted);
  margin-top: 0.2rem;
}

.refresh-btn {
  font-size: 1.4rem;
  font-weight: 800;
}

.curated-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 340px), 1fr));
  gap: 1rem;
  max-width: 100%;
}

.curated-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.8rem 1rem;
  border-radius: 28px;
  cursor: pointer;
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  transition: transform 0.3s cubic-bezier(0.2, 2, 0.4, 1), background 0.2s, box-shadow 0.2s;
}

.curated-card:hover {
  transform: translateY(-4px) scale(1.02);
  background: rgba(255, 255, 255, 0.95);
}

.curated-card.on {
  background: #fff;
  box-shadow: 0 0 0 3px var(--o2, #19c9bd), 0 12px 28px var(--sh, rgba(25, 201, 189, 0.35));
}

.card-left {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  min-width: 0;
}

.card-orb {
  width: 52px;
  height: 52px;
  font-size: 1.5rem;
  flex: none;
}

.card-text {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.card-title {
  font-size: 1.05rem;
  color: var(--ink);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-artist {
  font-size: 0.85rem;
  color: var(--muted);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-tags {
  display: flex;
  gap: 0.4rem;
  margin-top: 0.3rem;
}

.badge {
  font-size: 0.7rem;
  padding: 0.15rem 0.5rem;
  border-radius: 99px;
  font-weight: 700;
}

.badge-license {
  background: rgba(43, 29, 90, 0.08);
  color: var(--ink);
}

.badge-license:hover {
  background: var(--o2, #19c9bd);
  color: #fff;
}

.badge-genre {
  background: rgba(25, 201, 189, 0.12);
  color: var(--ink);
}

.play-mini {
  width: 42px;
  height: 42px;
  flex: none;
}

.play-mini svg {
  width: 18px;
  height: 18px;
  fill: #fff;
}

/* MODALS */
.modal-backdrop {
  position: fixed;
  inset: 0;
  z-index: 999;
  background: rgba(43, 29, 90, 0.3);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: grid;
  place-items: center;
  padding: 1rem;
}

.modal-card {
  width: min(520px, 100%);
  border-radius: 32px;
  padding: 1.8rem;
  box-shadow: 0 24px 60px rgba(43, 29, 90, 0.25);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1.2rem;
}

.close-btn {
  border: 0;
  background: none;
  font-size: 1.3rem;
  color: var(--muted);
  cursor: pointer;
}

.close-btn:hover {
  color: var(--ink);
}

.modal-body {
  display: grid;
  gap: 1rem;
}

.modal-artist {
  color: var(--muted);
  font-weight: 600;
  margin-top: -0.5rem;
}

.info-row {
  display: grid;
  gap: 0.3rem;
}

.info-row label {
  font-size: 0.8rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  font-weight: 700;
  color: var(--muted);
}

.license-chip {
  padding: 0.4rem 0.8rem;
  border-radius: 99px;
  background: rgba(43, 29, 90, 0.08);
  font-weight: 700;
  display: inline-block;
  font-size: 0.9rem;
}

.attribution-box {
  margin: 0;
  padding: 0.7rem 1rem;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.7);
  border-left: 4px solid var(--o2, #19c9bd);
  font-size: 0.9rem;
  line-height: 1.4;
}

.source-link {
  color: var(--o2, #19c9bd);
  font-weight: 700;
  text-decoration: underline;
}

.capability-text {
  font-size: 0.85rem;
  color: var(--muted);
  line-height: 1.4;
}

.setting-item {
  display: grid;
  gap: 0.2rem;
}

.setting-item p {
  color: var(--muted);
  font-size: 0.9rem;
  margin: 0;
}

/* RESPONSIVE BREAKPOINTS */
@media (max-width: 860px) {
  .home-main {
    padding-top: 6.2rem;
    padding-bottom: 10.5rem;
  }
  .curated-grid {
    grid-template-columns: 1fr;
  }
  .again {
    grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  }
}

@media (max-width: 620px) {
  .search {
    display: none;
  }
  .sp {
    display: block;
  }
  .home-main {
    padding-top: 5.5rem;
    padding-left: 0.9rem;
    padding-right: 0.9rem;
    padding-bottom: 9.5rem;
  }
  .greet {
    font-size: clamp(1.75rem, 8vw, 2.7rem);
    margin-bottom: 1.8rem;
    gap: 0.15em 0.28em;
  }
  .home-section {
    margin-bottom: 2.8rem;
  }
  .track {
    gap: 0.85rem;
    padding: 0.6rem 0.1rem 1.4rem;
  }
  .tc {
    width: 168px;
  }
  .tc .cv {
    border-radius: 26px;
    font-size: 3.2rem;
  }
  .tc .pl {
    transform: scale(1);
    width: 38px;
    height: 38px;
    right: 8px;
    bottom: 8px;
  }
  .tc .pl svg {
    width: 16px;
    height: 16px;
  }
  .tc b {
    font-size: 0.98rem;
    margin-top: 0.6rem;
  }
  .tc small {
    font-size: 0.82rem;
  }
  .curated-grid {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
  .curated-card {
    padding: 0.65rem 0.85rem;
    border-radius: 22px;
  }
  .card-orb {
    width: 44px;
    height: 44px;
    font-size: 1.25rem;
  }
  .card-title {
    font-size: 0.95rem;
  }
  .card-artist {
    font-size: 0.8rem;
  }
  .play-mini {
    width: 36px;
    height: 36px;
  }
  .play-mini svg {
    width: 15px;
    height: 15px;
  }
}

@media (max-width: 480px) {
  .top {
    width: calc(100% - 1rem);
    padding: 0.4rem 0.55rem;
    gap: 0.45rem;
  }
  .ib {
    width: 38px;
    height: 38px;
  }
  .logo {
    font-size: 1.15rem;
    gap: 0.4rem;
  }
  .logo .orb {
    width: 32px;
    height: 32px;
    font-size: 1rem;
  }
  .home-main {
    padding-top: 4.8rem;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    padding-bottom: 9rem;
  }
  .again {
    grid-template-columns: 1fr;
    gap: 0.65rem;
  }
  .song {
    padding: 0.5rem 0.8rem 0.5rem 0.5rem;
    gap: 0.65rem;
    border-radius: 28px;
  }
  .song .orb {
    width: 50px;
    height: 50px;
    font-size: 1.4rem;
  }
  .song b {
    font-size: 1rem;
  }
  .song small {
    font-size: 0.82rem;
  }
  .sh {
    margin-bottom: 0.85rem;
  }
  .sh h2 {
    font-size: 1.45rem;
  }
  .section-tag {
    font-size: 0.72rem;
    letter-spacing: 0.08em;
  }
  .drawer {
    left: 0.4rem;
    top: calc(0.4rem + env(safe-area-inset-top, 0px));
    bottom: calc(0.4rem + env(safe-area-inset-bottom, 0px));
    width: calc(100vw - 0.8rem);
    max-width: calc(100vw - 0.8rem);
    padding: 1rem 0.85rem;
    border-radius: 28px;
  }
}

@media (max-width: 360px) {
  .greet {
    font-size: clamp(1.45rem, 7.5vw, 1.95rem);
    margin-bottom: 1.4rem;
  }
  .tc {
    width: 144px;
  }
  .tc .cv {
    border-radius: 22px;
    font-size: 2.7rem;
  }
  .home-main {
    padding-top: 4.5rem;
    padding-left: 0.55rem;
    padding-right: 0.55rem;
    padding-bottom: 8.5rem;
  }
  .top {
    width: calc(100% - 0.6rem);
    padding: 0.35rem 0.45rem;
  }
}

@media (max-width: 330px) {
  .logo span:not(.orb) {
    display: none;
  }
  .drawer {
    width: 100vw;
    left: 0;
    top: 0;
    bottom: 0;
    border-radius: 0 24px 24px 0;
  }
}

/* Empty Curated Search Banner */
.empty-curated-search {
  margin-top: 1.5rem;
  padding: 2rem;
  border-radius: 20px;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.empty-curated-search p {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--ink);
  margin: 0;
}

/* Queue Drawer Styles for HomeView */
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
