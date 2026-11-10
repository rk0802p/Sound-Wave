import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePlaylistStore } from '../playlist';
import { playlistApi } from '../../api/playlists';

vi.mock('../../api/playlists', () => ({
  playlistApi: {
    getPlaylists: vi.fn(),
    getPlaylistById: vi.fn(),
    createPlaylist: vi.fn(),
    updatePlaylist: vi.fn(),
    deletePlaylist: vi.fn(),
    addSong: vi.fn(),
    addBatchSongs: vi.fn(),
    updateSong: vi.fn(),
    deleteSong: vi.fn(),
    reorderSongs: vi.fn(),
    duplicatePlaylist: vi.fn(),
    forkPlaylist: vi.fn(),
  },
}));

const storageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => { store[key] = String(value); }),
    removeItem: vi.fn((key) => { delete store[key]; }),
    clear: vi.fn(() => { store = {}; }),
  };
})();
globalThis.localStorage = storageMock;

describe('usePlaylistStore', () => {
  let store;

  beforeEach(() => {
    setActivePinia(createPinia());
    localStorage.clear();
    vi.clearAllMocks();
    store = usePlaylistStore();
  });

  it('initializes with empty or cached playlists', () => {
    expect(Array.isArray(store.playlists)).toBe(true);
    expect(store.isLoading).toBe(false);
  });

  it('fetchPlaylists populates playlists and caches them', async () => {
    const mockPlaylists = [
      { _id: 'p1', name: 'My List 1', songs: [{ _id: 's1', title: 'Song 1' }] },
      { _id: 'p2', name: 'My List 2', songs: [] },
    ];
    playlistApi.getPlaylists.mockResolvedValueOnce(mockPlaylists);

    const result = await store.fetchPlaylists();
    expect(result.length).toBe(2);
    expect(store.playlists.length).toBe(2);
    expect(store.playlists[0].name).toBe('My List 1');
  });

  it('fetchPlaylist retrieves single playlist and updates in-place', async () => {
    store.playlists = [{ _id: 'p1', name: 'Old Name', songs: [] }];
    const detailed = { _id: 'p1', name: 'New Name', songs: [{ _id: 's1', title: 'Track 1' }] };
    playlistApi.getPlaylistById.mockResolvedValueOnce(detailed);

    const res = await store.fetchPlaylist('p1');
    expect(res._id).toBe('p1');
    expect(store.currentPlaylist.name).toBe('New Name');
    expect(store.playlists[0].name).toBe('New Name');
    expect(store.playlists[0].songs.length).toBe(1);
  });

  it('createPlaylist adds new playlist in-place and invalidates cache', async () => {
    const newP = { _id: 'p-new', name: 'Fresh Mixtape', songs: [] };
    playlistApi.createPlaylist.mockResolvedValueOnce(newP);

    const created = await store.createPlaylist({ name: 'Fresh Mixtape' });
    expect(created.name).toBe('Fresh Mixtape');
    expect(store.playlists.some((p) => p._id === 'p-new')).toBe(true);
  });

  it('updatePlaylist mutates item and currentPlaylist in-place', async () => {
    store.playlists = [{ _id: 'p1', name: 'Before Update', songs: [] }];
    store.currentPlaylist = { _id: 'p1', name: 'Before Update', songs: [] };

    playlistApi.updatePlaylist.mockResolvedValueOnce({
      _id: 'p1',
      name: 'Renamed Mixtape',
      description: 'Updated desc',
      songs: [],
    });

    await store.updatePlaylist('p1', { name: 'Renamed Mixtape' });
    expect(store.playlists[0].name).toBe('Renamed Mixtape');
    expect(store.currentPlaylist.name).toBe('Renamed Mixtape');
  });

  it('deletePlaylist removes from playlists array and clears currentPlaylist', async () => {
    store.playlists = [
      { _id: 'p1', name: 'List 1' },
      { _id: 'p2', name: 'List 2' },
    ];
    store.currentPlaylist = store.playlists[0];

    playlistApi.deletePlaylist.mockResolvedValueOnce({ success: true });
    await store.deletePlaylist('p1');

    expect(store.playlists.length).toBe(1);
    expect(store.playlists[0]._id).toBe('p2');
    expect(store.currentPlaylist._id).toBe('p2');
  });

  it('addSong adds song to playlist in-place', async () => {
    store.playlists = [{ _id: 'p1', name: 'List 1', songs: [] }];
    store.currentPlaylist = store.playlists[0];

    const added = { _id: 's1', title: 'New Song', artist: 'Artist' };
    playlistApi.addSong.mockResolvedValueOnce({ addedSong: added });

    await store.addSong('p1', added);
    expect(store.playlists[0].songs.length).toBe(1);
    expect(store.playlists[0].songs[0].title).toBe('New Song');
    expect(store.currentPlaylist.songs.length).toBe(1);
  });

  it('addSongs (batch) adds multiple songs in-place', async () => {
    store.playlists = [{ _id: 'p1', name: 'List 1', songs: [] }];
    store.currentPlaylist = store.playlists[0];

    const batch = [
      { _id: 's1', title: 'Song 1' },
      { _id: 's2', title: 'Song 2' },
    ];
    playlistApi.addBatchSongs.mockResolvedValueOnce({ added: batch, duplicates: [], failures: [] });

    await store.addSongs('p1', batch);
    expect(store.playlists[0].songs.length).toBe(2);
    expect(store.currentPlaylist.songs.length).toBe(2);
  });

  it('removeSong removes song in-place from both list and currentPlaylist', async () => {
    const s1 = { _id: 's1', title: 'Song 1' };
    const s2 = { _id: 's2', title: 'Song 2' };
    store.playlists = [{ _id: 'p1', name: 'List 1', songs: [s1, s2] }];
    store.currentPlaylist = store.playlists[0];

    playlistApi.deleteSong.mockResolvedValueOnce({
      playlist: { _id: 'p1', songs: [s2] },
    });

    await store.removeSong('p1', 's1');
    expect(store.playlists[0].songs.length).toBe(1);
    expect(store.playlists[0].songs[0]._id).toBe('s2');
    expect(store.currentPlaylist.songs.length).toBe(1);
  });

  it('restoreSong restores removed song at specified position for undo', async () => {
    const s2 = { _id: 's2', title: 'Song 2' };
    store.playlists = [{ _id: 'p1', name: 'List 1', songs: [s2] }];
    store.currentPlaylist = store.playlists[0];

    const restoredSong = { _id: 's1', title: 'Song 1' };
    playlistApi.addSong.mockResolvedValueOnce({
      addedSong: restoredSong,
    });

    await store.restoreSong('p1', restoredSong, 0);
    expect(store.playlists[0].songs.length).toBe(2);
    expect(store.playlists[0].songs[0]._id).toBe('s1');
    expect(store.currentPlaylist.songs[0]._id).toBe('s1');
  });

  it('duplicatePlaylist appends duplicated playlist', async () => {
    store.playlists = [{ _id: 'p1', name: 'Original', songs: [] }];
    const dup = { _id: 'p1-copy', name: 'Original (Copy)', songs: [] };
    playlistApi.duplicatePlaylist.mockResolvedValueOnce(dup);

    const result = await store.duplicatePlaylist('p1');
    expect(result._id).toBe('p1-copy');
    expect(store.playlists.length).toBe(2);
    expect(store.playlists[1].name).toBe('Original (Copy)');
  });

  it('forkPlaylist appends forked playlist', async () => {
    store.playlists = [{ _id: 'p1', name: 'Public List', songs: [] }];
    const forked = { _id: 'p1-fork', name: 'Fork of Public List', songs: [] };
    playlistApi.forkPlaylist.mockResolvedValueOnce(forked);

    const result = await store.forkPlaylist('p1');
    expect(result._id).toBe('p1-fork');
    expect(store.playlists.length).toBe(2);
  });

  it('reorderSongs updates track order in-place', async () => {
    const s1 = { _id: 's1', title: 'Song 1' };
    const s2 = { _id: 's2', title: 'Song 2' };
    store.playlists = [{ _id: 'p1', songs: [s1, s2] }];
    store.currentPlaylist = store.playlists[0];

    playlistApi.reorderSongs.mockResolvedValueOnce({
      playlist: { _id: 'p1', songs: [s2, s1] },
    });

    await store.reorderSongs('p1', ['s2', 's1']);
    expect(store.playlists[0].songs[0]._id).toBe('s2');
    expect(store.playlists[0].songs[1]._id).toBe('s1');
  });

  it('updateSong updates song metadata in-place', async () => {
    const s1 = { _id: 's1', title: 'Old Title', artist: 'Artist' };
    store.playlists = [{ _id: 'p1', songs: [s1] }];
    store.currentPlaylist = store.playlists[0];

    playlistApi.updateSong.mockResolvedValueOnce({
      updatedSong: { _id: 's1', title: 'Updated Title', artist: 'Artist' },
    });

    await store.updateSong('p1', 's1', { title: 'Updated Title' });
    expect(store.playlists[0].songs[0].title).toBe('Updated Title');
    expect(store.currentPlaylist.songs[0].title).toBe('Updated Title');
  });

  it('fetchPlaylist does NOT add non-owner playlist to store playlists array', async () => {
    store.playlists = [{ _id: 'my-list', name: 'My List', songs: [] }];
    const publicList = {
      _id: 'public-list',
      name: 'Someone Else List',
      isOwner: false,
      songs: [],
    };
    playlistApi.getPlaylistById.mockResolvedValueOnce(publicList);

    const res = await store.fetchPlaylist('public-list');
    expect(res._id).toBe('public-list');
    expect(store.currentPlaylist.name).toBe('Someone Else List');
    // Crucial: store.playlists should not be polluted by foreign public playlists
    expect(store.playlists.length).toBe(1);
    expect(store.playlists.some((p) => p._id === 'public-list')).toBe(false);
  });
});
