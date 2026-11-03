import { defineStore } from 'pinia';
import { playlistApi } from '../api/playlists';

export const usePlaylistStore = defineStore('playlist', {
  state: () => ({
    playlists: [],
    currentPlaylist: null,
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
        return this.playlists;
      } catch (err) {
        this.error = err.response?.data?.message || 'Failed to fetch playlists';
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchPlaylist(id) {
      this.isLoading = true;
      this.error = null;
      try {
        const data = await playlistApi.getPlaylistById(id);
        this.currentPlaylist = data;
        return data;
      } catch (err) {
        this.error = err.response?.data?.message || 'Failed to fetch playlist';
        throw err;
      } finally {
        this.isLoading = false;
      }
    },

    async createPlaylist(payload) {
      this.isMutating = true;
      this.error = null;
      try {
        const created = await playlistApi.createPlaylist(payload);
        this.playlists.unshift(created);
        return created;
      } catch (err) {
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
        return updated;
      } catch (err) {
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
      } catch (err) {
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
        return res;
      } catch (err) {
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
        return updated;
      } catch (err) {
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
        return res;
      } catch (err) {
        this.error = err.response?.data?.message || 'Failed to delete song';
        throw err;
      } finally {
        this.isMutating = false;
      }
    },

    async reorderSongs(playlistId, songIds) {
      // Optimistic update
      if (this.currentPlaylist && this.currentPlaylist._id === playlistId) {
        const songMap = new Map(this.currentPlaylist.songs.map((s) => [s._id, s]));
        const reordered = songIds.map((id, index) => {
          const s = songMap.get(id);
          return s ? { ...s, position: index } : null;
        }).filter(Boolean);
        this.currentPlaylist.songs = reordered;
      }

      try {
        const res = await playlistApi.reorderSongs(playlistId, songIds);
        if (res.playlist) {
          this.currentPlaylist = res.playlist;
          const idx = this.playlists.findIndex((p) => p._id === playlistId);
          if (idx !== -1) this.playlists[idx] = res.playlist;
        }
        return res;
      } catch (err) {
        // Rollback
        await this.fetchPlaylist(playlistId);
        throw err;
      }
    },
  },
});
