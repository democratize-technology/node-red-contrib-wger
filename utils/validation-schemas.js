/**
 * @fileoverview Validation schemas for all wger node operations
 * @module utils/validation-schemas
 * @requires ./input-validator
 * @version 1.0.0
 * @author Node-RED wger contrib team
 */

const InputValidator = require('./input-validator');

/**
 * Shorthand references for cleaner schema definitions
 * @private
 */
const TYPES = InputValidator.TYPES;
const COMMON = InputValidator.COMMON_SCHEMAS;

/**
 * Validation schemas for exercise-related operations.
 * Each schema defines the expected structure and validation rules for operation payloads.
 * 
 * @namespace exerciseSchemas
 * @type {Object<string, Object>}
 * 
 * @property {Object} listExercises - Schema for listing exercises with filters
 * @property {Object} searchExercises - Schema for exercise search by term
 * @property {Object} getExercise - Schema for fetching single exercise by ID
 * @property {Object} getExerciseByBarcode - Schema for fetching exercise by barcode
 * @property {Object} getExerciseImages - Schema for fetching exercise images
 * @property {Object} getExerciseComments - Schema for fetching exercise comments
 * @property {Object} getExerciseCategories - Schema for listing exercise categories
 * @property {Object} getMuscles - Schema for listing muscle groups
 * @property {Object} getEquipment - Schema for listing equipment types
 * 
 * @example
 * // Use schema for validation
 * const validated = InputValidator.validatePayload(
 *   { term: 'bench press', language: 'en' },
 *   exerciseSchemas.searchExercises
 * );
 */
const exerciseSchemas = {
  listExercises: {
    limit: COMMON.limit,
    offset: COMMON.offset,
    language: COMMON.language,
    muscles: {
      type: TYPES.STRING,
      required: false,
      maxLength: 100,
      pattern: /^(\d+,)*\d+$/,  // Comma-separated numbers
      sanitize: true
    },
    equipment: {
      type: TYPES.STRING,
      required: false,
      maxLength: 100,
      pattern: /^(\d+,)*\d+$/,  // Comma-separated numbers
      sanitize: true
    },
    category: {
      type: TYPES.STRING,
      required: false,
      maxLength: 10,
      pattern: /^\d+$/,  // Single number as string
      sanitize: true
    }
  },

  searchExercises: {
    term: {
      type: TYPES.STRING,
      required: true,
      minLength: 2,
      maxLength: 100,
      sanitize: true
    },
    language: COMMON.language
  },

  getExercise: {
    exerciseId: COMMON.id
  },

  getExerciseByBarcode: {
    barcode: COMMON.barcode
  },

  getExerciseImages: {
    exerciseId: COMMON.id
  },

  getExerciseComments: {
    exerciseId: COMMON.id
  },

  getExerciseCategories: {
    limit: COMMON.limit,
    offset: COMMON.offset
  },

  getMuscles: {
    limit: COMMON.limit,
    offset: COMMON.offset
  },

  getEquipment: {
    limit: COMMON.limit,
    offset: COMMON.offset
  }
};

/**
 * Validation schemas for workout-related operations.
 * Includes schemas for workouts, days, sets, and workout sessions.
 * 
 * @namespace workoutSchemas
 * @type {Object<string, Object>}
 * 
 * @property {Object} listWorkouts - Schema for listing workouts with pagination
 * @property {Object} getWorkout - Schema for fetching single workout
 * @property {Object} createWorkout - Schema for creating new workout
 * @property {Object} updateWorkout - Schema for updating existing workout
 * @property {Object} deleteWorkout - Schema for deleting workout
 * @property {Object} getWorkoutCanonical - Schema for fetching workout canonical representation
 * @property {Object} getWorkoutLogData - Schema for fetching workout log data
 * @property {Object} listDays - Schema for listing workout days
 * @property {Object} createDay - Schema for creating workout day
 * @property {Object} updateDay - Schema for updating workout day
 * @property {Object} deleteDay - Schema for deleting workout day
 * @property {Object} listSets - Schema for listing exercise sets
 * @property {Object} createSet - Schema for creating exercise set
 * @property {Object} updateSet - Schema for updating exercise set
 * @property {Object} deleteSet - Schema for deleting exercise set
 * @property {Object} listSessions - Schema for listing workout sessions
 * @property {Object} createSession - Schema for creating workout session
 * @property {Object} updateSession - Schema for updating workout session
 * @property {Object} deleteSession - Schema for deleting workout session
 */
