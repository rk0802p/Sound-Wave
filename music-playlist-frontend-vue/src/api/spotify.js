import api from './index';

export const spotifyApi = {
  /**
   * Get Spotify authorization URL from backend
   */
  async getConnectUrl() {
    const response = await api.get('/api/spotify/connect', {
      headers: {
        Accept: 'application/json',
      },
    });
    return response.data;
  },

  /**
   * Retrieve safe Spotify connection status
   */
  async getStatus() {
    const response = await api.get('/api/spotify/status');
    return response.data;
  },

  /**
   * Request fresh, short-lived Spotify access token for Web Playback SDK
   */
  async getToken() {
    const response = await api.post('/api/spotify/token');
    return response.data;
  },

  /**
   * Disconnect linked Spotify account
   */
  async disconnect() {
    const response = await api.post('/api/spotify/disconnect');
    return response.data;
  },
};

export default spotifyApi;
