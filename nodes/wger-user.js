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
    const handleOperation = BaseNodeHandler.createOperationHandler(operationRegistry);

    // Setup node using base handler
    BaseNodeHandler.setupNode(RED, node, config, handleOperation);
  }

  RED.nodes.registerType('wger-user', WgerUserNode);
};