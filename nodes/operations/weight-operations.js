const OperationBuilders = require('../../utils/operation-builders');
const { API } = require('../../utils/constants');
const validationSchemas = require('../../utils/validation-schemas');

/**
 * Weight tracking operations with comprehensive validation
 */
const weightOperations = {
  // List weight entries
  listWeightEntries: OperationBuilders.listOperation(
    API.ENDPOINTS.WEIGHT_ENTRIES,
    {
      limit: 'limit',
      offset: 'offset'
    },
    validationSchemas.weight.listWeightEntries
  ),
  
  // Get specific weight entry
  getWeightEntry: OperationBuilders.getByIdOperation(
    API.ENDPOINTS.WEIGHT_ENTRY_BY_ID,
    'entryId',
    validationSchemas.weight.getWeightEntry
  ),
  
  // Create new weight entry
  createWeightEntry: OperationBuilders.createOperation(
    API.ENDPOINTS.WEIGHT_ENTRIES,
    null,
    validationSchemas.weight.createWeightEntry
  ),
  
  // Update weight entry
  updateWeightEntry: OperationBuilders.updateOperation(
    API.ENDPOINTS.WEIGHT_ENTRY_BY_ID,
    'entryId',
    'patch',
    validationSchemas.weight.updateWeightEntry
  ),
  
  // Delete weight entry
  deleteWeightEntry: OperationBuilders.deleteOperation(
    API.ENDPOINTS.WEIGHT_ENTRY_BY_ID,
    'entryId',
    validationSchemas.weight.deleteWeightEntry
  )
};

module.exports = weightOperations;