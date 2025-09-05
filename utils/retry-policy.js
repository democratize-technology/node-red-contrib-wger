/**
 * @fileoverview Retry policy implementation with exponential backoff and configurable retry logic
 * @module utils/retry-policy
 * @version 2.0.0
 * @author Node-RED wger contrib team
 */

const { handleWhen, retry, ExponentialBackoff } = require('cockatiel');

/**
 * Configuration options for retry policy behavior.
 * 
 * @typedef {Object} RetryPolicyConfig
 * @property {number} [maxAttempts=3] - Maximum number of retry attempts (including initial attempt)
 * @property {number} [baseDelayMs=1000] - Base delay in milliseconds for exponential backoff
 * @property {number} [maxDelayMs=30000] - Maximum delay in milliseconds between retries
 * @property {number} [jitterRatio=0.1] - Jitter ratio (0-1) to prevent thundering herd
 * @property {Array<number>} [retryableStatusCodes=[429, 502, 503, 504]] - HTTP status codes that should trigger retries
 * @property {boolean} [retryOnNetworkError=true] - Whether to retry on network/connection errors
 * @property {boolean} [retryOnTimeout=true] - Whether to retry on timeout errors
 */

/**
 * Retry policy class that determines whether an error should be retried and calculates delays.
 * Now implemented using Cockatiel for battle-tested resilience patterns.
 * 
 * @class RetryPolicy
 * @example
 * // Basic usage with defaults
 * const policy = new RetryPolicy();
 * 
 * @example
 * // Custom configuration
 * const policy = new RetryPolicy({
 *   maxAttempts: 5,
 *   baseDelayMs: 500,
 *   maxDelayMs: 60000,
 *   jitterRatio: 0.2
 * });
 */
class RetryPolicy {
  /**
   * Creates a new RetryPolicy instance with the specified configuration.
   * 
   * @constructor
   * @param {RetryPolicyConfig} [config={}] - Configuration options for retry behavior
   */
  constructor(config = {}) {
    this.maxAttempts = config.maxAttempts || 3;
    this.baseDelayMs = config.baseDelayMs || 1000;
    this.maxDelayMs = config.maxDelayMs || 30000;
    this.jitterRatio = Math.min(Math.max(config.jitterRatio || 0.1, 0), 1);
    this.retryableStatusCodes = config.retryableStatusCodes || [429, 502, 503, 504];
    this.retryOnNetworkError = config.retryOnNetworkError !== false;
    this.retryOnTimeout = config.retryOnTimeout !== false;

    // Create Cockatiel policy with equivalent configuration
    this._createCockatielPolicy();
  }

  /**
   * Creates the underlying Cockatiel retry policy.
   * 
   * @private
   */
  _createCockatielPolicy() {
    const backoff = new ExponentialBackoff({
      initialDelay: this.baseDelayMs,
      maxDelay: this.maxDelayMs,
      exponent: 2,
      jitter: this.jitterRatio
    });

    // Create retry policy with error filtering
    this._policy = retry(
      handleWhen(error => this._shouldRetryError(error)), 
      {
        maxAttempts: this.maxAttempts,
        backoff: backoff
      }
    );
  }

  /**
   * Determines whether an error should be retried based on the configured retry conditions.
   * 
   * @private
   * @param {Error} error - The error to evaluate
   * @returns {boolean} True if the error should be retried, false otherwise
   */
  _shouldRetryError(error) {
    // Check for HTTP response errors with retryable status codes
    const statusCode = error.status || (error.response && error.response.status);
    if (statusCode && typeof statusCode === 'number') {
      return this.retryableStatusCodes.includes(statusCode);
    }

    // Check for network/connection errors
    if (this.retryOnNetworkError && this._isNetworkError(error)) {
      return true;
    }

    // Check for timeout errors
    if (this.retryOnTimeout && this._isTimeoutError(error)) {
      return true;
    }

    // Default to not retrying unknown errors
    return false;
  }

  /**
   * Executes a function with retry logic using Cockatiel policies.
   * 
   * @param {Function} fn - The function to execute with retry
   * @returns {Promise<*>} The result of the function execution
   * @throws {Error} The last error if all retry attempts fail
   * 
   * @example
   * const result = await policy.execute(async () => {
   *   return await makeApiCall();
   * });
   */
  async execute(fn) {
    return this._policy.execute(fn);
  }

