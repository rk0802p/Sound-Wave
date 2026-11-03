<template>
  <div class="home-container" :class="[activeFocusSection ? 'focus-' + activeFocusSection : '']" ref="containerRef">
    <!-- Fixed Background Wash with Smooth Mood Transitions -->
    <div class="wash" id="wash" :style="{ backgroundColor: currentWashColor }"></div>

    <!-- Fixed Top Scroll Progress Bar -->
    <div id="prog" :style="{ width: scrollProgress + '%' }"></div>

    <!-- 1. HERO SECTION -->
    <section class="hero" id="hero">
      <!-- Top Brand & Curator Navigation Header -->
      <header class="hero-header">
        <div class="brand">
          <span class="orb">🎧</span>
          <span>Soundwave</span>
        </div>

        <nav class="hero-nav">
          <button
            class="header-pill-btn font-display"
            @click="showCreateModal = true"
            title="Create a new bubble playlist"
          >
            <span class="pill-icon">+</span><span class="desktop-only"> New Bubble</span>
          </button>

          <template v-if="authStore.isAuthenticated">
            <div class="user-pill glass">
              <span class="user-avatar">{{ authStore.username?.[0]?.toUpperCase() || 'U' }}</span>
              <span class="user-name">{{ authStore.username }}</span>
            </div>
            <button class="logout-btn" @click="handleLogout" title="Sign Out">
              ✕
            </button>
          </template>
          <template v-else>
            <router-link to="/login" class="login-pill-btn font-display">
              Sign In
            </router-link>
          </template>
        </nav>
      </header>

      <!-- Interactive Floating Bubbles with Mouse Parallax & Bobbing -->
      <div id="floaters">
        <div
          v-for="(fl, idx) in floatersList"
          :key="idx"
          class="fl"
          :style="{
            '--s': fl.s + 'px',
            '--k': (fl.s / 12).toFixed(1),
            left: fl.l + '%',
            top: fl.t + '%',
            translate: '-50% 0',
            animationDelay: fl.d,
          }"
        >
          <div
            class="orb"
            :style="{
              '--o1': getPresetColor(idx).o1,
              '--o2': getPresetColor(idx).o2,
              '--sh': getPresetColor(idx).o2 + '88',
            }"
          >
            {{ fl.e }}
          </div>
        </div>
      </div>

      <!-- Hero Center Headline & CTA -->
      <div class="hero-content">
        <h1 id="h1">
          <span style="--i:0">Music,</span><br />
          <span style="--i:1">but make</span><br />
          <span style="--i:2">it <b class="g">bubbly.</b></span>
        </h1>
        <p>Playlists that look as good as they sound. Scroll to find your mood.</p>
        <button class="cta" id="cta" @click="handleCtaClick">
          <svg v-if="playerStore.isPlaying" viewBox="0 0 24 24">
            <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
          </svg>
          <svg v-else viewBox="0 0 24 24">
            <path d="M7 4v16l13-8z" />
          </svg>
          <span id="ctaT">{{ playerStore.isPlaying ? 'Pause' : 'Press play' }}</span>
        </button>
      </div>

      <!-- Bouncing Scroll Cue -->
      <div class="cue" aria-hidden="true" @click="scrollToMoods">
        Scroll ↓
      </div>
    </section>

    <!-- 2. STICKY MOOD SCROLL STORY SECTION -->
    <section class="mood" id="mood" ref="moodSectionRef" aria-label="Moods">
      <div class="pin">
        <!-- Left: Text Scenes -->
        <div class="txts" id="txts">
          <div
            v-for="(p, idx) in MOOD_PLAYLISTS"
            :key="p.id"
            class="txt"
            :class="{ on: activeMoodIndex === idx && inMoodScene }"
          >
            <small>Mood</small>
            <h2>{{ p.n }}</h2>
            <p>{{ p.line }}</p>
          </div>
        </div>

        <!-- Right: Orbiting Bubbles & Central Giant Mood Bubble -->
        <div class="bigw">
          <div class="orbit" id="orbit">
            <i v-for="n in 3" :key="n">
              <span
                class="orb"
                :style="{
                  '--o1': activeMoodPreset.o1,
                  '--o2': activeMoodPreset.o2,
                  '--sh': activeMoodPreset.o2 + '88',
                }"
              ></span>
            </i>
          </div>

          <div id="bigs">
            <div
              v-for="(p, idx) in MOOD_PLAYLISTS"
              :key="p.id"
              class="orb big"
              :class="{ on: activeMoodIndex === idx && inMoodScene }"
              :style="{
                '--o1': p.o1,
                '--o2': p.o2,
                '--sh': p.o2 + '88',
              }"
            >
              {{ p.e }}
            </div>
          </div>
        </div>

        <!-- Right Side Progress Dots -->
        <div class="dots" id="dots" aria-hidden="true">
          <b
            v-for="(p, idx) in MOOD_PLAYLISTS"
            :key="idx"
            :class="{ on: activeMoodIndex === idx }"
            @click="scrollToMoodIndex(idx)"
          ></b>
        </div>
      </div>
    </section>

    <!-- 3. PLAYLISTS SECTION (Pick a bubble.) -->
    <section class="sec" id="lists">
      <h2 class="t rv">Pick a bubble.</h2>
      <p class="rv" style="--d: 100ms">
        Each playlist has its own color, its own mood. Tap one to start listening.
      </p>

      <div class="grid" id="grid">
        <button
          v-for="(p, idx) in allPlaylists"
          :key="p._id || p.id"
          class="pc glass rv"
          :style="{
            '--d': idx * 90 + 'ms',
            '--o1': p.o1 || MOOD_PLAYLISTS[idx % 5].o1,
            '--o2': p.o2 || MOOD_PLAYLISTS[idx % 5].o2,
            '--sh': (p.o2 || MOOD_PLAYLISTS[idx % 5].o2) + '88',
          }"
          :data-p="idx"
          :aria-pressed="selectedPlaylistIndex === idx ? 'true' : 'false'"
          @click="handleSelectPlaylist(p, idx, $event)"
        >
          <span class="pl">
            <svg viewBox="0 0 24 24">
              <path d="M7 4v16l13-8z" />
            </svg>
          </span>
          <span class="orb">{{ p.e || p.emoji || '🎵' }}</span>
          <div>
            <h3>{{ p.n || p.name }}</h3>
            <small>
              {{ p.songs?.length || p.t?.length || 0 }} tracks,
              {{ getPlaylistMinutes(p) }} min
            </small>
          </div>
        </button>
      </div>
    </section>

    <!-- 4. NOW PLAYING SECTION (Now playing.) -->
    <section class="sec" id="now" ref="nowSectionRef">
      <h2 class="t rv">Now playing.</h2>

      <div
        class="np glass rv"
        id="np"
        :style="{
          '--o1': currentPlaylistPreset.o1,
          '--o2': currentPlaylistPreset.o2,
          '--sh': currentPlaylistPreset.o2 + '88',
        }"
      >
        <!-- Left: Large Squishing Mood Orb & 26-bar Dynamic Visualizer -->
        <div class="npl">
          <div class="orb">{{ currentPlaylistPreset.e || currentPlaylistPreset.emoji || '🎧' }}</div>
          <div class="viz">
            <i
              v-for="b in visualizerBars"
              :key="b.id"
              :style="{
                '--d': b.delay,
                '--h': b.height,
              }"
            ></i>
          </div>
        </div>

        <!-- Right: Current Playlist Title & Tracklist Rows -->
        <div class="np-details">
          <h3 class="np-title">
            {{ currentPlaylistPreset.n || currentPlaylistPreset.name }}
          </h3>

          <div class="rows">
            <button
              v-for="(track, idx) in currentTrackList"
              :key="track._id || idx"
              class="row"
              :class="{ on: activeTrackIndex === idx }"
              :data-t="idx"
              @click="handleSelectTrack(track, idx, $event)"
            >
              <span class="n">{{ idx + 1 }}</span>
              <span class="row-meta">
                <strong>{{ track.title || track[0] }}</strong>
                <small>{{ track.artist || track[1] }}</small>
              </span>
              <small class="row-dur">{{ formatDuration(track.duration || track[2]) }}</small>
            </button>
          </div>
        </div>
      </div>
    </section>

    <!-- 5. TICKER CHIPS INFINITE MARQUEE -->
    <div class="chips" aria-hidden="true">
      <div id="chips">
        <span
          v-for="(chip, idx) in marqueeChips"
          :key="idx"
          :style="{
            '--a': chip.o1,
            '--b': chip.o2,
          }"
        >
          {{ chip.e }} {{ chip.n }}
        </span>
      </div>
    </div>

    <!-- 6. FOOTER -->
    <footer>
      <h2 class="rv">Your move.</h2>
      <p class="footer-note rv" style="--d: 120ms">
        Crafted with glossy love for Soundwave. Every frequency finds its sphere.
      </p>
    </footer>

    <!-- Fixed Floating Player Dock -->
    <FloatingPlayerDock />

    <!-- Create Playlist Modal -->
    <CreatePlaylistModal
      v-if="showCreateModal"
      @close="showCreateModal = false"
      @created="handlePlaylistCreated"
    />
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, nextTick } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import { usePlayerStore } from '../stores/player';
import { usePlaylistStore } from '../stores/playlist';
import { useAuthStore } from '../stores/auth';
import { MOOD_PLAYLISTS, formatDuration, popParticles } from '../data/moodPlaylists';
import FloatingPlayerDock from '../components/player/FloatingPlayerDock.vue';
import CreatePlaylistModal from '../components/playlists/CreatePlaylistModal.vue';

