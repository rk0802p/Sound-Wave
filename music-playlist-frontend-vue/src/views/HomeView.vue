<template>
  <div class="sw-spatial-home">
    <!-- 1. Editorial Architectural Statement Header -->
    <header class="home-hero-header">
      <div class="header-provenance font-mono">
        <span class="pulse-beacon" :class="{ 'is-active': playerStore.isPlaying }"></span>
        <span>SOUNDWAVE ATELIER // PHYSICAL SOUNDSPACE</span>
      </div>

      <div class="header-main-lockup">
        <h1 class="header-headline font-display">
          Sound As Physical Space.
        </h1>
        <p class="header-tagline">
          An avant-garde acoustic environment designed for high-resolution streaming, physical vinyl archives, and multi-provider resonance.
        </p>
      </div>

      <!-- Studio Metrics Ledger -->
      <div class="studio-metrics-ledger font-mono">
        <div class="metric-cell">
          <span class="cell-label">CURATOR</span>
          <span class="cell-val">{{ authStore.username || 'Curator' }}</span>
        </div>
        <div class="metric-cell">
          <span class="cell-label">ARCHIVED COLLECTIONS</span>
          <span class="cell-val accent">{{ playlistStore.playlists.length }}</span>
        </div>
        <div class="metric-cell">
          <span class="cell-label">ACOUSTIC FREQUENCIES</span>
          <span class="cell-val">{{ playlistStore.totalTracksCount }}</span>
        </div>
        <div class="metric-cell desktop-only">
          <span class="cell-label">FIDELITY ENGINE</span>
          <span class="cell-val warm">FLAC • YT • SPOTIFY</span>
        </div>
      </div>
    </header>

    <!-- 2. The Interactive Vinyl Turntable Showcase (Featured Stage) -->
    <section v-if="featuredPlaylist" class="home-featured-stage">
      <div class="featured-ambient-halo" :style="featuredHaloStyle"></div>

      <div class="stage-grid">
        <!-- Physical Vinyl Disc & Sleeve -->
        <div class="turntable-visual-column">
          <div class="turntable-deck">
            <!-- Vinyl Record -->
            <div
              class="featured-vinyl-record"
              :class="{ 'is-spinning': isFeaturedPlaying }"
              @click="handlePlayFeatured"
              title="Click to drop needle"
            >
              <div class="record-grooves"></div>
              <div class="record-label">
                <span class="record-hole"></span>
              </div>
            </div>

            <!-- Vinyl Sleeve Jacket -->
            <div class="featured-sleeve-jacket" @click="handleOpenFeatured">
              <img
                v-if="featuredPlaylist.coverImage && !featuredImgFailed"
                :src="featuredPlaylist.coverImage"
                :alt="featuredPlaylist.name"
                class="featured-jacket-img"
                @error="featuredImgFailed = true"
              />
              <div v-else class="featured-generative-cover">
                <span class="generative-monogram font-display">{{ featuredMonogram }}</span>
              </div>
              <div class="sleeve-overlay-sheen"></div>
            </div>
          </div>
        </div>

        <!-- Narrative Column -->
        <div class="turntable-narrative-column">
          <div class="featured-kicker font-mono">
            <span class="featured-pill">NOW IN ORBIT</span>
            <span class="featured-tracks-count">{{ featuredPlaylist.songs?.length || 0 }} FREQUENCIES</span>
          </div>

          <h2 class="featured-title font-display" @click="handleOpenFeatured">
            {{ featuredPlaylist.name }}
          </h2>

          <p v-if="featuredPlaylist.description" class="featured-desc">
            {{ featuredPlaylist.description }}
          </p>

          <!-- First 3 Audition Tracks Preview -->
          <div v-if="featuredPlaylist.songs && featuredPlaylist.songs.length" class="audition-ribbons">
            <div
              v-for="(song, i) in featuredPlaylist.songs.slice(0, 3)"
              :key="song._id || i"
              class="audition-chip"
              @click="handlePlayTrackDirect(song, i)"
            >
              <span class="chip-play-icon">▶</span>
              <span class="chip-title font-display">{{ song.title }}</span>
              <span class="chip-artist font-mono">{{ song.artist }}</span>
            </div>
          </div>

          <!-- Actions -->
          <div class="featured-action-cluster">
            <button class="stage-btn primary font-display" @click="handlePlayFeatured">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                <polygon points="6 3 20 12 6 21 6 3"></polygon>
              </svg>
              <span>{{ isFeaturedPlaying ? 'Pause Atelier' : 'Drop The Needle' }}</span>
            </button>

            <button class="stage-btn secondary font-mono" @click="handleOpenFeatured">
              <span>Inspect Collection</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 3. Atmospheric Acoustic Mood Portals -->
    <section class="home-portals-section">
      <div class="section-title-lockup">
        <span class="section-kicker font-mono">SONIC FREQUENCIES</span>
        <h3 class="section-title font-display">Acoustic Atmospheres</h3>
      </div>

      <div class="portals-spectrum-grid">
        <div
          v-for="vibe in quickVibes"
          :key="vibe.name"
          class="portal-card"
          @click="handleVibeClick(vibe.query)"
        >
          <div class="portal-gradient-glow" :style="{ background: vibe.color }"></div>
          <div class="portal-content">
            <span class="portal-symbol font-mono">{{ vibe.icon }}</span>
            <div class="portal-meta">
              <span class="portal-name font-display">{{ vibe.name }}</span>
              <span class="portal-sub font-mono">{{ vibe.desc }}</span>
            </div>
          </div>
          <!-- Micro Equalizer Sparkline -->
          <div class="portal-micro-bars">
            <span v-for="b in 6" :key="b" class="micro-bar"></span>
          </div>
        </div>
      </div>
    </section>

    <!-- 4. Curated Archive Exhibition (Asymmetric Gallery) -->
    <section class="home-exhibition-section">
      <div class="exhibition-header">
        <div class="section-title-lockup">
          <span class="section-kicker font-mono">ARCHIVAL REPOSITORY</span>
          <h2 class="section-title font-display">Collection Vault</h2>
        </div>

        <button class="forge-btn font-mono" @click="showCreateModal = true">
          <span class="forge-plus">+</span>
          <span>Forge Collection</span>
        </button>
      </div>

      <!-- Skeletons While Loading -->
      <div v-if="playlistStore.isLoading && !playlistStore.playlists.length" class="exhibition-grid">
        <div v-for="n in 4" :key="n" class="skeleton-exhibition-card">
          <div class="skeleton-sleeve"></div>
          <div class="skeleton-line w-75"></div>
          <div class="skeleton-line w-40"></div>
        </div>
      </div>

      <!-- Empty State: Zero Playlists -->
      <div v-else-if="playlistStore.playlists.length === 0" class="exhibition-empty-vault">
        <div class="empty-turntable-ghost">
          <div class="ghost-circle g-1"></div>
          <div class="ghost-circle g-2"></div>
          <span class="ghost-icon font-mono">00</span>
        </div>
        <h3 class="font-display">The Atelier Lies Silent</h3>
        <p>No audio collections have been archived yet. Forge your first playlist or generate our master starter archive with high-fidelity streams.</p>
        <div class="empty-btn-cluster">
          <button class="stage-btn primary font-display" @click="showCreateModal = true">
            + Forge First Collection
          </button>
          <button class="stage-btn warm font-mono" :disabled="seeding" @click="seedStarterPlaylist">
            {{ seeding ? 'Archiving...' : '✨ Generate Master Archive' }}
          </button>
        </div>
      </div>

      <!-- Populated Exhibition Cards -->
      <div v-else class="exhibition-grid">
        <div
          v-for="(p, index) in playlistStore.playlists"
          :key="p._id"
          class="exhibition-card"
          @click="openPlaylist(p._id)"
        >
          <!-- Vinyl Sleeve Peek -->
          <div class="card-sleeve-stage">
            <!-- Sliding Record -->
            <div class="card-vinyl-disc" :class="{ 'is-spinning': isPlaylistActive(p) && playerStore.isPlaying }">
              <div class="card-vinyl-grooves"></div>
              <div class="card-vinyl-spindle"></div>
            </div>

            <!-- Sleeve Front Artwork -->
            <div class="card-sleeve-front">
              <img
                v-if="p.coverImage"
                :src="p.coverImage"
                :alt="p.name"
                class="sleeve-img"
                loading="lazy"
                @error="p.coverImage = null"
              />
              <div v-else class="generative-card-cover" :style="getGenerativeCoverStyle(p.name)">
                <span class="font-display">{{ getMonogram(p.name) }}</span>
              </div>

              <!-- Quick Play Hover Overlay Button -->
              <button
                class="quick-play-overlay-btn"
                @click.stop="handleQuickPlayPlaylist(p)"
                :title="`Play ${p.name}`"
              >
                <svg v-if="isPlaylistActive(p) && playerStore.isPlaying" width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16"></rect>
                  <rect x="14" y="4" width="4" height="16"></rect>
                </svg>
                <svg v-else width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
                  <polygon points="6 3 20 12 6 21 6 3"></polygon>
                </svg>
              </button>
            </div>
          </div>

          <!-- Card Metadata -->
          <div class="card-meta-block">
            <div class="card-meta-header">
              <span class="card-index font-mono">0{{ index + 1 }}</span>
              <span class="card-tracks-badge font-mono">{{ p.songs?.length || 0 }} FREQ</span>
            </div>
            <h4 class="card-title font-display">{{ p.name }}</h4>
            <p v-if="p.description" class="card-desc">{{ p.description }}</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Global Create Playlist Modal -->
    <CreatePlaylistModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
    />
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
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
  { name: 'Late Night Lo-Fi', desc: 'Analog tape warmth & dust', icon: '01 // TAPE', query: 'Lo-Fi', color: 'rgba(204, 255, 0, 0.22)' },
  { name: 'Deep Space Ambient', desc: 'Infinite harmonic resonance', icon: '02 // VOID', query: 'Ambient', color: 'rgba(168, 85, 247, 0.22)' },
  { name: 'Velvet Midnight Jazz', desc: 'Acoustic brass & smoke', icon: '03 // NOIR', query: 'Jazz', color: 'rgba(245, 158, 11, 0.22)' },
  { name: 'Cyberpunk Synthwave', desc: '80s analog neon voltage', icon: '04 // VOLT', query: 'Synthwave', color: 'rgba(244, 63, 94, 0.22)' },
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

