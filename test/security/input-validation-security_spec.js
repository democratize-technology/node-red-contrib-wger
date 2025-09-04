/**
 * @fileoverview Security tests for comprehensive input validation
 */

const should = require('should');
const sinon = require('sinon');
const helper = require('node-red-node-test-helper');
const { testHelper } = require('../test-helper');

// Import operations
const exerciseOperations = require('../../nodes/operations/exercise-operations');
const nutritionOperations = require('../../nodes/operations/nutrition-operations');
const workoutOperations = require('../../nodes/operations/workout-operations');
const weightOperations = require('../../nodes/operations/weight-operations');
const userOperations = require('../../nodes/operations/user-operations');

describe('Input Validation Security Tests', function() {
  let mockApiClient;
  
  beforeEach(function() {
    mockApiClient = testHelper.createApiClientMock();
    testHelper.cleanup();
  });

  afterEach(function() {
    helper.unload();
    testHelper.cleanup();
  });

  describe('Exercise Operations Validation', function() {
    
    it('should validate and sanitize search term', async function() {
      const payload = {
        term: '<script>alert("xss")</script>bench press',
        language: 'en'
      };
      
      mockApiClient.get.resolves({ results: [] });
      
      await exerciseOperations.searchExercises(mockApiClient, payload);
      
      // Check that the XSS attempt was sanitized
      mockApiClient.get.calledOnce.should.be.true();
      const calledWith = mockApiClient.get.firstCall.args[1];
      calledWith.term.should.not.containEql('<script>');
      calledWith.term.should.not.containEql('</script>');
    });
    
    it('should reject invalid exercise ID format', async function() {
      const payload = {
        exerciseId: '../../../etc/passwd'
      };
      
      try {
        await exerciseOperations.getExercise(mockApiClient, payload);
        should.fail('Should have thrown validation error');
      } catch (error) {
        error.message.should.containEql('path traversal');
      }
    });
    
    it('should validate barcode format', async function() {
      const payload = {
        barcode: 'not-a-barcode'
      };
      
      try {
        await exerciseOperations.getExerciseByBarcode(mockApiClient, payload);
        should.fail('Should have thrown validation error');
      } catch (error) {
        error.message.should.containEql('invalid format');
      }
    });
    
    it('should validate muscle filter format', async function() {
      const payload = {
        muscles: '1;DROP TABLE exercises;--',
        equipment: '1,2,3'
      };
      
      try {
        await exerciseOperations.listExercises(mockApiClient, payload);
        should.fail('Should have thrown validation error');
      } catch (error) {
        error.message.should.containEql('invalid format');
      }
    });
  });

  describe('Nutrition Operations Validation', function() {
    
    it('should validate meal creation with all fields', async function() {
      const payload = {
        plan: '123',
        name: 'Test<script>alert(1)</script> Meal',
        time: '25:99', // Invalid time
        order: 999 // Out of range
      };
      
      try {
        await nutritionOperations.createMeal(mockApiClient, payload);
        should.fail('Should have thrown validation error');
      } catch (error) {
        error.message.should.match(/time.*invalid|order.*at most/i);
      }
    });
    
    it('should validate ingredient search term', async function() {
      const payload = {
        term: 'a', // Too short
        language: 'invalid-lang'
      };
      
      try {
        await nutritionOperations.searchIngredients(mockApiClient, payload);
        should.fail('Should have thrown validation error');
      } catch (error) {
        error.message.should.match(/at least|invalid format/i);
      }
    });
    
    it('should validate meal item amount ranges', async function() {
      const payload = {
        meal: '123',
        ingredient: '456',
        amount: -50 // Negative amount
      };
      
      try {
        await nutritionOperations.createMealItem(mockApiClient, payload);
        should.fail('Should have thrown validation error');
      } catch (error) {
        error.message.should.containEql('at least');
      }
    });
    
    it('should validate nutrition plan goals', async function() {
      const payload = {
        description: 'Test Plan',
        goal_energy: 99999, // Too high
        goal_protein: -10, // Negative
        goal_carbohydrates: 'not-a-number'
      };
      
      try {
        await nutritionOperations.createNutritionPlan(mockApiClient, payload);
        should.fail('Should have thrown validation error');
      } catch (error) {
        error.message.should.match(/at most|at least|must be a number/i);
      }
    });
  });

  describe('Workout Operations Validation', function() {
    
    it('should validate workout session date format', async function() {
      const payload = {
        workout: '123',
        date: 'not-a-date',
        time_start: '99:99',
        impression: 10 // Out of range 1-5
      };
      
      try {
        await workoutOperations.createWorkoutSession(mockApiClient, payload);
        should.fail('Should have thrown validation error');
      } catch (error) {
        error.message.should.match(/valid date|invalid format|at most/i);
      }
    });
    
    it('should validate workout day array', async function() {
      const payload = {
        workout: '123',
        description: 'Test Day',
        day: [0, 8, 9] // Out of range 1-7
      };
      
      try {
        await workoutOperations.createDay(mockApiClient, payload);
        should.fail('Should have thrown validation error');
      } catch (error) {
        error.message.should.match(/at least|at most/i);
      }
    });
    
    it('should validate workout log numeric fields', async function() {
      const payload = {
        workout: '123',
        exercise_base: '456',
        reps: 9999, // Too high
        weight: -10, // Negative
        weight_unit: 5, // Invalid enum value
        date: new Date().toISOString()
      };
      
      try {
        await workoutOperations.createWorkoutLog(mockApiClient, payload);
        should.fail('Should have thrown validation error');
      } catch (error) {
        error.message.should.match(/at most|at least|must be one of/i);
      }
    });
    
    it('should validate set order limits', async function() {
      const payload = {
        exerciseday: '123',
        sets: 150, // Too high
        order: -1, // Negative
        comment: 'a'.repeat(1000) // Too long
      };
      
      try {
        await workoutOperations.createSet(mockApiClient, payload);
        should.fail('Should have thrown validation error');
      } catch (error) {
        error.message.should.match(/at most|at least/i);
      }
    });
  });

  describe('Weight Operations Validation', function() {
    
    it('should validate weight entry values', async function() {
      const payload = {
        weight: 2000, // Too high
        date: 'invalid-date'
      };
      
      try {
        await weightOperations.createWeightEntry(mockApiClient, payload);
        should.fail('Should have thrown validation error');
      } catch (error) {
        error.message.should.match(/at most|valid date/i);
      }
    });
    
    it('should validate weight entry ID format', async function() {
      const payload = {
        entryId: '../../malicious/path'
      };
      
      try {
        await weightOperations.getWeightEntry(mockApiClient, payload);
        should.fail('Should have thrown validation error');
      } catch (error) {
        error.message.should.containEql('path traversal');
      }
    });
  });

  describe('User Operations Validation', function() {
    
    it('should validate user profile age limits', async function() {
      const payload = {
        age: 200, // Too high
        height: 500, // Too high
        gender: '5', // Invalid enum
        weight_unit: 'stones' // Invalid enum
      };
      
      try {
        await userOperations.updateUserProfile(mockApiClient, payload);
        should.fail('Should have thrown validation error');
      } catch (error) {
        error.message.should.match(/at most|must be one of/i);
      }
    });
    
    it('should validate user preferences', async function() {
      const payload = {
        language: 'not-a-valid-language-code',
        theme: 'neon', // Invalid enum
        units: 'ancient-roman' // Invalid enum
      };
      
      try {
        await userOperations.updateUserPreferences(mockApiClient, payload);
        should.fail('Should have thrown validation error');
      } catch (error) {
        error.message.should.match(/invalid format|must be one of/i);
      }
    });
  });

  describe('SQL Injection Prevention', function() {
    
    it('should sanitize SQL injection attempts in search', async function() {
      const payload = {
        term: "bench' OR '1'='1"
      };
      
      mockApiClient.get.resolves({ results: [] });
      await exerciseOperations.searchExercises(mockApiClient, payload);
      
      const calledWith = mockApiClient.get.firstCall.args[1];
      // The dangerous SQL should be sanitized
      calledWith.term.should.not.match(/';|";/);
    });
    
    it('should remove SQL comments from input', async function() {
      const payload = {
        term: 'bench press--DROP TABLE exercises'
      };
      
      mockApiClient.get.resolves({ results: [] });
      await exerciseOperations.searchExercises(mockApiClient, payload);
      
      const calledWith = mockApiClient.get.firstCall.args[1];
      calledWith.term.should.not.containEql('--');
    });
  });

  describe('XSS Prevention', function() {
    
    it('should strip HTML tags from text inputs', async function() {
      const payload = {
        name: '<img src=x onerror=alert(1)>Workout Name',
        description: '<script>alert("XSS")</script>Description'
      };
      
      mockApiClient.post.resolves({ id: 1 });
      await workoutOperations.createWorkout(mockApiClient, payload);
      
      const calledWith = mockApiClient.post.firstCall.args[1];
      calledWith.name.should.not.containEql('<img');
      calledWith.description.should.not.containEql('<script>');
    });
    
    it('should escape special characters in user input', async function() {
      const payload = {
        description: 'Test & <special> "characters"'
      };
      
      mockApiClient.post.resolves({ id: 1 });
      await nutritionOperations.createNutritionPlan(mockApiClient, payload);
      
      const calledWith = mockApiClient.post.firstCall.args[1];
      calledWith.description.should.be.type('string');
      // The input should be properly escaped/sanitized
    });
  });

  describe('Path Traversal Prevention', function() {
    
    it('should reject path traversal in ID fields', async function() {
      const attacks = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '123/../../../admin',
        '123/../../sensitive'
      ];
      
      for (const attack of attacks) {
        try {
          await exerciseOperations.getExercise(mockApiClient, { exerciseId: attack });
          should.fail(`Should have rejected: ${attack}`);
        } catch (error) {
          error.message.should.containEql('path traversal');
        }
      }
    });
  });

  describe('Type Coercion Safety', function() {
    
    it('should safely coerce numeric strings', async function() {
      const payload = {
        weight: '75.5',
        date: new Date().toISOString()
      };
      
      mockApiClient.post.resolves({ id: 1 });
      await weightOperations.createWeightEntry(mockApiClient, payload);
      
      const calledWith = mockApiClient.post.firstCall.args[1];
      calledWith.weight.should.equal(75.5);
      calledWith.weight.should.be.type('number');
    });
    
    it('should reject non-numeric strings for number fields', async function() {
      const payload = {
        weight: 'not-a-number',
        date: new Date().toISOString()
      };
      
      try {
        await weightOperations.createWeightEntry(mockApiClient, payload);
        should.fail('Should have thrown validation error');
      } catch (error) {
        error.message.should.containEql('must be a valid number');
      }
    });
  });

  describe('Array Validation', function() {
    
    it('should validate array item count limits', async function() {
      const payload = {
        workout: '123',
        description: 'Test',
        day: [1, 2, 3, 4, 5, 6, 7, 8] // Too many items (max 7)
      };
      
      try {
        await workoutOperations.createDay(mockApiClient, payload);
        should.fail('Should have thrown validation error');
      } catch (error) {
        error.message.should.containEql('at most');
      }
    });
    
    it('should validate each array item', async function() {
      const payload = {
        workout: '123',
        description: 'Test',
        day: [1, 2, 99] // 99 is out of range 1-7
      };
      
      try {
        await workoutOperations.createDay(mockApiClient, payload);
        should.fail('Should have thrown validation error');
      } catch (error) {
        error.message.should.containEql('at most');
      }
    });
  });

  describe('Enum Validation', function() {
    
    it('should reject invalid enum values', async function() {
      const payload = {
        workoutId: '123',
        ordering: 'random' // Not in allowed enum
      };
      
      try {
        await workoutOperations.listWorkoutSessions(mockApiClient, payload);
        should.fail('Should have thrown validation error');
      } catch (error) {
        error.message.should.containEql('must be one of');
      }
    });
  });

  describe('Comprehensive Payload Validation', function() {
    
    it('should reject unexpected fields in strict mode', async function() {
      const payload = {
        term: 'bench press',
        language: 'en',
        unexpected_field: 'should not be here',
        __proto__: 'prototype pollution attempt'
      };
      
      try {
        await exerciseOperations.searchExercises(mockApiClient, payload);
        should.fail('Should have thrown validation error');
      } catch (error) {
        error.message.should.containEql('Unexpected fields');
      }
    });
    
    it('should silently ignore prototype pollution attempts', async function() {
      const payload = {
        workout: '123',
        exercise_base: '456',
        reps: 10,
        weight: 100,
        date: new Date().toISOString(),
        '__proto__': { isAdmin: true },
        'constructor': { isAdmin: true },
        'prototype': { isAdmin: true }
      };
      
      mockApiClient.post.resolves({ id: 1 });
      await workoutOperations.createWorkoutLog(mockApiClient, payload);
      
      const calledWith = mockApiClient.post.firstCall.args[1];
      // Prototype pollution fields should not be in the output as own properties
      calledWith.should.not.have.ownProperty('__proto__');
      calledWith.should.not.have.ownProperty('constructor');
      calledWith.should.not.have.ownProperty('prototype');
    });
  });
});