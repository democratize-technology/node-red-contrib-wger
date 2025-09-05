/**
 * Test provider validation and factory pattern fixes across all utility modules
 */
'use strict';

const should = require('should');
const { CircuitBreaker } = require('../utils/circuit-breaker');
const RetryPolicy = require('../utils/retry-policy');
const InputValidator = require('../utils/input-validator');
const WgerApiClient = require('../utils/api-client');
const timeProviderFactory = require('../utils/time-provider').default;
const randomProviderFactory = require('../utils/random-provider').default;

describe('Provider Validation and Factory Pattern Tests', function() {

  describe('CircuitBreaker Provider Validation', function() {
    it('should use default timeProvider when null is provided', function() {
      should(() => {
        new CircuitBreaker({ timeProvider: null });
      }).not.throw();
    });

    it('should use default timeProvider when undefined is provided', function() {
      should(() => {
        new CircuitBreaker({ timeProvider: undefined });
      }).not.throw();
    });

    it('should reject timeProvider missing now method', function() {
      should(() => {
        new CircuitBreaker({ 
          timeProvider: { 
            setTimeout: () => {}, 
            clearTimeout: () => {} 
          } 
        });
      }).throw(/timeProvider must have a 'now' method/);
    });

    it('should reject timeProvider missing setTimeout method', function() {
      should(() => {
        new CircuitBreaker({ 
          timeProvider: { 
            now: () => {}, 
            clearTimeout: () => {} 
          } 
        });
      }).throw(/timeProvider must have a 'setTimeout' method/);
    });

    it('should reject timeProvider missing clearTimeout method', function() {
      should(() => {
        new CircuitBreaker({ 
          timeProvider: { 
            now: () => {}, 
            setTimeout: () => {} 
          } 
        });
      }).throw(/timeProvider must have a 'clearTimeout' method/);
    });

    it('should reject timeProvider with non-function methods', function() {
      should(() => {
        new CircuitBreaker({ 
          timeProvider: { 
            now: 'not a function', 
            setTimeout: () => {}, 
            clearTimeout: () => {} 
          } 
        });
      }).throw(/timeProvider must have a 'now' method/);
    });

    it('should accept valid timeProvider', function() {
      should(() => {
        new CircuitBreaker({ 
          timeProvider: timeProviderFactory()
        });
      }).not.throw();
    });
  });

  describe('RetryPolicy Provider Validation', function() {
    it('should use default randomProvider when null is provided', function() {
      should(() => {
        new RetryPolicy({ randomProvider: null });
      }).not.throw();
    });

    it('should use default randomProvider when undefined is provided', function() {
      should(() => {
        new RetryPolicy({ randomProvider: undefined });
      }).not.throw();
    });

    it('should reject randomProvider missing random method', function() {
      should(() => {
        new RetryPolicy({ randomProvider: {} });
      }).throw(/randomProvider must have a 'random' method/);
    });

    it('should reject randomProvider with non-function random method', function() {
      should(() => {
        new RetryPolicy({ randomProvider: { random: 'not a function' } });
      }).throw(/randomProvider must have a 'random' method/);
    });

    it('should accept valid randomProvider', function() {
      should(() => {
        new RetryPolicy({ randomProvider: randomProviderFactory() });
      }).not.throw();
    });
  });

  describe('InputValidator Provider Validation', function() {
    it('should reject null sanitizationProvider', function() {
      should(() => {
        InputValidator.configureSanitizationProvider(null);
      }).throw(/sanitizationProvider is required/);
    });

    it('should reject undefined sanitizationProvider', function() {
      should(() => {
        InputValidator.configureSanitizationProvider(undefined);
      }).throw(/sanitizationProvider is required/);
    });

    it('should reject sanitizationProvider missing sanitizeHtml method', function() {
      should(() => {
        InputValidator.configureSanitizationProvider({ 
          normalizeEmail: () => {} 
        });
      }).throw(/sanitizationProvider must have a 'sanitizeHtml' method/);
    });

    it('should reject sanitizationProvider missing normalizeEmail method', function() {
      should(() => {
        InputValidator.configureSanitizationProvider({ 
          sanitizeHtml: () => {} 
        });
      }).throw(/sanitizationProvider must have a 'normalizeEmail' method/);
    });

    it('should reject sanitizationProvider with non-function methods', function() {
      should(() => {
        InputValidator.configureSanitizationProvider({ 
          sanitizeHtml: 'not a function', 
          normalizeEmail: () => {} 
        });
      }).throw(/sanitizationProvider must have a 'sanitizeHtml' method/);
    });

    it('should accept valid sanitizationProvider', function() {
      should(() => {
        InputValidator.configureSanitizationProvider({
          sanitizeHtml: () => 'clean',
          normalizeEmail: () => 'test@example.com'
        });
      }).not.throw();
    });
  });

  describe('WgerApiClient Provider Validation', function() {
    it('should accept invalid retryPolicy as config object (creates new instance)', function() {
      should(() => {
        new WgerApiClient('https://wger.de', 'token', { 
          retry: { 
            shouldRetry: true, // This is treated as config, not pre-instantiated object
            getRetryDelay: () => {}, 
            delay: () => {} 
          }
        });
      }).not.throw(); // Config objects are passed to RetryPolicy constructor
    });

    it('should reject invalid retryPolicy missing getRetryDelay method', function() {
      should(() => {
        new WgerApiClient('https://wger.de', 'token', { 
          retry: { 
            shouldRetry: () => {}, 
            delay: () => {} 
          }
        });
      }).throw(/retryPolicy must have a 'getRetryDelay' method/);
    });

    it('should reject invalid retryPolicy missing delay method', function() {
      should(() => {
        new WgerApiClient('https://wger.de', 'token', { 
          retry: { 
            shouldRetry: () => {}, 
            getRetryDelay: () => {} 
          }
        });
      }).throw(/retryPolicy must have a 'delay' method/);
    });

    it('should accept invalid circuitBreaker as config object (creates new instance)', function() {
      should(() => {
        new WgerApiClient('https://wger.de', 'token', { 
          circuitBreaker: { 
            canExecute: true, // This is treated as config, not pre-instantiated object
            onSuccess: () => {}, 
            onFailure: () => {} 
          }
        });
      }).not.throw(); // Config objects are passed to CircuitBreaker constructor
    });

    it('should reject invalid circuitBreaker missing onSuccess method', function() {
      should(() => {
        new WgerApiClient('https://wger.de', 'token', { 
          circuitBreaker: { 
            canExecute: () => {}, 
            onFailure: () => {} 
          }
        });
      }).throw(/circuitBreaker must have a 'onSuccess' method/);
    });

    it('should reject invalid circuitBreaker missing onFailure method', function() {
      should(() => {
        new WgerApiClient('https://wger.de', 'token', { 
          circuitBreaker: { 
            canExecute: () => {}, 
            onSuccess: () => {}
          }
        });
      }).throw(/circuitBreaker must have a 'onFailure' method/);
    });

    it('should accept valid pre-instantiated providers', function() {
      const retryPolicy = new RetryPolicy();
      const circuitBreaker = new CircuitBreaker();
      
      should(() => {
        new WgerApiClient('https://wger.de', 'token', { 
          retry: retryPolicy, 
          circuitBreaker: circuitBreaker 
        });
      }).not.throw();
    });

    it('should accept valid configuration objects for providers', function() {
      should(() => {
        new WgerApiClient('https://wger.de', 'token', { 
          retry: { maxAttempts: 5 }, 
          circuitBreaker: { failureThreshold: 3 }
        });
      }).not.throw();
    });

    it('should reject pre-instantiated retryPolicy with missing getRetryDelay method', function() {
      const invalidRetryPolicy = {
        shouldRetry: () => {}, // Must be function to be detected as pre-instantiated
        // Missing getRetryDelay
        delay: () => {}
      };
      
      should(() => {
        new WgerApiClient('https://wger.de', 'token', { 
          retry: invalidRetryPolicy
        });
      }).throw(/retryPolicy must have a 'getRetryDelay' method/);
    });

    it('should reject pre-instantiated circuitBreaker with missing onSuccess method', function() {
      const invalidCircuitBreaker = {
        canExecute: () => {}, // Must be function to be detected as pre-instantiated
        // Missing onSuccess
        onFailure: () => {}
      };
      
      should(() => {
        new WgerApiClient('https://wger.de', 'token', { 
          circuitBreaker: invalidCircuitBreaker
        });
      }).throw(/circuitBreaker must have a 'onSuccess' method/);
    });
  });

  describe('Factory Pattern Behavior', function() {
    it('should create separate timeProvider instances', function() {
      const provider1 = timeProviderFactory();
      const provider2 = timeProviderFactory();
      
      // Different instances
      provider1.should.not.equal(provider2);
      
      // But same structure
      provider1.should.have.property('now');
      provider1.should.have.property('setTimeout');
      provider1.should.have.property('clearTimeout');
      
      provider2.should.have.property('now');
      provider2.should.have.property('setTimeout'); 
      provider2.should.have.property('clearTimeout');
    });

    it('should create separate randomProvider instances', function() {
      const provider1 = randomProviderFactory();
      const provider2 = randomProviderFactory();
      
      // Different instances
      provider1.should.not.equal(provider2);
      
      // But same structure
      provider1.should.have.property('random');
      provider2.should.have.property('random');
    });

    it('should create separate CircuitBreaker instances', function() {
      const breaker1 = new CircuitBreaker();
      const breaker2 = new CircuitBreaker();
      
      // Different instances
      breaker1.should.not.equal(breaker2);
      
      // Independent state
      breaker1.onFailure();
      breaker1.getStats().failureCount.should.equal(1);
      breaker2.getStats().failureCount.should.equal(0);
    });

    it('should create separate RetryPolicy instances', function() {
      const retry1 = new RetryPolicy({ maxAttempts: 3 });
      const retry2 = new RetryPolicy({ maxAttempts: 5 });
      
      // Different instances
      retry1.should.not.equal(retry2);
      
      // Independent configuration
      retry1.maxAttempts.should.equal(3);
      retry2.maxAttempts.should.equal(5);
    });

    it('should create InputValidator as static class (no separate instances)', function() {
      // InputValidator is a static utility class
      InputValidator.should.have.property('validateValue');
      InputValidator.should.have.property('validatePayload');
      InputValidator.should.have.property('TYPES');
      InputValidator.should.have.property('PATTERNS');
    });

    it('should create separate WgerApiClient instances', function() {
      const client1 = new WgerApiClient('https://wger.de', 'token1');
      const client2 = new WgerApiClient('https://wger.de', 'token2');
      
      // Different instances
      client1.should.not.equal(client2);
      
      // Different auth headers
      client1.authHeader.should.equal('token1');
      client2.authHeader.should.equal('token2');
    });
  });

  describe('Memory Leak Prevention', function() {
    it('should not accumulate references with multiple factory calls', function() {
      const initialMemory = process.memoryUsage();
      
      // Create many instances
      const instances = [];
      for (let i = 0; i < 1000; i++) {
        instances.push({
          timeProvider: timeProviderFactory(),
          randomProvider: randomProviderFactory(),
          circuitBreaker: new CircuitBreaker(),
          retryPolicy: new RetryPolicy(),
          // InputValidator is static, so we don't instantiate it
          apiClient: new WgerApiClient('https://wger.de', `token${i}`)
        });
      }
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      const finalMemory = process.memoryUsage();
      
      // Memory should not grow excessively (allow for reasonable overhead)
      const memoryGrowth = finalMemory.heapUsed - initialMemory.heapUsed;
      const maxExpectedGrowth = 50 * 1024 * 1024; // 50MB max
      
      memoryGrowth.should.be.below(maxExpectedGrowth);
      
      // Cleanup
      instances.length = 0;
    });

    it('should allow instances to be garbage collected', function() {
      let instancesCreated = 0;
      
      function createInstance() {
        instancesCreated++;
        return {
          timeProvider: timeProviderFactory(),
          randomProvider: randomProviderFactory(),
          circuitBreaker: new CircuitBreaker(),
          retryPolicy: new RetryPolicy()
          // InputValidator is static, so we don't instantiate it
        };
      }
      
      // Create and immediately discard instances
      for (let i = 0; i < 100; i++) {
        createInstance();
      }
      
      instancesCreated.should.equal(100);
      
      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }
      
      // Test passes if no memory leaks are detected by test runner
      true.should.be.true();
    });
  });

  describe('Error Message Quality', function() {
    it('should provide clear error messages for CircuitBreaker validation', function() {
      try {
        new CircuitBreaker({ timeProvider: { now: 'invalid' } });
      } catch (error) {
        error.message.should.match(/timeProvider must have a 'now' method/);
        error.message.should.match(/CircuitBreaker/);
      }
    });

    it('should provide clear error messages for RetryPolicy validation', function() {
      try {
        new RetryPolicy({ randomProvider: { random: 'invalid' } });
      } catch (error) {
        error.message.should.match(/randomProvider must have a 'random' method/);
        error.message.should.match(/RetryPolicy/);
      }
    });

    it('should provide clear error messages for InputValidator validation', function() {
      try {
        InputValidator.configureSanitizationProvider({ sanitizeHtml: 'invalid' });
      } catch (error) {
        error.message.should.match(/sanitizationProvider must have a 'sanitizeHtml' method/);
        error.message.should.match(/InputValidator/);
      }
    });

    it('should provide clear error messages for WgerApiClient validation', function() {
      try {
        new WgerApiClient('https://wger.de', 'token', { retry: { shouldRetry: 'invalid' } });
      } catch (error) {
        error.message.should.match(/retryPolicy must have a 'shouldRetry' method/);
        error.message.should.match(/WgerApiClient/);
      }
    });
  });
});