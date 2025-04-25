const WgerApiClient = require('../utils/api-client');

module.exports = function (RED) {
  function WgerUserNode(config) {
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

        // Execute the Wger user operation
        switch (operation) {
          case 'getUserProfile':
            result = await client.get('/api/v2/userprofile/');
            break;

          case 'updateUserProfile':
            if (!payload.profileId) {
              throw new Error('profileId is required');
            }
            const updateData = { ...payload };
            delete updateData.profileId;
            result = await client.patch(`/api/v2/userprofile/${payload.profileId}/`, updateData);
            break;

          case 'getUserSettings':
            result = await client.get('/api/v2/setting/');
            break;

          case 'updateUserSettings':
            if (!payload.settingId) {
              throw new Error('settingId is required');
            }
            const settingsData = { ...payload };
            delete settingsData.settingId;
            result = await client.patch(`/api/v2/setting/${payload.settingId}/`, settingsData);
            break;

          case 'getUserInfo':
            result = await client.get('/api/v2/userinfo/');
            break;

          case 'getApiKey':
            result = await client.get('/api/v2/apikey/');
            break;

          case 'createApiKey':
            result = await client.post('/api/v2/apikey/');
            break;

          case 'getMeasurements':
            result = await client.get('/api/v2/measurement-category/');
            break;

          case 'createMeasurement':
            if (!payload.category || !payload.value || !payload.date) {
              throw new Error('category, value, and date are required');
            }
            result = await client.post('/api/v2/measurement/', {
              category: payload.category,
              value: payload.value,
              date: payload.date,
              notes: payload.notes,
            });
            break;

          case 'getMeasurementEntries':
            result = await client.get('/api/v2/measurement/', {
              category: payload.category,
              date__gte: payload.startDate,
              date__lte: payload.endDate,
            });
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

  RED.nodes.registerType('wger-user', WgerUserNode);
};
