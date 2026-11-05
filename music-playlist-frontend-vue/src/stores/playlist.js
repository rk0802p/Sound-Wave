import { defineStore } from 'pinia';
import { playlistApi } from '../api/playlists';
import { MOOD_PLAYLISTS } from '../data/moodPlaylists';

const getCurrentUserId = () => {
  try {
    const rawUser = localStorage.getItem('user');
    if (rawUser) {
      const user = JSON.parse(rawUser);
      return user.id || user._id || 'guest';
    }
  } catch {}
  return 'guest';
};

const getStorageKey = (userId = getCurrentUserId()) => {
  return `soundwave_bubble_playlists_v6_${userId}`;
};

const getInitialOfflinePlaylists = () => {
  try {
    const key = getStorageKey();
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse offline playlists:', e);
  }

  return [...MOOD_PLAYLISTS];
};

const saveOfflinePlaylists = (playlists, userId = getCurrentUserId()) => {
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(playlists));
  } catch {}
};

export const usePlaylistStore = defineStore('playlist', {
  state: () => ({
    playlists: getInitialOfflinePlaylists(),
    currentPlaylist: MOOD_PLAYLISTS[0],
    selectedPlaylistIndex: 0,
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
          (p.name && p.name.toLowerCase().includes(q)) ||
          (p.description && p.description.toLowerCase().includes(q))
      );
    },
    totalTracksCount: (state) => {
      return state.playlists.reduce((acc, p) => acc + (p.songs?.length || 0), 0);
    },
  },

  actions: {
    selectPlaylist(index) {
      if (index >= 0 && index < this.playlists.length) {
        this.selectedPlaylistIndex = index;
        this.currentPlaylist = this.playlists[index];
      }
    },

    selectPlaylistById(id) {
      const idx = this.playlists.findIndex((p) => p._id === id || p.id === id);
      if (idx !== -1) {
        this.selectPlaylist(idx);
      }
    },

    async fetchPlaylists(params = {}) {
      this.isLoading = true;
      this.error = null;
      try {
        const data = await playlistApi.getPlaylists(params);
        const serverPlaylists = Array.isArray(data) ? data : data.playlists || [];
        
        if (serverPlaylists.length > 0) {
          // Merge user playlists with mood styling defaults if missing
          const enriched = serverPlaylists.map((p, idx) => {
            const fallbackMood = MOOD_PLAYLISTS[idx % MOOD_PLAYLISTS.length];
            return {
              ...fallbackMood,
              ...p,
              songs: Array.isArray(p.songs) ? p.songs : [],
              emoji: p.emoji || fallbackMood.emoji,
              e: p.emoji || fallbackMood.e,
              o1: p.o1 || fallbackMood.o1,
              o2: p.o2 || fallbackMood.o2,
              tint: p.tint || fallbackMood.tint,
            };
          });
          this.playlists = enriched;
        } else {
          this.playlists = [...MOOD_PLAYLISTS];
        }
        
        saveOfflinePlaylists(this.playlists);
        return this.playlists;
      } catch (err) {
        console.warn('Network fetch playlists error, using offline store:', err);
        return this.playlists;
      } finally {
        this.isLoading = false;
      }
    },

    async createPlaylist(playlistData) {
      this.isMutating = true;
      this.error = null;
      try {
        const created = await playlistApi.createPlaylist(playlistData);

        const fallbackMood = MOOD_PLAYLISTS[this.playlists.length % MOOD_PLAYLISTS.length];
        const enriched = {
          ...fallbackMood,
          ...created,
          emoji: created.emoji || playlistData.emoji || fallbackMood.emoji,
          e: created.emoji || playlistData.emoji || fallbackMood.e,
          o1: created.o1 || playlistData.o1 || fallbackMood.o1,
          o2: created.o2 || playlistData.o2 || fallbackMood.o2,
          tint: created.tint || playlistData.tint || fallbackMood.tint,
          songs: created.songs || [],
        };

        this.playlists.push(enriched);
        saveOfflinePlaylists(this.playlists);
        return enriched;
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
        throw err;
      } finally {
        this.isMutating = false;
      }
    },

    async addSong(playlistId, songData, allowDuplicate = false) {
      this.isMutating = true;
      try {
        const res = await playlistApi.addSong(playlistId, songData, allowDuplicate);
        const addedSong = res?.addedSong || res?.song || res;

        const p = this.playlists.find((x) => x._id === playlistId || x.id === playlistId);
        if (p) {
          if (!p.songs) p.songs = [];
          p.songs.push(addedSong);
          saveOfflinePlaylists(this.playlists);
        }

        if (this.currentPlaylist && (this.currentPlaylist._id === playlistId || this.currentPlaylist.id === playlistId)) {
          if (!this.currentPlaylist.songs) this.currentPlaylist.songs = [];
          this.currentPlaylist.songs.push(addedSong);
        }

        return addedSong;
      } finally {
        this.isMutating = false;
      }
    },

    async removeSong(playlistId, songId) {
      this.isMutating = true;
      this.error = null;
      try {
        const res = await playlistApi.deleteSong(playlistId, songId);
        const updatedPlaylist = res?.playlist;

        const p = this.playlists.find((x) => x._id === playlistId || x.id === playlistId);
        if (p) {
          if (updatedPlaylist && Array.isArray(updatedPlaylist.songs)) {
            p.songs = updatedPlaylist.songs;
          } else if (Array.isArray(p.songs)) {
            p.songs = p.songs.filter((s) => s._id !== songId && s.id !== songId);
          }
          saveOfflinePlaylists(this.playlists);
        }

        if (this.currentPlaylist && (this.currentPlaylist._id === playlistId || this.currentPlaylist.id === playlistId)) {
          if (updatedPlaylist && Array.isArray(updatedPlaylist.songs)) {
            this.currentPlaylist.songs = updatedPlaylist.songs;
          } else if (Array.isArray(this.currentPlaylist.songs)) {
            this.currentPlaylist.songs = this.currentPlaylist.songs.filter((s) => s._id !== songId && s.id !== songId);
          }
        }

        return res;
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
        throw err;
      } finally {
        this.isMutating = false;
      }
    },

    async deletePlaylist(playlistId) {
      this.isMutating = true;
      this.error = null;
      try {
        const res = await playlistApi.deletePlaylist(playlistId);

        this.playlists = this.playlists.filter((x) => x._id !== playlistId && x.id !== playlistId);

        if (this.currentPlaylist && (this.currentPlaylist._id === playlistId || this.currentPlaylist.id === playlistId)) {
          this.currentPlaylist = this.playlists[0] || null;
          this.selectedPlaylistIndex = 0;
        }

        saveOfflinePlaylists(this.playlists);
        return res;
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
        throw err;
      } finally {
        this.isMutating = false;
      }
    },

    async updatePlaylist(playlistId, updateData) {
      this.isMutating = true;
      this.error = null;
      try {
        const updated = await playlistApi.updatePlaylist(playlistId, updateData);

        const idx = this.playlists.findIndex((x) => x._id === playlistId || x.id === playlistId);
        if (idx !== -1) {
          this.playlists[idx] = {
            ...this.playlists[idx],
            ...updated,
            songs: updated.songs || this.playlists[idx].songs || [],
          };
          saveOfflinePlaylists(this.playlists);
        }

        if (this.currentPlaylist && (this.currentPlaylist._id === playlistId || this.currentPlaylist.id === playlistId)) {
          this.currentPlaylist = {
            ...this.currentPlaylist,
            ...updated,
            songs: updated.songs || this.currentPlaylist.songs || [],
          };
        }

        return updated;
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
        throw err;
      } finally {
        this.isMutating = false;
      }
    },

    async updateSong(playlistId, songId, songData) {
      this.isMutating = true;
      this.error = null;
      try {
        const res = await playlistApi.updateSong(playlistId, songId, songData);

        const p = this.playlists.find((x) => x._id === playlistId || x.id === playlistId);
        if (p && res && Array.isArray(res.songs)) {
          p.songs = res.songs;
          saveOfflinePlaylists(this.playlists);
        }

        if (this.currentPlaylist && (this.currentPlaylist._id === playlistId || this.currentPlaylist.id === playlistId) && res?.songs) {
          this.currentPlaylist.songs = res.songs;
        }

        return res;
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
        throw err;
      } finally {
        this.isMutating = false;
      }
    },

    async reorderSongs(playlistId, songIds) {
      this.isMutating = true;
      this.error = null;
      try {
        const res = await playlistApi.reorderSongs(playlistId, songIds);
        const updatedPlaylist = res?.playlist || res;

        const p = this.playlists.find((x) => x._id === playlistId || x.id === playlistId);
        if (p && updatedPlaylist && Array.isArray(updatedPlaylist.songs)) {
          p.songs = updatedPlaylist.songs;
          saveOfflinePlaylists(this.playlists);
        }

        if (this.currentPlaylist && (this.currentPlaylist._id === playlistId || this.currentPlaylist.id === playlistId) && updatedPlaylist?.songs) {
          this.currentPlaylist.songs = updatedPlaylist.songs;
        }

        return res;
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
        throw err;
      } finally {
        this.isMutating = false;
      }
    },

    async fetchPlaylist(playlistId) {
      this.isLoading = true;
      this.error = null;
      try {
        const data = await playlistApi.getPlaylistById(playlistId);
        if (data) {
          this.currentPlaylist = data;
          const idx = this.playlists.findIndex((x) => x._id === playlistId || x.id === playlistId);
          if (idx !== -1) {
            this.playlists[idx] = {
              ...this.playlists[idx],
              ...data,
            };
            saveOfflinePlaylists(this.playlists);
          }
        }
        return data;
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    async resolveTrack(url) {
      return await playlistApi.resolveTrack(url);
    },

    clearUserCache(userId) {
      try {
        const key = getStorageKey(userId || getCurrentUserId());
        localStorage.removeItem(key);
      } catch {}
      this.playlists = [...MOOD_PLAYLISTS];
      this.currentPlaylist = MOOD_PLAYLISTS[0];
      this.selectedPlaylistIndex = 0;
    },
  },
});
