import { defineStore } from 'pinia';
import { soundController } from '../services/providers';
import { isPlayableAudioUrl, isExternalMediaUrl } from '../data/demoTracks';
import { detectProviderType, extractSpotifyEmbedUrl } from '../services/providers/detector';

export const usePlayerStore = defineStore('player', {
  state: () => {
    const savedVol = typeof window !== 'undefined' ? localStorage.getItem('soundwave_volume') : null;
    const initialVol = savedVol !== null ? parseFloat(savedVol) : 0.8;

    return {
      currentTrackId: null,
      currentPlaylistId: null,
      currentTrack: null,
      queue: [],
      queueIndex: -1,
      isPlaying: false,
      isLoading: false,
      currentTime: 0,
      duration: 0,
      volume: isNaN(initialVol) ? 0.8 : Math.max(0, Math.min(1, initialVol)),
      muted: false,
      shuffle: false,
      repeatMode: 'off', // 'off' | 'all' | 'one'
      error: null,
      isExpanded: false,
      isQueueOpen: false,
      isEngineReady: false,
      providerCapabilities: {
        canSeek: true,
        canVolume: true,
        hasTimeEvents: true,
        isEmbedded: false,
        providerName: 'Direct Audio',
        badge: 'FLAC/MP3',
        embedUrl: null,
      },
    };
  },

  getters: {
    hasTrack: (state) => Boolean(state.currentTrack),
    progressPercentage: (state) => {
      if (!state.duration || state.duration === 0) return 0;
      return Math.min(100, Math.max(0, (state.currentTime / state.duration) * 100));
    },
    isCurrentTrackPlayable: (state) => {
      if (!state.currentTrack?.url) return false;
      const type = detectProviderType(state.currentTrack.url);
      return type === 'direct' || type === 'youtube' || type === 'spotify';
    },
    currentProviderType: (state) => {
      if (!state.currentTrack?.url) return 'direct';
      return detectProviderType(state.currentTrack.url);
    },
    hasNext: (state) => {
      if (state.repeatMode === 'all' || state.shuffle) return state.queue.length > 0;
      return state.queueIndex < state.queue.length - 1;
    },
    hasPrevious: (state) => {
      return state.queueIndex > 0 || state.currentTime > 3;
    },
  },

  actions: {
    init() {
      if (this.isEngineReady) return;

      soundController.init({
        onPlay: () => {
          this.isPlaying = true;
          this.isLoading = false;
        },
        onPause: () => {
          this.isPlaying = false;
        },
        onPlaying: () => {
          this.isPlaying = true;
          this.isLoading = false;
        },
        onWaiting: () => {
          this.isLoading = true;
        },
        onTimeUpdate: (time) => {
          this.currentTime = time;
        },
        onLoadedMetadata: (dur) => {
          if (dur && dur > 0) {
            this.duration = dur;
          } else if (this.currentTrack?.duration) {
            this.duration = this.currentTrack.duration;
          }
          this.isLoading = false;
        },
        onEnded: () => {
          this.handleEnded();
        },
        onError: (err) => {
          console.warn('SoundController error:', err);
          this.isPlaying = false;
          this.isLoading = false;
          this.error = 'Audio source could not be played.';
        },
        onCapabilities: (caps) => {
          this.providerCapabilities = { ...this.providerCapabilities, ...caps };
        },
      });

      soundController.setVolume(this.volume);
      soundController.setMuted(this.muted);
      this.isEngineReady = true;
    },

    async playTrack(track, queue = null, index = null, playlistId = null) {
      this.init();
      if (!track) return;

      this.error = null;

      if (Array.isArray(queue) && queue.length > 0) {
        this.queue = [...queue];
        this.queueIndex = index !== null ? index : queue.findIndex((t) => t._id === track._id);
      } else if (!this.queue.some((t) => t._id === track._id)) {
        this.queue = [track];
        this.queueIndex = 0;
      }

      this.currentTrack = track;
      this.currentTrackId = track._id;
      if (playlistId) this.currentPlaylistId = playlistId;

      const providerType = detectProviderType(track.url);
      if (providerType === 'spotify') {
        const embedUrl = extractSpotifyEmbedUrl(track.url);
        this.providerCapabilities = {
          canSeek: false,
          canVolume: false,
          hasTimeEvents: false,
          isEmbedded: true,
          providerName: 'Spotify',
          badge: 'Spotify',
          embedUrl,
        };
      } else if (providerType === 'youtube') {
        this.providerCapabilities = {
          canSeek: true,
          canVolume: true,
          hasTimeEvents: true,
          isEmbedded: true,
          providerName: 'YouTube Stream',
          badge: 'YouTube',
          embedUrl: null,
        };
      } else {
        this.providerCapabilities = {
          canSeek: true,
          canVolume: true,
          hasTimeEvents: true,
          isEmbedded: false,
          providerName: 'Direct Audio',
          badge: 'FLAC/MP3',
          embedUrl: null,
        };
      }

      this.duration = track.duration || 0;
      this.currentTime = 0;

      try {
        this.isLoading = true;
        await soundController.loadAndPlay(track);
      } catch (err) {
        console.warn('Play request interrupted:', err);
        this.isPlaying = false;
        this.isLoading = false;
        if (providerType === 'external') {
          this.error = 'External track link. Click "Open Link" to view in original player.';
        } else {
          this.error = 'Playback was prevented. Click play to resume.';
        }
      }
    },

    async togglePlay() {
      this.init();
      if (!this.currentTrack) {
        if (this.queue.length > 0) {
          await this.playTrack(this.queue[0], this.queue, 0);
        }
        return;
      }

      if (this.isPlaying) {
        soundController.pause();
      } else {
        try {
          soundController.play();
        } catch (err) {
          console.warn('Resume play failed:', err);
        }
      }
    },

    seek(seconds) {
      if (!this.providerCapabilities.canSeek) return;
      soundController.seek(seconds);
      this.currentTime = seconds;
    },

    seekByPercentage(percent) {
      if (!this.duration || !this.providerCapabilities.canSeek) return;
      const target = (Math.max(0, Math.min(100, percent)) / 100) * this.duration;
      this.seek(target);
    },

    next() {
      if (!this.queue.length) return;

      if (this.repeatMode === 'one' && this.currentTrack) {
        this.seek(0);
        soundController.play();
        return;
      }

      let nextIdx;
      if (this.shuffle && this.queue.length > 1) {
        do {
          nextIdx = Math.floor(Math.random() * this.queue.length);
        } while (nextIdx === this.queueIndex);
      } else {
        nextIdx = this.queueIndex + 1;
      }

      if (nextIdx < this.queue.length) {
        this.queueIndex = nextIdx;
        this.playTrack(this.queue[nextIdx], this.queue, nextIdx, this.currentPlaylistId);
      } else if (this.repeatMode === 'all' && this.queue.length > 0) {
        this.queueIndex = 0;
        this.playTrack(this.queue[0], this.queue, 0, this.currentPlaylistId);
      } else {
        this.isPlaying = false;
      }
    },

    previous() {
      if (this.currentTime > 3) {
        this.seek(0);
        return;
      }

      if (this.queueIndex > 0) {
        const prevIdx = this.queueIndex - 1;
        this.queueIndex = prevIdx;
        this.playTrack(this.queue[prevIdx], this.queue, prevIdx, this.currentPlaylistId);
      } else if (this.queue.length > 0) {
        this.seek(0);
      }
    },

    handleEnded() {
      if (this.repeatMode === 'one') {
        this.seek(0);
        soundController.play();
      } else {
        this.next();
      }
    },

    setVolume(vol) {
      const clamped = Math.max(0, Math.min(1, vol));
      this.volume = clamped;
      this.muted = false;
      soundController.setVolume(clamped);
      if (typeof window !== 'undefined') {
        localStorage.setItem('soundwave_volume', String(clamped));
      }
    },

    toggleMute() {
      this.muted = !this.muted;
      soundController.setMuted(this.muted);
    },

    toggleShuffle() {
      this.shuffle = !this.shuffle;
    },

    cycleRepeat() {
      if (this.repeatMode === 'off') {
        this.repeatMode = 'all';
      } else if (this.repeatMode === 'all') {
        this.repeatMode = 'one';
      } else {
        this.repeatMode = 'off';
      }
    },

    toggleExpanded() {
      this.isExpanded = !this.isExpanded;
    },

    toggleQueue() {
      this.isQueueOpen = !this.isQueueOpen;
    },

    closeExpanded() {
      this.isExpanded = false;
    },

    closeQueue() {
      this.isQueueOpen = false;
    },

    cleanup() {
      soundController.destroy();
      this.currentTrack = null;
      this.currentTrackId = null;
      this.isPlaying = false;
      this.isExpanded = false;
      this.isQueueOpen = false;
    },

    resetPlayer() {
      this.cleanup();
    },
  },
});
