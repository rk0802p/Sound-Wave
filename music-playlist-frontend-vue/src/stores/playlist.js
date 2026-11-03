import { defineStore } from 'pinia';
import { playlistApi } from '../api/playlists';
import { MOOD_PLAYLISTS } from '../data/moodPlaylists';

const LOCAL_STORAGE_KEY = 'soundwave_bubble_playlists_v3';

const getInitialOfflinePlaylists = () => {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const isModern = Array.isArray(parsed) && parsed.length > 0 && parsed[0].songs?.some(s => s.id?.startsWith('song-') || s.artist === 'Ruth B.');
      if (isModern) {
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Failed to parse offline playlists:', e);
  }

  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(MOOD_PLAYLISTS));
  } catch {}

  return [...MOOD_PLAYLISTS];
};

const saveOfflinePlaylists = (playlists) => {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(playlists));
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
              songs: (p.songs && p.songs.length > 0) ? p.songs : fallbackMood.songs,
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
        let created;
        try {
          created = await playlistApi.createPlaylist(playlistData);
        } catch {
          // Fallback offline creation
          const moodIdx = this.playlists.length % MOOD_PLAYLISTS.length;
          const template = MOOD_PLAYLISTS[moodIdx];
          created = {
            _id: `custom-${Date.now()}`,
            name: playlistData.name || 'New Bubble',
            description: playlistData.description || 'Curated personal bubble',
            emoji: playlistData.emoji || template.emoji,
            e: playlistData.emoji || template.e,
            o1: playlistData.o1 || template.o1,
            o2: playlistData.o2 || template.o2,
            tint: playlistData.tint || template.tint,
            songs: [],
            isPublic: true,
            createdAt: new Date().toISOString(),
          };
        }

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
        let added;
        try {
          added = await playlistApi.addSong(playlistId, songData, allowDuplicate);
        } catch {
          added = {
            _id: `song-${Date.now()}`,
            title: songData.title,
            artist: songData.artist,
            duration: Number(songData.duration) || 200,
            url: songData.url || '',
            coverImage: songData.coverImage || '',
          };
        }

        const p = this.playlists.find((x) => x._id === playlistId || x.id === playlistId);
        if (p) {
          if (!p.songs) p.songs = [];
          p.songs.push(added);
          saveOfflinePlaylists(this.playlists);
        }
        return added;
      } finally {
        this.isMutating = false;
      }
    },
  },
});
