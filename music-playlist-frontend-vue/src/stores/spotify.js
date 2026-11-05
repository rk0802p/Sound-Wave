import { defineStore } from 'pinia';
import { spotifyApi } from '../api/spotify';
import { useToastStore } from './toast';

export const useSpotifyStore = defineStore('spotify', {
  state: () => ({
    // 5 distinct lifecycle states
    isConnected: false,
    isEligible: false, // Spotify Premium requirement for Web Playback SDK
    isInitialized: false, // SDK script loaded and Spotify.Player instance created
    isReady: false, // SDK emitted ready event with device_id
    isPlaybackActive: false, // Audio currently playing through SDK

    // Account & provider metadata
    isConfigured: false,
    spotifyId: null,
    displayName: null,
    product: null, // 'premium' | 'free' | null
    deviceId: null,
    isLoading: false,
    error: null,
  }),

  getters: {
    canUseWebPlayback: () => false, // Playback disabled pending written licensing verification
    requiresEmbedFallback: () => false,
    statusDescription: (state) => {
      if (!state.isConfigured) return 'Spotify integration unconfigured';
      if (!state.isConnected) return 'Not connected';
      return 'Connected (Playback Pending Verification)';
    },
  },

  actions: {
    async checkStatus() {
      try {
        const data = await spotifyApi.getStatus();
        this.isConnected = Boolean(data.connected);
        this.isConfigured = Boolean(data.configured);
        this.spotifyId = data.spotifyId || null;
        this.displayName = data.displayName || null;
        this.product = data.product || null;
        this.isEligible = Boolean(data.isEligible);
        this.error = null;
        return data;
      } catch (err) {
        console.warn('Could not check Spotify status:', err.message);
        return null;
      }
    },

    async connect() {
      this.isLoading = true;
      this.error = null;
      const toast = useToastStore();
      try {
        const data = await spotifyApi.getConnectUrl();
        if (data?.authUrl) {
          window.location.href = data.authUrl;
        } else {
          throw new Error('Authorization URL was not provided');
        }
      } catch (err) {
        this.isLoading = false;
        const msg = err.response?.data?.error || err.message || 'Failed to initiate Spotify connection';
        this.error = msg;
        toast.error(msg);
      }
    },

    async disconnect() {
      this.isLoading = true;
      this.error = null;
      const toast = useToastStore();
      try {
        await spotifyApi.disconnect();
        this.isConnected = false;
        this.isEligible = false;
        this.isInitialized = false;
        this.isReady = false;
        this.isPlaybackActive = false;
        this.spotifyId = null;
        this.displayName = null;
        this.product = null;
        this.deviceId = null;
        toast.info('Spotify account disconnected.');
      } catch (err) {
        const msg = err.response?.data?.message || err.message || 'Failed to disconnect Spotify account';
        this.error = msg;
        toast.error(msg);
      } finally {
        this.isLoading = false;
      }
    },

    async fetchToken() {
      try {
        const data = await spotifyApi.getToken();
        return data.accessToken;
      } catch (err) {
        console.error('Failed to obtain Spotify access token:', err);
        if (err.response?.status === 401) {
          this.isConnected = false;
          this.isReady = false;
          useToastStore().warning('Spotify connection expired. Please reconnect.');
        }
        throw err;
      }
    },

    setReady(deviceId) {
      this.isReady = true;
      this.deviceId = deviceId;
      this.error = null;
    },

    setPlaybackActive(active) {
      this.isPlaybackActive = Boolean(active);
    },

    setError(err) {
      this.error = typeof err === 'string' ? err : err?.message || 'Spotify error';
    },

    handleCallbackParams() {
      if (typeof window === 'undefined') return;
      const params = new URLSearchParams(window.location.search);
      const connected = params.get('spotify_connected');
      const err = params.get('spotify_error');
      const product = params.get('product');

      if (!connected && !err) return;

      const toast = useToastStore();

      if (connected === 'true') {
        const isPrem = product === 'premium';
        if (isPrem) {
          toast.success('Spotify Premium connected! Full playback enabled.');
        } else {
          toast.info('Spotify Free connected. Tracks will play via interactive embed.');
        }
        this.checkStatus();
      } else if (err) {
        let msg = 'Spotify connection failed.';
        if (err === 'access_denied') msg = 'Spotify authorization was canceled.';
        else if (err === 'missing_parameters') msg = 'Invalid response from Spotify.';
        else if (err === 'invalid_or_expired_state') msg = 'Spotify connection session expired. Please retry.';
        toast.error(msg);
      }

      // Clean query parameters from URL cleanly without reload
      params.delete('spotify_connected');
      params.delete('spotify_error');
      params.delete('product');
      const newQuery = params.toString();
      const newUrl = window.location.pathname + (newQuery ? `?${newQuery}` : '') + window.location.hash;
      window.history.replaceState({}, document.title, newUrl);
    },
  },
});
