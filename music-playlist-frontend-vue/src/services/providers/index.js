import { DirectAudioProvider } from './DirectAudioProvider';

export class UnifiedSoundController {
  constructor() {
    this.provider = new DirectAudioProvider();
    this.callbacks = {};
    this.isInitialized = false;
    this._volume = 0.8;
    this._muted = false;
  }

  init(callbacks = {}) {
    this.callbacks = callbacks;

    this.provider.init({
      onPlay: () => this.callbacks.onPlay?.(),
      onPause: () => this.callbacks.onPause?.(),
      onPlaying: () => this.callbacks.onPlaying?.(),
      onWaiting: () => this.callbacks.onWaiting?.(),
      onTimeUpdate: (time) => this.callbacks.onTimeUpdate?.(time),
      onLoadedMetadata: (dur) => this.callbacks.onLoadedMetadata?.(dur),
      onEnded: () => this.callbacks.onEnded?.(),
      onError: (err) => this.callbacks.onError?.(err),
      onCapabilities: (caps) => this.callbacks.onCapabilities?.(caps),
    });

    this.isInitialized = true;
  }

  get currentTrack() {
    return this.provider.currentTrack;
  }

  async load(track) {
    const caps = this.provider.getCapabilities(track);
    this.callbacks.onCapabilities?.(caps);
    return this.provider.load(track);
  }

  async loadAndPlay(track) {
    return this.load(track);
  }

  play() {
    return this.provider.play();
  }

  pause() {
    this.provider.pause();
  }

  seek(seconds) {
    this.provider.seek(seconds);
  }

  setVolume(vol) {
    this._volume = Math.max(0, Math.min(1, vol));
    this.provider.setVolume(this._volume);
  }

  setMuted(muted) {
    this._muted = Boolean(muted);
    this.provider.setMuted(this._muted);
  }

  getCapabilities(track) {
    return this.provider.getCapabilities(track);
  }

  destroy() {
    this.provider.destroy();
    this.isInitialized = false;
  }
}

export const soundController = new UnifiedSoundController();
