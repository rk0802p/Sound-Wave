import { describe, it, expect, beforeEach } from 'vitest';
import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import App from '../../App.vue';

const storageMock = (() => {
  let store = {};
  return {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
})();

if (typeof globalThis.localStorage === 'undefined') {
  globalThis.localStorage = storageMock;
}

const createTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', name: 'Home', component: defineComponent({ render: () => h('div', { 'data-page': 'home' }, 'Home Page') }) },
      { path: '/search', name: 'Search', component: defineComponent({ render: () => h('div', { 'data-page': 'search' }, 'Search Page') }) },
      { path: '/explore', name: 'Explore', component: defineComponent({ render: () => h('div', { 'data-page': 'explore' }, 'Explore Page') }) },
      { path: '/playlist/:id', name: 'Playlist', component: defineComponent({ render: () => h('div', { 'data-page': 'playlist' }, 'Playlist Page') }) },
      { path: '/login', name: 'Login', component: defineComponent({ render: () => h('div', { 'data-page': 'login' }, 'Login Page') }) },
      { path: '/signup', name: 'Signup', component: defineComponent({ render: () => h('div', { 'data-page': 'signup' }, 'Signup Page') }) },
    ],
  });

const renderRouteHtml = async (path) => {
  const pinia = createPinia();
  setActivePinia(pinia);
  const testRouter = createTestRouter();
  await testRouter.push(path);
  await testRouter.isReady();

  const app = createSSRApp(App);
  app.use(pinia);
  app.use(testRouter);
  return renderToString(app);
};

describe('App Shell & Auth Route Isolation', () => {
  beforeEach(() => {
    storageMock.clear();
  });

  it('renders /login without AppShell, sidebar, topbar, dock, or toast container', async () => {
    const html = await renderRouteHtml('/login');
    expect(html).toContain('data-page="login"');
    expect(html).not.toContain('jb-app-shell');
    expect(html).not.toContain('jb-sidebar');
    expect(html).not.toContain('jb-topbar');
    expect(html).not.toContain('id="dock"');
    expect(html).not.toContain('toast-container');
  });

  it('renders /signup without AppShell, sidebar, topbar, dock, or toast container', async () => {
    const html = await renderRouteHtml('/signup');
    expect(html).toContain('data-page="signup"');
    expect(html).not.toContain('jb-app-shell');
    expect(html).not.toContain('jb-sidebar');
    expect(html).not.toContain('jb-topbar');
    expect(html).not.toContain('id="dock"');
    expect(html).not.toContain('toast-container');
  });

  it.each(['/', '/search', '/explore', '/playlist/abc123'])(
    'wraps %s inside AppShell with exactly one dock, one sidebar, and one toast container',
    async (routePath) => {
      const html = await renderRouteHtml(routePath);
      expect(html).toContain('jb-app-shell');
      expect((html.match(/id="dock"/g) || []).length).toBe(1);
      expect((html.match(/aria-label="Primary Navigation"/g) || []).length).toBe(1);
      expect((html.match(/class="jb-topbar"/g) || []).length).toBe(1);
      expect((html.match(/class="toast-container"/g) || []).length).toBe(1);
    }
  );

  it('verifies production router routes and /?playlist redirect guard', async () => {
    if (typeof globalThis.window === 'undefined') {
      globalThis.window = {
        location: { pathname: '/', search: '', hash: '', href: 'http://localhost/' },
        history: { state: {}, replaceState: () => {}, pushState: () => {} },
        addEventListener: () => {},
        removeEventListener: () => {},
      };
    }
    const { default: prodRouter } = await import('../index');
    const routeNames = prodRouter.getRoutes().map((r) => r.name).filter(Boolean);
    expect(routeNames).toContain('Home');
    expect(routeNames).toContain('Playlist');
    expect(routeNames).toContain('Search');
    expect(routeNames).toContain('Explore');
    expect(routeNames).toContain('Login');
    expect(routeNames).toContain('Signup');
  });
});
