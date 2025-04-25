const should = require('should');
const helper = require('node-red-node-test-helper');
const wgerConfigNode = require('../nodes/wger-config');

helper.init(require.resolve('node-red'));

describe('wger-config Node', function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    helper.unload();
    helper.stopServer(done);
  });

  it('should be loaded', function (done) {
    const flow = [{ id: 'n1', type: 'wger-config', name: 'test config' }];
    helper.load(wgerConfigNode, flow, function () {
      const n1 = helper.getNode('n1');
      n1.should.have.property('name', 'test config');
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

  it('should detect test mode for localhost URLs', function (done) {
    const flow = [{ id: 'n1', type: 'wger-config', apiUrl: 'http://localhost:8000' }];
    helper.load(wgerConfigNode, flow, function () {
      const n1 = helper.getNode('n1');
      n1.should.have.property('isTestMode', true);
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

  // Test the HTTP admin endpoint
  it('should handle admin test endpoint', function (done) {
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
});
