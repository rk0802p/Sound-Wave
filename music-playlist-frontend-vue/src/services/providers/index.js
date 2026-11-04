import { detectProviderType } from './detector';
import { DirectAudioProvider } from './DirectAudioProvider';
import { SpotifyProvider } from './SpotifyProvider';

export class UnifiedSoundController {
  constructor() {
    this.providers = {
      direct: new DirectAudioProvider(),
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
    if (track?.source?.provider) {
      const p = String(track.source.provider).toLowerCase();
      if (p === 'spotify') {
        return 'spotify';
      }
      return 'direct';
    }
    const rawUrl = track?.url || track?.source?.url || '';
    if (!rawUrl) return 'direct';
    const type = detectProviderType(rawUrl);
    if (type === 'spotify') return 'spotify';
    return 'direct';
  }

  get currentTrack() {
    return this.activeProvider?.currentTrack || null;
  }

  async load(track) {
    return this.loadAndPlay(track);
  }

  async loadAndPlay(track) {
    const rawTargetType = this.detectType(track);
    const targetType = this.providers[rawTargetType] ? rawTargetType : 'direct';

    // Cleanly switch providers if target provider changes
    if (targetType !== this.activeType) {
      if (this.activeProvider) {
        this.activeProvider.pause();
        if (typeof this.activeProvider.destroy === 'function' && this.activeType === 'spotify') {
          this.activeProvider.destroy();
        }
      }
      this.activeType = targetType;
      this.activeProvider = this.providers[targetType];
      this.activeProvider.setVolume(this._volume);
      this.activeProvider.setMuted(this._muted);
    }

    const caps = this.activeProvider.getCapabilities(track);
    this.callbacks.onCapabilities?.(caps);

    return this.activeProvider.load(track);
  }

  play() {
    if (this.activeProvider) {
      return this.activeProvider.play();
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
    return (
      this.activeProvider?.getCapabilities() || {
        canSeek: true,
        canVolume: true,
        hasTimeEvents: true,
        isEmbedded: false,
        providerName: 'Direct Audio',
        badge: 'FLAC/MP3',
      }
    );
  }

  destroy() {
    Object.values(this.providers).forEach((p) => p.destroy());
    this.isInitialized = false;
  }
}

export const soundController = new UnifiedSoundController();
