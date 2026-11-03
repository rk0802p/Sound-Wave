import { defineStore } from 'pinia';
import { isPlayableAudioUrl, isExternalMediaUrl } from '../data/demoTracks';

let audioInstance = null;

const getAudio = () => {
  if (!audioInstance && typeof window !== 'undefined') {
    audioInstance = new Audio();
    audioInstance.preload = 'metadata';
  }
  return audioInstance;
};

export const usePlayerStore = defineStore('player', {
  state: () => {
    const savedVolume = typeof window !== 'undefined' ? localStorage.getItem('soundwave_volume') : null;
    const initialVolume = savedVolume !== null ? parseFloat(savedVolume) : 0.8;

    return {
      currentTrack: null,
      queue: [],
      queueIndex: -1,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      volume: isNaN(initialVolume) ? 0.8 : Math.max(0, Math.min(1, initialVolume)),
      isMuted: false,
      shuffle: false,
      repeatMode: 'off', // 'off' | 'all' | 'one'
      playbackStatus: 'idle', // 'idle' | 'loading' | 'playing' | 'paused' | 'error'
      errorMessage: null,
      listenersAttached: false,
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
    initAudioEngine() {
      if (this.listenersAttached) return;
      const audio = getAudio();
      if (!audio) return;

      audio.volume = this.volume;

      audio.addEventListener('play', () => {
        this.isPlaying = true;
        this.playbackStatus = 'playing';
      });

      audio.addEventListener('pause', () => {
        this.isPlaying = false;
        if (this.playbackStatus !== 'error') {
          this.playbackStatus = 'paused';
        }
      });

      audio.addEventListener('timeupdate', () => {
        this.currentTime = audio.currentTime;
      });

      audio.addEventListener('loadedmetadata', () => {
        this.duration = audio.duration || this.currentTrack?.duration || 0;
        this.playbackStatus = 'playing';
      });

      audio.addEventListener('ended', () => {
        this.handleTrackEnded();
      });

      audio.addEventListener('error', (e) => {
        console.warn('Audio playback error encountered:', e);
        this.isPlaying = false;
        this.playbackStatus = 'error';
        this.errorMessage = 'Audio stream unavailable or format unsupported.';
      });

      this.listenersAttached = true;
    },

    async playTrack(track, newQueue = null, index = null) {
      this.initAudioEngine();
      const audio = getAudio();
      if (!audio || !track) return;

      this.errorMessage = null;

      // Update queue if provided
      if (Array.isArray(newQueue) && newQueue.length > 0) {
        this.queue = [...newQueue];
        this.queueIndex = index !== null ? index : newQueue.findIndex((t) => t._id === track._id);
      }

      this.currentTrack = track;

      // Verify audio playability
      if (!isPlayableAudioUrl(track.url)) {
        audio.pause();
        this.isPlaying = false;
        this.playbackStatus = 'error';
        if (isExternalMediaUrl(track.url)) {
          this.errorMessage = 'This track uses an external link. Click "Open Link" to view source.';
        } else {
          this.errorMessage = 'No playable audio stream available for this track.';
        }
        return;
      }

      try {
        this.playbackStatus = 'loading';
        if (audio.src !== track.url) {
          audio.src = track.url;
          audio.load();
        }
        await audio.play();
        this.isPlaying = true;
        this.playbackStatus = 'playing';
      } catch (err) {
        console.warn('Autoplay or stream playback was prevented:', err);
        this.isPlaying = false;
        this.playbackStatus = 'error';
        this.errorMessage = 'Click play to start playback.';
      }
    },

    async togglePlay() {
      this.initAudioEngine();
      const audio = getAudio();
      if (!audio) return;

      if (!this.currentTrack) {
        if (this.queue.length > 0) {
          await this.playTrack(this.queue[0], this.queue, 0);
        }
        return;
      }

      if (this.isPlaying) {
        audio.pause();
      } else {
        if (!this.isCurrentTrackPlayable) {
          this.errorMessage = 'This track cannot be played directly.';
          return;
        }
        try {
          await audio.play();
        } catch (err) {
          console.warn('Play resume prevented:', err);
        }
      }
    },

    seek(seconds) {
      const audio = getAudio();
      if (!audio) return;
      const target = Math.max(0, Math.min(seconds, this.duration || audio.duration || 0));
      audio.currentTime = target;
      this.currentTime = target;
    },

    seekByPercentage(percentage) {
      if (!this.duration) return;
      const targetTime = (Math.max(0, Math.min(100, percentage)) / 100) * this.duration;
      this.seek(targetTime);
    },

    next() {
      if (!this.queue.length) return;

      if (this.repeatMode === 'one' && this.currentTrack) {
        this.seek(0);
        const audio = getAudio();
        audio?.play();
        return;
      }

      let nextIndex;
      if (this.shuffle && this.queue.length > 1) {
        do {
          nextIndex = Math.floor(Math.random() * this.queue.length);
        } while (nextIndex === this.queueIndex);
      } else {
        nextIndex = this.queueIndex + 1;
      }

      if (nextIndex < this.queue.length) {
        this.queueIndex = nextIndex;
        this.playTrack(this.queue[nextIndex], this.queue, nextIndex);
      } else if (this.repeatMode === 'all' && this.queue.length > 0) {
        this.queueIndex = 0;
        this.playTrack(this.queue[0], this.queue, 0);
      } else {
        this.isPlaying = false;
        this.playbackStatus = 'idle';
      }
    },

    previous() {
      const audio = getAudio();
      // If played more than 3s, restart track
      if (this.currentTime > 3) {
        this.seek(0);
        return;
      }

      if (this.queueIndex > 0) {
        const prevIndex = this.queueIndex - 1;
        this.queueIndex = prevIndex;
        this.playTrack(this.queue[prevIndex], this.queue, prevIndex);
      } else if (this.queue.length > 0) {
        this.seek(0);
      }
    },

    handleTrackEnded() {
      if (this.repeatMode === 'one') {
        this.seek(0);
        const audio = getAudio();
        audio?.play();
      } else {
        this.next();
      }
    },

    setVolume(newVolume) {
      const audio = getAudio();
      const clamped = Math.max(0, Math.min(1, newVolume));
      this.volume = clamped;
      if (audio) {
        audio.volume = clamped;
        audio.muted = false;
      }
      this.isMuted = false;
      if (typeof window !== 'undefined') {
        localStorage.setItem('soundwave_volume', String(clamped));
      }
    },

    toggleMute() {
      const audio = getAudio();
      if (!audio) return;
      this.isMuted = !this.isMuted;
      audio.muted = this.isMuted;
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

    cleanup() {
      const audio = getAudio();
      if (audio) {
        audio.pause();
        audio.src = '';
      }
      this.isPlaying = false;
      this.currentTrack = null;
      this.playbackStatus = 'idle';
    },
  },
});
