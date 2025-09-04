/**
 * Test cases for CircuitBreaker class
 */

const should = require('should');
const { CircuitBreaker, CircuitBreakerState } = require('../../utils/circuit-breaker');

describe('CircuitBreaker', function() {
  describe('Constructor', function() {
    it('should create with default configuration', function() {
      const breaker = new CircuitBreaker();
      const stats = breaker.getStats();
      
      stats.state.should.equal(CircuitBreakerState.CLOSED);
      stats.failureCount.should.equal(0);
      stats.failureThreshold.should.equal(5);
      stats.halfOpenMaxCalls.should.equal(3);
    });

    it('should create with custom configuration', function() {
      const breaker = new CircuitBreaker({
        failureThreshold: 10,
        resetTimeoutMs: 30000,
        halfOpenMaxCalls: 1
      });
      
      const stats = breaker.getStats();
      stats.failureThreshold.should.equal(10);
      stats.halfOpenMaxCalls.should.equal(1);
    });
  });

  describe('State Transitions', function() {
    let breaker;

    beforeEach(function() {
      breaker = new CircuitBreaker({
        failureThreshold: 3,
        resetTimeoutMs: 1000,
        halfOpenMaxCalls: 2
      });
    });

    it('should start in closed state', function() {
      breaker.getState().should.equal(CircuitBreakerState.CLOSED);
      breaker.canExecute().should.be.true();
    });

    it('should remain closed after successful calls', function() {
      breaker.onSuccess();
      breaker.onSuccess();
      breaker.onSuccess();
      
      breaker.getState().should.equal(CircuitBreakerState.CLOSED);
      breaker.getStats().failureCount.should.equal(0);
    });

    it('should open after reaching failure threshold', function() {
      breaker.onFailure();
      breaker.getState().should.equal(CircuitBreakerState.CLOSED);
      
      breaker.onFailure();
      breaker.getState().should.equal(CircuitBreakerState.CLOSED);
      
      breaker.onFailure(); // This should trigger the open state
      breaker.getState().should.equal(CircuitBreakerState.OPEN);
      breaker.canExecute().should.be.false();
    });

    it('should reset failure count on success in closed state', function() {
      breaker.onFailure();
      breaker.onFailure();
      breaker.getStats().failureCount.should.equal(2);
      
      breaker.onSuccess();
      breaker.getStats().failureCount.should.equal(0);
      breaker.getState().should.equal(CircuitBreakerState.CLOSED);
    });

    it('should transition to half-open after timeout', function(done) {
      this.timeout(2000);
      
      // Open the circuit
      breaker.onFailure();
      breaker.onFailure();
      breaker.onFailure();
      breaker.getState().should.equal(CircuitBreakerState.OPEN);
      
      // Wait for reset timeout
      setTimeout(() => {
        breaker.canExecute().should.be.true();
        breaker.getState().should.equal(CircuitBreakerState.HALF_OPEN);
        done();
      }, 1100);
    });

    it('should close from half-open after successful calls', function() {
      // Manually transition to half-open
      breaker._transitionToHalfOpen();
      breaker.getState().should.equal(CircuitBreakerState.HALF_OPEN);
      
      breaker.onSuccess();
      breaker.getState().should.equal(CircuitBreakerState.HALF_OPEN);
      
      breaker.onSuccess(); // Second success should close the circuit
      breaker.getState().should.equal(CircuitBreakerState.CLOSED);
    });

    it('should open from half-open on failure', function() {
      // Manually transition to half-open
      breaker._transitionToHalfOpen();
      breaker.getState().should.equal(CircuitBreakerState.HALF_OPEN);
      
      breaker.onFailure();
      breaker.getState().should.equal(CircuitBreakerState.OPEN);
    });
  });

  describe('canExecute', function() {
    let breaker;

    beforeEach(function() {
      breaker = new CircuitBreaker({
        failureThreshold: 2,
        resetTimeoutMs: 1000,
        halfOpenMaxCalls: 2
      });
    });

    it('should allow execution in closed state', function() {
      breaker.canExecute().should.be.true();
    });

    it('should block execution in open state', function() {
      breaker.onFailure();
      breaker.onFailure();
      breaker.getState().should.equal(CircuitBreakerState.OPEN);
      
      breaker.canExecute().should.be.false();
    });

    it('should limit execution in half-open state', function() {
      breaker._transitionToHalfOpen();
      
      breaker.canExecute().should.be.true();
      breaker.halfOpenCallCount++;
      
      breaker.canExecute().should.be.true();
      breaker.halfOpenCallCount++;
      
      breaker.canExecute().should.be.false(); // Exceeds halfOpenMaxCalls
    });
  });

  describe('Error Creation', function() {
    it('should create circuit open error', function() {
      const breaker = new CircuitBreaker();
      breaker._transitionToOpen();
      
      const error = breaker.createCircuitOpenError();
      error.should.be.instanceof(Error);
      error.name.should.equal('CircuitBreakerOpenError');
      error.message.should.containEql('Circuit breaker is open');
      error.circuitBreakerState.should.equal(CircuitBreakerState.OPEN);
      should.exist(error.nextAttemptTime);
    });
  });

  describe('Reset', function() {
    it('should reset circuit breaker to initial state', function() {
      const breaker = new CircuitBreaker({ failureThreshold: 2 });
      
      // Change state
      breaker.onFailure();
      breaker.onFailure();
      breaker.getState().should.equal(CircuitBreakerState.OPEN);
      
      // Reset
      breaker.reset();
      
      const stats = breaker.getStats();
      stats.state.should.equal(CircuitBreakerState.CLOSED);
      stats.failureCount.should.equal(0);
      stats.nextAttemptTime.should.equal(0);
      stats.halfOpenCallCount.should.equal(0);
    });
  });

  describe('Statistics', function() {
    it('should provide complete statistics', function() {
      const breaker = new CircuitBreaker({
        failureThreshold: 5,
        resetTimeoutMs: 60000,
        halfOpenMaxCalls: 3
      });
      
      const stats = breaker.getStats();
      
      should.exist(stats.state);
      should.exist(stats.failureCount);
      should.exist(stats.failureThreshold);
      should.exist(stats.nextAttemptTime);
      should.exist(stats.halfOpenCallCount);
      should.exist(stats.halfOpenMaxCalls);
      
      stats.state.should.equal(CircuitBreakerState.CLOSED);
      stats.failureCount.should.equal(0);
      stats.failureThreshold.should.equal(5);
      stats.halfOpenMaxCalls.should.equal(3);
    });
  });

  describe('Edge Cases', function() {
    it('should handle zero failure threshold', function() {
      const breaker = new CircuitBreaker({ failureThreshold: 0 });
      
      // With threshold 0, any failure should immediately open the circuit
      // But first failure increments count from 0 to 1, which is > 0, so it opens
      breaker.onFailure();
      breaker.getState().should.equal(CircuitBreakerState.OPEN);
    });

    it('should handle multiple consecutive successes', function() {
      const breaker = new CircuitBreaker({ failureThreshold: 3 });
      
      // Build up failures
      breaker.onFailure();
      breaker.onFailure();
      
      // Multiple successes should reset count
      breaker.onSuccess();
      breaker.onSuccess();
      breaker.onSuccess();
      
      breaker.getStats().failureCount.should.equal(0);
      breaker.getState().should.equal(CircuitBreakerState.CLOSED);
    });
  });
});