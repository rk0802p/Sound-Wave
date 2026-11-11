import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { useUiStore } from '../ui';
import { usePlaylistStore } from '../playlist';
import {
  FAVORITES_STORAGE_KEY,
  FAVORITE_TRACKS_META_KEY,
  getCanonicalFavoriteId,
  calculateTotalDurationSeconds,
  formatPlaylistDurationReadable,
} from '../../utils/favorites';

const storageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((k) => (k in store ? store[k] : null)),
    setItem: vi.fn((k, v) => { store[k] = String(v); }),
    removeItem: vi.fn((k) => { delete store[k]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
globalThis.localStorage = storageMock;

describe('Canonical Favorites Identity & Liked Count Reconciliation', () => {
  beforeEach(() => {
    storageMock.clear();
    vi.clearAllMocks();
    setActivePinia(createPinia());
  });

  it('handles malformed localStorage JSON and non-array entries safely', () => {
    localStorage.setItem(FAVORITES_STORAGE_KEY, '{not-valid-json');
    localStorage.setItem(FAVORITE_TRACKS_META_KEY, '[]');

    const ui = useUiStore();
    expect(() => ui.loadFavorites()).not.toThrow();
    expect(ui.favoriteCount).toBe(0);
    expect(ui.likedTracks).toEqual([]);

    localStorage.setItem(FAVORITES_STORAGE_KEY, JSON.stringify([null, 123, '', '   ', {}]));
    ui.loadFavorites();
    expect(ui.favoriteCount).toBe(0);
    expect(ui.rawFavoriteIds).toEqual([]);
  });

  it('deduplicates duplicate IDs and resolves song aliases onto a single canonical ID', () => {
    // song-one-kiss (Mood playlists) and jamendo-1580571 (Featured catalog) are the exact same track
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify([
        'jamendo-1580571',
        'jamendo-1580571',
        'song-one-kiss',
        'jamendo:1580571',
        'jamendo-2139839',
      ])
    );

    const ui = useUiStore();
    ui.loadFavorites();

    expect(ui.favoriteCount).toBe(2);
    expect(ui.likedTracks).toHaveLength(2);
    expect(ui.favoritesList).toEqual(['jamendo-1580571', 'jamendo-2139839']);
  });

  it('treats id and _id representations of the same track as one canonical favorite', () => {
    const ui = useUiStore();

    const addedFirst = ui.toggleFavorite({
      id: 'jamendo-1580571',
      title: 'Deep house',
      artist: 'Cooloop',
      provider: 'jamendo',
      providerTrackId: '1580571',
    });
    expect(addedFirst).toBe(true);
    expect(ui.favoriteCount).toBe(1);

    // Clicking favorite on the same track represented only with Mongo _id and provider metadata toggles it OFF
    const toggledSecond = ui.toggleFavorite({
      _id: '6af464ea6603b5da20700599',
      title: 'Deep house',
      artist: 'Cooloop',
      provider: 'jamendo',
      providerTrackId: '1580571',
    });
    expect(toggledSecond).toBe(false);
    expect(ui.favoriteCount).toBe(0);
    expect(ui.likedTracks).toHaveLength(0);
  });

  it('adds and removes favorites consistently across sidebar count, header count, and liked list', () => {
    const ui = useUiStore();

    ui.toggleFavorite({ id: 'jamendo-1580571', title: 'Deep house', duration: 125 });
    ui.toggleFavorite({ _id: 'jamendo-2139839', title: 'Atmospheric Piano for Nature', duration: 190 });

    expect(ui.favoriteCount).toBe(2);
    expect(ui.favoritesList.length).toBe(2);
    expect(ui.likedTracks.length).toBe(2);
    expect(ui.isFavoriteTrack({ id: 'jamendo-1580571' })).toBe(true);
    expect(ui.isFavoriteTrack({ _id: 'jamendo-2139839' })).toBe(true);

    ui.toggleFavorite({ _id: 'jamendo-1580571' });
    expect(ui.favoriteCount).toBe(1);
    expect(ui.likedTracks).toHaveLength(1);
    expect(ui.likedTracks[0].canonicalId).toBe('jamendo-2139839');
  });

  it('excludes unresolvable stale IDs from badge/header count while keeping valid non-featured favorites', () => {
    // 1 featured track + 1 stale ghost ID + 1 valid playlist track from user's library
    localStorage.setItem(
      FAVORITES_STORAGE_KEY,
      JSON.stringify(['jamendo-1580571', 'stale-deleted-track-xyz', 'deezer-987654'])
    );

    const playlistStore = usePlaylistStore();
    playlistStore.playlists = [
      {
        _id: 'pl-1',
        name: 'My Mix',
        songs: [
          {
            _id: 'mongo-song-1',
            title: 'Preview Track',
            artist: 'Preview Artist',
            duration: 30,
            provider: 'deezer',
            providerTrackId: '987654',
          },
        ],
      },
    ];

    const ui = useUiStore();
    ui.loadFavorites();

    expect(ui.favoriteCount).toBe(2);
    expect(ui.likedTracks.map((t) => t.canonicalId)).toEqual(['jamendo-1580571', 'deezer-987654']);
  });

  it('persists non-featured supported search tracks when toggled as favorites', () => {
    const ui = useUiStore();

    const added = ui.toggleFavorite({
      id: 'deezer:555111',
      title: 'Neon Drive',
      artist: 'CityLights',
      duration: 30,
      provider: 'deezer',
      providerTrackId: '555111',
      streamUrl: 'https://cdns-preview-d.dzcdn.net/sample.mp3',
    });

    expect(added).toBe(true);
    expect(getCanonicalFavoriteId({ id: 'deezer:555111', provider: 'deezer', providerTrackId: '555111' })).toBe('deezer-555111');
    expect(ui.favoriteCount).toBe(1);
    expect(ui.likedTracks[0].title).toBe('Neon Drive');

    // Re-load from localStorage in a fresh Pinia instance
    setActivePinia(createPinia());
    const freshUi = useUiStore();
    freshUi.loadFavorites();
    expect(freshUi.favoriteCount).toBe(1);
    expect(freshUi.likedTracks[0].title).toBe('Neon Drive');
  });

  it('safely calculates and formats total duration ignoring NaN, negative, or missing values', () => {
    const total = calculateTotalDurationSeconds([
      { duration: 125 },
      { duration: NaN },
      { duration: -40 },
      { duration: 'bad' },
      { duration: null },
      { duration: 3500 },
    ]);
    expect(total).toBe(3625);
    expect(formatPlaylistDurationReadable(total)).toBe('1 hr');
    expect(formatPlaylistDurationReadable(5040)).toBe('1 hr 24 min');
    expect(formatPlaylistDurationReadable(1440)).toBe('24 min');
    expect(formatPlaylistDurationReadable(42)).toBe('< 1 min');
    expect(formatPlaylistDurationReadable(0)).toBe('0 min');
    expect(formatPlaylistDurationReadable(NaN)).toBe('0 min');
  });
});
