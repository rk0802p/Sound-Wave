export class DirectAudioProvider {
  constructor() {
    this.audio = typeof window !== 'undefined' ? new Audio() : null;
    this.handlers = new Map();
    this.callbacks = {};
    this.isInitialized = false;

    if (this.audio) {
      this.audio.preload = 'metadata';
    }
  }

  getCapabilities() {
    return {
      canSeek: true,
      canVolume: true,
      hasTimeEvents: true,
      isEmbedded: false,
      providerName: 'Direct Audio',
      badge: 'FLAC/MP3',
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
    bindEvent('error', (err) => this.callbacks.onError?.(err));

    this.isInitialized = true;
  }

  async load(track) {
    if (!this.audio) return;
    const url = track?.url;
    if (!url) throw new Error('No audio URL provided');

    if (this.audio.src !== url) {
      this.audio.src = url;
      this.audio.load();
    }
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
    this.isInitialized = false;
  }
}
