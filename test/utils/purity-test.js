/**
 * Test suite to verify that refactored functions are pure and work with dependency injection
 */

const should = require('should');
const { CircuitBreaker } = require('../../utils/circuit-breaker');
const RetryPolicy = require('../../utils/retry-policy');
const WgerApiClient = require('../../utils/api-client');
const InputValidator = require('../../utils/input-validator');
const { MockTimeProvider } = require('../../utils/time-provider');
const { MockRandomProvider } = require('../../utils/random-provider');
const { MockSanitizationProvider } = require('../../utils/sanitization-provider');

describe('Purity Tests - Dependency Injection Verification', function() {
  
  describe('CircuitBreaker with MockTimeProvider', function() {
    it('should produce deterministic behavior with mock time provider', function() {
      const mockTime = new MockTimeProvider();
      mockTime.setTime(1000);

      const breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeoutMs: 5000,
        timeProvider: mockTime
      });

      // Initial state should be closed
      breaker.getState().should.equal('closed');

      // Simulate failures
      breaker.onFailure();
      breaker.onFailure();

      // Should be open now
      breaker.getState().should.equal('open');
      breaker.getStats().nextAttemptTime.should.equal(6000); // 1000 + 5000

      // Advance time but not enough
      mockTime.setTime(4000);
      breaker.canExecute().should.be.false();

      // Advance time past reset timeout
      mockTime.setTime(6000);
      breaker.canExecute().should.be.true();
      breaker.getState().should.equal('half-open');
    });

    it('should be repeatable with same time sequence', function() {
      const mockTime1 = new MockTimeProvider();
      const mockTime2 = new MockTimeProvider();
      
      mockTime1.setTime(2000);
      mockTime2.setTime(2000);

      const breaker1 = new CircuitBreaker({ timeProvider: mockTime1 });
      const breaker2 = new CircuitBreaker({ timeProvider: mockTime2 });

      // Same operations should produce same results
      breaker1.onFailure();
      breaker2.onFailure();

      breaker1.getStats().should.deepEqual(breaker2.getStats());
    });
  });

  describe('RetryPolicy with MockRandomProvider', function() {
    it('should produce deterministic jitter with seeded random', function() {
      const mockRandom = new MockRandomProvider();
      mockRandom.setValues([0.5, 0.3, 0.8]); // Predictable sequence

      const policy = new RetryPolicy({
        baseDelayMs: 1000,
        jitterRatio: 0.1,
        randomProvider: mockRandom
      });

      const delay1 = policy.getRetryDelay(1);
      mockRandom.reset(); // Reset to beginning of sequence
      const delay2 = policy.getRetryDelay(1);

      delay1.should.equal(delay2); // Should be identical with same random sequence
    });

    it('should produce different results with different random sequences', function() {
      const mockRandom1 = new MockRandomProvider();
      const mockRandom2 = new MockRandomProvider();
      
      mockRandom1.setValues([0.1]);
      mockRandom2.setValues([0.9]);

      const policy1 = new RetryPolicy({ randomProvider: mockRandom1, jitterRatio: 0.2 });
      const policy2 = new RetryPolicy({ randomProvider: mockRandom2, jitterRatio: 0.2 });

      const delay1 = policy1.getRetryDelay(1);
      const delay2 = policy2.getRetryDelay(1);

      delay1.should.not.equal(delay2); // Should be different with different random values
    });
  });

  describe('InputValidator with MockSanitizationProvider', function() {
    beforeEach(function() {
      // Reset to default provider after each test
      InputValidator.configureSanitizationProvider(require('../../utils/sanitization-provider').default());
    });

    it('should use injected sanitization provider', function() {
      const mockSanitizer = new MockSanitizationProvider();
      mockSanitizer.setHtmlResult('<script>alert("xss")</script>test', 'SANITIZED_HTML');
      mockSanitizer.setEmailResult('Test@EXAMPLE.COM', 'test@example.com');

      InputValidator.configureSanitizationProvider(mockSanitizer);

      // Test HTML sanitization
      const sanitized = InputValidator.sanitizeString('<script>alert("xss")</script>test');
      sanitized.should.equal('SANITIZED_HTML');

      // Test email normalization
      const emailSchema = { type: InputValidator.TYPES.EMAIL, required: true };
      const validatedEmail = InputValidator.validateValue('Test@EXAMPLE.COM', emailSchema, 'email');
      validatedEmail.should.equal('test@example.com');
    });

    it('should be testable by controlling sanitization behavior', function() {
      const mockSanitizer = new MockSanitizationProvider();
      
      // Set up specific test expectations
      mockSanitizer.setHtmlResult('dangerous<script>', 'safe');
      mockSanitizer.setEmailResult('UPPER@CASE.COM', 'lower@case.com');

      InputValidator.configureSanitizationProvider(mockSanitizer);

      // Test that our mock controls the behavior
      InputValidator.sanitizeString('dangerous<script>').should.equal('safe');
      
      const emailResult = InputValidator.validateValue(
        'UPPER@CASE.COM', 
        { type: InputValidator.TYPES.EMAIL, required: true }, 
        'testEmail'
      );
      emailResult.should.equal('lower@case.com');

      // Verify mock was used
      mockSanitizer.getResultCounts().html.should.equal(1);
      mockSanitizer.getResultCounts().email.should.equal(1);
    });
  });

  describe('Combined Dependency Injection', function() {
    it('should work with multiple injected dependencies together', function() {
      const mockTime = new MockTimeProvider();
      const mockRandom = new MockRandomProvider();
      const mockSanitizer = new MockSanitizationProvider();

      mockTime.setTime(5000);
      mockRandom.setValues([0.5]);
      mockSanitizer.setHtmlResult('test', 'sanitized_test');

      // Configure all providers
      InputValidator.configureSanitizationProvider(mockSanitizer);

      const apiClient = new WgerApiClient('https://example.com', {}, {
        timeProvider: mockTime,
        retry: {
          maxAttempts: 3,
          randomProvider: mockRandom,
          timeProvider: mockTime
        },
        circuitBreaker: {
          failureThreshold: 2,
          timeProvider: mockTime
        }
      });

      // Test that dependencies are properly injected
      apiClient.timeProvider.now().should.equal(5000);
      apiClient.retryPolicy.timeProvider.now().should.equal(5000);
      apiClient.circuitBreaker.timeProvider.now().should.equal(5000);
      apiClient.retryPolicy.randomProvider.random().should.equal(0.5);

      // Test sanitization
      InputValidator.sanitizeString('test').should.equal('sanitized_test');
    });
  });

  describe('Purity Verification', function() {
    it('should demonstrate that functions are pure through reproducible results', function() {
      // Create identical configurations
      const mockTime1 = new MockTimeProvider();
      const mockTime2 = new MockTimeProvider();
      const mockRandom1 = new MockRandomProvider();
      const mockRandom2 = new MockRandomProvider();

      // Set identical initial states
      mockTime1.setTime(1000);
      mockTime2.setTime(1000);
      mockRandom1.setValues([0.3, 0.7, 0.1]);
      mockRandom2.setValues([0.3, 0.7, 0.1]);

      // Create identical policies
      const policy1 = new RetryPolicy({
        baseDelayMs: 1000,
        jitterRatio: 0.1,
        timeProvider: mockTime1,
        randomProvider: mockRandom1
      });

      const policy2 = new RetryPolicy({
        baseDelayMs: 1000,
        jitterRatio: 0.1,
        timeProvider: mockTime2,
        randomProvider: mockRandom2
      });

      // Same operations should produce same results (demonstrating purity)
      const delay1a = policy1.getRetryDelay(1);
      const delay1b = policy1.getRetryDelay(2);
      
      const delay2a = policy2.getRetryDelay(1);
      const delay2b = policy2.getRetryDelay(2);

      delay1a.should.equal(delay2a);
      delay1b.should.equal(delay2b);

      // Demonstrate that the functions are deterministic
      mockRandom1.reset();
      mockRandom2.reset();
      
      const delayRepeat1 = policy1.getRetryDelay(1);
      const delayRepeat2 = policy2.getRetryDelay(1);

      delayRepeat1.should.equal(delay1a);
      delayRepeat2.should.equal(delay2a);
    });

    it('should demonstrate no hidden dependencies on global state', function() {
      // Test that functions don't depend on Date.now(), Math.random(), or other global state
      const originalDateNow = Date.now;
      const originalMathRandom = Math.random;

      try {
        // Replace global functions to detect impure usage
        Date.now = () => { throw new Error('Impure Date.now() usage detected!'); };
        Math.random = () => { throw new Error('Impure Math.random() usage detected!'); };

        // Create instances with injected dependencies
        const mockTime = new MockTimeProvider();
        const mockRandom = new MockRandomProvider();
        mockTime.setTime(12345);
        mockRandom.setValues([0.42]);

        const breaker = new CircuitBreaker({ timeProvider: mockTime });
        const policy = new RetryPolicy({ randomProvider: mockRandom, timeProvider: mockTime });

        // These should not throw errors if they're pure
        (() => {
          breaker.canExecute();
          breaker.onFailure();
          policy.getRetryDelay(1);
        }).should.not.throw();

      } finally {
        // Restore global functions
        Date.now = originalDateNow;
        Math.random = originalMathRandom;
      }
    });
  });

  afterEach(function() {
    // Clean up any test resources
    try {
      InputValidator.getSanitizationProvider().cleanup?.();
    } catch (e) {
      // Ignore cleanup errors
    }
  });
});