const router = useRouter();
const route = useRoute();
const playerStore = usePlayerStore();
const playlistStore = usePlaylistStore();
const authStore = useAuthStore();

const containerRef = ref(null);
const moodSectionRef = ref(null);
const nowSectionRef = ref(null);
const showCreateModal = ref(false);

const scrollProgress = ref(0);
const activeMoodIndex = ref(0);
const inMoodScene = ref(false);
const selectedPlaylistIndex = ref(0);
const activeFocusSection = computed(() => {
  return route.query.section || null;
});

// Floaters configuration from reference HTML
const floatersList = [
  { s: 130, l: 6, t: 12, e: '🎵', d: '--dl:0s' },
  { s: 90, l: 86, t: 18, e: '💜', d: '--dl:-2s' },
  { s: 170, l: 80, t: 62, e: '🎶', d: '--dl:-1s' },
  { s: 70, l: 22, t: 70, e: '✨', d: '--dl:-3s' },
  { s: 110, l: 10, t: 74, e: '🎸', d: '--dl:-4s' },
  { s: 60, l: 92, t: 40, e: '🫧', d: '--dl:-2.5s' },
  { s: 150, l: 45, t: 6, e: '🌈', d: '--dl:-5s' },
];

// Pre-generated 26 visualizer bars with pseudo-random delay and height
const visualizerBars = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  delay: ((i % 10) * 0.1).toFixed(2),
  height: (0.35 + ((i * 17) % 65) / 100).toFixed(2),
}));

