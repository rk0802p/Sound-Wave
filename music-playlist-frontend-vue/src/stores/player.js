import { defineStore } from 'pinia';
import { soundController } from '../services/providers';
import { MOOD_PLAYLISTS } from '../data/moodPlaylists';
import { resolvePlayableAudioUrl } from '../services/providers/detector';
import { searchApi } from '../api/search';
// Module-scoped in-flight deduplication and provider environment status cache
const activeResolutions = new Map();
const blockedProviders = new Set();
const loggedBlockedProviders = new Set();

const resolveWithDedup = async (provider, providerTrackId) => {
  if (blockedProviders.has(provider)) {
    const err = new Error(`Provider '${provider}' is unconfigured or disabled in this environment`);
    err.code = 'PROVIDER_UNCONFIGURED';
    err.response = { status: 403, data: { code: 'PROVIDER_UNCONFIGURED', message: err.message } };
    throw err;
  }

  const key = `${provider}:${providerTrackId}`;
  if (activeResolutions.has(key)) {
    return activeResolutions.get(key);
  }

  const p = (async () => {
    try {
      return await searchApi.resolve(provider, providerTrackId);
    } catch (err) {
      if (err.response?.status === 403 || err.response?.data?.code === 'PROVIDER_UNCONFIGURED') {
        blockedProviders.add(provider);
        if (!loggedBlockedProviders.has(provider)) {
          loggedBlockedProviders.add(provider);
          console.warn(`[SOUNDWAVE Player] Provider '${provider}' is disabled in this environment. Skipping future resolution calls.`);
        }
      }
      throw err;
    } finally {
      activeResolutions.delete(key);
    }
  })();

  activeResolutions.set(key, p);
  return p;
};


