/**
 * @fileoverview Centralized constants and configuration values for the wger Node-RED contrib package
 * @module utils/constants
 * @version 1.0.0
 * @author Node-RED wger contrib team
 */

/**
 * API configuration constants including endpoints, headers, and timeouts.
 * All wger API endpoint paths are centralized here for easy maintenance.
 * 
 * @namespace API
 * @property {string} BASE_PATH - Base path for all API v2 endpoints
 * @property {Object} ENDPOINTS - Complete mapping of all API endpoints
 * @property {Object} HEADERS - Standard HTTP headers for API requests
 * @property {number} CONNECTION_TIMEOUT - Default connection timeout in milliseconds
 */
const API = {
  BASE_PATH: '/api/v2',
  
  ENDPOINTS: {
    INFO: '/api/v2/info/',
    
    EXERCISES: '/api/v2/exercisebaseinfo/',
    EXERCISE_BY_ID: '/api/v2/exercisebaseinfo/{id}/',
    EXERCISE_SEARCH: '/api/v2/exercise/search/',
    EXERCISE_CATEGORIES: '/api/v2/exercisecategory/',
    EXERCISE_IMAGES: '/api/v2/exerciseimage/',
    EXERCISE_COMMENTS: '/api/v2/exercisecomment/',
    MUSCLES: '/api/v2/muscle/',
    EQUIPMENT: '/api/v2/equipment/',
    
    WORKOUTS: '/api/v2/workout/',
    WORKOUT_BY_ID: '/api/v2/workout/{id}/',
    WORKOUT_CANONICAL: '/api/v2/workout/{id}/canonical_representation/',
    WORKOUT_LOG_DATA: '/api/v2/workout/{id}/log_data/',
    DAYS: '/api/v2/day/',
    DAY_BY_ID: '/api/v2/day/{id}/',
    SETS: '/api/v2/set/',
    SET_BY_ID: '/api/v2/set/{id}/',
    WORKOUT_SESSIONS: '/api/v2/workoutsession/',
    WORKOUT_SESSION_BY_ID: '/api/v2/workoutsession/{id}/',
    
    NUTRITION_PLANS: '/api/v2/nutritionplan/',
    NUTRITION_PLAN_BY_ID: '/api/v2/nutritionplan/{id}/',
    NUTRITION_PLAN_INFO: '/api/v2/nutritionplaninfo/{id}/',
    NUTRITION_PLAN_VALUES: '/api/v2/nutritionplan/{id}/nutritional_values/',
    MEALS: '/api/v2/meal/',
    MEAL_BY_ID: '/api/v2/meal/{id}/',
    MEAL_ITEMS: '/api/v2/mealitem/',
    MEAL_ITEM_BY_ID: '/api/v2/mealitem/{id}/',
    INGREDIENT_SEARCH: '/api/v2/ingredient/search/',
    INGREDIENT_INFO: '/api/v2/ingredientinfo/{id}/',
    
    WEIGHT_ENTRIES: '/api/v2/weightentry/',
    WEIGHT_ENTRY_BY_ID: '/api/v2/weightentry/{id}/',
    
    USER_PROFILE: '/api/v2/userprofile/',
    USER_PROFILE_BY_ID: '/api/v2/userprofile/{id}/',
    USER_SETTINGS: '/api/v2/setting/',
    USER_SETTING_BY_ID: '/api/v2/setting/{id}/',
    USER_INFO: '/api/v2/userinfo/',
    API_KEYS: '/api/v2/apikey/',
    MEASUREMENT_CATEGORIES: '/api/v2/measurement-category/',
    MEASUREMENTS: '/api/v2/measurement/'
  },
  
  HEADERS: {
    CONTENT_TYPE: 'application/json'
  },
  
  CONNECTION_TIMEOUT: 5000
};

/**
 * Authentication configuration for different auth methods supported by wger.
 * 
 * @namespace AUTH
 * @property {Object} TYPES - Supported authentication types
 * @property {string} TYPES.NONE - No authentication (public endpoints only)
 * @property {string} TYPES.TOKEN - Token-based authentication
 * @property {string} TYPES.JWT - JWT bearer token authentication
 * @property {Object} PREFIXES - Authentication header prefixes
 * @property {string} PREFIXES.TOKEN - Prefix for token auth ('Token ')
 * @property {string} PREFIXES.BEARER - Prefix for JWT auth ('Bearer ')
 * @property {string} HEADER_NAME - HTTP header name for authentication
 */
const AUTH = {
  TYPES: {
    NONE: 'none',
    TOKEN: 'token',
    JWT: 'jwt'
  },
  
  PREFIXES: {
    TOKEN: 'Token ',
    BEARER: 'Bearer '
  },
  
  HEADER_NAME: 'Authorization'
};

/**
 * Node-RED node status configuration for visual feedback.
 * Defines standard colors, shapes, and messages for node status indicators.
 * 
 * @namespace STATUS
 * @property {Object} COLORS - Status indicator colors
 * @property {string} COLORS.BLUE - Processing/working state
 * @property {string} COLORS.GREEN - Success state
 * @property {string} COLORS.RED - Error state
 * @property {string} COLORS.YELLOW - Warning state
 * @property {Object} SHAPES - Status indicator shapes
 * @property {string} SHAPES.DOT - Filled circle indicator
 * @property {string} SHAPES.RING - Hollow circle indicator
 * @property {Object} MESSAGES - Standard status text messages
 */
