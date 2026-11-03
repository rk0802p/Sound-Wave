/**
 * SOUNDWAVE Provider Circuit Breaker
 * Tracks consecutive provider failures, enforces cooldown periods,
 * and prevents cascading latency when external music APIs are down.
 */

class CircuitBreaker {
  /**
   * @param {string} providerName
   * @param {object} options
   * @param {number} [options.failureThreshold=3] - Number of failures before tripping
   * @param {number} [options.cooldownPeriodMs=30000] - Duration to stay OPEN in ms (30s)
   */
  constructor(providerName, options = {}) {
    this.providerName = providerName;
    this.failureThreshold = options.failureThreshold || 3;
    this.cooldownPeriodMs = options.cooldownPeriodMs || 30000;

    this.state = 'CLOSED'; // 'CLOSED' | 'OPEN' | 'HALF_OPEN'
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.lastError = null;
  }

  /**
   * Check if request should be allowed through
   * @returns {boolean}
   */
  canExecute() {
    const now = Date.now();

    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'OPEN') {
      if (now >= this.nextAttemptTime) {
        this.state = 'HALF_OPEN';
        return true;
      }
      return false;
    }

    // HALF_OPEN: allow 1 probe request
    return true;
  }

  /**
   * Record successful provider response
   */
  recordSuccess() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.lastError = null;
  }

  /**
   * Record provider failure (timeout, network error, 5xx)
   * @param {Error|string} error
   */
  recordFailure(error) {
    this.failureCount += 1;
    this.lastFailureTime = Date.now();
    this.lastError = typeof error === 'string' ? error : (error?.message || 'Unknown error');

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this.state = 'OPEN';
      this.nextAttemptTime = Date.now() + this.cooldownPeriodMs;
    }
  }

  /**
   * Return health & diagnostic status of the circuit
   * @returns {object}
   */
  getStatus() {
    const now = Date.now();
    return {
      state: this.state,
      failureCount: this.failureCount,
      isOpen: this.state === 'OPEN',
      nextAttemptInMs: this.nextAttemptTime ? Math.max(0, this.nextAttemptTime - now) : 0,
      lastError: this.lastError,
    };
  }

  /**
   * Reset the circuit breaker to closed state (useful for tests)
   */
  reset() {
    this.failureCount = 0;
    this.state = 'CLOSED';
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    this.lastError = null;
  }
}

module.exports = CircuitBreaker;
