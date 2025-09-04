/**
 * @fileoverview Builder functions for creating standard operation handlers with validation
 * @module utils/operation-builders
 * @requires ./base-node-handler
 * @requires ./input-validator
 * @version 1.0.0
 * @author Node-RED wger contrib team
 */

const BaseNodeHandler = require('./base-node-handler');
const InputValidator = require('./input-validator');

/**
 * Factory class for creating common operation handlers.
 * Provides builder methods that generate standardized operation functions for CRUD operations
 * and other common patterns. Each builder returns a function that can be registered with
 * OperationRegistry and handles validation, parameter mapping, and API calls.
 * 
 * @class OperationBuilders
 * @example
 * // Create a list operation with pagination
 * const listExercises = OperationBuilders.listOperation(
 *   '/api/v2/exercise/',
 *   { limit: 'limit', offset: 'offset', search: 'term' },
 *   validationSchema
 * );
 * 
 * @example
 * // Create a get by ID operation
 * const getWorkout = OperationBuilders.getByIdOperation(
 *   '/api/v2/workout/{id}/',
 *   'workoutId',
 *   validationSchema
 * );
 */
class OperationBuilders {
  /**
   * Creates a list operation handler for fetching collections from the API.
   * Handles parameter mapping from payload to API query parameters and optional validation.
   * 
   * @static
   * @param {string} endpoint - API endpoint for the list operation
   * @param {Object} [options={}] - Mapping of payload properties to API parameters
   * @param {Object|null} [validationSchema=null] - Optional validation schema for the payload
   * @returns {Function} Async operation handler function
   * @returns {WgerApiClient} handler.client - API client instance
   * @returns {Object} handler.payload - Operation payload
   * 
   * @example
   * // Simple list operation
   * const listWorkouts = OperationBuilders.listOperation('/api/v2/workout/');
   * 
   * @example
   * // List with parameter mapping
   * const searchExercises = OperationBuilders.listOperation(
   *   '/api/v2/exercise/',
   *   {
   *     limit: 'limit',      // payload.limit -> params.limit
   *     offset: 'offset',    // payload.offset -> params.offset
   *     search: 'term',      // payload.term -> params.search
   *     category: (payload) => payload.categoryId  // Function-based mapping
   *   },
   *   exerciseValidationSchema
   * );
   */
  static listOperation(endpoint, options = {}, validationSchema = null) {
    return async (client, payload) => {
      const originalPayload = { ...payload };
      
      // Apply validation if schema provided
      if (validationSchema) {
        payload = InputValidator.validatePayload(payload, validationSchema);
      }
      
      const params = {};
      
      // Map payload properties to API parameters
      // Only include params that were in the original payload or are from functions
      Object.entries(options).forEach(([key, value]) => {
        if (typeof value === 'function') {
          const result = value(payload);
          if (result !== undefined) {
            params[key] = result;
          }
        } else if (originalPayload[value] !== undefined && payload[value] !== undefined) {
          params[key] = payload[value];
        }
      });

      return await client.get(endpoint, params);
    };
  }

  /**
   * Creates a get-by-ID operation handler for fetching single resources.
   * Automatically replaces the {id} placeholder in the endpoint with the actual ID value.
   * 
   * @static
   * @param {string} endpointTemplate - API endpoint template with {id} placeholder
   * @param {string} idField - Name of the field in payload containing the ID
   * @param {Object|null} [validationSchema=null] - Optional validation schema
   * @returns {Function} Async operation handler function
   * 
   * @example
   * const getExercise = OperationBuilders.getByIdOperation(
   *   '/api/v2/exercise/{id}/',
   *   'exerciseId',
   *   { exerciseId: { type: 'number', required: true } }
   * );
   * // When called with payload: { exerciseId: 123 }
   * // Makes request to: /api/v2/exercise/123/
   */
  static getByIdOperation(endpointTemplate, idField, validationSchema = null) {
    return async (client, payload) => {
      // Apply validation if schema provided
      if (validationSchema) {
        payload = InputValidator.validatePayload(payload, validationSchema);
      } else {
        // Fallback to basic validation
        BaseNodeHandler.validateRequired(payload, idField);
      }
      
      const endpoint = endpointTemplate.replace('{id}', payload[idField]);
      return await client.get(endpoint);
    };
  }

