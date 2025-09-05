/**
 * @fileoverview HTTP client wrapper for the wger fitness API
 * @module utils/api-client
 * @requires ./constants
 * @version 1.0.0
 * @author Node-RED wger contrib team
 */

// Use native Node.js fetch (available in Node 18+, this project requires Node 20+)
const { wrap } = require('cockatiel');
const { API, STATUS } = require('./constants');
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
    
    // Create combined Cockatiel policy for efficient execution
    this._createCombinedPolicy();
  }

  /**
   * Creates a combined Cockatiel policy that wraps retry and circuit breaker together.
   * This provides better performance than sequential application of policies.
   * 
   * @private
   */
  _createCombinedPolicy() {
    if (!this.retryPolicy && !this.circuitBreaker) {
      this._combinedPolicy = null;
      return;
    }

    // Build resilience policies array immutably
    const policies = [
      ...(this.retryPolicy ? [this.retryPolicy.getCockatielPolicy()] : []),
      ...(this.circuitBreaker ? [this.circuitBreaker.getCockatielPolicy()] : [])
    ];

    // Wrap policies together for efficient execution
    this._combinedPolicy = policies.length > 1 
      ? wrap(...policies)
      : policies[0];
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
        'Content-Type': API.HEADERS.CONTENT_TYPE
      },
      params: method === 'GET' ? params : undefined,
      data: method !== 'GET' ? data : undefined,
      timeout: API.CONNECTION_TIMEOUT
    };

    // If no resilience features configured, use original behavior
    if (!this._combinedPolicy) {
      return this._makeRequestWithoutRetry(config);
    }

    // Use Cockatiel policies for resilience
    return this._makeRequestWithCockatiel(config);
  }

  /**
   * Makes a request without retry logic (original behavior).
   * 
   * @private
   * @param {Object} config - Request configuration (axios-compatible format)
   * @returns {Promise<*>} Response data from the API
   * @throws {Error} Enhanced error with status code and response data
   */
  async _makeRequestWithoutRetry(config) {
    try {
      const response = await this._fetchWithConfig(config);
      return response.data;
    } catch (error) {
      throw this._enhanceError(error);
    }
  }

  /**
   * Makes a request with Cockatiel resilience policies (retry and circuit breaker).
   * 
   * @private
   * @param {Object} config - Request configuration (axios-compatible format)
   * @returns {Promise<*>} Response data from the API
   * @throws {Error} Enhanced error with status code and response data
   */
  async _makeRequestWithCockatiel(config) {
    try {
      const response = await this._combinedPolicy.execute(async () => {
        const response = await this._fetchWithConfig(config);
        return response;
      });
      
      return response.data;
    } catch (error) {
      // Enhance error with our custom logic
      throw this._enhanceError(error);
    }
  }

  /**
   * Makes a fetch request using axios-compatible configuration.
   * 
   * @private
   * @param {Object} config - Request configuration in axios format
   * @returns {Promise<Object>} Response object with { data, status, statusText }
   * @throws {Error} Fetch error in axios-compatible format
   */
  async _fetchWithConfig(config) {
    const { method, url, headers, params, data, timeout } = config;
    
    // Build final URL with query parameters
    const finalUrl = this._buildRequestUrl(url, method, params);
    
    // Setup timeout controller
    const { controller, timeoutId } = this._createTimeoutController(timeout);
    
    try {
      // Build fetch options
      const options = this._setupRequestOptions(method, headers, data, controller.signal);
      
      const response = await fetch(finalUrl, options);
      
      // Clear timeout if request completed
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Handle non-2xx responses
      if (!response.ok) {
        const httpError = await this._createHttpError(response);
        throw httpError;
      }
      
      // Parse successful response
      const responseData = await this._parseResponseData(response);
      
      return {
        data: responseData,
        status: response.status,
        statusText: response.statusText
      };
      
    } catch (error) {
      // Clear timeout if error occurred
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      
      // Handle and transform various error types
      const transformedError = this._handleNetworkError(error);
      throw transformedError;
    }
  }

  /**
   * Builds the final URL with query parameters for GET requests.
   * 
   * @private
   * @param {string} url - Base URL
   * @param {string} method - HTTP method
   * @param {Object} params - URL parameters
   * @returns {string} Final URL with query string if needed
   */
  _buildRequestUrl(url, method, params) {
    if (method !== 'GET' || !params || Object.keys(params).length === 0) {
      return url;
    }
    
    const urlParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        urlParams.append(key, String(value));
      }
    });
    
    return `${url}?${urlParams.toString()}`;
  }

  /**
   * Creates AbortController with timeout for request cancellation.
   * 
   * @private
   * @param {number} timeout - Timeout in milliseconds
   * @returns {Object} Object with controller and timeoutId
   */
  _createTimeoutController(timeout) {
    const controller = new AbortController();
    let timeoutId = null;
    
    if (timeout && timeout > 0) {
      timeoutId = setTimeout(() => {
        controller.abort();
      }, timeout);
    }
    
    return { controller, timeoutId };
  }

  /**
   * Sets up fetch options including method, headers, body, and abort signal.
   * 
   * @private
   * @param {string} method - HTTP method
   * @param {Object} headers - Request headers
   * @param {*} data - Request body data
   * @param {AbortSignal} signal - Abort signal for timeout
   * @returns {Object} Fetch options object
   */
  _setupRequestOptions(method, headers, data, signal) {
    const options = {
      method,
      headers,
      signal
    };
    
    // Add body for non-GET requests
    if (method !== 'GET' && data !== null && data !== undefined) {
      options.body = JSON.stringify(data);
    }
    
    return options;
  }

  /**
   * Parses response data handling both JSON and text responses.
   * 
   * @private
   * @param {Response} response - Fetch response object
   * @returns {Promise<*>} Parsed response data
   */
  async _parseResponseData(response) {
    try {
      const text = await response.text();
      return text ? JSON.parse(text) : {};
    } catch {
      // If JSON parsing fails, return empty object
      return {};
    }
  }

  /**
   * Creates axios-compatible error object for HTTP errors.
   * 
   * @private
   * @param {Response} response - Failed response object
   * @returns {Promise<Error>} HTTP error with response data
   */
  async _createHttpError(response) {
    const error = new Error(`HTTP Error ${response.status}`);
    error.response = {
      status: response.status,
      statusText: response.statusText,
      data: {}
    };
    
    // Try to parse error response body
    try {
      const text = await response.text();
      if (text) {
        try {
          error.response.data = JSON.parse(text);
        } catch {
          error.response.data = { message: text };
        }
      }
    } catch {
      // Ignore errors reading response body
    }
    
    return error;
  }

  /**
   * Handles and transforms network errors into expected format.
   * 
   * @private
   * @param {Error} error - Original error
   * @returns {Error} Transformed error in expected format
   */
  _handleNetworkError(error) {
    // Handle AbortError (timeout or manual abort)
    if (error.name === 'AbortError') {
      const timeoutError = new Error('Request timed out');
      timeoutError.code = 'ETIMEDOUT';
      timeoutError.request = {};
      return timeoutError;
    }
    
    // Handle network/connection errors (but not AbortError which was handled above)
    if (error && error.name !== 'AbortError' && (error.cause || error.message?.includes('fetch') || error.code)) {
      const networkError = new Error('Network Error');
      networkError.code = error.code || 'ECONNREFUSED';
      networkError.request = {};
      return networkError;
    }
    
    // Re-throw other errors (including HTTP errors we created above)
    return error;
  }

  /**
   * Enhances a fetch error with additional context and consistent format.
   * 
   * @private
   * @param {Error} error - Original fetch error
   * @returns {Error} Enhanced error with status code and response data
   */
  _enhanceError(error) {
    if (error.response) {
      // HTTP response error (4xx, 5xx)
      const enhancedError = new Error(
        error.response.data.detail || error.response.statusText || STATUS.MESSAGES.API_REQUEST_FAILED
      );
      enhancedError.status = error.response.status;
      enhancedError.data = error.response.data;
      enhancedError.name = 'HttpResponseError';
      return enhancedError;
    } else if (error.request) {
      // Check if it's already a timeout error (has the right code and message)
      if (error.code === 'ETIMEDOUT' && error.message === 'Request timed out') {
        return error; // Already properly formatted timeout error
      }
      // Network error (no response received)
      const enhancedError = new Error(STATUS.MESSAGES.NO_RESPONSE);
      enhancedError.code = error.code;
      enhancedError.name = 'NetworkError';
      return enhancedError;
    } else {
      // Map Cockatiel circuit breaker errors to expected naming convention
      if (error.constructor && error.constructor.name === 'BrokenCircuitError') {
        error.name = 'CircuitBreakerOpenError';
        // Normalize message to match expected format
        error.message = 'Circuit breaker is open - too many recent failures';
        return error;
      }
      // Preserve other Cockatiel error types
      if (error.name && (error.name.includes('CircuitBreaker') || error.name.includes('Cockatiel'))) {
        return error;
      }
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