const workoutSchemas = {
  listWorkouts: {
    limit: COMMON.limit,
    offset: COMMON.offset
  },

  getWorkout: {
    workoutId: COMMON.id
  },

  createWorkout: {
    name: COMMON.name,
    creation_date: COMMON.date,
    description: COMMON.description
  },

  updateWorkout: {
    workoutId: COMMON.id,
    name: COMMON.name,
    description: COMMON.description
  },

  deleteWorkout: {
    workoutId: COMMON.id
  },

  getWorkoutCanonical: {
    workoutId: COMMON.id
  },

  getWorkoutLogData: {
    workoutId: COMMON.id
  },

  listDays: {
    limit: COMMON.limit,
    offset: COMMON.offset,
    workout: COMMON.optionalId
  },

  getDay: {
    dayId: COMMON.id
  },

  createDay: {
    description: COMMON.description,
    workout: COMMON.id,
    day: {
      type: TYPES.ARRAY,
      required: true,
      items: {
        type: TYPES.INTEGER,
        min: 1,
        max: 7
      },
      minItems: 1,
      maxItems: 7
    }
  },

  updateDay: {
    dayId: COMMON.id,
    description: COMMON.description,
    day: {
      type: TYPES.ARRAY,
      required: false,
      items: {
        type: TYPES.INTEGER,
        min: 1,
        max: 7
      },
      minItems: 1,
      maxItems: 7
    }
  },

  deleteDay: {
    dayId: COMMON.id
  },

  listSets: {
    limit: COMMON.limit,
    offset: COMMON.offset,
    exerciseday: COMMON.optionalId,
    exercise_base: COMMON.optionalId
  },

  createSet: {
    exerciseday: COMMON.id,
    sets: COMMON.sets,
    order: {
      type: TYPES.INTEGER,
      required: false,
      min: 0,
      max: 100,
      default: 1
    },
    comment: {
      type: TYPES.STRING,
      required: false,
      maxLength: 500,
      sanitize: true
    }
  },

  updateSet: {
    setId: COMMON.id,
    sets: COMMON.sets,
    order: {
      type: TYPES.INTEGER,
      required: false,
      min: 0,
      max: 100
    },
    comment: {
      type: TYPES.STRING,
      required: false,
      maxLength: 500,
      sanitize: true
    }
  },

  deleteSet: {
    setId: COMMON.id
  },

  listWorkoutSessions: {
    workoutId: COMMON.optionalId,
    ordering: {
      type: TYPES.STRING,
      required: false,
      enum: ['date', '-date', 'workout', '-workout'],
      default: '-date'
    },
    limit: COMMON.limit,
    offset: COMMON.offset
  },

  getWorkoutSession: {
    sessionId: COMMON.id
  },

  createWorkoutSession: {
    workout: COMMON.id,
    date: {
      type: TYPES.DATE,
      required: true
    },
    notes: {
      type: TYPES.STRING,
      required: false,
      maxLength: 1000,
      sanitize: true
    },
    impression: {
      type: TYPES.INTEGER,
      required: false,
      min: 1,
      max: 5
    },
    time_start: {
      type: TYPES.STRING,
      required: false,
      pattern: /^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/
    },
    time_end: {
      type: TYPES.STRING,
      required: false,
      pattern: /^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/
    }
  },

  updateWorkoutSession: {
    sessionId: COMMON.id,
    notes: {
      type: TYPES.STRING,
      required: false,
      maxLength: 1000,
      sanitize: true
    },
    impression: {
      type: TYPES.INTEGER,
      required: false,
      min: 1,
      max: 5
    },
    time_start: {
      type: TYPES.STRING,
      required: false,
      pattern: /^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/
    },
    time_end: {
      type: TYPES.STRING,
      required: false,
      pattern: /^([0-1][0-9]|2[0-3]):[0-5][0-9](:[0-5][0-9])?$/
    }
  },

  deleteWorkoutSession: {
    sessionId: COMMON.id
  },

  listWorkoutLogs: {
    workout: COMMON.optionalId,
    limit: COMMON.limit,
    offset: COMMON.offset
  },

  createWorkoutLog: {
    workout: COMMON.id,
    exercise_base: COMMON.id,
    reps: COMMON.reps,
    weight: COMMON.weight,
    weight_unit: {
      type: TYPES.INTEGER,
      required: false,
      enum: [1, 2], // 1=kg, 2=lb
      default: 1
    },
    date: {
      type: TYPES.DATE,
      required: true
    },
    rir: {
      type: TYPES.INTEGER,
      required: false,
      min: 0,
      max: 10
    },
    repetition_unit: {
      type: TYPES.INTEGER,
      required: false,
      min: 1,
      max: 10
    }
  },

  updateWorkoutLog: {
    logId: COMMON.id,
    reps: COMMON.reps,
    weight: {
      type: TYPES.NUMBER,
      required: false,
      min: 0,
      max: 1000
    },
    weight_unit: {
      type: TYPES.INTEGER,
      required: false,
      enum: [1, 2]
    },
    rir: {
      type: TYPES.INTEGER,
      required: false,
      min: 0,
      max: 10
    }
  },

  deleteWorkoutLog: {
    logId: COMMON.id
  },

  getSchedule: {
    workoutId: COMMON.id,
    start_date: COMMON.date,
    end_date: COMMON.date
  },

  getScheduleStep: {
    scheduleId: COMMON.id
  }
};

