import { extractSpotifyEmbedUrl } from './detector';
import { useSpotifyStore } from '../../stores/spotify';

let spotifySdkPromise = null;

/**
 * Singleton loader for the official Spotify Web Playback SDK script
 */
export const loadSpotifySDK = () => {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window is unavailable'));
  if (window.Spotify && window.Spotify.Player) return Promise.resolve(window.Spotify);

  if (!spotifySdkPromise) {
    spotifySdkPromise = new Promise((resolve, reject) => {
      const existingScript = document.getElementById('spotify-player-sdk-script');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'spotify-player-sdk-script';
        tag.src = 'https://sdk.scdn.co/spotify-player.js';
        tag.async = true;
        tag.onerror = () => reject(new Error('Failed to load Spotify Web Playback SDK script'));
        document.head.appendChild(tag);
      }

      const prevCallback = window.onSpotifyWebPlaybackSDKReady;
      window.onSpotifyWebPlaybackSDKReady = () => {
        if (typeof prevCallback === 'function') prevCallback();
        resolve(window.Spotify);
      };
    });
  }

  return spotifySdkPromise;
};

export class SpotifyProvider {
  constructor() {
    this.currentTrack = null;
    this.callbacks = {};
    this.isPlaying = false;
    this.status = 'uninitialized'; // 'uninitialized' | 'ready' | 'loaded' | 'error'
    this.trackId = null;
    this.embedUrl = null;

    // Web Playback SDK Native State
    this.player = null;
    this.deviceId = null;
    this.isNative = false;
    this.pendingTrackId = null;
    this.pendingPlay = false;
    this.timeUpdateTimer = null;
    this._volume = 0.8;
    this._muted = false;
    this.currentTime = 0;
    this.duration = 0;
  }

  getCapabilities() {
    if (this.isNative) {
      return {
        canSeek: true,
        canVolume: true,
        hasTimeEvents: true,
        isEmbedded: false,
        providerName: 'Spotify Premium SDK',
        badge: 'Spotify',
        embedUrl: null,
        trackId: this.trackId,
      };
    }

    return {
      canSeek: false,
      canVolume: false,
      hasTimeEvents: false,
      isEmbedded: true,
      providerName: 'Spotify Interactive Embed',
      badge: 'Spotify',
      embedUrl: this.embedUrl,
      trackId: this.trackId,
    };
  }

  init(callbacks = {}) {
    this.callbacks = callbacks;
    this.status = 'ready';

    // Proactively initialize native SDK if user has an eligible account
    if (typeof window !== 'undefined') {
      try {
        const spotifyStore = useSpotifyStore();
        if (spotifyStore.canUseWebPlayback) {
          this.ensurePlayer();
        }
      } catch (e) {
        // Store not yet ready or pinia inactive
      }
    }
  }

  getTrackId(track) {
    if (track?.source?.externalId) {
      return track.source.externalId;
    }
    const rawUrl = track?.url || track?.source?.url || '';
    if (!rawUrl) return null;

    // Direct URI or URL extraction
    const match = rawUrl.match(/spotify(?:\.com\/(?:[a-zA-Z-]+\/)?track|:track)[:\/]([a-zA-Z0-9]{22})/i);
    return match ? match[1] : null;
  }

