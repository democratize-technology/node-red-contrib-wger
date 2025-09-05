/**
 * @fileoverview Circuit breaker implementation to prevent cascading failures
 * @module utils/circuit-breaker
 * @version 2.0.0
 * @author Node-RED wger contrib team
 */

const { handleAll, circuitBreaker, ConsecutiveBreaker } = require('cockatiel');
const timeProvider = require('./time-provider').default;

/**
 * Configuration options for circuit breaker behavior.
 * 
 * @typedef {Object} CircuitBreakerConfig
 * @property {number} [failureThreshold=5] - Number of consecutive failures before opening circuit
 * @property {number} [resetTimeoutMs=60000] - Time in milliseconds to wait before attempting reset
 * @property {number} [halfOpenMaxCalls=3] - Maximum number of calls to allow in half-open state
 * @property {Object} [timeProvider] - Time provider for dependency injection (defaults to system time)
 */

/**
 * Circuit breaker states.
 * 
 * @enum {string}
 */
const CircuitBreakerState = {
  CLOSED: 'closed',     // Normal operation
  OPEN: 'open',         // Circuit is open, blocking all calls
  HALF_OPEN: 'half-open' // Testing if service has recovered
};

/**
 * Circuit breaker class that prevents cascading failures by monitoring failure patterns.
 * Now implemented using Cockatiel's ConsecutiveBreaker for battle-tested resilience.
 * 
 * @class CircuitBreaker
 * @example
 * // Basic usage
 * const breaker = new CircuitBreaker();
 * 
 * @example
 * // Custom configuration
 * const breaker = new CircuitBreaker({
 *   failureThreshold: 10,
 *   resetTimeoutMs: 30000,
 *   halfOpenMaxCalls: 1
 * });
 */
class CircuitBreaker {
  /**
   * Creates a new CircuitBreaker instance with the specified configuration.
   * 
   * @constructor
   * @param {CircuitBreakerConfig} [config={}] - Configuration options for circuit breaker behavior
   */
  constructor(config = {}) {
    this.failureThreshold = config.failureThreshold !== undefined ? config.failureThreshold : 5;
    this.resetTimeoutMs = config.resetTimeoutMs || 60000;
    this.halfOpenMaxCalls = config.halfOpenMaxCalls || 3;
    this.timeProvider = config.timeProvider || timeProvider;
    
    // Backward compatibility state tracking
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.nextAttemptTime = 0;
    this.halfOpenCallCount = 0;

    // Create Cockatiel circuit breaker policy
    this._createCockatielPolicy();
  }

  /**
   * Creates the underlying Cockatiel circuit breaker policy.
   * 
   * @private
   */
  _createCockatielPolicy() {
    const breaker = new ConsecutiveBreaker(this.failureThreshold);
    
    this._policy = circuitBreaker(handleAll, {
      halfOpenAfter: this.resetTimeoutMs,
      breaker: breaker
    });

    // Set up event listeners to maintain backward compatibility state
    this._policy.onFailure(() => {
      this.failureCount++;
      this._updateState();
    });

    this._policy.onSuccess(() => {
      this.failureCount = 0;
      this._updateState();
    });

    this._policy.onHalfOpen(() => {
      this.state = CircuitBreakerState.HALF_OPEN;
      this.halfOpenCallCount = 0;
    });

    this._policy.onBreak(() => {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = this.timeProvider.now() + this.resetTimeoutMs;
    });
  }

  /**
   * Updates internal state tracking for backward compatibility.
   * 
   * @private
   */
  _updateState() {
    // Mirror the Cockatiel state to our state enum for compatibility
    if (this.failureCount >= this.failureThreshold && this.failureThreshold > 0) {
      this.state = CircuitBreakerState.OPEN;
      this.nextAttemptTime = this.timeProvider.now() + this.resetTimeoutMs;
    } else if (this.failureCount === 0) {
      this.state = CircuitBreakerState.CLOSED;
      this.nextAttemptTime = 0;
    }
  }

  /**
   * Executes a function with circuit breaker protection using Cockatiel.
   * 
   * @param {Function} fn - The function to execute with circuit breaker protection
   * @returns {Promise<*>} The result of the function execution
   * @throws {Error} Circuit breaker error if circuit is open, or function error
   * 
   * @example
   * const result = await breaker.execute(async () => {
   *   return await makeApiCall();
   * });
   */
  async execute(fn) {
    return this._policy.execute(fn);
  }

