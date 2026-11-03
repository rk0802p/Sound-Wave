import { defineStore } from 'pinia';
import { playlistApi } from '../api/playlists';
import { CURATED_DEMO_TRACKS, PLAYLIST_COVER_PRESETS } from '../data/demoTracks';

const LOCAL_STORAGE_KEY = 'soundwave_offline_playlists';

const getInitialOfflinePlaylists = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed to parse offline playlists:', e);
  }

  // Default initial starter archive
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

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(defaultArchive));
  } catch {}

  return defaultArchive;
};

const saveOfflinePlaylists = (playlists) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(playlists));
  } catch {}
};

export const usePlaylistStore = defineStore('playlist', {
  state: () => ({
    playlists: getInitialOfflinePlaylists(),
    currentPlaylist: null,
    requestedPlaylistId: null,
    isLoading: false,
    isMutating: false,
    error: null,
    searchQuery: '',
  }),

  getters: {
    filteredPlaylists: (state) => {
      if (!state.searchQuery.trim()) return state.playlists;
      const q = state.searchQuery.toLowerCase().trim();
      return state.playlists.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    },
    totalTracksCount: (state) => {
      return state.playlists.reduce((acc, p) => acc + (p.songs?.length || 0), 0);
    },
  },

  actions: {
    async fetchPlaylists(params = {}) {
      this.isLoading = true;
      this.error = null;
      try {
        const data = await playlistApi.getPlaylists(params);
        this.playlists = Array.isArray(data) ? data : data.playlists || [];
        saveOfflinePlaylists(this.playlists);
        return this.playlists;
      } catch (err) {
        // If offline / network error, load from offline archive
        if (!err.response || err.code === 'ERR_NETWORK') {
          this.playlists = getInitialOfflinePlaylists();
          return this.playlists;
        }
        this.error = err.response?.data?.message || 'Failed to fetch playlists';
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchPlaylist(id) {
      this.requestedPlaylistId = id;
      // Only retain currentPlaylist if it already matches the requested ID
      if (this.currentPlaylist && this.currentPlaylist._id !== id) {
        const cachedMatch = this.playlists.find((p) => p._id === id);
        this.currentPlaylist = cachedMatch || null;
      }
      this.isLoading = !this.currentPlaylist;
      this.error = null;

      try {
        const data = await playlistApi.getPlaylistById(id);
        if (this.requestedPlaylistId === id) {
          this.currentPlaylist = data;
          const idx = this.playlists.findIndex((p) => p._id === id);
          if (idx !== -1) {
            this.playlists[idx] = data;
          }
        }
        return data;
      } catch (err) {
        if (!err.response || err.code === 'ERR_NETWORK') {
          if (this.currentPlaylist && this.currentPlaylist._id === id) return this.currentPlaylist;
          const offlineList = getInitialOfflinePlaylists();
          const fallback = offlineList.find((p) => p._id === id);
          if (fallback) {
            this.currentPlaylist = fallback;
            return fallback;
          }
        }
        this.error = err.response?.data?.message || 'Failed to fetch playlist';
        throw err;
      } finally {
        if (this.requestedPlaylistId === id) {
          this.isLoading = false;
        }
      }
    },

    async resolveTrack(url) {
      if (!url || typeof url !== 'string' || !url.trim()) {
        throw new Error('URL is required to resolve track metadata');
      }
      return await playlistApi.resolveTrack(url.trim());
    },

    async createPlaylist(payload) {
      this.isMutating = true;
      this.error = null;
      try {
        const created = await playlistApi.createPlaylist(payload);
        this.playlists.unshift(created);
        saveOfflinePlaylists(this.playlists);
        return created;
      } catch (err) {
        if (!err.response || err.code === 'ERR_NETWORK') {
          const newArchive = {
            _id: `archive-${Date.now()}`,
            name: payload.name,
            description: payload.description || '',
            coverImage: payload.coverImage || null,
            isPublic: Boolean(payload.isPublic),
            user: { username: 'Acoustic Curator' },
            songs: (payload.songs || []).map((s, idx) => ({ ...s, _id: `song-${Date.now()}-${idx}`, position: idx })),
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          this.playlists.unshift(newArchive);
          saveOfflinePlaylists(this.playlists);
          return newArchive;
        }
        this.error = err.response?.data?.message || 'Failed to create playlist';
        throw err;
      } finally {
        this.isMutating = false;
      }
    },

    async updatePlaylist(id, payload) {
      this.isMutating = true;
      this.error = null;
      try {
        const updated = await playlistApi.updatePlaylist(id, payload);
        const idx = this.playlists.findIndex((p) => p._id === id);
        if (idx !== -1) {
          this.playlists[idx] = updated;
        }
        if (this.currentPlaylist && this.currentPlaylist._id === id) {
          this.currentPlaylist = updated;
        }
        saveOfflinePlaylists(this.playlists);
        return updated;
      } catch (err) {
        if (!err.response || err.code === 'ERR_NETWORK') {
          const idx = this.playlists.findIndex((p) => p._id === id);
          if (idx !== -1) {
            this.playlists[idx] = { ...this.playlists[idx], ...payload, updatedAt: new Date().toISOString() };
            if (this.currentPlaylist && this.currentPlaylist._id === id) {
              this.currentPlaylist = this.playlists[idx];
            }
            saveOfflinePlaylists(this.playlists);
            return this.playlists[idx];
          }
        }
        this.error = err.response?.data?.message || 'Failed to update playlist';
        throw err;
      } finally {
        this.isMutating = false;
      }
    },

    async deletePlaylist(id) {
      this.isMutating = true;
      this.error = null;
      try {
        await playlistApi.deletePlaylist(id);
        this.playlists = this.playlists.filter((p) => p._id !== id);
        if (this.currentPlaylist && this.currentPlaylist._id === id) {
          this.currentPlaylist = null;
        }
        saveOfflinePlaylists(this.playlists);
      } catch (err) {
        if (!err.response || err.code === 'ERR_NETWORK') {
          this.playlists = this.playlists.filter((p) => p._id !== id);
          if (this.currentPlaylist && this.currentPlaylist._id === id) {
            this.currentPlaylist = null;
          }
          saveOfflinePlaylists(this.playlists);
          return;
        }
        this.error = err.response?.data?.message || 'Failed to delete playlist';
        throw err;
      } finally {
        this.isMutating = false;
      }
    },

    async addSong(playlistId, songData) {
      this.isMutating = true;
      this.error = null;
      try {
        const res = await playlistApi.addSong(playlistId, songData);
        if (res.playlist) {
          this.currentPlaylist = res.playlist;
          const idx = this.playlists.findIndex((p) => p._id === playlistId);
          if (idx !== -1) {
            this.playlists[idx] = res.playlist;
          }
        }
        saveOfflinePlaylists(this.playlists);
        return res;
      } catch (err) {
        if (!err.response || err.code === 'ERR_NETWORK') {
          const idx = this.playlists.findIndex((p) => p._id === playlistId);
          if (idx !== -1) {
            const songs = this.playlists[idx].songs || [];
            const newSong = { ...songData, _id: `song-${Date.now()}`, position: songs.length };
            songs.push(newSong);
            this.playlists[idx].songs = songs;
            if (this.currentPlaylist && this.currentPlaylist._id === playlistId) {
              this.currentPlaylist = this.playlists[idx];
            }
            saveOfflinePlaylists(this.playlists);
            return { playlist: this.playlists[idx], song: newSong };
          }
        }
        this.error = err.response?.data?.message || 'Failed to add song';
        throw err;
      } finally {
        this.isMutating = false;
      }
    },

    async updateSong(playlistId, songId, songData) {
      this.isMutating = true;
      try {
        const updated = await playlistApi.updateSong(playlistId, songId, songData);
        this.currentPlaylist = updated;
        const idx = this.playlists.findIndex((p) => p._id === playlistId);
        if (idx !== -1) this.playlists[idx] = updated;
        saveOfflinePlaylists(this.playlists);
        return updated;
      } catch (err) {
        if (!err.response || err.code === 'ERR_NETWORK') {
          const idx = this.playlists.findIndex((p) => p._id === playlistId);
          if (idx !== -1) {
            const sIdx = this.playlists[idx].songs?.findIndex((s) => s._id === songId);
            if (sIdx !== -1) {
              this.playlists[idx].songs[sIdx] = { ...this.playlists[idx].songs[sIdx], ...songData };
              this.currentPlaylist = this.playlists[idx];
              saveOfflinePlaylists(this.playlists);
              return this.playlists[idx];
            }
          }
        }
        this.error = err.response?.data?.message || 'Failed to update song';
        throw err;
      } finally {
        this.isMutating = false;
      }
    },

    async deleteSong(playlistId, songId) {
      this.isMutating = true;
      try {
        const res = await playlistApi.deleteSong(playlistId, songId);
        if (res.playlist) {
          this.currentPlaylist = res.playlist;
          const idx = this.playlists.findIndex((p) => p._id === playlistId);
          if (idx !== -1) this.playlists[idx] = res.playlist;
        }
        saveOfflinePlaylists(this.playlists);
        return res;
      } catch (err) {
        if (!err.response || err.code === 'ERR_NETWORK') {
          const idx = this.playlists.findIndex((p) => p._id === playlistId);
          if (idx !== -1) {
            this.playlists[idx].songs = (this.playlists[idx].songs || []).filter((s) => s._id !== songId);
            this.currentPlaylist = this.playlists[idx];
            saveOfflinePlaylists(this.playlists);
            return { playlist: this.playlists[idx] };
          }
        }
        this.error = err.response?.data?.message || 'Failed to delete song';
        throw err;
      } finally {
        this.isMutating = false;
      }
    },

    async reorderSongs(playlistId, songIds) {
      this.isMutating = true;
      this.error = null;
      if (this.currentPlaylist && this.currentPlaylist._id === playlistId) {
        const songMap = new Map((this.currentPlaylist.songs || []).map((s) => [s._id, s]));
        const reordered = songIds
          .map((id, index) => {
            const s = songMap.get(id);
            return s ? { ...s, position: index } : null;
          })
          .filter(Boolean);
        this.currentPlaylist.songs = reordered;
      }

      try {
        const res = await playlistApi.reorderSongs(playlistId, songIds);
        if (res.playlist) {
          this.currentPlaylist = res.playlist;
          const idx = this.playlists.findIndex((p) => p._id === playlistId);
          if (idx !== -1) {
            this.playlists[idx] = res.playlist;
          }
        }
        saveOfflinePlaylists(this.playlists);
        return res;
      } catch (err) {
        if (!err.response || err.code === 'ERR_NETWORK') {
          const idx = this.playlists.findIndex((p) => p._id === playlistId);
          if (idx !== -1 && this.currentPlaylist) {
            this.playlists[idx].songs = this.currentPlaylist.songs;
            saveOfflinePlaylists(this.playlists);
            return { message: 'Songs reordered', playlist: this.playlists[idx] };
          }
        }
        this.error = err.response?.data?.message || 'Failed to reorder songs';
        // Rollback by fetching fresh state
        if (this.currentPlaylist && this.currentPlaylist._id === playlistId) {
          try {
            await this.fetchPlaylist(playlistId);
          } catch {}
        }
        throw err;
      } finally {
        this.isMutating = false;
      }
    },
  },
});
