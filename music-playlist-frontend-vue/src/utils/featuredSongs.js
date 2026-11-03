import { FEATURED_SONGS } from '../data/featuredSongs.js';

/**
 * Returns a randomized subset of tracks from the collection using the Fisher-Yates algorithm.
 *
 * @param {Array} collection - Array of track items (defaults to FEATURED_SONGS)
 * @param {number} count - Desired number of tracks (defaults to 10, typically 8-10)
 * @param {Function} randomFn - Random number generator (defaults to Math.random, injectable for deterministic testing)
 * @returns {Array} A newly shuffled subset of tracks
 */
export function getRandomFeaturedSongs(
  collection = FEATURED_SONGS,
  count = 10,
  randomFn = Math.random
) {
  if (!Array.isArray(collection) || collection.length === 0) {
    return [];
  }

  // Non-mutating shallow copy
  const copy = [...collection];
  const n = copy.length;

  // Modern Fisher-Yates / Knuth shuffle
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(randomFn() * (i + 1));
    const temp = copy[i];
    copy[i] = copy[j];
    copy[j] = temp;
  }

  // Clamp desired count
  const targetCount = Math.max(1, Math.min(count, n));
  return copy.slice(0, targetCount);
}

/**
 * Formats duration in seconds into M:SS display.
 * @param {number} seconds
 * @returns {string}
 */
export function formatDuration(seconds) {
  if (!seconds || isNaN(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s < 10 ? '0' : ''}${s}`;
}
