module.exports = function (RED) {
  function WgerConfigNode(n) {
    RED.nodes.createNode(this, n);

    this.name = n.name;
    this.apiUrl = n.apiUrl || 'https://wger.de';
    this.authType = n.authType || 'none';

    // Automatically set test mode based on API URL
    this.isTestMode = this.apiUrl.includes('localhost') || this.apiUrl.includes('test');

    this.getAuthHeader = function () {
      if (this.authType === 'token' && this.credentials.token) {
        return { Authorization: 'Token ' + this.credentials.token };
      } else if (this.authType === 'jwt' && this.credentials.token) {
        return { Authorization: 'Bearer ' + this.credentials.token };
      }
      return {};
    };

    // Test connection method
    this.testConnection = async function () {
      const axios = require('axios');
      try {
        const response = await axios({
          method: 'GET',
          url: `${this.apiUrl}/api/v2/info/`,
          headers: this.getAuthHeader(),
          timeout: 5000,
        });
        return { success: true, data: response.data };
      } catch (error) {
        return {
          success: false,
          status: error.response ? error.response.status : 0,
          message: error.response ? error.response.statusText : error.message,
        };
      }
    };
  }

  RED.nodes.registerType('wger-config', WgerConfigNode, {
    credentials: {
      token: { type: 'password' },
      username: { type: 'text' },
      password: { type: 'password' },
    },
  });

  // Add HTTP admin route for testing connection
  RED.httpAdmin.post('/wger-config/:id/test', RED.auth.needsPermission('wger-config.write'), async function (req, res) {
    const node = RED.nodes.getNode(req.params.id);
    if (node != null) {
      try {
        const result = await node.testConnection();
        res.json(result);
      } catch (err) {
        res.status(500).json({ error: err.message });
      }
    } else {
      res.status(404).json({ error: 'Node not found' });
    }
  });
};