const STATUS = {
  COLORS: {
    BLUE: 'blue',
    GREEN: 'green',
    RED: 'red',
    YELLOW: 'yellow'
  },
  
  SHAPES: {
    DOT: 'dot',
    RING: 'ring'
  },
  
  MESSAGES: {
    REQUESTING: 'requesting...',
    SUCCESS: 'success',
    ERROR: 'error',
    NO_OPERATION: 'no operation specified',
    MISSING_SERVER_CONFIG: 'Missing server config',
    NODE_NOT_FOUND: 'Node not found',
    API_REQUEST_FAILED: 'API request failed',
    NO_RESPONSE: 'No response received from server'
  }
};

/**
 * Default configuration values used throughout the application.
 * 
 * @namespace DEFAULTS
 * @property {string} API_URL - Default wger API URL
 * @property {string} AUTH_TYPE - Default authentication type (none)
 * @property {string} LANGUAGE - Default language for API responses
 * @property {Array<string>} TEST_MODE_PATTERNS - URL patterns that trigger test mode
 */
const DEFAULTS = {
  API_URL: 'https://wger.de',
  
  AUTH_TYPE: 'none',
  
  LANGUAGE: 'en',
  
  TEST_MODE_PATTERNS: ['localhost', 'test']
};

/**
 * Error messages and field name constants for validation.
 * Provides consistent error messaging across all nodes.
 * 
 * @namespace ERRORS
 * @property {string} MISSING_OPERATION - Error when no operation is specified
 * @property {string} INVALID_OPERATION - Error template for invalid operations
 * @property {string} MISSING_CONFIG - Error when server config is missing
 * @property {string} REQUIRED_FIELD - Error template for missing required fields
 * @property {Object} FIELD_NAMES - Standard field names used in error messages
 */
const ERRORS = {
  MISSING_OPERATION: 'No operation specified',
  INVALID_OPERATION: 'Invalid operation: {operation}',
  MISSING_CONFIG: 'Missing server config',
  
  REQUIRED_FIELD: '{field} is required',
  
  FIELD_NAMES: {
    ENTRY_ID: 'entryId',
    WORKOUT_ID: 'workoutId',
    DAY_ID: 'dayId',
    SET_ID: 'setId',
    PLAN_ID: 'planId',
    MEAL_ID: 'mealId',
    ITEM_ID: 'itemId',
    INGREDIENT_ID: 'ingredientId',
    PROFILE_ID: 'profileId',
    SETTING_ID: 'settingId',
    CATEGORY: 'category',
    VALUE: 'value',
    DATE: 'date',
    WEIGHT: 'weight',
    TIME: 'time',
    TERM: 'term',
    MEAL: 'meal',
    INGREDIENT: 'ingredient',
    AMOUNT: 'amount'
  }
};

/**
 * Standard HTTP method constants.
 * 
 * @namespace HTTP_METHODS
 * @property {string} GET - GET method for retrieving resources
 * @property {string} POST - POST method for creating resources
 * @property {string} PUT - PUT method for full resource updates
 * @property {string} PATCH - PATCH method for partial resource updates
 * @property {string} DELETE - DELETE method for removing resources
 */
const HTTP_METHODS = {
  GET: 'GET',
  POST: 'POST',
  PUT: 'PUT',
  PATCH: 'PATCH',
  DELETE: 'DELETE'
};

/**
 * Node-RED specific configuration including node types and routes.
 * 
 * @namespace NODE_RED
 * @property {Object} NODE_TYPES - Registered node type identifiers
 * @property {string} NODE_TYPES.CONFIG - Configuration node type
 * @property {string} NODE_TYPES.EXERCISE - Exercise operations node
 * @property {string} NODE_TYPES.WORKOUT - Workout operations node
 * @property {string} NODE_TYPES.NUTRITION - Nutrition operations node
 * @property {string} NODE_TYPES.WEIGHT - Weight tracking node
 * @property {string} NODE_TYPES.USER - User management node
 * @property {string} NODE_TYPES.API - Generic API access node
 * @property {Object} ADMIN_ROUTES - Admin UI routes for configuration
 * @property {Object} CREDENTIAL_TYPES - Credential field type definitions
 */
const NODE_RED = {
  NODE_TYPES: {
    CONFIG: 'wger-config',
    EXERCISE: 'wger-exercise',
    WORKOUT: 'wger-workout',
    NUTRITION: 'wger-nutrition',
    WEIGHT: 'wger-weight',
    USER: 'wger-user',
    API: 'wger-api'
  },
  
  ADMIN_ROUTES: {
    TEST_CONNECTION: '/wger-config/:id/test'
  },
  
  CREDENTIAL_TYPES: {
    PASSWORD: 'password',
    TEXT: 'text'
  }
};

/**
 * Exported constants for use throughout the application.
 * 
 * @exports constants
 */
module.exports = {
  API,
  AUTH,
  STATUS,
  DEFAULTS,
  ERRORS,
  HTTP_METHODS,
  NODE_RED
};