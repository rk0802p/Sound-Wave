import { describe, it, expect, beforeEach } from 'vitest';
import { createSSRApp, defineComponent, h } from 'vue';
import { renderToString } from 'vue/server-renderer';
import { createPinia, setActivePinia } from 'pinia';
import { createRouter, createMemoryHistory } from 'vue-router';
import AppShell from '../AppShell.vue';
import { useUiStore } from '../../../stores/ui';

if (typeof globalThis.localStorage === 'undefined') {
  let store = {};
  globalThis.localStorage = {
    getItem: (k) => (k in store ? store[k] : null),
    setItem: (k, v) => { store[k] = String(v); },
    removeItem: (k) => { delete store[k]; },
    clear: () => { store = {}; },
  };
}

const createFullTestRouter = () =>
  createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/', component: defineComponent({ render: () => h('div', 'Slot Content') }) },
      { path: '/search', component: defineComponent({ render: () => h('div', 'Search') }) },
      { path: '/explore', component: defineComponent({ render: () => h('div', 'Explore') }) },
      { path: '/playlist/:id', component: defineComponent({ render: () => h('div', 'Playlist') }) },
      { path: '/login', component: defineComponent({ render: () => h('div', 'Login') }) },
      { path: '/signup', component: defineComponent({ render: () => h('div', 'Signup') }) },
    ],
  });

describe('AppShell & UI Store', () => {
  beforeEach(() => {
    globalThis.localStorage.clear();
    setActivePinia(createPinia());
  });

  it('renders SideNav, TopBar, FloatingPlayerDock, QueueDrawer toggle, and ToastContainer once', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);

    const router = createFullTestRouter();
    await router.push('/playlist/6af379');
    await router.isReady();

    const app = createSSRApp({
      render: () => h(AppShell, null, {
        default: () => h('div', { id: 'child-view' }, 'Inner Playlist Content'),
      }),
    });
    app.use(pinia);
    app.use(router);

    const html = await renderToString(app);

    expect(html).toContain('Inner Playlist Content');
    expect(html).toContain('--dock-height:88px');
    expect((html.match(/id="dock"/g) || []).length).toBe(1);
    expect((html.match(/aria-label="Open navigation menu"/g) || []).length).toBe(1);
    expect((html.match(/class="toast-container"/g) || []).length).toBe(1);
    expect(html).toContain('SOUNDWAVE');
    expect(html).toContain('PLAYLIST');
  });

  it('renders QueueDrawer once when uiStore.isQueueOpen is true', async () => {
    const pinia = createPinia();
    setActivePinia(pinia);
    const uiStore = useUiStore();
    uiStore.openQueue();

    const router = createFullTestRouter();
    await router.push('/');
    await router.isReady();

    const app = createSSRApp({
      render: () => h(AppShell, null, { default: () => h('div', 'Home') }),
    });
    app.use(pinia);
    app.use(router);

    const html = await renderToString(app);
    expect((html.match(/aria-label="Up Next Queue"/g) || []).length).toBe(1);
  });

  it('manages genre, mood, favorites, and sidebar state via useUiStore', () => {
    const ui = useUiStore();
    expect(ui.isSidebarCollapsed).toBe(false);
    expect(ui.isMobileSidebarOpen).toBe(false);

    ui.selectGenre('Latin');
    expect(ui.selectedGenre).toBe('Latin');
    expect(ui.activeFilter).toBe('genre');
    expect(ui.activeMoodId).toBe('');

    ui.selectMood({ id: 'mood-chill', name: 'Chill' });
    expect(ui.activeFilter).toBe('mood');
    expect(ui.activeMoodId).toBe('mood-chill');
    expect(ui.selectedGenre).toBe('');

    ui.selectFavorites();
    expect(ui.activeFilter).toBe('favorites');

    const added = ui.toggleFavorite({ id: 'trk-1', title: 'Track 1' });
    expect(added).toBe(true);
    expect(ui.isFavoriteTrack({ id: 'trk-1' })).toBe(true);
    const removed = ui.toggleFavorite({ id: 'trk-1', title: 'Track 1' });
    expect(removed).toBe(false);

    ui.clearAllFilters();
    expect(ui.activeFilter).toBe('');
    expect(ui.selectedGenre).toBe('');
    expect(ui.activeMoodId).toBe('');
  });
});