/**
 * Validation schemas for nutrition-related operations.
 * Includes schemas for nutrition plans, meals, meal items, and ingredient management.
 * 
 * @namespace nutritionSchemas
 * @type {Object<string, Object>}
 * 
 * @property {Object} listNutritionPlans - Schema for listing nutrition plans
 * @property {Object} getNutritionPlan - Schema for fetching single nutrition plan
 * @property {Object} createNutritionPlan - Schema for creating nutrition plan
 * @property {Object} updateNutritionPlan - Schema for updating nutrition plan
 * @property {Object} deleteNutritionPlan - Schema for deleting nutrition plan
 * @property {Object} getNutritionPlanInfo - Schema for fetching plan nutritional info
 * @property {Object} getNutritionPlanValues - Schema for fetching plan nutritional values
 * @property {Object} listMeals - Schema for listing meals
 * @property {Object} createMeal - Schema for creating meal
 * @property {Object} updateMeal - Schema for updating meal
 * @property {Object} deleteMeal - Schema for deleting meal
 * @property {Object} listMealItems - Schema for listing meal items
 * @property {Object} createMealItem - Schema for creating meal item
 * @property {Object} updateMealItem - Schema for updating meal item
 * @property {Object} deleteMealItem - Schema for deleting meal item
 * @property {Object} searchIngredients - Schema for searching ingredients
 * @property {Object} getIngredientInfo - Schema for fetching ingredient details
 */
