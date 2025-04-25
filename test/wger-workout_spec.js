const should = require('should');
const helper = require('node-red-node-test-helper');
const wgerWorkoutNode = require('../nodes/wger-workout');
const wgerConfigNode = require('../nodes/wger-config');
const sinon = require('sinon');

helper.init(require.resolve('node-red'));

describe('wger-workout Node', function () {
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
      { id: 'n1', type: 'wger-workout', name: 'test workout', server: 'c1' },
      { id: 'c1', type: 'wger-config' }
    ];
    helper.load([wgerWorkoutNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      n1.should.have.property('name', 'test workout');
      done();
    });
  });

  it('should handle missing server config', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-workout', name: 'test workout', wires: [[]] }
    ];
    helper.load(wgerWorkoutNode, flow, function () {
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
      { id: 'n1', type: 'wger-workout', server: 'c1', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    helper.load([wgerWorkoutNode, wgerConfigNode], flow, function () {
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
      { id: 'n1', type: 'wger-workout', server: 'c1', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    helper.load([wgerWorkoutNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      
      n1.on('call:error', (call) => {
        call.firstArg.message.should.equal('Invalid operation: invalidOp');
        done();
      });

      n1.receive({ operation: 'invalidOp' });
    });
  });

  it('should list workouts', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-workout', server: 'c1', operation: 'listWorkouts', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    // Mock the WgerApiClient
    const WgerApiClient = require('../utils/api-client');
    const mockGet = sinon.stub().resolves({ results: ['workout1', 'workout2'] });
    sinon.stub(WgerApiClient.prototype, 'get').callsFake(mockGet);
    
    helper.load([wgerWorkoutNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('results');
        msg.payload.results.should.containEql('workout1');
        mockGet.should.have.been.calledWith('/api/v2/workout/');
        done();
      });

      n1.receive({ payload: {} });
    });
  });

  it('should get a specific workout', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-workout', server: 'c1', operation: 'getWorkout', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockGet = sinon.stub().resolves({ id: 123, name: 'Test Workout' });
    sinon.stub(WgerApiClient.prototype, 'get').callsFake(mockGet);
    
    helper.load([wgerWorkoutNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('id', 123);
        msg.payload.should.have.property('name', 'Test Workout');
        mockGet.should.have.been.calledWith('/api/v2/workout/123/');
        done();
      });

      n1.receive({ payload: { workoutId: 123 } });
    });
  });

  it('should handle missing workoutId for getWorkout', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-workout', server: 'c1', operation: 'getWorkout', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    
    helper.load([wgerWorkoutNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      
      n1.on('call:error', (call) => {
        call.firstArg.message.should.equal('workoutId is required');
        done();
      });

      n1.receive({ payload: {} });
    });
  });

  it('should create a workout', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-workout', server: 'c1', operation: 'createWorkout', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockPost = sinon.stub().resolves({ id: 456, name: 'New Workout' });
    sinon.stub(WgerApiClient.prototype, 'post').callsFake(mockPost);
    
    helper.load([wgerWorkoutNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('id', 456);
        mockPost.should.have.been.calledWith('/api/v2/workout/', { name: 'New Workout' });
        done();
      });

      n1.receive({ payload: { name: 'New Workout' } });
    });
  });

  it('should update a workout', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-workout', server: 'c1', operation: 'updateWorkout', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockPatch = sinon.stub().resolves({ id: 123, name: 'Updated Workout' });
    sinon.stub(WgerApiClient.prototype, 'patch').callsFake(mockPatch);
    
    helper.load([wgerWorkoutNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('name', 'Updated Workout');
        mockPatch.should.have.been.calledWith('/api/v2/workout/123/', { name: 'Updated Workout' });
        done();
      });

      n1.receive({ payload: { workoutId: 123, name: 'Updated Workout' } });
    });
  });

  it('should delete a workout', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-workout', server: 'c1', operation: 'deleteWorkout', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockDelete = sinon.stub().resolves({});
    sinon.stub(WgerApiClient.prototype, 'delete').callsFake(mockDelete);
    
    helper.load([wgerWorkoutNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        mockDelete.should.have.been.calledWith('/api/v2/workout/123/');
        done();
      });

      n1.receive({ payload: { workoutId: 123 } });
    });
  });

  it('should get canonical workout representation', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-workout', server: 'c1', operation: 'getWorkoutCanonical', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockGet = sinon.stub().resolves({ canonical: true });
    sinon.stub(WgerApiClient.prototype, 'get').callsFake(mockGet);
    
    helper.load([wgerWorkoutNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('canonical', true);
        mockGet.should.have.been.calledWith('/api/v2/workout/123/canonical_representation/');
        done();
      });

      n1.receive({ payload: { workoutId: 123 } });
    });
  });

  it('should handle workout session operations', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-workout', server: 'c1', operation: 'createWorkoutSession', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockPost = sinon.stub().resolves({ id: 1, workout: 123, date: '2025-04-25' });
    sinon.stub(WgerApiClient.prototype, 'post').callsFake(mockPost);
    
    helper.load([wgerWorkoutNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('workout', 123);
        mockPost.should.have.been.calledWith('/api/v2/workoutsession/', { workout: 123, date: '2025-04-25' });
        done();
      });

      n1.receive({ payload: { workout: 123, date: '2025-04-25' } });
    });
  });

  it('should get latest workout session', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-workout', server: 'c1', operation: 'getLatestWorkoutSession', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockGet = sinon.stub().resolves({ results: [{ id: 1, date: '2025-04-25' }] });
    sinon.stub(WgerApiClient.prototype, 'get').callsFake(mockGet);
    
    helper.load([wgerWorkoutNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('id', 1);
        mockGet.should.have.been.calledWith('/api/v2/workoutsession/', {
          workout: 123,
          ordering: '-date',
          limit: 1
        });
        done();
      });

      n1.receive({ payload: { workoutId: 123 } });
    });
  });

  it('should handle API errors gracefully', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-workout', server: 'c1', operation: 'listWorkouts', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    sinon.stub(WgerApiClient.prototype, 'get').rejects(new Error('API Error'));
    
    helper.load([wgerWorkoutNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      
      n1.on('call:error', (call) => {
        call.firstArg.message.should.equal('API Error');
        done();
      });

      n1.receive({ payload: {} });
    });
  });
});
