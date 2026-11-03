import { extractYouTubeVideoId } from './detector';

let ytApiPromise = null;

/**
 * Shared singleton loader for the YouTube IFrame API script
 */
export const loadYouTubeIframeAPI = () => {
  if (typeof window === 'undefined') return Promise.reject(new Error('Window is unavailable'));
  if (window.YT && window.YT.Player) return Promise.resolve(window.YT);

  if (!ytApiPromise) {
    ytApiPromise = new Promise((resolve, reject) => {
      const existingScript = document.getElementById('yt-iframe-api-script');
      if (!existingScript) {
        const tag = document.createElement('script');
        tag.id = 'yt-iframe-api-script';
        tag.src = 'https://www.youtube.com/iframe_api';
        tag.onerror = () => reject(new Error('Failed to load YouTube IFrame API script'));
        const firstScript = document.getElementsByTagName('script')[0];
        if (firstScript && firstScript.parentNode) {
          firstScript.parentNode.insertBefore(tag, firstScript);
        } else {
          document.head.appendChild(tag);
        }
      }

      const prevCallback = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        if (typeof prevCallback === 'function') prevCallback();
        resolve(window.YT);
      };
    });
  }

  return ytApiPromise;
};

export class YouTubeProvider {
  constructor() {
    this.player = null;
    this.containerId = 'soundwave-yt-mount';
    this.callbacks = {};
    this.timeUpdateTimer = null;
    this.isReady = false;
    this.pendingVideoId = null;
    this.pendingPlay = false;
    this.currentVideoId = null;
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
      embedUrl: null,
    };
  }

  init(callbacks = {}) {
    this.callbacks = callbacks;
    this.ensureIFrameAPI();
  }

  ensureIFrameAPI() {
    // YouTube playback decommissioned
    this.callbacks.onError?.(new Error('YouTube streaming is no longer supported'));
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
          origin: typeof window !== 'undefined' ? window.location.origin : '',
        },
        events: {
          onReady: () => {
            this.isReady = true;
            this.setVolume(this._volume / 100);
            if (this._muted) this.setMuted(true);

            if (this.pendingVideoId) {
              const vid = this.pendingVideoId;
              const shouldPlay = this.pendingPlay;
              this.pendingVideoId = null;
              this.pendingPlay = false;

              if (shouldPlay) {
                this.player.loadVideoById(vid);
              } else {
                this.player.cueVideoById(vid);
              }
            }
          },
          onStateChange: (event) => this.handleStateChange(event),
          onError: (event) => this.handleError(event),
        },
      });
    } catch (e) {
      console.warn('YouTube player creation error:', e);
      this.callbacks.onError?.(e);
    }
  }

  getVideoId(track) {
    if (track?.source?.externalId) {
      return track.source.externalId;
    }
    return extractYouTubeVideoId(track?.url || track?.source?.url);
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

  handleError(event) {
    const code = event?.data;
    let message = 'YouTube player encountered an error';

    if (code === 2) {
      message = 'Invalid YouTube video ID parameter';
    } else if (code === 5) {
      message = 'HTML5 player error on YouTube stream';
    } else if (code === 100) {
      message = 'YouTube video not found, private, or removed';
    } else if (code === 101 || code === 150) {
      message = 'Content owner does not allow embedded YouTube playback';
    }

    this.stopTimeTracking();
    this.callbacks.onError?.(new Error(message));
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
    const videoId = this.getVideoId(track);
    if (!videoId) {
      throw new Error('Invalid YouTube video link or missing video identifier');
    }

    this.currentVideoId = videoId;

    if (!this.player) {
      this.ensureIFrameAPI();
    }

    if (!this.isReady || !this.player || typeof this.player.loadVideoById !== 'function') {
      this.pendingVideoId = videoId;
      this.pendingPlay = true;
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
    } else {
      this.pendingPlay = true;
    }
  }

  pause() {
    this.pendingPlay = false;
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
    this.pendingVideoId = null;
    this.pendingPlay = false;
    this.currentVideoId = null;

    if (this.player && typeof this.player.destroy === 'function') {
      try {
        this.player.destroy();
      } catch {
        // Safe ignore
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
