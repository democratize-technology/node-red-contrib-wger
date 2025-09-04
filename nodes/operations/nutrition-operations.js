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
  listMeals: OperationBuilders.listOperation(
    API.ENDPOINTS.MEALS, 
    {
      plan: 'plan',
      limit: 'limit',
      offset: 'offset'
    },
    validationSchemas.nutrition.listMeals
  ),
  
  createMeal: OperationBuilders.customOperation(
    null,  // Use full validation schema instead
    async (client, payload) => {
      return await client.post(API.ENDPOINTS.MEALS, {
        plan: payload.plan,
        order: payload.order,
        time: payload.time,
        name: payload.name
      });
    },
    validationSchemas.nutrition.createMeal
  ),
  
  updateMeal: OperationBuilders.updateOperation(
    API.ENDPOINTS.MEAL_BY_ID, 
    'mealId',
    'patch',
    validationSchemas.nutrition.updateMeal
  ),
  
  deleteMeal: OperationBuilders.deleteOperation(
    API.ENDPOINTS.MEAL_BY_ID, 
    'mealId',
    validationSchemas.nutrition.deleteMeal
  ),
  
  // Meal item operations
  listMealItems: OperationBuilders.listOperation(
    API.ENDPOINTS.MEAL_ITEMS, 
    {
      meal: 'meal',
      limit: 'limit',
      offset: 'offset'
    },
    validationSchemas.nutrition.listMealItems
  ),
  
  createMealItem: OperationBuilders.customOperation(
    null,  // Use full validation schema instead
    async (client, payload) => {
      return await client.post(API.ENDPOINTS.MEAL_ITEMS, {
        meal: payload.meal,
        ingredient: payload.ingredient,
        weight_unit: payload.weight_unit,
        amount: payload.amount,
        order: payload.order
      });
    },
    validationSchemas.nutrition.createMealItem
  ),
  
  updateMealItem: OperationBuilders.updateOperation(
    API.ENDPOINTS.MEAL_ITEM_BY_ID, 
    'itemId',
    'patch',
    validationSchemas.nutrition.updateMealItem
  ),
  
  deleteMealItem: OperationBuilders.deleteOperation(
    API.ENDPOINTS.MEAL_ITEM_BY_ID, 
    'itemId',
    validationSchemas.nutrition.deleteMealItem
  ),
  
  // Ingredient operations
  searchIngredients: OperationBuilders.customOperation(
    null,  // Use full validation schema instead
    async (client, payload) => {
      return await client.get(API.ENDPOINTS.INGREDIENT_SEARCH, {
        term: payload.term,
        language: payload.language || 'en'
      });
    },
    validationSchemas.nutrition.searchIngredient
  ),
  
  getIngredient: OperationBuilders.getByIdOperation(
    API.ENDPOINTS.INGREDIENT_INFO, 
    'ingredientId',
    validationSchemas.nutrition.getIngredient
  ),
  
  getIngredientByBarcode: OperationBuilders.customOperation(
    null,
    async (client, payload) => {
      return await client.get(API.ENDPOINTS.INGREDIENT_SEARCH, {
        code: payload.barcode
      });
    },
    validationSchemas.nutrition.getIngredientByBarcode
  ),
  
  // Nutrition diary operations
  listNutritionDiary: OperationBuilders.listOperation(
    API.ENDPOINTS.NUTRITION_DIARY,
    {
      plan: 'plan',
      limit: 'limit',
      offset: 'offset'
    },
    validationSchemas.nutrition.listNutritionDiary
  ),
  
  createNutritionDiary: OperationBuilders.createOperation(
    API.ENDPOINTS.NUTRITION_DIARY,
    null,
    validationSchemas.nutrition.createNutritionDiary
  ),
  
  updateNutritionDiary: OperationBuilders.updateOperation(
    API.ENDPOINTS.NUTRITION_DIARY_BY_ID,
    'diaryId',
    'patch',
    validationSchemas.nutrition.updateNutritionDiary
  ),
  
  deleteNutritionDiary: OperationBuilders.deleteOperation(
    API.ENDPOINTS.NUTRITION_DIARY_BY_ID,
    'diaryId',
    validationSchemas.nutrition.deleteNutritionDiary
  ),
  
  // Weight units and categories
  getWeightUnits: OperationBuilders.listOperation(
    API.ENDPOINTS.WEIGHT_UNITS,
    {
      limit: 'limit',
      offset: 'offset'
    },
    validationSchemas.nutrition.getWeightUnits
  ),
  
  getIngredientCategories: OperationBuilders.listOperation(
    API.ENDPOINTS.INGREDIENT_CATEGORIES,
    {
      limit: 'limit',
      offset: 'offset'
    },
    validationSchemas.nutrition.getIngredientCategories
  )
};

module.exports = nutritionOperations;