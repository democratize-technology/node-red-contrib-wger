const should = require('should');
const helper = require('node-red-node-test-helper');
const wgerNutritionNode = require('../nodes/wger-nutrition');
const wgerConfigNode = require('../nodes/wger-config');
const sinon = require('sinon');

helper.init(require.resolve('node-red'));

describe('wger-nutrition Node', function () {
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
      { id: 'n1', type: 'wger-nutrition', name: 'test nutrition', server: 'c1' },
      { id: 'c1', type: 'wger-config' }
    ];
    helper.load([wgerNutritionNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      n1.should.have.property('name', 'test nutrition');
      done();
    });
  });

  it('should handle missing server config', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-nutrition', name: 'test nutrition', wires: [[]] }
    ];
    helper.load(wgerNutritionNode, flow, function () {
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
      { id: 'n1', type: 'wger-nutrition', server: 'c1', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    helper.load([wgerNutritionNode, wgerConfigNode], flow, function () {
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
      { id: 'n1', type: 'wger-nutrition', server: 'c1', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    helper.load([wgerNutritionNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      
      n1.on('call:error', (call) => {
        call.firstArg.message.should.equal('Invalid operation: invalidOp');
        done();
      });

      n1.receive({ operation: 'invalidOp' });
    });
  });

  it('should list nutrition plans', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-nutrition', server: 'c1', operation: 'listNutritionPlans', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockGet = sinon.stub().resolves({ results: ['plan1', 'plan2'] });
    sinon.stub(WgerApiClient.prototype, 'get').callsFake(mockGet);
    
    helper.load([wgerNutritionNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('results');
        msg.payload.results.should.containEql('plan1');
        mockGet.should.have.been.calledWith('/api/v2/nutritionplan/');
        done();
      });

      n1.receive({ payload: {} });
    });
  });

  it('should get a specific nutrition plan', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-nutrition', server: 'c1', operation: 'getNutritionPlan', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockGet = sinon.stub().resolves({ id: 123, description: 'Test Plan' });
    sinon.stub(WgerApiClient.prototype, 'get').callsFake(mockGet);
    
    helper.load([wgerNutritionNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('id', 123);
        msg.payload.should.have.property('description', 'Test Plan');
        mockGet.should.have.been.calledWith('/api/v2/nutritionplaninfo/123/');
        done();
      });

      n1.receive({ payload: { planId: 123 } });
    });
  });

  it('should handle missing planId for getNutritionPlan', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-nutrition', server: 'c1', operation: 'getNutritionPlan', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    
    helper.load([wgerNutritionNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      
      n1.on('call:error', (call) => {
        call.firstArg.message.should.equal('planId is required');
        done();
      });

      n1.receive({ payload: {} });
    });
  });

  it('should create a nutrition plan', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-nutrition', server: 'c1', operation: 'createNutritionPlan', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockPost = sinon.stub().resolves({ id: 456, description: 'New Plan' });
    sinon.stub(WgerApiClient.prototype, 'post').callsFake(mockPost);
    
    helper.load([wgerNutritionNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('id', 456);
        mockPost.should.have.been.calledWith('/api/v2/nutritionplan/', {
          description: 'New Plan',
          only_logging: false
        });
        done();
      });

      n1.receive({ payload: { description: 'New Plan' } });
    });
  });

  it('should get nutritional values', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-nutrition', server: 'c1', operation: 'getNutritionalValues', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockGet = sinon.stub().resolves({ calories: 2000, protein: 150 });
    sinon.stub(WgerApiClient.prototype, 'get').callsFake(mockGet);
    
    helper.load([wgerNutritionNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('calories', 2000);
        mockGet.should.have.been.calledWith('/api/v2/nutritionplan/123/nutritional_values/');
        done();
      });

      n1.receive({ payload: { planId: 123 } });
    });
  });

  it('should create a meal', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-nutrition', server: 'c1', operation: 'createMeal', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockPost = sinon.stub().resolves({ id: 1, plan: 123, time: '12:00' });
    sinon.stub(WgerApiClient.prototype, 'post').callsFake(mockPost);
    
    helper.load([wgerNutritionNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('id', 1);
        mockPost.should.have.been.calledWith('/api/v2/meal/', {
          plan: 123,
          time: '12:00',
          name: 'Lunch'
        });
        done();
      });

      n1.receive({ payload: { plan: 123, time: '12:00', name: 'Lunch' } });
    });
  });

  it('should handle missing required fields for createMeal', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-nutrition', server: 'c1', operation: 'createMeal', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    
    helper.load([wgerNutritionNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      
      n1.on('call:error', (call) => {
        call.firstArg.message.should.equal('time is required');
        done();
      });

      n1.receive({ payload: { plan: 123 } }); // Missing time
    });
  });

  it('should search ingredients', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-nutrition', server: 'c1', operation: 'searchIngredients', wires: [['n2']] },
      { id: 'n2', type: 'helper' },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    const mockGet = sinon.stub().resolves({ suggestions: ['Apple', 'Banana'] });
    sinon.stub(WgerApiClient.prototype, 'get').callsFake(mockGet);
    
    helper.load([wgerNutritionNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      const n2 = helper.getNode('n2');
      
      n2.on('input', function (msg) {
        msg.should.have.property('payload');
        msg.payload.should.have.property('suggestions');
        mockGet.should.have.been.calledWith('/api/v2/ingredient/search/', {
          term: 'fruit',
          language: 'en'
        });
        done();
      });

      n1.receive({ payload: { term: 'fruit' } });
    });
  });

  it('should handle missing search term for searchIngredients', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-nutrition', server: 'c1', operation: 'searchIngredients', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    
    helper.load([wgerNutritionNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      
      n1.on('call:error', (call) => {
        call.firstArg.message.should.equal('term is required');
        done();
      });

      n1.receive({ payload: {} });
    });
  });

  it('should handle API errors gracefully', function (done) {
    const flow = [
      { id: 'n1', type: 'wger-nutrition', server: 'c1', operation: 'listNutritionPlans', wires: [[]] },
      { id: 'c1', type: 'wger-config' }
    ];
    
    const WgerApiClient = require('../utils/api-client');
    sinon.stub(WgerApiClient.prototype, 'get').rejects(new Error('API Error'));
    
    helper.load([wgerNutritionNode, wgerConfigNode], flow, function () {
      const n1 = helper.getNode('n1');
      
      n1.on('call:error', (call) => {
        call.firstArg.message.should.equal('API Error');
        done();
      });

      n1.receive({ payload: {} });
    });
  });
});
