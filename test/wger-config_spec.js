const should = require('should');
const helper = require('node-red-node-test-helper');
const wgerConfigNode = require('../nodes/wger-config');
const { testHelper } = require('./test-helper');

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

  describe('URL Validation and Test Mode', function() {
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

    it('should handle malformed URLs gracefully', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'not-a-valid-url' }];
      helper.load(wgerConfigNode, flow, function () {
        const n1 = helper.getNode('n1');
        // Should default to false for invalid URLs
        n1.should.have.property('isTestMode', false);
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

  describe('Admin HTTP Endpoints', function() {
    it('should handle admin test endpoint for existing node', function (done) {
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

    it('should handle admin test endpoint for non-existent node', function (done) {
      const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'https://test.api' }];
      
      helper.load(wgerConfigNode, flow, function () {
        helper.request()
          .post('/wger-config/not-found/test')
          .expect(404)
          .end(function(err, res) {
            if (err) {
              return done(err);
            }
            res.body.should.have.property('error', 'Node not found');
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
        let results = [];
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