  async ensurePlayer() {
    if (this.player || typeof window === 'undefined') return;

    try {
      const spotifyStore = useSpotifyStore();
      await loadSpotifySDK();

      if (!window.Spotify || !window.Spotify.Player) return;

      this.player = new window.Spotify.Player({
        name: 'SOUNDWAVE Web Player',
        getOAuthToken: async (cb) => {
          try {
            const token = await spotifyStore.fetchToken();
            cb(token);
          } catch (err) {
            console.warn('Spotify SDK token callback error:', err.message);
          }
        },
        volume: this._volume,
      });

      this.player.addListener('ready', ({ device_id }) => {
        this.deviceId = device_id;
        spotifyStore.setReady(device_id);

        if (this.pendingTrackId) {
          const trackIdToPlay = this.pendingTrackId;
          this.pendingTrackId = null;
          this.playTrackOnDevice(trackIdToPlay);
        }
      });

      this.player.addListener('not_ready', ({ device_id }) => {
        if (this.deviceId === device_id) {
          this.deviceId = null;
          spotifyStore.isReady = false;
        }
      });

      this.player.addListener('player_state_changed', (state) => {
        if (!state) {
          this.isPlaying = false;
          this.stopTimeTracking();
          this.callbacks.onPause?.();
          return;
        }

        const isPaused = state.paused;
        this.isPlaying = !isPaused;
        spotifyStore.setPlaybackActive(!isPaused);

        if (this.isPlaying) {
          this.startTimeTracking();
          this.callbacks.onPlay?.();
          this.callbacks.onPlaying?.();
        } else {
          this.stopTimeTracking();
          this.callbacks.onPause?.();
        }

        if (typeof state.position === 'number') {
          this.currentTime = state.position / 1000;
          this.callbacks.onTimeUpdate?.(this.currentTime);
        }

        if (typeof state.duration === 'number' && state.duration > 0) {
          this.duration = state.duration / 1000;
          this.callbacks.onLoadedMetadata?.(this.duration);
        }

        // Track ended
        if (
          state.paused &&
          state.position === 0 &&
          state.restrictions &&
          state.restrictions.cannot_resume &&
          this.duration > 0
        ) {
          this.stopTimeTracking();
          this.callbacks.onEnded?.();
        }
      });

      this.player.addListener('account_error', ({ message }) => {
        console.warn('Spotify account_error (Free account):', message);
        spotifyStore.isEligible = false;
        if (this.currentTrack) {
          this.fallbackToEmbed(this.currentTrack);
        }
      });

      this.player.addListener('initialization_error', ({ message }) => {
        console.warn('Spotify initialization_error:', message);
        if (this.currentTrack) {
          this.fallbackToEmbed(this.currentTrack);
        }
      });

      this.player.addListener('authentication_error', ({ message }) => {
        console.warn('Spotify authentication_error:', message);
        if (this.currentTrack) {
          this.fallbackToEmbed(this.currentTrack);
        }
      });

      this.player.addListener('playback_error', ({ message }) => {
        console.warn('Spotify playback_error:', message);
        this.callbacks.onError?.(new Error(`Spotify playback error: ${message}`));
      });

      await this.player.connect();
    } catch (err) {
      console.warn('Spotify Web Playback SDK setup failed, using embed mode:', err.message);
      if (this.currentTrack) {
        this.fallbackToEmbed(this.currentTrack);
      }
    }
  }

  startTimeTracking() {
    this.stopTimeTracking();
    this.timeUpdateTimer = setInterval(async () => {
      if (this.player && typeof this.player.getCurrentState === 'function') {
        try {
          const state = await this.player.getCurrentState();
          if (state && typeof state.position === 'number') {
            this.currentTime = state.position / 1000;
            this.callbacks.onTimeUpdate?.(this.currentTime);
          }
        } catch (e) {
          // ignore tracking error
        }
      }
    }, 500);
  }

  stopTimeTracking() {
    if (this.timeUpdateTimer) {
      clearInterval(this.timeUpdateTimer);
      this.timeUpdateTimer = null;
    }
  }