const nutritionSchemas = {
  listNutritionPlans: {
    limit: COMMON.limit,
    offset: COMMON.offset
  },

  getNutritionPlan: {
    planId: COMMON.id
  },

  createNutritionPlan: {
    description: COMMON.description,
    only_logging: {
      type: TYPES.BOOLEAN,
      required: false,
      default: false
    },
    goal_energy: COMMON.calories,
    goal_protein: COMMON.protein,
    goal_carbohydrates: COMMON.carbs,
    goal_fat: COMMON.fat,
    goal_fiber: {
      type: TYPES.NUMBER,
      required: false,
      min: 0,
      max: 100
    }
  },

  updateNutritionPlan: {
    planId: COMMON.id,
    description: COMMON.description,
    only_logging: {
      type: TYPES.BOOLEAN,
      required: false
    },
    goal_energy: COMMON.calories,
    goal_protein: COMMON.protein,
    goal_carbohydrates: COMMON.carbs,
    goal_fat: COMMON.fat,
    goal_fiber: {
      type: TYPES.NUMBER,
      required: false,
      min: 0,
      max: 100
    }
  },

  deleteNutritionPlan: {
    planId: COMMON.id
  },

  listMeals: {
    plan: COMMON.optionalId,
    limit: COMMON.limit,
    offset: COMMON.offset
  },

  getMeal: {
    mealId: COMMON.id
  },

  createMeal: {
    plan: COMMON.id,
    order: {
      type: TYPES.INTEGER,
      required: false,
      min: 1,
      max: 10,
      default: 1
    },
    time: {
      type: TYPES.STRING,
      required: false,
      pattern: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
    },
    name: COMMON.name
  },

  updateMeal: {
    mealId: COMMON.id,
    order: {
      type: TYPES.INTEGER,
      required: false,
      min: 1,
      max: 10
    },
    time: {
      type: TYPES.STRING,
      required: false,
      pattern: /^([0-1][0-9]|2[0-3]):[0-5][0-9]$/
    },
    name: COMMON.name
  },

  deleteMeal: {
    mealId: COMMON.id
  },

  listMealItems: {
    meal: COMMON.optionalId,
    limit: COMMON.limit,
    offset: COMMON.offset
  },

  createMealItem: {
    meal: COMMON.id,
    ingredient: COMMON.id,
    weight_unit: COMMON.optionalId,
    amount: {
      type: TYPES.NUMBER,
      required: true,
      min: 0,
      max: 10000
    },
    order: {
      type: TYPES.INTEGER,
      required: false,
      min: 1,
      max: 100,
      default: 1
    }
  },

  updateMealItem: {
    itemId: COMMON.id,
    amount: {
      type: TYPES.NUMBER,
      required: false,
      min: 0,
      max: 10000
    },
    order: {
      type: TYPES.INTEGER,
      required: false,
      min: 1,
      max: 100
    }
  },

  deleteMealItem: {
    itemId: COMMON.id
  },

  searchIngredient: {
    term: {
      type: TYPES.STRING,
      required: true,
      minLength: 2,
      maxLength: 100,
      sanitize: true
    },
    language: COMMON.language
  },

  getIngredient: {
    ingredientId: COMMON.id
  },

  getIngredientByBarcode: {
    barcode: COMMON.barcode
  },

  listNutritionDiary: {
    plan: COMMON.optionalId,
    limit: COMMON.limit,
    offset: COMMON.offset
  },

  createNutritionDiary: {
    plan: COMMON.id,
    meal: COMMON.optionalId,
    ingredient: COMMON.id,
    weight_unit: COMMON.optionalId,
    datetime: {
      type: TYPES.DATE,
      required: true
    },
    amount: {
      type: TYPES.NUMBER,
      required: true,
      min: 0,
      max: 10000
    }
  },

  updateNutritionDiary: {
    diaryId: COMMON.id,
    amount: {
      type: TYPES.NUMBER,
      required: false,
      min: 0,
      max: 10000
    },
    datetime: COMMON.date
  },

  deleteNutritionDiary: {
    diaryId: COMMON.id
  },

  getNutritionalValues: {
    planId: COMMON.id,
    date: COMMON.date
  },

  getWeightUnits: {
    limit: COMMON.limit,
    offset: COMMON.offset
  },

  getIngredientCategories: {
    limit: COMMON.limit,
    offset: COMMON.offset
  }
};

/**
 * Validation schemas for weight tracking operations.
 * Includes schemas for weight entries and statistics.
 * 
 * @namespace weightSchemas
 * @type {Object<string, Object>}
 * 
 * @property {Object} listWeightEntries - Schema for listing weight entries with filters
 * @property {Object} getWeightEntry - Schema for fetching single weight entry
 * @property {Object} createWeightEntry - Schema for creating new weight entry
 * @property {Object} updateWeightEntry - Schema for updating existing weight entry
 * @property {Object} deleteWeightEntry - Schema for deleting weight entry
 */
const weightSchemas = {
  listWeightEntries: {
    limit: COMMON.limit,
    offset: COMMON.offset
  },

  getWeightEntry: {
    entryId: COMMON.id
  },

  createWeightEntry: {
    weight: COMMON.weight,
    date: {
      type: TYPES.DATE,
      required: true
    }
  },

  updateWeightEntry: {
    entryId: COMMON.id,
    weight: {
      type: TYPES.NUMBER,
      required: false,
      min: 0,
      max: 1000
    },
    date: COMMON.date
  },

  deleteWeightEntry: {
    entryId: COMMON.id
  }
};

