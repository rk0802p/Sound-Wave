import { extractSpotifyEmbedUrl } from './detector';

export class SpotifyProvider {
  constructor() {
    this.currentTrack = null;
    this.callbacks = {};
    this.isPlaying = false;
    this.status = 'uninitialized'; // 'uninitialized' | 'ready' | 'loaded' | 'error'
    this.trackId = null;
    this.embedUrl = null;
  }

  getCapabilities() {
    return {
      canSeek: false,
      canVolume: false,
      hasTimeEvents: false,
      isEmbedded: true,
      providerName: 'Spotify Interactive Embed',
      badge: 'Spotify',
      embedUrl: this.embedUrl,
      trackId: this.trackId,
    };
  }

  init(callbacks = {}) {
    this.callbacks = callbacks;
    this.status = 'ready';
  }

  getTrackId(track) {
    if (track?.source?.externalId) {
      return track.source.externalId;
    }
    const rawUrl = track?.url || track?.source?.url || '';
    if (!rawUrl) return null;

    // Direct URI or URL extraction
    const match = rawUrl.match(/spotify(?:\.com\/(?:[a-zA-Z-]+\/)?track|:track)[:\/]([a-zA-Z0-9]{22})/i);
    return match ? match[1] : null;
  }

  async load(track) {
    this.currentTrack = track;
    this.isPlaying = false;

    const trackId = this.getTrackId(track);
    if (!trackId) {
      this.status = 'error';
      this.callbacks.onError?.(new Error('Invalid or unsupported Spotify track reference'));
      return;
    }

    this.trackId = trackId;
    this.embedUrl = `https://open.spotify.com/embed/track/${trackId}?utm_source=generator&theme=0`;
    this.status = 'loaded';

    this.callbacks.onCapabilities?.({
      ...this.getCapabilities(),
      embedUrl: this.embedUrl,
      trackId: this.trackId,
    });

    if (track?.duration) {
      this.callbacks.onLoadedMetadata?.(track.duration);
    }
  }

  play() {
    // Spotify embedded iframes require user interaction within the iframe container
    // Mark playback intent without falsely claiming active audio playback
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
    this.trackId = null;
    this.embedUrl = null;
    this.status = 'uninitialized';
    this.callbacks.onCapabilities?.({
      ...this.getCapabilities(),
      embedUrl: null,
      trackId: null,
    });
  }
}
