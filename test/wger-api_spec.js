const should = require('should');
const helper = require('node-red-node-test-helper');
const wgerApiNode = require('../nodes/wger-api');
const wgerConfigNode = require('../nodes/wger-config');
const sinon = require('sinon');

helper.init(require.resolve('node-red'));

describe('wger-api Node', function () {
  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    helper.unload();
    helper.stopServer(done);
    sinon.restore();
  });

  it('should be loaded', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-api', name: 'test api', server: 'c1' },
      { id: 'c1', type: 'wger-config' }
    ];
    helper.load([wgerApiNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      n1.should.have.property('name', 'test api');
      done();
    });
  });

  it('should handle missing server config', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-api', name: 'test api', wires: [[]] }
    ];
    helper.load(wgerApiNode, flow, function () {
      const n1 = helper.getNode('n1');
      n1.on('call:status', (call) => {
        call.firstArg.should.have.property('fill', 'red');
        call.firstArg.should.have.property('shape', 'ring');
        call.firstArg.should.have.property('text', 'Missing server config');
        done();
      });
    });
  });

  it('should handle missing endpoint', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-api', server: 'c1', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    helper.load([wgerApiNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      
      n1.on('call:error', (call) => {
        call.firstArg.message.should.equal('No endpoint specified');
        done();
      });

      n1.receive({ payload: {} });
    });
  });

  it('should handle unsupported HTTP methods', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-api', server: 'c1', endpoint: '/test', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    
    helper.load([wgerApiNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      
      n1.on('call:error', (call) => {
        call.firstArg.message.should.equal('Unsupported HTTP method: INVALID');
        done();
      });

      n1.receive({ method: 'INVALID' });
    });
  });

  it('should use msg.method over node.method', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-api', server: 'c1', method: 'GET', endpoint: '/test', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config', apiUrl: 'https://test.api' }
    ];
    
    // Mock the WgerApiClient
    const WgerApiClient = require('../utils/api-client');
    const mockPost = sinon.stub().resolves({ data: 'post response' });
    sinon.stub(WgerApiClient.prototype, 'post').callsFake(mockPost);
    
    helper.load([wgerApiNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('data', 'post response');
        mockPost.should.have.been.calledOnce;
        done();
      });

      n1.receive({ method: 'POST', payload: {} });
    });
  });

  it('should use msg.endpoint over node.endpoint', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-api', server: 'c1', method: 'GET', endpoint: '/test', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config', apiUrl: 'https://test.api' }
    ];
    
    // Mock the WgerApiClient
    const WgerApiClient = require('../utils/api-client');
    const mockGet = sinon.stub().resolves({ data: 'get response' });
    sinon.stub(WgerApiClient.prototype, 'get').callsFake(mockGet);
    
    helper.load([wgerApiNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('data', 'get response');
        mockGet.should.have.been.calledWith('/override');
        done();
      });

      n1.receive({ endpoint: '/override', payload: {} });
    });
  });

  it('should handle path parameters', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-api', server: 'c1', method: 'GET', endpoint: '/exercise/{id}', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config', apiUrl: 'https://test.api' }
    ];
    
    // Mock the WgerApiClient
    const WgerApiClient = require('../utils/api-client');
    const mockGet = sinon.stub().resolves({ data: 'get response' });
    sinon.stub(WgerApiClient.prototype, 'get').callsFake(mockGet);
    
    helper.load([wgerApiNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('data', 'get response');
        mockGet.should.have.been.calledWith('/exercise/123');
        done();
      });

      n1.receive({ params: { id: 123 } });
    });
  });

  it('should handle API errors', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-api', server: 'c1', method: 'GET', endpoint: '/error', wires: [[]] },
      { id: 'c1', type: 'wger-config', apiUrl: 'https://test.api' }
    ];
    
    // Mock API error
    const WgerApiClient = require('../utils/api-client');
    sinon.stub(WgerApiClient.prototype, 'get').rejects(new Error('API Error'));
    
    helper.load([wgerApiNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      
      n1.on('call:error', (call) => {
        call.firstArg.message.should.equal('API Error');
        done();
      });

      n1.receive({ payload: {} });
    });
  });

  describe('Security Tests', function() {
    it('should reject path traversal attempts in endpoints', function (done) {
      const flow = [
        { id: 'n1', type: 'wger-api', server: 'c1', method: 'GET', wires: [[]] },
        { id: 'c1', type: 'wger-config', apiUrl: 'https://test.api' }
      ];
      
      helper.load([wgerApiNode, wgerConfigNode], flow, function () {
        const n1 = helper.getNode('n1');
        
        n1.on('call:error', (call) => {
          call.firstArg.message.should.include('Endpoint cannot contain path traversal patterns');
          done();
        });

        // Send message with path traversal in endpoint
        n1.receive({ endpoint: '/api/v2/../../../admin' });
      });
    });

    it('should reject path traversal in path parameters', function (done) {
      const flow = [
        { id: 'n1', type: 'wger-api', server: 'c1', method: 'GET', endpoint: '/exercise/{id}', wires: [[]] },
        { id: 'c1', type: 'wger-config', apiUrl: 'https://test.api' }
      ];
      
      helper.load([wgerApiNode, wgerConfigNode], flow, function () {
        const n1 = helper.getNode('n1');
        
        n1.on('call:error', (call) => {
          call.firstArg.message.should.include('contains path traversal patterns');
          done();
        });

        // Send message with path traversal in parameter
        n1.receive({ params: { id: '../../../etc/passwd' } });
      });
    });

    it('should properly encode path parameters', function (done) {
      const flow = [
        { id: 'n1', type: 'wger-api', server: 'c1', method: 'GET', endpoint: '/exercise/{name}', wires: [['n2']] },
        { id: 'n2', type: 'helper' },
        { id: 'c1', type: 'wger-config', apiUrl: 'https://test.api' }
      ];
      
      // Mock the WgerApiClient
      const WgerApiClient = require('../utils/api-client');
      const mockGet = sinon.stub().resolves({ data: 'response' });
      sinon.stub(WgerApiClient.prototype, 'get').callsFake(mockGet);
      
      helper.load([wgerApiNode, wgerConfigNode], flow, function () {
        const n1 = helper.getNode('n1');
        const n2 = helper.getNode('n2');
        
        n2.on('input', function (msg) {
          // Verify that special characters are properly encoded
          mockGet.should.have.been.calledWith('/exercise/test%20name%26param');
          done();
        });

        // Send message with special characters that need encoding
        n1.receive({ params: { name: 'test name&param' } });
      });
    });

    it('should reject overly long parameters', function (done) {
      const flow = [
        { id: 'n1', type: 'wger-api', server: 'c1', method: 'GET', endpoint: '/exercise', wires: [[]] },
        { id: 'c1', type: 'wger-config', apiUrl: 'https://test.api' }
      ];
      
      helper.load([wgerApiNode, wgerConfigNode], flow, function () {
        const n1 = helper.getNode('n1');
        
        n1.on('call:error', (call) => {
          call.firstArg.message.should.include('too long');
          done();
        });

        // Send message with extremely long parameter
        const longParam = 'a'.repeat(1001);
        n1.receive({ params: { search: longParam } });
      });
    });

    it('should allow safe special characters in parameters', function (done) {
      const flow = [
        { id: 'n1', type: 'wger-api', server: 'c1', method: 'GET', endpoint: '/exercise/{id}', wires: [['n2']] },
        { id: 'n2', type: 'helper' },
        { id: 'c1', type: 'wger-config', apiUrl: 'https://test.api' }
      ];
      
      // Mock the WgerApiClient
      const WgerApiClient = require('../utils/api-client');
      const mockGet = sinon.stub().resolves({ data: 'response' });
      sinon.stub(WgerApiClient.prototype, 'get').callsFake(mockGet);
      
      helper.load([wgerApiNode, wgerConfigNode], flow, function () {
        const n1 = helper.getNode('n1');
        const n2 = helper.getNode('n2');
        
        n2.on('input', function (msg) {
          // Verify safe characters are allowed
          mockGet.should.have.been.calledWith('/exercise/test-id_123.v2');
          done();
        });

        // Send message with safe special characters
        n1.receive({ params: { id: 'test-id_123.v2' } });
      });
    });
  });
});
