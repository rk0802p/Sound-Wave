class AudioEngine {
  constructor() {
    this.audio = typeof window !== 'undefined' ? new Audio() : null;
    this.handlers = new Map();
    this.isInitialized = false;

    if (this.audio) {
      this.audio.preload = 'metadata';
    }
  }

  init(callbacks = {}) {
    if (this.isInitialized || !this.audio) return;

    this.on('play', callbacks.onPlay);
    this.on('pause', callbacks.onPause);
    this.on('timeupdate', () => callbacks.onTimeUpdate?.(this.audio.currentTime));
    this.on('loadedmetadata', () => callbacks.onLoadedMetadata?.(this.audio.duration));
    this.on('ended', callbacks.onEnded);
    this.on('error', (err) => callbacks.onError?.(err));
    this.on('waiting', callbacks.onWaiting);
    this.on('playing', callbacks.onPlaying);

    this.isInitialized = true;
  }

  on(event, handler) {
    if (!this.audio || !handler) return;
    const bound = (e) => handler(e);
    this.audio.addEventListener(event, bound);
    this.handlers.set(event, bound);
  }

  async loadAndPlay(url) {
    if (!this.audio) return;
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
    this.audio.pause();
    this.handlers.forEach((handler, event) => {
      this.audio.removeEventListener(event, handler);
    });
    this.handlers.clear();
    this.audio.src = '';
    this.isInitialized = false;
  }
}

export const audioEngine = new AudioEngine();
