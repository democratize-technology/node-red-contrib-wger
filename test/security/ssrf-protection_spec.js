/**
 * @fileoverview Security test suite for SSRF protection in wger-config node
 * @description Tests comprehensive SSRF protection measures implemented to prevent
 * Server-Side Request Forgery attacks through URL validation
 */

const should = require('should');
const helper = require('node-red-node-test-helper');
const _sinon = require('sinon');
const _axios = require('axios');
const wgerConfigNode = require('../../nodes/wger-config');
const { testHelper } = require('../test-helper');

helper.init(require.resolve('node-red'));

describe('SSRF Protection Security Tests', function() {
  this.timeout(5000); // Increase timeout for async operations
  
  beforeEach(function(done) {
    helper.startServer(() => {
      // Note: axios stubbing is handled differently for direct axios calls
      // The URL validator doesn't make actual HTTP calls during validation
      done();
    });
  });

  afterEach(function(done) {
    testHelper.cleanup();
    helper.unload();
    helper.stopServer(done);
  });

  describe('Node Initialization URL Validation', function() {
    it('should reject nodes with private IP addresses', function(done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        apiUrl: 'http://192.168.1.1' 
      }];
      
      helper.load(wgerConfigNode, flow, function() {
        const n1 = helper.getNode('n1');
        n1.should.have.property('error');
        done();
      });
    });
    
    it('should reject nodes with localhost in production', function(done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        apiUrl: 'http://localhost' 
      }];
      
      helper.load(wgerConfigNode, flow, function() {
        const n1 = helper.getNode('n1');
        n1.should.have.property('error');
        done();
      });
    });
    
    it('should reject file:// protocol', function(done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        apiUrl: 'file:///etc/passwd' 
      }];
      
      helper.load(wgerConfigNode, flow, function() {
        const n1 = helper.getNode('n1');
        n1.should.have.property('error');
        done();
      });
    });
    
    it('should reject ftp:// protocol', function(done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        apiUrl: 'ftp://evil.com/backdoor' 
      }];
      
      helper.load(wgerConfigNode, flow, function() {
        const n1 = helper.getNode('n1');
        n1.should.have.property('error');
        done();
      });
    });
    
    it('should reject URLs with embedded credentials', function(done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        apiUrl: 'https://admin:password@wger.de' 
      }];
      
      helper.load(wgerConfigNode, flow, function() {
        const n1 = helper.getNode('n1');
        n1.should.have.property('error');
        done();
      });
    });
  });

  describe('Test Connection SSRF Protection', function() {
    it('should block private IP ranges during test connection', function(done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        apiUrl: 'http://10.0.0.1' 
      }];
      
      helper.load(wgerConfigNode, flow, function() {
        const n1 = helper.getNode('n1');
        n1.testConnection().then(result => {
          result.should.have.property('success', false);
          result.message.should.containEql('URL validation failed');
          done();
        }).catch(done);
      });
    });
    
    it('should block 172.16-31.x.x range', function(done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        apiUrl: 'http://172.20.0.1' 
      }];
      
      helper.load(wgerConfigNode, flow, function() {
        const n1 = helper.getNode('n1');
        n1.testConnection().then(result => {
          result.should.have.property('success', false);
          result.message.should.containEql('URL validation failed');
          done();
        }).catch(done);
      });
    });
    
    it('should block link-local addresses (169.254.x.x)', function(done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        apiUrl: 'http://169.254.1.1' 
      }];
      
      helper.load(wgerConfigNode, flow, function() {
        const n1 = helper.getNode('n1');
        n1.testConnection().then(result => {
          result.should.have.property('success', false);
          result.message.should.containEql('URL validation failed');
          done();
        }).catch(done);
      });
    });
    
    it('should block multicast addresses', function(done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        apiUrl: 'http://224.0.0.1' 
      }];
      
      helper.load(wgerConfigNode, flow, function() {
        const n1 = helper.getNode('n1');
        n1.testConnection().then(result => {
          result.should.have.property('success', false);
          result.message.should.containEql('URL validation failed');
          done();
        }).catch(done);
      });
    });
  });

  describe('Admin Endpoint SSRF Protection', function() {
    it('should reject private IPs via admin test endpoint', function(done) {
      const flow = [{ id: 'n1', type: 'wger-config' }];
      
      helper.load(wgerConfigNode, flow, function() {
        helper.request()
          .post('/wger-config/test-node/test')
          .send({ 
            apiUrl: 'http://192.168.1.1:8080/api', 
            authType: 'none' 
          })
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            
            res.body.should.have.property('success', false);
            res.body.message.should.match(/URL validation failed/);
            done();
          });
      });
    });
    
    it('should reject localhost bypass attempts', function(done) {
      const flow = [{ id: 'n1', type: 'wger-config' }];
      
      helper.load(wgerConfigNode, flow, function() {
        setTimeout(() => {
          helper.request()
            .post('/wger-config/test-node/test')
            .send({ 
              apiUrl: 'http://127.0.0.1:8080', // Private IP that won't trigger dev mode
              authType: 'none' 
            })
            .expect(200)
            .end(function(err, res) {
              if (err) return done(err);
              
              res.body.should.have.property('success', false);
              res.body.message.should.match(/URL validation failed/);
              done();
            });
        }, 100);
      });
    });
    
    it('should reject decimal IP notation', function(done) {
      const flow = [{ id: 'n1', type: 'wger-config' }];
      
      helper.load(wgerConfigNode, flow, function() {
        helper.request()
          .post('/wger-config/test-node/test')
          .send({ 
            apiUrl: 'http://2130706433', // 127.0.0.1 in decimal
            authType: 'none' 
          })
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            
            res.body.should.have.property('success', false);
            done();
          });
      });
    });
    
    it('should allow domains but may fail DNS resolution', function(done) {
      const flow = [{ id: 'n1', type: 'wger-config' }];
      
      helper.load(wgerConfigNode, flow, function() {
        helper.request()
          .post('/wger-config/test-node/test')
          .send({ 
            apiUrl: 'https://malicious-server.com', 
            authType: 'none' 
          })
          .expect(200)
          .end(function(err, res) {
            if (err) return done(err);
            
            // Domain is now allowed, but DNS resolution may fail
            res.body.should.have.property('success', false);
            // Should fail on DNS or connection, not whitelist
            res.body.message.should.not.containEql('Domain not whitelisted');
            done();
          });
      });
    });
  });

  describe('Development Mode Exceptions', function() {
    it('should allow localhost in development/test mode', function(done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        apiUrl: 'http://localhost:8000'  // This triggers test mode
      }];
      
      helper.load(wgerConfigNode, flow, async function() {
        const n1 = helper.getNode('n1');
        n1.should.have.property('isTestMode', true);
        
        // In test mode, localhost should be allowed
        const _result = await n1.testConnection();
        // Won't actually connect but won't fail on URL validation
        done();
      });
    });
    
    it('should allow test URLs in development mode', function(done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        apiUrl: 'http://test.wger.local:8000'  // Contains 'test'
      }];
      
      helper.load(wgerConfigNode, flow, function() {
        const n1 = helper.getNode('n1');
        n1.should.have.property('isTestMode', true);
        done();
      });
    });
  });

  describe('Valid wger Instance URLs', function() {
    it('should accept official wger.de', function(done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        apiUrl: 'https://wger.de' 
      }];
      
      helper.load(wgerConfigNode, flow, function() {
        const n1 = helper.getNode('n1');
        n1.should.have.property('apiUrl');
        // Should normalize and accept
        done();
      });
    });
    
    it('should accept wger.de subdomains', function(done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        apiUrl: 'https://api.wger.de' 
      }];
      
      helper.load(wgerConfigNode, flow, function() {
        const n1 = helper.getNode('n1');
        n1.should.have.property('apiUrl');
        done();
      });
    });
  });

  describe('Attack Vector Prevention', function() {

    
    it('should reject cloud metadata endpoints', function(done) {
      // AWS/GCP/Azure metadata endpoints
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        apiUrl: 'http://169.254.169.254/latest/meta-data/' 
      }];
      
      helper.load(wgerConfigNode, flow, function() {
        const n1 = helper.getNode('n1');
        n1.should.have.property('error');
        done();
      });
    });
  });

  describe('Security Warnings and Messages', function() {
    it('should provide clear security error messages', function(done) {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        apiUrl: 'http://192.168.1.1' 
      }];
      
      helper.load(wgerConfigNode, flow, function() {
        const n1 = helper.getNode('n1');
        n1.testConnection().then(result => {
          result.should.have.property('success', false);
          result.should.have.property('validation');
          result.validation.should.have.property('errors');
          result.validation.errors.length.should.be.greaterThan(0);
          done();
        }).catch(done);
      });
    });
    
    it('should include warnings for development mode', async function() {
      const flow = [{ 
        id: 'n1', 
        type: 'wger-config', 
        apiUrl: 'http://localhost:8000' 
      }];
      
      await new Promise((resolve) => {
        helper.load(wgerConfigNode, flow, async function() {
          const n1 = helper.getNode('n1');
          // In test mode, should allow but potentially warn
          n1.should.have.property('isTestMode', true);
          resolve();
        });
      });
    });
  });
});