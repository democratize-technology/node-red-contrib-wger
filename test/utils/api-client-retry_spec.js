/**
 * Test cases for WgerApiClient retry functionality
 */

const should = require('should');
const sinon = require('sinon');

describe('WgerApiClient - Retry Functionality', function() {
  let WgerApiClient;
  let fetchStub;
  let sandbox;

  beforeEach(function() {
    sandbox = sinon.createSandbox();
    fetchStub = sinon.stub();
    
    // Mock fetch globally since it's a native global
    global.fetch = fetchStub;
    
    WgerApiClient = require('../../utils/api-client');
  });

  afterEach(function() {
    sandbox.restore();
    delete global.fetch;
  });

  describe('Constructor with Resilience Configuration', function() {
    it('should create client without resilience configuration', function() {
      const client = new WgerApiClient('https://wger.de', {});
      should.not.exist(client.retryPolicy);
      should.not.exist(client.circuitBreaker);
    });

    it('should create client with retry configuration', function() {
      const client = new WgerApiClient('https://wger.de', {}, {
        retry: { maxAttempts: 5, baseDelayMs: 500 }
      });
      
      should.exist(client.retryPolicy);
      should.not.exist(client.circuitBreaker);
      
      const config = client.retryPolicy.getConfig();
      config.maxAttempts.should.equal(5);
      config.baseDelayMs.should.equal(500);
    });

    it('should create client with circuit breaker configuration', function() {
      const client = new WgerApiClient('https://wger.de', {}, {
        circuitBreaker: { failureThreshold: 10, resetTimeoutMs: 30000 }
      });
      
      should.not.exist(client.retryPolicy);
      should.exist(client.circuitBreaker);
      
      const stats = client.circuitBreaker.getStats();
      stats.failureThreshold.should.equal(10);
    });

    it('should create client with both retry and circuit breaker', function() {
      const client = new WgerApiClient('https://wger.de', {}, {
        retry: { maxAttempts: 3 },
        circuitBreaker: { failureThreshold: 5 }
      });
      
      should.exist(client.retryPolicy);
      should.exist(client.circuitBreaker);
    });
  });

  describe('Retry Logic', function() {
    it('should use original behavior when no resilience configured', async function() {
      const client = new WgerApiClient('https://wger.de', {});
      
      // Mock fetch response
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: sinon.stub().resolves('{"test":"data"}')
      };
      fetchStub.resolves(mockResponse);
      
      const result = await client.get('/api/v2/test');
      result.should.deepEqual({ test: 'data' });
      fetchStub.calledOnce.should.be.true();
    });

    it('should retry on retryable HTTP errors', async function() {
      this.timeout(5000);
      
      const client = new WgerApiClient('https://wger.de', {}, {
        retry: { maxAttempts: 3, baseDelayMs: 100 }
      });
      
      const error503 = {
        response: { 
          status: 503, 
          statusText: 'Service Unavailable',
          data: { detail: 'Service temporarily unavailable' }
        }
      };
      
      fetchStub
        .onFirstCall().rejects(error503)
        .onSecondCall().rejects(error503)
        .onThirdCall().resolves({ data: { success: true } });
      
      const result = await client.get('/api/v2/test');
      result.should.deepEqual({ success: true });
      fetchStub.calledThrice.should.be.true();
    });

    it('should not retry on non-retryable HTTP errors', async function() {
      const client = new WgerApiClient('https://wger.de', {}, {
        retry: { maxAttempts: 3, baseDelayMs: 100 }
      });
      
      const error404 = {
        response: { 
          status: 404, 
          statusText: 'Not Found',
          data: { detail: 'Resource not found' }
        }
      };
      
      fetchStub.rejects(error404);
      
      try {
        await client.get('/api/v2/test');
        should.fail('Should have thrown an error');
      } catch (error) {
        error.status.should.equal(404);
        fetchStub.calledOnce.should.be.true();
      }
    });

    it('should retry on network errors', async function() {
      this.timeout(5000);
      
      const client = new WgerApiClient('https://wger.de', {}, {
        retry: { maxAttempts: 3, baseDelayMs: 100 }
      });
      
      const networkError = new Error('Network Error');
      networkError.code = 'ECONNREFUSED';
      networkError.request = {}; // Indicates network error
      
      fetchStub
        .onFirstCall().rejects(networkError)
        .onSecondCall().rejects(networkError)
        .onThirdCall().resolves({ data: { success: true } });
      
      const result = await client.get('/api/v2/test');
      result.should.deepEqual({ success: true });
      fetchStub.calledThrice.should.be.true();
    });

    it('should give up after max attempts', async function() {
      this.timeout(5000);
      
      const client = new WgerApiClient('https://wger.de', {}, {
        retry: { maxAttempts: 2, baseDelayMs: 100 }
      });
      
      const error503 = {
        response: { 
          status: 503, 
          statusText: 'Service Unavailable',
          data: { detail: 'Service temporarily unavailable' }
        }
      };
      
      fetchStub.rejects(error503);
      
      try {
        await client.get('/api/v2/test');
        should.fail('Should have thrown an error');
      } catch (error) {
        error.status.should.equal(503);
        error.message.should.containEql('failed after 2 attempts');
        error.attemptCount.should.equal(2);
        fetchStub.calledTwice.should.be.true();
      }
    });

    it('should retry rate limit errors (429)', async function() {
      this.timeout(5000);
      
      const client = new WgerApiClient('https://wger.de', {}, {
        retry: { maxAttempts: 3, baseDelayMs: 100 }
      });
      
      const rateLimitError = {
        response: { 
          status: 429, 
          statusText: 'Too Many Requests',
          data: { detail: 'Rate limit exceeded' }
        }
      };
      
      fetchStub
        .onFirstCall().rejects(rateLimitError)
        .onSecondCall().resolves({ data: { success: true } });
      
      const result = await client.get('/api/v2/test');
      result.should.deepEqual({ success: true });
      fetchStub.calledTwice.should.be.true();
    });
  });

  describe('Circuit Breaker Integration', function() {
    it('should open circuit after consecutive failures', async function() {
      const client = new WgerApiClient('https://wger.de', {}, {
        circuitBreaker: { failureThreshold: 3, resetTimeoutMs: 60000 }
      });
      
      const error503 = {
        response: { 
          status: 503, 
          statusText: 'Service Unavailable',
          data: { detail: 'Service temporarily unavailable' }
        }
      };
      
      fetchStub.rejects(error503);
      
      // First 3 failures should open the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await client.get('/api/v2/test');
          should.fail('Should have thrown an error');
        } catch (error) {
          error.status.should.equal(503);
        }
      }
      
      // 4th call should fail immediately with circuit open error
      try {
        await client.get('/api/v2/test');
        should.fail('Should have thrown an error');
      } catch (error) {
        error.name.should.equal('CircuitBreakerOpenError');
        error.message.should.containEql('Circuit breaker is open');
      }
      
      // Should have only made 3 actual HTTP calls
      fetchStub.callCount.should.equal(3);
    });

    it('should reset circuit breaker on successful calls', async function() {
      const client = new WgerApiClient('https://wger.de', {}, {
        circuitBreaker: { failureThreshold: 3, resetTimeoutMs: 60000 }
      });
      
      const error503 = {
        response: { 
          status: 503, 
          statusText: 'Service Unavailable',
          data: { detail: 'Service temporarily unavailable' }
        }
      };
      
      // Fail twice, then succeed
      fetchStub
        .onFirstCall().rejects(error503)
        .onSecondCall().rejects(error503)
        .onThirdCall().resolves({ data: { success: true } });
      
      // Two failures
      try { await client.get('/api/v2/test'); } catch (e) { /* Expected failure */ }
      try { await client.get('/api/v2/test'); } catch (e) { /* Expected failure */ }
      
      // Success should reset failure count
      const result = await client.get('/api/v2/test');
      result.should.deepEqual({ success: true });
      
      // Circuit should still be closed
      client.circuitBreaker.getState().should.equal('closed');
    });
  });

  describe('Combined Retry and Circuit Breaker', function() {
    it('should retry until circuit opens', async function() {
      this.timeout(5000);
      
      const client = new WgerApiClient('https://wger.de', {}, {
        retry: { maxAttempts: 2, baseDelayMs: 50 },
        circuitBreaker: { failureThreshold: 4, resetTimeoutMs: 60000 }
      });
      
      const error503 = {
        response: { 
          status: 503, 
          statusText: 'Service Unavailable',
          data: { detail: 'Service temporarily unavailable' }
        }
      };
      
      fetchStub.rejects(error503);
      
      // First request: 2 attempts (retry enabled)
      try {
        await client.get('/api/v2/test');
        should.fail('Should have thrown an error');
      } catch (error) {
        error.attemptCount.should.equal(2);
      }
      
      // Second request: 2 more attempts = 4 total failures, should open circuit
      try {
        await client.get('/api/v2/test');
        should.fail('Should have thrown an error');
      } catch (error) {
        error.attemptCount.should.equal(2);
      }
      
      // Third request: should fail immediately due to open circuit
      try {
        await client.get('/api/v2/test');
        should.fail('Should have thrown an error');
      } catch (error) {
        error.name.should.equal('CircuitBreakerOpenError');
      }
      
      // Should have made 4 HTTP calls total (2 + 2)
      fetchStub.callCount.should.equal(4);
    });
  });

  describe('Error Enhancement', function() {
    it('should enhance HTTP response errors', async function() {
      const client = new WgerApiClient('https://wger.de', {});
      
      const httpError = new Error('Bad Request');
      httpError.response = {
        status: 400,
        statusText: 'Bad Request',
        data: { detail: 'Validation failed' }
      };
      
      fetchStub.rejects(httpError);
      
      try {
        await client.get('/api/v2/test');
        should.fail('Should have thrown an error');
      } catch (error) {
        error.name.should.equal('HttpResponseError');
        error.status.should.equal(400);
        error.data.should.deepEqual({ detail: 'Validation failed' });
        error.message.should.equal('Validation failed');
      }
    });

    it('should enhance network errors', async function() {
      const client = new WgerApiClient('https://wger.de', {});
      
      const networkError = new Error('Connection failed');
      networkError.code = 'ECONNREFUSED';
      networkError.request = {}; // Indicates network error
      
      fetchStub.rejects(networkError);
      
      try {
        await client.get('/api/v2/test');
        should.fail('Should have thrown an error');
      } catch (error) {
        error.name.should.equal('NetworkError');
        error.code.should.equal('ECONNREFUSED');
        error.message.should.equal('No response received from server');
      }
    });

    it('should preserve request setup errors', async function() {
      const client = new WgerApiClient('https://wger.de', {});
      
      const setupError = new Error('Invalid URL');
      setupError.name = 'TypeError';
      
      fetchStub.rejects(setupError);
      
      try {
        await client.get('/api/v2/test');
        should.fail('Should have thrown an error');
      } catch (error) {
        error.name.should.equal('TypeError');
        error.message.should.equal('Invalid URL');
      }
    });
  });

  describe('Timeout Configuration', function() {
    it('should include timeout in axios config', async function() {
      const client = new WgerApiClient('https://wger.de', {});
      
      fetchStub.resolves({ data: { test: 'data' } });
      
      await client.get('/api/v2/test');
      
      const config = fetchStub.getCall(0).args[0];
      should.exist(config.timeout);
      config.timeout.should.equal(5000); // API.CONNECTION_TIMEOUT from constants
    });
  });
});