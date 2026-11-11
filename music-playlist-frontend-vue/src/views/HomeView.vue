<template>
  <!-- SCROLLABLE PAGE BODY -->
  <main class="jb-content-stage">
        <!-- FILTER NOTICE BANNER -->
        <div v-if="activeFilterBadge" class="jb-filter-banner font-mono">
          <span>ACTIVE FILTER: <strong>{{ activeFilterBadge }}</strong></span>
          <button class="jb-filter-clear-btn" @click="clearAllFilters">✕ RESET</button>
        </div>

        <!-- 1A. DEDICATED LIKED SONGS PLAYLIST-STYLE HEADER -->
        <section v-if="activeFilter === 'favorites'" class="jb-liked-hero-card">
          <div class="jb-liked-cover" aria-hidden="true">
            <span class="jb-liked-heart">♥</span>
          </div>

          <div class="jb-liked-meta">
            <div class="jb-liked-badges font-mono">
              <span class="jb-liked-pill-dark">YOUR LIBRARY</span>
              <span class="jb-liked-pill-pink">LIKED COLLECTION</span>
            </div>

            <h1 class="jb-liked-title font-display">LIKED SONGS</h1>

            <p class="jb-liked-copy">
              The tracks you’ve saved for your next listen.
            </p>

            <div class="jb-liked-stats font-mono">
              <span><strong>{{ uiStore.favoriteCount }}</strong> {{ uiStore.favoriteCount === 1 ? 'song' : 'songs' }}</span>
              <span class="dot-sep">•</span>
              <span>{{ likedTotalDurationText }}</span>
            </div>

            <div class="jb-liked-actions font-mono">
              <button
                v-if="displayedTracks.length > 0"
                type="button"
                class="jb-liked-play-btn font-display"
                @click="handlePlayAllLiked"
              >
                <span>{{ isLikedQueuePlaying ? '❚❚ PAUSE' : '▶ PLAY ALL' }}</span>
              </button>
              <router-link
                v-else
                to="/"
                class="jb-liked-browse-btn font-mono"
                @click="clearAllFilters"
              >
                BROWSE ALL TRACKS →
              </router-link>
            </div>
          </div>
        </section>

        <!-- 1B. JELLYKIT-INSPIRED CATEGORY HERO (Home / Genre / Mood / Search) -->
        <section v-else class="jb-hero-card" :style="{ backgroundColor: currentCategoryHeroColor }">
          <div class="jb-hero-meta">
            <div class="jb-hero-badge-row font-mono">
              <span class="jb-num-badge">{{ activeMood ? 'MOOD' : selectedGenreFilter ? 'COLLECTION' : '01' }}</span>
              <span class="jb-cat-label">{{ activeMood ? `MOOD: ${activeMood.name.toUpperCase()}` : selectedGenreFilter ? selectedGenreFilter.toUpperCase() : 'VERIFIED AUDIO ARCHIVE' }}</span>
            </div>

            <h1 class="jb-hero-title font-display">
              {{ activeMood ? activeMood.name : selectedGenreFilter ? selectedGenreFilter.toUpperCase() : 'SOUNDWAVE' }}
            </h1>

            <p class="jb-hero-tagline">
              {{ activeMood ? (activeMood.description || 'Curated mood audio stream.') : selectedGenreFilter ? `Explore curated ${selectedGenreFilter} audio streams.` : 'Open music discovery powered by Jamendo. Fully authorized Creative Commons streaming.' }}
            </p>

            <div class="jb-hero-foot-row font-mono">
              <span class="jb-dark-pill">{{ displayedTracks.length }} TRACKS</span>
              <span class="jb-live-tag">● ZERO-PIRACY CC STREAMING</span>
            </div>
          </div>

          <div class="jb-hero-watermark" aria-hidden="true">
            {{ heroWatermarkGlyph }}
          </div>
        </section>

        <!-- 2. ALL TRACKS CATALOG GRID WITH FILTERS & SORT CHIPS -->
        <section class="jb-section">
          <div class="jb-section-head">
            <div class="jb-head-left">
              <h2 class="jb-section-title font-display">{{ activeMood ? activeMood.name.toUpperCase() : selectedGenreFilter ? selectedGenreFilter.toUpperCase() : activeFilter === 'favorites' ? 'LIKED TRACKS' : 'ALL TRACKS' }}</h2>
              <span class="jb-head-count font-mono">({{ displayedTracks.length }})</span>
            </div>
            <div class="jb-section-line"></div>
          </div>

          <!-- Sort & Filter Chips Row -->
          <div class="jb-chips-bar font-mono">
            <div class="jb-chips-group">
              <span class="jb-chips-label">SORT:</span>
              <button
                class="jb-filter-chip"
                :class="{ 'active': sortBy === 'default' }"
                @click="sortBy = 'default'"
              >
                CURATED
              </button>
              <button
                class="jb-filter-chip"
                :class="{ 'active': sortBy === 'title' }"
                @click="sortBy = 'title'"
              >
                A–Z
              </button>
              <button
                class="jb-filter-chip"
                :class="{ 'active': sortBy === 'duration' }"
                @click="sortBy = 'duration'"
              >
                SHORTEST
              </button>
            </div>

            <div class="jb-chips-group">
              <span class="jb-chips-label">GENRES:</span>
              <button
                class="jb-filter-chip"
                :class="{ 'active': selectedGenreFilter === '' }"
                @click="handleSelectGenre('')"
              >
                ALL ({{ allCuratedTracks.length }})
              </button>
              <button
                v-for="g in availableGenres.slice(0, 4)"
                :key="g.name"
                class="jb-filter-chip"
                :class="{ 'active': selectedGenreFilter === g.name }"
                @click="handleSelectGenre(g.name)"
              >
                {{ g.name.toUpperCase() }} ({{ g.count }})
              </button>
            </div>
          </div>

          <!-- EMPTY STATE -->
          <div v-if="displayedTracks.length === 0" class="jb-empty-box font-mono">
            <div class="jb-empty-glyph font-display">{{ activeFilter === 'favorites' ? '♡' : 'Ø' }}</div>
            <h3 class="jb-empty-title font-display">{{ activeFilter === 'favorites' ? 'No liked songs yet' : 'No tracks found' }}</h3>
            <p class="jb-empty-desc">
              {{
                activeFilter === 'favorites'
                  ? 'Tap ♥ on any track in the catalog, search results, or a playlist to save it here.'
                  : 'No tracks match your current filter or search criteria.'
              }}
            </p>
            <button class="jb-empty-btn font-mono" @click="clearAllFilters">
              {{ activeFilter === 'favorites' ? 'BROWSE ALL TRACKS' : 'RESET ALL FILTERS' }}
            </button>
          </div>

          <!-- 4-COLUMN NEO-BRUTALIST CARDS GRID -->
          <div v-else class="jb-cards-grid">
            <article
              v-for="(track, idx) in displayedTracks"
              :key="track._id || track.id"
              class="jb-track-card"
              :class="{ 'is-active': isCurrentTrack(track) }"
            >
              <div class="jb-tc-top">
                <div class="jb-tc-art-wrap" @click="handlePlayTrack(track, displayedTracks, idx, $event)">
                  <img
                    v-if="track.coverImage || track.artwork"
                    :src="track.coverImage || track.artwork"
                    :alt="track.title"
                    class="jb-tc-img"
                    loading="lazy"
                  />
                  <div v-else class="jb-tc-fallback font-display">
                    {{ track.title.substring(0, 2).toUpperCase() }}
                  </div>
                  <div class="jb-tc-hover-play">
                    {{ isCurrentTrack(track) && playerStore.isPlaying ? '❚❚' : '▶' }}
                  </div>
                </div>

                <div class="jb-tc-badge-column font-mono">
                  <span class="jb-tc-badge" :style="{ backgroundColor: getGenreColor(track.genre) }">
                    {{ (track.genre || 'AUDIO').split('/')[0].trim().toUpperCase() }}
                  </span>
                  <span class="jb-tc-time">{{ formatDuration(track.duration) }}</span>
                </div>
              </div>

              <div class="jb-tc-body">
                <h4 class="jb-tc-title font-display" :title="track.title">{{ track.title }}</h4>
                <p class="jb-tc-artist" :title="track.artist">{{ track.artist }}</p>
              </div>

              <div class="jb-tc-footer font-mono">
                <button
                  class="jb-tc-action-btn"
                  @click="handlePlayTrack(track, displayedTracks, idx, $event)"
                >
                  {{ isCurrentTrack(track) && playerStore.isPlaying ? 'PAUSE' : 'PLAY ▶' }}
                </button>

                <div class="jb-tc-meta-cluster">
                  <button
                    class="jb-tc-fav-btn"
                    :class="{ 'active': uiStore.isFavoriteTrack(track) }"
                    :aria-pressed="uiStore.isFavoriteTrack(track) ? 'true' : 'false'"
                    :aria-label="uiStore.isFavoriteTrack(track) ? `Unlike ${track.title}` : `Like ${track.title}`"
                    @click.stop="toggleFavorite(track, $event)"
                    title="Favorite track"
                  >
                    ♥
                  </button>

                  <AddToPlaylistMenu :track="track">
                    <template #trigger>
                      <button class="jb-tc-fav-btn" title="Add to playlist">
                        ＋
                      </button>
                    </template>
                  </AddToPlaylistMenu>

                  <a
                    v-if="isJamendoTrack(track) && getTrackSourceUrl(track)"
                    :href="getTrackSourceUrl(track)"
                    target="_blank"
                    rel="noopener noreferrer"
                    class="jb-tc-jamendo-link"
                    title="Open on Jamendo"
                    @click.stop
                  >
                    ↗
                  </a>
                </div>
              </div>
            </article>
          </div>
        </section>

        <!-- 3. FEATURED AUDIO RELEASES (3-UP) -->
        <section v-if="featuredSpotlightTracks.length && !selectedGenreFilter && !activeMood && !activeFilter" class="jb-section">
          <div class="jb-section-head">
            <h2 class="jb-section-title font-display">FEATURED SPOTLIGHT</h2>
            <div class="jb-section-line"></div>
          </div>

          <div class="jb-featured-grid">
            <article
              v-for="(track, idx) in featuredSpotlightTracks"
              :key="track._id || track.id"
              class="jb-featured-card"
              :class="{ 'is-active': isCurrentTrack(track) }"
            >
              <div class="jb-card-eyebrow font-mono">
                <span>{{ (track.genre || 'ELECTRONIC').toUpperCase() }}</span>
                <span class="accent-mono">SPOTLIGHT {{ idx + 1 }}</span>
              </div>

              <!-- Striped Art Box -->
              <div class="jb-card-art-box" @click="handlePlayTrack(track, featuredSpotlightTracks, idx, $event)">
                <img
                  v-if="track.coverImage || track.artwork"
                  :src="track.coverImage || track.artwork"
                  :alt="track.title"
                  class="jb-card-cover"
                />
                <div v-else class="jb-art-fallback font-display">
                  {{ track.title.substring(0, 2).toUpperCase() }}
                </div>
                
                <button
                  class="jb-art-play-btn"
                  :title="isCurrentTrack(track) && playerStore.isPlaying ? 'Pause' : 'Play ' + track.title"
                >
                  {{ isCurrentTrack(track) && playerStore.isPlaying ? '❚❚' : '▶' }}
                </button>
              </div>

              <div class="jb-card-body">
                <h3 class="jb-card-title font-display" :title="track.title">{{ track.title }}</h3>
                <p class="jb-card-artist">{{ track.artist }}</p>

                <div class="jb-card-meta-row font-mono">
                  <span class="jb-mono-chip" @click="openLicenseModal(track)">{{ track.license?.badge || 'CC BY' }}</span>
                  <button
                    class="jb-open-action font-mono"
                    @click="handlePlayTrack(track, featuredSpotlightTracks, idx, $event)"
                  >
                    {{ isCurrentTrack(track) && playerStore.isPlaying ? 'PAUSE ❚❚' : 'PLAY →' }}
                  </button>
                </div>
              </div>
            </article>
          </div>
        </section>

        <!-- 4. MOST PLAYED / POPULAR COMPACT TRACKS -->
        <section v-if="popularTracks.length && !selectedGenreFilter && !activeMood && !activeFilter" class="jb-section">
          <div class="jb-section-head">
            <h2 class="jb-section-title font-display">POPULAR ROTATION</h2>
            <div class="jb-section-line"></div>
          </div>

          <div class="jb-popular-grid">
            <div
              v-for="(track, idx) in popularTracks"
              :key="track._id || track.id"
              class="jb-popular-row"
              :class="{ 'is-active': isCurrentTrack(track) }"
              @click="handlePlayTrack(track, popularTracks, idx, $event)"
            >
              <div class="jb-pop-tile" :style="{ backgroundColor: getGenreColor(track.genre) }">
                <span v-if="isCurrentTrack(track) && playerStore.isPlaying">❚❚</span>
                <span v-else>▶</span>
              </div>
              <div class="jb-pop-info">
                <span class="jb-pop-title font-display">{{ track.title }}</span>
                <span class="jb-pop-artist font-mono">{{ track.artist }} · {{ formatDuration(track.duration) }}</span>
              </div>
              <span class="jb-pop-badge font-mono">{{ (track.genre || 'JAMENDO').toUpperCase() }}</span>
            </div>
          </div>
        </section>
  </main>