/**
 * Validation schemas for user management operations.
 * Includes schemas for user profiles, settings, API keys, and measurements.
 * 
 * @namespace userSchemas
 * @type {Object<string, Object>}
 * 
 * @property {Object} getUserProfile - Schema for fetching user profile
 * @property {Object} updateUserProfile - Schema for updating user profile
 * @property {Object} listSettings - Schema for listing user settings
 * @property {Object} getSetting - Schema for fetching single setting
 * @property {Object} updateSetting - Schema for updating user setting
 * @property {Object} getUserInfo - Schema for fetching user information
 * @property {Object} listApiKeys - Schema for listing API keys
 * @property {Object} createApiKey - Schema for creating new API key
 * @property {Object} deleteApiKey - Schema for deleting API key
 * @property {Object} listMeasurementCategories - Schema for listing measurement categories
 * @property {Object} listMeasurements - Schema for listing measurements
 * @property {Object} createMeasurement - Schema for creating new measurement
 * @property {Object} updateMeasurement - Schema for updating measurement
 * @property {Object} deleteMeasurement - Schema for deleting measurement
 */
const userSchemas = {
  getUserProfile: {
    // No parameters required
  },

  updateUserProfile: {
    gym: COMMON.optionalId,
    is_temporary: {
      type: TYPES.BOOLEAN,
      required: false
    },
    show_comments: {
      type: TYPES.BOOLEAN,
      required: false
    },
    show_english_ingredients: {
      type: TYPES.BOOLEAN,
      required: false
    },
    workout_reminder_active: {
      type: TYPES.BOOLEAN,
      required: false
    },
    workout_reminder: {
      type: TYPES.INTEGER,
      required: false,
      min: 0,
      max: 30
    },
    workout_duration: {
      type: TYPES.INTEGER,
      required: false,
      min: 0,
      max: 300
    },
    last_workout_notification: COMMON.date,
    notification_language: {
      type: TYPES.INTEGER,
      required: false,
      min: 1,
      max: 20
    },
    timer_active: {
      type: TYPES.BOOLEAN,
      required: false
    },
    timer_pause: {
      type: TYPES.INTEGER,
      required: false,
      min: 0,
      max: 300
    },
    age: {
      type: TYPES.INTEGER,
      required: false,
      min: 1,
      max: 150
    },
    height: {
      type: TYPES.INTEGER,
      required: false,
      min: 50,
      max: 300
    },
    gender: {
      type: TYPES.STRING,
      required: false,
      enum: ['1', '2'] // 1=male, 2=female
    },
    sleep_hours: {
      type: TYPES.INTEGER,
      required: false,
      min: 0,
      max: 24
    },
    work_hours: {
      type: TYPES.INTEGER,
      required: false,
      min: 0,
      max: 24
    },
    work_intensity: {
      type: TYPES.INTEGER,
      required: false,
      min: 1,
      max: 5
    },
    sport_hours: {
      type: TYPES.INTEGER,
      required: false,
      min: 0,
      max: 24
    },
    sport_intensity: {
      type: TYPES.INTEGER,
      required: false,
      min: 1,
      max: 5
    },
    freetime_hours: {
      type: TYPES.INTEGER,
      required: false,
      min: 0,
      max: 24
    },
    freetime_intensity: {
      type: TYPES.INTEGER,
      required: false,
      min: 1,
      max: 5
    },
    calories: COMMON.calories,
    weight_unit: {
      type: TYPES.STRING,
      required: false,
      enum: ['kg', 'lb']
    },
    date_format: {
      type: TYPES.STRING,
      required: false,
      maxLength: 20,
      sanitize: true
    },
    num_days_weight_reminder: {
      type: TYPES.INTEGER,
      required: false,
      min: 0,
      max: 30
    }
  },

  getApiKey: {
    // No parameters required
  },

  generateApiKey: {
    // No parameters required
  },

  getUserPreferences: {
    // No parameters required
  },

  updateUserPreferences: {
    language: COMMON.language,
    theme: {
      type: TYPES.STRING,
      required: false,
      enum: ['light', 'dark', 'auto']
    },
    units: {
      type: TYPES.STRING,
      required: false,
      enum: ['metric', 'imperial']
    }
  }
};

