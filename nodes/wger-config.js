const { API, AUTH, DEFAULTS, STATUS, NODE_RED } = require('../utils/constants');

module.exports = function (RED) {
  function WgerConfigNode(n) {
    RED.nodes.createNode(this, n);

    this.name = n.name;
    this.apiUrl = n.apiUrl || DEFAULTS.API_URL;
    this.authType = n.authType || DEFAULTS.AUTH_TYPE;

    // Retry configuration
    this.enableRetry = n.enableRetry || false;
    this.retryMaxAttempts = parseInt(n.retryMaxAttempts) || 3;
    this.retryBaseDelayMs = parseInt(n.retryBaseDelayMs) || 1000;
    this.retryMaxDelayMs = parseInt(n.retryMaxDelayMs) || 30000;
    
    // Circuit breaker configuration
    this.enableCircuitBreaker = n.enableCircuitBreaker || false;
    this.circuitBreakerFailureThreshold = parseInt(n.circuitBreakerFailureThreshold) || 5;
    this.circuitBreakerResetTimeoutMs = parseInt(n.circuitBreakerResetTimeoutMs) || 60000;

    // Automatically set test mode based on API URL
    this.isTestMode = DEFAULTS.TEST_MODE_PATTERNS.some(pattern => this.apiUrl.includes(pattern));

    this.getAuthHeader = function () {
      if (this.authType === AUTH.TYPES.TOKEN && this.credentials.token) {
        return { [AUTH.HEADER_NAME]: AUTH.PREFIXES.TOKEN + this.credentials.token };
      } else if (this.authType === AUTH.TYPES.JWT && this.credentials.token) {
        return { [AUTH.HEADER_NAME]: AUTH.PREFIXES.BEARER + this.credentials.token };
      }
      return {};
    };

    this.getResilienceConfig = function () {
      const config = {};
      
      if (this.enableRetry) {
        config.retry = {
          maxAttempts: this.retryMaxAttempts,
          baseDelayMs: this.retryBaseDelayMs,
          maxDelayMs: this.retryMaxDelayMs
        };
      }
      
      if (this.enableCircuitBreaker) {
        config.circuitBreaker = {
          failureThreshold: this.circuitBreakerFailureThreshold,
          resetTimeoutMs: this.circuitBreakerResetTimeoutMs
        };
      }
      
      return config;
    };

    // Test connection method
    this.testConnection = async function () {
      const axios = require('axios');
      try {
        const response = await axios({
          method: 'GET',
          url: `${this.apiUrl}${API.ENDPOINTS.INFO}`,
          headers: this.getAuthHeader(),
          timeout: API.CONNECTION_TIMEOUT,
        });
        return { success: true, data: response.data };
      } catch (error) {
        return {
          success: false,
          status: error.response ? error.response.status : 0,
          message: error.response ? error.response.statusText : error.message,
        };
      }
    };
  }

  RED.nodes.registerType(NODE_RED.NODE_TYPES.CONFIG, WgerConfigNode, {
    credentials: {
      token: { type: NODE_RED.CREDENTIAL_TYPES.PASSWORD },
      username: { type: NODE_RED.CREDENTIAL_TYPES.TEXT },
      password: { type: NODE_RED.CREDENTIAL_TYPES.PASSWORD },
    },
  });

  // Add HTTP admin route for testing connection
  RED.httpAdmin.post(NODE_RED.ADMIN_ROUTES.TEST_CONNECTION, RED.auth.needsPermission('wger-config.write'), async function (req, res) {
    const node = RED.nodes.getNode(req.params.id);
    if (node != null) {
      try {
        const result = await node.testConnection();
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    } else {
      res.status(404).json({ error: STATUS.MESSAGES.NODE_NOT_FOUND });
    }
  });
};