</template>

<script setup>
import { computed, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { usePlayerStore } from '../stores/player';
import { useUiStore } from '../stores/ui';
import { useToastStore } from '../stores/toast';
import { FEATURED_SONGS } from '../data/featuredSongs';
import { MOOD_PLAYLISTS } from '../data/moodPlaylists';
import { getGenreColor, buildAvailableGenres } from '../utils/genres';
import {
  calculateTotalDurationSeconds,
  formatPlaylistDurationReadable,
  getCanonicalFavoriteId,
} from '../utils/favorites';
import AddToPlaylistMenu from '../components/playlists/AddToPlaylistMenu.vue';

const router = useRouter();
const route = useRoute();
const playerStore = usePlayerStore();
const uiStore = useUiStore();
const toastStore = useToastStore();

// Shared UI Filter State (backed by uiStore & URL query)
const searchQuery = computed({
  get: () => uiStore.searchQuery,
  set: (v) => uiStore.setSearchQuery(v),
});
const selectedGenreFilter = computed(() => uiStore.selectedGenre);
const activeFilter = computed(() => uiStore.activeFilter);
const activeMood = computed(() => uiStore.activeMood);
const favoritesList = computed(() => uiStore.favoritesList);
const sortBy = computed({
  get: () => uiStore.sortBy,
  set: (v) => { uiStore.sortBy = v; },
});

// Curated Track Catalog
const allCuratedTracks = computed(() => {
  return FEATURED_SONGS.map((t) => ({
    ...t,
    genreColor: getGenreColor(t.genre),
  }));
});

// Available Genres with count
const availableGenres = computed(() => buildAvailableGenres(allCuratedTracks.value));

// Top 3 Spotlight Tracks
const featuredSpotlightTracks = computed(() => {
  return allCuratedTracks.value.slice(0, 3);
});

// Popular rotation (next 4)
const popularTracks = computed(() => {
  return allCuratedTracks.value.slice(3, 7);
});

// Displayed Tracks with filtering & sorting
const displayedTracks = computed(() => {
  let list;

  if (activeFilter.value === 'favorites') {
    list = uiStore.likedTracks.map((t) => ({
      ...t,
      genreColor: getGenreColor(t.genre),
    }));
  } else if (activeFilter.value === 'mood' && activeMood.value) {
    const mSongs = activeMood.value.songs || [];
    list = mSongs.map((s) => ({
      ...s,
      genreColor: getGenreColor(s.genre),
    }));
  } else {
    list = [...allCuratedTracks.value];
  }

  // Genre filter
  if (selectedGenreFilter.value) {
    list = list.filter((t) => t.genre === selectedGenreFilter.value);
  }

  // Search filter
  if (searchQuery.value.trim()) {
    const q = searchQuery.value.toLowerCase().trim();
    list = list.filter(
      (t) =>
        (t.title && t.title.toLowerCase().includes(q)) ||
        (t.artist && t.artist.toLowerCase().includes(q)) ||
        (t.genre && t.genre.toLowerCase().includes(q))
    );
  }

  // Sort
  if (sortBy.value === 'title') {
    list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
  } else if (sortBy.value === 'duration') {
    list.sort((a, b) => (Number(a.duration) || 0) - (Number(b.duration) || 0));
  }

  return list;
});

const likedTotalDurationText = computed(() => {
  const totalSec = calculateTotalDurationSeconds(uiStore.likedTracks);
  return formatPlaylistDurationReadable(totalSec);
});

const isLikedQueuePlaying = computed(() => {
  return Boolean(
    playerStore.isPlaying &&
    playerStore.currentPlaylist?.id === 'liked-songs' &&
    uiStore.isFavoriteTrack(playerStore.currentTrack)
  );
});

const handlePlayAllLiked = () => {
  const likedQueue = [...displayedTracks.value];
  if (!likedQueue.length) return;

  if (
    playerStore.currentPlaylist?.id === 'liked-songs' &&
    playerStore.currentTrack &&
    uiStore.isFavoriteTrack(playerStore.currentTrack)
  ) {
    playerStore.togglePlay();
    return;
  }

  playerStore.currentPlaylist = {
    _id: 'liked-songs',
    id: 'liked-songs',
    name: 'Liked Songs',
    songs: likedQueue,
  };
  playerStore.playTrack(likedQueue[0], likedQueue, 0);
  toastStore.show(`Playing Liked Songs (${likedQueue.length} tracks)`, 'success');
};

// Hero Color & Watermark
const currentCategoryHeroColor = computed(() => {
  if (activeMood.value) return activeMood.value.tint || '#B9A6FF';
  if (selectedGenreFilter.value) return getGenreColor(selectedGenreFilter.value);
  return '#FFD84A'; // Jellykit Signature Yellow
});

const heroWatermarkGlyph = computed(() => {
  if (activeMood.value) return 'MOOD';
  if (selectedGenreFilter.value) return selectedGenreFilter.value.split('/')[0].trim().toUpperCase();
  return 'SOUNDWAVE';
});

const activeFilterBadge = computed(() => {
  if (activeFilter.value === 'favorites') return 'Liked Tracks';
  if (activeFilter.value === 'mood' && activeMood.value) return `Mood: ${activeMood.value.name}`;
  if (selectedGenreFilter.value) return `Genre: ${selectedGenreFilter.value}`;
  if (searchQuery.value.trim()) return `Search: "${searchQuery.value.trim()}"`;
  return '';
});

// Playback Methods
const isCurrentTrack = (track) => {
  if (!playerStore.currentTrack || !track) return false;
  const cId = getCanonicalFavoriteId(track, uiStore.catalogIndex.aliasMap);
  const pId = getCanonicalFavoriteId(playerStore.currentTrack, uiStore.catalogIndex.aliasMap);
  if (cId && pId && cId === pId) return true;
  return (
    (track._id && playerStore.currentTrack._id === track._id) ||
    (track.id && playerStore.currentTrack.id === track.id) ||
    playerStore.currentTrack.title === track.title
  );
};

const handlePlayTrack = (track, list, index, event) => {
  if (event) event.stopPropagation();
  if (isCurrentTrack(track)) {
    playerStore.togglePlay();
  } else {
    if (activeFilter.value === 'favorites') {
      playerStore.currentPlaylist = {
        _id: 'liked-songs',
        id: 'liked-songs',
        name: 'Liked Songs',
        songs: list,
      };
    } else if (playerStore.currentPlaylist?.id === 'liked-songs') {
      playerStore.currentPlaylist = null;
    }
    playerStore.playTrack(track, list, index);
  }
};

// Filter actions synced with URL query
const handleSelectGenre = (genreName) => {
  uiStore.selectGenre(genreName);
  router.replace({ path: '/', query: genreName ? { genre: genreName } : {} });
};

const clearAllFilters = () => {
  uiStore.clearAllFilters();
  if (Object.keys(route.query).length > 0) {
    router.replace({ path: '/', query: {} });
  }
};

const toggleFavorite = (track, event) => {
  if (event) event.stopPropagation();
  const added = uiStore.toggleFavorite(track);
  toastStore.show(added ? 'Added to Liked Tracks' : 'Removed from Liked Tracks', added ? 'success' : 'info');
};

const openLicenseModal = (track) => {
  uiStore.openLicenseModal(track || playerStore.currentTrack);
};

const isJamendoTrack = (t) => {
  return t?.provider === 'jamendo' || t?.source?.provider === 'jamendo';
};

const getTrackSourceUrl = (t) => {
  const extId = t.providerTrackId || t.source?.externalId;
  if (extId) return `https://www.jamendo.com/track/${extId}`;
  return t.source?.pageUrl || t.source?.url || 'https://www.jamendo.com';
};

const formatDuration = (sec) => {
  if (!sec || isNaN(sec)) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
};

const applyRouteFilters = () => {
  if (route.query.genre) {
    uiStore.selectGenre(String(route.query.genre));
  } else if (route.query.playlist) {
    const pId = String(route.query.playlist);
    if (pId.startsWith('mood-')) {
      const m = MOOD_PLAYLISTS.find((item) => item.id === pId || item._id === pId);
      if (m) {
        uiStore.selectMood(m);
        if (m.songs && m.songs.length) {
          playerStore.queue = m.songs;
        }
      }
    }
  } else if (route.query.filter === 'favorites') {
    uiStore.selectFavorites();
  } else if (route.query.q) {
    uiStore.selectedGenre = '';
    uiStore.activeMoodId = '';
    uiStore.setSearchQuery(String(route.query.q));
  }
};

watch(
  () => route.query,
  () => {
    applyRouteFilters();
  },
  { deep: true }
);

onMounted(() => {
  uiStore.loadFavorites();
  applyRouteFilters();
});
</script>

<style scoped>
/* ==========================================================================
   JELLYKIT NEO-BRUTALIST HOMEPAGE CONTENT STYLES
   ========================================================================== */

/* 3. CONTENT STAGE */
.jb-content-stage {
  padding: 1.75rem 2rem;
  max-width: 1240px;
  margin: 0 auto;
  width: 100%;
  min-width: 0;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 2.5rem;
}

.jb-filter-banner {
  background: var(--yellow, #FFD84A);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
  padding: 0.65rem 1.25rem;
  border-radius: var(--r-md, 12px);
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-size: 0.85rem;
  font-weight: 700;
}

.jb-filter-clear-btn {
  background: var(--ink, #111111);
  color: var(--bg, #F3EFE8);
  border: none;
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
  font-size: 0.75rem;
  cursor: pointer;
}

/* LIKED SONGS PLAYLIST HEADER */
.jb-liked-hero-card {
  display: flex;
  align-items: flex-end;
  gap: 28px;
  padding: 26px;
  background-color: #FFFFFF;
  border: 3px solid #111111;
  box-shadow: 6px 6px 0 #111111;
  flex-wrap: wrap;
}

.jb-liked-cover {
  width: 176px;
  height: 176px;
  flex-shrink: 0;
  border: 3px solid #111111;
  box-shadow: 4px 4px 0 #111111;
  background: linear-gradient(135deg, #FF4F9A 0%, #FF6B5E 55%, #FFD84A 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.jb-liked-heart {
  font-size: 4.5rem;
  color: #FFFFFF;
  text-shadow: 3px 3px 0 #111111;
  line-height: 1;
}

.jb-liked-meta {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.jb-liked-badges {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.jb-liked-pill-dark,
.jb-liked-pill-pink {
  font-size: 0.72rem;
  font-weight: 900;
  padding: 3px 9px;
  border: 2px solid #111111;
  box-shadow: 2px 2px 0 #111111;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.jb-liked-pill-dark {
  background: #111111;
  color: #FFFFFF;
}

.jb-liked-pill-pink {
  background: #FF4F9A;
  color: #FFFFFF;
}

.jb-liked-title {
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 900;
  letter-spacing: -0.03em;
  line-height: 1;
  color: #111111;
  text-transform: uppercase;
  margin: 0;
}

.jb-liked-copy {
  font-size: 0.98rem;
  font-weight: 600;
  color: var(--ink-muted, #4A4740);
  margin: 0;
}

.jb-liked-stats {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  color: #111111;
  flex-wrap: wrap;
}

.jb-liked-stats .dot-sep {
  font-weight: 900;
}

.jb-liked-actions {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 4px;
}

.jb-liked-play-btn,
.jb-liked-browse-btn {
  padding: 10px 22px;
  border: 2px solid #111111;
  box-shadow: 3px 3px 0 #111111;
  font-size: 0.92rem;
  font-weight: 900;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  cursor: pointer;
  text-decoration: none;
  color: #111111;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

.jb-liked-play-btn {
  background-color: #FFD84A;
}

.jb-liked-browse-btn {
  background-color: #5DE3A6;
}

.jb-liked-play-btn:hover,
.jb-liked-browse-btn:hover {
  transform: translate(-1px, -1px);
  box-shadow: 4px 4px 0 #111111;
}

.jb-liked-play-btn:active,
.jb-liked-browse-btn:active {
  transform: translate(1px, 1px);
  box-shadow: 1px 1px 0 #111111;
}

@media (max-width: 640px) {
  .jb-liked-hero-card {
    flex-direction: column;
    align-items: stretch;
    padding: 18px;
    gap: 16px;
  }
  .jb-liked-cover {
    width: 120px;
    height: 120px;
  }
  .jb-liked-heart {
    font-size: 3.25rem;
  }
}

/* JELLYKIT HERO CARD */
.jb-hero-card {
  position: relative;
  border: var(--bw, 2px) solid var(--border, #111111);
  border-radius: var(--r-lg, 18px);
  box-shadow: var(--shadow-lg, 8px 8px 0 var(--border, #111111));
  padding: 3rem 2.5rem;
  overflow: hidden;
  transition: background-color 0.3s ease;
}

.jb-hero-meta {
  position: relative;
  z-index: 2;
  max-width: 800px;
}

.jb-hero-badge-row {
  display: flex;
  align-items: center;
  gap: 0.65rem;
  margin-bottom: 1rem;
}

.jb-num-badge {
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  padding: 0.15rem 0.55rem;
  border-radius: 6px;
  font-weight: 900;
  font-size: 0.78rem;
}

.jb-cat-label {
  font-weight: 800;
  font-size: 0.82rem;
  letter-spacing: 0.08em;
}

.jb-hero-title {
  font-size: clamp(2.8rem, 6vw, 5.2rem);
  font-weight: 900;
  text-transform: uppercase;
  letter-spacing: -0.045em;
  line-height: 0.92;
  color: #111111;
  margin-bottom: 1.25rem;
}

.jb-hero-tagline {
  font-size: 1.25rem;
  font-weight: 500;
  line-height: 1.4;
  color: #111111;
  margin-bottom: 2rem;
}

.jb-hero-foot-row {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-wrap: wrap;
}

.jb-dark-pill {
  background: var(--ink, #111111);
  color: var(--bg, #F3EFE8);
  padding: 0.35rem 0.85rem;
  border-radius: var(--r-pill, 999px);
  font-size: 0.8rem;
  font-weight: 800;
}

.jb-live-tag {
  font-size: 0.82rem;
  font-weight: 800;
  color: #111111;
}

.jb-hero-del-btn {
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--danger, #E5372B);
  color: var(--danger, #E5372B);
  padding: 0.35rem 0.85rem;
  border-radius: var(--r-pill, 999px);
  font-size: 0.78rem;
  font-weight: 800;
  cursor: pointer;
}

.jb-hero-watermark {
  position: absolute;
  right: -2rem;
  bottom: -2.5rem;
  font-size: clamp(6rem, 15vw, 12rem);
  font-weight: 900;
  color: rgba(17, 17, 17, 0.08);
  user-select: none;
  pointer-events: none;
  line-height: 1;
  letter-spacing: -0.06em;
}

/* SECTION HEADINGS WITH RULE */
.jb-section {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  min-width: 0;
  max-width: 100%;
}

.jb-section-head {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  min-width: 0;
}

.jb-head-left {
  display: flex;
  align-items: baseline;
  gap: 0.65rem;
  min-width: 0;
}

.jb-section-title {
  font-size: 1.65rem;
  font-weight: 900;
  letter-spacing: -0.035em;
  text-transform: uppercase;
  color: var(--ink, #111111);
  white-space: nowrap;
}

.jb-head-count {
  font-size: 1rem;
  font-weight: 700;
  color: var(--ink-muted, #4A4740);
}

.jb-section-line {
  flex: 1;
  min-width: 24px;
  height: var(--bw, 2px);
  background-color: var(--border, #111111);
}

/* FEATURED 3-UP CARDS */
.jb-featured-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.15rem;
  min-width: 0;
}

.jb-featured-card {
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  border-radius: var(--r-md, 12px);
  box-shadow: var(--shadow-sm, 4px 4px 0 var(--border, #111111));
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 100%;
  overflow: hidden;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

.jb-featured-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 7px 7px 0 var(--border, #111111);
}

.jb-featured-card.is-active {
  border-color: var(--c-blue, #4D6BFF);
  box-shadow: 6px 6px 0 var(--c-blue, #4D6BFF);
}

.jb-card-eyebrow {
  display: flex;
  justify-content: space-between;
  padding: 0.75rem 1.25rem;
  border-bottom: var(--bw, 2px) solid var(--border, #111111);
  font-size: 0.75rem;
  font-weight: 800;
  background-color: #FAF8F5;
}

.accent-mono {
  color: var(--c-blue, #4D6BFF);
}

.jb-card-art-box {
  height: 200px;
  border-bottom: var(--bw, 2px) solid var(--border, #111111);
  background: repeating-linear-gradient(45deg, rgba(17, 17, 17, 0.03) 0 2px, transparent 2px 10px), #FAF8F5;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  cursor: pointer;
  overflow: hidden;
}

.jb-card-cover {
  width: 140px;
  height: 140px;
  object-fit: cover;
  border: var(--bw, 2px) solid var(--border, #111111);
  border-radius: var(--r-md, 12px);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
}

.jb-art-fallback {
  width: 140px;
  height: 140px;
  background: var(--c-sun, #FFD84A);
  border: var(--bw, 2px) solid var(--border, #111111);
  border-radius: var(--r-md, 12px);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.5rem;
  font-weight: 900;
}

.jb-art-play-btn {
  position: absolute;
  right: 1.25rem;
  bottom: 1.25rem;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--yellow, #FFD84A);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: 2px 2px 0 var(--border, #111111);
  cursor: pointer;
  font-size: 1rem;
  font-weight: 900;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.08s ease;
}

.jb-art-play-btn:active {
  transform: translate(2px, 2px);
  box-shadow: none;
}

.jb-card-body {
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  min-width: 0;
}

.jb-card-title {
  font-size: 1.1rem;
  font-weight: 900;
  letter-spacing: -0.03em;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jb-card-artist {
  font-size: 0.88rem;
  color: var(--ink-muted, #4A4740);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jb-card-meta-row {
  margin-top: 0.75rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.jb-mono-chip {
  background: #EFEAE1;
  border: 1px solid var(--border, #111111);
  padding: 0.15rem 0.5rem;
  border-radius: 4px;
  font-size: 0.7rem;
  font-weight: 700;
  cursor: pointer;
}

.jb-open-action {
  background: none;
  border: none;
  font-size: 0.8rem;
  font-weight: 800;
  cursor: pointer;
  color: var(--ink, #111111);
}

.jb-open-action:hover {
  text-decoration: underline;
}

/* POPULAR ROWS */
.jb-popular-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
  min-width: 0;
}

.jb-popular-row {
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  border-radius: var(--r-md, 12px);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
  padding: 0.8rem 0.95rem;
  display: flex;
  align-items: center;
  gap: 0.85rem;
  min-width: 0;
  max-width: 100%;
  cursor: pointer;
  transition: transform 0.08s ease;
}

.jb-popular-row:hover {
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0 var(--border, #111111);
}

.jb-pop-tile {
  width: 44px;
  height: 44px;
  border-radius: var(--r-sm, 8px);
  border: var(--bw, 2px) solid var(--border, #111111);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 900;
  font-size: 1rem;
  flex-shrink: 0;
}

.jb-pop-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

.jb-pop-title {
  font-size: 1.05rem;
  font-weight: 900;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jb-pop-artist {
  font-size: 0.78rem;
  color: var(--ink-muted, #4A4740);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jb-pop-badge {
  font-size: 0.68rem;
  border: 1px solid var(--border, #111111);
  padding: 0.2rem 0.45rem;
  border-radius: 6px;
  background: #FAF8F5;
  font-weight: 700;
  flex-shrink: 0;
}

/* CHIPS BAR */
.jb-chips-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 1rem;
}

.jb-chips-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.jb-chips-label {
  font-size: 0.75rem;
  font-weight: 800;
  color: var(--ink-muted, #4A4740);
}

.jb-filter-chip {
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  border-radius: var(--r-pill, 999px);
  padding: 0.35rem 0.85rem;
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.1s ease;
}

.jb-filter-chip.active {
  background: var(--ink, #111111);
  color: var(--bg, #F3EFE8);
}

/* 4-COLUMN CARDS GRID */
.jb-cards-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 1.1rem;
  min-width: 0;
}

.jb-track-card {
  position: relative;
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  border-radius: var(--r-md, 12px);
  box-shadow: var(--shadow-sm, 3px 3px 0 var(--border, #111111));
  display: flex;
  flex-direction: column;
  min-width: 0;
  max-width: 100%;
  padding: 0.85rem;
  gap: 0.65rem;
  transition: transform 0.08s ease, box-shadow 0.08s ease;
}

.jb-track-card:has(.picker-dropdown),
.jb-track-card:focus-within {
  z-index: 40;
}

.jb-track-card:hover {
  transform: translate(-2px, -2px);
  box-shadow: 5px 5px 0 var(--border, #111111);
}

.jb-track-card.is-active {
  border-color: var(--c-blue, #4D6BFF);
  box-shadow: 4px 4px 0 var(--c-blue, #4D6BFF);
}

.jb-tc-top {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
}

.jb-tc-art-wrap {
  width: 58px;
  height: 58px;
  position: relative;
  cursor: pointer;
  flex-shrink: 0;
}

.jb-tc-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  border: var(--bw, 2px) solid var(--border, #111111);
  border-radius: var(--r-sm, 8px);
}

.jb-tc-fallback {
  width: 100%;
  height: 100%;
  background: var(--c-sun, #FFD84A);
  border: var(--bw, 2px) solid var(--border, #111111);
  border-radius: var(--r-sm, 8px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.4rem;
  font-weight: 900;
}

.jb-tc-hover-play {
  position: absolute;
  inset: 0;
  background: rgba(17, 17, 17, 0.6);
  color: #fff;
  border-radius: var(--r-sm, 8px);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
  opacity: 0;
  transition: opacity 0.15s ease;
}

.jb-tc-art-wrap:hover .jb-tc-hover-play {
  opacity: 1;
}

.jb-tc-badge-column {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 0.35rem;
}

.jb-tc-badge {
  font-size: 0.68rem;
  font-weight: 800;
  border: 1.5px solid var(--border, #111111);
  padding: 0.15rem 0.45rem;
  border-radius: 4px;
}

.jb-tc-time {
  font-size: 0.72rem;
  color: var(--ink-muted, #4A4740);
  font-weight: 600;
}

.jb-tc-body {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  min-width: 0;
}

.jb-tc-title {
  font-size: 0.96rem;
  font-weight: 900;
  letter-spacing: -0.025em;
  line-height: 1.25;
  text-transform: uppercase;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jb-tc-artist {
  font-size: 0.8rem;
  color: var(--ink-muted, #4A4740);
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.jb-tc-footer {
  margin-top: auto;
  display: flex;
  justify-content: space-between;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
  padding-top: 0.55rem;
  border-top: 1.5px solid rgba(17, 17, 17, 0.08);
}

.jb-tc-action-btn {
  background: var(--surface, #FFFDF8);
  border: 1.5px solid var(--border, #111111);
  padding: 0.25rem 0.65rem;
  border-radius: 6px;
  font-size: 0.72rem;
  font-weight: 800;
  cursor: pointer;
  transition: all 0.08s ease;
}

.jb-tc-action-btn:hover {
  background: var(--yellow, #FFD84A);
}

.jb-tc-meta-cluster {
  display: flex;
  align-items: center;
  gap: 0.4rem;
}

.jb-tc-fav-btn,
.jb-tc-del-btn,
.jb-tc-jamendo-link {
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

.jb-tc-fav-btn.active {
  background: var(--c-hotpink, #FF4F9A);
  color: #fff;
}

.jb-tc-del-btn:hover {
  background: var(--danger, #E5372B);
  color: #fff;
}

/* EMPTY STATE */
.jb-empty-box {
  background: var(--surface-2, #FFFFFF);
  border: var(--bw, 2px) solid var(--border, #111111);
  box-shadow: var(--shadow-md, 5px 5px 0 var(--border, #111111));
  border-radius: var(--r-lg, 18px);
  padding: 4rem 2rem;
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.jb-empty-glyph {
  font-size: 3rem;
  font-weight: 900;
}

.jb-empty-title {
  font-size: 1.5rem;
  font-weight: 900;
}

.jb-empty-desc {
  color: var(--ink-muted, #4A4740);
  max-width: 480px;
}

.jb-empty-btn {
  background: var(--yellow, #FFD84A);
  border: var(--bw, 2px) solid var(--border, #111111);
  padding: 0.65rem 1.25rem;
  border-radius: var(--r-sm, 8px);
  font-weight: 800;
  cursor: pointer;
}

/* RESPONSIVE BREAKPOINTS */
@media (max-width: 1320px) {
  .jb-cards-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 1024px) {
  .jb-cards-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .jb-featured-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
  .jb-popular-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 768px) {
  .jb-cards-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .jb-featured-grid {
    grid-template-columns: minmax(0, 1fr);
  }
  .jb-content-stage {
    padding: 1rem;
    gap: 2rem;
  }
  .jb-section-title {
    font-size: 1.35rem;
    white-space: normal;
  }
  .jb-hero-card {
    padding: 2rem 1.35rem;
  }
  .jb-hero-title {
    font-size: 2.35rem;
  }
}
</style>