const featuredHaloStyle = computed(() => {
  const name = featuredPlaylist.value?.name || 'Soundwave';
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue = Math.abs(hash % 360);
  return {
    background: `radial-gradient(circle at 30% 50%, hsla(${hue}, 80%, 55%, 0.16) 0%, transparent 70%)`,
  };
});

const getMonogram = (name) => {
  if (!name) return 'SW';
  return name.slice(0, 2).toUpperCase();
};

const getGenerativeCoverStyle = (name) => {
  let hash = 0;
  for (let i = 0; i < (name || 'SW').length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  const hue1 = Math.abs(hash % 360);
  const hue2 = (hue1 + 40) % 360;
  return {
    background: `linear-gradient(135deg, hsl(${hue1}, 70%, 14%) 0%, hsl(${hue2}, 60%, 8%) 100%)`,
    color: `hsl(${hue1}, 80%, 65%)`,
  };
};

const isPlaylistActive = (playlist) => {
  return playerStore.currentPlaylistId === playlist._id;
};

const handleVibeClick = (query) => {
  router.push({ path: '/search', query: { q: query } });
};

const openPlaylist = (id) => {
  router.push(`/playlists/${id}`);
};

const handleOpenFeatured = () => {
  if (featuredPlaylist.value) {
    router.push(`/playlists/${featuredPlaylist.value._id}`);
  }
};

const handlePlayFeatured = () => {
  if (!featuredPlaylist.value?.songs?.length) return;
  if (isFeaturedPlaying.value) {
    playerStore.togglePlay();
  } else {
    playerStore.playTrack(
      featuredPlaylist.value.songs[0],
      featuredPlaylist.value,
      featuredPlaylist.value.songs
    );
    toastStore.info(`Resonating "${featuredPlaylist.value.name}"`);
  }
};

const handlePlayTrackDirect = (song, index) => {
  if (!featuredPlaylist.value) return;
  playerStore.playTrack(song, featuredPlaylist.value, featuredPlaylist.value.songs);
};

const handleQuickPlayPlaylist = (playlist) => {
  if (!playlist.songs || playlist.songs.length === 0) {
    toastStore.info(`"${playlist.name}" is empty`);
    router.push(`/playlists/${playlist._id}`);
    return;
  }
  if (isPlaylistActive(playlist) && playerStore.isPlaying) {
    playerStore.togglePlay();
  } else {
    playerStore.playTrack(playlist.songs[0], playlist, playlist.songs);
    toastStore.info(`Resonating "${playlist.name}"`);
  }
};

const seedStarterPlaylist = async () => {
  seeding.value = true;
  try {
    const starter = await playlistStore.createPlaylist({
      name: 'Nocturnal Resonance Atelier',
      description: 'Handcrafted selection of verified high-fidelity ambient, classical, and electronic audio streams.',
      coverImage: PLAYLIST_COVER_PRESETS[1].url,
      isPublic: true,
      songs: CURATED_DEMO_TRACKS,
    });
    toastStore.success('Generated starter playlist with playable lossless audio!');
    router.push(`/playlists/${starter._id}`);
  } catch (err) {
    toastStore.error(err.response?.data?.message || 'Failed to generate starter playlist');
  } finally {
    seeding.value = false;
  }
};
</script>

<style scoped>
.sw-spatial-home {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 52px;
}

/* 1. Header */
.home-hero-header {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.header-provenance {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 11px;
  letter-spacing: 0.12em;
  color: var(--sw-text-muted);
}

.pulse-beacon {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--sw-accent);
  box-shadow: 0 0 10px var(--sw-accent);
}

.pulse-beacon.is-active {
  animation: pulse-beacon-anim 1.5s infinite;
}

@keyframes pulse-beacon-anim {
  0% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.6); opacity: 0.4; }
  100% { transform: scale(1); opacity: 1; }
}

