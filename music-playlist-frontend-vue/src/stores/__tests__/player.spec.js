import { describe, it, expect, beforeEach, vi } from 'vitest';
import { setActivePinia, createPinia } from 'pinia';
import { usePlayerStore } from '../player';
import { isAuthorizedStreamUrl, detectProviderType } from '../../services/providers/detector';
import { DirectAudioProvider } from '../../services/providers/DirectAudioProvider';

// Mock localStorage
const storageMock = (() => {
  let store = {};
  return {
    getItem: vi.fn((key) => store[key] || null),
    setItem: vi.fn((key, value) => {
      store[key] = String(value);
    }),
    removeItem: vi.fn((key) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
globalThis.localStorage = storageMock;

describe('SOUNDWAVE Player & Play-Along Practice Mode', () => {
  let store;

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    setActivePinia(createPinia());
    store = usePlayerStore();
  });

  describe('Playback Speed Controls', () => {
    it('initializes with default 1x playback speed', () => {
      expect(store.playbackSpeed).toBe(1);
    });

    it('sets valid playback speed and persists to localStorage', () => {
      store.setPlaybackSpeed(1.5);
      expect(store.playbackSpeed).toBe(1.5);
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'soundwave_playback_state_v1',
        expect.stringContaining('"playbackSpeed":1.5')
      );
    });

    it('clamps or defaults invalid speeds to 1x', () => {
      store.setPlaybackSpeed(99);
      expect(store.playbackSpeed).toBe(1);
    });

    it('cyclePlaybackSpeed cycles sequentially through supported presets', () => {
      store.setPlaybackSpeed(1);
      store.cyclePlaybackSpeed(); // 1.25
      expect(store.playbackSpeed).toBe(1.25);
      store.cyclePlaybackSpeed(); // 1.5
      expect(store.playbackSpeed).toBe(1.5);
      store.cyclePlaybackSpeed(); // 2
      expect(store.playbackSpeed).toBe(2);
      store.cyclePlaybackSpeed(); // 0.5
      expect(store.playbackSpeed).toBe(0.5);
      store.cyclePlaybackSpeed(); // 0.75
      expect(store.playbackSpeed).toBe(0.75);
      store.cyclePlaybackSpeed(); // 1
      expect(store.playbackSpeed).toBe(1);
    });
  });

  describe('Play-Along A-B Loop Controls', () => {
    it('starts with null loop markers and loop inactive', () => {
      expect(store.loopA).toBeNull();
      expect(store.loopB).toBeNull();
      expect(store.isLooping).toBe(false);
    });

    it('sets marker A and marker B correctly', () => {
      store.setLoopA(12.5);
      expect(store.loopA).toBe(12.5);

      store.setLoopB(45.0);
      expect(store.loopB).toBe(45.0);
      expect(store.isLooping).toBe(true);
    });

    it('resets marker B if marker A is set past B', () => {
      store.setLoopB(20);
      store.setLoopA(30);
      expect(store.loopA).toBe(30);
      expect(store.loopB).toBeNull();
      expect(store.isLooping).toBe(false);
    });

    it('toggles loop active status when markers are valid', () => {
      store.setLoopA(5);
      store.setLoopB(15);
      expect(store.isLooping).toBe(true);

      store.toggleLoop();
      expect(store.isLooping).toBe(false);

      store.toggleLoop();
      expect(store.isLooping).toBe(true);
    });

    it('deactivates loop if marker B is set before or equal to marker A', () => {
      store.setLoopA(20);
      store.setLoopB(50);
      expect(store.isLooping).toBe(true);

      // Now set B <= A
      store.setLoopB(15);
      expect(store.loopB).toBe(15);
      expect(store.isLooping).toBe(false);
    });

    it('clearLoop clears all markers and disables loop', () => {
      store.setLoopA(10);
      store.setLoopB(25);
      expect(store.isLooping).toBe(true);

      store.clearLoop();
      expect(store.loopA).toBeNull();
      expect(store.loopB).toBeNull();
      expect(store.isLooping).toBe(false);
      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('Queue & Playback State Persistence (soundwave_playback_state_v1)', () => {
    it('persists queue, volume, shuffle, repeat, and speed to localStorage', () => {
      store.setVolume(0.65);
      store.setMuted(true);
      store.toggleShuffle();
      store.cycleRepeat();
      store.setPlaybackSpeed(1.25);

      expect(localStorage.setItem).toHaveBeenCalledWith(
        'soundwave_playback_state_v1',
        expect.stringContaining('"volume":0.65')
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'soundwave_playback_state_v1',
        expect.stringContaining('"muted":true')
      );
      expect(localStorage.setItem).toHaveBeenCalledWith(
        'soundwave_playback_state_v1',
        expect.stringContaining('"playbackSpeed":1.25')
      );
    });

    it('rehydrates state cleanly from existing localStorage payload', () => {
      const savedState = {
        queue: [
          { id: 't1', title: 'Persisted Track 1', artist: 'Artist 1', duration: 180 },
          { id: 't2', title: 'Persisted Track 2', artist: 'Artist 2', duration: 210 },
        ],
        trackIndex: 1,
        currentTrack: { id: 't2', title: 'Persisted Track 2', artist: 'Artist 2', duration: 210 },
        volume: 0.72,
        muted: false,
        shuffle: true,
        repeat: 'all',
        playbackSpeed: 1.5,
        loopA: 15,
        loopB: 45,
        isLooping: true,
      };

      localStorage.getItem.mockReturnValueOnce(JSON.stringify(savedState));
      store.rehydrateState();

      expect(store.queue.length).toBe(2);
      expect(store.trackIndex).toBe(1);
      expect(store.currentTrack.title).toBe('Persisted Track 2');
      expect(store.volume).toBe(0.72);
      expect(store.shuffle).toBe(true);
      expect(store.repeat).toBe('all');
      expect(store.playbackSpeed).toBe(1.5);
      expect(store.loopA).toBe(15);
      expect(store.loopB).toBe(45);
      expect(store.isLooping).toBe(true);
    });
  });

  describe('Multi-Source Preview Playback Authorization & Capabilities', () => {
    it('authorizes Jamendo CDN streams', () => {
      const jamendoUrl = 'https://prod-1.storage.jamendo.com/download/track/123/mp32/';
      expect(isAuthorizedStreamUrl(jamendoUrl)).toBe(true);
      expect(detectProviderType(jamendoUrl)).toBe('jamendo');
    });

    it('authorizes Deezer 30-second preview CDN streams (*.dzcdn.net)', () => {
      const deezerPreviewUrl = 'https://cdns-preview-d.dzcdn.net/stream/c-d0ef106346210f76906a5b93d3ce9d9b-4.mp3';
      expect(isAuthorizedStreamUrl(deezerPreviewUrl)).toBe(true);
      expect(detectProviderType(deezerPreviewUrl)).toBe('deezer');
    });

    it('authorizes Apple Music / iTunes preview CDN streams (*.itunes.apple.com)', () => {
      const itunesPreviewUrl = 'https://audio-ssl.itunes.apple.com/itunes-assets/AudioPreview125/v4/a5/d8/92/a5d89283-9b83-preview.mp3';
      expect(isAuthorizedStreamUrl(itunesPreviewUrl)).toBe(true);
      expect(detectProviderType(itunesPreviewUrl)).toBe('itunes');
    });

    it('strictly rejects unauthorized or insecure audio stream domains', () => {
      expect(isAuthorizedStreamUrl('http://insecure.dzcdn.net/stream.mp3')).toBe(false); // not https
      expect(isAuthorizedStreamUrl('https://malicious-site.com/audio.mp3')).toBe(false);
      expect(isAuthorizedStreamUrl('https://dzcdn.net.evil.com/fake.mp3')).toBe(false);
      expect(isAuthorizedStreamUrl('https://crapple.com/fake.mp3')).toBe(false);
      expect(isAuthorizedStreamUrl('https://pineapple.com/fake.mp3')).toBe(false);
      expect(isAuthorizedStreamUrl(null)).toBe(false);
      expect(isAuthorizedStreamUrl('')).toBe(false);
    });

    it('rejects domain spoofing in detectProviderType', () => {
      expect(detectProviderType('https://crapple.com/song.mp3')).not.toBe('itunes');
      expect(detectProviderType('https://pineapple.com/song.mp3')).not.toBe('itunes');
      expect(detectProviderType('https://mydeezer.com/song.mp3')).not.toBe('deezer');
      expect(detectProviderType('https://snapple.com/song.mp3')).not.toBe('itunes');
    });

    it('DirectAudioProvider returns 30s PREVIEW badge for Deezer and iTunes tracks', () => {
      const provider = new DirectAudioProvider();

      const deezerCaps = provider.getCapabilities({ provider: 'deezer' });
      expect(deezerCaps.badge).toBe('30s PREVIEW');
      expect(deezerCaps.providerName).toContain('Deezer');
      expect(deezerCaps.canSeek).toBe(true);

      const itunesCaps = provider.getCapabilities({ provider: 'itunes' });
      expect(itunesCaps.badge).toBe('30s PREVIEW');
      expect(itunesCaps.providerName).toContain('iTunes');
      expect(itunesCaps.canSeek).toBe(true);

      const jamendoCaps = provider.getCapabilities({ provider: 'jamendo' });
      expect(jamendoCaps.badge).toBe('JAMENDO');

      const unauthorizedCaps = provider.getCapabilities({ provider: 'random' });
      expect(unauthorizedCaps.badge).toBe('UNAUTHORIZED');
    });
  });
});
