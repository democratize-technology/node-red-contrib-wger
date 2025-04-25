// Export Wger Node-RED nodes
module.exports = function (RED) {
  // Load nodes
  require('./nodes/wger-config.js')(RED);
  require('./nodes/wger-api.js')(RED);
  require('./nodes/wger-exercise.js')(RED);
  require('./nodes/wger-workout.js')(RED);
  require('./nodes/wger-nutrition.js')(RED);
  require('./nodes/wger-weight.js')(RED);
  require('./nodes/wger-user.js')(RED);
};
