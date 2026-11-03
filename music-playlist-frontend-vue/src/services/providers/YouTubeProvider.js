import { extractYouTubeVideoId } from './detector';

export class YouTubeProvider {
  constructor() {
    this.player = null;
    this.containerId = 'soundwave-yt-mount';
    this.callbacks = {};
    this.timeUpdateTimer = null;
    this.isReady = false;
    this.pendingVideoId = null;
    this.pendingPlay = false;
    this._volume = 80;
    this._muted = false;
  }

  getCapabilities() {
    return {
      canSeek: true,
      canVolume: true,
      hasTimeEvents: true,
      isEmbedded: true,
      providerName: 'YouTube Audio Stream',
      badge: 'YouTube',
    };
  }

  init(callbacks = {}) {
    this.callbacks = callbacks;
    this.ensureIFrameAPI();
  }

  ensureIFrameAPI() {
    if (typeof window === 'undefined') return;

    if (window.YT && window.YT.Player) {
      this.initPlayer();
      return;
    }

    if (!document.getElementById('yt-iframe-api-script')) {
      const tag = document.createElement('script');
      tag.id = 'yt-iframe-api-script';
      tag.src = 'https://www.youtube.com/iframe_api';
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode.insertBefore(tag, firstScriptTag);
    }

    const prevOnReady = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (typeof prevOnReady === 'function') prevOnReady();
      this.initPlayer();
    };
  }

  initPlayer() {
    if (this.player || typeof window === 'undefined' || !window.YT) return;

    let container = document.getElementById(this.containerId);
    if (!container) {
      container = document.createElement('div');
      container.id = this.containerId;
      container.style.position = 'fixed';
      container.style.width = '1px';
      container.style.height = '1px';
      container.style.left = '-9999px';
      container.style.top = '-9999px';
      container.style.opacity = '0';
      container.style.pointerEvents = 'none';
      container.style.zIndex = '-100';
      document.body.appendChild(container);
    }

    const mount = document.createElement('div');
    mount.id = 'soundwave-yt-inner';
    container.appendChild(mount);

    try {
      this.player = new window.YT.Player('soundwave-yt-inner', {
        height: '200',
        width: '200',
        playerVars: {
          autoplay: 0,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          origin: window.location.origin,
        },
        events: {
          onReady: () => {
            this.isReady = true;
            this.setVolume(this._volume / 100);
            if (this.pendingVideoId) {
              const vid = this.pendingVideoId;
              this.pendingVideoId = null;
              this.load({ url: `https://www.youtube.com/watch?v=${vid}` });
            }
          },
          onStateChange: (event) => this.handleStateChange(event),
          onError: (err) => {
            this.callbacks.onError?.(err);
          },
        },
      });
    } catch (e) {
      console.warn('YouTube player creation error:', e);
    }
  }

  handleStateChange(event) {
    if (!window.YT) return;
    const { PlayerState } = window.YT;

    switch (event.data) {
      case PlayerState.PLAYING:
        this.callbacks.onPlay?.();
        this.callbacks.onPlaying?.();
        this.startTimeTracking();
        break;
      case PlayerState.PAUSED:
        this.callbacks.onPause?.();
        this.stopTimeTracking();
        break;
      case PlayerState.BUFFERING:
        this.callbacks.onWaiting?.();
        break;
      case PlayerState.ENDED:
        this.stopTimeTracking();
        this.callbacks.onEnded?.();
        break;
      default:
        break;
    }
  }

  startTimeTracking() {
    this.stopTimeTracking();
    this.timeUpdateTimer = setInterval(() => {
      if (this.player && typeof this.player.getCurrentTime === 'function') {
        const cur = this.player.getCurrentTime() || 0;
        const dur = this.player.getDuration() || 0;
        this.callbacks.onTimeUpdate?.(cur);
        if (dur > 0) {
          this.callbacks.onLoadedMetadata?.(dur);
        }
      }
    }, 250);
  }

  stopTimeTracking() {
    if (this.timeUpdateTimer) {
      clearInterval(this.timeUpdateTimer);
      this.timeUpdateTimer = null;
    }
  }

  async load(track) {
    const videoId = extractYouTubeVideoId(track?.url);
    if (!videoId) {
      throw new Error('Invalid YouTube video link');
    }

    if (!this.isReady || !this.player || typeof this.player.loadVideoById !== 'function') {
      this.pendingVideoId = videoId;
      return;
    }

    try {
      this.player.loadVideoById(videoId);
      this.startTimeTracking();
    } catch (e) {
      this.callbacks.onError?.(e);
    }
  }

  play() {
    if (this.player && typeof this.player.playVideo === 'function') {
      this.player.playVideo();
    }
  }

  pause() {
    if (this.player && typeof this.player.pauseVideo === 'function') {
      this.player.pauseVideo();
    }
    this.stopTimeTracking();
  }

  seek(seconds) {
    if (this.player && typeof this.player.seekTo === 'function') {
      this.player.seekTo(seconds, true);
      this.callbacks.onTimeUpdate?.(seconds);
    }
  }

  setVolume(vol) {
    this._volume = Math.round(Math.max(0, Math.min(1, vol)) * 100);
    if (this.player && typeof this.player.setVolume === 'function') {
      this.player.setVolume(this._volume);
    }
  }

  setMuted(muted) {
    this._muted = Boolean(muted);
    if (this.player) {
      if (this._muted && typeof this.player.mute === 'function') {
        this.player.mute();
      } else if (!this._muted && typeof this.player.unMute === 'function') {
        this.player.unMute();
      }
    }
  }

  destroy() {
    this.stopTimeTracking();
    if (this.player && typeof this.player.destroy === 'function') {
      try {
        this.player.destroy();
      } catch {
        // Safe destroy ignore
      }
      this.player = null;
    }
    const container = document.getElementById(this.containerId);
    if (container) {
      container.remove();
    }
    this.isReady = false;
  }
}