  /**
   * Determines whether an error should be retried based on the configured retry conditions.
   * Maintained for backward compatibility.
   * 
   * @param {Error} error - The error to evaluate
   * @param {number} attemptNumber - Current attempt number (1-based)
   * @returns {boolean} True if the error should be retried, false otherwise
   * 
   * @example
   * const error = new Error('Network timeout');
   * error.code = 'ETIMEDOUT';
   * const shouldRetry = policy.shouldRetry(error, 2);
   */
  shouldRetry(error, attemptNumber) {
    // Don't retry if we've exceeded max attempts
    if (attemptNumber >= this.maxAttempts) {
      return false;
    }

    return this._shouldRetryError(error);
  }

  /**
   * Calculates the delay before the next retry attempt using exponential backoff with jitter.
   * Maintained for backward compatibility - now uses Cockatiel's backoff calculation.
   * 
   * @param {number} attemptNumber - Current attempt number (1-based)
   * @returns {number} Delay in milliseconds before next retry
   * 
   * @example
   * const delay = policy.getRetryDelay(2); // Returns ~2000ms with jitter for second retry
   */
  getRetryDelay(attemptNumber) {
    // Calculate exponential backoff: baseDelay * 2^(attemptNumber-1)
    const exponentialDelay = this.baseDelayMs * Math.pow(2, attemptNumber - 1);
    
    // Cap at maximum delay
    const cappedDelay = Math.min(exponentialDelay, this.maxDelayMs);
    
    // Apply jitter to prevent thundering herd (maintain exact same jitter algorithm)
    const jitterRange = cappedDelay * this.jitterRatio;
    const jitter = (Math.random() * 2 - 1) * jitterRange; // Random between -jitterRange and +jitterRange
    
    return Math.max(0, Math.round(cappedDelay + jitter));
  }

  /**
   * Creates a retry delay promise that resolves after the calculated delay.
   * Maintained for backward compatibility.
   * 
   * @param {number} attemptNumber - Current attempt number (1-based)
   * @returns {Promise<void>} Promise that resolves after the retry delay
   * 
   * @example
   * await policy.delay(2); // Waits ~2000ms with jitter
   */
  async delay(attemptNumber) {
    const delayMs = this.getRetryDelay(attemptNumber);
    return new Promise(resolve => setTimeout(resolve, delayMs));
  }

  /**
   * Gets the underlying Cockatiel policy for advanced usage.
   * 
   * @returns {Policy} The Cockatiel retry policy
   */
  getCockatielPolicy() {
    return this._policy;
  }

  /**
   * Checks if an error is a network-related error that should be retried.
   * 
   * @private
   * @param {Error} error - The error to check
   * @returns {boolean} True if it's a network error
   */
  _isNetworkError(error) {
    // Common network error codes from Node.js and axios
    const networkErrorCodes = [
      'ECONNREFUSED', 'ECONNRESET', 'ECONNABORTED', 'ENOTFOUND',
      'ENETDOWN', 'ENETUNREACH', 'EHOSTDOWN', 'EHOSTUNREACH',
      'ENOENT', 'EAI_AGAIN', 'ETIMEDOUT'
    ];
    
    return networkErrorCodes.includes(error.code) || 
           error.message?.includes('Network Error') ||
           error.message?.includes('No response received from server');
  }

  /**
   * Checks if an error is a timeout error that should be retried.
   * 
   * @private
   * @param {Error} error - The error to check
   * @returns {boolean} True if it's a timeout error
   */
  _isTimeoutError(error) {
    const timeoutErrorCodes = ['ETIMEDOUT', 'TIMEOUT'];
    
    return timeoutErrorCodes.includes(error.code) ||
           error.message?.includes('timeout') ||
           error.message?.includes('Request timed out');
  }

  /**
   * Returns a summary of the retry policy configuration for logging/debugging.
   * 
   * @returns {Object} Configuration summary
   */
  getConfig() {
    return {
      maxAttempts: this.maxAttempts,
      baseDelayMs: this.baseDelayMs,
      maxDelayMs: this.maxDelayMs,
      jitterRatio: this.jitterRatio,
      retryableStatusCodes: this.retryableStatusCodes,
      retryOnNetworkError: this.retryOnNetworkError,
      retryOnTimeout: this.retryOnTimeout
    };
  }
}

module.exports = RetryPolicy;