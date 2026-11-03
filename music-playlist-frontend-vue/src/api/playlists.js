import api from './index';

export const playlistApi = {
  getPlaylists: async (params = {}) => {
    const res = await api.get('/api/playlists', { params });
    return res.data;
  },

  getPlaylistById: async (id) => {
    const res = await api.get(`/api/playlists/${id}`);
    return res.data;
  },

  createPlaylist: async (data) => {
    const res = await api.post('/api/playlists', data);
    return res.data;
  },

  updatePlaylist: async (id, data) => {
    const res = await api.put(`/api/playlists/${id}`, data);
    return res.data;
  },

  deletePlaylist: async (id) => {
    const res = await api.delete(`/api/playlists/${id}`);
    return res.data;
  },

  addSong: async (playlistId, songData) => {
    const res = await api.post(`/api/playlists/${playlistId}/songs`, songData);
    return res.data;
  },

  updateSong: async (playlistId, songId, songData) => {
    const res = await api.put(`/api/playlists/${playlistId}/songs/${songId}`, songData);
    return res.data;
  },

  deleteSong: async (playlistId, songId) => {
    const res = await api.delete(`/api/playlists/${playlistId}/songs/${songId}`);
    return res.data;
  },

  reorderSongs: async (playlistId, songIds) => {
    const res = await api.put(`/api/playlists/${playlistId}/songs/reorder`, { songIds });
    return res.data;
  },

  resolveTrack: async (url) => {
    const res = await api.get('/api/playlists/resolve/track', { params: { url } });
    return res.data;
  },
};
