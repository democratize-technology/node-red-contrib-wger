const BaseNodeHandler = require('../utils/base-node-handler');
const { API, ERRORS } = require('../utils/constants');
const InputValidator = require('../utils/input-validator');
const validationSchemas = require('../utils/validation-schemas');

module.exports = function (RED) {
  function WgerUserNode(config) {
    const node = this;

    // Operation handler specific to user operations
    const handleUserOperation = async (client, operation, payload) => {
      let result;
      let validatedPayload = payload;

      // Validate input based on operation
      const schema = validationSchemas.user[operation];
      if (schema) {
        try {
          validatedPayload = InputValidator.validatePayload(payload, schema);
        } catch (validationError) {
          throw new Error(`Validation failed for ${operation}: ${validationError.message}`);
        }
      }

      // Execute the Wger user operation
      switch (operation) {
          case 'getUserProfile':
            result = await client.get(API.ENDPOINTS.USER_PROFILE);
            break;

          case 'updateUserProfile':
            const updateData = { ...validatedPayload };
            delete updateData.profileId;
            result = await client.patch(
              API.ENDPOINTS.USER_PROFILE_BY_ID.replace('{id}', validatedPayload.profileId || 'current'), 
              updateData
            );
            break;

          case 'getUserSettings':
            result = await client.get(API.ENDPOINTS.USER_SETTINGS);
            break;

          case 'updateUserSettings':
            BaseNodeHandler.validateRequired(payload, 'settingId');
            const settingsData = { ...payload };
            delete settingsData.settingId;
            result = await client.patch(API.ENDPOINTS.USER_SETTING_BY_ID.replace('{id}', payload.settingId), settingsData);
            break;

          case 'getUserInfo':
            result = await client.get(API.ENDPOINTS.USER_INFO);
            break;

          case 'getApiKey':
            result = await client.get(API.ENDPOINTS.API_KEYS);
            break;

          case 'createApiKey':
            result = await client.post(API.ENDPOINTS.API_KEYS);
            break;

          case 'getMeasurements':
            result = await client.get(API.ENDPOINTS.MEASUREMENT_CATEGORIES);
            break;

          case 'createMeasurement':
            BaseNodeHandler.validateRequired(payload, ['category', 'value', 'date']);
            result = await client.post(API.ENDPOINTS.MEASUREMENTS, {
              category: payload.category,
              value: payload.value,
              date: payload.date,
              notes: payload.notes,
            });
            break;

          case 'getMeasurementEntries':
            result = await client.get(API.ENDPOINTS.MEASUREMENTS, {
              category: payload.category,
              date__gte: payload.startDate,
              date__lte: payload.endDate,
            });
            break;

          default:
            BaseNodeHandler.throwInvalidOperationError(operation);
        }

        return result;
    };

    // Setup node using base handler
    BaseNodeHandler.setupNode(RED, node, config, handleUserOperation);
  }

  RED.nodes.registerType('wger-user', WgerUserNode);
};
