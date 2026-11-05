import { resolvePlayableAudioUrl, isAuthorizedStreamUrl } from './detector';

export class DirectAudioProvider {
  constructor() {
    this.audio = typeof window !== 'undefined' ? new Audio() : null;
    this.handlers = new Map();
    this.callbacks = {};
    this.isInitialized = false;
    this.currentTrack = null;

    if (this.audio) {
      this.audio.preload = 'metadata';
      if (typeof window !== 'undefined') {
        window._soundwaveAudio = this.audio;
      }
    }
  }

  getCapabilities(track = this.currentTrack) {
    const p = (track?.source?.provider || track?.provider || '').toLowerCase();
    let badge = 'RESTRICTED';
    let providerName = 'Direct Audio';

    if (p === 'jamendo') {
      badge = 'JAMENDO';
      providerName = 'Jamendo CC Stream';
    } else {
      badge = 'UNAUTHORIZED';
      providerName = 'Unauthorized Provider';
    }

    return {
      canSeek: p === 'jamendo',
      canVolume: true,
      hasTimeEvents: true,
      isEmbedded: false,
      providerName,
      badge,
      embedUrl: null,
    };
  }

  init(callbacks = {}) {
    if (this.isInitialized || !this.audio) return;
    this.callbacks = callbacks;

    const bindEvent = (event, fn) => {
      const bound = (e) => fn(e);
      this.audio.addEventListener(event, bound);
      this.handlers.set(event, bound);
    };

    bindEvent('play', () => this.callbacks.onPlay?.());
    bindEvent('pause', () => this.callbacks.onPause?.());
    bindEvent('playing', () => this.callbacks.onPlaying?.());
    bindEvent('waiting', () => this.callbacks.onWaiting?.());
    bindEvent('timeupdate', () => this.callbacks.onTimeUpdate?.(this.audio.currentTime));
    bindEvent('loadedmetadata', () => this.callbacks.onLoadedMetadata?.(this.audio.duration));
    bindEvent('ended', () => this.callbacks.onEnded?.());
    bindEvent('error', (err) => {
      const mediaError = this.audio?.error;
      const detail = {
        code: mediaError ? mediaError.code : 0,
        message: mediaError ? mediaError.message : 'Audio playback error',
        kind: mediaError?.code === 2 ? 'network'
            : mediaError?.code === 3 ? 'decode'
            : mediaError?.code === 4 ? 'src_not_supported'
            : 'general',
        raw: err,
      };
      this.callbacks.onError?.(detail);
    });

    this.isInitialized = true;
  }

  async load(track) {
    if (!this.audio) return;
    this.currentTrack = track;

    const provider = String(track?.source?.provider || track?.provider || '').toLowerCase().trim();

    // Security Gate 1: Reject unverified or unapproved providers
    if (provider !== 'jamendo') {
      if (this.audio) this.audio.pause();
      const errDetail = {
        code: 403,
        message: provider
          ? `Playback rejected: Provider '${provider}' is not authorized for direct audio streaming.`
          : 'Playback rejected: Track lacks authorized provider metadata.',
        kind: 'unauthorized_provider',
      };
      this.callbacks.onError?.(errDetail);
      throw new Error(errDetail.message);
    }

    // Security Gate 2: Check explicit unplayability / unverified license flags
    if (track.isUnavailable || track.isPlayable === false) {
      if (this.audio) this.audio.pause();
      const errDetail = {
        code: 403,
        message: 'Playback rejected: Track is flagged as unavailable or unverified for playback.',
        kind: 'unauthorized_track',
      };
      this.callbacks.onError?.(errDetail);
      throw new Error(errDetail.message);
    }

    const url = resolvePlayableAudioUrl(track);

    // Security Gate 3: Protocol and domain validation (prevent provider spoofing & arbitrary URL streaming)
    if (!url || typeof url !== 'string' || !isAuthorizedStreamUrl(url)) {
      if (this.audio) this.audio.pause();
      const errDetail = {
        code: 403,
        message: url
          ? 'Playback rejected: Audio stream URL domain is not authorized.'
          : 'No direct playable audio URL available',
        kind: 'unauthorized_domain',
      };
      this.callbacks.onError?.(errDetail);
      throw new Error(errDetail.message);
    }

    if (this.audio.src !== url) {
      this.audio.src = url;
      this.audio.load();
    }
    this.callbacks.onCapabilities?.(this.getCapabilities(track));
    return this.play();
  }

  async play() {
    if (!this.audio) return;
    try {
      await this.audio.play();
    } catch (err) {
      if (err.name !== 'AbortError') {
        throw err;
      }
    }
  }

  pause() {
    if (!this.audio) return;
    this.audio.pause();
  }

  seek(seconds) {
    if (!this.audio) return;
    const duration = this.audio.duration || 0;
    const target = Math.max(0, Math.min(seconds, duration));
    this.audio.currentTime = target;
  }

  setVolume(vol) {
    if (!this.audio) return;
    const clamped = Math.max(0, Math.min(1, vol));
    this.audio.volume = clamped;
    this.audio.muted = false;
  }

  setMuted(muted) {
    if (!this.audio) return;
    this.audio.muted = Boolean(muted);
  }

  get duration() {
    return this.audio?.duration || 0;
  }

  get currentTime() {
    return this.audio?.currentTime || 0;
  }

  destroy() {
    if (!this.audio) return;
    this.pause();
    this.handlers.forEach((handler, event) => {
      this.audio.removeEventListener(event, handler);
    });
    this.handlers.clear();
    this.audio.src = '';
    this.currentTrack = null;
    this.isInitialized = false;
  }
}