  /**
   * Creates a create (POST) operation handler for creating new resources.
   * Supports optional payload transformation before sending to the API.
   * 
   * @static
   * @param {string} endpoint - API endpoint for creating resources
   * @param {Function|null} [payloadTransformer=null] - Function to transform payload before sending
   * @param {Object|null} [validationSchema=null] - Optional validation schema
   * @returns {Function} Async operation handler function
   * 
   * @example
   * // Simple create operation
   * const createWorkout = OperationBuilders.createOperation(
   *   '/api/v2/workout/',
   *   null,
   *   workoutValidationSchema
   * );
   * 
   * @example
   * // Create with payload transformation
   * const createMeal = OperationBuilders.createOperation(
   *   '/api/v2/meal/',
   *   (payload) => ({
   *     plan: payload.planId,
   *     time: payload.mealTime,
   *     items: payload.foods.map(f => ({ ingredient: f.id, amount: f.amount }))
   *   }),
   *   mealValidationSchema
   * );
   */
  static createOperation(endpoint, payloadTransformer = null, validationSchema = null) {
    return async (client, payload) => {
      // Apply validation if schema provided
      if (validationSchema) {
        payload = InputValidator.validatePayload(payload, validationSchema);
      }
      
      const data = payloadTransformer ? payloadTransformer(payload) : payload;
      return await client.post(endpoint, data);
    };
  }

  /**
   * Creates an update operation handler for modifying existing resources.
   * Supports both PATCH (partial) and PUT (full) update methods.
   * Automatically removes the ID field from the update data to prevent conflicts.
   * 
   * @static
   * @param {string} endpointTemplate - API endpoint template with {id} placeholder
   * @param {string} idField - Name of the field containing the resource ID
   * @param {string} [method='patch'] - HTTP method to use ('patch' or 'put')
   * @param {Object|null} [validationSchema=null] - Optional validation schema
   * @returns {Function} Async operation handler function
   * 
   * @example
   * // PATCH update (partial)
   * const updateWorkout = OperationBuilders.updateOperation(
   *   '/api/v2/workout/{id}/',
   *   'workoutId',
   *   'patch',
   *   updateWorkoutSchema
   * );
   * 
   * @example
   * // PUT update (full replacement)
   * const replaceSettings = OperationBuilders.updateOperation(
   *   '/api/v2/settings/{id}/',
   *   'settingId',
   *   'put',
   *   settingsSchema
   * );
   */
  static updateOperation(endpointTemplate, idField, method = 'patch', validationSchema = null) {
    return async (client, payload) => {
      // Apply validation if schema provided
      if (validationSchema) {
        payload = InputValidator.validatePayload(payload, validationSchema);
      } else {
        // Fallback to basic validation
        BaseNodeHandler.validateRequired(payload, idField);
      }
      
      const updateData = { ...payload };
      delete updateData[idField];
      const endpoint = endpointTemplate.replace('{id}', payload[idField]);
      return await client[method](endpoint, updateData);
    };
  }

  /**
   * Creates a delete operation handler for removing resources.
   * Validates the ID field and constructs the delete endpoint.
   * 
   * @static
   * @param {string} endpointTemplate - API endpoint template with {id} placeholder
   * @param {string} idField - Name of the field containing the resource ID
   * @param {Object|null} [validationSchema=null] - Optional validation schema
   * @returns {Function} Async operation handler function
   * 
   * @example
   * const deleteWorkout = OperationBuilders.deleteOperation(
   *   '/api/v2/workout/{id}/',
   *   'workoutId',
   *   { workoutId: { type: 'number', required: true } }
   * );
   * // When called with payload: { workoutId: 123 }
   * // Makes DELETE request to: /api/v2/workout/123/
   */
  static deleteOperation(endpointTemplate, idField, validationSchema = null) {
    return async (client, payload) => {
      // Apply validation if schema provided
      if (validationSchema) {
        payload = InputValidator.validatePayload(payload, validationSchema);
      } else {
        // Fallback to basic validation
        BaseNodeHandler.validateRequired(payload, idField);
      }
      
      const endpoint = endpointTemplate.replace('{id}', payload[idField]);
      return await client.delete(endpoint);
    };
  }

