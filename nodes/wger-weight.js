const BaseNodeHandler = require('../utils/base-node-handler');
const { API, ERRORS } = require('../utils/constants');
const InputValidator = require('../utils/input-validator');
const validationSchemas = require('../utils/validation-schemas');
const WeightStatsCalculator = require('../utils/weight-stats-calculator');
const { getSharedCache } = require('../utils/weight-stats-cache');

module.exports = function (RED) {
  function WgerWeightNode(config) {
    const node = this;

    const handleWeightOperation = async (client, operation, payload) => {
      let result;
      let validatedPayload = payload;

      const schema = validationSchemas.weight[operation];
      if (schema) {
        try {
          validatedPayload = InputValidator.validatePayload(payload, schema);
        } catch (validationError) {
          throw new Error(`Validation failed for ${operation}: ${validationError.message}`);
        }
      }

      switch (operation) {
          case 'listWeightEntries':
            result = await client.get(API.ENDPOINTS.WEIGHT_ENTRIES, {
              date__gte: validatedPayload.startDate,
              date__lte: validatedPayload.endDate,
              limit: validatedPayload.limit,
              offset: validatedPayload.offset,
            });
            break;

          case 'getWeightEntry':
            result = await client.get(
              API.ENDPOINTS.WEIGHT_ENTRY_BY_ID.replace('{id}', validatedPayload.entryId)
            );
            break;

          case 'createWeightEntry':
            result = await client.post(API.ENDPOINTS.WEIGHT_ENTRIES, {
              weight: validatedPayload.weight,
              date: validatedPayload.date,
              comment: validatedPayload.comment,
            });
            // Invalidate cache after creating new entry
            try {
              const cacheCreate = getSharedCache();
              cacheCreate.invalidate(config.server || 'default');
            } catch (cacheError) {
              // Cache invalidation failed - continue silently
            }
            break;

          case 'updateWeightEntry':
            const updateData = { ...validatedPayload };
            delete updateData.entryId;
            result = await client.patch(
              API.ENDPOINTS.WEIGHT_ENTRY_BY_ID.replace('{id}', validatedPayload.entryId), 
              updateData
            );
            // Invalidate cache after updating entry
            try {
              const cacheUpdate = getSharedCache();
              cacheUpdate.invalidate(config.server || 'default');
            } catch (cacheError) {
              // Cache invalidation failed - continue silently
            }
            break;

          case 'deleteWeightEntry':
            result = await client.delete(
              API.ENDPOINTS.WEIGHT_ENTRY_BY_ID.replace('{id}', validatedPayload.entryId)
            );
            // Invalidate cache after deleting entry
            try {
              const cacheDelete = getSharedCache();
              cacheDelete.invalidate(config.server || 'default');
            } catch (cacheError) {
              // Cache invalidation failed - continue silently
            }
            break;

          case 'getWeightStats':
            const cache = getSharedCache();
            const userId = config.server || 'default';
            
            const fetchData = async (startDate, endDate, options) => {
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
                ordering: '-date',
              });
              
              result = calculateStats(entries);
            }
            break;

          default:
            BaseNodeHandler.throwInvalidOperationError(operation);
        }

        return result;
    };

    BaseNodeHandler.setupNode(RED, node, config, handleWeightOperation);
  }

  RED.nodes.registerType('wger-weight', WgerWeightNode);
};
