const OperationBuilders = require('../../utils/operation-builders');
const { API, DEFAULTS } = require('../../utils/constants');
const validationSchemas = require('../../utils/validation-schemas');

/**
 * Exercise-specific operations
 */
const exerciseOperations = {
  // List exercises with filtering
  listExercises: OperationBuilders.listOperation(
    API.ENDPOINTS.EXERCISES, 
    {
      limit: 'limit',
      offset: 'offset',
      language: payload => payload.language || DEFAULTS.LANGUAGE,
      muscles: 'muscles',
      equipment: 'equipment',
      category: 'category'
    },
    validationSchemas.exercise.listExercises
  ),
  
  // Search exercises by term
  searchExercises: OperationBuilders.customOperation(
    ['term'],
    async (client, payload) => {
      return await client.get(API.ENDPOINTS.EXERCISE_SEARCH, {
        term: payload.term,
        language: payload.language || DEFAULTS.LANGUAGE
      });
    },
    validationSchemas.exercise.searchExercises
  ),
  
  // Get specific exercise details
  getExercise: OperationBuilders.getByIdOperation(
    API.ENDPOINTS.EXERCISE_BY_ID, 
    'exerciseId',
    validationSchemas.exercise.getExercise
  ),
  
  // Search exercise by barcode
  getExerciseByBarcode: OperationBuilders.customOperation(
    ['barcode'],
    async (client, payload) => {
      return await client.get(API.ENDPOINTS.EXERCISE_SEARCH, {
        term: payload.barcode,
        type: 'barcode'
      });
    },
    validationSchemas.exercise.getExerciseByBarcode
  ),
  
  // Get exercise images
  getExerciseImages: OperationBuilders.customOperation(
    ['exerciseId'],
    async (client, payload) => {
      return await client.get(API.ENDPOINTS.EXERCISE_IMAGES, {
        exercise_base: payload.exerciseId
      });
    },
    validationSchemas.exercise.getExerciseImages
  ),
  
  // Get exercise comments
  getExerciseComments: OperationBuilders.customOperation(
    ['exerciseId'],
    async (client, payload) => {
      return await client.get(API.ENDPOINTS.EXERCISE_COMMENTS, {
        exercise: payload.exerciseId
      });
    },
    validationSchemas.exercise.getExerciseComments
  ),
  
  // Get exercise categories
  getExerciseCategories: OperationBuilders.listOperation(
    API.ENDPOINTS.EXERCISE_CATEGORIES,
    {},
    validationSchemas.exercise.getExerciseCategories
  ),
  
  // Get muscles
  getMuscles: OperationBuilders.listOperation(
    API.ENDPOINTS.MUSCLES,
    {},
    validationSchemas.exercise.getMuscles
  ),
  
  // Get equipment
  getEquipment: OperationBuilders.listOperation(
    API.ENDPOINTS.EQUIPMENT,
    {},
    validationSchemas.exercise.getEquipment
  )
};

module.exports = exerciseOperations;