const BaseNodeHandler = require('../utils/base-node-handler');
const OperationRegistry = require('../utils/operation-registry');
const weightOperations = require('./operations/weight-operations');
const WeightStatsCalculator = require('../utils/weight-stats-calculator');
const { getSharedCache } = require('../utils/weight-stats-cache');
const { API } = require('../utils/constants');
const InputValidator = require('../utils/input-validator');
const validationSchemas = require('../utils/validation-schemas');

module.exports = function (RED) {
  // Create and configure the operation registry for weight operations
  const operationRegistry = new OperationRegistry();
  
  // Register standard weight operations
  operationRegistry.registerAll(weightOperations);
  
  // Register custom getWeightStats operation with validation
  operationRegistry.register('getWeightStats', async (client, payload) => {
    // Validate payload for stats operation
    const statsSchema = {
      startDate: validationSchemas.weight.listWeightEntries.startDate || { type: InputValidator.TYPES.DATE, required: false },
      endDate: validationSchemas.weight.listWeightEntries.endDate || { type: InputValidator.TYPES.DATE, required: false },
      limit: validationSchemas.weight.listWeightEntries.limit,
      includeAdvanced: { type: InputValidator.TYPES.BOOLEAN, required: false, default: false },
      includeWeekly: { type: InputValidator.TYPES.BOOLEAN, required: false, default: false },
      includeMonthly: { type: InputValidator.TYPES.BOOLEAN, required: false, default: false },
      includeEntries: { type: InputValidator.TYPES.BOOLEAN, required: false, default: true },
      includeAllEntries: { type: InputValidator.TYPES.BOOLEAN, required: false, default: false }
    };
    
    const validatedPayload = InputValidator.validatePayload(payload, statsSchema);
    
    const cache = getSharedCache();
    const userId = 'default'; // This will be set by the node instance
    
    const fetchData = async (startDate, endDate, _options) => {
      // Optimize: Only fetch minimal required fields
      const params = {
        date__gte: startDate,
        date__lte: endDate,
        ordering: '-date'
      };
      
      // Performance optimization: Limit initial fetch for large datasets
      if (validatedPayload.limit) {
        params.limit = validatedPayload.limit;
      } else if (!validatedPayload.includeAllEntries) {
        // Default to reasonable limit for statistics calculation
        params.limit = 1000; // Enough for accurate statistics
      }
      
      return await client.get(API.ENDPOINTS.WEIGHT_ENTRIES, params);
    };
    
    const calculateStats = (data) => {
      if (!data.results || data.results.length === 0) {
        return {
          stats: null,
          entries: [],
          cached: false,
          performance: {
            entryCount: 0,
            fromCache: false
          }
        };
      }
      
      // Determine calculation options
      const calcOptions = {
        includeAdvanced: validatedPayload.includeAdvanced || false,
        includeWeekly: validatedPayload.includeWeekly || false,
        includeMonthly: validatedPayload.includeMonthly || false
      };
      
      // Use optimized calculator
      const stats = WeightStatsCalculator.calculate(data.results, calcOptions);
      
      return {
        stats,
        entries: validatedPayload.includeEntries !== false ? data.results : [],
        performance: {
          entryCount: data.results.length,
          fromCache: false
        }
      };
    };
    
    let result;
    try {
      // Try to get from cache or calculate
      result = await cache.getOrCalculate(
        fetchData,
        calculateStats,
        userId,
        validatedPayload.startDate || '',
        validatedPayload.endDate || '',
        { 
          includeAdvanced: validatedPayload.includeAdvanced,
          includeWeekly: validatedPayload.includeWeekly,
          includeMonthly: validatedPayload.includeMonthly
        }
      );
      
      // Add cache metrics
      if (result && result.performance) {
        result.performance.cacheMetrics = cache.getMetrics();
      }
    } catch (error) {
      // Fallback to non-cached calculation on error
      const entries = await client.get(API.ENDPOINTS.WEIGHT_ENTRIES, {
        date__gte: validatedPayload.startDate,
        date__lte: validatedPayload.endDate,
        ordering: '-date'
      });
      
      result = calculateStats(entries);
    }
    
    return result;
  });

  function WgerWeightNode(config) {
    const node = this;

    // Create custom operation handler that wraps the registry
    const handleWeightOperation = async (client, operation, payload) => {
      const result = await operationRegistry.execute(operation, client, payload);
      
      // Handle cache invalidation for write operations
      if (['createWeightEntry', 'updateWeightEntry', 'deleteWeightEntry'].includes(operation)) {
        try {
          const cache = getSharedCache();
          cache.invalidate(config.server || 'default');
        } catch (cacheError) {
          // Cache invalidation failed - continue silently
        }
      }
      
      return result;
    };

    // Setup node using base handler
    BaseNodeHandler.setupNode(RED, node, config, handleWeightOperation);
  }

  RED.nodes.registerType('wger-weight', WgerWeightNode);
};