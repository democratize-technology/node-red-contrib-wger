const BaseNodeHandler = require('../../utils/base-node-handler');
const OperationBuilders = require('../../utils/operation-builders');
const { API } = require('../../utils/constants');
const validationSchemas = require('../../utils/validation-schemas');

/**
 * Nutrition-specific operations
 */
const nutritionOperations = {
  // Nutrition plan operations
  listNutritionPlans: OperationBuilders.listOperation(
    API.ENDPOINTS.NUTRITION_PLANS,
    {},
    validationSchemas.nutrition.listNutritionPlans
  ),
  
  getNutritionPlan: OperationBuilders.getByIdOperation(
    API.ENDPOINTS.NUTRITION_PLAN_INFO, 
    'planId',
    validationSchemas.nutrition.getNutritionPlan
  ),
  
  createNutritionPlan: OperationBuilders.createOperation(
    API.ENDPOINTS.NUTRITION_PLANS,
    (payload) => ({
      description: payload.description,
      only_logging: payload.only_logging || false,
      goal_energy: payload.goal_energy,
      goal_protein: payload.goal_protein,
      goal_carbohydrates: payload.goal_carbohydrates,
      goal_fat: payload.goal_fat,
      goal_fiber: payload.goal_fiber
    }),
    validationSchemas.nutrition.createNutritionPlan
  ),
  
  updateNutritionPlan: OperationBuilders.updateOperation(
    API.ENDPOINTS.NUTRITION_PLAN_BY_ID, 
    'planId',
    'patch',
    validationSchemas.nutrition.updateNutritionPlan
  ),
  
  deleteNutritionPlan: OperationBuilders.deleteOperation(
    API.ENDPOINTS.NUTRITION_PLAN_BY_ID, 
    'planId',
    validationSchemas.nutrition.deleteNutritionPlan
  ),
  
  getNutritionalValues: OperationBuilders.getByIdOperation(
    API.ENDPOINTS.NUTRITION_PLAN_VALUES, 
    'planId',
    validationSchemas.nutrition.getNutritionalValues
  ),
  
  // Meal operations
  listMeals: OperationBuilders.listOperation(API.ENDPOINTS.MEALS, {
    plan: 'planId'
  }),
  
  createMeal: OperationBuilders.customOperation(
    ['plan', 'time'],
    async (client, payload) => {
      return await client.post(API.ENDPOINTS.MEALS, {
        plan: payload.plan,
        time: payload.time,
        name: payload.name
      });
    }
  ),
  
  updateMeal: OperationBuilders.updateOperation(
    API.ENDPOINTS.MEAL_BY_ID, 
    'mealId'
  ),
  
  deleteMeal: OperationBuilders.deleteOperation(
    API.ENDPOINTS.MEAL_BY_ID, 
    'mealId'
  ),
  
  // Meal item operations
  listMealItems: OperationBuilders.listOperation(API.ENDPOINTS.MEAL_ITEMS, {
    meal: 'mealId'
  }),
  
  createMealItem: OperationBuilders.customOperation(
    ['meal', 'ingredient', 'amount'],
    async (client, payload) => {
      return await client.post(API.ENDPOINTS.MEAL_ITEMS, {
        meal: payload.meal,
        ingredient: payload.ingredient,
        amount: payload.amount,
        weight_unit: payload.weight_unit
      });
    }
  ),
  
  updateMealItem: OperationBuilders.updateOperation(
    API.ENDPOINTS.MEAL_ITEM_BY_ID, 
    'itemId'
  ),
  
  deleteMealItem: OperationBuilders.deleteOperation(
    API.ENDPOINTS.MEAL_ITEM_BY_ID, 
    'itemId'
  ),
  
  // Ingredient operations
  searchIngredients: OperationBuilders.customOperation(
    ['term'],
    async (client, payload) => {
      return await client.get(API.ENDPOINTS.INGREDIENT_SEARCH, {
        term: payload.term,
        language: payload.language || 'en'
      });
    }
  ),
  
  getIngredient: OperationBuilders.getByIdOperation(
    API.ENDPOINTS.INGREDIENT_INFO, 
    'ingredientId'
  )
};

module.exports = nutritionOperations;