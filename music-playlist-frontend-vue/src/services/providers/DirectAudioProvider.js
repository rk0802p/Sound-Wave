import { resolvePlayableAudioUrl, isAuthorizedStreamUrl } from './detector';
import {
  infoPlayback,
  warnPlayback,
  errorPlayback,
  debugPlayback
} from '../../utils/playbackDiagnostics';

export class DirectAudioProvider {
  constructor() {
    this.audio = typeof window !== 'undefined' ? new Audio() : null;
    this.handlers = new Map();
    this.callbacks = {};
    this.isInitialized = false;
    this.currentTrack = null;
    this.currentAttemptId = null;
    this._lastLoggedSecond = -1;
    this.playbackRate = 1;

    if (this.audio) {
      this.audio.preload = 'metadata';
      if (typeof window !== 'undefined') {
        window._soundwaveAudio = this.audio;
      }
      infoPlayback('HTML_AUDIO_ELEMENT', null, 'audio_element_created', {
        preload: this.audio.preload,
        defaultMuted: this.audio.defaultMuted
      });
    }
  }

  getCapabilities(track = this.currentTrack) {
    const p = (track?.source?.provider || track?.provider || '').toLowerCase();
    let badge = 'RESTRICTED';
    let providerName = 'Direct Audio';

    if (p === 'jamendo') {
      badge = 'JAMENDO';
      providerName = 'Jamendo CC Stream';
    } else if (p === 'deezer') {
      badge = '30s PREVIEW';
      providerName = 'Deezer Preview (30s)';
    } else if (p === 'itunes' || p === 'apple') {
      badge = '30s PREVIEW';
      providerName = 'iTunes Preview (30s)';
    } else {
      badge = 'UNAUTHORIZED';
      providerName = 'Unauthorized Provider';
    }

    return {
      canSeek: ['jamendo', 'deezer', 'itunes', 'apple'].includes(p),
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

    bindEvent('play', () => {
      infoPlayback('HTML_AUDIO_ELEMENT', this.currentAttemptId, 'event_play', {
        currentTime: this.audio.currentTime,
        paused: this.audio.paused,
        readyState: this.audio.readyState
      });
      this.callbacks.onPlay?.();
    });

    bindEvent('pause', () => {
      infoPlayback('HTML_AUDIO_ELEMENT', this.currentAttemptId, 'event_pause', {
        currentTime: this.audio.currentTime,
        paused: this.audio.paused
      });
      this.callbacks.onPause?.();
    });

    bindEvent('playing', () => {
      infoPlayback('HTML_AUDIO_ELEMENT', this.currentAttemptId, 'event_playing', {
        currentTime: this.audio.currentTime,
        duration: this.audio.duration,
        readyState: this.audio.readyState,
        networkState: this.audio.networkState
      });
      this.callbacks.onPlaying?.();
    });

    bindEvent('waiting', () => {
      infoPlayback('HTML_AUDIO_ELEMENT', this.currentAttemptId, 'event_waiting', {
        currentTime: this.audio.currentTime,
        readyState: this.audio.readyState
      });
      this.callbacks.onWaiting?.();
    });

    bindEvent('timeupdate', () => {
      const sec = Math.floor(this.audio.currentTime);
      // Log milestones (1s, 5s, 10s, 30s, 60s) to keep trace clean and non-spammy
      if (sec !== this._lastLoggedSecond && [1, 5, 10, 30, 60, 120].includes(sec)) {
        this._lastLoggedSecond = sec;
        debugPlayback('HTML_AUDIO_ELEMENT', this.currentAttemptId, 'event_timeupdate_milestone', {
          second: sec,
          duration: this.audio.duration
        });
      }
      this.callbacks.onTimeUpdate?.(this.audio.currentTime);
    });

    bindEvent('loadedmetadata', () => {
      if (this.audio && this.playbackRate) {
        this.audio.playbackRate = this.playbackRate;
      }
      infoPlayback('HTML_AUDIO_ELEMENT', this.currentAttemptId, 'event_loadedmetadata', {
        duration: this.audio.duration,
        readyState: this.audio.readyState
      });
      this.callbacks.onLoadedMetadata?.(this.audio.duration);
    });

    bindEvent('ended', () => {
      infoPlayback('HTML_AUDIO_ELEMENT', this.currentAttemptId, 'event_ended', {
        currentTime: this.audio.currentTime
      });
      this.callbacks.onEnded?.();
    });

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
      errorPlayback('HTML_AUDIO_ELEMENT', this.currentAttemptId, 'event_error', detail, {
        currentSrc: this.audio.currentSrc,
        networkState: this.audio.networkState,
        readyState: this.audio.readyState
      });
      this.callbacks.onError?.(detail);
    });

