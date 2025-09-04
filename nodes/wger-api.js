const BaseNodeHandler = require('../utils/base-node-handler');
const WgerApiClient = require('../utils/api-client');
const { STATUS, ERRORS } = require('../utils/constants');
const InputValidator = require('../utils/input-validator');
const validationSchemas = require('../utils/validation-schemas');

module.exports = function (RED) {
  function WgerApiNode(config) {
    const node = this;

    // Special setup for the generic API node
    RED.nodes.createNode(node, config);
    node.server = RED.nodes.getNode(config.server);
    node.method = config.method;
    node.endpoint = config.endpoint;

    if (!node.server) {
      node.status({ fill: STATUS.COLORS.RED, shape: STATUS.SHAPES.RING, text: STATUS.MESSAGES.MISSING_SERVER_CONFIG });
      return;
    }

    // Operation handler specific to generic API operations
    const handleApiOperation = async (client, operation, payload) => {
      // For the generic API node, we handle the request structure differently
      // The payload contains the full message structure
      const method = payload.method || node.method || 'GET';
      let endpoint = payload.endpoint || node.endpoint;
      const requestPayload = payload.payload || {};

      if (!endpoint) {
        throw new Error('No endpoint specified');
      }

      // Validate based on HTTP method
      const methodLower = method.toLowerCase();
      const schema = validationSchemas.api[methodLower];
      let validatedPayload = payload;
      
      if (schema) {
        try {
          // Create validation payload with only the relevant fields
          const toValidate = {
            endpoint: endpoint
          };
          if (payload.params) toValidate.params = payload.params;
          if (payload.query) toValidate.query = payload.query;
          if (requestPayload && Object.keys(requestPayload).length > 0) {
            toValidate.payload = requestPayload;
          }
          
          // Validate the input
          const validated = InputValidator.validatePayload(toValidate, schema);
          endpoint = validated.endpoint;
        } catch (validationError) {
          throw new Error(`Validation failed: ${validationError.message}`);
        }
      }

      // Process path parameters (after validation)
      if (payload.params && typeof endpoint === 'string') {
        Object.keys(payload.params).forEach((param) => {
          const paramValue = String(payload.params[param]);
          // Additional safety check for path traversal
          if (paramValue.includes('../') || paramValue.includes('..\\')) {
            throw new Error(`Invalid parameter value: ${param}`);
          }
          endpoint = endpoint.replace(`{${param}}`, encodeURIComponent(paramValue));
        });
      }

      // Execute the API request
      let result;
      switch (method.toUpperCase()) {
        case 'GET':
          result = await client.get(endpoint, payload.query || requestPayload);
          break;
        case 'POST':
          result = await client.post(endpoint, requestPayload);
          break;
        case 'PUT':
          result = await client.put(endpoint, requestPayload);
          break;
        case 'PATCH':
          result = await client.patch(endpoint, requestPayload);
          break;
        case 'DELETE':
          result = await client.delete(endpoint, payload.query);
          break;
        default:
          throw new Error(`Unsupported HTTP method: ${method}`);
      }

      return result;
    };

    // Custom input handler for the API node (bypasses operation validation)
    node.on('input', async function (msg, send, done) {
      // Set initial node status
      node.status({ fill: STATUS.COLORS.BLUE, shape: STATUS.SHAPES.DOT, text: STATUS.MESSAGES.REQUESTING });

      try {
        // Initialize Wger client
        const client = new WgerApiClient(node.server.apiUrl, node.server.getAuthHeader());
        
        // Pass the entire message for processing
        const result = await handleApiOperation(client, null, {
          method: msg.method,
          endpoint: msg.endpoint, 
          payload: msg.payload,
          query: msg.query,
          params: msg.params
        });

        // Update status and send response
        node.status({ fill: STATUS.COLORS.GREEN, shape: STATUS.SHAPES.DOT, text: STATUS.MESSAGES.SUCCESS });
        msg.payload = result;
        send(msg);

        if (done) {
          done();
        }
      } catch (error) {
        node.status({ fill: STATUS.COLORS.RED, shape: STATUS.SHAPES.DOT, text: error.message });
        if (done) {
          done(error);
        } else {
          node.error(error, msg);
        }
      }
    });

    // Set up close handler
    node.on('close', function () {
      node.status({});
    });
  }

  RED.nodes.registerType('wger-api', WgerApiNode);
};
