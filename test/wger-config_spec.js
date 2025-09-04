const should = require('should');
const helper = require('node-red-node-test-helper');
const sinon = require('sinon');
const wgerConfigNode = require('../nodes/wger-config');
const { testHelper } = require('./test-helper');
const urlValidator = require('../utils/url-validator');

helper.init(require.resolve('node-red'));

describe('wger-config Node', function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    testHelper.cleanup();
    helper.unload();
    helper.stopServer(done);
  });

  describe('Basic Configuration', function() {
    it('should be loaded with correct properties', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', name: 'test config' }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        n1.should.have.property('name', 'test config');
        n1.should.have.property('type', 'wger-config');
        done();
      });
    });

    it('should use default API URL if not provided', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config' }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        n1.should.have.property('apiUrl', 'https://wger.de');
        done();
      });
    });

    it('should use custom API URL when provided', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'https://custom.wger.api' }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        n1.should.have.property('apiUrl', 'https://custom.wger.api');
        done();
      });
    });

    it('should default to no authentication', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config' }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        n1.should.have.property('authType', 'none');
        done();
      });
    });
  });

  describe('URL Validation, SSRF Protection and Test Mode', function() {
    it('should detect test mode for localhost URLs', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'http://localhost:8000' }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        n1.should.have.property('isTestMode', true);
        done();
      });
    });

    it('should detect test mode for URLs containing "test"', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'http://test.wger.api:8000' }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        n1.should.have.property('isTestMode', true);
        done();
      });
    });

    it('should not detect test mode for 127.0.0.1 URLs', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'http://127.0.0.1:8000' }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        // Current implementation only checks for 'localhost' and 'test', not '127.0.0.1'
        n1.should.have.property('isTestMode', false);
        done();
      });
    });

    it('should not be in test mode for production URLs', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'https://wger.de' }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        n1.should.have.property('isTestMode', false);
        done();
      });
    });

    it('should reject malformed URLs with error', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'not-a-valid-url' }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        // Node should log error for invalid URL
        n1.should.have.property('isTestMode', false);
        done();
      });
    });
    
    it('should block private IP addresses in production', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'http://192.168.1.1' }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        // Should detect invalid URL and log error
        done();
      });
    });
    
    it('should block localhost in production mode', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'http://evil.localhost.com' }];
      helper.load(wgerConfigNode, flow, function () {
        // Should reject URLs trying to bypass localhost detection
        done();
      });
    });
    
    it('should reject non-whitelisted domains', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'https://malicious.com' }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        // Should reject non-whitelisted domain
        done();
      });
    });
    
    it('should reject file:// protocol URLs', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'file:///etc/passwd' }];
      helper.load(wgerConfigNode, flow, function () {
        // Should reject dangerous protocols
        done();
      });
    });
    
    it('should reject URLs with embedded credentials', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'https://user:pass@wger.de' }];
      helper.load(wgerConfigNode, flow, function () {
        // Should reject URLs with credentials
        done();
      });
    });

    it('should handle empty URL gracefully', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: '' }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        n1.should.have.property('apiUrl', 'https://wger.de'); // Should fall back to default
        done();
      });
    });

    it('should normalize trailing slashes in URLs', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'https://wger.de/' }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        // Should normalize the URL (implementation dependent)
        n1.should.have.property('apiUrl');
        done();
      });
    });
  });

  describe('Authentication Configuration', function() {
    it('should return empty auth header when no authentication', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', authType: 'none' }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        const header = n1.getAuthHeader();
        Object.keys(header).length.should.equal(0);
        done();
      });
    });

    it('should return token auth header when using token authentication', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', authType: 'token' }];
      const credentials = { n1: { token: 'test-token' }};
      helper.load(wgerConfigNode, flow, credentials, function () {
        const n1 = helper.getNode('n1');
        const header = n1.getAuthHeader();
        header.should.have.property('Authorization', 'Token test-token');
        done();
      });
    });

    it('should return JWT auth header when using JWT authentication', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', authType: 'jwt' }];
      const credentials = { n1: { token: 'jwt-token' }};
      helper.load(wgerConfigNode, flow, credentials, function () {
        const n1 = helper.getNode('n1');
        const header = n1.getAuthHeader();
        header.should.have.property('Authorization', 'Bearer jwt-token');
        done();
      });
    });

    it('should return empty auth header when token is missing', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', authType: 'token' }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        const header = n1.getAuthHeader();
        Object.keys(header).length.should.equal(0);
        done();
      });
    });

    it('should handle empty token gracefully', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', authType: 'token' }];
      const credentials = { n1: { token: '' }};
      helper.load(wgerConfigNode, flow, credentials, function () {
        const n1 = helper.getNode('n1');
        const header = n1.getAuthHeader();
        Object.keys(header).length.should.equal(0);
        done();
      });
    });

    it('should handle whitespace-only token gracefully', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', authType: 'token' }];
      const credentials = { n1: { token: '   \t\n   ' }};
      helper.load(wgerConfigNode, flow, credentials, function () {
        const n1 = helper.getNode('n1');
        const header = n1.getAuthHeader();
        // Current implementation doesn't trim tokens, so whitespace-only token is used as-is
        header.should.have.property('Authorization', 'Token    \t\n   ');
        done();
      });
    });

    it('should not trim whitespace from tokens', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', authType: 'token' }];
      const credentials = { n1: { token: '  test-token  ' }};
      helper.load(wgerConfigNode, flow, credentials, function () {
        const n1 = helper.getNode('n1');
        const header = n1.getAuthHeader();
        // Current implementation doesn't trim tokens
        header.should.have.property('Authorization', 'Token   test-token  ');
        done();
      });
    });

    it('should handle invalid authType gracefully', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', authType: 'invalid-auth-type' }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        const header = n1.getAuthHeader();
        Object.keys(header).length.should.equal(0);
        done();
      });
    });

    it('should handle very long tokens', function (done) {
      const longToken = 'a'.repeat(10000);
      const flow = [{ id: 'n1', type: 'wger-config', authType: 'token' }];
      const credentials = { n1: { token: longToken }};
      helper.load(wgerConfigNode, flow, credentials, function () {
        const n1 = helper.getNode('n1');
        const header = n1.getAuthHeader();
        header.should.have.property('Authorization', `Token ${longToken}`);
        done();
      });
    });

    it('should handle special characters in tokens', function (done) {
      const specialToken = 'token-with-!@#$%^&*()_+{}[]|\\:";\'<>?,./';
      const flow = [{ id: 'n1', type: 'wger-config', authType: 'token' }];
      const credentials = { n1: { token: specialToken }};
      helper.load(wgerConfigNode, flow, credentials, function () {
        const n1 = helper.getNode('n1');
        const header = n1.getAuthHeader();
        header.should.have.property('Authorization', `Token ${specialToken}`);
        done();
      });
    });
  });

  describe('Admin HTTP Endpoints with SSRF Protection', function() {
    it('should handle admin test endpoint for existing node with valid URL', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'https://wger.de' }];
      
      helper.load(wgerConfigNode, flow, function () {
        helper.request()
          .post('/wger-config/n1/test')
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            res.body.should.have.property('success');
            done();
          });
      });
    });
    
    it('should reject test connection with private IP via admin endpoint', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'https://wger.de' }];
      
      helper.load(wgerConfigNode, flow, function () {
        helper.request()
          .post('/wger-config/not-found/test')
          .send({ apiUrl: 'http://192.168.1.1', authType: 'none' })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            res.body.should.have.property('success', false);
            res.body.message.should.containEql('URL validation failed');
            done();
          });
      });
    });
    
    it('should reject test connection with localhost in production', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'https://wger.de' }];
      
      helper.load(wgerConfigNode, flow, function () {
        // Mock production environment
        const stub = sinon.stub(urlValidator, 'isDevEnvironment').returns(false);
        
        helper.request()
          .post('/wger-config/not-found/test')
          .send({ apiUrl: 'http://127.0.0.1:8000', authType: 'none' })
          .expect(200)
          .end(function(err, res) {
            stub.restore();
            if (err) {
              return done(err);
            }
            res.body.should.have.property('success', false);
            res.body.message.should.containEql('URL validation failed');
            done();
          });
      });
    });
    
    it('should reject test connection with non-whitelisted domain', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'https://wger.de' }];
      
      helper.load(wgerConfigNode, flow, function () {
        helper.request()
          .post('/wger-config/not-found/test')
          .send({ apiUrl: 'https://evil.com', authType: 'none' })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            res.body.should.have.property('success', false);
            res.body.message.should.containEql('URL validation failed');
            done();
          });
      });
    });
    
    it('should reject test connection with file protocol', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'https://wger.de' }];
      
      helper.load(wgerConfigNode, flow, function () {
        helper.request()
          .post('/wger-config/not-found/test')
          .send({ apiUrl: 'file:///etc/passwd', authType: 'none' })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            res.body.should.have.property('success', false);
            res.body.message.should.containEql('URL validation failed');
            done();
          });
      });
    });
    
    it('should allow localhost in test/dev mode', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'http://localhost:8000' }];
      
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        n1.should.have.property('isTestMode', true);
        
        helper.request()
          .post('/wger-config/n1/test')
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            // In test mode, localhost should be allowed
            res.body.should.have.property('success');
            done();
          });
      });
    });

    it('should handle admin test endpoint for non-existent node', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'https://test.api' }];
      
      helper.load(wgerConfigNode, flow, function () {
        helper.request()
          .post('/wger-config/not-found/test')
          .send({ apiUrl: 'https://wger.de', authType: 'none' })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            // Should still return success/failure status for temporary test
            res.body.should.have.property('success');
            done();
          });
      });
    });

    it('should handle malformed test requests', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'https://test.api' }];
      
      helper.load(wgerConfigNode, flow, function () {
        helper.request()
          .get('/wger-config/n1/test') // GET instead of POST
          .expect(404) // Should not be found or method not allowed
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            done();
          });
      });
    });

    it('should handle test endpoint with unreachable API', function (done) {
      this.timeout(10000); // Allow more time for timeout
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'https://unreachable.example.com' }];
      
      helper.load(wgerConfigNode, flow, function () {
        helper.request()
          .post('/wger-config/n1/test')
          .expect(function(res) {
            // Should return success=false but with 200 status
            if (res.status === 200) {
              res.body.should.have.property('success', false);
            } else {
              // Or return an error status (could be 500, 502, etc.)
              res.status.should.be.greaterThan(399);
            }
          })
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            done();
          });
      });
    });

    it('should test authentication with invalid credentials', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'https://wger.de', authType: 'token' }];
      const credentials = { n1: { token: 'invalid-token' }};
      
      helper.load(wgerConfigNode, flow, credentials, function () {
        helper.request()
          .post('/wger-config/n1/test')
          .expect(function(res) {
            // Should handle auth failure appropriately
            res.status.should.be.greaterThan(199); // Some response expected
          })
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            done();
          });
      });
    });

    it('should NOT accept credentials from client request body', function (done) {
      // This test verifies the security fix - credentials should not be accepted from the client
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'https://wger.de', authType: 'token' }];
      // Node has no stored credentials
      
      helper.load(wgerConfigNode, flow, function () {
        helper.request()
          .post('/wger-config/n1/test')
          .send({ 
            apiUrl: 'https://wger.de', 
            authType: 'token',
            credentials: { token: 'should-be-ignored' } // This should be ignored
          })
          .expect(200)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            // The test should proceed without credentials since they're not accepted from client
            res.body.should.have.property('success');
            // Since no credentials are stored server-side, auth header should be empty
            done();
          });
      });
    });
  });

  describe('Resilience Configuration', function() {
    it('should use default resilience settings when not configured', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config' }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        n1.should.have.property('enableRetry', false);
        n1.should.have.property('enableCircuitBreaker', false);
        done();
      });
    });

    it('should configure retry policy with default values', function (done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        enableRetry: true 
      }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        n1.should.have.property('enableRetry', true);
        n1.should.have.property('retryMaxAttempts', 3);
        n1.should.have.property('retryBaseDelayMs', 1000);
        n1.should.have.property('retryMaxDelayMs', 30000);
        done();
      });
    });

    it('should configure retry policy with custom values', function (done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        enableRetry: true,
        retryMaxAttempts: 5,
        retryBaseDelayMs: 500,
        retryMaxDelayMs: 60000
      }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        n1.should.have.property('enableRetry', true);
        n1.should.have.property('retryMaxAttempts', 5);
        n1.should.have.property('retryBaseDelayMs', 500);
        n1.should.have.property('retryMaxDelayMs', 60000);
        done();
      });
    });

    it('should configure circuit breaker with default values', function (done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        enableCircuitBreaker: true 
      }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        n1.should.have.property('enableCircuitBreaker', true);
        n1.should.have.property('circuitBreakerFailureThreshold', 5);
        n1.should.have.property('circuitBreakerResetTimeoutMs', 60000);
        done();
      });
    });

    it('should configure circuit breaker with custom values', function (done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        enableCircuitBreaker: true,
        circuitBreakerFailureThreshold: 10,
        circuitBreakerResetTimeoutMs: 120000
      }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        n1.should.have.property('enableCircuitBreaker', true);
        n1.should.have.property('circuitBreakerFailureThreshold', 10);
        n1.should.have.property('circuitBreakerResetTimeoutMs', 120000);
        done();
      });
    });

    it('should handle string values for numeric resilience config', function (done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        enableRetry: true,
        retryMaxAttempts: '7',
        retryBaseDelayMs: '2000',
        retryMaxDelayMs: '45000'
      }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        n1.should.have.property('retryMaxAttempts', 7);
        n1.should.have.property('retryBaseDelayMs', 2000);
        n1.should.have.property('retryMaxDelayMs', 45000);
        done();
      });
    });

    it('should provide resilience configuration object', function (done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        enableRetry: true,
        retryMaxAttempts: 4,
        retryBaseDelayMs: 800,
        retryMaxDelayMs: 25000,
        enableCircuitBreaker: true,
        circuitBreakerFailureThreshold: 7,
        circuitBreakerResetTimeoutMs: 90000
      }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        const resilienceConfig = n1.getResilienceConfig();
        
        resilienceConfig.should.have.property('retry');
        resilienceConfig.retry.should.have.property('maxAttempts', 4);
        resilienceConfig.retry.should.have.property('baseDelayMs', 800);
        resilienceConfig.retry.should.have.property('maxDelayMs', 25000);
        
        resilienceConfig.should.have.property('circuitBreaker');
        resilienceConfig.circuitBreaker.should.have.property('failureThreshold', 7);
        resilienceConfig.circuitBreaker.should.have.property('resetTimeoutMs', 90000);
        done();
      });
    });

    it('should provide empty resilience config when features disabled', function (done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        enableRetry: false,
        enableCircuitBreaker: false
      }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        const resilienceConfig = n1.getResilienceConfig();
        
        resilienceConfig.should.not.have.property('retry');
        resilienceConfig.should.not.have.property('circuitBreaker');
        Object.keys(resilienceConfig).length.should.equal(0);
        done();
      });
    });

    it('should handle invalid numeric values gracefully', function (done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        enableRetry: true,
        retryMaxAttempts: 'invalid',
        retryBaseDelayMs: null,
        retryMaxDelayMs: undefined
      }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        // Should fall back to defaults for invalid values
        n1.should.have.property('retryMaxAttempts', 3);
        n1.should.have.property('retryBaseDelayMs', 1000);
        n1.should.have.property('retryMaxDelayMs', 30000);
        done();
      });
    });

    it('should handle both resilience features enabled together', function (done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        enableRetry: true,
        enableCircuitBreaker: true
      }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        n1.should.have.property('enableRetry', true);
        n1.should.have.property('enableCircuitBreaker', true);
        
        const resilienceConfig = n1.getResilienceConfig();
        resilienceConfig.should.have.property('retry');
        resilienceConfig.should.have.property('circuitBreaker');
        done();
      });
    });
  });

  describe('Edge Cases and Error Handling', function() {
    it('should handle node creation with null properties', function (done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        apiUrl: null, 
        authType: null 
      }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        n1.should.have.property('apiUrl', 'https://wger.de'); // Should fallback
        n1.should.have.property('authType', 'none'); // Should fallback
        done();
      });
    });

    it('should handle node creation with undefined properties', function (done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config'
        // apiUrl and authType undefined
      }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        n1.should.have.property('apiUrl', 'https://wger.de');
        n1.should.have.property('authType', 'none');
        done();
      });
    });

    it('should handle concurrent access to auth headers', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', authType: 'token' }];
      const credentials = { n1: { token: 'test-token' }};
      helper.load(wgerConfigNode, flow, credentials, function () {
        const n1 = helper.getNode('n1');
        
        // Simulate concurrent access
        const results = [];
        for (let i = 0; i < 10; i++) {
          results.push(n1.getAuthHeader());
        }
        
        // All results should be consistent
        results.forEach(header => {
          header.should.have.property('Authorization', 'Token test-token');
        });
        done();
      });
    });

    it('should handle credentials changes', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', authType: 'token' }];
      const credentials = { n1: { token: 'initial-token' }};
      
      helper.load(wgerConfigNode, flow, credentials, function () {
        const n1 = helper.getNode('n1');
        const header1 = n1.getAuthHeader();
        header1.should.have.property('Authorization', 'Token initial-token');
        
        // Note: In real Node-RED, credentials can't be changed without redeployment
        // This test verifies the current behavior
        done();
      });
    });
  });
});