// Quadrupled marquee chips for seamless infinite loop
const marqueeChips = computed(() => {
  return [
    ...MOOD_PLAYLISTS,
    ...MOOD_PLAYLISTS,
    ...MOOD_PLAYLISTS,
    ...MOOD_PLAYLISTS,
  ];
});

// All playlists combining MOOD_PLAYLISTS and any user-created playlists
const allPlaylists = computed(() => {
  if (playlistStore.playlists && playlistStore.playlists.length > 0) {
    return playlistStore.playlists;
  }
  return MOOD_PLAYLISTS;
});

const currentPlaylistPreset = computed(() => {
  const list = allPlaylists.value;
  return list[selectedPlaylistIndex.value] || MOOD_PLAYLISTS[0];
});

const activeMoodPreset = computed(() => {
  return MOOD_PLAYLISTS[activeMoodIndex.value] || MOOD_PLAYLISTS[0];
});

const currentWashColor = computed(() => {
  if (inMoodScene.value) {
    return activeMoodPreset.value.tint;
  }
  return currentPlaylistPreset.value.tint || MOOD_PLAYLISTS[0].tint;
});

const currentTrackList = computed(() => {
  const p = currentPlaylistPreset.value;
  if (p.songs && p.songs.length > 0) return p.songs;
  if (p.t && p.t.length > 0) {
    return p.t.map((item, idx) => {
      if (Array.isArray(item)) {
        return {
          _id: `t-${idx}`,
          title: item[0],
          artist: item[1],
          duration: item[2],
          url: item[3] || '',
        };
      }
      return item;
    });
  }
  return [];
});

const activeTrackIndex = computed(() => {
  return playerStore.trackIndex;
});

const getPresetColor = (idx) => {
  return MOOD_PLAYLISTS[idx % MOOD_PLAYLISTS.length];
};

const getPlaylistMinutes = (p) => {
  const songs = p.songs || p.t || [];
  const totalSecs = songs.reduce((sum, t) => {
    const sec = Array.isArray(t) ? t[2] : (t.duration || 0);
    return sum + (Number(sec) || 0);
  }, 0);
  return Math.round(totalSecs / 60);
};

