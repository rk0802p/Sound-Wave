import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';
import LoginView from '../views/LoginView.vue';
import SignupView from '../views/SignupView.vue';

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
    path: '/explore',
    name: 'Explore',
    component: () => import('../views/ExploreView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/playlist/:id',
    name: 'Playlist',
    component: () => import('../views/PlayListView.vue'),
    meta: { requiresAuth: false },
  },
  {
    path: '/playlists/:id',
    name: 'PlaylistRedirect',
    redirect: (to) => ({ path: `/playlist/${to.params.id}` }),
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
  const token = localStorage.getItem('token');
  const isAuthenticated = Boolean(token);

  // Redirect /?playlist=<id> to /playlist/<id> unless id starts with mood-
  if (to.path === '/' && to.query.playlist) {
    const playlistId = String(to.query.playlist);
    if (!playlistId.startsWith('mood-')) {
      const { playlist, ...restQuery } = to.query;
      return next({
        path: `/playlist/${playlistId}`,
        query: restQuery,
      });
    }
  }

  if (to.meta.requiresAuth && !isAuthenticated) {
    return next({ name: 'Login' });
  }

  if (to.meta.guestOnly && isAuthenticated) {
    return next({ name: 'Home' });
  }

  next();
});

export default router;
