import { detectProviderType } from './detector';
import { DirectAudioProvider } from './DirectAudioProvider';
import { YouTubeProvider } from './YouTubeProvider';
import { SpotifyProvider } from './SpotifyProvider';

export class UnifiedSoundController {
  constructor() {
    this.providers = {
      direct: new DirectAudioProvider(),
      youtube: new YouTubeProvider(),
      spotify: new SpotifyProvider(),
    };
    this.activeType = 'direct';
    this.activeProvider = this.providers.direct;
    this.callbacks = {};
    this.isInitialized = false;
    this._volume = 0.8;
    this._muted = false;
  }

  init(callbacks = {}) {
    this.callbacks = callbacks;

    // Attach callbacks to each provider
    Object.keys(this.providers).forEach((key) => {
      this.providers[key].init({
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
    });

    this.isInitialized = true;
  }

  detectType(track) {
    if (!track?.url) return 'direct';
    const type = detectProviderType(track.url);
    if (type === 'youtube') return 'youtube';
    if (type === 'spotify') return 'spotify';
    return 'direct';
  }

  async loadAndPlay(track) {
    const targetType = this.detectType(track);

    // Switch providers if necessary
    if (targetType !== this.activeType) {
      if (this.activeProvider) {
        this.activeProvider.pause();
      }
      this.activeType = targetType;
      this.activeProvider = this.providers[targetType];
      this.activeProvider.setVolume(this._volume);
      this.activeProvider.setMuted(this._muted);
    }

    const caps = this.activeProvider.getCapabilities();
    this.callbacks.onCapabilities?.(caps);

    return this.activeProvider.load(track);
  }

  play() {
    if (this.activeProvider) {
      this.activeProvider.play();
    }
  }

  pause() {
    if (this.activeProvider) {
      this.activeProvider.pause();
    }
  }

  seek(seconds) {
    if (this.activeProvider) {
      this.activeProvider.seek(seconds);
    }
  }

  setVolume(vol) {
    this._volume = Math.max(0, Math.min(1, vol));
    if (this.activeProvider) {
      this.activeProvider.setVolume(this._volume);
    }
  }

  setMuted(muted) {
    this._muted = Boolean(muted);
    if (this.activeProvider) {
      this.activeProvider.setMuted(this._muted);
    }
  }

  getCapabilities() {
    return this.activeProvider?.getCapabilities() || {
      canSeek: true,
      canVolume: true,
      hasTimeEvents: true,
      isEmbedded: false,
      providerName: 'Direct Audio',
      badge: 'FLAC/MP3',
    };
  }

  destroy() {
    Object.values(this.providers).forEach((p) => p.destroy());
    this.isInitialized = false;
  }
}

export const soundController = new UnifiedSoundController();