  /**
   * Creates a custom operation handler with automatic validation.
   * Provides a wrapper around custom logic with built-in validation support.
   * 
   * @static
   * @param {Array<string>|null} requiredFields - List of required field names for basic validation
   * @param {Function} handler - Custom async handler function
   * @param {WgerApiClient} handler.client - API client instance
   * @param {Object} handler.payload - Validated payload
   * @param {Object|null} [validationSchema=null] - Full validation schema (overrides requiredFields)
   * @returns {Function} Async operation handler with validation
   * 
   * @example
   * // Custom operation with required fields
   * const logWorkout = OperationBuilders.customOperation(
   *   ['workoutId', 'date', 'duration'],
   *   async (client, payload) => {
   *     // Custom logic here
   *     const log = await client.post(`/api/v2/workout/${payload.workoutId}/log/`, {
   *       date: payload.date,
   *       duration: payload.duration,
   *       notes: payload.notes || ''
   *     });
   *     // Additional processing
   *     return { ...log, processed: true };
   *   }
   * );
   * 
   * @example
   * // Custom operation with full validation schema
   * const complexOperation = OperationBuilders.customOperation(
   *   null,  // No simple required fields
   *   async (client, payload) => {
   *     // Complex multi-step operation
   *     const step1 = await client.get('/api/v2/step1/');
   *     const step2 = await client.post('/api/v2/step2/', { data: step1 });
   *     return step2;
   *   },
   *   complexValidationSchema
   * );
   */
  static customOperation(requiredFields, handler, validationSchema = null) {
    return async (client, payload) => {
      // Apply validation if schema provided
      if (validationSchema) {
        payload = InputValidator.validatePayload(payload, validationSchema);
      } else if (requiredFields && requiredFields.length > 0) {
        // Fallback to basic validation
        BaseNodeHandler.validateRequired(payload, requiredFields);
      }
      
      return await handler(client, payload);
    };
  }

  /**
   * Creates a search operation handler optimized for text-based searches.
   * Automatically maps search terms and additional parameters to API query parameters.
   * 
   * @static
   * @param {string} endpoint - API endpoint for search
   * @param {string} [searchField='term'] - Name of the search field in payload
   * @param {Object} [additionalParams={}] - Additional default parameters to include
   * @param {Object|null} [validationSchema=null] - Optional validation schema
   * @returns {Function} Async operation handler function
   * 
   * @example
   * // Basic search operation
   * const searchExercises = OperationBuilders.searchOperation(
   *   '/api/v2/exercise/search/',
   *   'term'
   * );
   * // Usage: { term: 'bench press' }
   * 
   * @example
   * // Search with additional parameters
   * const searchIngredients = OperationBuilders.searchOperation(
   *   '/api/v2/ingredient/search/',
   *   'query',
   *   { language: 'en', limit: 20 },  // Default params
   *   ingredientSearchSchema
   * );
   * // Usage: { query: 'chicken', limit: 10 }
   * // Sends: ?query=chicken&language=en&limit=10
   */
  static searchOperation(endpoint, searchField = 'term', additionalParams = {}, validationSchema = null) {
    return async (client, payload) => {
      // Apply validation if schema provided
      if (validationSchema) {
        payload = InputValidator.validatePayload(payload, validationSchema);
      } else {
        // Fallback to basic validation
        BaseNodeHandler.validateRequired(payload, searchField);
      }
      
      const params = {
        [searchField]: payload[searchField],
        ...additionalParams
      };
      
      // Add any additional parameters from payload
      Object.keys(additionalParams).forEach(key => {
        if (payload[key] !== undefined) {
          params[key] = payload[key];
        }
      });

      return await client.get(endpoint, params);
    };
  }
}

module.exports = OperationBuilders;