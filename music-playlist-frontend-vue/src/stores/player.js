import { defineStore } from 'pinia';
import { soundController } from '../services/providers';
import { MOOD_PLAYLISTS } from '../data/moodPlaylists';
import { resolvePlayableAudioUrl, isAuthorizedStreamUrl, detectProviderType } from '../services/providers/detector';
import {
  createPlaybackAttemptId,
  infoPlayback,
  warnPlayback,
  errorPlayback,
  debugPlayback
} from '../utils/playbackDiagnostics';
import { searchApi } from '../api/search';
// Module-scoped in-flight deduplication and provider environment status cache
const activeResolutions = new Map();
const blockedProviders = new Set(['archive', 'audius', 'spotify', 'youtube', 'direct']);
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


const loadPersistedPlaybackState = () => {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem('soundwave_playback_state_v1');
    if (!raw) return null;
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

export const usePlayerStore = defineStore('player', {
  state: () => {
    const persisted = loadPersistedPlaybackState();
    const initialPlaylist = MOOD_PLAYLISTS[0];
    const initialTrack = persisted?.currentTrack || initialPlaylist.songs[0];
    const initialQueue = (Array.isArray(persisted?.queue) && persisted.queue.length > 0)
      ? persisted.queue
      : initialPlaylist.songs;
    const initialTrackIndex = (typeof persisted?.trackIndex === 'number' && persisted.trackIndex >= 0 && persisted.trackIndex < initialQueue.length)
      ? persisted.trackIndex
      : 0;
    const initialVolume = (typeof persisted?.volume === 'number' && !isNaN(persisted.volume))
      ? Math.max(0, Math.min(1, persisted.volume))
      : 0.85;
    const validRates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const initialSpeed = validRates.includes(persisted?.playbackSpeed) ? persisted.playbackSpeed : 1;
    const initialLoopA = typeof persisted?.loopA === 'number' ? persisted.loopA : null;
    const initialLoopB = typeof persisted?.loopB === 'number' ? persisted.loopB : null;
    const hasValidLoop = initialLoopA !== null && initialLoopB !== null && initialLoopB > initialLoopA;
    const initialIsLooping = hasValidLoop && Boolean(persisted?.isLooping);

    return {
      playlistIndex: 0,
      trackIndex: initialTrackIndex,
      currentPlaylist: initialPlaylist,
      currentTrack: initialTrack,
      queue: initialQueue,
      isPlaying: false,
      isLoading: false,
      playbackState: 'idle', // 'idle' | 'resolving' | 'loading' | 'playing' | 'paused' | 'recovering' | 'failed' | 'ended'
      repeat: ['off', 'all', 'one'].includes(persisted?.repeat) ? persisted.repeat : 'off',
      shuffle: typeof persisted?.shuffle === 'boolean' ? persisted.shuffle : false,
      recoveryNotice: null,
      playRequestId: 0,
      currentAttemptId: null,
      currentTime: 0,
      duration: initialTrack?.duration || 233,
      volume: initialVolume,
      muted: typeof persisted?.muted === 'boolean' ? persisted.muted : false,
      error: null,
      isEngineReady: false,

      // Play-Along / Practice Mode: A-B loop & speed
      playbackSpeed: initialSpeed,
      loopA: initialLoopA,
      loopB: initialLoopB,
      isLooping: initialIsLooping,
      
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
          // Do not mark isPlaying = true prematurely on initial play request.
          // Wait for onPlaying event when audio data is actually buffering/rendering.
          this.isLoading = true;
          this.playbackState = 'loading';
        },
        onPause: () => {
          this.isPlaying = false;
          this.isLoading = false;
          if (this.playbackState !== 'failed' && this.playbackState !== 'ended') {
            this.playbackState = 'paused';
            infoPlayback('PLAYER_STATE', this.currentAttemptId, 'state_paused', {
              currentTime: this.currentTime
            });
          }
          if (typeof document !== 'undefined') {
            document.body.classList.remove('playing');
          }
        },
        onPlaying: () => {
          this.isPlaying = true;
          this.isLoading = false;
          this.playbackState = 'playing';
          infoPlayback('PLAYER_STATE', this.currentAttemptId, 'state_playing', {
            currentTime: this.currentTime,
            duration: this.duration
          });
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
          // Play-Along A-B seamless loop
          if (this.isLooping && this.loopA !== null && this.loopB !== null && this.loopB > this.loopA) {
            if (time >= this.loopB) {
              this.seek(this.loopA);
            }
          }
        },
        onLoadedMetadata: (dur) => {
          if (dur && dur > 0) {
            this.duration = dur;
            if (this.loopB !== null && this.loopB > dur) {
              this.loopB = dur;
              if (this.loopA !== null && this.loopA >= this.loopB) {
                this.isLooping = false;
              }
            }
          }
        },
        onEnded: () => {
          if (this.isLooping && this.loopA !== null && this.loopB !== null && this.loopB > this.loopA) {
            this.seek(this.loopA);
            soundController.play();
            return;
          }
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
      soundController.setPlaybackRate(this.playbackSpeed);
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
      this.persistState();

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
            if (blockedProviders.has(alt.provider) || !['jamendo', 'deezer', 'itunes', 'apple'].includes(alt.provider)) continue;
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

    async playTrack(track, queue = null, index = null, attemptId = null) {
      const effectiveAttemptId = attemptId || createPlaybackAttemptId();
      this.currentAttemptId = effectiveAttemptId;
      infoPlayback('TRACK_SELECTION', effectiveAttemptId, 'play_track_requested', {
        trackId: track?.id || track?._id,
        title: track?.title,
        provider: track?.provider || track?.source?.provider
      });
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

      let audioUrl = resolvePlayableAudioUrl(track);
      const rawProvider = track.provider || track.source?.provider || (audioUrl ? detectProviderType(audioUrl) : '');
      const provider = String(rawProvider).toLowerCase().trim();

      // Explicit fail-closed check for unplayable or flagged tracks
      if (track.isUnavailable === true || track.isPlayable === false) {
        soundController.pause();
        this.isPlaying = false;
        this.isLoading = false;
        this.playbackState = 'unavailable';
        this.currentTime = 0;
        this.error = 'Playback unavailable: Track is marked as unavailable or unplayable.';
        warnPlayback('TRACK_SELECTION', this.currentAttemptId, 'track_unplayable_flagged', {
          trackId: track.id || track._id,
          isUnavailable: track.isUnavailable,
          isPlayable: track.isPlayable
        });
        if (typeof document !== 'undefined') {
          document.body.classList.remove('playing');
        }
        return;
      }

      // Policy Gate: Multi-source direct audio providers (Jamendo, Deezer, iTunes/Apple)
      const AUTHORIZED_PROVIDERS = ['jamendo', 'deezer', 'itunes', 'apple'];
      if (!provider || !AUTHORIZED_PROVIDERS.includes(provider)) {
        soundController.pause();
        this.isPlaying = false;
        this.isLoading = false;
        this.playbackState = 'unavailable';
        this.currentTime = 0;
        this.error = 'Playback unavailable: ' + (provider ? provider.toUpperCase() : 'UNKNOWN') + ' provider is disabled or pending verification.';
        warnPlayback('PROVIDER_POLICY', this.currentAttemptId, 'provider_rejected_portfolio_policy', { provider });
        if (typeof document !== 'undefined') {
          document.body.classList.remove('playing');
        }
        return;
      }
      const providerTrackId = track.providerTrackId || track.source?.externalId;

      const hasValidDirectUrl = Boolean(audioUrl && isAuthorizedStreamUrl(audioUrl));
      // Check if provider is permanently blocked in this environment (only if no valid pre-resolved direct stream)
      if (!hasValidDirectUrl && provider && blockedProviders.has(provider)) {
        warnPlayback('PROVIDER_POLICY', this.currentAttemptId, 'provider_blocked_resolution_needed', { provider });
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
        infoPlayback('PLAYER_STATE', this.currentAttemptId, 'sound_controller_loading', {
          trackId: track.id || track._id,
          title: track.title
        });
        await soundController.load(track, this.currentAttemptId);
        if (this.playRequestId !== reqId) return;
        soundController.setPlaybackRate(this.playbackSpeed);
        this.persistState();
        // Keep isLoading true until onPlaying confirms actual media progression
        if (this.currentTime > 0) {
          this.playbackState = 'playing';
          this.isPlaying = true;
          this.isLoading = false;
        }
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
          if (this.playbackState !== 'loading') {
            this.isLoading = false;
          }
        }
      }
    },

    async togglePlay() {
      this.init();
      if (!this.currentTrack && this.queue.length > 0) {
        return this.playTrack(this.queue[0], this.queue, 0);
      }

      if (this.isPlaying || this.isLoading) {
        soundController.pause();
        this.isPlaying = false;
        this.isLoading = false;
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
      this.persistState();
    },

    toggleShuffle() {
      this.shuffle = !this.shuffle;
      this.persistState();
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
      this.persistState();
    },

    setMuted(muted) {
      this.muted = Boolean(muted);
      soundController.setMuted(this.muted);
      this.persistState();
    },

    setPlaybackSpeed(speed) {
      const validRates = [0.5, 0.75, 1, 1.25, 1.5, 2];
      const rate = validRates.includes(speed) ? speed : 1;
      this.playbackSpeed = rate;
      soundController.setPlaybackRate(rate);
      this.persistState();
    },

    cyclePlaybackSpeed() {
      const validRates = [0.5, 0.75, 1, 1.25, 1.5, 2];
      const currentIdx = validRates.indexOf(this.playbackSpeed);
      const nextIdx = (currentIdx + 1) % validRates.length;
      this.setPlaybackSpeed(validRates[nextIdx]);
    },

    setLoopA(seconds = null) {
      const time = typeof seconds === 'number' ? seconds : Math.floor(this.currentTime * 10) / 10;
      this.loopA = Math.max(0, time);
      if (this.loopB !== null && this.loopA >= this.loopB) {
        this.loopB = null;
        this.isLooping = false;
      }
      this.persistState();
    },

    setLoopB(seconds = null) {
      const time = typeof seconds === 'number' ? seconds : Math.floor(this.currentTime * 10) / 10;
      this.loopB = Math.min(this.duration || 9999, time);
      if (this.loopA === null) {
        this.loopA = 0;
      }
      if (this.loopB > this.loopA) {
        this.isLooping = true;
      } else {
        this.isLooping = false;
      }
      this.persistState();
    },

    toggleLoop() {
      if (this.loopA !== null && this.loopB !== null && this.loopB > this.loopA) {
        this.isLooping = !this.isLooping;
        if (this.isLooping && (this.currentTime < this.loopA || this.currentTime >= this.loopB)) {
          this.seek(this.loopA);
        }
      } else {
        this.isLooping = false;
      }
      this.persistState();
    },

    clearLoop() {
      this.loopA = null;
      this.loopB = null;
      this.isLooping = false;
      this.persistState();
    },

    persistState() {
      if (typeof localStorage === 'undefined') return;
      try {
        const payload = {
          queue: Array.isArray(this.queue) ? this.queue.slice(0, 100) : [],
          trackIndex: this.trackIndex,
          currentTrack: this.currentTrack,
          volume: this.volume,
          muted: this.muted,
          shuffle: this.shuffle,
          repeat: this.repeat,
          playbackSpeed: this.playbackSpeed,
          loopA: this.loopA,
          loopB: this.loopB,
          isLooping: this.isLooping,
          savedAt: Date.now(),
        };
        localStorage.setItem('soundwave_playback_state_v1', JSON.stringify(payload));
      } catch (e) {
        console.warn('Failed to persist playback state:', e);
      }
    },

    rehydrateState() {
      if (typeof localStorage === 'undefined') return;
      try {
        const raw = localStorage.getItem('soundwave_playback_state_v1');
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data && typeof data === 'object') {
          if (Array.isArray(data.queue) && data.queue.length > 0) {
            this.queue = data.queue;
          }
          if (typeof data.trackIndex === 'number' && data.trackIndex >= 0 && data.trackIndex < this.queue.length) {
            this.trackIndex = data.trackIndex;
          }
          if (data.currentTrack) {
            this.currentTrack = data.currentTrack;
            this.duration = data.currentTrack.duration || 240;
          }
          if (typeof data.volume === 'number' && !isNaN(data.volume)) {
            this.volume = Math.max(0, Math.min(1, data.volume));
          }
          if (typeof data.muted === 'boolean') {
            this.muted = data.muted;
          }
          if (typeof data.shuffle === 'boolean') {
            this.shuffle = data.shuffle;
          }
          if (['off', 'all', 'one'].includes(data.repeat)) {
            this.repeat = data.repeat;
          }
          if (typeof data.playbackSpeed === 'number' && data.playbackSpeed > 0) {
            this.playbackSpeed = data.playbackSpeed;
            if (this.isEngineReady) {
              soundController.setPlaybackRate(this.playbackSpeed);
            }
          }
          if (typeof data.loopA === 'number') this.loopA = data.loopA;
          if (typeof data.loopB === 'number') this.loopB = data.loopB;
          if (typeof data.isLooping === 'boolean') this.isLooping = data.isLooping;
        }
      } catch (e) {
        console.warn('Failed to rehydrate playback state:', e);
      }
    },

    playNext(track) {
      if (!track) return;
      if (!Array.isArray(this.queue)) {
        this.queue = [];
      }
      const insertIdx = this.trackIndex >= 0 ? this.trackIndex + 1 : this.queue.length;
      this.queue.splice(insertIdx, 0, track);
      this.persistState();
      if (!this.currentTrack) {
        this.playTrack(track, this.queue, 0);
      }
    },

    addToQueue(track) {
      if (!track) return;
      if (!Array.isArray(this.queue)) {
        this.queue = [];
      }
      this.queue.push(track);
      this.persistState();
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
      this.persistState();
    },
  },
});