.header-main-lockup {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.header-headline {
  font-size: clamp(38px, 6vw, 68px);
  font-weight: 800;
  line-height: 1.02;
  letter-spacing: -0.04em;
  color: #fff;
  background: linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.header-tagline {
  font-size: 16px;
  color: var(--sw-text-secondary);
  max-width: 620px;
  line-height: 1.6;
}

/* Studio Metrics Ledger */
.studio-metrics-ledger {
  display: flex;
  align-items: center;
  gap: 20px;
  padding: 14px 20px;
  background: rgba(13, 16, 23, 0.6);
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--sw-radius-md);
  width: fit-content;
  flex-wrap: wrap;
}

.metric-cell {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding-right: 18px;
  border-right: 1px solid rgba(255, 255, 255, 0.08);
}

.metric-cell:last-child {
  padding-right: 0;
  border-right: none;
}

.cell-label {
  font-size: 9px;
  letter-spacing: 0.1em;
  color: var(--sw-text-muted);
}

.cell-val {
  font-size: 13px;
  font-weight: 600;
  color: #fff;
}

.cell-val.accent { color: var(--sw-accent); }
.cell-val.warm { color: var(--sw-warm); }

/* 2. Featured Stage */
.home-featured-stage {
  position: relative;
  background: rgba(13, 16, 23, 0.5);
  backdrop-filter: blur(28px);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--sw-radius-xl);
  padding: 40px;
  overflow: hidden;
}

