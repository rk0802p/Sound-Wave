import { extractSpotifyEmbedUrl } from './detector';

export class SpotifyProvider {
  constructor() {
    this.currentTrack = null;
    this.callbacks = {};
    this.isPlaying = false;
  }

  getCapabilities() {
    return {
      canSeek: false,
      canVolume: false,
      hasTimeEvents: false,
      isEmbedded: true,
      providerName: 'Spotify Interactive Embed',
      badge: 'Spotify',
    };
  }

  init(callbacks = {}) {
    this.callbacks = callbacks;
  }

  async load(track) {
    this.currentTrack = track;
    const embedUrl = extractSpotifyEmbedUrl(track?.url);
    this.callbacks.onCapabilities?.({
      ...this.getCapabilities(),
      embedUrl,
    });
    this.isPlaying = true;
    this.callbacks.onPlay?.();
    if (track?.duration) {
      this.callbacks.onLoadedMetadata?.(track.duration);
    }
  }

  play() {
    this.isPlaying = true;
    this.callbacks.onPlay?.();
  }

  pause() {
    this.isPlaying = false;
    this.callbacks.onPause?.();
  }

  seek() {
    // Spotify embedded iframe restricts remote seek
  }

  setVolume() {
    // Spotify iframe manages host volume independently
  }

  setMuted() {
    // Handled by user in Spotify embed
  }

  destroy() {
    this.pause();
    this.currentTrack = null;
  }
}
