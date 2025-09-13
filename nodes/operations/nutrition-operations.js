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
  
  createMeal: OperationBuilders.createOperation(
    API.ENDPOINTS.MEALS,
    null,
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
  
  createMealItem: OperationBuilders.createOperation(
    API.ENDPOINTS.MEAL_ITEMS,
    null,
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
  searchIngredients: OperationBuilders.listOperation(
    API.ENDPOINTS.INGREDIENT_SEARCH,
    {
      term: 'term',
      language: payload => payload.language || 'en'
    },
    validationSchemas.nutrition.searchIngredient
  ),
  
  getIngredient: OperationBuilders.getByIdOperation(
    API.ENDPOINTS.INGREDIENT_INFO, 
    'ingredientId',
    validationSchemas.nutrition.getIngredient
  ),
  
  getIngredientByBarcode: OperationBuilders.listOperation(
    API.ENDPOINTS.INGREDIENT_SEARCH,
    {
      code: 'barcode'
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