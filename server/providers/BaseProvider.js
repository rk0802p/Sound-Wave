/**
 * SOUNDWAVE Music Provider Base Class
 * Defines the standard contract and fault isolation error boundaries
 * for all external music providers.
 */

class BaseProvider {
  /**
   * @param {string} name - Unique provider identifier (e.g. 'archive', 'jamendo', 'audius')
   * @param {string} displayName - Human-readable label (e.g. 'Internet Archive')
   */
  constructor(name, displayName) {
    this.name = name;
    this.displayName = displayName;
    this.status = 'available'; // 'available' | 'degraded' | 'rate_limited' | 'unconfigured' | 'unavailable'
    this.lastError = null;
    this.lastChecked = new Date();
  }

  /**
   * Check if necessary environment credentials or configurations are present
   * @returns {boolean}
   */
  isConfigured() {
    return true;
  }

  /**
   * Report health status and diagnostic information
   * @returns {{ name: string, displayName: string, status: string, isConfigured: boolean, error: string|null, lastChecked: Date }}
   */
  getHealth() {
    return {
      name: this.name,
      displayName: this.displayName,
      status: !this.isConfigured() ? 'unconfigured' : this.status,
      isConfigured: this.isConfigured(),
      error: this.lastError,
      lastChecked: this.lastChecked,
    };
  }

  /**
   * Safe fetch with bounded timeout and AbortController to prevent hanging connections
   * Chains external signal if provided in options
   * @param {string} url
   * @param {object} options
   * @param {number} timeoutMs
   * @returns {Promise<Response>}
   */
  async fetchWithTimeout(url, options = {}, timeoutMs = 5000) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    // If caller provided an external AbortSignal, chain it
    let externalAbortHandler = null;
    if (options.signal) {
      if (options.signal.aborted) {
        controller.abort();
      } else {
        externalAbortHandler = () => controller.abort();
        options.signal.addEventListener('abort', externalAbortHandler, { once: true });
      }
    }

    try {
      const fetchOptions = { ...options, signal: controller.signal };
      const response = await fetch(url, fetchOptions);
      return response;
    } finally {
      clearTimeout(timeoutId);
      if (options.signal && externalAbortHandler) {
        options.signal.removeEventListener('abort', externalAbortHandler);
      }
    }
  }

  /**
   * Search provider for tracks matching query
   * Must return normalized track objects and handle all internal errors
   * @param {string} query
   * @param {object} options
   * @returns {Promise<{ results: Array, error: string|null, status: string }>}
   */
  async search(query, options = {}) {
    throw new Error(`search() not implemented for provider ${this.name}`);
  }

  /**
   * Resolve fresh remote stream URL or metadata for a track
   * @param {string} trackId
   * @returns {Promise<{ streamUrl: string|null, metadata: object|null, error: string|null }>}
   */
  async resolveTrack(trackId) {
    throw new Error(`resolveTrack() not implemented for provider ${this.name}`);
  }
}

module.exports = BaseProvider;
