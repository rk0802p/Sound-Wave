<template>
  <div class="pg-home-root">
    <!-- 1. Editorial Hero Headline & Masthead Statement -->
    <header class="pg-hero-section">
      <div class="hero-kicker-strip">
        <span class="sticker-tag font-mono">EST. 2026 // STEREO ARCHIVE</span>
        <span class="kicker-pulse-dot" :class="{ 'is-active': playerStore.isPlaying }"></span>
        <span class="kicker-text font-mono">LIVE SOUNDSTREAM PLAYGROUND</span>
      </div>

      <div class="hero-headline-block">
        <h1 class="hero-title font-display">
          Music As <span class="highlight-coral">Pure Play.</span>
        </h1>
        <p class="hero-manifesto">
          An expressive personal audio playground built for curated mixtapes, physical vinyl exploration, and uncompressed high-resolution streaming.
        </p>
      </div>

      <!-- Studio Telemetry Metric Pills -->
      <div class="hero-telemetry-row font-mono">
        <div class="telemetry-pill">
          <span class="pill-label">CURATOR</span>
          <span class="pill-value font-display">{{ authStore.username || 'Curator' }}</span>
        </div>
        <div class="telemetry-pill accent-cobalt">
          <span class="pill-label">MIXTAPES</span>
          <span class="pill-value">{{ playlistStore.playlists.length }}</span>
        </div>
        <div class="telemetry-pill accent-coral">
          <span class="pill-label">TRACKS</span>
          <span class="pill-value">{{ playlistStore.totalTracksCount }}</span>
        </div>
        <div class="telemetry-pill accent-citron desktop-only">
          <span class="pill-label">ENGINE</span>
          <span class="pill-value">FLAC • YOUTUBE • SPOTIFY</span>
        </div>
      </div>
    </header>

    <!-- 2. Featured Mixtape Editorial Showcase -->
    <section v-if="featuredPlaylist" class="pg-featured-mixtape-card">
      <div class="featured-card-inner">
        <!-- Vinyl Sleeve & Spinning Record -->
        <div class="featured-vinyl-column">
          <div class="vinyl-sleeve-stage">
            <!-- Vinyl Record disc -->
            <div
              class="featured-vinyl-disc"
              :class="{ 'is-spinning': isFeaturedPlaying }"
              @click="handlePlayFeatured"
              title="Click to drop the needle"
            >
              <div class="record-grooves"></div>
              <div class="record-center">
                <span class="record-spindle"></span>
              </div>
            </div>

            <!-- Sleeve Cover -->
            <div class="featured-sleeve-cover" @click="handleOpenFeatured">
              <img
                v-if="featuredPlaylist.coverImage && !featuredImgFailed"
                :src="featuredPlaylist.coverImage"
                :alt="featuredPlaylist.name"
                class="sleeve-img"
                @error="featuredImgFailed = true"
              />
              <div v-else class="sleeve-fallback font-display">
                {{ featuredMonogram }}
              </div>
            </div>
          </div>
        </div>

        <!-- Narrative & Actions Column -->
        <div class="featured-narrative-column">
          <div class="featured-badge-row font-mono">
            <span class="badge-tag">FEATURED MIXTAPE</span>
            <span class="badge-count">{{ featuredPlaylist.songs?.length || 0 }} TRACKS</span>
          </div>

          <h2 class="featured-mixtape-title font-display" @click="handleOpenFeatured">
            {{ featuredPlaylist.name }}
          </h2>

          <p v-if="featuredPlaylist.description" class="featured-mixtape-desc">
            {{ featuredPlaylist.description }}
          </p>

          <!-- Audition Tracks Quick-Chips -->
          <div v-if="featuredPlaylist.songs && featuredPlaylist.songs.length" class="audition-chips-reel">
            <div
              v-for="(song, i) in featuredPlaylist.songs.slice(0, 3)"
              :key="song._id || i"
              class="audition-chip"
              @click="handlePlayTrackDirect(song, i)"
            >
              <span class="chip-play-icon">▶</span>
              <span class="chip-title">{{ song.title }}</span>
              <span class="chip-artist">/ {{ song.artist }}</span>
            </div>
          </div>

          <!-- CTAs -->
          <div class="featured-actions-row">
            <button
              class="action-btn primary font-display"
              @click="handlePlayFeatured"
            >
              <span>{{ isFeaturedPlaying ? 'Pause Mixtape' : 'Play Mixtape' }}</span>
              <span class="btn-glyph">{{ isFeaturedPlaying ? '❚❚' : '▶' }}</span>
            </button>

            <button
              class="action-btn secondary font-display"
              @click="handleOpenFeatured"
            >
              <span>Inspect Collection →</span>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. Atmospheric Sonic Portals (Genre Blocks) -->
    <section class="pg-portals-section">
      <div class="section-masthead">
        <h3 class="section-title font-display">Sonic Frequencies</h3>
        <span class="section-subtitle font-mono">EXPLORE VIBRANT GENRE PORTALS</span>
      </div>

      <div class="portals-grid">
        <div
          v-for="vibe in quickVibes"
          :key="vibe.name"
          class="portal-card"
          :style="{ '--card-tint': vibe.tint }"
          @click="handleQuickVibe(vibe.query)"
        >
          <div class="portal-badge font-mono">{{ vibe.icon }}</div>
          <h4 class="portal-name font-display">{{ vibe.name }}</h4>
          <p class="portal-desc">{{ vibe.desc }}</p>
          <span class="portal-arrow font-mono">EXPLORE FREQUENCY →</span>
        </div>
      </div>
    </section>

    <!-- 4. Mixtapes Collection (Personal Archive) -->
    <section class="pg-collection-section">
      <div class="section-masthead">
        <div class="masthead-left">
          <h3 class="section-title font-display">Archived Mixtapes</h3>
          <span class="section-subtitle font-mono">{{ playlistStore.playlists.length }} TOTAL MIXTAPES</span>
        </div>
        <button
          class="add-mixtape-btn font-display"
          @click="showCreateModal = true"
        >
          <span>+ Create Mixtape</span>
        </button>
      </div>

      <!-- Empty State -->
      <div v-if="!playlistStore.playlists.length" class="empty-collection-card">
        <div class="empty-art font-display">00</div>
        <h4 class="empty-title font-display">Your archive is completely fresh.</h4>
        <p class="empty-desc">
          Begin by forging your first curated mixtape, or load our handcrafted analog sound collections.
        </p>
        <div class="empty-actions">
          <button class="action-btn primary font-display" @click="showCreateModal = true">
            + Forge First Mixtape
          </button>
          <button
            class="action-btn secondary font-mono"
            :disabled="seeding"
            @click="seedDemoPlaylists"
          >
            {{ seeding ? 'Loading Archives...' : 'Load Curated Analog Demos' }}
          </button>
        </div>
      </div>

      <!-- Mixtapes Grid -->
      <div v-else class="mixtapes-grid">
        <div
          v-for="playlist in playlistStore.playlists"
          :key="playlist._id"
          class="mixtape-card"
          @click="router.push(`/playlists/${playlist._id}`)"
        >
          <div class="card-cover-box">
            <img
              v-if="playlist.coverImage"
              :src="playlist.coverImage"
              :alt="playlist.name"
              class="card-img"
              loading="lazy"
            />
            <div v-else class="card-fallback font-display">
              {{ playlist.name?.slice(0, 2).toUpperCase() || 'SW' }}
            </div>
            <button
              class="card-quick-play-btn"
              @click.stop="handlePlayPlaylist(playlist)"
              title="Quick Play"
            >
              ▶
            </button>
          </div>

          <div class="card-info-box">
            <span class="card-count font-mono">{{ playlist.songs?.length || 0 }} TRACKS</span>
            <h4 class="card-name font-display">{{ playlist.name }}</h4>
            <p v-if="playlist.description" class="card-desc">{{ playlist.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Create Playlist Modal -->
    <CreatePlaylistModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="onPlaylistCreated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import { usePlaylistStore } from '../stores/playlist';
import { usePlayerStore } from '../stores/player';
import { useToastStore } from '../stores/toast';
import CreatePlaylistModal from '../components/playlists/CreatePlaylistModal.vue';
import { CURATED_DEMO_TRACKS, PLAYLIST_COVER_PRESETS } from '../data/demoTracks';

const router = useRouter();
const authStore = useAuthStore();
const playlistStore = usePlaylistStore();
const playerStore = usePlayerStore();
const toastStore = useToastStore();

const showCreateModal = ref(false);
const seeding = ref(false);
const featuredImgFailed = ref(false);

const quickVibes = [
  { name: 'Late Night Lo-Fi', desc: 'Analog tape warmth, dust & cracked vinyl', icon: '01 // TAPE', query: 'Lo-Fi', tint: '#FFEFE7' },
  { name: 'Deep Space Ambient', desc: 'Infinite harmonic resonance & spatial drones', icon: '02 // VOID', query: 'Ambient', tint: '#F1ECFF' },
  { name: 'Velvet Midnight Jazz', desc: 'Acoustic brass, double bass & smoky rooms', icon: '03 // NOIR', query: 'Jazz', tint: '#FFF7D1' },
  { name: 'Cyberpunk Synthwave', desc: '80s analog neon voltage & highway arpeggios', icon: '04 // VOLT', query: 'Synthwave', tint: '#E7FAF2' },
];

const featuredPlaylist = computed(() => {
  if (!playlistStore.playlists.length) return null;
  const withSongs = playlistStore.playlists.find((p) => p.songs && p.songs.length > 0);
  return withSongs || playlistStore.playlists[0];
});

const isFeaturedPlaying = computed(() => {
  return (
    playerStore.isPlaying &&
    playerStore.currentPlaylistId === featuredPlaylist.value?._id
  );
});

const featuredMonogram = computed(() => {
  if (!featuredPlaylist.value?.name) return 'SW';
  return featuredPlaylist.value.name.slice(0, 2).toUpperCase();
});

const handlePlayFeatured = () => {
  if (!featuredPlaylist.value) return;
  if (isFeaturedPlaying.value) {
    playerStore.togglePlay();
    return;
  }
  if (featuredPlaylist.value.songs && featuredPlaylist.value.songs.length > 0) {
    playerStore.playPlaylist(featuredPlaylist.value, 0);
    toastStore.info(`Now playing ${featuredPlaylist.value.name}`);
  } else {
    toastStore.warning('This mixtape does not have any audio tracks yet.');
  }
};

const handleOpenFeatured = () => {
  if (featuredPlaylist.value) {
    router.push(`/playlists/${featuredPlaylist.value._id}`);
  }
};

const handlePlayTrackDirect = (song, index) => {
  if (featuredPlaylist.value) {
    playerStore.playPlaylist(featuredPlaylist.value, index);
  } else {
    playerStore.playTrack(song);
  }
  toastStore.info(`Playing ${song.title}`);
};

const handlePlayPlaylist = (playlist) => {
  if (playlist.songs && playlist.songs.length > 0) {
    playerStore.playPlaylist(playlist, 0);
    toastStore.info(`Now playing ${playlist.name}`);
  } else {
    router.push(`/playlists/${playlist._id}`);
  }
};

const handleQuickVibe = (genre) => {
  router.push({ path: '/search', query: { q: genre } });
};

const onPlaylistCreated = (newPlaylist) => {
  showCreateModal.value = false;
  toastStore.success(`Created mixtape "${newPlaylist.name}"`);
  router.push(`/playlists/${newPlaylist._id}`);
};

const seedDemoPlaylists = async () => {
  if (seeding.value) return;
  seeding.value = true;
  try {
    const demoCollections = [
      {
        name: 'Nocturnal Resonance Atelier',
        description: 'Handcrafted selection of verified high-fidelity ambient, classical, and electronic audio streams.',
        coverImage: PLAYLIST_COVER_PRESETS[1].url,
        isPublic: true,
        songs: CURATED_DEMO_TRACKS.slice(0, 5),
      },
      {
        name: 'Analog Neon Voltage',
        description: 'Pure analog synthesis, 80s tape compression, and late-night highway arpeggios.',
        coverImage: PLAYLIST_COVER_PRESETS[3].url,
        isPublic: true,
        songs: CURATED_DEMO_TRACKS.slice(2, 5),
      },
      {
        name: 'Deep Spatial Reverberations',
        description: 'Hypnotic sub-bass, organic drones, and spatial architectural acoustics.',
        coverImage: PLAYLIST_COVER_PRESETS[0].url,
        isPublic: true,
        songs: CURATED_DEMO_TRACKS.slice(0, 3),
      },
    ];

    for (const demo of demoCollections) {
      const created = await playlistStore.createPlaylist({
        name: demo.name,
        description: demo.description,
        coverImage: demo.coverImage,
        isPublic: demo.isPublic,
      });

      if (created && created._id && demo.songs) {
        for (const song of demo.songs) {
          try {
            await playlistStore.addSong(created._id, {
              title: song.title,
              artist: song.artist,
              album: song.album,
              duration: song.duration,
              url: song.url,
            });
          } catch (e) {
            console.warn('Song seed skipped:', e);
          }
        }
      }
    }

    await playlistStore.fetchPlaylists();
    toastStore.success('Handcrafted audio archives loaded successfully!');
  } catch (err) {
    console.error('Demo seeding failed:', err);
    toastStore.error('Could not load demo archives.');
  } finally {
    seeding.value = false;
  }
};

onMounted(async () => {
  if (authStore.isAuthenticated) {
    await playlistStore.fetchPlaylists();
  }
});
</script>

<style scoped>
.pg-home-root {
  display: flex;
  flex-direction: column;
  gap: 48px;
  padding-bottom: 40px;
}

/* 1. Hero Masthead */
.pg-hero-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
  padding-top: 10px;
}

.hero-kicker-strip {
  display: flex;
  align-items: center;
  gap: 10px;
}

.sticker-tag {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 3px 10px;
  background: var(--pg-coral);
  color: #fff;
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  box-shadow: 2px 2px 0px var(--pg-border);
}

.kicker-pulse-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--pg-ink);
  transition: transform 300ms ease;
}

