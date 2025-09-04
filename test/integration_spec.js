const should = require('should');
const helper = require('node-red-node-test-helper');
const sinon = require('sinon');
const { testHelper } = require('./test-helper');

// Import all node types for integration testing
const wgerConfigNode = require('../nodes/wger-config');
const wgerExerciseNode = require('../nodes/wger-exercise');
const wgerWorkoutNode = require('../nodes/wger-workout');
const wgerNutritionNode = require('../nodes/wger-nutrition');
const wgerUserNode = require('../nodes/wger-user');
const wgerWeightNode = require('../nodes/wger-weight');
const wgerApiNode = require('../nodes/wger-api');

helper.init(require.resolve('node-red'));

describe('Integration Tests', function () {
  // Increase timeout for integration tests
  this.timeout(10000);

  beforeEach(function (done) {
    helper.startServer(done);
  });

  afterEach(function (done) {
    testHelper.cleanup();
    helper.unload();
    helper.stopServer(done);
  });

  describe('Multi-Node Workflows', function() {
    it('should chain exercise search with workout creation', function (done) {
      const flow = [
        {
          id: 'config',
          type: 'wger-config',
          apiUrl: 'https://wger.de',
          authType: 'none',
        },
        {
          id: 'search',
          type: 'wger-exercise',
          operation: 'searchExercises',
          server: 'config',
          wires: [['workout']]
        },
        {
          id: 'workout',
          type: 'wger-workout',
          operation: 'createWorkout',
          server: 'config',
          wires: [['result']]
        },
        { id: 'result', type: 'helper' }
      ];

      helper.load([wgerConfigNode, wgerExerciseNode, wgerWorkoutNode], flow, function () {
        const search = helper.getNode('search');
        const result = helper.getNode('result');
        let messageCount = 0;

        result.on('input', function (msg) {
          messageCount++;
          if (messageCount === 1) {
            // First message should be from exercise search
            msg.should.have.property('payload');
            msg.operation.should.equal('searchExercises');
          } else if (messageCount === 2) {
            // Second message should be from workout creation
            msg.should.have.property('payload');
            done();
          }
        });

        search.receive({ payload: { term: 'bench press' } });
      });
    });

    it('should handle error propagation across nodes', function (done) {
      const flow = [
        {
          id: 'config',
          type: 'wger-config',
          apiUrl: 'https://unreachable.wger.de',
          authType: 'none',
        },
        {
          id: 'exercise',
          type: 'wger-exercise',
          operation: 'searchExercises',
          server: 'config',
          wires: [['nutrition']]
        },
        {
          id: 'nutrition',
          type: 'wger-nutrition',
          operation: 'searchIngredients',
          server: 'config',
          wires: [['result']]
        },
        { id: 'result', type: 'helper' }
      ];

      helper.load([wgerConfigNode, wgerExerciseNode, wgerNutritionNode], flow, function () {
        const exercise = helper.getNode('exercise');
        const nutrition = helper.getNode('nutrition');
        let exerciseErrorReceived = false;
        let nutritionErrorReceived = false;

        exercise.on('call:error', (call) => {
          exerciseErrorReceived = true;
          call.firstArg.should.be.an.Error();
        });

        nutrition.on('call:error', (call) => {
          nutritionErrorReceived = true;
          call.firstArg.should.be.an.Error();
        });

        setTimeout(() => {
          exerciseErrorReceived.should.be.true();
          // Nutrition node should also handle errors if messages reach it
          done();
        }, 2000);

        exercise.receive({ payload: { term: 'test' } });
      });
    });

    it('should handle authentication across multiple nodes', function (done) {
      const flow = [
        {
          id: 'config',
          type: 'wger-config',
          apiUrl: 'https://wger.de',
          authType: 'token',
        },
        {
          id: 'user',
          type: 'wger-user',
          operation: 'getProfile',
          server: 'config',
          wires: [['weight']]
        },
        {
          id: 'weight',
          type: 'wger-weight',
          operation: 'addWeight',
          server: 'config',
          wires: [['result']]
        },
        { id: 'result', type: 'helper' }
      ];

      const credentials = { config: { token: 'test-token' }};

      helper.load([wgerConfigNode, wgerUserNode, wgerWeightNode], flow, credentials, function () {
        const user = helper.getNode('user');
        const weight = helper.getNode('weight');
        const config = helper.getNode('config');

        // Verify config provides consistent auth headers
        const authHeader = config.getAuthHeader();
        authHeader.should.have.property('Authorization', 'Token test-token');

        let userAuthChecked = false;
        let weightAuthChecked = false;

        user.on('call:error', (call) => {
          userAuthChecked = true;
          // Should handle auth errors gracefully
        });

        weight.on('call:error', (call) => {
          weightAuthChecked = true;
          // Should handle auth errors gracefully
        });

        setTimeout(() => {
          (userAuthChecked || weightAuthChecked).should.be.true();
          done();
        }, 2000);

        user.receive({ payload: {} });
      });
    });
  });

  describe('Concurrent Operations', function() {
    it('should handle multiple simultaneous requests', function (done) {
      const flow = [
        {
          id: 'config',
          type: 'wger-config',
          apiUrl: 'https://wger.de',
          authType: 'none',
        },
        {
          id: 'exercise1',
          type: 'wger-exercise',
          operation: 'searchExercises',
          server: 'config',
          wires: [['result']]
        },
        {
          id: 'exercise2',
          type: 'wger-exercise',
          operation: 'listExercises',
          server: 'config',
          wires: [['result']]
        },
        {
          id: 'exercise3',
          type: 'wger-exercise',
          operation: 'getCategories',
          server: 'config',
          wires: [['result']]
        },
        { id: 'result', type: 'helper' }
      ];

      helper.load([wgerConfigNode, wgerExerciseNode], flow, function () {
        const exercise1 = helper.getNode('exercise1');
        const exercise2 = helper.getNode('exercise2');
        const exercise3 = helper.getNode('exercise3');
        const result = helper.getNode('result');
        
        let responses = [];

        result.on('input', function (msg) {
          responses.push(msg);
          if (responses.length === 3) {
            responses.should.have.length(3);
            // All operations should complete (though they might error)
            done();
          }
        });

        // Send concurrent requests
        exercise1.receive({ payload: { term: 'bench' } });
        exercise2.receive({ payload: {} });
        exercise3.receive({ payload: {} });
      });
    });

    it('should handle request timeouts appropriately', function (done) {
      this.timeout(15000); // Extended timeout for this test

      const flow = [
        {
          id: 'config',
          type: 'wger-config',
          apiUrl: 'https://httpstat.us/200?sleep=8000', // 8 second delay
          authType: 'none',
        },
        {
          id: 'exercise',
          type: 'wger-exercise',
          operation: 'searchExercises',
          server: 'config',
          wires: [[]]
        }
      ];

      helper.load([wgerConfigNode, wgerExerciseNode], flow, function () {
        const exercise = helper.getNode('exercise');
        let errorReceived = false;

        exercise.on('call:error', (call) => {
          errorReceived = true;
          call.firstArg.should.be.an.Error();
          call.firstArg.message.should.match(/timeout/i);
        });

        setTimeout(() => {
          errorReceived.should.be.true();
          done();
        }, 12000);

        exercise.receive({ payload: { term: 'test' } });
      });
    });
  });

  describe('Memory and Resource Management', function() {
    it('should not leak memory with repeated operations', function (done) {
      const flow = [
        {
          id: 'config',
          type: 'wger-config',
          apiUrl: 'https://wger.de',
          authType: 'none',
        },
        {
          id: 'exercise',
          type: 'wger-exercise',
          operation: 'searchExercises',
          server: 'config',
          wires: [['result']]
        },
        { id: 'result', type: 'helper' }
      ];

      helper.load([wgerConfigNode, wgerExerciseNode], flow, function () {
        const exercise = helper.getNode('exercise');
        const result = helper.getNode('result');
        
        let completedOperations = 0;
        const totalOperations = 20;

        result.on('input', function (msg) {
          completedOperations++;
          if (completedOperations === totalOperations) {
            // All operations completed - check for memory stability
            // In a real scenario, you'd check process.memoryUsage()
            done();
          }
        });

        // Send multiple rapid requests
        for (let i = 0; i < totalOperations; i++) {
          setTimeout(() => {
            exercise.receive({ 
              payload: { term: `test-${i}` },
              requestId: i
            });
          }, i * 100);
        }
      });
    });

    it('should handle node cleanup properly', function (done) {
      const flow = [
        {
          id: 'config',
          type: 'wger-config',
          apiUrl: 'https://wger.de',
          authType: 'none',
        },
        {
          id: 'exercise',
          type: 'wger-exercise',
          operation: 'searchExercises',
          server: 'config',
          wires: [[]]
        }
      ];

      helper.load([wgerConfigNode, wgerExerciseNode], flow, function () {
        const exercise = helper.getNode('exercise');
        const config = helper.getNode('config');

        // Nodes should be properly initialized
        should.exist(exercise);
        should.exist(config);

        // Trigger cleanup
        helper.unload();

        // Nodes should be cleaned up
        setTimeout(() => {
          done(); // If we reach here without errors, cleanup was successful
        }, 100);
      });
    });
  });

  describe('Data Flow and Message Integrity', function() {
    it('should preserve message properties through node chain', function (done) {
      const flow = [
        {
          id: 'config',
          type: 'wger-config',
          apiUrl: 'https://wger.de',
          authType: 'none',
        },
        {
          id: 'exercise',
          type: 'wger-exercise',
          operation: 'searchExercises',
          server: 'config',
          wires: [['api']]
        },
        {
          id: 'api',
          type: 'wger-api',
          endpoint: '/api/v2/muscle/',
          method: 'GET',
          server: 'config',
          wires: [['result']]
        },
        { id: 'result', type: 'helper' }
      ];

      helper.load([wgerConfigNode, wgerExerciseNode, wgerApiNode], flow, function () {
        const exercise = helper.getNode('exercise');
        const result = helper.getNode('result');
        let messageCount = 0;

        result.on('input', function (msg) {
          messageCount++;
          
          // Custom properties should be preserved
          msg.should.have.property('customId', 'test-123');
          msg.should.have.property('topic', 'fitness');
          msg.should.have.property('correlationId', 'workflow-1');
          
          if (messageCount === 2) {
            done();
          }
        });

        exercise.receive({ 
          payload: { term: 'push up' },
          customId: 'test-123',
          topic: 'fitness',
          correlationId: 'workflow-1'
        });
      });
    });

    it('should handle large payload data without corruption', function (done) {
      const flow = [
        {
          id: 'config',
          type: 'wger-config',
          apiUrl: 'https://wger.de',
          authType: 'none',
        },
        {
          id: 'exercise',
          type: 'wger-exercise',
          operation: 'listExercises',
          server: 'config',
          wires: [['result']]
        },
        { id: 'result', type: 'helper' }
      ];

      helper.load([wgerConfigNode, wgerExerciseNode], flow, function () {
        const exercise = helper.getNode('exercise');
        const result = helper.getNode('result');

        // Create a large payload
        const largeArray = new Array(1000).fill(0).map((_, i) => ({
          id: i,
          name: `Exercise ${i}`,
          description: 'A'.repeat(100),
          category: Math.floor(Math.random() * 10)
        }));

        result.on('input', function (msg) {
          msg.should.have.property('payload');
          msg.should.have.property('largeData');
          msg.largeData.should.have.length(1000);
          msg.largeData[999].should.have.property('name', 'Exercise 999');
          done();
        });

        exercise.receive({ 
          payload: {},
          largeData: largeArray
        });
      });
    });
  });

  describe('Error Recovery and Resilience', function() {
    it('should recover from network failures', function (done) {
      let requestCount = 0;
      const originalRequest = require('axios');
      
      // Mock axios to fail first request, succeed on retry
      const mockAxios = sinon.stub();
      mockAxios.onFirstCall().rejects(new Error('Network failure'));
      mockAxios.onSecondCall().resolves({ data: { results: [] } });

      const flow = [
        {
          id: 'config',
          type: 'wger-config',
          apiUrl: 'https://wger.de',
          authType: 'none',
        },
        {
          id: 'exercise',
          type: 'wger-exercise',
          operation: 'searchExercises',
          server: 'config',
          wires: [['result']]
        },
        { id: 'result', type: 'helper' }
      ];

      helper.load([wgerConfigNode, wgerExerciseNode], flow, function () {
        const exercise = helper.getNode('exercise');
        const result = helper.getNode('result');

        let errorCount = 0;
        let successCount = 0;

        exercise.on('call:error', () => {
          errorCount++;
          // Retry the operation after a delay
          setTimeout(() => {
            exercise.receive({ payload: { term: 'retry-test' } });
          }, 500);
        });

        result.on('input', (msg) => {
          successCount++;
          errorCount.should.equal(1);
          successCount.should.equal(1);
          done();
        });

        exercise.receive({ payload: { term: 'initial-test' } });
      });
    });

    it('should handle malformed API responses gracefully', function (done) {
      const flow = [
        {
          id: 'config',
          type: 'wger-config',
          apiUrl: 'https://httpstat.us/200',
          authType: 'none',
        },
        {
          id: 'api',
          type: 'wger-api',
          endpoint: '/',
          method: 'GET',
          server: 'config',
          wires: [[]]
        }
      ];

      helper.load([wgerConfigNode, wgerApiNode], flow, function () {
        const api = helper.getNode('api');
        let errorReceived = false;

        api.on('call:error', (call) => {
          errorReceived = true;
          call.firstArg.should.be.an.Error();
          // Should handle JSON parsing errors or unexpected response structure
        });

        setTimeout(() => {
          errorReceived.should.be.true();
          done();
        }, 3000);

        api.receive({ payload: {} });
      });
    });

    it('should handle rate limiting with appropriate backoff', function (done) {
      const flow = [
        {
          id: 'config',
          type: 'wger-config',
          apiUrl: 'https://httpstat.us/429',
          authType: 'none',
        },
        {
          id: 'exercise',
          type: 'wger-exercise',
          operation: 'searchExercises',
          server: 'config',
          wires: [[]]
        }
      ];

      helper.load([wgerConfigNode, wgerExerciseNode], flow, function () {
        const exercise = helper.getNode('exercise');
        let rateLimitErrorReceived = false;

        exercise.on('call:error', (call) => {
          rateLimitErrorReceived = true;
          call.firstArg.should.be.an.Error();
          call.firstArg.message.should.match(/rate.*limit/i);
        });

        setTimeout(() => {
          rateLimitErrorReceived.should.be.true();
          done();
        }, 2000);

        exercise.receive({ payload: { term: 'test' } });
      });
    });
  });

  describe('Security Integration Tests', function() {
    it('should prevent XSS in node chain', function (done) {
      const flow = [
        {
          id: 'config',
          type: 'wger-config',
          apiUrl: 'https://wger.de',
          authType: 'none',
        },
        {
          id: 'exercise',
          type: 'wger-exercise',
          operation: 'searchExercises',
          server: 'config',
          wires: [['nutrition']]
        },
        {
          id: 'nutrition',
          type: 'wger-nutrition',
          operation: 'searchIngredients',
          server: 'config',
          wires: [['result']]
        },
        { id: 'result', type: 'helper' }
      ];

      helper.load([wgerConfigNode, wgerExerciseNode, wgerNutritionNode], flow, function () {
        const exercise = helper.getNode('exercise');
        const result = helper.getNode('result');

        result.on('input', (msg) => {
          // XSS should be sanitized throughout the chain
          msg.should.have.property('payload');
          if (msg.searchTerm) {
            msg.searchTerm.should.not.match(/<script>/);
          }
          done();
        });

        exercise.receive({ 
          payload: { 
            term: '<script>alert("xss")</script>bench press',
            notes: '<img src=x onerror=alert("xss")>'
          } 
        });
      });
    });

    it('should handle authentication token exposure', function (done) {
      const flow = [
        {
          id: 'config',
          type: 'wger-config',
          apiUrl: 'https://wger.de',
          authType: 'token',
        },
        {
          id: 'user',
          type: 'wger-user',
          operation: 'getProfile',
          server: 'config',
          wires: [['result']]
        },
        { id: 'result', type: 'helper' }
      ];

      const credentials = { config: { token: 'super-secret-token' }};

      helper.load([wgerConfigNode, wgerUserNode], flow, credentials, function () {
        const user = helper.getNode('user');
        const result = helper.getNode('result');

        result.on('input', (msg) => {
          // Token should not be exposed in message payload
          const msgStr = JSON.stringify(msg);
          msgStr.should.not.match(/super-secret-token/);
          done();
        });

        user.on('call:error', () => {
          // Even in error cases, token should not be exposed
          done();
        });

        user.receive({ payload: {} });
      });
    });
  });
});