  async playTrackOnDevice(trackId) {
    try {
      const spotifyStore = useSpotifyStore();
      const token = await spotifyStore.fetchToken();

      if (!token || !this.deviceId) {
        this.fallbackToEmbed(this.currentTrack);
        return;
      }

      const res = await fetch(`https://api.spotify.com/v1/me/player/play?device_id=${this.deviceId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          uris: [`spotify:track:${trackId}`],
        }),
      });

      if (!res.ok && res.status !== 204) {
        const text = await res.text().catch(() => '');
        console.warn('Spotify play API rejected:', res.status, text);

        if (res.status === 403 || res.status === 404) {
          // Ineligible or inactive device: gracefully fall back to embed
          this.fallbackToEmbed(this.currentTrack);
          return;
        }
        throw new Error(`Spotify play error: ${res.status}`);
      }

      this.isNative = true;
      this.isPlaying = true;
      this.embedUrl = null;
      this.callbacks.onCapabilities?.(this.getCapabilities());
      this.startTimeTracking();
      this.callbacks.onPlay?.();
      this.callbacks.onPlaying?.();
    } catch (err) {
      console.warn('Error starting playback on Spotify Connect device:', err.message);
      this.fallbackToEmbed(this.currentTrack);
    }
  }

  fallbackToEmbed(track) {
    this.stopTimeTracking();
    this.isNative = false;
    this.isPlaying = false;
    this.trackId = this.getTrackId(track);
    this.embedUrl = this.trackId
      ? `https://open.spotify.com/embed/track/${this.trackId}?utm_source=generator&theme=0`
      : null;
    this.status = 'loaded';

    this.callbacks.onCapabilities?.(this.getCapabilities());

    if (track?.duration) {
      this.callbacks.onLoadedMetadata?.(track.duration);
    }
  }

  async load(track) {
    this.currentTrack = track;
    this.isPlaying = false;

    const trackId = this.getTrackId(track);
    if (!trackId) {
      this.status = 'error';
      this.callbacks.onError?.(new Error('Invalid or unsupported Spotify track reference'));
      return;
    }

    this.trackId = trackId;

    let canUseNative = false;
    try {
      const spotifyStore = useSpotifyStore();
      canUseNative = spotifyStore.canUseWebPlayback;
    } catch (e) {
      canUseNative = false;
    }

    if (canUseNative) {
      if (!this.player) {
        this.pendingTrackId = trackId;
        this.isNative = true;
        this.callbacks.onCapabilities?.(this.getCapabilities());
        await this.ensurePlayer();
        return;
      }

      if (this.deviceId) {
        await this.playTrackOnDevice(trackId);
        return;
      }

      // Player exists but device not yet ready
      this.pendingTrackId = trackId;
      this.isNative = true;
      this.callbacks.onCapabilities?.(this.getCapabilities());
      return;
    }

    // Default / fallback: Interactive Embed
    this.fallbackToEmbed(track);
  }

  play() {
    if (this.isNative && this.player) {
      this.player.resume().then(() => {
        this.isPlaying = true;
        this.startTimeTracking();
        this.callbacks.onPlay?.();
      }).catch((err) => {
        this.callbacks.onError?.(err);
      });
      return;
    }

    // Spotify iframe embeds do not expose remote play API without Web Playback SDK / OAuth.
    this.isPlaying = false;
    this.callbacks.onError?.(
      new Error('Spotify playback must be controlled directly inside the Spotify embed player.')
    );
  }

  pause() {
    this.stopTimeTracking();
    this.isPlaying = false;

    if (this.isNative && this.player) {
      this.player.pause().then(() => {
        this.callbacks.onPause?.();
      }).catch(() => {
        this.callbacks.onPause?.();
      });
      return;
    }

    this.callbacks.onPause?.();
  }

  seek(seconds) {
    if (this.isNative && this.player) {
      const ms = Math.max(0, Math.round(seconds * 1000));
      this.currentTime = seconds;
      this.player.seek(ms).then(() => {
        this.callbacks.onTimeUpdate?.(seconds);
      }).catch((err) => {
        this.callbacks.onError?.(err);
      });
      return;
    }

    this.callbacks.onError?.(
      new Error('Seeking is not supported for Spotify embed player.')
    );
  }

  setVolume(vol) {
    this._volume = Math.max(0, Math.min(1, vol));
    if (this.isNative && this.player) {
      this.player.setVolume(this._muted ? 0 : this._volume).catch(() => {});
    }
  }

  setMuted(muted) {
    this._muted = Boolean(muted);
    if (this.isNative && this.player) {
      this.player.setVolume(this._muted ? 0 : this._volume).catch(() => {});
    }
  }

  destroy() {
    this.stopTimeTracking();
    this.pause();
    this.currentTrack = null;
    this.trackId = null;
    this.embedUrl = null;
    this.status = 'uninitialized';
    this.isNative = false;
    this.callbacks.onCapabilities?.({
      ...this.getCapabilities(),
      embedUrl: null,
      trackId: null,
    });
  }
}