// Scroll Scene logic matching reference HTML
const handleScroll = () => {
  if (typeof window === 'undefined') return;
  const sy = window.scrollY;
  const vh = window.innerHeight;
  const docHeight = document.documentElement.scrollHeight - vh;

  scrollProgress.value = docHeight > 0 ? (sy / docHeight) * 100 : 0;
  document.documentElement.style.setProperty('--sy', sy);

  if (activeFocusSection.value === 'mood') {
    inMoodScene.value = true;
    activeMoodIndex.value = 1;
    playerStore.setMoodScene(true, 1, MOOD_PLAYLISTS[1]);
    return;
  }
  if (!moodSectionRef.value) return;
  const m = moodSectionRef.value;
  const top = m.offsetTop;
  const h = m.offsetHeight - vh;
  const pr = Math.max(0, Math.min(1, (sy - top) / h));

  const currentlyInMood = sy > top - vh * 0.5 && sy < top + h + vh * 0.5;
  inMoodScene.value = currentlyInMood;

  const moodIdx = Math.min(MOOD_PLAYLISTS.length - 1, Math.floor(pr * MOOD_PLAYLISTS.length));
  activeMoodIndex.value = moodIdx;

  // Sync theme
  if (currentlyInMood) {
    const target = MOOD_PLAYLISTS[moodIdx];
    playerStore.setMoodScene(true, moodIdx, target);
  } else {
    playerStore.setMoodScene(false, 0, currentPlaylistPreset.value);
  }
};

const handlePointerMove = (e) => {
  if (e.pointerType !== 'mouse') return;
  document.documentElement.style.setProperty('--mx', e.clientX - window.innerWidth / 2);
  document.documentElement.style.setProperty('--mx2', e.clientY - window.innerHeight / 2);
};

// Play/Pause CTA click
const handleCtaClick = (event) => {
  playerStore.togglePlay();
  if (playerStore.isPlaying && event) {
    const rect = event.currentTarget.getBoundingClientRect();
    popParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 22, {
      o1: currentPlaylistPreset.value.o1,
      o2: currentPlaylistPreset.value.o2,
    });
  }
};

// Playlist selection click
const handleSelectPlaylist = (playlist, index, event) => {
  selectedPlaylistIndex.value = index;
  playlistStore.selectPlaylist(index);

  // Play immediately with real audio
  playerStore.selectPlaylist(playlist, true);

  if (event) {
    const rect = event.currentTarget.getBoundingClientRect();
    popParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 24, {
      o1: playlist.o1 || MOOD_PLAYLISTS[index % 5].o1,
      o2: playlist.o2 || MOOD_PLAYLISTS[index % 5].o2,
    });
  }

  // Smooth scroll into Now Playing
  setTimeout(() => {
    if (nowSectionRef.value) {
      nowSectionRef.value.scrollIntoView({ behavior: 'smooth' });
    }
  }, 450);
};

// Track row selection click
const handleSelectTrack = (track, index, event) => {
  playerStore.playTrack(track, currentTrackList.value, index);
  if (event) {
    const rect = event.currentTarget.getBoundingClientRect();
    popParticles(rect.left + rect.width / 2, rect.top + rect.height / 2, 14, {
      o1: currentPlaylistPreset.value.o1,
      o2: currentPlaylistPreset.value.o2,
    });
  }
};

const scrollToMoods = () => {
  if (moodSectionRef.value) {
    moodSectionRef.value.scrollIntoView({ behavior: 'smooth' });
  }
};

const scrollToMoodIndex = (idx) => {
  if (activeFocusSection.value === 'mood') {
    inMoodScene.value = true;
    activeMoodIndex.value = 1;
    playerStore.setMoodScene(true, 1, MOOD_PLAYLISTS[1]);
    return;
  }
  if (!moodSectionRef.value) return;
  const m = moodSectionRef.value;
  const top = m.offsetTop;
  const h = m.offsetHeight - window.innerHeight;
  const step = h / MOOD_PLAYLISTS.length;
  window.scrollTo({
    top: top + step * idx + 10,
    behavior: 'smooth',
  });
};

const handleLogout = () => {
  authStore.logout();
  router.push('/login');
};

const handlePlaylistCreated = (newPlaylist) => {
  const idx = allPlaylists.value.findIndex((p) => p._id === newPlaylist._id);
  if (idx !== -1) {
    handleSelectPlaylist(newPlaylist, idx, null);
  }
};

