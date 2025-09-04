const BaseNodeHandler = require('../utils/base-node-handler');
const OperationRegistry = require('../utils/operation-registry');
const userOperations = require('./operations/user-operations');

module.exports = function (RED) {
  // Create and configure the operation registry for user operations
  const operationRegistry = new OperationRegistry();
  operationRegistry.registerAll(userOperations);

  function WgerUserNode(config) {
    const node = this;

    // Operation handler using the registry pattern
    const handleUserOperation = async (client, operation, payload) => {
      return await operationRegistry.execute(operation, client, payload);
    };

    // Setup node using base handler
    BaseNodeHandler.setupNode(RED, node, config, handleUserOperation);
  }

  RED.nodes.registerType('wger-user', WgerUserNode);
};