const sinon = require('sinon');

// Mock WgerApiClient for all tests
const mockApiClient = {
  get: sinon.stub(),
  post: sinon.stub(),
  put: sinon.stub(),
  patch: sinon.stub(),
  delete: sinon.stub()
};

// Mock the WgerApiClient constructor
const WgerApiClientMock = sinon.stub().returns(mockApiClient);

// Replace the actual WgerApiClient with our mock
require.cache[require.resolve('../utils/api-client')] = {
  exports: WgerApiClientMock
};

module.exports = {
  WgerApiClientMock,
  mockApiClient,
  
  resetMocks: function() {
    Object.values(mockApiClient).forEach(stub => stub.reset());
  }
};