onMounted(() => {
  // Sync initial theme
  playerStore.setTheme(currentPlaylistPreset.value.o1, currentPlaylistPreset.value.o2, currentPlaylistPreset.value.tint);

  handleScroll();
  window.addEventListener('scroll', handleScroll, { passive: true });
  window.addEventListener('resize', handleScroll);
  window.addEventListener('pointermove', handlePointerMove);

  // IntersectionObserver for .rv elements
  nextTick(() => {
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('in');
            io.unobserve(e.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    document.querySelectorAll('.rv').forEach((el) => io.observe(el));
  });

  const executeScrollParam = () => {
    try {
      const sp = new URLSearchParams(window.location.search).get('scroll');
      if (sp === 'mood') {
        const m = moodSectionRef.value || document.getElementById('mood');
        if (m) {
          const top = m.offsetTop;
          const h = m.offsetHeight - window.innerHeight;
          window.scrollTo(0, top + h * 0.35);
        } else {
          window.scrollTo(0, 1600);
        }
        handleScroll();
      } else if (sp === 'lists') {
        const listsEl = document.getElementById('lists');
        if (listsEl) {
          listsEl.scrollIntoView();
        } else {
          window.scrollTo(0, 4800);
        }
        handleScroll();
      } else if (sp === 'now') {
        const nowEl = document.getElementById('now');
        if (nowEl) {
          nowEl.scrollIntoView();
        } else {
          window.scrollTo(0, 5600);
        }
        handleScroll();
      }
    } catch (e) {
      console.warn('Scroll execution error:', e);
    }
  };

  executeScrollParam();
  nextTick(() => executeScrollParam());
  setTimeout(() => executeScrollParam(), 100);
  setTimeout(() => executeScrollParam(), 350);
});

onUnmounted(() => {
  window.removeEventListener('scroll', handleScroll);
  window.removeEventListener('resize', handleScroll);
  window.removeEventListener('pointermove', handlePointerMove);
});
</script>

<style scoped>
.home-container {
  position: relative;
  width: 100%;
  overflow-x: hidden;
}

@media (max-width: 600px) {
  .desktop-only { display: none !important; }
}
@media (min-width: 601px) {
  .mobile-only { display: none !important; }
}

@media (max-width: 600px) {
  .hero {
    padding: 4.5rem 1rem 2.5rem !important;
  }
  .hero p {
    font-size: 1.05rem !important;
    max-width: 28ch !important;
  }
  .hero h1 {
    font-size: clamp(2.8rem, 13vw, 4.5rem) !important;
  }
  .hero-header {
    left: 1rem !important;
    right: 1rem !important;
    top: 1rem !important;
  }
  .login-pill-btn {
    padding: 0.4rem 0.85rem !important;
    font-size: 0.82rem !important;
    white-space: nowrap !important;
  }
}

/* 1. HERO */
.hero {
  position: relative;
  min-height: 100svh;
  width: 100%;
  max-width: 100vw;
  box-sizing: border-box;
  display: grid;
  place-items: center;
  text-align: center;
  padding: 5rem 1.25rem 3rem;
  overflow: hidden;
}

.hero-header {
  position: absolute;
  top: 1.2rem;
  left: 1.5rem;
  right: 1.5rem;
  width: auto;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: space-between;
  z-index: 10;
}

.brand {
  font: 800 1.4rem "Bricolage Grotesque", sans-serif;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--ink);
}

.brand .orb {
  width: 30px;
  height: 30px;
  font-size: 0.9rem;
  box-shadow: inset -4px -6px 10px rgba(0, 0, 0, 0.15), inset 3px 4px 8px rgba(255, 255, 255, 0.6);
}

.hero-nav {
  display: flex;
  align-items: center;
  gap: 0.8rem;
}

.header-pill-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.5rem 1.1rem;
  border-radius: 99px;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.9);
  color: var(--ink);
  font-size: 0.92rem;
  font-weight: 700;
  box-shadow: 0 6px 16px rgba(120, 80, 200, 0.1);
  transition: transform 0.2s, background 0.2s;
}

.header-pill-btn:hover {
  transform: translateY(-2px);
  background: #ffffff;
}

.login-pill-btn {
  padding: 0.5rem 1.1rem;
  border-radius: 99px;
  background: linear-gradient(180deg, #9b7bff, #6a4de0);
  color: #fff;
  font-size: 0.92rem;
  font-weight: 700;
  box-shadow: 0 6px 16px rgba(106, 77, 224, 0.35);
  transition: transform 0.2s;
}

.login-pill-btn:hover {
  transform: translateY(-2px);
}

.user-pill {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.35rem 0.8rem 0.35rem 0.4rem;
  border-radius: 99px;
}

.user-avatar {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  background: var(--ink);
  color: #fff;
  display: grid;
  place-items: center;
  font-size: 0.75rem;
  font-weight: 800;
}

.user-name {
  font-size: 0.88rem;
  font-weight: 700;
  color: var(--ink);
}

.logout-btn {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.6);
  border: 1px solid rgba(255, 255, 255, 0.9);
  font-size: 0.8rem;
  font-weight: 700;
  color: var(--muted);
  display: grid;
  place-items: center;
  transition: all 0.2s;
}

