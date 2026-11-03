import { defineStore } from 'pinia';
import { soundController } from '../services/providers';
import { isPlayableAudioUrl, isExternalMediaUrl, CURATED_DEMO_TRACKS } from '../data/demoTracks';
import { detectProviderType, extractSpotifyEmbedUrl, resolvePlayableAudioUrl } from '../services/providers/detector';

export const usePlayerStore = defineStore('player', {
  state: () => {
    const savedVol = typeof window !== 'undefined' ? localStorage.getItem('soundwave_volume') : null;
    const initialVol = savedVol !== null ? parseFloat(savedVol) : 0.8;
    const initialTrack = CURATED_DEMO_TRACKS[0];

    return {
      currentTrackId: initialTrack._id || 'track-1',
      currentPlaylistId: 'archive-67c000000000000000000001',
      currentTrack: initialTrack,
      queue: CURATED_DEMO_TRACKS,
      queueIndex: 0,
      isPlaying: false,
      isLoading: false,
      currentTime: 45,
      duration: initialTrack.duration || 215,
      volume: isNaN(initialVol) ? 0.8 : Math.max(0, Math.min(1, initialVol)),
      muted: false,
      shuffle: false,
      repeatMode: 'off', // 'off' | 'all' | 'one'
      error: null,
      isExpanded: typeof window !== 'undefined' && window.location.search.includes('expanded=1'),
      isQueueOpen: typeof window !== 'undefined' && window.location.search.includes('queue=1'),
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
      if (!state.currentTrack) return false;
      const track = state.currentTrack;
      const type =
        track.source?.provider ||
        (track.url ? detectProviderType(track.url) : null);
      if (type === 'youtube') return false;
      if (type === 'spotify') {
        return Boolean(track.source?.externalId || (track.url && extractSpotifyEmbedUrl(track.url)));
      }
      return Boolean(resolvePlayableAudioUrl(track));
    },
    currentProviderType: (state) => {
      if (!state.currentTrack) return 'direct';
      if (state.currentTrack.source?.provider) {
        return state.currentTrack.source.provider;
      }
      if (!state.currentTrack.url) return 'direct';
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
          this.error = typeof err === 'string' ? err : (err?.message || 'Audio source could not be played.');
        },
        onCapabilities: (caps) => {
          this.providerCapabilities = { ...this.providerCapabilities, ...caps };
        },
      });

      soundController.setVolume(this.volume);
      soundController.setMuted(this.muted);
      this.isEngineReady = true;
    },

    async playTrack(track, queueOrPlaylist = null, indexOrQueue = null, playlistId = null) {
      this.init();
      if (!track) return;

      this.error = null;

      let queue = null;
      let targetIndex = null;
      let targetPlaylistId = playlistId;

      if (Array.isArray(queueOrPlaylist)) {
        queue = queueOrPlaylist;
        targetIndex = typeof indexOrQueue === 'number' ? indexOrQueue : null;
      } else if (queueOrPlaylist && typeof queueOrPlaylist === 'object') {
        targetPlaylistId = queueOrPlaylist._id || targetPlaylistId;
        if (Array.isArray(indexOrQueue)) {
          queue = indexOrQueue;
        } else if (Array.isArray(queueOrPlaylist.songs)) {
          queue = queueOrPlaylist.songs;
        }
      }

      if (Array.isArray(queue) && queue.length > 0) {
        this.queue = [...queue];
        const foundIndex = this.queue.findIndex(
          (t) => (t._id && track._id ? t._id === track._id : t === track)
        );
        this.queueIndex =
          typeof targetIndex === 'number' && targetIndex >= 0
            ? targetIndex
            : (foundIndex !== -1 ? foundIndex : 0);
      } else if (!this.queue.some((t) => (t._id && track._id ? t._id === track._id : t === track))) {
        this.queue = [track];
        this.queueIndex = 0;
      }

      this.currentTrack = track;
      this.currentTrackId = track._id;
      if (targetPlaylistId) this.currentPlaylistId = targetPlaylistId;

      const providerType =
        track.source?.provider ||
        (track.url ? detectProviderType(track.url) : 'direct');

      if (providerType === 'youtube') {
        this.isPlaying = false;
        this.isLoading = false;
        this.error = 'YouTube streaming is no longer supported.';
        return;
      }

      const playableAudioUrl = resolvePlayableAudioUrl(track);
      if (providerType !== 'spotify' && !playableAudioUrl) {
        this.isPlaying = false;
        this.isLoading = false;
        this.error = 'This track has no audio stream source. Please add a valid audio URL.';
        return;
      }

      if (providerType === 'spotify') {
        const embedUrl = track.source?.externalId
          ? `https://open.spotify.com/embed/track/${track.source.externalId}?utm_source=generator&theme=0`
          : extractSpotifyEmbedUrl(track.url);
        this.providerCapabilities = {
          canSeek: false,
          canVolume: false,
          hasTimeEvents: false,
          isEmbedded: true,
          providerName: 'Spotify',
          badge: 'Spotify',
          embedUrl,
        };
      } else if (providerType === 'featured') {
        this.providerCapabilities = {
          canSeek: true,
          canVolume: true,
          hasTimeEvents: true,
          isEmbedded: false,
          providerName: 'Curated Featured Stream',
          badge: 'FEATURED',
          embedUrl: null,
        };
      } else if (providerType === 'archive') {
        this.providerCapabilities = {
          canSeek: true,
          canVolume: true,
          hasTimeEvents: true,
          isEmbedded: false,
          providerName: 'Internet Archive',
          badge: 'ARCHIVE',
          embedUrl: null,
        };
      } else if (providerType === 'jamendo') {
        this.providerCapabilities = {
          canSeek: true,
          canVolume: true,
          hasTimeEvents: true,
          isEmbedded: false,
          providerName: 'Jamendo CC',
          badge: 'JAMENDO',
          embedUrl: null,
        };
      } else if (providerType === 'audius') {
        this.providerCapabilities = {
          canSeek: true,
          canVolume: true,
          hasTimeEvents: true,
          isEmbedded: false,
          providerName: 'Audius Stream',
          badge: 'AUDIUS',
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
        if (providerType === 'spotify' && this.providerCapabilities.isEmbedded) {
          this.isPlaying = false;
          this.isLoading = false;
        }
      } catch (err) {
        console.warn('Play request interrupted:', err);
        this.isPlaying = false;
        this.isLoading = false;
        if (providerType === 'external') {
          this.error = 'External track link. Click "Open Link" to view in original player.';
        } else {
          this.error = typeof err === 'string' ? err : (err?.message || 'Playback was prevented. Click play to resume.');
        }
      }
    },

    async playPlaylist(playlist, startIndex = 0) {
      if (!playlist || !Array.isArray(playlist.songs) || playlist.songs.length === 0) return;
      const validIndex = Math.max(0, Math.min(startIndex, playlist.songs.length - 1));
      const track = playlist.songs[validIndex];
      await this.playTrack(track, playlist.songs, validIndex, playlist._id);
    },

    nextTrack() {
      return this.next();
    },

    prevTrack() {
      return this.previous();
    },

    previousTrack() {
      return this.previous();
    },

    async togglePlay() {
      this.init();
      if (!this.currentTrack) {
        if (this.queue.length > 0) {
          await this.playTrack(this.queue[0], this.queue, 0);
        }
        return;
      }

      if (!this.isCurrentTrackPlayable) {
        if (this.currentProviderType === 'youtube') {
          this.error = 'YouTube streaming is no longer supported.';
        } else {
          this.error = 'This track has no audio stream source. Please add a valid audio URL.';
        }
        return;
      }

      if (this.currentProviderType === 'spotify' && this.providerCapabilities.isEmbedded) {
        this.error = 'Spotify playback must be controlled directly inside the Spotify embed player.';
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
      this.providerCapabilities.embedUrl = null;
    },

    resetPlayer() {
      this.cleanup();
    },
  },
});
