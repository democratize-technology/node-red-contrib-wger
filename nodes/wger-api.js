const WgerApiClient = require('../utils/api-client');

module.exports = function (RED) {
  function WgerApiNode(config) {
    RED.nodes.createNode(this, config);
    const node = this;

    // Get configuration node
    this.server = RED.nodes.getNode(config.server);
    this.method = config.method;
    this.endpoint = config.endpoint;

    if (!this.server) {
      node.status({ fill: 'red', shape: 'ring', text: 'Missing server config' });
      return;
    }

    node.on('input', async function (msg, send, done) {
      // Set initial node status
      node.status({ fill: 'blue', shape: 'dot', text: 'requesting...' });

      const method = msg.method || node.method || 'GET';
      let endpoint = msg.endpoint || node.endpoint;
      const payload = msg.payload || {};

      if (!endpoint) {
        node.status({ fill: 'red', shape: 'ring', text: 'no endpoint specified' });
        const error = new Error('No endpoint specified');
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
        
        // Process path parameters
        if (msg.params && typeof endpoint === 'string') {
          Object.keys(msg.params).forEach((param) => {
            endpoint = endpoint.replace(`{${param}}`, msg.params[param]);
          });
        }

        let result;
        
        // Execute the API request
        switch (method.toUpperCase()) {
          case 'GET':
            result = await client.get(endpoint, msg.query || payload);
            break;
          case 'POST':
            result = await client.post(endpoint, payload);
            break;
          case 'PUT':
            result = await client.put(endpoint, payload);
            break;
          case 'PATCH':
            result = await client.patch(endpoint, payload);
            break;
          case 'DELETE':
            result = await client.delete(endpoint, msg.query);
            break;
          default:
            throw new Error(`Unsupported HTTP method: ${method}`);
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

  RED.nodes.registerType('wger-api', WgerApiNode);
};
