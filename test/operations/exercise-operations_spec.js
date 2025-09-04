const should = require('should');
const exerciseOperations = require('../../nodes/operations/exercise-operations');
const sinon = require('sinon');

describe('Exercise Operations', function () {
  let client;

  beforeEach(function () {
    client = {
      get: sinon.stub(),
      post: sinon.stub(),
      patch: sinon.stub(),
      delete: sinon.stub()
    };
  });

  describe('listExercises', function () {
    it('should list exercises with default language', async function () {
      client.get.resolves({ results: [] });

      await exerciseOperations.listExercises(client, {});
      
      sinon.assert.calledOnce(client.get);
      sinon.assert.calledWith(client.get, '/api/v2/exercisebaseinfo/', {
        language: 'en'
      });
    });

    it('should pass through filter parameters', async function () {
      client.get.resolves({ results: [] });

      await exerciseOperations.listExercises(client, {
        limit: 10,
        offset: 20,
        muscles: '1,2',
        equipment: '3',
        category: '10'
      });
      
      sinon.assert.calledOnce(client.get);
      sinon.assert.calledWith(client.get, '/api/v2/exercisebaseinfo/', {
        limit: 10,
        offset: 20,
        language: 'en',
        muscles: '1,2',
        equipment: '3',
        category: '10'
      });
    });

    it('should use custom language when provided', async function () {
      client.get.resolves({ results: [] });

      await exerciseOperations.listExercises(client, { language: 'de' });
      
      sinon.assert.calledOnce(client.get);
      sinon.assert.calledWith(client.get, '/api/v2/exercisebaseinfo/', {
        language: 'de'
      });
    });
  });

  describe('searchExercises', function () {
    it('should search exercises with term', async function () {
      client.get.resolves({ suggestions: [] });

      await exerciseOperations.searchExercises(client, { term: 'bench press' });
      
      sinon.assert.calledOnce(client.get);
      sinon.assert.calledWith(client.get, '/api/v2/exercise/search/', {
        term: 'bench press',
        language: 'en'
      });
    });

    it('should validate required term field', async function () {
      try {
        await exerciseOperations.searchExercises(client, {});
        should.fail('Should have thrown error');
      } catch (error) {
        error.message.should.match(/term.*is missing or null|term.*failed/);
      }
    });

    it('should use custom language', async function () {
      client.get.resolves({ suggestions: [] });

      await exerciseOperations.searchExercises(client, { 
        term: 'test', 
        language: 'fr' 
      });
      
      sinon.assert.calledOnce(client.get);
      sinon.assert.calledWith(client.get, '/api/v2/exercise/search/', {
        term: 'test',
        language: 'fr'
      });
    });
  });

  describe('getExercise', function () {
    it('should get exercise by ID', async function () {
      client.get.resolves({ id: 1, name: 'Bench Press' });

      const result = await exerciseOperations.getExercise(client, { exerciseId: 1 });
      
      sinon.assert.calledOnce(client.get);
      sinon.assert.calledWith(client.get, '/api/v2/exercisebaseinfo/1/');
      result.should.deepEqual({ id: 1, name: 'Bench Press' });
    });

    it('should validate required exerciseId', async function () {
      try {
        await exerciseOperations.getExercise(client, {});
        should.fail('Should have thrown error');
      } catch (error) {
        error.message.should.match(/exerciseId.*is missing or null|exerciseId.*failed/);
      }
    });
  });

  describe('getExerciseByBarcode', function () {
    it('should search by barcode', async function () {
      client.get.resolves({ results: [] });

      await exerciseOperations.getExerciseByBarcode(client, { barcode: '123456789' });
      
      sinon.assert.calledOnce(client.get);
      sinon.assert.calledWith(client.get, '/api/v2/exercise/search/', {
        term: '123456789',
        type: 'barcode'
      });
    });

    it('should validate required barcode', async function () {
      try {
        await exerciseOperations.getExerciseByBarcode(client, {});
        should.fail('Should have thrown error');
      } catch (error) {
        error.message.should.match(/barcode.*is missing or null|barcode.*failed/);
      }
    });
  });

  describe('getExerciseImages', function () {
    it('should get images for exercise', async function () {
      client.get.resolves({ results: [] });

      await exerciseOperations.getExerciseImages(client, { exerciseId: 42 });
      
      sinon.assert.calledOnce(client.get);
      sinon.assert.calledWith(client.get, '/api/v2/exerciseimage/', {
        exercise_base: 42
      });
    });

    it('should validate required exerciseId', async function () {
      try {
        await exerciseOperations.getExerciseImages(client, {});
        should.fail('Should have thrown error');
      } catch (error) {
        error.message.should.match(/exerciseId.*is missing or null|exerciseId.*failed/);
      }
    });
  });

  describe('getExerciseComments', function () {
    it('should get comments for exercise', async function () {
      client.get.resolves({ results: [] });

      await exerciseOperations.getExerciseComments(client, { exerciseId: 10 });
      
      sinon.assert.calledOnce(client.get);
      sinon.assert.calledWith(client.get, '/api/v2/exercisecomment/', {
        exercise: 10
      });
    });

    it('should validate required exerciseId', async function () {
      try {
        await exerciseOperations.getExerciseComments(client, {});
        should.fail('Should have thrown error');
      } catch (error) {
        error.message.should.match(/exerciseId.*is missing or null|exerciseId.*failed/);
      }
    });
  });

  describe('Reference data operations', function () {
    it('should get exercise categories', async function () {
      client.get.resolves({ results: [] });

      await exerciseOperations.getExerciseCategories(client, {});
      
      sinon.assert.calledOnce(client.get);
      sinon.assert.calledWith(client.get, '/api/v2/exercisecategory/', {});
    });

    it('should get muscles', async function () {
      client.get.resolves({ results: [] });

      await exerciseOperations.getMuscles(client, {});
      
      sinon.assert.calledOnce(client.get);
      sinon.assert.calledWith(client.get, '/api/v2/muscle/', {});
    });

    it('should get equipment', async function () {
      client.get.resolves({ results: [] });

      await exerciseOperations.getEquipment(client, {});
      
      sinon.assert.calledOnce(client.get);
      sinon.assert.calledWith(client.get, '/api/v2/equipment/', {});
    });
  });
});