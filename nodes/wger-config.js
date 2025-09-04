const { API, AUTH, DEFAULTS, STATUS, NODE_RED } = require('../utils/constants');
const { validateUrl, validateUrlSync, isDevEnvironment } = require('../utils/url-validator');

module.exports = function (RED) {
  function WgerConfigNode(n) {
    RED.nodes.createNode(this, n);

    this.name = n.name;
    this.apiUrl = n.apiUrl || DEFAULTS.API_URL;
    this.authType = n.authType || DEFAULTS.AUTH_TYPE;
    
    // Validate URL on node initialization (synchronous for immediate feedback)
    const validationResult = validateUrlSync(this.apiUrl, {
      isDevelopment: isDevEnvironment(this.apiUrl)
    });
    
    if (!validationResult.valid) {
      // For config nodes, we use node.error without message object as this is during initialization
      // Config nodes don't process messages, so no message context is available
      this.error(`Invalid API URL: ${validationResult.errors.join(', ')}`);
      this.status({ fill: 'red', shape: 'ring', text: 'Invalid URL' });
    }
    
    // Store normalized URL if validation passed
    if (validationResult.normalizedUrl) {
      this.apiUrl = validationResult.normalizedUrl;
    }

    // Retry configuration
    this.enableRetry = n.enableRetry || false;
    this.retryMaxAttempts = parseInt(n.retryMaxAttempts, 10) || 3;
    this.retryBaseDelayMs = parseInt(n.retryBaseDelayMs, 10) || 1000;
    this.retryMaxDelayMs = parseInt(n.retryMaxDelayMs, 10) || 30000;
    
    // Circuit breaker configuration
    this.enableCircuitBreaker = n.enableCircuitBreaker || false;
    this.circuitBreakerFailureThreshold = parseInt(n.circuitBreakerFailureThreshold, 10) || 5;
    this.circuitBreakerResetTimeoutMs = parseInt(n.circuitBreakerResetTimeoutMs, 10) || 60000;

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

    // Test connection method with SSRF protection
    this.testConnection = async function () {
      // Perform comprehensive URL validation with DNS resolution
      const validationResult = await validateUrl(this.apiUrl, {
        isDevelopment: this.isTestMode || isDevEnvironment(this.apiUrl)
      });
      
      if (!validationResult.valid) {
        return {
          success: false,
          status: 0,
          message: `URL validation failed: ${validationResult.errors.join(', ')}`,
          validation: validationResult
        };
      }
      
      // Proceed with connection test using validated URL
      const axios = require('axios');
      try {
        const response = await axios({
          method: 'GET',
          url: `${validationResult.normalizedUrl || this.apiUrl}${API.ENDPOINTS.INFO}`,
          headers: this.getAuthHeader(),
          timeout: API.CONNECTION_TIMEOUT,
        });
        return { 
          success: true, 
          data: response.data,
          warnings: validationResult.warnings
        };
      } catch (error) {
        return {
          success: false,
          status: error.response ? error.response.status : 0,
          message: error.response ? error.response.statusText : error.message,
          warnings: validationResult.warnings
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

  // Helper function to get auth header for test connection
  function getAuthHeaderForTest(config) {
    const { authType, credentials } = config;
    
    if (authType === 'token' && credentials.token) {
      return { Authorization: `Token ${credentials.token}` };
    } else if (authType === 'jwt' && credentials.token) {
      return { Authorization: `Bearer ${credentials.token}` };
    }
    
    return {};
  }

  // Add HTTP admin route for testing connection
  RED.httpAdmin.post(NODE_RED.ADMIN_ROUTES.TEST_CONNECTION, RED.auth.needsPermission('wger-config.write'), async function (req, res) {
    const nodeId = req.params.id;
    const node = RED.nodes.getNode(nodeId);
    
    if (node != null) {
      // Existing node - use stored configuration and credentials
      try {
        const result = await node.testConnection();
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    } else {
      // New node or unsaved changes - create temporary test instance
      // This handles the case where user is testing before saving the config
      try {
        const { apiUrl, authType } = req.body;
        
        // Get credentials from Node-RED's credential store if they exist
        // For new nodes, the credentials are temporarily stored by Node-RED's UI
        const credentials = RED.nodes.getCredentials(nodeId) || {};
        
        // Create a temporary config object for testing
        const testConfig = {
          apiUrl: apiUrl || 'https://wger.de',
          authType: authType || 'none',
          credentials: credentials
        };
        
        // Validate URL with SSRF protection
        const isDev = isDevEnvironment(testConfig.apiUrl) || 
                      DEFAULTS.TEST_MODE_PATTERNS.some(pattern => testConfig.apiUrl.includes(pattern));
        
        const validationResult = await validateUrl(testConfig.apiUrl, {
          isDevelopment: isDev
        });
        
        if (!validationResult.valid) {
          res.json({
            success: false,
            status: 0,
            message: `URL validation failed: ${validationResult.errors.join(', ')}`,
            validation: validationResult
          });
          return;
        }
        
        // Perform the connection test with validated URL
        const axios = require('axios');
        const authHeader = getAuthHeaderForTest(testConfig);
        
        try {
          const response = await axios({
            method: 'GET',
            url: `${validationResult.normalizedUrl || testConfig.apiUrl}${API.ENDPOINTS.INFO}`,
            headers: authHeader,
            timeout: API.CONNECTION_TIMEOUT,
          });
          res.json({ 
            success: true, 
            data: response.data,
            warnings: validationResult.warnings 
          });
        } catch (error) {
          res.json({
            success: false,
            status: error.response ? error.response.status : 0,
            message: error.response ? error.response.statusText : error.message,
            warnings: validationResult.warnings
          });
        }
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    }
  });
};