.featured-ambient-halo {
  position: absolute;
  inset: -60px;
  pointer-events: none;
}

.stage-grid {
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 44px;
  align-items: center;
  position: relative;
  z-index: 1;
}

.turntable-deck {
  position: relative;
  width: 240px;
  height: 240px;
  margin: 0 auto;
}

.featured-vinyl-record {
  position: absolute;
  top: 10px;
  left: 20px;
  width: 220px;
  height: 220px;
  border-radius: 50%;
  background: radial-gradient(circle at center, #252525 15%, #0a0a0a 60%, #151515 100%);
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.8);
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 1;
}

.turntable-deck:hover .featured-vinyl-record {
  transform: translateX(45px) rotate(20deg);
}

.featured-vinyl-record.is-spinning {
  animation: spin-vinyl 4s linear infinite;
}

.record-grooves {
  position: absolute;
  inset: 22px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.15);
}

.record-label {
  position: absolute;
  inset: 70px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--sw-accent), var(--sw-warm));
  display: flex;
  align-items: center;
  justify-content: center;
}

.record-hole {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #060709;
}

.featured-sleeve-jacket {
  position: absolute;
  inset: 0;
  border-radius: var(--sw-radius-md);
  overflow: hidden;
  box-shadow: 0 18px 40px rgba(0, 0, 0, 0.7);
  z-index: 2;
  cursor: pointer;
}