.kicker-pulse-dot.is-active {
  background: var(--pg-cobalt);
  transform: scale(1.4);
}

.kicker-text {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--pg-ink-secondary);
  letter-spacing: 0.06em;
}

.hero-headline-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  max-width: 900px;
}

.hero-title {
  font-size: clamp(2.5rem, 6vw, 4.8rem);
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -0.04em;
  color: var(--pg-ink);
}

.highlight-coral {
  color: var(--pg-coral);
  text-decoration: underline wavy var(--pg-citron) 4px;
}

.hero-manifesto {
  font-size: clamp(1rem, 1.8vw, 1.25rem);
  line-height: 1.5;
  color: var(--pg-ink-secondary);
  max-width: 680px;
  font-weight: 500;
}

.hero-telemetry-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
}

.telemetry-pill {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  background: var(--pg-canvas);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  box-shadow: 2px 2px 0px var(--pg-border);
  font-size: 0.75rem;
}

.pill-label {
  font-weight: 800;
  color: var(--pg-ink-muted);
}

.pill-value {
  font-weight: 800;
  color: var(--pg-ink);
}

.telemetry-pill.accent-cobalt .pill-value { color: var(--pg-cobalt); }
.telemetry-pill.accent-coral .pill-value { color: var(--pg-coral); }
.telemetry-pill.accent-citron .pill-value { color: var(--pg-ink); }