.logout-btn:hover {
  background: #ff4f9a;
  color: #fff;
}

.hero-content {
  position: relative;
  z-index: 3;
}

.hero h1 {
  font-size: clamp(3.4rem, 11vw, 9.5rem);
  position: relative;
  z-index: 3;
  margin: 0;
  line-height: 0.95;
}

.hero h1 span {
  display: inline-block;
  opacity: 0;
  transform: translateY(70%) scale(0.7);
  animation: pop 0.9s cubic-bezier(0.2, 1.7, 0.3, 1) forwards;
  animation-delay: calc(var(--i) * 120ms + 200ms);
}

.hero h1 .g {
  background: linear-gradient(100deg, #ff6fb5, #9b7bff, #4cb8ff);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

@keyframes pop {
  to {
    opacity: 1;
    transform: none;
  }
}

.hero p {
  position: relative;
  z-index: 3;
  max-width: 36ch;
  margin: 1.4rem auto 2rem;
  color: var(--muted);
  font-size: 1.2rem;
}

.cta {
  position: relative;
  z-index: 3;
  display: inline-flex;
  align-items: center;
  gap: 0.7rem;
  padding: 1rem 1.9rem;
  border-radius: 99px;
  font-weight: 700;
  font-size: 1.1rem;
  color: #fff;
  background: linear-gradient(180deg, #9b7bff, #6a4de0);
  box-shadow: inset 0 3px 6px rgba(255, 255, 255, 0.5), 0 14px 30px rgba(106, 77, 224, 0.45);
  transition: transform 0.25s cubic-bezier(0.2, 2, 0.4, 1);
}

.cta:hover {
  transform: scale(1.08) translateY(-3px);
}

.cta:active {
  transform: scale(0.93);
}

.fl {
  position: absolute;
  z-index: 1;
  will-change: transform;
  transform: translate(
    calc(var(--mx, 0) * var(--k) * 1px),
    calc(var(--mx2, 0) * var(--k) * 1px + var(--sy, 0) * var(--k) * -0.35px)
  );
  width: var(--s);
  height: var(--s);
}

.fl .orb {
  width: 100%;
  height: 100%;
  font-size: calc(var(--s) * 0.4);
  animation: bob 6s ease-in-out infinite;
  animation-delay: var(--dl);
}

@keyframes bob {
  50% {
    transform: translateY(-26px) rotate(8deg) scale(1.04);
  }
}

:global(.playing) .fl .orb {
  animation-duration: 1.4s;
}

.cue {
  position: absolute;
  bottom: 1.4rem;
  left: 50%;
  translate: -50% 0;
  z-index: 3;
  color: var(--muted);
  font-weight: 700;
  animation: nud 1.6s ease-in-out infinite;
  cursor: pointer;
}

@keyframes nud {
  50% {
    transform: translateY(8px);
  }
}

@media (max-width: 480px) {
  .hero-header {
    left: 0.75rem !important;
    right: 0.75rem !important;
    top: 0.75rem !important;
    width: auto !important;
  }
  .brand {
    font-size: 1.1rem !important;
    gap: 0.35rem !important;
  }
  .brand .orb {
    width: 24px !important;
    height: 24px !important;
    font-size: 0.75rem !important;
  }
  .hero-nav {
    gap: 0.35rem !important;
    flex-shrink: 0;
  }
  .header-pill-btn span:not(.pill-icon) {
    display: none !important;
  }
  .header-pill-btn {
    width: 28px !important;
    height: 28px !important;
    padding: 0 !important;
    justify-content: center;
    border-radius: 50% !important;
    font-size: 1rem !important;
  }
  .login-pill-btn {
    padding: 0.35rem 0.7rem !important;
    font-size: 0.78rem !important;
    white-space: nowrap;
  }
}

/* 2. MOOD SCROLL STORY */
.mood {
  height: 560vh;
  position: relative;
}

.pin {
  position: sticky;
  top: 0;
  height: 100svh;
  display: grid;
  grid-template-columns: 1fr 1fr;
  align-items: center;
  gap: 2rem;
  padding: 0 6vw;
  max-width: 1300px;
  margin: 0 auto;
}

.txts {
  display: grid;
}

.txt {
  grid-area: 1/1;
  opacity: 0;
  transform: translateY(60px) scale(0.96);
  transition: opacity 0.6s, transform 0.7s cubic-bezier(0.2, 1.4, 0.3, 1);
  pointer-events: none;
}

.txt.on {
  opacity: 1;
  transform: none;
  pointer-events: auto;
}

.txt small {
  font-weight: 700;
  color: var(--muted);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.txt h2 {
  font-size: clamp(3rem, 8vw, 7rem);
  margin: 0.6rem 0 1rem;
}

.txt p {
  font-size: 1.25rem;
  max-width: 30ch;
  color: var(--muted);
}

.bigw {
  position: relative;
  display: grid;
  place-items: center;
  aspect-ratio: 1;
  max-width: 520px;
  width: 100%;
  margin-left: auto;
}

.big {
  position: absolute;
  width: 82%;
  aspect-ratio: 1;
  font-size: clamp(5rem, 14vw, 10rem);
  opacity: 0;
  transform: scale(0.3) rotate(-30deg);
  transition: opacity 0.6s, transform 0.9s cubic-bezier(0.2, 1.6, 0.3, 1);
}

.big.on {
  opacity: 1;
  transform: none;
  animation: squish 4s ease-in-out infinite 0.9s;
}

@keyframes squish {
  50% {
    transform: scale(1.04, 0.97);
  }
}

.orbit {
  position: absolute;
  inset: 0;
  animation: rot 12s linear infinite;
}

.orbit i {
  position: absolute;
  left: 50%;
  top: -2%;
  width: 15%;
  aspect-ratio: 1;
  translate: -50% 0;
}

.orbit i:nth-child(2) {
  top: auto;
  bottom: 6%;
  left: 8%;
  width: 10%;
}

.orbit i:nth-child(3) {
  top: 38%;
  left: auto;
  right: -4%;
  width: 8%;
}

.orbit .orb {
  width: 100%;
  height: 100%;
  box-shadow: inset -5px -7px 12px rgba(0, 0, 0, 0.15), inset 4px 5px 9px rgba(255, 255, 255, 0.6), 0 12px 20px var(--sh);
}

@keyframes rot {
  to {
    transform: rotate(360deg);
  }
}

.dots {
  position: absolute;
  right: 2.5vw;
  top: 50%;
  translate: 0 -50%;
  display: grid;
  gap: 0.7rem;
}

.dots b {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: rgba(43, 29, 90, 0.2);
  transition: 0.4s;
  cursor: pointer;
}

.dots b.on {
  background: var(--ink);
  transform: scale(1.5);
}

@media (max-width: 820px) {
  .pin {
    grid-template-columns: 1fr;
    align-content: center;
    padding-top: 2rem;
  }
  .bigw {
    max-width: 300px;
    margin: 0 auto;
    order: -1;
  }
  .txt {
    text-align: center;
  }
  .txt p {
    margin: 0 auto;
  }
  .dots {
    display: none;
  }
}

/* 3. PLAYLISTS SECTION */
.sec {
  max-width: 1160px;
  margin: 0 auto;
  padding: 7rem 1.25rem 2rem;
}

.sec h2.t {
  font-size: clamp(2.6rem, 7vw, 5.5rem);
  margin-bottom: 0.8rem;
}

.sec > p {
  color: var(--muted);
  max-width: 44ch;
  font-size: 1.2rem;
  margin: 0 0 2.5rem;
}

.grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
  gap: 1.4rem;
}

.pc {
  position: relative;
  text-align: left;
  border-radius: 38px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.6rem;
  overflow: hidden;
  transition: transform 0.3s;
}

.pc .orb {
  width: 96px;
  height: 96px;
  font-size: 2.6rem;
  transition: transform 0.5s cubic-bezier(0.2, 3, 0.4, 1);
}

.pc:hover .orb {
  transform: scale(1.18, 0.9) rotate(-8deg);
}

.pc h3 {
  font-size: 1.7rem;
}

.pc small {
  color: var(--muted);
  font-weight: 700;
}

.pc .pl {
  position: absolute;
  right: 1.1rem;
  top: 1.1rem;
  width: 46px;
  height: 46px;
  border-radius: 50%;
  background: #fff;
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
  display: grid;
  place-items: center;
  transition: transform 0.3s;
}

.pc:hover .pl {
  transform: scale(1.2);
}

.pc[aria-pressed="true"] {
  outline: 3px solid var(--ink);
  outline-offset: 3px;
}

/* 4. NOW PLAYING */
.np {
  display: grid;
  grid-template-columns: 0.9fr 1.1fr;
  gap: 2.5rem;
  align-items: center;
  border-radius: 48px;
  padding: clamp(1.5rem, 4vw, 3rem);
}

@media (max-width: 820px) {
  .np {
    grid-template-columns: 1fr;
  }
}

.npl {
  display: grid;
  place-items: center;
  gap: 1.5rem;
}

.npl .orb {
  width: min(300px, 64vw);
  aspect-ratio: 1;
  font-size: 5rem;
  animation: squish 3s ease-in-out infinite;
}

.viz {
  display: flex;
  align-items: flex-end;
  gap: 5px;
  height: 70px;
  width: 100%;
}

.viz i {
  flex: 1;
  height: 100%;
  border-radius: 99px;
  background: linear-gradient(180deg, var(--o1), var(--o2));
  transform: scaleY(0.12);
  transform-origin: bottom;
  animation: bar 1s ease-in-out infinite alternate;
  animation-delay: calc(var(--d) * -1s);
}

:global(.playing) .viz i {
  animation-duration: 0.45s;
}

@keyframes bar {
  to {
    transform: scaleY(var(--h));
  }
}

.np-title {
  font-size: 2.6rem;
  margin-bottom: 1.2rem;
}

.rows {
  display: grid;
  gap: 0.5rem;
}

.row {
  display: grid;
  grid-template-columns: 2.4rem 1fr auto;
  gap: 1rem;
  align-items: center;
  text-align: left;
  padding: 0.85rem 1.1rem;
  border-radius: 99px;
  transition: transform 0.3s cubic-bezier(0.2, 2, 0.4, 1), background 0.2s;
}

.row:hover {
  transform: translateX(10px) scale(1.02);
  background: rgba(255, 255, 255, 0.8);
}

.row.on {
  background: #fff;
  box-shadow: 0 10px 24px rgba(120, 80, 200, 0.2);
}

.row strong {
  display: block;
  line-height: 1.2;
}

.row small {
  color: var(--muted);
}

.row .n {
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 50%;
  display: grid;
  place-items: center;
  font-weight: 700;
  background: rgba(43, 29, 90, 0.07);
}

.row.on .n {
  background: linear-gradient(var(--o1), var(--o2));
  color: #fff;
}

/* 5. CHIPS TICKER */
.chips {
  overflow: hidden;
  margin: 6rem 0 0;
  padding: 1rem 0;
}

.chips div {
  display: flex;
  gap: 1rem;
  width: max-content;
  animation: mq 30s linear infinite;
}

.chips:hover div {
  animation-play-state: paused;
}

.chips span {
  padding: 0.8rem 1.6rem;
  border-radius: 99px;
  font: 800 1.4rem "Bricolage Grotesque", sans-serif;
  background: linear-gradient(180deg, var(--a), var(--b));
  box-shadow: inset 0 3px 6px rgba(255, 255, 255, 0.7), 0 10px 20px rgba(0, 0, 0, 0.08);
  color: var(--ink);
}

@keyframes mq {
  to {
    transform: translateX(-50%);
  }
}

/* 6. FOOTER */
footer {
  text-align: center;
  padding: 5rem 1rem 9rem;
}

footer h2 {
  font-size: clamp(2.6rem, 8vw, 6rem);
}

.footer-note {
  color: var(--muted);
  font-size: 1.1rem;
  margin-top: 1rem;
}
</style>

<style>
/* Focus Modes for Direct Section Auditing & Headless Verification */
.home-container.focus-mood #hero,
.home-container.focus-mood #lists,
.home-container.focus-mood #now,
.home-container.focus-mood .chips,
.home-container.focus-mood footer {
  display: none !important;
}
.home-container.focus-mood .mood {
  height: 100vh !important;
}
.home-container.focus-mood .txt.on {
  opacity: 1 !important;
  transform: none !important;
}
.home-container.focus-mood .big.on {
  opacity: 1 !important;
  transform: none !important;
}

.home-container.focus-lists #hero,
.home-container.focus-lists .mood,
.home-container.focus-lists .chips,
.home-container.focus-lists footer {
  display: none !important;
}
.home-container.focus-lists #lists {
  padding-top: 3rem !important;
}
.home-container.focus-lists .rv {
  opacity: 1 !important;
  transform: none !important;
}

.home-container.focus-now #hero,
.home-container.focus-now .mood,
.home-container.focus-now #lists,
.home-container.focus-now .chips,
.home-container.focus-now footer {
  display: none !important;
}
.home-container.focus-now #now {
  padding-top: 3rem !important;
}
.home-container.focus-now .rv {
  opacity: 1 !important;
  transform: none !important;
}
</style>