  /**
   * Checks if a call should be allowed through the circuit breaker.
   * Maintained for backward compatibility.
   * 
   * @returns {boolean} True if the call should be allowed, false if circuit is open
   * 
   * @example
   * if (breaker.canExecute()) {
   *   try {
   *     const result = await makeApiCall();
   *     breaker.onSuccess();
   *     return result;
   *   } catch (error) {
   *     breaker.onFailure();
   *     throw error;
   *   }
   * } else {
   *   throw new Error('Circuit breaker is open');
   * }
   */
  canExecute() {
    const now = this.timeProvider.now();
    
    switch (this.state) {
    case CircuitBreakerState.CLOSED:
      return true;
        
    case CircuitBreakerState.OPEN:
      if (now >= this.nextAttemptTime) {
        this._transitionToHalfOpen();
        return true;
      }
      return false;
        
    case CircuitBreakerState.HALF_OPEN:
      return this.halfOpenCallCount < this.halfOpenMaxCalls;
        
    default:
      return false;
    }
  }

  /**
   * Records a successful operation and potentially closes the circuit.
   * Maintained for backward compatibility.
   */
  onSuccess() {
    switch (this.state) {
    case CircuitBreakerState.CLOSED:
      this.failureCount = 0;
      break;
        
    case CircuitBreakerState.HALF_OPEN:
      this.halfOpenCallCount++;
      // If we've had enough successful calls in half-open state, close the circuit
      if (this.halfOpenCallCount >= this.halfOpenMaxCalls) {
        this._transitionToClosed();
      }
      break;
    }
  }

  /**
   * Records a failed operation and potentially opens the circuit.
   * Maintained for backward compatibility.
   */
  onFailure() {
    this.failureCount++;
    
    switch (this.state) {
    case CircuitBreakerState.CLOSED:
      if (this.failureThreshold === 0 || this.failureCount >= this.failureThreshold) {
        this._transitionToOpen();
      }
      break;
        
    case CircuitBreakerState.HALF_OPEN:
      this._transitionToOpen();
      break;
    }
  }

  /**
   * Gets the underlying Cockatiel policy for advanced usage.
   * 
   * @returns {Policy} The Cockatiel circuit breaker policy
   */
  getCockatielPolicy() {
    return this._policy;
  }

  /**
   * Gets the current state of the circuit breaker.
   * 
   * @returns {string} Current circuit breaker state
   */
  getState() {
    return this.state;
  }

  /**
   * Gets statistics about the circuit breaker's operation.
   * 
   * @returns {Object} Circuit breaker statistics
   */
  getStats() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      failureThreshold: this.failureThreshold,
      nextAttemptTime: this.nextAttemptTime,
      halfOpenCallCount: this.halfOpenCallCount,
      halfOpenMaxCalls: this.halfOpenMaxCalls
    };
  }

  /**
   * Resets the circuit breaker to its initial closed state.
   * Useful for testing or manual recovery scenarios.
   */
  reset() {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.nextAttemptTime = 0;
    this.halfOpenCallCount = 0;
  }

  /**
   * Transitions the circuit breaker to the open state.
   * 
   * @private
   */
  _transitionToOpen() {
    this.state = CircuitBreakerState.OPEN;
    this.nextAttemptTime = this.timeProvider.now() + this.resetTimeoutMs;
    this.halfOpenCallCount = 0;
  }

  /**
   * Transitions the circuit breaker to the half-open state.
   * 
   * @private
   */
  _transitionToHalfOpen() {
    this.state = CircuitBreakerState.HALF_OPEN;
    this.halfOpenCallCount = 0;
  }

  /**
   * Transitions the circuit breaker to the closed state.
   * 
   * @private
   */
  _transitionToClosed() {
    this.state = CircuitBreakerState.CLOSED;
    this.failureCount = 0;
    this.nextAttemptTime = 0;
    this.halfOpenCallCount = 0;
  }

  /**
   * Creates an error to throw when the circuit breaker is open.
   * 
   * @returns {Error} Circuit breaker open error
   */
  createCircuitOpenError() {
    const error = new Error('Circuit breaker is open - too many recent failures');
    error.name = 'CircuitBreakerOpenError';
    error.circuitBreakerState = this.state;
    error.nextAttemptTime = this.nextAttemptTime;
    return error;
  }
}

module.exports = { CircuitBreaker, CircuitBreakerState };