/* 2. Featured Mixtape Card */
.pg-featured-mixtape-card {
  background: var(--pg-surface-lavender);
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-xl);
  box-shadow: var(--pg-shadow-solid-lg);
  padding: 36px 40px;
  position: relative;
  overflow: hidden;
}

.featured-card-inner {
  display: grid;
  grid-template-columns: 280px 1fr;
  align-items: center;
  gap: 48px;
}

.featured-vinyl-column {
  display: flex;
  justify-content: center;
}

.vinyl-sleeve-stage {
  position: relative;
  width: 220px;
  height: 220px;
}

.featured-vinyl-disc {
  position: absolute;
  top: 0;
  left: 36px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: #14101E;
  border: 2px solid var(--pg-border);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--pg-shadow-solid);
  cursor: pointer;
  transition: transform 400ms var(--pg-ease-spring);
  z-index: 1;
}

.vinyl-sleeve-stage:hover .featured-vinyl-disc {
  transform: translateX(45px) rotate(20deg);
}

.featured-vinyl-disc.is-spinning {
  animation: vinylSpin 3s linear infinite;
}

.record-grooves {
  position: absolute;
  inset: 12px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.25);
}

.record-center {
  width: 64px;
  height: 64px;
  border-radius: 50%;
  background: var(--pg-coral);
  border: 2px solid #14101E;
  display: flex;
  align-items: center;
  justify-content: center;
}

