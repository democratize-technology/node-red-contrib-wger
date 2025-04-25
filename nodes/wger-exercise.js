const WgerApiClient = require('../utils/api-client');

module.exports = function (RED) {
  function WgerExerciseNode(config) {
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

        // Execute the Wger exercise operation
        switch (operation) {
          case 'listExercises':
            result = await client.makeRequest('GET', '/api/v2/exercisebaseinfo/', null, {
              limit: payload.limit,
              offset: payload.offset,
              language: payload.language || 'en',
              muscles: payload.muscles,
              equipment: payload.equipment,
              category: payload.category,
            });
            break;

          case 'searchExercises':
            if (!payload.term) {
              throw new Error('search term is required');
            }
            result = await client.makeRequest('GET', '/api/v2/exercise/search/', null, {
              term: payload.term,
              language: payload.language || 'en',
            });
            break;

          case 'getExercise':
            if (!payload.exerciseId) {
              throw new Error('exerciseId is required');
            }
            result = await client.makeRequest('GET', `/api/v2/exercisebaseinfo/${payload.exerciseId}/`);
            break;

          case 'getExerciseByBarcode':
            if (!payload.barcode) {
              throw new Error('barcode is required');
            }
            result = await client.makeRequest('GET', `/api/v2/exercise/search/`, null, {
              term: payload.barcode,
              type: 'barcode',
            });
            break;

          case 'getExerciseImages':
            if (!payload.exerciseId) {
              throw new Error('exerciseId is required');
            }
            result = await client.makeRequest('GET', `/api/v2/exerciseimage/`, null, {
              exercise_base: payload.exerciseId,
            });
            break;

          case 'getExerciseComments':
            if (!payload.exerciseId) {
              throw new Error('exerciseId is required');
            }
            result = await client.makeRequest('GET', `/api/v2/exercisecomment/`, null, {
              exercise: payload.exerciseId,
            });
            break;

          case 'getExerciseCategories':
            result = await client.makeRequest('GET', '/api/v2/exercisecategory/');
            break;

          case 'getMuscles':
            result = await client.makeRequest('GET', '/api/v2/muscle/');
            break;

          case 'getEquipment':
            result = await client.makeRequest('GET', '/api/v2/equipment/');
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

  RED.nodes.registerType('wger-exercise', WgerExerciseNode);
};
