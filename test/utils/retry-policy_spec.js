/**
 * Test cases for RetryPolicy class
 */

const should = require('should');
const RetryPolicy = require('../../utils/retry-policy');

describe('RetryPolicy', function() {
  describe('Constructor', function() {
    it('should create with default configuration', function() {
      const policy = new RetryPolicy();
      const config = policy.getConfig();
      
      config.maxAttempts.should.equal(3);
      config.baseDelayMs.should.equal(1000);
      config.maxDelayMs.should.equal(30000);
      config.jitterRatio.should.equal(0.1);
      config.retryableStatusCodes.should.deepEqual([429, 502, 503, 504]);
      config.retryOnNetworkError.should.be.true();
      config.retryOnTimeout.should.be.true();
    });

    it('should create with custom configuration', function() {
      const policy = new RetryPolicy({
        maxAttempts: 5,
        baseDelayMs: 500,
        maxDelayMs: 60000,
        jitterRatio: 0.2,
        retryableStatusCodes: [429, 500, 502, 503, 504],
        retryOnNetworkError: false,
        retryOnTimeout: false
      });
      
      const config = policy.getConfig();
      config.maxAttempts.should.equal(5);
      config.baseDelayMs.should.equal(500);
      config.maxDelayMs.should.equal(60000);
      config.jitterRatio.should.equal(0.2);
      config.retryableStatusCodes.should.deepEqual([429, 500, 502, 503, 504]);
      config.retryOnNetworkError.should.be.false();
      config.retryOnTimeout.should.be.false();
    });

    it('should clamp jitter ratio to valid range', function() {
      let policy = new RetryPolicy({ jitterRatio: -0.5 });
      policy.getConfig().jitterRatio.should.equal(0);
      
      policy = new RetryPolicy({ jitterRatio: 1.5 });
      policy.getConfig().jitterRatio.should.equal(1);
    });
  });

  describe('shouldRetry', function() {
    let policy;

    beforeEach(function() {
      policy = new RetryPolicy({
        maxAttempts: 3,
        retryableStatusCodes: [429, 502, 503, 504],
        retryOnNetworkError: true,
        retryOnTimeout: true
      });
    });

    it('should not retry when max attempts reached', function() {
      const error = new Error('Server error');
      error.status = 503;
      
      policy.shouldRetry(error, 3).should.be.false();
      policy.shouldRetry(error, 4).should.be.false();
    });

    it('should retry for retryable HTTP status codes', function() {
      [429, 502, 503, 504].forEach(status => {
        const error = new Error('HTTP error');
        error.status = status;
        
        policy.shouldRetry(error, 1).should.be.true();
        policy.shouldRetry(error, 2).should.be.true();
      });
    });

    it('should not retry for non-retryable HTTP status codes', function() {
      [400, 401, 403, 404, 422].forEach(status => {
        const error = new Error('HTTP error');
        error.status = status;
        
        policy.shouldRetry(error, 1).should.be.false();
      });
    });

    it('should retry for network errors when enabled', function() {
      const networkErrorCodes = ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT'];
      
      networkErrorCodes.forEach(code => {
        const error = new Error('Network error');
        error.code = code;
        
        policy.shouldRetry(error, 1).should.be.true();
      });
    });

    it('should not retry for network errors when disabled', function() {
      policy = new RetryPolicy({ retryOnNetworkError: false });
      
      const error = new Error('Network error');
      error.code = 'ECONNREFUSED';
      
      policy.shouldRetry(error, 1).should.be.false();
    });

    it('should retry for timeout errors when enabled', function() {
      const error = new Error('Request timed out');
      error.code = 'ETIMEDOUT';
      
      policy.shouldRetry(error, 1).should.be.true();
    });

    it('should retry for network error messages', function() {
      const error = new Error('Network Error');
      policy.shouldRetry(error, 1).should.be.true();
      
      const error2 = new Error('No response received from server');
      policy.shouldRetry(error2, 1).should.be.true();
    });

    it('should not retry for unknown errors', function() {
      const error = new Error('Unknown error');
      policy.shouldRetry(error, 1).should.be.false();
    });
  });

  describe('getRetryDelay', function() {
    let policy;

    beforeEach(function() {
      policy = new RetryPolicy({
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        jitterRatio: 0
      });
    });

    it('should calculate exponential backoff delays', function() {
      policy.getRetryDelay(1).should.be.approximately(1000, 100);   // 1000 * 2^0 ± jitter
      policy.getRetryDelay(2).should.be.approximately(2000, 200);   // 1000 * 2^1 ± jitter  
      policy.getRetryDelay(3).should.be.approximately(4000, 400);   // 1000 * 2^2 ± jitter
      policy.getRetryDelay(4).should.be.approximately(8000, 800);   // 1000 * 2^3 ± jitter
    });

    it('should cap delay at maximum', function() {
      policy = new RetryPolicy({
        baseDelayMs: 1000,
        maxDelayMs: 5000,
        jitterRatio: 0
      });
      
      policy.getRetryDelay(1).should.be.approximately(1000, 100);
      policy.getRetryDelay(2).should.be.approximately(2000, 200);
      policy.getRetryDelay(3).should.be.approximately(4000, 400);
      policy.getRetryDelay(4).should.be.approximately(5000, 500);  // Capped at maxDelayMs
      policy.getRetryDelay(5).should.be.approximately(5000, 500);  // Still capped
    });

    it('should apply jitter', function() {
      policy = new RetryPolicy({
        baseDelayMs: 1000,
        maxDelayMs: 30000,
        jitterRatio: 0.1
      });
      
      // Test multiple times since jitter is random
      const delays = [];
      for (let i = 0; i < 10; i++) {
        delays.push(policy.getRetryDelay(2));
      }
      
      // Should have some variation due to jitter
      const uniqueDelays = [...new Set(delays)];
      uniqueDelays.length.should.be.greaterThan(1);
      
      // All delays should be around 2000ms ± 10%
      delays.forEach(delay => {
        delay.should.be.approximately(2000, 200);
        delay.should.be.greaterThanOrEqual(0);
      });
    });
  });

  describe('delay', function() {
    it('should resolve after the calculated delay', async function() {
      this.timeout(3000);
      
      const policy = new RetryPolicy({
        baseDelayMs: 100,
        jitterRatio: 0
      });
      
      const start = Date.now();
      await policy.delay(1);
      const elapsed = Date.now() - start;
      
      elapsed.should.be.approximately(100, 50);
    });
  });

  describe('_isNetworkError', function() {
    let policy;

    beforeEach(function() {
      policy = new RetryPolicy();
    });

    it('should identify network error codes', function() {
      const networkCodes = ['ECONNREFUSED', 'ECONNRESET', 'ENOTFOUND', 'ETIMEDOUT'];
      
      networkCodes.forEach(code => {
        const error = new Error('Test error');
        error.code = code;
        policy._isNetworkError(error).should.be.true(`Expected ${code} to be identified as network error`);
      });
    });

    it('should identify network error messages', function() {
      let error = new Error('Network Error');
      policy._isNetworkError(error).should.be.true();
      
      error = new Error('No response received from server');
      policy._isNetworkError(error).should.be.true();
    });

    it('should not identify non-network errors', function() {
      const error = new Error('Validation failed');
      error.code = 'VALIDATION_ERROR';
      policy._isNetworkError(error).should.be.false();
    });
  });

  describe('_isTimeoutError', function() {
    let policy;

    beforeEach(function() {
      policy = new RetryPolicy();
    });

    it('should identify timeout error codes', function() {
      const timeoutCodes = ['ETIMEDOUT', 'TIMEOUT'];
      
      timeoutCodes.forEach(code => {
        const error = new Error('Test error');
        error.code = code;
        policy._isTimeoutError(error).should.be.true();
      });
    });

    it('should identify timeout error messages', function() {
      let error = new Error('Request timed out');
      policy._isTimeoutError(error).should.be.true();
      
      error = new Error('Operation timeout occurred');
      policy._isTimeoutError(error).should.be.true();
    });

    it('should not identify non-timeout errors', function() {
      const error = new Error('Validation failed');
      policy._isTimeoutError(error).should.be.false();
    });
  });
});