.record-spindle {
  width: 14px;
  height: 14px;
  border-radius: 50%;
  background: #14101E;
}

.featured-sleeve-cover {
  position: relative;
  width: 220px;
  height: 220px;
  border-radius: var(--pg-radius-md);
  border: 2px solid var(--pg-border);
  box-shadow: var(--pg-shadow-solid);
  overflow: hidden;
  background: var(--pg-canvas);
  cursor: pointer;
  z-index: 2;
  transition: transform var(--pg-transition-spring);
}

.featured-sleeve-cover:hover {
  transform: translateY(-2px);
}

.sleeve-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.sleeve-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 3.5rem;
  font-weight: 800;
  background: var(--pg-surface-peach);
  color: var(--pg-coral);
}

/* Narrative */
.featured-narrative-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.featured-badge-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.badge-tag {
  font-size: 0.68rem;
  font-weight: 800;
  padding: 3px 8px;
  background: var(--pg-ink);
  color: var(--pg-citron);
  border-radius: var(--pg-radius-full);
}

.badge-count {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--pg-ink-secondary);
}

.featured-mixtape-title {
  font-size: clamp(1.8rem, 3.5vw, 2.6rem);
  font-weight: 800;
  color: var(--pg-ink);
  line-height: 1.1;
  letter-spacing: -0.03em;
  cursor: pointer;
}