/**
 * Validation schemas for generic API operations.
 * Provides flexible schemas for direct API access when specific operations are not available.
 * 
 * @namespace apiSchemas
 * @type {Object<string, Object>}
 * 
 * @property {Object} genericRequest - Schema for generic API requests
 * @property {Object} get - Schema for GET requests
 * @property {Object} post - Schema for POST requests
 * @property {Object} put - Schema for PUT requests
 * @property {Object} patch - Schema for PATCH requests
 * @property {Object} delete - Schema for DELETE requests
 */
const apiSchemas = {
  // Generic operations allow more flexibility but still validate basic types
  get: {
    _strict: false, // Allow additional fields for generic API calls
    endpoint: {
      type: TYPES.STRING,
      required: true,
      minLength: 1,
      maxLength: 500,
      sanitize: true,
      validate: (value) => {
        // Prevent path traversal
        if (value.includes('../') || value.includes('..\\')) {
          return 'Endpoint cannot contain path traversal patterns';
        }
        return true;
      }
    },
    params: {
      type: TYPES.OBJECT,
      required: false,
      validate: (value) => {
        // Validate all param values are safe
        for (const [key, val] of Object.entries(value)) {
          if (typeof val === 'string' && val.length > 1000) {
            return `Parameter '${key}' is too long`;
          }
        }
        return true;
      }
    }
  },

  post: {
    _strict: false,
    endpoint: {
      type: TYPES.STRING,
      required: true,
      minLength: 1,
      maxLength: 500,
      sanitize: true,
      validate: (value) => {
        if (value.includes('../') || value.includes('..\\')) {
          return 'Endpoint cannot contain path traversal patterns';
        }
        return true;
      }
    },
    payload: {
      type: TYPES.OBJECT,
      required: false,
      validate: (value) => {
        // Deep validation of payload
        const jsonStr = JSON.stringify(value);
        if (jsonStr.length > 100000) {
          return 'Payload is too large';
        }
        return true;
      }
    },
    query: {
      type: TYPES.OBJECT,
      required: false
    }
  },

  put: {
    _strict: false,
    endpoint: {
      type: TYPES.STRING,
      required: true,
      minLength: 1,
      maxLength: 500,
      sanitize: true
    },
    payload: {
      type: TYPES.OBJECT,
      required: false
    },
    params: {
      type: TYPES.OBJECT,
      required: false
    }
  },

  patch: {
    _strict: false,
    endpoint: {
      type: TYPES.STRING,
      required: true,
      minLength: 1,
      maxLength: 500,
      sanitize: true
    },
    payload: {
      type: TYPES.OBJECT,
      required: false
    },
    params: {
      type: TYPES.OBJECT,
      required: false
    }
  },

  delete: {
    _strict: false,
    endpoint: {
      type: TYPES.STRING,
      required: true,
      minLength: 1,
      maxLength: 500,
      sanitize: true
    },
    params: {
      type: TYPES.OBJECT,
      required: false
    }
  }
};

/**
 * Export all validation schemas organized by node type.
 * Each schema collection corresponds to a specific Node-RED node type
 * and contains validation rules for all operations supported by that node.
 * 
 * @exports validation-schemas
 * @type {Object}
 * @property {Object} exercise - Exercise node operation schemas
 * @property {Object} workout - Workout node operation schemas  
 * @property {Object} nutrition - Nutrition node operation schemas
 * @property {Object} weight - Weight tracking node operation schemas
 * @property {Object} user - User management node operation schemas
 * @property {Object} api - Generic API node operation schemas
 * 
 * @example
 * // Import and use schemas in a node
 * const schemas = require('./utils/validation-schemas');
 * const exerciseSchema = schemas.exercise.searchExercises;
 * const validated = InputValidator.validatePayload(payload, exerciseSchema);
 */
module.exports = {
  exercise: exerciseSchemas,
  workout: workoutSchemas,
  nutrition: nutritionSchemas,
  weight: weightSchemas,
  user: userSchemas,
  api: apiSchemas
};