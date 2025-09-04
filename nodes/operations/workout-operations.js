const OperationBuilders = require('../../utils/operation-builders');
const { API } = require('../../utils/constants');
const validationSchemas = require('../../utils/validation-schemas');

/**
 * Workout-specific operations
 */
const workoutOperations = {
  // Standard CRUD operations using builders
  listWorkouts: OperationBuilders.listOperation(
    API.ENDPOINTS.WORKOUTS,
    {},
    validationSchemas.workout.listWorkouts
  ),
  
  getWorkout: OperationBuilders.getByIdOperation(
    API.ENDPOINTS.WORKOUT_BY_ID, 
    'workoutId',
    validationSchemas.workout.getWorkout
  ),
  
  createWorkout: OperationBuilders.createOperation(
    API.ENDPOINTS.WORKOUTS,
    null,
    validationSchemas.workout.createWorkout
  ),
  
  updateWorkout: OperationBuilders.updateOperation(
    API.ENDPOINTS.WORKOUT_BY_ID, 
    'workoutId',
    'patch',
    validationSchemas.workout.updateWorkout
  ),
  
  deleteWorkout: OperationBuilders.deleteOperation(
    API.ENDPOINTS.WORKOUT_BY_ID, 
    'workoutId',
    validationSchemas.workout.deleteWorkout
  ),
  
  // Custom workout operations
  getWorkoutCanonical: OperationBuilders.getByIdOperation(
    API.ENDPOINTS.WORKOUT_CANONICAL, 
    'workoutId',
    validationSchemas.workout.getWorkoutCanonical
  ),
  
  getWorkoutLogData: OperationBuilders.getByIdOperation(
    API.ENDPOINTS.WORKOUT_LOG_DATA, 
    'workoutId',
    validationSchemas.workout.getWorkoutLogData
  ),
  
  // Day operations
  listDays: OperationBuilders.listOperation(
    API.ENDPOINTS.DAYS,
    {},
    validationSchemas.workout.listDays
  ),
  
  getDay: OperationBuilders.getByIdOperation(
    API.ENDPOINTS.DAY_BY_ID, 
    'dayId',
    validationSchemas.workout.getDay
  ),
  
  createDay: OperationBuilders.createOperation(
    API.ENDPOINTS.DAYS,
    null,
    validationSchemas.workout.createDay
  ),
  
  updateDay: OperationBuilders.updateOperation(
    API.ENDPOINTS.DAY_BY_ID, 
    'dayId',
    'patch',
    validationSchemas.workout.updateDay
  ),
  
  deleteDay: OperationBuilders.deleteOperation(
    API.ENDPOINTS.DAY_BY_ID, 
    'dayId',
    validationSchemas.workout.deleteDay
  ),
  
  // Set operations
  listSets: OperationBuilders.listOperation(
    API.ENDPOINTS.SETS,
    {},
    validationSchemas.workout.listSets
  ),
  
  createSet: OperationBuilders.createOperation(
    API.ENDPOINTS.SETS,
    null,
    validationSchemas.workout.createSet
  ),
  
  updateSet: OperationBuilders.updateOperation(
    API.ENDPOINTS.SET_BY_ID, 
    'setId',
    'patch',
    validationSchemas.workout.updateSet
  ),
  
  deleteSet: OperationBuilders.deleteOperation(
    API.ENDPOINTS.SET_BY_ID, 
    'setId',
    validationSchemas.workout.deleteSet
  ),
  
  // Workout session operations
  listWorkoutSessions: OperationBuilders.listOperation(
    API.ENDPOINTS.WORKOUT_SESSIONS, 
    {
      workout: 'workoutId',
      ordering: payload => payload.ordering || '-date',
      limit: 'limit',
      offset: 'offset'
    },
    validationSchemas.workout.listWorkoutSessions
  ),
  
  getWorkoutSession: OperationBuilders.getByIdOperation(
    API.ENDPOINTS.WORKOUT_SESSION_BY_ID, 
    'sessionId',
    validationSchemas.workout.getWorkoutSession
  ),
  
  createWorkoutSession: OperationBuilders.customOperation(
    ['workout', 'date'],
    async (client, payload) => {
      return await client.post(API.ENDPOINTS.WORKOUT_SESSIONS, payload);
    },
    validationSchemas.workout.createWorkoutSession
  ),
  
  updateWorkoutSession: OperationBuilders.updateOperation(
    API.ENDPOINTS.WORKOUT_SESSION_BY_ID, 
    'sessionId',
    'patch',
    validationSchemas.workout.updateWorkoutSession
  ),
  
  deleteWorkoutSession: OperationBuilders.deleteOperation(
    API.ENDPOINTS.WORKOUT_SESSION_BY_ID, 
    'sessionId',
    validationSchemas.workout.deleteWorkoutSession
  ),
  
  // Custom operation for latest workout session
  getLatestWorkoutSession: OperationBuilders.customOperation(
    null,
    async (client, payload) => {
      const sessions = await client.get(API.ENDPOINTS.WORKOUT_SESSIONS, {
        workout: payload.workoutId,
        ordering: '-date',
        limit: 1
      });
      return sessions.results && sessions.results.length > 0 ? sessions.results[0] : null;
    },
    { workoutId: validationSchemas.workout.listWorkoutSessions.workoutId }
  ),
  
  // Workout log operations
  listWorkoutLogs: OperationBuilders.listOperation(
    API.ENDPOINTS.WORKOUT_LOGS,
    {
      workout: 'workout',
      limit: 'limit',
      offset: 'offset'
    },
    validationSchemas.workout.listWorkoutLogs
  ),
  
  createWorkoutLog: OperationBuilders.createOperation(
    API.ENDPOINTS.WORKOUT_LOGS,
    null,
    validationSchemas.workout.createWorkoutLog
  ),
  
  updateWorkoutLog: OperationBuilders.updateOperation(
    API.ENDPOINTS.WORKOUT_LOG_BY_ID,
    'logId',
    'patch',
    validationSchemas.workout.updateWorkoutLog
  ),
  
  deleteWorkoutLog: OperationBuilders.deleteOperation(
    API.ENDPOINTS.WORKOUT_LOG_BY_ID,
    'logId',
    validationSchemas.workout.deleteWorkoutLog
  ),
  
  // Schedule operations
  getSchedule: OperationBuilders.customOperation(
    null,
    async (client, payload) => {
      const params = {
        workout: payload.workoutId
      };
      if (payload.start_date) params.start_date = payload.start_date;
      if (payload.end_date) params.end_date = payload.end_date;
      return await client.get(API.ENDPOINTS.SCHEDULE, params);
    },
    validationSchemas.workout.getSchedule
  ),
  
  getScheduleStep: OperationBuilders.getByIdOperation(
    API.ENDPOINTS.SCHEDULE_STEP_BY_ID,
    'scheduleId',
    validationSchemas.workout.getScheduleStep
  )
};

module.exports = workoutOperations;