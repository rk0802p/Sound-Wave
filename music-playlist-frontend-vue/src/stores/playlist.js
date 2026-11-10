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
  return `soundwave_playlists_cache_${userId}`;
};

const getCachedPlaylists = () => {
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
    console.warn('Failed to parse cached playlists:', e);
  }
  return [];
};

const writeCachePlaylists = (playlists, userId = getCurrentUserId()) => {
  try {
    const key = getStorageKey(userId);
    localStorage.setItem(key, JSON.stringify(playlists));
  } catch {}
};

const invalidateCache = (userId = getCurrentUserId()) => {
  try {
    const key = getStorageKey(userId);
    localStorage.removeItem(key);
  } catch {}
};

export const usePlaylistStore = defineStore('playlist', {
  state: () => ({
    playlists: getCachedPlaylists(),
    currentPlaylist: null,
    selectedPlaylistIndex: -1,
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
    userPlaylists: (state) => {
      return state.playlists.filter(
        (p) => !p.isMood && !p.id?.startsWith('mood-') && !p._id?.startsWith('mood-')
      );
    },
    totalTracksCount: (state) => {
      return state.playlists.reduce((acc, p) => acc + (p.songs?.length || p.songCount || 0), 0);
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
      const idx = this.playlists.findIndex((p) => (p._id || p.id) === id);
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
        
        const enriched = serverPlaylists.map((p, idx) => {
          const fallbackMood = MOOD_PLAYLISTS[idx % MOOD_PLAYLISTS.length];
          return {
            emoji: fallbackMood.emoji,
            e: fallbackMood.e,
            o1: fallbackMood.o1,
            o2: fallbackMood.o2,
            tint: fallbackMood.tint,
            ...p,
            isMood: false,
            songs: Array.isArray(p.songs) ? p.songs : [],
          };
        });

        this.playlists = enriched;
        writeCachePlaylists(this.playlists);
        return this.playlists;
      } catch (err) {
        console.warn('Network fetch playlists error, falling back to cache:', err);
        const cached = getCachedPlaylists();
        if (cached.length > 0) {
          this.playlists = cached;
        }
        return this.playlists;
      } finally {
        this.isLoading = false;
      }
    },

    async fetchPlaylist(playlistId) {
      this.isLoading = true;
      this.error = null;
      try {
        const data = await playlistApi.getPlaylistById(playlistId);
        if (data) {
          this.currentPlaylist = data;
          const idx = this.playlists.findIndex((x) => (x._id || x.id) === playlistId);
          if (idx !== -1) {
            this.playlists[idx] = {
              ...this.playlists[idx],
              ...data,
              songs: data.songs || this.playlists[idx].songs || [],
            };
          } else if (data.isOwner) {
            const fallbackMood = MOOD_PLAYLISTS[this.playlists.length % MOOD_PLAYLISTS.length];
            this.playlists.push({
              emoji: data.emoji || fallbackMood.emoji,
              e: data.e || fallbackMood.e,
              o1: data.o1 || fallbackMood.o1,
              o2: data.o2 || fallbackMood.o2,
              tint: data.tint || fallbackMood.tint,
              ...data,
              isMood: false,
              songs: data.songs || [],
            });
          }
          writeCachePlaylists(this.playlists);
        }
        return data;
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
        throw err;
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
          emoji: created.emoji || playlistData.emoji || fallbackMood.emoji,
          e: created.emoji || playlistData.emoji || fallbackMood.e,
          o1: created.o1 || playlistData.o1 || fallbackMood.o1,
          o2: created.o2 || playlistData.o2 || fallbackMood.o2,
          tint: created.tint || playlistData.tint || fallbackMood.tint,
          ...created,
          isMood: false,
          songs: created.songs || [],
        };

        this.playlists.push(enriched);
        invalidateCache();
        writeCachePlaylists(this.playlists);
        return enriched;
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

        const idx = this.playlists.findIndex((x) => (x._id || x.id) === playlistId);
        if (idx !== -1) {
          this.playlists[idx] = {
            ...this.playlists[idx],
            ...updated,
            songs: updated.songs || this.playlists[idx].songs || [],
          };
        }

        if (this.currentPlaylist && (this.currentPlaylist._id || this.currentPlaylist.id) === playlistId) {
          this.currentPlaylist = {
            ...this.currentPlaylist,
            ...updated,
            songs: updated.songs || this.currentPlaylist.songs || [],
          };
        }

        invalidateCache();
        writeCachePlaylists(this.playlists);
        return updated;
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

        this.playlists = this.playlists.filter((x) => (x._id || x.id) !== playlistId);

        if (this.currentPlaylist && (this.currentPlaylist._id || this.currentPlaylist.id) === playlistId) {
          this.currentPlaylist = this.playlists[0] || null;
          this.selectedPlaylistIndex = this.playlists.length > 0 ? 0 : -1;
        }

        invalidateCache();
        writeCachePlaylists(this.playlists);
        return res;
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
        throw err;
      } finally {
        this.isMutating = false;
      }
    },

    async duplicatePlaylist(playlistId, options = {}) {
      this.isMutating = true;
      this.error = null;
      try {
        const duplicated = await playlistApi.duplicatePlaylist(playlistId, options);
        this.playlists.push(duplicated);

        invalidateCache();
        writeCachePlaylists(this.playlists);
        return duplicated;
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
        throw err;
      } finally {
        this.isMutating = false;
      }
    },

    async forkPlaylist(playlistId, options = {}) {
      this.isMutating = true;
      this.error = null;
      try {
        const forked = await playlistApi.forkPlaylist(playlistId, options);
        this.playlists.push(forked);

        invalidateCache();
        writeCachePlaylists(this.playlists);
        return forked;
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
        throw err;
      } finally {
        this.isMutating = false;
      }
    },

    async addSong(playlistId, songData, allowDuplicate = false) {
      this.isMutating = true;
      this.error = null;
      try {
        const res = await playlistApi.addSong(playlistId, songData, allowDuplicate);
        const addedSong = res?.addedSong || res?.song || res;
        const updatedPlaylist = res?.playlist;

        const p = this.playlists.find((x) => (x._id || x.id) === playlistId);
        if (p) {
          if (updatedPlaylist && Array.isArray(updatedPlaylist.songs)) {
            p.songs = updatedPlaylist.songs;
          } else {
            if (!p.songs) p.songs = [];
            if (typeof songData.position === 'number' && songData.position >= 0) {
              p.songs.splice(songData.position, 0, addedSong);
            } else {
              p.songs.push(addedSong);
            }
          }
          p.songCount = p.songs.length;
        }

        if (this.currentPlaylist && (this.currentPlaylist._id || this.currentPlaylist.id) === playlistId && this.currentPlaylist !== p) {
          if (updatedPlaylist && Array.isArray(updatedPlaylist.songs)) {
            this.currentPlaylist.songs = updatedPlaylist.songs;
          } else {
            if (!this.currentPlaylist.songs) this.currentPlaylist.songs = [];
            if (typeof songData.position === 'number' && songData.position >= 0) {
              this.currentPlaylist.songs.splice(songData.position, 0, addedSong);
            } else {
              this.currentPlaylist.songs.push(addedSong);
            }
          }
        }

        invalidateCache();
        writeCachePlaylists(this.playlists);
        return addedSong;
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
        throw err;
      } finally {
        this.isMutating = false;
      }
    },

    async addSongs(playlistId, songs, allowDuplicate = false) {
      this.isMutating = true;
      this.error = null;
      try {
        const res = await playlistApi.addBatchSongs(playlistId, songs, allowDuplicate);
        const updatedPlaylist = res?.playlist;
        const addedSongs = res?.added || [];

        const p = this.playlists.find((x) => (x._id || x.id) === playlistId);
        if (p) {
          if (updatedPlaylist && Array.isArray(updatedPlaylist.songs)) {
            p.songs = updatedPlaylist.songs;
          } else if (addedSongs.length > 0) {
            if (!p.songs) p.songs = [];
            p.songs.push(...addedSongs);
          }
          p.songCount = p.songs?.length || 0;
        }

        if (this.currentPlaylist && (this.currentPlaylist._id || this.currentPlaylist.id) === playlistId && this.currentPlaylist !== p) {
          if (updatedPlaylist && Array.isArray(updatedPlaylist.songs)) {
            this.currentPlaylist.songs = updatedPlaylist.songs;
          } else if (addedSongs.length > 0) {
            if (!this.currentPlaylist.songs) this.currentPlaylist.songs = [];
            this.currentPlaylist.songs.push(...addedSongs);
          }
        }

        invalidateCache();
        writeCachePlaylists(this.playlists);
        return res;
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
        throw err;
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

        const p = this.playlists.find((x) => (x._id || x.id) === playlistId);
        if (p) {
          if (updatedPlaylist && Array.isArray(updatedPlaylist.songs)) {
            p.songs = updatedPlaylist.songs;
          } else if (Array.isArray(p.songs)) {
            p.songs = p.songs.filter((s) => (s._id || s.id) !== songId);
          }
          p.songCount = p.songs?.length || 0;
        }

        if (this.currentPlaylist && (this.currentPlaylist._id || this.currentPlaylist.id) === playlistId && this.currentPlaylist !== p) {
          if (updatedPlaylist && Array.isArray(updatedPlaylist.songs)) {
            this.currentPlaylist.songs = updatedPlaylist.songs;
          } else if (Array.isArray(this.currentPlaylist.songs)) {
            this.currentPlaylist.songs = this.currentPlaylist.songs.filter((s) => (s._id || s.id) !== songId);
          }
        }

        invalidateCache();
        writeCachePlaylists(this.playlists);
        return res;
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
        throw err;
      } finally {
        this.isMutating = false;
      }
    },

    async restoreSong(playlistId, songData, position) {
      this.isMutating = true;
      this.error = null;
      try {
        const payload = {
          ...songData,
          position: typeof position === 'number' ? position : undefined,
        };
        const res = await playlistApi.addSong(playlistId, payload, true);
        const addedSong = res?.addedSong || res?.song || res;
        const updatedPlaylist = res?.playlist;

        const p = this.playlists.find((x) => (x._id || x.id) === playlistId);
        if (p) {
          if (updatedPlaylist && Array.isArray(updatedPlaylist.songs)) {
            p.songs = updatedPlaylist.songs;
          } else {
            if (!p.songs) p.songs = [];
            if (typeof position === 'number' && position >= 0) {
              p.songs.splice(position, 0, addedSong);
            } else {
              p.songs.push(addedSong);
            }
          }
          p.songCount = p.songs?.length || 0;
        }

        if (this.currentPlaylist && (this.currentPlaylist._id || this.currentPlaylist.id) === playlistId && this.currentPlaylist !== p) {
          if (updatedPlaylist && Array.isArray(updatedPlaylist.songs)) {
            this.currentPlaylist.songs = updatedPlaylist.songs;
          } else {
            if (!this.currentPlaylist.songs) this.currentPlaylist.songs = [];
            if (typeof position === 'number' && position >= 0) {
              this.currentPlaylist.songs.splice(position, 0, addedSong);
            } else {
              this.currentPlaylist.songs.push(addedSong);
            }
          }
        }

        invalidateCache();
        writeCachePlaylists(this.playlists);
        return addedSong;
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
        const updatedPlaylist = res?.playlist;

        const p = this.playlists.find((x) => (x._id || x.id) === playlistId);
        if (p) {
          if (updatedPlaylist && Array.isArray(updatedPlaylist.songs)) {
            p.songs = updatedPlaylist.songs;
          } else if (res && Array.isArray(res.songs)) {
            p.songs = res.songs;
          } else if (p.songs) {
            const sIdx = p.songs.findIndex((s) => (s._id || s.id) === songId);
            if (sIdx !== -1) {
              p.songs[sIdx] = { ...p.songs[sIdx], ...(res.updatedSong || songData) };
            }
          }
        }

        if (this.currentPlaylist && (this.currentPlaylist._id || this.currentPlaylist.id) === playlistId && this.currentPlaylist !== p) {
          if (updatedPlaylist && Array.isArray(updatedPlaylist.songs)) {
            this.currentPlaylist.songs = updatedPlaylist.songs;
          } else if (res && Array.isArray(res.songs)) {
            this.currentPlaylist.songs = res.songs;
          } else if (this.currentPlaylist.songs) {
            const sIdx = this.currentPlaylist.songs.findIndex((s) => (s._id || s.id) === songId);
            if (sIdx !== -1) {
              this.currentPlaylist.songs[sIdx] = { ...this.currentPlaylist.songs[sIdx], ...(res.updatedSong || songData) };
            }
          }
        }

        invalidateCache();
        writeCachePlaylists(this.playlists);
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

        const p = this.playlists.find((x) => (x._id || x.id) === playlistId);
        if (p) {
          if (updatedPlaylist && Array.isArray(updatedPlaylist.songs)) {
            p.songs = updatedPlaylist.songs;
          } else if (Array.isArray(p.songs)) {
            const map = new Map(p.songs.map((s) => [s._id || s.id, s]));
            p.songs = songIds.map((id) => map.get(id)).filter(Boolean);
          }
        }

        if (this.currentPlaylist && (this.currentPlaylist._id || this.currentPlaylist.id) === playlistId && this.currentPlaylist !== p) {
          if (updatedPlaylist && Array.isArray(updatedPlaylist.songs)) {
            this.currentPlaylist.songs = updatedPlaylist.songs;
          } else if (Array.isArray(this.currentPlaylist.songs)) {
            const map = new Map(this.currentPlaylist.songs.map((s) => [s._id || s.id, s]));
            this.currentPlaylist.songs = songIds.map((id) => map.get(id)).filter(Boolean);
          }
        }

        invalidateCache();
        writeCachePlaylists(this.playlists);
        return res;
      } catch (err) {
        this.error = err.response?.data?.message || err.message;
        throw err;
      } finally {
        this.isMutating = false;
      }
    },

    async resolveTrack(url) {
      return await playlistApi.resolveTrack(url);
    },

    clearUserCache(userId) {
      invalidateCache(userId || getCurrentUserId());
      this.playlists = [];
      this.currentPlaylist = null;
      this.selectedPlaylistIndex = -1;
    },
  },
});