    this.isInitialized = true;
    infoPlayback('HTML_AUDIO_ELEMENT', null, 'initialized', { handlersBound: this.handlers.size });
  }

  async load(track, attemptId = null) {
    if (!this.audio) return;
    this.currentTrack = track;
    this.currentAttemptId = attemptId;
    this._lastLoggedSecond = -1;

    const provider = String(track?.source?.provider || track?.provider || '').toLowerCase().trim();
    const trackId = track?.id || track?._id || 'unknown';
    const title = track?.title || 'Unknown Title';

    infoPlayback('DIRECT_AUDIO_PROVIDER', attemptId, 'load_start', {
      trackId,
      title,
      provider
    });

    // Security Gate 1: Reject unverified or unapproved providers
    const ALLOWED_PROVIDERS = ['jamendo', 'deezer', 'itunes', 'apple'];
    if (!ALLOWED_PROVIDERS.includes(provider)) {
      if (this.audio) this.audio.pause();
      const errDetail = {
        code: 403,
        message: provider
          ? `Playback rejected: Provider '${provider}' is not authorized for direct audio streaming.`
          : 'Playback rejected: Track lacks authorized provider metadata.',
        kind: 'unauthorized_provider',
      };
      warnPlayback('PROVIDER_POLICY', attemptId, 'rejected_provider', errDetail);
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
      warnPlayback('PROVIDER_POLICY', attemptId, 'rejected_unplayable_flag', errDetail);
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
      warnPlayback('AUDIO_URL_VALIDATION', attemptId, 'rejected_unauthorized_url', {
        urlPresent: Boolean(url),
        authorized: false
      });
      this.callbacks.onError?.(errDetail);
      throw new Error(errDetail.message);
    }

    infoPlayback('AUDIO_URL_VALIDATION', attemptId, 'url_validated_authorized', {
      isHttps: url.startsWith('https://'),
      host: `authorized CDN (${provider})`
    });

    if (this.audio.src !== url) {
      infoPlayback('HTML_AUDIO_ELEMENT', attemptId, 'assigning_new_src', {
        previousSrc: this.audio.src ? 'configured' : 'empty'
      });
      this.audio.src = url;
      if (this.playbackRate && this.audio) {
        this.audio.playbackRate = this.playbackRate;
      }
      this.audio.load();
      infoPlayback('HTML_AUDIO_ELEMENT', attemptId, 'load_invoked', {
        readyState: this.audio.readyState,
        networkState: this.audio.networkState
      });
    }

    this.callbacks.onCapabilities?.(this.getCapabilities(track));
    return this.play();
  }

  async play() {
    if (!this.audio) return;
    try {
      if (this.playbackRate && this.audio && this.audio.playbackRate !== this.playbackRate) {
        this.audio.playbackRate = this.playbackRate;
      }
      infoPlayback('HTML_AUDIO_ELEMENT', this.currentAttemptId, 'play_invoked');
      await this.audio.play();
      infoPlayback('HTML_AUDIO_ELEMENT', this.currentAttemptId, 'play_promise_resolved', {
        paused: this.audio.paused,
        currentTime: this.audio.currentTime
      });
    } catch (err) {
      if (err.name === 'AbortError') {
        infoPlayback('HTML_AUDIO_ELEMENT', this.currentAttemptId, 'play_aborted_by_subsequent_request');
        return;
      }
      if (err.name === 'NotAllowedError') {
        warnPlayback('BROWSER_PLAYBACK', this.currentAttemptId, 'autoplay_restricted_needs_gesture', {
          errorName: err.name,
          message: err.message
        });
      } else {
        errorPlayback('BROWSER_PLAYBACK', this.currentAttemptId, 'play_rejected', err);
      }
      throw err;
    }
  }

  pause() {
    if (!this.audio) return;
    infoPlayback('HTML_AUDIO_ELEMENT', this.currentAttemptId, 'pause_invoked');
    this.audio.pause();
  }

  seek(seconds) {
    if (!this.audio) return;
    const duration = this.audio.duration || 0;
    const target = Math.max(0, Math.min(seconds, duration));
    infoPlayback('HTML_AUDIO_ELEMENT', this.currentAttemptId, 'seek_invoked', { target, duration });
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
    infoPlayback('HTML_AUDIO_ELEMENT', this.currentAttemptId, 'mute_toggled', { muted: Boolean(muted) });
  }

  setPlaybackRate(rate) {
    const clamped = typeof rate === 'number' && !isNaN(rate) && rate > 0 ? rate : 1;
    this.playbackRate = clamped;
    if (this.audio) {
      this.audio.defaultPlaybackRate = clamped;
      this.audio.playbackRate = clamped;
      infoPlayback('HTML_AUDIO_ELEMENT', this.currentAttemptId, 'playback_rate_changed', { rate: clamped });
    }
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
    infoPlayback('HTML_AUDIO_ELEMENT', null, 'destroyed');
  }
}
