import { defineStore } from 'pinia';
import { soundController } from '../services/providers';
import { MOOD_PLAYLISTS } from '../data/moodPlaylists';
import { resolvePlayableAudioUrl } from '../services/providers/detector';

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
    init() {
      if (this.isEngineReady) return;

      soundController.init({
        onPlay: () => {
          this.isPlaying = true;
          this.isLoading = false;
          if (typeof document !== 'undefined') {
            document.body.classList.add('playing');
          }
        },
        onPause: () => {
          this.isPlaying = false;
          if (typeof document !== 'undefined') {
            document.body.classList.remove('playing');
          }
        },
        onPlaying: () => {
          this.isPlaying = true;
          this.isLoading = false;
          if (typeof document !== 'undefined') {
            document.body.classList.add('playing');
          }
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
          }
        },
        onEnded: () => {
          this.nextTrack();
        },
        onError: (err) => {
          console.warn('Audio playback notice:', err);
          this.isLoading = false;
        },
      });

      soundController.setVolume(this.volume);
      soundController.setMuted(this.muted);
      this.isEngineReady = true;
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

    async playTrack(track, queue = null, index = null) {
      this.init();
      if (!track) return;

      this.error = null;
      if (Array.isArray(queue) && queue.length > 0) {
        this.queue = queue;
        this.trackIndex = typeof index === 'number' ? index : queue.indexOf(track);
        if (this.trackIndex === -1) this.trackIndex = 0;
      }

      this.currentTrack = track;
      this.duration = track.duration || 240;
      this.currentTime = 0;

      const audioUrl = resolvePlayableAudioUrl(track);
      if (!audioUrl) {
        soundController.pause();
        this.isPlaying = false;
        this.isLoading = false;
        this.currentTime = 0;
        if (typeof document !== 'undefined') {
          document.body.classList.remove('playing');
        }
        return;
      }

      try {
        this.isLoading = true;
        await soundController.load(track);
        this.isPlaying = true;
      } catch (err) {
        console.warn('Sound controller load warning:', err);
        // Fallback direct audio if needed
        try {
          if (typeof window !== 'undefined' && window._soundwaveAudio) {
            window._soundwaveAudio.src = audioUrl;
            await window._soundwaveAudio.play();
            this.isPlaying = true;
          }
        } catch (e) {
          console.warn('Direct audio fallback error:', e);
        }
      } finally {
        this.isLoading = false;
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
        if (typeof document !== 'undefined') {
          document.body.classList.remove('playing');
        }
      } else {
        if (!this.currentTrack) return;
        const audioUrl = resolvePlayableAudioUrl(this.currentTrack);
        if (!audioUrl) {
          this.isPlaying = false;
          return;
        }
        if (!soundController.currentTrack) {
          await this.playTrack(this.currentTrack, this.queue, this.trackIndex);
        } else {
          try {
            await soundController.play();
            this.isPlaying = true;
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
      const nextIdx = (this.trackIndex + 1) % this.queue.length;
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
  },
});
