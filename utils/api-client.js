const axios = require('axios');

class WgerApiClient {
  constructor(apiUrl, authHeader) {
    this.apiUrl = apiUrl;
    this.authHeader = authHeader;
  }

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
        'Content-Type': 'application/json',
      },
      params: method === 'GET' ? params : undefined,
      data: method !== 'GET' ? data : undefined,
    };

    try {
      const response = await axios(config);
      return response.data;
    } catch (error) {
      // Enhance error with more context
      if (error.response) {
        const enhancedError = new Error(
          error.response.data.detail || error.response.statusText || 'API request failed',
        );
        enhancedError.status = error.response.status;
        enhancedError.data = error.response.data;
        throw enhancedError;
      } else if (error.request) {
        throw new Error('No response received from server');
      } else {
        throw error;
      }
    }
  }

  // Convenience methods for common HTTP verbs
  async get(endpoint, params = null) {
    return this.makeRequest('GET', endpoint, null, params);
  }

  async post(endpoint, data = null, params = null) {
    return this.makeRequest('POST', endpoint, data, params);
  }

  async put(endpoint, data = null, params = null) {
    return this.makeRequest('PUT', endpoint, data, params);
  }

  async patch(endpoint, data = null, params = null) {
    return this.makeRequest('PATCH', endpoint, data, params);
  }

  async delete(endpoint, params = null) {
    return this.makeRequest('DELETE', endpoint, null, params);
  }
}

module.exports = WgerApiClient;