.featured-mixtape-title:hover {
  color: var(--pg-cobalt);
}

.featured-mixtape-desc {
  font-size: 0.95rem;
  line-height: 1.5;
  color: var(--pg-ink-secondary);
  max-width: 620px;
}

.audition-chips-reel {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.audition-chip {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  background: var(--pg-canvas);
  border: 1.5px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  box-shadow: 2px 2px 0px var(--pg-border);
  font-size: 0.76rem;
  cursor: pointer;
  transition: all var(--pg-transition-spring);
}

.audition-chip:hover {
  background: var(--pg-citron);
  transform: translateY(-2px);
  box-shadow: 3px 3px 0px var(--pg-border);
}

.chip-play-icon {
  font-size: 0.65rem;
  color: var(--pg-cobalt);
}

.chip-title {
  font-weight: 700;
  color: var(--pg-ink);
}

.chip-artist {
  color: var(--pg-ink-muted);
}

.featured-actions-row {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: var(--pg-radius-full);
  font-size: 0.92rem;
  font-weight: 800;
  border: 2px solid var(--pg-border);
  cursor: pointer;
  transition: all var(--pg-transition-spring);
}

.action-btn.primary {
  background: var(--pg-cobalt);
  color: #fff;
  box-shadow: var(--pg-shadow-solid);
}

.action-btn.primary:hover {
  background: var(--pg-coral);
  transform: translate(-2px, -2px);
  box-shadow: var(--pg-shadow-solid-lg);
}

.action-btn.secondary {
  background: var(--pg-canvas);
  color: var(--pg-ink);
  box-shadow: 2px 2px 0px var(--pg-border);
}

.action-btn.secondary:hover {
  background: var(--pg-surface-butter);
  transform: translateY(-2px);
  box-shadow: 3px 3px 0px var(--pg-border);
}

/* 3. Sonic Portals */
.pg-portals-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.section-masthead {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.section-title {
  font-size: 1.6rem;
  font-weight: 800;
  color: var(--pg-ink);
  letter-spacing: -0.03em;
}

.section-subtitle {
  font-size: 0.72rem;
  font-weight: 700;
  color: var(--pg-ink-muted);
}

.portals-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 20px;
}

.portal-card {
  background: var(--card-tint);
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

.portal-card:hover {
  transform: translate(-3px, -3px);
  box-shadow: var(--pg-shadow-solid-lg);
}

.portal-badge {
  font-size: 0.68rem;
  font-weight: 800;
  color: var(--pg-ink-secondary);
}

.portal-name {
  font-size: 1.25rem;
  font-weight: 800;
  color: var(--pg-ink);
}

.portal-desc {
  font-size: 0.82rem;
  color: var(--pg-ink-secondary);
  line-height: 1.4;
  flex: 1;
}

.portal-arrow {
  font-size: 0.72rem;
  font-weight: 800;
  color: var(--pg-cobalt);
  margin-top: 10px;
}

/* 4. Mixtapes Collection Grid */
.pg-collection-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.masthead-left {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.add-mixtape-btn {
  padding: 8px 18px;
  background: var(--pg-citron);
  color: var(--pg-ink);
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-full);
  font-size: 0.85rem;
  font-weight: 800;
  box-shadow: 2px 2px 0px var(--pg-border);
  cursor: pointer;
  transition: all var(--pg-transition-spring);
}

.add-mixtape-btn:hover {
  background: var(--pg-coral);
  color: #fff;
  transform: translate(-2px, -2px);
  box-shadow: 4px 4px 0px var(--pg-border);
}

.mixtapes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 24px;
}

.mixtape-card {
  background: var(--pg-canvas);
  border: 2px solid var(--pg-border);
  border-radius: var(--pg-radius-lg);
  box-shadow: var(--pg-shadow-solid);
  padding: 16px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  cursor: pointer;
  transition: all var(--pg-transition-spring);
}

.mixtape-card:hover {
  transform: translate(-3px, -3px);
  box-shadow: var(--pg-shadow-solid-lg);
}

.card-cover-box {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  border-radius: var(--pg-radius-md);
  border: 1.5px solid var(--pg-border);
  overflow: hidden;
  background: var(--pg-surface-peach);
}

.card-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-fallback {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.2rem;
  font-weight: 800;
  color: var(--pg-coral);
}

.card-quick-play-btn {
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 38px;
  height: 38px;
  border-radius: 50%;
  background: var(--pg-citron);
  color: var(--pg-ink);
  border: 1.5px solid var(--pg-border);
  box-shadow: 2px 2px 0px var(--pg-border);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.8rem;
  cursor: pointer;
  opacity: 0;
  transform: scale(0.8);
  transition: all var(--pg-transition-spring);
}

.mixtape-card:hover .card-quick-play-btn {
  opacity: 1;
  transform: scale(1);
}

.card-quick-play-btn:hover {
  background: var(--pg-coral);
  color: #fff;
  transform: scale(1.1);
}

.card-info-box {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-count {
  font-size: 0.65rem;
  font-weight: 800;
  color: var(--pg-cobalt);
}

.card-name {
  font-size: 1.05rem;
  font-weight: 800;
  color: var(--pg-ink);
  line-height: 1.2;
}

.card-desc {
  font-size: 0.78rem;
  color: var(--pg-ink-secondary);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Empty Collection */
.empty-collection-card {
  background: var(--pg-surface-soft);
  border: 2px dashed var(--pg-border);
  border-radius: var(--pg-radius-xl);
  padding: 48px 32px;
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
  gap: 16px;
}

.empty-art {
  font-size: 4rem;
  font-weight: 800;
  color: var(--pg-ink-dim);
}

.empty-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: var(--pg-ink);
}

.empty-desc {
  font-size: 0.9rem;
  color: var(--pg-ink-secondary);
  max-width: 460px;
}

.empty-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 12px;
  margin-top: 8px;
}

@media (max-width: 900px) {
  .featured-card-inner {
    grid-template-columns: 1fr;
    gap: 24px;
  }

  .featured-vinyl-column {
    justify-content: flex-start;
  }

  .vinyl-sleeve-stage {
    width: 180px;
    height: 180px;
  }

  .featured-vinyl-disc {
    width: 180px;
    height: 180px;
    left: 20px;
  }

  .featured-sleeve-cover {
    width: 180px;
    height: 180px;
  }

  .pg-featured-mixtape-card {
    padding: 24px 20px;
  }
}
</style>
