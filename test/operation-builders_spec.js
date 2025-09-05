const should = require('should');
const OperationBuilders = require('../utils/operation-builders');
const sinon = require('sinon');

describe('OperationBuilders', function () {
  let client;

  beforeEach(function () {
    client = {
      get: sinon.stub(),
      post: sinon.stub(),
      put: sinon.stub(),
      patch: sinon.stub(),
      delete: sinon.stub()
    };
  });

  describe('listOperation', function () {
    it('should create a list operation handler', async function () {
      const handler = OperationBuilders.listOperation('/api/test/');
      client.get.resolves({ results: [] });

      const result = await handler(client, {});
      
      sinon.assert.calledOnce(client.get);
      sinon.assert.calledWith(client.get, '/api/test/', {});
      result.should.deepEqual({ results: [] });
    });

    it('should map payload properties to API parameters', async function () {
      const handler = OperationBuilders.listOperation('/api/test/', {
        limit: 'limit',
        offset: 'offset',
        filter: 'searchTerm'
      });
      client.get.resolves({ results: [] });

      const payload = { limit: 10, offset: 20, searchTerm: 'test' };
      await handler(client, payload);
      
      sinon.assert.calledOnce(client.get);
      sinon.assert.calledWith(client.get, '/api/test/', {
        limit: 10,
        offset: 20,
        filter: 'test'
      });
    });

    it('should support function transformers for parameters', async function () {
      const handler = OperationBuilders.listOperation('/api/test/', {
        ordering: payload => payload.order || 'default'
      });
      client.get.resolves({ results: [] });

      await handler(client, {});
      
      sinon.assert.calledOnce(client.get);
      sinon.assert.calledWith(client.get, '/api/test/', {
        ordering: 'default'
      });
    });
  });

  describe('getByIdOperation', function () {
    it('should create a get by ID operation handler', async function () {
      const handler = OperationBuilders.getByIdOperation('/api/test/{id}/', 'testId');
      client.get.resolves({ id: 123, name: 'Test' });

      const result = await handler(client, { testId: 123 });
      
      sinon.assert.calledOnce(client.get);
      sinon.assert.calledWith(client.get, '/api/test/123/');
      result.should.deepEqual({ id: 123, name: 'Test' });
    });

    it('should throw error when ID is missing', async function () {
      const handler = OperationBuilders.getByIdOperation('/api/test/{id}/', 'testId');

      try {
        await handler(client, {});
        should.fail('Should have thrown error');
      } catch (error) {
        error.message.should.equal('testId is required');
      }
    });
  });

  describe('createOperation', function () {
    it('should create a create operation handler', async function () {
      const handler = OperationBuilders.createOperation('/api/test/');
      client.post.resolves({ id: 1, created: true });

      const payload = { name: 'Test', value: 42 };
      const result = await handler(client, payload);
      
      sinon.assert.calledOnce(client.post);
      sinon.assert.calledWith(client.post, '/api/test/', payload);
      result.should.deepEqual({ id: 1, created: true });
    });

    it('should support payload transformation', async function () {
      const transformer = (payload) => ({
        ...payload,
        timestamp: '2024-01-01'
      });
      const handler = OperationBuilders.createOperation('/api/test/', transformer);
      client.post.resolves({ id: 1 });

      await handler(client, { name: 'Test' });
      
      sinon.assert.calledOnce(client.post);
      sinon.assert.calledWith(client.post, '/api/test/', {
        name: 'Test',
        timestamp: '2024-01-01'
      });
    });
  });

  describe('updateOperation', function () {
    it('should create an update operation handler', async function () {
      const handler = OperationBuilders.updateOperation('/api/test/{id}/', 'itemId');
      client.patch.resolves({ id: 1, updated: true });

      const payload = { itemId: 1, name: 'Updated', value: 100 };
      const result = await handler(client, payload);
      
      sinon.assert.calledOnce(client.patch);
      sinon.assert.calledWith(client.patch, '/api/test/1/', {
        name: 'Updated',
        value: 100
      });
      result.should.deepEqual({ id: 1, updated: true });
    });

    it('should support PUT method', async function () {
      const handler = OperationBuilders.updateOperation('/api/test/{id}/', 'itemId', 'put');
      client.put.resolves({ id: 1 });

      await handler(client, { itemId: 1, name: 'Test' });
      
      sinon.assert.calledOnce(client.put);
      sinon.assert.notCalled(client.patch);
    });

    it('should remove ID field from update data', async function () {
      const handler = OperationBuilders.updateOperation('/api/test/{id}/', 'itemId');
      client.patch.resolves({});

      await handler(client, { itemId: 1, name: 'Test' });
      
      const updateData = client.patch.firstCall.args[1];
      updateData.should.not.have.property('itemId');
      updateData.should.have.property('name', 'Test');
    });
  });

  describe('deleteOperation', function () {
    it('should create a delete operation handler', async function () {
      const handler = OperationBuilders.deleteOperation('/api/test/{id}/', 'itemId');
      client.delete.resolves({});

      const _result = await handler(client, { itemId: 42 });
      
      sinon.assert.calledOnce(client.delete);
      sinon.assert.calledWith(client.delete, '/api/test/42/');
    });

    it('should validate required ID field', async function () {
      const handler = OperationBuilders.deleteOperation('/api/test/{id}/', 'itemId');

      try {
        await handler(client, {});
        should.fail('Should have thrown error');
      } catch (error) {
        error.message.should.equal('itemId is required');
      }
    });
  });

  describe('customOperation', function () {
    it('should create a custom operation with validation', async function () {
      const customHandler = async (client, payload) => {
        return { custom: true, data: payload.value };
      };
      
      const handler = OperationBuilders.customOperation(['value'], customHandler);
      
      const result = await handler(client, { value: 'test' });
      result.should.deepEqual({ custom: true, data: 'test' });
    });

    it('should validate required fields', async function () {
      const customHandler = async (_client, _payload) => ({ success: true });
      const handler = OperationBuilders.customOperation(['field1', 'field2'], customHandler);

      try {
        await handler(client, { field1: 'value' });
        should.fail('Should have thrown error');
      } catch (error) {
        error.message.should.equal('field2 is required');
      }
    });

    it('should work without required fields', async function () {
      const customHandler = async (_client, _payload) => ({ result: 'ok' });
      const handler = OperationBuilders.customOperation(null, customHandler);
      
      const result = await handler(client, {});
      result.should.deepEqual({ result: 'ok' });
    });
  });

  describe('searchOperation', function () {
    it('should create a search operation handler', async function () {
      const handler = OperationBuilders.searchOperation('/api/search/', 'query');
      client.get.resolves({ results: [] });

      await handler(client, { query: 'test search' });
      
      sinon.assert.calledOnce(client.get);
      sinon.assert.calledWith(client.get, '/api/search/', {
        query: 'test search'
      });
    });

    it('should include additional parameters', async function () {
      const handler = OperationBuilders.searchOperation('/api/search/', 'term', {
        language: 'en',
        limit: 10
      });
      client.get.resolves({ results: [] });

      await handler(client, { term: 'test', language: 'de', limit: 20 });
      
      sinon.assert.calledOnce(client.get);
      sinon.assert.calledWith(client.get, '/api/search/', {
        term: 'test',
        language: 'de',
        limit: 20
      });
    });

    it('should validate search field', async function () {
      const handler = OperationBuilders.searchOperation('/api/search/', 'searchTerm');

      try {
        await handler(client, { wrongField: 'test' });
        should.fail('Should have thrown error');
      } catch (error) {
        error.message.should.equal('searchTerm is required');
      }
    });
  });
});