export const usePlayerStore = defineStore('player', {
  state: () => {
    const initialPlaylist = MOOD_PLAYLISTS[0];
    const initialTrack = initialPlaylist.songs[0];

    return {
      playlistIndex: 0,
      trackIndex: 0,
      currentPlaylist: initialPlaylist,
      currentTrack: initialTrack,
      queue: initialPlaylist.songs,
      isPlaying: false,
      isLoading: false,
      playbackState: 'idle', // 'idle' | 'resolving' | 'loading' | 'playing' | 'paused' | 'recovering' | 'failed' | 'ended'
      repeat: 'off', // 'off' | 'all' | 'one'
      shuffle: false,
      recoveryNotice: null,
      playRequestId: 0,
      currentTime: 0,
      duration: initialTrack?.duration || 233,
      volume: 0.85,
      muted: false,
      error: null,
      isEngineReady: false,
      
      // Theme colors for glossy bubbles and wash
      o1: initialPlaylist.o1,
      o2: initialPlaylist.o2,
      tint: initialPlaylist.tint,
      inMoodScene: false,
      activeMoodIndex: 0,
    };
  },

  getters: {
    hasTrack: (state) => Boolean(state.currentTrack),
    progressPercentage: (state) => {
      if (!state.duration || state.duration === 0) return 0;
      return Math.min(100, Math.max(0, (state.currentTime / state.duration) * 100));
    },
    hasNext: (state) => {
      return state.queue.length > 1;
    },
    hasPrevious: (state) => {
      return state.queue.length > 1 || state.currentTime > 3;
    },
  },

  actions: {
    async syncProviderCapabilities() {
      try {
        const res = await searchApi.getProviders();
        const list = Array.isArray(res) ? res : res.providers || [];
        for (const p of list) {
          if (p.isConfigured === false || p.status === 'unconfigured') {
            blockedProviders.add(p.name);
          }
        }
      } catch {}
    },
    init() {
      if (this.isEngineReady) return;

      soundController.init({
        onPlay: () => {
          this.isPlaying = true;
          this.isLoading = false;
          this.playbackState = 'playing';
          if (typeof document !== 'undefined') {
            document.body.classList.add('playing');
          }
        },
        onPause: () => {
          this.isPlaying = false;
          if (this.playbackState !== 'failed' && this.playbackState !== 'ended') {
            this.playbackState = 'paused';
          }
          if (typeof document !== 'undefined') {
            document.body.classList.remove('playing');
          }
        },
        onPlaying: () => {
          this.isPlaying = true;
          this.isLoading = false;
          this.playbackState = 'playing';
          if (typeof document !== 'undefined') {
            document.body.classList.add('playing');
          }
        },
        onWaiting: () => {
          this.isLoading = true;
          if (this.playbackState === 'playing') {
            this.playbackState = 'loading';
          }
        },
        onTimeUpdate: (time) => {
          this.currentTime = time;
        },
        onLoadedMetadata: (dur) => {
          if (dur && dur > 0) {
            this.duration = dur;
          }
        },
        onEnded: () => {
          if (this.repeat === 'one') {
            this.seek(0);
            this.playTrack(this.currentTrack, this.queue, this.trackIndex);
          } else if (this.repeat === 'off' && this.trackIndex === this.queue.length - 1) {
            this.isPlaying = false;
            this.playbackState = 'ended';
            if (typeof document !== 'undefined') {
              document.body.classList.remove('playing');
            }
          } else {
            this.nextTrack();
          }
        },
        onError: (err) => {
          console.warn('Audio playback notice:', err);
          this.isLoading = false;
          if (this.playbackState !== 'recovering') {
            this.playbackState = 'failed';
            this.isPlaying = false;
            this.error = typeof err === 'object' && err?.message ? err.message : 'Audio stream playback error';
          }
        },
      });

      soundController.setVolume(this.volume);
      soundController.setMuted(this.muted);
      this.isEngineReady = true;
      this.syncProviderCapabilities();
    },

    setTheme(o1, o2, tint = null) {
      this.o1 = o1;
      this.o2 = o2;
      if (tint) this.tint = tint;

      if (typeof document !== 'undefined') {
        const root = document.documentElement.style;
        root.setProperty('--o1', o1);
        root.setProperty('--o2', o2);
        root.setProperty('--sh', `${o2}88`);

        const wash = document.getElementById('wash');
        if (wash && (tint || this.tint)) {
          wash.style.backgroundColor = tint || this.tint;
        }
      }
    },

    setMoodScene(inMood, index, moodItem) {
      this.inMoodScene = inMood;
      this.activeMoodIndex = index;
      if (inMood && moodItem) {
        this.setTheme(moodItem.o1, moodItem.o2, moodItem.tint);
      } else if (!inMood && this.currentPlaylist) {
        this.setTheme(this.currentPlaylist.o1, this.currentPlaylist.o2, this.currentPlaylist.tint);
      }
    },

    async selectPlaylist(playlistOrIndex, autoPlay = true) {
      let p;
      let idx;
      if (typeof playlistOrIndex === 'number') {
        idx = playlistOrIndex;
        p = MOOD_PLAYLISTS[idx] || MOOD_PLAYLISTS[0];
      } else {
        p = playlistOrIndex;
        idx = MOOD_PLAYLISTS.findIndex((item) => item.id === p.id || item._id === p._id);
        if (idx === -1) idx = 0;
      }

      this.playlistIndex = idx;
      this.currentPlaylist = p;
      this.queue = (p.songs && p.songs.length > 0) ? p.songs : (p.t || []);
      this.trackIndex = 0;
      this.currentTrack = this.queue[0];
      this.duration = this.currentTrack?.duration || 240;
      this.currentTime = 0;

      // Update theme to this playlist's colors
      this.setTheme(p.o1, p.o2, p.tint);

      if (autoPlay && this.currentTrack) {
        await this.playTrack(this.currentTrack, this.queue, 0);
      }
    },

    async tryAlternativeFallback(track, reqId) {
      if (!track || !Array.isArray(track.alternatives) || track.alternatives.length === 0) {
        return false;
      }

      this.playbackState = 'recovering';
      this.isLoading = true;

      for (const alt of track.alternatives) {
        if (this.playRequestId !== reqId) return false;
        if (alt._attempted) continue;
        alt._attempted = true;

        let streamUrl = alt.streamUrl;
        if (!streamUrl && alt.needsResolution && alt.provider && alt.providerTrackId) {
          try {
            if (blockedProviders.has(alt.provider)) continue;
            const resolved = await resolveWithDedup(alt.provider, alt.providerTrackId);
            if (this.playRequestId !== reqId) return false;
            if (resolved?.streamUrl) {
              streamUrl = resolved.streamUrl;
            }
          } catch (e) {
            console.warn(`Alternative resolution failed for ${alt.provider}:`, e);
          }
        }

        if (streamUrl && typeof streamUrl === 'string' && /^https?:\/\//i.test(streamUrl)) {
          try {
            // Apply alternative stream to track
            track.streamUrl = streamUrl;
            track.url = streamUrl;
            track.provider = alt.provider;
            track.activeAlternative = alt;
            if (alt.providerTrackUrl) track.providerTrackUrl = alt.providerTrackUrl;
            if (alt.license) track.license = alt.license;
            if (alt.attribution) track.attribution = alt.attribution;
            if (alt.licenseMeta) track.licenseMeta = alt.licenseMeta;
            this.recoveryNotice = `Switched to ${alt.provider.toUpperCase()} fallback stream`;

            await soundController.load(track);
            if (this.playRequestId !== reqId) return false;

            this.playbackState = 'playing';
            this.isPlaying = true;
            this.isLoading = false;
            this.error = null;
            return true;
          } catch (loadErr) {
            console.warn(`Alternative playback load failed for ${alt.provider}:`, loadErr);
          }
        }
      }

      return false;
    },

    async playTrack(track, queue = null, index = null) {
      this.init();
      if (!track) {
        this.playbackState = 'idle';
        return;
      }

      this.error = null;
      this.recoveryNotice = null;
      if (Array.isArray(queue) && queue.length > 0) {
        this.queue = queue;
        this.trackIndex = typeof index === 'number' ? index : queue.indexOf(track);
        if (this.trackIndex === -1) this.trackIndex = 0;
      }

      this.currentTrack = track;
      this.duration = track.duration || 240;
      this.currentTime = 0;

      // Unique request sequence ID to guard against rapid track-switching races
      this.playRequestId = (this.playRequestId || 0) + 1;
      const reqId = this.playRequestId;

      const provider = track.provider || track.source?.provider;
      const providerTrackId = track.providerTrackId || track.source?.externalId;
      let audioUrl = resolvePlayableAudioUrl(track);

      // Check if provider is permanently blocked in this environment
      if (provider && blockedProviders.has(provider)) {
        const recovered = await this.tryAlternativeFallback(track, reqId);
        if (recovered || this.playRequestId !== reqId) return;

        soundController.pause();
        this.isPlaying = false;
        this.isLoading = false;
        this.playbackState = 'unavailable';
        this.currentTime = 0;
        this.error = `Playback unavailable: ${provider.toUpperCase()} provider is disabled in production environment.`;
        if (typeof document !== 'undefined') {
          document.body.classList.remove('playing');
        }
        return;
      }

      // On-demand playback resolution if URL is missing or marked for resolution
      if ((!audioUrl || track.needsResolution) && provider && provider !== 'spotify' && providerTrackId) {
        try {
          this.playbackState = 'resolving';
          this.isLoading = true;
          const resolved = await resolveWithDedup(provider, providerTrackId);

          // Discard if user clicked another track during async resolution
          if (this.playRequestId !== reqId) return;

          if (resolved?.streamUrl) {
            track.streamUrl = resolved.streamUrl;
            track.url = resolved.streamUrl;
            track.duration = resolved.metadata?.duration || track.duration;
            if (resolved.metadata) {
              if (resolved.metadata.providerTrackUrl) track.providerTrackUrl = resolved.metadata.providerTrackUrl;
              if (resolved.metadata.license) track.license = resolved.metadata.license;
              if (resolved.metadata.licenseMeta) track.licenseMeta = resolved.metadata.licenseMeta;
              if (resolved.metadata.attribution) track.attribution = resolved.metadata.attribution;
            }
            audioUrl = resolved.streamUrl;
          }
        } catch (resErr) {
          if (this.playRequestId !== reqId) return;

          const isBlocked = resErr.response?.status === 403 || resErr.response?.data?.code === 'PROVIDER_UNCONFIGURED';
          if (!isBlocked) {
            console.warn('On-demand resolution notice:', resErr.message || resErr);
          }

          // Attempt alternative fallback if primary resolution failed
          const recovered = await this.tryAlternativeFallback(track, reqId);
          if (recovered || this.playRequestId !== reqId) return;

          if (isBlocked) {
            soundController.pause();
            this.isPlaying = false;
            this.isLoading = false;
            this.playbackState = 'unavailable';
            this.currentTime = 0;
            this.error = resErr.response?.data?.message || `Playback unavailable: ${provider.toUpperCase()} provider is disabled in production.`;
            if (typeof document !== 'undefined') {
              document.body.classList.remove('playing');
            }
            return;
          }
        }
      }

      // If user navigated away during resolution, abort
      if (this.playRequestId !== reqId) return;

      const isSpotify = provider === 'spotify' || (track.url && track.url.includes('spotify.com'));
      if (!audioUrl && !isSpotify) {
        // Check if alternative fallback is available before giving up
        const recovered = await this.tryAlternativeFallback(track, reqId);
        if (recovered || this.playRequestId !== reqId) return;

        soundController.pause();
        this.isPlaying = false;
        this.isLoading = false;
        this.playbackState = 'failed';
        this.currentTime = 0;
        this.error = 'No playable audio stream available for this track';
        if (typeof document !== 'undefined') {
          document.body.classList.remove('playing');
        }
        return;
      }

      try {
        this.playbackState = 'loading';
        this.isLoading = true;
        await soundController.load(track);
        if (this.playRequestId !== reqId) return;
        this.playbackState = 'playing';
        this.isPlaying = true;
      } catch (err) {
        if (this.playRequestId !== reqId) return;
        console.warn('Sound controller load warning:', err);

        // One-time auto re-resolution retry if stream URL expired or failed
        if (provider && provider !== 'spotify' && !blockedProviders.has(provider) && providerTrackId && !track._retriedOnce) {
          track._retriedOnce = true;
          try {
            this.playbackState = 'recovering';
            const fresh = await resolveWithDedup(provider, providerTrackId);
            if (this.playRequestId !== reqId) return;
            if (fresh?.streamUrl) {
              track.streamUrl = fresh.streamUrl;
              track.url = fresh.streamUrl;
              await soundController.load(track);
              if (this.playRequestId !== reqId) return;
              this.playbackState = 'playing';
              this.isPlaying = true;
              return;
            }
          } catch (retryErr) {
            console.warn('Re-resolution attempt failed:', retryErr);
          }
        }

        // Attempt alternative fallback if primary stream failed
        const recovered = await this.tryAlternativeFallback(track, reqId);
        if (recovered || this.playRequestId !== reqId) return;

        // Fallback direct audio if needed
        try {
          if (typeof window !== 'undefined' && window._soundwaveAudio && audioUrl) {
            window._soundwaveAudio.src = audioUrl;
            await window._soundwaveAudio.play();
            if (this.playRequestId === reqId) {
              this.playbackState = 'playing';
              this.isPlaying = true;
            }
          }
        } catch (e) {
          if (this.playRequestId === reqId) {
            this.playbackState = 'failed';
            this.isPlaying = false;
            this.error = 'Playback failed. The remote audio stream may be unavailable.';
          }
        }
      } finally {
        if (this.playRequestId === reqId) {
          this.isLoading = false;
        }
      }
    },

    async togglePlay() {
      this.init();
      if (!this.currentTrack && this.queue.length > 0) {
        return this.playTrack(this.queue[0], this.queue, 0);
      }

      if (this.isPlaying) {
        soundController.pause();
        this.isPlaying = false;
        this.playbackState = 'paused';
        if (typeof document !== 'undefined') {
          document.body.classList.remove('playing');
        }
      } else {
        if (!this.currentTrack) return;
        const audioUrl = resolvePlayableAudioUrl(this.currentTrack);
        if (!audioUrl) {
          if (this.currentTrack.needsResolution && this.currentTrack.providerTrackId) {
            return this.playTrack(this.currentTrack, this.queue, this.trackIndex);
          }
          this.isPlaying = false;
          this.playbackState = 'failed';
          return;
        }
        if (!soundController.currentTrack) {
          await this.playTrack(this.currentTrack, this.queue, this.trackIndex);
        } else {
          try {
            await soundController.play();
            this.isPlaying = true;
            this.playbackState = 'playing';
            if (typeof document !== 'undefined') {
              document.body.classList.add('playing');
            }
          } catch {
            await this.playTrack(this.currentTrack, this.queue, this.trackIndex);
          }
        }
      }
    },

    nextTrack() {
      if (!this.queue || this.queue.length === 0) return;
      let nextIdx;
      if (this.shuffle && this.queue.length > 1) {
        do {
          nextIdx = Math.floor(Math.random() * this.queue.length);
        } while (nextIdx === this.trackIndex);
      } else {
        nextIdx = (this.trackIndex + 1) % this.queue.length;
      }
      this.trackIndex = nextIdx;
      const nextSong = this.queue[nextIdx];
      this.playTrack(nextSong, this.queue, nextIdx);
    },

    prevTrack() {
      if (!this.queue || this.queue.length === 0) return;
      if (this.currentTime > 3) {
        this.seek(0);
        return;
      }
      const prevIdx = (this.trackIndex - 1 + this.queue.length) % this.queue.length;
      this.trackIndex = prevIdx;
      const prevSong = this.queue[prevIdx];
      this.playTrack(prevSong, this.queue, prevIdx);
    },

    cycleRepeat() {
      const modes = ['off', 'all', 'one'];
      const nextIdx = (modes.indexOf(this.repeat) + 1) % modes.length;
      this.repeat = modes[nextIdx];
    },

    toggleShuffle() {
      this.shuffle = !this.shuffle;
    },

    seek(seconds) {
      if (isNaN(seconds)) return;
      const clamped = Math.max(0, Math.min(seconds, this.duration || 0));
      this.currentTime = clamped;
      soundController.seek(clamped);
    },

    setVolume(vol) {
      this.volume = Math.max(0, Math.min(1, vol));
      soundController.setVolume(this.volume);
    },

    setMuted(muted) {
      this.muted = Boolean(muted);
      soundController.setMuted(this.muted);
    },

    addToQueue(track) {
      if (!track) return;
      if (!Array.isArray(this.queue)) {
        this.queue = [];
      }
      this.queue.push(track);
      if (!this.currentTrack) {
        this.playTrack(track, this.queue, this.queue.length - 1);
      }
    },

    removeFromQueue(index) {
      if (!Array.isArray(this.queue) || index < 0 || index >= this.queue.length) return;
      this.queue.splice(index, 1);
      if (this.trackIndex >= this.queue.length) {
        this.trackIndex = Math.max(0, this.queue.length - 1);
      }
    },
  },
});
