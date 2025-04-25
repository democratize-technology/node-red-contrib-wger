const WgerApiClient = require('../utils/api-client');

module.exports = function (RED) {
  function WgerWeightNode(config) {
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

        // Execute the Wger weight operation
        switch (operation) {
          case 'listWeightEntries':
            result = await client.get('/api/v2/weightentry/', {
              date__gte: payload.startDate,
              date__lte: payload.endDate,
              limit: payload.limit,
              offset: payload.offset,
            });
            break;

          case 'getWeightEntry':
            if (!payload.entryId) {
              throw new Error('entryId is required');
            }
            result = await client.get(`/api/v2/weightentry/${payload.entryId}/`);
            break;

          case 'createWeightEntry':
            if (!payload.weight || !payload.date) {
              throw new Error('weight and date are required');
            }
            result = await client.post('/api/v2/weightentry/', {
              weight: payload.weight,
              date: payload.date,
              comment: payload.comment,
            });
            break;

          case 'updateWeightEntry':
            if (!payload.entryId) {
              throw new Error('entryId is required');
            }
            const updateData = { ...payload };
            delete updateData.entryId;
            result = await client.patch(`/api/v2/weightentry/${payload.entryId}/`, updateData);
            break;

          case 'deleteWeightEntry':
            if (!payload.entryId) {
              throw new Error('entryId is required');
            }
            result = await client.delete(`/api/v2/weightentry/${payload.entryId}/`);
            break;

          case 'getWeightStats':
            // Get weight entries for statistics
            const entries = await client.get('/api/v2/weightentry/', {
              date__gte: payload.startDate,
              date__lte: payload.endDate,
              ordering: '-date',
            });

            if (entries.results && entries.results.length > 0) {
              const weights = entries.results.map((entry) => entry.weight);
              const min = Math.min(...weights);
              const max = Math.max(...weights);
              const avg = weights.reduce((a, b) => a + b, 0) / weights.length;
              const latest = entries.results[0].weight;
              const oldest = entries.results[entries.results.length - 1].weight;
              const change = latest - oldest;

              result = {
                stats: {
                  min,
                  max,
                  avg,
                  latest,
                  oldest,
                  change,
                  count: entries.results.length,
                },
                entries: entries.results,
              };
            } else {
              result = {
                stats: null,
                entries: [],
              };
            }
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

  RED.nodes.registerType('wger-weight', WgerWeightNode);
};
