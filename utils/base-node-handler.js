/**
 * @fileoverview Base handler utility for Node-RED wger nodes
 * @module utils/base-node-handler
 * @requires ./api-client
 * @requires ./constants
 * @version 1.0.0
 * @author Node-RED wger contrib team
 */

const WgerApiClient = require('./api-client');
const { STATUS, ERRORS } = require('./constants');

/**
 * Base handler for common Node-RED node patterns in wger contrib nodes.
 * Provides reusable methods for node setup, operation handling, and error management.
 * This class eliminates code duplication across all node implementations by providing
 * a standardized workflow for processing messages and handling API operations.
 * 
 * @class BaseNodeHandler
 * @example
 * // In a node implementation file
 * BaseNodeHandler.setupNode(RED, node, config, async (client, operation, payload) => {
 *   switch(operation) {
 *     case 'list':
 *       return await client.get('/api/v2/exercise/');
 *     case 'search':
 *       BaseNodeHandler.validateRequired(payload, 'term');
 *       return await client.get('/api/v2/exercise/search/', { term: payload.term });
 *     default:
 *       BaseNodeHandler.throwInvalidOperationError(operation);
 *   }
 * });
 */
class BaseNodeHandler {
  /**
   * Handles the common input processing pattern for all wger nodes.
   * This method manages the complete lifecycle of a node operation including:
   * - Status updates (blue while processing, green on success, red on error)
   * - API client initialization
   * - Operation execution
   * - Error handling and reporting
   * 
   * @static
   * @async
   * @param {Object} node - The Node-RED node instance
   * @param {Object} node.server - Configuration node with API settings
   * @param {string} node.operation - Default operation from node configuration
   * @param {Function} node.status - Node status update function
   * @param {Function} node.error - Node error reporting function
   * @param {Object} msg - The input message from Node-RED flow
   * @param {string} [msg.operation] - Operation to perform (overrides node.operation)
   * @param {Object} [msg.payload] - Operation payload data
   * @param {Function} send - The Node-RED send function for outputting messages
   * @param {Function} done - The Node-RED done callback for signaling completion
   * @param {Function} operationHandler - Async function that handles the specific operations
   * @param {WgerApiClient} operationHandler.client - Initialized API client
   * @param {string} operationHandler.operation - Operation to perform
   * @param {Object} operationHandler.payload - Operation payload
   * @returns {Promise<void>}
   * 
   * @example
   * // In node's 'input' event handler
   * node.on('input', async function(msg, send, done) {
   *   await BaseNodeHandler.handleNodeOperation(node, msg, send, done, async (client, operation, payload) => {
   *     // Custom operation logic here
   *     return await client.get('/api/endpoint/');
   *   });
   * });
   */
  static async handleNodeOperation(node, msg, send, done, operationHandler) {
    node.status({ fill: STATUS.COLORS.BLUE, shape: STATUS.SHAPES.DOT, text: STATUS.MESSAGES.REQUESTING });

    const operation = msg.operation || node.operation;
    const payload = msg.payload || {};

    if (!operation) {
      node.status({ fill: STATUS.COLORS.RED, shape: STATUS.SHAPES.RING, text: STATUS.MESSAGES.NO_OPERATION });
      const error = new Error(ERRORS.MISSING_OPERATION);
      if (done) {
        done(error);
      } else {
        node.error(error, msg);
      }
      return;
    }

    try {
      // Initialize Wger client with resilience configuration
      const client = new WgerApiClient(node.server.apiUrl, node.server.getAuthHeader(), node.server.getResilienceConfig());
      
      // Call the operation-specific handler
      const result = await operationHandler(client, operation, payload);

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
  }

  /**
   * Sets up the common node initialization pattern for wger nodes.
   * This method handles the standard setup flow including:
   * - Node creation via RED runtime
   * - Configuration node attachment
   * - Input/close event handler registration
   * - Initial status setting
   * 
   * @static
   * @param {Object} RED - The Node-RED runtime object
   * @param {Object} node - The node instance to set up
   * @param {Object} config - The node configuration from the flow
   * @param {string} config.server - ID of the configuration node
   * @param {string} config.operation - Default operation for this node
   * @param {Function} operationHandler - Async function that handles specific operations
   * @returns {void}
   * 
   * @example
   * // In a Node-RED node registration function
   * function WgerExerciseNode(config) {
   *   BaseNodeHandler.setupNode(this, RED, config, async (client, operation, payload) => {
   *     // Handle operations specific to exercise node
   *     switch(operation) {
   *       case 'search':
   *         return await client.get('/api/v2/exercise/search/', { term: payload.term });
   *       default:
   *         throw new Error(`Invalid operation: ${operation}`);
   *     }
   *   });
   * }
   */
  static setupNode(RED, node, config, operationHandler) {
    RED.nodes.createNode(node, config);

    node.server = RED.nodes.getNode(config.server);
    node.operation = config.operation;

    if (!node.server) {
      node.status({ fill: STATUS.COLORS.RED, shape: STATUS.SHAPES.RING, text: STATUS.MESSAGES.MISSING_SERVER_CONFIG });
      return;
    }

    node.on('input', async function (msg, send, done) {
      await BaseNodeHandler.handleNodeOperation(node, msg, send, done, operationHandler);
    });

    node.on('close', function () {
      node.status({});
    });
  }

  /**
   * Helper method to throw invalid operation error with consistent messaging.
   * Used when an unsupported operation is requested.
   * 
   * @static
   * @param {string} operation - The invalid operation name
   * @throws {Error} Error with formatted message indicating the invalid operation
   * 
   * @example
   * switch(operation) {
   *   case 'list':
   *     return await client.get('/api/v2/exercise/');
   *   default:
   *     BaseNodeHandler.throwInvalidOperationError(operation);
   * }
   */
  static throwInvalidOperationError(operation) {
    throw new Error(ERRORS.INVALID_OPERATION.replace('{operation}', operation));
  }

  /**
   * Helper method to validate required parameters in a payload.
   * Throws an error if any required parameter is missing or falsy.
   * 
   * @static
   * @param {Object} payload - The payload object to validate
   * @param {string|Array<string>} requiredParams - Required parameter name(s)
   * @throws {Error} Error with formatted message indicating which field is missing
   * 
   * @example
   * // Validate single required field
   * BaseNodeHandler.validateRequired(payload, 'workoutId');
   * 
   * @example
   * // Validate multiple required fields
   * BaseNodeHandler.validateRequired(payload, ['name', 'date', 'exercises']);
   */
  static validateRequired(payload, requiredParams) {
    const params = Array.isArray(requiredParams) ? requiredParams : [requiredParams];
    
    for (const param of params) {
      if (!payload[param]) {
        throw new Error(ERRORS.REQUIRED_FIELD.replace('{field}', param));
      }
    }
  }
}

module.exports = BaseNodeHandler;