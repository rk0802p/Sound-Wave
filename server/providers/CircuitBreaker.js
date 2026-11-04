/**
 * SOUNDWAVE Provider Circuit Breaker
 * Tracks consecutive provider failures, enforces cooldown periods,
 * records telemetry metrics, and prevents cascading latency when external music APIs are down.
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
    this.totalFailures = 0;
    this.successCount = 0;
    this.timeoutCount = 0;
    this.transitionCount = 0;
    this.lastTransitionTime = null;

    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.nextAttemptTime = null;
    this.lastError = null;

    // Latency tracking
    this.totalLatencyMs = 0;
    this.latencySamples = 0;
    this.lastLatencyMs = 0;
  }

  /**
   * Internal state transition recorder
   */
  _transition(newState) {
    if (this.state !== newState) {
      this.state = newState;
      this.transitionCount += 1;
      this.lastTransitionTime = Date.now();
    }
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
        this._transition('HALF_OPEN');
        return true;
      }
      return false;
    }

    // HALF_OPEN: allow 1 probe request
    return true;
  }

  /**
   * Record successful provider response
   * @param {number} [latencyMs=0]
   */
  recordSuccess(latencyMs = 0) {
    this.failureCount = 0;
    this.successCount += 1;
    this.lastSuccessTime = Date.now();
    this.lastError = null;

    if (latencyMs > 0) {
      this.lastLatencyMs = latencyMs;
      this.totalLatencyMs += latencyMs;
      this.latencySamples += 1;
    }

    this._transition('CLOSED');
  }

  /**
   * Record provider failure (timeout, network error, 5xx)
   * @param {Error|string} error
   * @param {boolean} [isTimeout=false]
   */
  recordFailure(error, isTimeout = false) {
    this.failureCount += 1;
    this.totalFailures += 1;
    if (isTimeout || (error && /timeout/i.test(error.message || String(error)))) {
      this.timeoutCount += 1;
    }

    this.lastFailureTime = Date.now();
    this.lastError = typeof error === 'string' ? error : (error?.message || 'Unknown provider error');

    if (this.state === 'HALF_OPEN' || this.failureCount >= this.failureThreshold) {
      this._transition('OPEN');
      this.nextAttemptTime = Date.now() + this.cooldownPeriodMs;
    }
  }

  /**
   * Return health & diagnostic status of the circuit
   * @returns {object}
   */
  getStatus() {
    const now = Date.now();
    const avgLatency = this.latencySamples > 0 ? Math.round(this.totalLatencyMs / this.latencySamples) : 0;

    return {
      state: this.state,
      failureCount: this.failureCount,
      totalFailures: this.totalFailures,
      successCount: this.successCount,
      timeoutCount: this.timeoutCount,
      isOpen: this.state === 'OPEN',
      nextAttemptInMs: this.nextAttemptTime ? Math.max(0, this.nextAttemptTime - now) : 0,
      lastError: this.lastError,
      lastSuccessTime: this.lastSuccessTime ? new Date(this.lastSuccessTime).toISOString() : null,
      lastFailureTime: this.lastFailureTime ? new Date(this.lastFailureTime).toISOString() : null,
      lastTransitionTime: this.lastTransitionTime ? new Date(this.lastTransitionTime).toISOString() : null,
      transitionCount: this.transitionCount,
      latency: {
        lastMs: this.lastLatencyMs,
        avgMs: avgLatency,
      },
    };
  }

  /**
   * Reset the circuit breaker to closed state (useful for tests)
   */
  reset() {
    this.failureCount = 0;
    this.totalFailures = 0;
    this.successCount = 0;
    this.timeoutCount = 0;
    this.transitionCount = 0;
    this.lastTransitionTime = null;
    this.lastFailureTime = null;
    this.lastSuccessTime = null;
    this.nextAttemptTime = null;
    this.lastError = null;
    this.totalLatencyMs = 0;
    this.latencySamples = 0;
    this.lastLatencyMs = 0;
    this._transition('CLOSED');
  }
}

module.exports = CircuitBreaker;
