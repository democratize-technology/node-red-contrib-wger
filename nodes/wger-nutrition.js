const BaseNodeHandler = require('../utils/base-node-handler');
const OperationRegistry = require('../utils/operation-registry');
const nutritionOperations = require('./operations/nutrition-operations');

module.exports = function (RED) {
  // Create and configure the operation registry for nutrition operations
  const operationRegistry = new OperationRegistry();
  operationRegistry.registerAll(nutritionOperations);

  function WgerNutritionNode(config) {
    const node = this;

    // Operation handler using the registry pattern
    const handleOperation = BaseNodeHandler.createOperationHandler(operationRegistry);

    // Setup node using base handler
    BaseNodeHandler.setupNode(RED, node, config, handleOperation);
  }

  RED.nodes.registerType('wger-nutrition', WgerNutritionNode);
};
