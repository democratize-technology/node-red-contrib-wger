/**
 * @fileoverview HTTP client wrapper for the wger fitness API
 * @module utils/api-client
 * @requires axios
 * @requires ./constants
 * @version 1.0.0
 * @author Node-RED wger contrib team
 */

const axios = require('axios');
const { API, STATUS, ERRORS } = require('./constants');
const RetryPolicy = require('./retry-policy');
const { CircuitBreaker } = require('./circuit-breaker');

/**
 * HTTP client for interacting with the wger fitness API.
 * Provides a unified interface for all API operations with automatic
 * path parameter replacement, error enhancement, authentication handling,
 * and configurable retry logic with circuit breaker pattern.
 * 
 * @class WgerApiClient
 * @example
 * // Initialize client with authentication
 * const client = new WgerApiClient('https://wger.de', { Authorization: 'Token abc123' });
 * 
 * // Initialize client with retry configuration
 * const client = new WgerApiClient('https://wger.de', { Authorization: 'Token abc123' }, {
 *   retry: { maxAttempts: 5, baseDelayMs: 500 },
 *   circuitBreaker: { failureThreshold: 10 }
 * });
 * 
 * // Make a GET request
 * const exercises = await client.get('/api/v2/exercise/', { search: 'bench press' });
 * 
 * // Make a POST request with path parameter
 * const result = await client.post('/api/v2/workout/{id}/log', logData, { id: 123 });
 */
class WgerApiClient {
  /**
   * Creates a new WgerApiClient instance
   * @constructor
   * @param {string} apiUrl - Base URL of the wger API (e.g., 'https://wger.de')
   * @param {Object} authHeader - Authentication headers object (e.g., { Authorization: 'Token ...' })
   * @param {Object} [resilience={}] - Resilience configuration for retry and circuit breaker
   * @param {Object} [resilience.retry] - Retry policy configuration
   * @param {Object} [resilience.circuitBreaker] - Circuit breaker configuration
   */
  constructor(apiUrl, authHeader, resilience = {}) {
    this.apiUrl = apiUrl;
    this.authHeader = authHeader;
    
    // Initialize retry policy if configuration provided
    this.retryPolicy = resilience.retry ? new RetryPolicy(resilience.retry) : null;
    
    // Initialize circuit breaker if configuration provided
    this.circuitBreaker = resilience.circuitBreaker ? new CircuitBreaker(resilience.circuitBreaker) : null;
  }

  /**
   * Makes an HTTP request to the wger API with automatic path parameter replacement,
   * enhanced error handling, and configurable retry logic with circuit breaker pattern.
   * 
   * @async
   * @param {string} method - HTTP method (GET, POST, PUT, PATCH, DELETE)
   * @param {string} endpoint - API endpoint path (may contain {param} placeholders)
   * @param {*} [data=null] - Request body data (for POST, PUT, PATCH requests)
   * @param {Object} [params=null] - URL parameters and path parameters
   * @returns {Promise<*>} Response data from the API
   * @throws {Error} Enhanced error with status code and response data
   * 
   * @example
   * // GET request with query parameters
   * const result = await client.makeRequest('GET', '/api/v2/exercise/', null, { search: 'squat', limit: 10 });
   * 
   * @example
   * // POST request with path parameter replacement
   * const result = await client.makeRequest('POST', '/api/v2/workout/{workoutId}/day', dayData, { workoutId: 123 });
   * // The {workoutId} placeholder will be replaced with 123
   */
  async makeRequest(method, endpoint, data = null, params = null) {
    // Replace path parameters if present
    if (params && typeof endpoint === 'string') {
      Object.keys(params).forEach((param) => {
        if (endpoint.includes(`{${param}}`)) {
          endpoint = endpoint.replace(`{${param}}`, params[param]);
          delete params[param];
        }
      });
    }

    const config = {
      method,
      url: `${this.apiUrl}${endpoint}`,
      headers: {
        ...this.authHeader,
        'Content-Type': API.HEADERS.CONTENT_TYPE,
      },
      params: method === 'GET' ? params : undefined,
      data: method !== 'GET' ? data : undefined,
      timeout: API.CONNECTION_TIMEOUT,
    };

    // If no resilience features configured, use original behavior
    if (!this.retryPolicy && !this.circuitBreaker) {
      return this._makeRequestWithoutRetry(config);
    }

    // Use resilience-enabled request
    return this._makeRequestWithResilience(config);
  }

