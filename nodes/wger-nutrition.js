const WgerApiClient = require('../utils/api-client');

module.exports = function (RED) {
  function WgerNutritionNode(config) {
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

        // Execute the Wger nutrition operation
        switch (operation) {
          case 'listNutritionPlans':
            result = await client.get('/api/v2/nutritionplan/');
            break;

          case 'getNutritionPlan':
            if (!payload.planId) {
              throw new Error('planId is required');
            }
            result = await client.get(`/api/v2/nutritionplaninfo/${payload.planId}/`);
            break;

          case 'createNutritionPlan':
            result = await client.post('/api/v2/nutritionplan/', {
              description: payload.description,
              only_logging: payload.only_logging || false,
            });
            break;

          case 'updateNutritionPlan':
            if (!payload.planId) {
              throw new Error('planId is required');
            }
            const updateData = { ...payload };
            delete updateData.planId;
            result = await client.patch(`/api/v2/nutritionplan/${payload.planId}/`, updateData);
            break;

          case 'deleteNutritionPlan':
            if (!payload.planId) {
              throw new Error('planId is required');
            }
            result = await client.delete(`/api/v2/nutritionplan/${payload.planId}/`);
            break;

          case 'getNutritionalValues':
            if (!payload.planId) {
              throw new Error('planId is required');
            }
            result = await client.get(`/api/v2/nutritionplan/${payload.planId}/nutritional_values/`);
            break;

          case 'listMeals':
            result = await client.get('/api/v2/meal/', {
              plan: payload.planId,
            });
            break;

          case 'createMeal':
            if (!payload.plan || !payload.time) {
              throw new Error('plan and time are required');
            }
            result = await client.post('/api/v2/meal/', {
              plan: payload.plan,
              time: payload.time,
              name: payload.name,
            });
            break;

          case 'updateMeal':
            if (!payload.mealId) {
              throw new Error('mealId is required');
            }
            const updateMealData = { ...payload };
            delete updateMealData.mealId;
            result = await client.patch(`/api/v2/meal/${payload.mealId}/`, updateMealData);
            break;

          case 'deleteMeal':
            if (!payload.mealId) {
              throw new Error('mealId is required');
            }
            result = await client.delete(`/api/v2/meal/${payload.mealId}/`);
            break;

          case 'listMealItems':
            result = await client.get('/api/v2/mealitem/', {
              meal: payload.mealId,
            });
            break;

          case 'createMealItem':
            if (!payload.meal || !payload.ingredient || !payload.amount) {
              throw new Error('meal, ingredient, and amount are required');
            }
            result = await client.post('/api/v2/mealitem/', {
              meal: payload.meal,
              ingredient: payload.ingredient,
              amount: payload.amount,
              weight_unit: payload.weight_unit,
            });
            break;

          case 'updateMealItem':
            if (!payload.itemId) {
              throw new Error('itemId is required');
            }
            const updateItemData = { ...payload };
            delete updateItemData.itemId;
            result = await client.patch(`/api/v2/mealitem/${payload.itemId}/`, updateItemData);
            break;

          case 'deleteMealItem':
            if (!payload.itemId) {
              throw new Error('itemId is required');
            }
            result = await client.delete(`/api/v2/mealitem/${payload.itemId}/`);
            break;

          case 'searchIngredients':
            if (!payload.term) {
              throw new Error('search term is required');
            }
            result = await client.get('/api/v2/ingredient/search/', {
              term: payload.term,
              language: payload.language || 'en',
            });
            break;

          case 'getIngredient':
            if (!payload.ingredientId) {
              throw new Error('ingredientId is required');
            }
            result = await client.get(`/api/v2/ingredientinfo/${payload.ingredientId}/`);
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

  RED.nodes.registerType('wger-nutrition', WgerNutritionNode);
};
