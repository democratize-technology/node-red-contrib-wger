const should = require('should');
const helper = require('node-red-node-test-helper');
const wgerUserNode = require('../nodes/wger-user');
const wgerConfigNode = require('../nodes/wger-config');
const sinon = require('sinon');

helper.init(require.resolve('node-red'));

describe('wger-user Node', function () {
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
      { id: 'n1', type: 'wger-user', name: 'test user', server: 'c1' },
      { id: 'c1', type: 'wger-config' }
    ];
    helper.load([wgerUserNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      n1.should.have.property('name', 'test user');
      done();
    });
  });

  it('should handle missing server config', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-user', name: 'test user', wires: [[]] }
    ];
    helper.load(wgerUserNode, flow, function () {
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
      { id: 'n1', type: 'wger-user', server: 'c1', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    helper.load([wgerUserNode, wgerConfigNode], flow, function () {
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
      { id: 'n1', type: 'wger-user', server: 'c1', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    helper.load([wgerUserNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      
      n1.on('call:error', (call) => {
        call.firstArg.message.should.equal('Invalid operation: invalidOp');
        done();
      });

      n1.receive({ operation: 'invalidOp' });
    });
  });

  it('should get user profile', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-user', server: 'c1', operation: 'getUserProfile', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockGet = sinon.stub().resolves({ id: 1, username: 'testuser', email: 'test@example.com' });
    sinon.stub(WgerApiClient.prototype, 'get').callsFake(mockGet);
    
    helper.load([wgerUserNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('username', 'testuser');
        mockGet.should.have.been.calledWith('/api/v2/userprofile/');
        done();
      });

      n1.receive({ payload: {} });
    });
  });

  it('should update user profile', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-user', server: 'c1', operation: 'updateUserProfile', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockPatch = sinon.stub().resolves({ id: 1, username: 'updated_user' });
    sinon.stub(WgerApiClient.prototype, 'patch').callsFake(mockPatch);
    
    helper.load([wgerUserNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('username', 'updated_user');
        mockPatch.should.have.been.calledWith('/api/v2/userprofile/1/', { username: 'updated_user' });
        done();
      });

      n1.receive({ payload: { profileId: 1, username: 'updated_user' } });
    });
  });

  it('should handle missing profileId for updateUserProfile', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-user', server: 'c1', operation: 'updateUserProfile', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    
    helper.load([wgerUserNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      
      n1.on('call:error', (call) => {
        call.firstArg.message.should.equal('profileId is required');
        done();
      });

      n1.receive({ payload: { username: 'updated_user' } });
    });
  });

  it('should get user settings', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-user', server: 'c1', operation: 'getUserSettings', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockGet = sinon.stub().resolves({ language: 'en', gym_mode: true });
    sinon.stub(WgerApiClient.prototype, 'get').callsFake(mockGet);
    
    helper.load([wgerUserNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('language', 'en');
        msg.payload.should.have.property('gym_mode', true);
        mockGet.should.have.been.calledWith('/api/v2/setting/');
        done();
      });

      n1.receive({ payload: {} });
    });
  });

  it('should update user settings', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-user', server: 'c1', operation: 'updateUserSettings', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockPatch = sinon.stub().resolves({ id: 1, gym_mode: false });
    sinon.stub(WgerApiClient.prototype, 'patch').callsFake(mockPatch);
    
    helper.load([wgerUserNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('gym_mode', false);
        mockPatch.should.have.been.calledWith('/api/v2/setting/1/', { gym_mode: false });
        done();
      });

      n1.receive({ payload: { settingId: 1, gym_mode: false } });
    });
  });

  it('should handle missing settingId for updateUserSettings', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-user', server: 'c1', operation: 'updateUserSettings', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    
    helper.load([wgerUserNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      
      n1.on('call:error', (call) => {
        call.firstArg.message.should.equal('settingId is required');
        done();
      });

      n1.receive({ payload: { gym_mode: false } });
    });
  });

  it('should get API key', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-user', server: 'c1', operation: 'getApiKey', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockGet = sinon.stub().resolves({ key: 'api-key-123' });
    sinon.stub(WgerApiClient.prototype, 'get').callsFake(mockGet);
    
    helper.load([wgerUserNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('key', 'api-key-123');
        mockGet.should.have.been.calledWith('/api/v2/apikey/');
        done();
      });

      n1.receive({ payload: {} });
    });
  });

  it('should create API key', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-user', server: 'c1', operation: 'createApiKey', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockPost = sinon.stub().resolves({ key: 'new-api-key-456' });
    sinon.stub(WgerApiClient.prototype, 'post').callsFake(mockPost);
    
    helper.load([wgerUserNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('key', 'new-api-key-456');
        mockPost.should.have.been.calledWith('/api/v2/apikey/');
        done();
      });

      n1.receive({ payload: {} });
    });
  });

  it('should create a measurement', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-user', server: 'c1', operation: 'createMeasurement', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockPost = sinon.stub().resolves({ id: 1, category: 1, value: 40, date: '2025-04-25' });
    sinon.stub(WgerApiClient.prototype, 'post').callsFake(mockPost);
    
    helper.load([wgerUserNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('value', 40);
        mockPost.should.have.been.calledWith('/api/v2/measurement/', {
          category: 1,
          value: 40,
          date: '2025-04-25',
          notes: 'Biceps measurement'
        });
        done();
      });

      n1.receive({ payload: { category: 1, value: 40, date: '2025-04-25', notes: 'Biceps measurement' } });
    });
  });

  it('should handle missing required fields for createMeasurement', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-user', server: 'c1', operation: 'createMeasurement', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    
    helper.load([wgerUserNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      
      n1.on('call:error', (call) => {
        call.firstArg.message.should.equal('date is required');
        done();
      });

      n1.receive({ payload: { category: 1, value: 40 } }); // Missing date
    });
  });

  it('should handle API errors gracefully', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-user', server: 'c1', operation: 'getUserProfile', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    sinon.stub(WgerApiClient.prototype, 'get').rejects(new Error('API Error'));
    
    helper.load([wgerUserNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      
      n1.on('call:error', (call) => {
        call.firstArg.message.should.equal('API Error');
        done();
      });

      n1.receive({ payload: {} });
    });
  });
});