  /**
   * Makes a request without retry logic (original behavior).
   * 
   * @private
   * @param {Object} config - Axios request configuration
   * @returns {Promise<*>} Response data from the API
   * @throws {Error} Enhanced error with status code and response data
   */
  async _makeRequestWithoutRetry(config) {
    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      throw this._enhanceError(error);
    }
  }

  /**
   * Makes a request with retry logic and circuit breaker pattern.
   * 
   * @private
   * @param {Object} config - Axios request configuration
   * @returns {Promise<*>} Response data from the API
   * @throws {Error} Enhanced error with status code and response data
   */
  async _makeRequestWithResilience(config) {
    // Check circuit breaker first
    if (this.circuitBreaker && !this.circuitBreaker.canExecute()) {
      throw this.circuitBreaker.createCircuitOpenError();
    }

    let lastError;
    const maxAttempts = this.retryPolicy ? this.retryPolicy.maxAttempts : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await axios(config);
        
        // Record success for circuit breaker
        if (this.circuitBreaker) {
          this.circuitBreaker.onSuccess();
        }
        
        return response.data;
      } catch (error) {
        lastError = this._enhanceError(error);
        
        // Record failure for circuit breaker
        if (this.circuitBreaker) {
          this.circuitBreaker.onFailure();
        }

        // Determine if we should retry
        const shouldRetry = this.retryPolicy && 
                           this.retryPolicy.shouldRetry(lastError, attempt) &&
                           attempt < maxAttempts;

        if (!shouldRetry) {
          // Add retry information to the final error
          if (attempt > 1) {
            lastError.message = `${lastError.message} (failed after ${attempt} attempts)`;
            lastError.attemptCount = attempt;
          }
          throw lastError;
        }

        // Wait before next retry
        await this.retryPolicy.delay(attempt);
      }
    }

    // This should never be reached, but just in case
    throw lastError;
  }

  /**
   * Enhances an axios error with additional context and consistent format.
   * 
   * @private
   * @param {Error} error - Original axios error
   * @returns {Error} Enhanced error with status code and response data
   */
  _enhanceError(error) {
    if (error.response) {
      // HTTP response error (4xx, 5xx)
      const enhancedError = new Error(
        error.response.data.detail || error.response.statusText || STATUS.MESSAGES.API_REQUEST_FAILED,
      );
      enhancedError.status = error.response.status;
      enhancedError.data = error.response.data;
      enhancedError.name = 'HttpResponseError';
      return enhancedError;
    } else if (error.request) {
      // Network error (no response received)
      const enhancedError = new Error(STATUS.MESSAGES.NO_RESPONSE);
      enhancedError.code = error.code;
      enhancedError.name = 'NetworkError';
      return enhancedError;
    } else {
      // Request setup error
      error.name = error.name || 'RequestSetupError';
      return error;
    }
  }

  /**
   * Performs a GET request to the wger API
   * @async
   * @param {string} endpoint - API endpoint path
   * @param {Object} [params=null] - URL query parameters
   * @returns {Promise<*>} Response data from the API
   * @throws {Error} Enhanced error with status and response details
   * @example
   * // Get list of exercises with search
   * const exercises = await client.get('/api/v2/exercise/', { search: 'bench', limit: 10 });
   */
  async get(endpoint, params = null) {
    return this.makeRequest('GET', endpoint, null, params);
  }

  /**
   * Performs a POST request to the wger API
   * @async
   * @param {string} endpoint - API endpoint path
   * @param {*} [data=null] - Request body data
   * @param {Object} [params=null] - URL parameters (including path parameters)
   * @returns {Promise<*>} Response data from the API
   * @throws {Error} Enhanced error with status and response details
   * @example
   * // Create a new workout
   * const workout = await client.post('/api/v2/workout/', { name: 'Monday Routine' });
   */
  async post(endpoint, data = null, params = null) {
    return this.makeRequest('POST', endpoint, data, params);
  }

  /**
   * Performs a PUT request to the wger API
   * @async
   * @param {string} endpoint - API endpoint path
   * @param {*} [data=null] - Request body data
   * @param {Object} [params=null] - URL parameters (including path parameters)
   * @returns {Promise<*>} Response data from the API
   * @throws {Error} Enhanced error with status and response details
   * @example
   * // Full update of a workout
   * const updated = await client.put('/api/v2/workout/{id}/', workoutData, { id: 123 });
   */
  async put(endpoint, data = null, params = null) {
    return this.makeRequest('PUT', endpoint, data, params);
  }

  /**
   * Performs a PATCH request to the wger API
   * @async
   * @param {string} endpoint - API endpoint path
   * @param {*} [data=null] - Request body data with partial updates
   * @param {Object} [params=null] - URL parameters (including path parameters)
   * @returns {Promise<*>} Response data from the API
   * @throws {Error} Enhanced error with status and response details
   * @example
   * // Partial update of a workout
   * const updated = await client.patch('/api/v2/workout/{id}/', { name: 'New Name' }, { id: 123 });
   */
  async patch(endpoint, data = null, params = null) {
    return this.makeRequest('PATCH', endpoint, data, params);
  }

  /**
   * Performs a DELETE request to the wger API
   * @async
   * @param {string} endpoint - API endpoint path
   * @param {Object} [params=null] - URL parameters (including path parameters)
   * @returns {Promise<*>} Response data from the API (usually empty for DELETE)
   * @throws {Error} Enhanced error with status and response details
   * @example
   * // Delete a workout
   * await client.delete('/api/v2/workout/{id}/', { id: 123 });
   */
  async delete(endpoint, params = null) {
    return this.makeRequest('DELETE', endpoint, null, params);
  }
}

module.exports = WgerApiClient;