.featured-jacket-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.featured-generative-cover {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #1e293b, #0f172a);
}

.generative-monogram {
  font-size: 52px;
  font-weight: 800;
  color: var(--sw-accent);
}

.sleeve-overlay-sheen {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, transparent 60%);
  pointer-events: none;
}

/* Narrative Column */
.turntable-narrative-column {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.featured-kicker {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 11px;
}

.featured-pill {
  padding: 2px 8px;
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.35);
  color: var(--sw-warm);
  border-radius: var(--sw-radius-full);
}

.featured-tracks-count {
  color: var(--sw-text-muted);
}

.featured-title {
  font-size: clamp(28px, 4vw, 44px);
  font-weight: 800;
  color: #fff;
  line-height: 1.1;
  cursor: pointer;
  transition: color var(--sw-transition-fast);
}

.featured-title:hover {
  color: var(--sw-accent);
}

.featured-desc {
  font-size: 14px;
  color: var(--sw-text-secondary);
  line-height: 1.6;
  max-width: 580px;
}

.audition-ribbons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.audition-chip {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--sw-radius-full);
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.audition-chip:hover {
  background: rgba(204, 255, 0, 0.15);
  border-color: var(--sw-accent);
  transform: translateY(-2px);
}

.chip-play-icon {
  font-size: 10px;
  color: var(--sw-accent);
}

.chip-title {
  font-size: 12px;
  font-weight: 600;
  color: #fff;
}

.chip-artist {
  font-size: 11px;
  color: var(--sw-text-muted);
}

.featured-action-cluster {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 6px;
}

.stage-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px 24px;
  border-radius: var(--sw-radius-full);
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.stage-btn.primary {
  background: linear-gradient(135deg, var(--sw-accent), var(--sw-warm));
  color: #060709;
  box-shadow: 0 0 24px rgba(204, 255, 0, 0.4);
}

.stage-btn.primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 0 32px rgba(204, 255, 0, 0.6);
}

.stage-btn.secondary {
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.12);
  color: #fff;
}

.stage-btn.secondary:hover {
  background: rgba(255, 255, 255, 0.12);
}

