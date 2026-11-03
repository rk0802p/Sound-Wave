import { defineStore } from 'pinia';
import { audioEngine } from '../services/audioEngine';
import { isPlayableAudioUrl, isExternalMediaUrl } from '../data/demoTracks';

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
      return isPlayableAudioUrl(state.currentTrack.url);
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

      audioEngine.init({
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
          this.duration = dur || this.currentTrack?.duration || 0;
          this.isLoading = false;
        },
        onEnded: () => {
          this.handleEnded();
        },
        onError: (err) => {
          console.warn('AudioEngine error:', err);
          this.isPlaying = false;
          this.isLoading = false;
          this.error = 'Audio source could not be played.';
        },
      });

      audioEngine.setVolume(this.volume);
      audioEngine.setMuted(this.muted);
      this.isEngineReady = true;
    },

    async playTrack(track, queue = null, index = null, playlistId = null) {
      this.init();
      if (!track) return;

      this.error = null;

      if (Array.isArray(queue) && queue.length > 0) {
        this.queue = [...queue];
        this.queueIndex = index !== null ? index : queue.findIndex((t) => t._id === track._id);
      }

      this.currentTrack = track;
      this.currentTrackId = track._id;
      if (playlistId) this.currentPlaylistId = playlistId;

      if (!isPlayableAudioUrl(track.url)) {
        audioEngine.pause();
        this.isPlaying = false;
        this.isLoading = false;
        if (isExternalMediaUrl(track.url)) {
          this.error = 'External track link. Click "Open Link" to view in original player.';
        } else {
          this.error = 'Unavailable audio stream.';
        }
        return;
      }

      try {
        this.isLoading = true;
        await audioEngine.loadAndPlay(track.url);
      } catch (err) {
        console.warn('Play request interrupted:', err);
        this.isPlaying = false;
        this.isLoading = false;
        this.error = 'Playback was prevented. Click play to resume.';
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
        audioEngine.pause();
      } else {
        if (!this.isCurrentTrackPlayable) {
          this.error = 'This track cannot be played directly.';
          return;
        }
        try {
          await audioEngine.play();
        } catch (err) {
          console.warn('Resume play failed:', err);
        }
      }
    },

    seek(seconds) {
      audioEngine.seek(seconds);
      this.currentTime = seconds;
    },

    seekByPercentage(percent) {
      if (!this.duration) return;
      const target = (Math.max(0, Math.min(100, percent)) / 100) * this.duration;
      this.seek(target);
    },

    next() {
      if (!this.queue.length) return;

      if (this.repeatMode === 'one' && this.currentTrack) {
        this.seek(0);
        audioEngine.play();
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
        this.playTrack(this.queue[nextIdx], this.queue, nextIdx);
      } else if (this.repeatMode === 'all' && this.queue.length > 0) {
        this.queueIndex = 0;
        this.playTrack(this.queue[0], this.queue, 0);
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
        this.playTrack(this.queue[prevIdx], this.queue, prevIdx);
      } else if (this.queue.length > 0) {
        this.seek(0);
      }
    },

    handleEnded() {
      if (this.repeatMode === 'one') {
        this.seek(0);
        audioEngine.play();
      } else {
        this.next();
      }
    },

    setVolume(vol) {
      const clamped = Math.max(0, Math.min(1, vol));
      this.volume = clamped;
      this.muted = false;
      audioEngine.setVolume(clamped);
      if (typeof window !== 'undefined') {
        localStorage.setItem('soundwave_volume', String(clamped));
      }
    },

    toggleMute() {
      this.muted = !this.muted;
      audioEngine.setMuted(this.muted);
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
      audioEngine.destroy();
      this.currentTrack = null;
      this.currentTrackId = null;
      this.isPlaying = false;
      this.isExpanded = false;
      this.isQueueOpen = false;
    },
  },
});
