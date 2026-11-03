import { createRouter, createWebHistory } from 'vue-router';

// Views
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import SignupView from '../views/SignupView.vue';
import PlayListView from '../views/PlayListView.vue';
import LibraryView from '../views/LibraryView.vue';
import SearchView from '../views/SearchView.vue';

import { CURATED_DEMO_TRACKS, PLAYLIST_COVER_PRESETS } from '../data/demoTracks';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    meta: { requiresAuth: true },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    component: HomeView,
    meta: { requiresAuth: true },
  },
  {
    path: '/library',
    name: 'Library',
    component: LibraryView,
    meta: { requiresAuth: true },
  },
  {
    path: '/search',
    name: 'Search',
    component: SearchView,
    meta: { requiresAuth: true },
  },
  {
    path: '/playlists/:id',
    name: 'PlaylistView',
    component: PlayListView,
    meta: { requiresAuth: true },
  },
  {
    path: '/playlist/:id',
    redirect: (to) => `/playlists/${to.params.id}`,
  },
  {
    path: '/login',
    name: 'Login',
    component: LoginView,
    meta: { guestOnly: true },
  },
  {
    path: '/signup',
    name: 'Signup',
    component: SignupView,
    meta: { guestOnly: true },
  },
  {
    path: '/:pathMatch(.*)*',
    redirect: '/',
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 };
  },
});

router.beforeEach((to, from, next) => {
  // Support instantaneous preview & test auditing with ?demo=1
  if (to.query.demo === '1' || to.query.auth === 'demo') {
    if (!localStorage.getItem('token')) {
      localStorage.setItem('token', 'demo-token-soundwave-atelier');
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: 'demo-user-67c000000000000000000001',
          username: 'Acoustic Curator',
          email: 'curator@soundwave.internal',
        })
      );
    }
    if (!localStorage.getItem('soundwave_offline_playlists')) {
      const defaultArchive = [
        {
          _id: 'archive-67c000000000000000000001',
          name: 'Nocturnal Resonance Atelier',
          description: 'Handcrafted selection of verified high-fidelity ambient, classical, and electronic audio streams.',
          coverImage: PLAYLIST_COVER_PRESETS[1].url,
          isPublic: true,
          user: { username: 'Acoustic Curator' },
          songs: CURATED_DEMO_TRACKS.map((t, idx) => ({ ...t, _id: `song-${idx + 1}`, position: idx })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          _id: 'archive-67c000000000000000000002',
          name: 'Analog Neon Voltage',
          description: 'Pure analog synthesis, 80s tape compression, and late-night highway arpeggios.',
          coverImage: PLAYLIST_COVER_PRESETS[3].url,
          isPublic: true,
          user: { username: 'Acoustic Curator' },
          songs: CURATED_DEMO_TRACKS.slice(2, 5).map((t, idx) => ({ ...t, _id: `neon-song-${idx + 1}`, position: idx })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          _id: 'archive-67c000000000000000000003',
          name: 'Deep Spatial Reverberations',
          description: 'Hypnotic sub-bass, organic drones, and spatial architectural acoustics.',
          coverImage: PLAYLIST_COVER_PRESETS[0].url,
          isPublic: true,
          user: { username: 'Acoustic Curator' },
          songs: CURATED_DEMO_TRACKS.slice(0, 3).map((t, idx) => ({ ...t, _id: `deep-song-${idx + 1}`, position: idx })),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ];
      localStorage.setItem('soundwave_offline_playlists', JSON.stringify(defaultArchive));
    }
  }

  const token = localStorage.getItem('token');
  const isAuthenticated = Boolean(token);

  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'Login' });
  }

  if (to.meta.guestOnly && isAuthenticated) {
    return next({ name: 'Home' });
  }

  next();
});

export default router;
