export interface FoodItem {
  food: string;
  quantity: {
    value: number;
    unit: string;
  };
  sourceRecipe?: string; // title of recipe that added this to shopping list
  bought?: boolean;
}

export interface RecipeIngredient {
  food_item: string;
  quantity: {
    value: number;
    unit: string;
  };
  preparation?: string;
  notes?: string;
}

export interface RecipeStep {
  step_number: number;
  description: string;
  duration_minutes?: number;
  equipment_needed?: string[];
}

export interface Recipe {
  id: string;
  title: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: RecipeStep[];
  prep_time_minutes: number;
  cook_time_minutes: number;
  total_time_minutes: number;
  servings: number;
  cuisine: string;
  dietary_tags: string[];
  difficulty: string;
  image_url?: string;
  favorite?: boolean;
  nutrition_info?: {
    calories: number;
    protein_grams: number;
    fat_grams: number;
    carbohydrates_grams: number;
  };
}

export interface MealPlanPreferences {
  days: number;
  mealTypes: string[];
  dietaryPreferences: string[];
  cuisinePreference: string;
  usePantryIngredients: boolean;
  servings: number;
  difficulty: string;
  maxCookTimeMinutes: number | null;
  calorieTarget: number | null;
  includeIngredients: string;
  excludeIngredients: string;
  specialInstructions: string;
  recipeSource: "new" | "existing" | "mix";
}

export interface DayPlan {
  [mealType: string]: string; // mealType -> recipeId
}

export interface MealPlan {
  [day: string]: DayPlan;
}
