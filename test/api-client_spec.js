const should = require('should');
const sinon = require('sinon');
const proxyquire = require('proxyquire');

describe('WgerApiClient', function () {
  let WgerApiClient;
  let client;
  let fetchStub;

  beforeEach(function () {
    fetchStub = sinon.stub();
    
    // Mock fetch globally since it's a native global
    global.fetch = fetchStub;
    
    WgerApiClient = require('../utils/api-client');
    client = new WgerApiClient('https://test.api', { Authorization: 'Token test-token' });
  });

  afterEach(function () {
    sinon.restore();
    delete global.fetch;
  });

  it('should create client with apiUrl and authHeader', function () {
    client.should.have.property('apiUrl', 'https://test.api');
    client.should.have.property('authHeader');
    client.authHeader.should.have.property('Authorization', 'Token test-token');
  });

  describe('makeRequest', function () {
    it('should make GET request with params', async function () {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(JSON.stringify({ success: true }))
      };
      fetchStub.resolves(mockResponse);
      
      const result = await client.makeRequest('GET', '/test', null, { id: 123 });
      
      result.should.have.property('success', true);
      fetchStub.should.have.been.calledOnce;
      const [url, options] = fetchStub.firstCall.args;
      url.should.equal('https://test.api/test?id=123');
      options.should.have.property('method', 'GET');
    });

    it('should make POST request with data', async function () {
      const mockResponse = {
        ok: true,
        status: 201,
        statusText: 'Created',
        text: () => Promise.resolve(JSON.stringify({ created: true }))
      };
      fetchStub.resolves(mockResponse);
      
      const result = await client.makeRequest('POST', '/test', { name: 'test' });
      
      result.should.have.property('created', true);
      fetchStub.should.have.been.calledOnce;
      const [url, options] = fetchStub.firstCall.args;
      url.should.equal('https://test.api/test');
      options.should.have.property('method', 'POST');
      options.should.have.property('body', JSON.stringify({ name: 'test' }));
    });

    it('should replace path parameters', async function () {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(JSON.stringify({ success: true }))
      };
      fetchStub.resolves(mockResponse);
      
      await client.makeRequest('GET', '/exercise/{id}', null, { id: 123 });
      
      const [url] = fetchStub.firstCall.args;
      url.should.equal('https://test.api/exercise/123');
    });

    it('should include auth headers', async function () {
      const mockResponse = {
        ok: true,
        status: 200,
        statusText: 'OK',
        text: () => Promise.resolve(JSON.stringify({ success: true }))
      };
      fetchStub.resolves(mockResponse);
      
      await client.makeRequest('GET', '/test');
      
      const [, options] = fetchStub.firstCall.args;
      options.should.have.property('headers');
      options.headers.should.have.property('Authorization', 'Token test-token');
      options.headers.should.have.property('Content-Type', 'application/json');
    });

    it('should handle error responses with detail', async function () {
      const mockResponse = {
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: () => Promise.resolve(JSON.stringify({ detail: 'Resource not found' }))
      };
      fetchStub.resolves(mockResponse);
      
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
      const mockResponse = {
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        text: () => Promise.resolve(JSON.stringify({}))
      };
      fetchStub.resolves(mockResponse);
      
      try {
        await client.makeRequest('GET', '/test');
        should.fail('Should have thrown error');
      } catch (error) {
        error.message.should.equal('Internal Server Error');
        error.should.have.property('status', 500);
      }
    });

    it('should handle network errors', async function () {
      const networkError = new Error('fetch failed');
      networkError.code = 'ECONNREFUSED';
      fetchStub.rejects(networkError);
      
      try {
        await client.makeRequest('GET', '/test');
        should.fail('Should have thrown error');
      } catch (error) {
        error.message.should.equal('No response received from server');
      }
    });

    it('should handle timeout errors', async function () {
      const timeoutError = new Error('The operation was aborted');
      timeoutError.name = 'AbortError';
      fetchStub.rejects(timeoutError);
      
      try {
        await client.makeRequest('GET', '/test');
        should.fail('Should have thrown error');
      } catch (error) {
        error.message.should.equal('Request timed out');
        error.should.have.property('code', 'ETIMEDOUT');
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
      
      makeRequestStub.calledWith('GET', '/test', null, { id: 123 }).should.be.true();
    });

    it('should call makeRequest with POST method', async function () {
      await client.post('/test', { name: 'test' }, { id: 123 });
      
      makeRequestStub.calledWith('POST', '/test', { name: 'test' }, { id: 123 }).should.be.true();
    });

    it('should call makeRequest with PUT method', async function () {
      await client.put('/test', { name: 'test' }, { id: 123 });
      
      makeRequestStub.calledWith('PUT', '/test', { name: 'test' }, { id: 123 }).should.be.true();
    });

    it('should call makeRequest with PATCH method', async function () {
      await client.patch('/test', { name: 'test' }, { id: 123 });
      
      makeRequestStub.calledWith('PATCH', '/test', { name: 'test' }, { id: 123 }).should.be.true();
    });

    it('should call makeRequest with DELETE method', async function () {
      await client.delete('/test', { id: 123 });
      
      makeRequestStub.calledWith('DELETE', '/test', null, { id: 123 }).should.be.true();
    });
  });
});
