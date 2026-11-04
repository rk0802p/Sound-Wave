import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import SignupView from '../views/SignupView.vue';
import { MOOD_PLAYLISTS } from '../data/moodPlaylists';

const routes = [
  {
    path: '/',
    name: 'Home',
    component: HomeView,
    meta: { requiresAuth: false },
  },
  {
    path: '/dashboard',
    name: 'Dashboard',
    redirect: '/',
  },
  {
    path: '/library',
    name: 'Library',
    redirect: { path: '/', hash: '#lists' },
  },
  {
    path: '/search',
    name: 'Search',
    component: () => import('../views/SearchView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/playlists/:id',
    name: 'PlaylistView',
    redirect: (to) => ({ path: '/', query: { playlist: to.params.id } }),
  },
  {
    path: '/playlist/:id',
    redirect: (to) => ({ path: '/', query: { playlist: to.params.id } }),
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
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' };
    }
    return { top: 0 };
  },
});

router.beforeEach((to, from, next) => {
  // Support instantaneous preview & test auditing with ?demo=1
  if (to.query.demo === '1' || to.query.auth === 'demo') {
    if (!localStorage.getItem('token')) {
      localStorage.setItem('token', 'demo-token-soundwave-bubble');
      localStorage.setItem(
        'user',
        JSON.stringify({
          id: 'demo-user-67c000000000000000000001',
          username: 'Acoustic Curator',
          email: 'curator@soundwave.io',
        })
      );
    }
    if (!localStorage.getItem('soundwave_bubble_playlists')) {
      localStorage.setItem('soundwave_bubble_playlists', JSON.stringify(MOOD_PLAYLISTS));
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