.stage-btn.warm {
  background: linear-gradient(135deg, var(--sw-warm), #d97706);
  color: #060709;
}

/* 3. Mood Portals */
.home-portals-section {
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.section-title-lockup {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.section-kicker {
  font-size: 10px;
  letter-spacing: 0.14em;
  color: var(--sw-text-muted);
}

.section-title {
  font-size: 26px;
  font-weight: 700;
  color: #fff;
}

.portals-spectrum-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
}

.portal-card {
  position: relative;
  padding: 20px;
  background: rgba(13, 16, 23, 0.55);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: var(--sw-radius-lg);
  overflow: hidden;
  cursor: pointer;
  transition: all var(--sw-transition-fast);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  min-height: 130px;
}

.portal-card:hover {
  transform: translateY(-4px);
  border-color: rgba(255, 255, 255, 0.2);
  box-shadow: 0 16px 32px rgba(0, 0, 0, 0.6);
}

.portal-gradient-glow {
  position: absolute;
  inset: 0;
  opacity: 0.15;
  transition: opacity var(--sw-transition-fast);
}

.portal-card:hover .portal-gradient-glow {
  opacity: 0.35;
}

.portal-content {
  position: relative;
  z-index: 1;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.portal-symbol {
  font-size: 10px;
  letter-spacing: 0.1em;
  color: var(--sw-accent);
}

.portal-meta {
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.portal-name {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
}

.portal-sub {
  font-size: 11px;
  color: var(--sw-text-secondary);
}

.portal-micro-bars {
  display: flex;
  align-items: flex-end;
  gap: 3px;
  height: 12px;
  position: relative;
  z-index: 1;
}

.micro-bar {
  width: 3px;
  height: 4px;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 1px;
  transition: height 0.3s ease;
}

.portal-card:hover .micro-bar {
  background: var(--sw-accent);
  animation: eq-bounce 0.6s ease-in-out infinite alternate;
}

/* 4. Exhibition Section */
.home-exhibition-section {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.exhibition-header {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
}

.forge-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 18px;
  background: rgba(204, 255, 0, 0.12);
  border: 1px solid rgba(204, 255, 0, 0.35);
  border-radius: var(--sw-radius-full);
  color: var(--sw-accent);
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.forge-btn:hover {
  background: rgba(204, 255, 0, 0.22);
  border-color: var(--sw-accent);
  transform: translateY(-2px);
}

.forge-plus {
  font-size: 15px;
}

.exhibition-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 24px;
}

.exhibition-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 16px;
  background: rgba(13, 16, 23, 0.45);
  border: 1px solid rgba(255, 255, 255, 0.06);
  border-radius: var(--sw-radius-lg);
  cursor: pointer;
  transition: all var(--sw-transition-fast);
}

.exhibition-card:hover {
  background: rgba(255, 255, 255, 0.04);
  border-color: rgba(255, 255, 255, 0.15);
  transform: translateY(-4px);
  box-shadow: 0 16px 36px rgba(0, 0, 0, 0.7);
}

.card-sleeve-stage {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
}

.card-vinyl-disc {
  position: absolute;
  top: 5px;
  right: 0;
  width: 90%;
  height: 90%;
  border-radius: 50%;
  background: radial-gradient(circle at center, #222 15%, #0d0d0d 60%, #151515 100%);
  border: 1px solid rgba(255, 255, 255, 0.15);
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1);
  z-index: 1;
}

.exhibition-card:hover .card-vinyl-disc {
  transform: translateX(25px) rotate(25deg);
}

.card-vinyl-disc.is-spinning {
  animation: spin-vinyl 3s linear infinite;
}

.card-vinyl-grooves {
  position: absolute;
  inset: 12px;
  border-radius: 50%;
  border: 1px dashed rgba(255, 255, 255, 0.15);
}

.card-vinyl-spindle {
  position: absolute;
  inset: 38%;
  border-radius: 50%;
  background: var(--sw-accent);
}

.card-sleeve-front {
  position: relative;
  width: 90%;
  height: 90%;
  border-radius: var(--sw-radius-md);
  overflow: hidden;
  box-shadow: 0 10px 24px rgba(0, 0, 0, 0.6);
  z-index: 2;
  background: #0d1017;
}

.sleeve-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.generative-card-cover {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32px;
  font-weight: 800;
}

.quick-play-overlay-btn {
  position: absolute;
  bottom: 12px;
  right: 12px;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  background: var(--sw-accent);
  color: #060709;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.6);
  opacity: 0;
  transform: translateY(8px);
  transition: all var(--sw-transition-fast);
}

.exhibition-card:hover .quick-play-overlay-btn {
  opacity: 1;
  transform: translateY(0);
}

.quick-play-overlay-btn:hover {
  transform: scale(1.1);
  background: #fff;
}

/* Card Meta Block */
.card-meta-block {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.card-meta-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 10px;
  color: var(--sw-text-muted);
}

.card-tracks-badge {
  color: var(--sw-accent);
}

.card-title {
  font-size: 16px;
  font-weight: 700;
  color: #fff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.card-desc {
  font-size: 12px;
  color: var(--sw-text-secondary);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  line-height: 1.5;
}

/* Empty Vault */
.exhibition-empty-vault {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 24px;
  background: rgba(13, 16, 23, 0.35);
  border: 1px dashed rgba(255, 255, 255, 0.1);
  border-radius: var(--sw-radius-xl);
  text-align: center;
  gap: 16px;
}

.empty-turntable-ghost {
  position: relative;
  width: 70px;
  height: 70px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.ghost-circle {
  position: absolute;
  border-radius: 50%;
  border: 1px solid var(--sw-accent);
  opacity: 0.25;
}

.g-1 { inset: 0; }
.g-2 { inset: 12px; }

.ghost-icon {
  font-size: 18px;
  color: var(--sw-accent);
}

.empty-btn-cluster {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
  justify-content: center;
  margin-top: 8px;
}

@media (max-width: 900px) {
  .stage-grid {
    grid-template-columns: 1fr;
    text-align: center;
  }
  .featured-kicker,
  .featured-action-cluster {
    justify-content: center;
  }
  .audition-ribbons {
    justify-content: center;
  }
}
</style>
