const BaseNodeHandler = require('../../utils/base-node-handler');
const OperationBuilders = require('../../utils/operation-builders');
const { API } = require('../../utils/constants');
const validationSchemas = require('../../utils/validation-schemas');

/**
 * User management operations with comprehensive validation
 */
const userOperations = {
  // User profile operations
  getUserProfile: OperationBuilders.customOperation(
    null,
    async (client, payload) => {
      return await client.get(API.ENDPOINTS.USER_PROFILE);
    },
    validationSchemas.user.getUserProfile
  ),
  
  updateUserProfile: OperationBuilders.customOperation(
    null,
    async (client, payload) => {
      // Get current profile first to get the ID
      const profiles = await client.get(API.ENDPOINTS.USER_PROFILE);
      if (profiles.results && profiles.results.length > 0) {
        const profileId = profiles.results[0].id;
        const endpoint = API.ENDPOINTS.USER_PROFILE_BY_ID.replace('{id}', profileId);
        return await client.patch(endpoint, payload);
      }
      throw new Error('No user profile found');
    },
    validationSchemas.user.updateUserProfile
  ),
  
  // API key operations
  getApiKey: OperationBuilders.customOperation(
    null,
    async (client, payload) => {
      return await client.get(API.ENDPOINTS.API_KEYS);
    },
    validationSchemas.user.getApiKey
  ),
  
  generateApiKey: OperationBuilders.customOperation(
    null,
    async (client, payload) => {
      // First delete existing keys
      const keys = await client.get(API.ENDPOINTS.API_KEYS);
      if (keys.results && keys.results.length > 0) {
        for (const key of keys.results) {
          await client.delete(`${API.ENDPOINTS.API_KEYS}${key.id}/`);
        }
      }
      // Generate new key
      return await client.post(API.ENDPOINTS.API_KEYS, {});
    },
    validationSchemas.user.generateApiKey
  ),
  
  // User preferences operations
  getUserPreferences: OperationBuilders.customOperation(
    null,
    async (client, payload) => {
      return await client.get(API.ENDPOINTS.USER_SETTINGS);
    },
    validationSchemas.user.getUserPreferences
  ),
  
  updateUserPreferences: OperationBuilders.customOperation(
    null,
    async (client, payload) => {
      // Get current settings first to update them
      const settings = await client.get(API.ENDPOINTS.USER_SETTINGS);
      if (settings.results && settings.results.length > 0) {
        const settingId = settings.results[0].id;
        const endpoint = API.ENDPOINTS.USER_SETTING_BY_ID.replace('{id}', settingId);
        return await client.patch(endpoint, payload);
      }
      // If no settings exist, create them
      return await client.post(API.ENDPOINTS.USER_SETTINGS, payload);
    },
    validationSchemas.user.updateUserPreferences
  )
};

module.exports = userOperations;