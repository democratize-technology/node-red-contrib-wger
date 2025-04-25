const WgerApiClient = require('../utils/api-client');

module.exports = function (RED) {
  function WgerWorkoutNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    // Get configuration node
    this.server = RED.nodes.getNode(config.server);
    this.operation = config.operation;

    if (!this.server) {
      node.status({ fill: 'red', shape: 'ring', text: 'Missing server config' });
      return;
    }

    node.on('input', async function (msg, send, done) {
      // Set initial node status
      node.status({ fill: 'blue', shape: 'dot', text: 'requesting...' });

      const operation = msg.operation || node.operation;
      const payload = msg.payload || {};

      if (!operation) {
        node.status({ fill: 'red', shape: 'ring', text: 'no operation specified' });
        const error = new Error('No operation specified');
        if (done) {
          done(error);
        } else {
          node.error(error, msg);
        }
        return;
      }

      try {
        // Initialize Wger client
        const client = new WgerApiClient(node.server.apiUrl, node.server.getAuthHeader());
        let result;

        // Execute the Wger workout operation
        switch (operation) {
          case 'listWorkouts':
            result = await client.get('/api/v2/workout/');
            break;

          case 'getWorkout':
            if (!payload.workoutId) {
              throw new Error('workoutId is required');
            }
            result = await client.get(`/api/v2/workout/${payload.workoutId}/`);
            break;

          case 'createWorkout':
            result = await client.post('/api/v2/workout/', payload);
            break;

          case 'updateWorkout':
            if (!payload.workoutId) {
              throw new Error('workoutId is required');
            }
            const updateData = { ...payload };
            delete updateData.workoutId;
            result = await client.patch(`/api/v2/workout/${payload.workoutId}/`, updateData);
            break;

          case 'deleteWorkout':
            if (!payload.workoutId) {
              throw new Error('workoutId is required');
            }
            result = await client.delete(`/api/v2/workout/${payload.workoutId}/`);
            break;

          case 'getWorkoutCanonical':
            if (!payload.workoutId) {
              throw new Error('workoutId is required');
            }
            result = await client.get(`/api/v2/workout/${payload.workoutId}/canonical_representation/`);
            break;

          case 'getWorkoutLogData':
            if (!payload.workoutId) {
              throw new Error('workoutId is required');
            }
            result = await client.get(`/api/v2/workout/${payload.workoutId}/log_data/`);
            break;

          case 'listDays':
            result = await client.get('/api/v2/day/');
            break;

          case 'getDay':
            if (!payload.dayId) {
              throw new Error('dayId is required');
            }
            result = await client.get(`/api/v2/day/${payload.dayId}/`);
            break;

          case 'createDay':
            result = await client.post('/api/v2/day/', payload);
            break;

          case 'updateDay':
            if (!payload.dayId) {
              throw new Error('dayId is required');
            }
            const updateDayData = { ...payload };
            delete updateDayData.dayId;
            result = await client.patch(`/api/v2/day/${payload.dayId}/`, updateDayData);
            break;

          case 'deleteDay':
            if (!payload.dayId) {
              throw new Error('dayId is required');
            }
            result = await client.delete(`/api/v2/day/${payload.dayId}/`);
            break;

          case 'listSets':
            result = await client.get('/api/v2/set/');
            break;

          case 'createSet':
            result = await client.post('/api/v2/set/', payload);
            break;

          case 'updateSet':
            if (!payload.setId) {
              throw new Error('setId is required');
            }
            const updateSetData = { ...payload };
            delete updateSetData.setId;
            result = await client.patch(`/api/v2/set/${payload.setId}/`, updateSetData);
            break;

          case 'deleteSet':
            if (!payload.setId) {
              throw new Error('setId is required');
            }
            result = await client.delete(`/api/v2/set/${payload.setId}/`);
            break;

          case 'listWorkoutSessions':
            result = await client.get('/api/v2/workoutsession/', {
              workout: payload.workoutId,
              ordering: payload.ordering || '-date',
              limit: payload.limit,
              offset: payload.offset
            });
            break;

          case 'getWorkoutSession':
            if (!payload.sessionId) {
              throw new Error('sessionId is required');
            }
            result = await client.get(`/api/v2/workoutsession/${payload.sessionId}/`);
            break;

          case 'createWorkoutSession':
            if (!payload.workout || !payload.date) {
              throw new Error('workout and date are required');
            }
            result = await client.post('/api/v2/workoutsession/', payload);
            break;

          case 'updateWorkoutSession':
            if (!payload.sessionId) {
              throw new Error('sessionId is required');
            }
            const updateSessionData = { ...payload };
            delete updateSessionData.sessionId;
            result = await client.patch(`/api/v2/workoutsession/${payload.sessionId}/`, updateSessionData);
            break;

          case 'deleteWorkoutSession':
            if (!payload.sessionId) {
              throw new Error('sessionId is required');
            }
            result = await client.delete(`/api/v2/workoutsession/${payload.sessionId}/`);
            break;

          case 'getLatestWorkoutSession':
            const sessions = await client.get('/api/v2/workoutsession/', {
              workout: payload.workoutId,
              ordering: '-date',
              limit: 1
            });
            result = sessions.results && sessions.results.length > 0 ? sessions.results[0] : null;
            break;

          default:
            node.status({ fill: 'red', shape: 'ring', text: 'invalid operation' });
            const error = new Error(`Invalid operation: ${operation}`);
            if (done) {
              done(error);
            } else {
              node.error(error, msg);
            }
            return;
        }

        // Update status and send response
        node.status({ fill: 'green', shape: 'dot', text: 'success' });
        msg.payload = result;
        send(msg);

        if (done) {
          done();
        }
      } catch (error) {
        node.status({ fill: 'red', shape: 'dot', text: error.message });
        if (done) {
          done(error);
        } else {
          node.error(error, msg);
        }
      }
    });

    node.on('close', function () {
      node.status({});
    });
  }

  RED.nodes.registerType('wger-workout', WgerWorkoutNode);
};
