/**
 * @fileoverview Operation registry implementing the Strategy Pattern for dynamic operation dispatch
 * @module utils/operation-registry
 * @version 1.0.0
 * @author Node-RED wger contrib team
 */

/**
 * Registry for managing and executing operation handlers.
 * Implements the Strategy Pattern to allow dynamic selection and execution of operations
 * based on operation names. This enables nodes to register multiple operations and
 * dispatch them at runtime without complex switch statements.
 * 
 * @class OperationRegistry
 * @example
 * // Create and populate a registry
 * const registry = new OperationRegistry();
 * 
 * // Register individual operations
 * registry.register('search', async (client, payload) => {
 *   return await client.get('/api/v2/exercise/search/', { term: payload.term });
 * });
 * 
 * // Register multiple operations at once
 * registry.registerAll({
 *   list: async (client, payload) => await client.get('/api/v2/exercise/'),
 *   getById: async (client, payload) => await client.get(`/api/v2/exercise/${payload.id}/`)
 * });
 * 
 * // Execute an operation
 * const result = await registry.execute('search', client, { term: 'bench press' });
 */
class OperationRegistry {
  /**
   * Creates a new OperationRegistry instance
   * @constructor
   */
  constructor() {
    /**
     * Map storing operation handlers keyed by operation name
     * @private
     * @type {Map<string, Function>}
     */
    this.operations = new Map();
  }

  /**
   * Register an operation handler.
   * The handler function should accept (client, payload) parameters and return a Promise.
   * 
   * @param {string} name - Operation name (used as key for execution)
   * @param {Function} handler - Async operation handler function
   * @param {WgerApiClient} handler.client - API client instance
   * @param {Object} handler.payload - Operation payload data
   * @returns {void}
   * @throws {Error} If handler is not a function
   * 
   * @example
   * registry.register('createWorkout', async (client, payload) => {
   *   const { name, description } = payload;
   *   return await client.post('/api/v2/workout/', { name, description });
   * });
   */
  register(name, handler) {
    if (typeof handler !== 'function') {
      throw new Error(`Handler for operation '${name}' must be a function`);
    }
    this.operations.set(name, handler);
  }

  /**
   * Register multiple operations at once.
   * Convenience method for bulk registration of operation handlers.
   * 
   * @param {Object<string, Function>} operations - Object with operation names as keys and handlers as values
   * @returns {void}
   * @throws {Error} If any handler is not a function
   * 
   * @example
   * registry.registerAll({
   *   list: async (client, payload) => {
   *     return await client.get('/api/v2/workout/', { 
   *       limit: payload.limit, 
   *       offset: payload.offset 
   *     });
   *   },
   *   create: async (client, payload) => {
   *     return await client.post('/api/v2/workout/', payload);
   *   },
   *   update: async (client, payload) => {
   *     const { id, ...data } = payload;
   *     return await client.patch(`/api/v2/workout/${id}/`, data);
   *   }
   * });
   */
  registerAll(operations) {
    Object.entries(operations).forEach(([name, handler]) => {
      this.register(name, handler);
    });
  }

  /**
   * Execute a registered operation by name.
   * Looks up the operation handler and invokes it with the provided client and payload.
   * 
   * @async
   * @param {string} operationName - Name of the operation to execute
   * @param {WgerApiClient} client - Initialized API client instance
   * @param {Object} payload - Operation payload data
   * @returns {Promise<*>} Operation result from the handler
   * @throws {Error} If operation is not registered
   * 
   * @example
   * // Execute a registered operation
   * try {
   *   const result = await registry.execute('search', client, { term: 'deadlift' });
   *   console.log('Search results:', result);
   * } catch (error) {
   *   console.error('Operation failed:', error.message);
   * }
   */
  async execute(operationName, client, payload) {
    const handler = this.operations.get(operationName);
    
    if (!handler) {
      throw new Error(`Invalid operation: ${operationName}`);
    }

    return await handler(client, payload);
  }

  /**
   * Check if an operation is registered in the registry.
   * Useful for validation before attempting execution.
   * 
   * @param {string} operationName - Name of the operation to check
   * @returns {boolean} True if operation exists, false otherwise
   * 
   * @example
   * if (registry.has('search')) {
   *   const result = await registry.execute('search', client, payload);
   * } else {
   *   console.error('Search operation not available');
   * }
   */
  has(operationName) {
    return this.operations.has(operationName);
  }

  /**
   * Get all registered operation names.
   * Useful for UI generation, validation, or debugging.
   * 
   * @returns {Array<string>} Array of registered operation names
   * 
   * @example
   * const availableOps = registry.getOperationNames();
   * console.log('Available operations:', availableOps.join(', '));
   * // Output: "list, search, create, update, delete"
   */
  getOperationNames() {
    return Array.from(this.operations.keys());
  }
}

module.exports = OperationRegistry;