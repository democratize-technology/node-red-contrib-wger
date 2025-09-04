const sinon = require('sinon');
const proxyquire = require('proxyquire');

/**
 * Test helper utilities that provide proper test isolation
 * without global mocking that affects other tests
 */
class TestHelper {
  constructor() {
    this.mocks = new Map();
  }

  /**
   * Create an isolated mock for the WgerApiClient
   * @returns {Object} Mock API client with all methods stubbed
   */
  createApiClientMock() {
    const mock = {
      get: sinon.stub(),
      post: sinon.stub(), 
      put: sinon.stub(),
      patch: sinon.stub(),
      delete: sinon.stub(),
      makeRequest: sinon.stub()
    };
    
    return mock;
  }

  /**
   * Create a constructor mock that returns the provided instance
   * @param {Object} instance - The mock instance to return
   * @returns {Function} Constructor stub
   */
  createApiClientConstructorMock(instance) {
    return sinon.stub().returns(instance);
  }

  /**
   * Load a node module with mocked dependencies using proxyquire
   * @param {string} modulePath - Path to module to load
   * @param {Object} mocks - Map of dependency paths to mock objects
   * @returns {*} The loaded module with mocked dependencies
   */
  loadWithMocks(modulePath, mocks = {}) {
    return proxyquire(modulePath, mocks);
  }

  /**
   * Create common API error scenarios for testing
   * @returns {Object} Map of error scenarios
   */
  createErrorScenarios() {
    return {
      networkError: {
        request: {},
        message: 'Network Error'
      },
      timeoutError: {
        code: 'ECONNABORTED',
        message: 'timeout of 5000ms exceeded'
      },
      notFound: {
        response: {
          status: 404,
          statusText: 'Not Found',
          data: { detail: 'Resource not found' }
        }
      },
      unauthorized: {
        response: {
          status: 401,
          statusText: 'Unauthorized', 
          data: { detail: 'Invalid authentication credentials' }
        }
      },
      forbidden: {
        response: {
          status: 403,
          statusText: 'Forbidden',
          data: { detail: 'Permission denied' }
        }
      },
      rateLimited: {
        response: {
          status: 429,
          statusText: 'Too Many Requests',
          data: { detail: 'Rate limit exceeded' }
        }
      },
      serverError: {
        response: {
          status: 500,
          statusText: 'Internal Server Error',
          data: { error: 'Internal server error occurred' }
        }
      },
      badGateway: {
        response: {
          status: 502,
          statusText: 'Bad Gateway',
          data: {}
        }
      },
      malformedJson: {
        response: {
          status: 200,
          statusText: 'OK',
          data: 'this is not json'
        }
      }
    };
  }

  /**
   * Create mock responses for successful scenarios
   * @returns {Object} Map of success scenarios
   */
  createSuccessScenarios() {
    return {
      exerciseList: {
        count: 2,
        results: [
          { id: 1, name: 'Push-ups', category: 'Chest' },
          { id: 2, name: 'Squats', category: 'Legs' }
        ]
      },
      singleExercise: {
        id: 1,
        name: 'Push-ups',
        description: 'Classic push-up exercise',
        category: { id: 1, name: 'Chest' },
        muscles: [{ id: 1, name: 'Pectoral' }]
      },
      workoutList: {
        count: 1,
        results: [
          { id: 1, name: 'Monday Workout', creation_date: '2024-01-01' }
        ]
      },
      emptyList: {
        count: 0,
        results: []
      }
    };
  }

  /**
   * Setup common test scenarios with pre-configured responses
   * @param {Object} apiMock - The API client mock
   * @param {string} scenario - The scenario name
   */
  setupScenario(apiMock, scenario) {
    const errors = this.createErrorScenarios();
    const success = this.createSuccessScenarios();

    switch (scenario) {
    case 'network-failure':
      apiMock.get.rejects(errors.networkError);
      apiMock.post.rejects(errors.networkError);
      break;

    case 'timeout':
      apiMock.get.rejects(errors.timeoutError);
      break;

    case 'unauthorized':
      apiMock.get.rejects(errors.unauthorized);
      apiMock.post.rejects(errors.unauthorized);
      break;

    case 'rate-limited':
      apiMock.get.rejects(errors.rateLimited);
      break;

    case 'server-error':
      apiMock.get.rejects(errors.serverError);
      break;

    case 'success-with-data':
      apiMock.get.resolves(success.exerciseList);
      apiMock.post.resolves(success.singleExercise);
      break;

    case 'empty-results':
      apiMock.get.resolves(success.emptyList);
      break;

    default:
      throw new Error(`Unknown scenario: ${scenario}`);
    }
  }

  /**
   * Clean up all mocks and stubs
   */
  cleanup() {
    sinon.restore();
    this.mocks.clear();
  }
}

// Export singleton instance for convenience
const testHelper = new TestHelper();

module.exports = {
  TestHelper,
  testHelper,
  
  // Backward compatibility (deprecated - use testHelper instance)
  createApiClientMock: () => testHelper.createApiClientMock(),
  resetMocks: () => testHelper.cleanup()
};
