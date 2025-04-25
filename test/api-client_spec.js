const should = require('should');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('WgerApiClient', function () {
  let WgerApiClient;
  let client;
  let axiosStub;

  beforeEach(function () {
    axiosStub = sinon.stub();
    WgerApiClient = proxyquire('../utils/api-client', {
      'axios': axiosStub
    });
    client = new WgerApiClient('https://test.api', { Authorization: 'Token test-token' });
  });

  afterEach(function () {
    sinon.restore();
  });

  it('should create client with apiUrl and authHeader', function () {
    client.should.have.property('apiUrl', 'https://test.api');
    client.should.have.property('authHeader');
    client.authHeader.should.have.property('Authorization', 'Token test-token');
  });

  describe('makeRequest', function () {
    it('should make GET request with params', async function () {
      axiosStub.resolves({ data: { success: true } });
      
      const result = await client.makeRequest('GET', '/test', null, { id: 123 });
      
      result.should.have.property('success', true);
      axiosStub.should.have.been.calledOnce;
      const callArgs = axiosStub.firstCall.args[0];
      callArgs.should.have.property('method', 'GET');
      callArgs.should.have.property('url', 'https://test.api/test');
      callArgs.should.have.property('params');
      callArgs.params.should.have.property('id', 123);
    });

    it('should make POST request with data', async function () {
      axiosStub.resolves({ data: { created: true } });
      
      const result = await client.makeRequest('POST', '/test', { name: 'test' });
      
      result.should.have.property('created', true);
      axiosStub.should.have.been.calledOnce;
      const callArgs = axiosStub.firstCall.args[0];
      callArgs.should.have.property('method', 'POST');
      callArgs.should.have.property('data');
      callArgs.data.should.have.property('name', 'test');
    });

    it('should replace path parameters', async function () {
      axiosStub.resolves({ data: { success: true } });
      
      await client.makeRequest('GET', '/exercise/{id}', null, { id: 123 });
      
      const callArgs = axiosStub.firstCall.args[0];
      callArgs.should.have.property('url', 'https://test.api/exercise/123');
      callArgs.should.have.property('params');
      Object.keys(callArgs.params).length.should.equal(0);
    });

    it('should include auth headers', async function () {
      axiosStub.resolves({ data: { success: true } });
      
      await client.makeRequest('GET', '/test');
      
      const callArgs = axiosStub.firstCall.args[0];
      callArgs.should.have.property('headers');
      callArgs.headers.should.have.property('Authorization', 'Token test-token');
      callArgs.headers.should.have.property('Content-Type', 'application/json');
    });

    it('should handle error responses with detail', async function () {
      axiosStub.rejects({
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { detail: 'Resource not found' }
        }
      });
      
      try {
        await client.makeRequest('GET', '/test');
        should.fail('Should have thrown error');
      } catch (error) {
        error.message.should.equal('Resource not found');
        error.should.have.property('status', 404);
        error.should.have.property('data');
      }
    });

    it('should handle error responses without detail', async function () {
      axiosStub.rejects({
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: {}
        }
      });
      
      try {
        await client.makeRequest('GET', '/test');
        should.fail('Should have thrown error');
      } catch (error) {
        error.message.should.equal('Internal Server Error');
        error.should.have.property('status', 500);
      }
    });

    it('should handle network errors', async function () {
      axiosStub.rejects({
        request: {}
      });
      
      try {
        await client.makeRequest('GET', '/test');
        should.fail('Should have thrown error');
      } catch (error) {
        error.message.should.equal('No response received from server');
      }
    });

    it('should handle other errors', async function () {
      const originalError = new Error('Something went wrong');
      axiosStub.rejects(originalError);
      
      try {
        await client.makeRequest('GET', '/test');
        should.fail('Should have thrown error');
      } catch (error) {
        error.should.equal(originalError);
      }
    });
  });

  describe('convenience methods', function () {
    let makeRequestStub;

    beforeEach(function () {
      makeRequestStub = sinon.stub(client, 'makeRequest').resolves({ success: true });
    });

    it('should call makeRequest with GET method', async function () {
      await client.get('/test', { id: 123 });
      
      makeRequestStub.should.have.been.calledWith('GET', '/test', null, { id: 123 });
    });

    it('should call makeRequest with POST method', async function () {
      await client.post('/test', { name: 'test' }, { id: 123 });
      
      makeRequestStub.should.have.been.calledWith('POST', '/test', { name: 'test' }, { id: 123 });
    });

    it('should call makeRequest with PUT method', async function () {
      await client.put('/test', { name: 'test' }, { id: 123 });
      
      makeRequestStub.should.have.been.calledWith('PUT', '/test', { name: 'test' }, { id: 123 });
    });

    it('should call makeRequest with PATCH method', async function () {
      await client.patch('/test', { name: 'test' }, { id: 123 });
      
      makeRequestStub.should.have.been.calledWith('PATCH', '/test', { name: 'test' }, { id: 123 });
    });

    it('should call makeRequest with DELETE method', async function () {
      await client.delete('/test', { id: 123 });
      
      makeRequestStub.should.have.been.calledWith('DELETE', '/test', null, { id: 123 });
    });
  });
});
