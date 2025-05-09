const should = require('should');
const helper = require('node-red-node-test-helper');
const wgerWeightNode = require('../nodes/wger-weight');
const wgerConfigNode = require('../nodes/wger-config');
const sinon = require('sinon');

helper.init(require.resolve('node-red'));

describe('wger-weight Node', function () {
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
      { id: 'n1', type: 'wger-weight', name: 'test weight', server: 'c1' },
      { id: 'c1', type: 'wger-config' }
    ];
    helper.load([wgerWeightNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      n1.should.have.property('name', 'test weight');
      done();
    });
  });

  it('should handle missing server config', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-weight', name: 'test weight', wires: [[]] }
    ];
    helper.load(wgerWeightNode, flow, function () {
      const n1 = helper.getNode('n1');
      n1.on('call:status', (call) => {
        call.firstArg.should.have.property('fill', 'red');
        call.firstArg.should.have.property('shape', 'ring');
        call.firstArg.should.have.property('text', 'Missing server config');
        done();
      });
    });
  });

  it('should handle missing operation', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-weight', server: 'c1', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    helper.load([wgerWeightNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      
      n1.on('call:error', (call) => {
        call.firstArg.message.should.equal('No operation specified');
        done();
      });

      n1.receive({ payload: {} });
    });
  });

  it('should handle invalid operation', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-weight', server: 'c1', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    helper.load([wgerWeightNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      
      n1.on('call:error', (call) => {
        call.firstArg.message.should.equal('Invalid operation: invalidOp');
        done();
      });

      n1.receive({ operation: 'invalidOp' });
    });
  });

  it('should list weight entries', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-weight', server: 'c1', operation: 'listWeightEntries', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockGet = sinon.stub().resolves({ results: [{ id: 1, weight: 75 }, { id: 2, weight: 74 }] });
    sinon.stub(WgerApiClient.prototype, 'get').callsFake(mockGet);
    
    helper.load([wgerWeightNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('results');
        msg.payload.results[0].should.have.property('weight', 75);
        mockGet.should.have.been.calledWith('/api/v2/weightentry/', {
          date__gte: undefined,
          date__lte: undefined,
          limit: undefined,
          offset: undefined
        });
        done();
      });

      n1.receive({ payload: {} });
    });
  });

  it('should get a specific weight entry', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-weight', server: 'c1', operation: 'getWeightEntry', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockGet = sinon.stub().resolves({ id: 1, weight: 75, date: '2025-04-25' });
    sinon.stub(WgerApiClient.prototype, 'get').callsFake(mockGet);
    
    helper.load([wgerWeightNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('id', 1);
        msg.payload.should.have.property('weight', 75);
        mockGet.should.have.been.calledWith('/api/v2/weightentry/1/');
        done();
      });

      n1.receive({ payload: { entryId: 1 } });
    });
  });

  it('should handle missing entryId for getWeightEntry', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-weight', server: 'c1', operation: 'getWeightEntry', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    
    helper.load([wgerWeightNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      
      n1.on('call:error', (call) => {
        call.firstArg.message.should.equal('entryId is required');
        done();
      });

      n1.receive({ payload: {} });
    });
  });

  it('should create a weight entry', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-weight', server: 'c1', operation: 'createWeightEntry', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockPost = sinon.stub().resolves({ id: 3, weight: 73.5, date: '2025-04-25' });
    sinon.stub(WgerApiClient.prototype, 'post').callsFake(mockPost);
    
    helper.load([wgerWeightNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('id', 3);
        msg.payload.should.have.property('weight', 73.5);
        mockPost.should.have.been.calledWith('/api/v2/weightentry/', {
          weight: 73.5,
          date: '2025-04-25',
          comment: 'Morning weight'
        });
        done();
      });

      n1.receive({ payload: { weight: 73.5, date: '2025-04-25', comment: 'Morning weight' } });
    });
  });

  it('should handle missing required fields for createWeightEntry', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-weight', server: 'c1', operation: 'createWeightEntry', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    
    helper.load([wgerWeightNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      
      n1.on('call:error', (call) => {
        call.firstArg.message.should.equal('weight and date are required');
        done();
      });

      n1.receive({ payload: { weight: 73.5 } }); // Missing date
    });
  });

  it('should update a weight entry', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-weight', server: 'c1', operation: 'updateWeightEntry', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockPatch = sinon.stub().resolves({ id: 1, weight: 74, date: '2025-04-25' });
    sinon.stub(WgerApiClient.prototype, 'patch').callsFake(mockPatch);
    
    helper.load([wgerWeightNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('weight', 74);
        mockPatch.should.have.been.calledWith('/api/v2/weightentry/1/', { weight: 74 });
        done();
      });

      n1.receive({ payload: { entryId: 1, weight: 74 } });
    });
  });

  it('should delete a weight entry', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-weight', server: 'c1', operation: 'deleteWeightEntry', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockDelete = sinon.stub().resolves({});
    sinon.stub(WgerApiClient.prototype, 'delete').callsFake(mockDelete);
    
    helper.load([wgerWeightNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        mockDelete.should.have.been.calledWith('/api/v2/weightentry/1/');
        done();
      });

      n1.receive({ payload: { entryId: 1 } });
    });
  });

  it('should get weight statistics', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-weight', server: 'c1', operation: 'getWeightStats', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockGet = sinon.stub().resolves({
      results: [
        { weight: 75, date: '2025-04-25' },
        { weight: 74, date: '2025-04-24' },
        { weight: 73, date: '2025-04-23' }
      ]
    });
    sinon.stub(WgerApiClient.prototype, 'get').callsFake(mockGet);
    
    helper.load([wgerWeightNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('stats');
        msg.payload.stats.should.have.property('min', 73);
        msg.payload.stats.should.have.property('max', 75);
        msg.payload.stats.should.have.property('avg', 74);
        msg.payload.stats.should.have.property('change', 2);
        msg.payload.stats.should.have.property('count', 3);
        done();
      });

      n1.receive({ payload: {} });
    });
  });

  it('should handle empty weight statistics', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-weight', server: 'c1', operation: 'getWeightStats', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockGet = sinon.stub().resolves({ results: [] });
    sinon.stub(WgerApiClient.prototype, 'get').callsFake(mockGet);
    
    helper.load([wgerWeightNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('stats', null);
        msg.payload.should.have.property('entries');
        msg.payload.entries.length.should.equal(0);
        done();
      });

      n1.receive({ payload: {} });
    });
  });

  it('should handle API errors gracefully', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-weight', server: 'c1', operation: 'listWeightEntries', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    sinon.stub(WgerApiClient.prototype, 'get').rejects(new Error('API Error'));
    
    helper.load([wgerWeightNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      
      n1.on('call:error', (call) => {
        call.firstArg.message.should.equal('API Error');
        done();
      });

      n1.receive({ payload: {} });
    });
  });
});
