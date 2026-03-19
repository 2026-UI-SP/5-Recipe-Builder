import { FoodItem, Recipe } from "../data/types";

/**
 * Canonical unit aliases — maps variant names to a single canonical form.
 * This prevents mismatches between e.g. "count" in pantry and "pieces" in recipes.
 */
const UNIT_ALIASES: Record<string, string> = {
  count: "pieces",
  piece: "pieces",
  pcs: "pieces",
  each: "pieces",
  slice: "slices",
  clove: "cloves",
  cup: "cups",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  ounce: "oz",
  ounces: "oz",
  pound: "lbs",
  pounds: "lbs",
  lb: "lbs",
  gram: "grams",
  g: "grams",
  kilogram: "kg",
  kilograms: "kg",
  milliliter: "ml",
  milliliters: "ml",
  liter: "liters",
  l: "liters",
  gallon: "gallons",
  loaves: "loaf",
  heads: "head",
  bunch: "bunches",
  can: "cans",
  jar: "jars",
  bottle: "bottles",
  bag: "bags",
  box: "boxes",
  package: "packages",
  pkg: "packages",
  dozen: "dozen",
  stick: "sticks",
  strip: "strips",
  fillet: "fillets",
  breast: "breasts",
  thigh: "thighs",
};

/** Normalize a unit string to its canonical form. */
export function normalizeUnit(unit: string): string {
  const lower = unit.toLowerCase().trim();
  return UNIT_ALIASES[lower] ?? lower;
}

/**
 * Deducts a recipe's ingredients from the pantry.
 * If the pantry item doesn't have enough, it's removed entirely.
 * Returns a new pantry array (does not mutate the original).
 */
export function deductIngredients(
  pantry: FoodItem[],
  recipe: Recipe
): FoodItem[] {
  let updated = [...pantry];
  for (const ing of recipe.ingredients) {
    const normUnit = normalizeUnit(ing.quantity.unit);
    const idx = updated.findIndex(
      (p) =>
        p.food.toLowerCase() === ing.food_item.toLowerCase() &&
        normalizeUnit(p.quantity.unit) === normUnit
    );
    if (idx >= 0) {
      const newValue = updated[idx].quantity.value - ing.quantity.value;
      if (newValue <= 0) {
        updated = updated.filter((_, i) => i !== idx);
      } else {
        updated[idx] = {
          ...updated[idx],
          quantity: { ...updated[idx].quantity, value: newValue },
        };
      }
    }
  }
  return updated;
}

/**
 * Compares a recipe's ingredients against the pantry and returns
 * shopping-list items for anything missing or insufficient.
 * Each returned item is tagged with the recipe title as its source.
 */
export function findMissingIngredients(
  pantry: FoodItem[],
  recipe: Recipe
): FoodItem[] {
  const missing: FoodItem[] = [];
  for (const ing of recipe.ingredients) {
    const normUnit = normalizeUnit(ing.quantity.unit);
    const inPantry = pantry.find(
      (p) =>
        p.food.toLowerCase() === ing.food_item.toLowerCase() &&
        normalizeUnit(p.quantity.unit) === normUnit
    );
    if (!inPantry || inPantry.quantity.value < ing.quantity.value) {
      const needed = inPantry
        ? ing.quantity.value - inPantry.quantity.value
        : ing.quantity.value;
      missing.push({
        food: ing.food_item,
        quantity: { value: needed, unit: normUnit },
        sourceRecipe: recipe.title,
      });
    }
  }
  return missing;
}

/**
 * Aggregates all ingredients needed across every recipe in a meal plan,
 * sums quantities for matching items, subtracts what's already in the pantry,
 * and returns the shopping list of items still needed.
 */
export function buildShoppingListFromMealPlan(
  mealPlan: Record<string, Record<string, string>>,
  getRecipeById: (id: string) => Recipe | undefined,
  pantry: FoodItem[]
): FoodItem[] {
  // Step 1: Aggregate all ingredients across every recipe, summing quantities
  const totals = new Map<string, { food: string; value: number; unit: string; sources: string[] }>();

  for (const dayMeals of Object.values(mealPlan)) {
    for (const recipeId of Object.values(dayMeals)) {
      const recipe = getRecipeById(recipeId);
      if (!recipe) continue;
      for (const ing of recipe.ingredients) {
        const normUnit = normalizeUnit(ing.quantity.unit);
        const key = `${ing.food_item.toLowerCase()}-${normUnit}`;
        const existing = totals.get(key);
        if (existing) {
          existing.value += ing.quantity.value;
          if (!existing.sources.includes(recipe.title)) {
            existing.sources.push(recipe.title);
          }
        } else {
          totals.set(key, {
            food: ing.food_item,
            value: ing.quantity.value,
            unit: normUnit,
            sources: [recipe.title],
          });
        }
      }
    }
  }

  // Step 2: Subtract pantry quantities
  const missing: FoodItem[] = [];
  for (const item of Array.from(totals.values())) {
    const inPantry = pantry.find(
      (p) =>
        p.food.toLowerCase() === item.food.toLowerCase() &&
        normalizeUnit(p.quantity.unit) === item.unit
    );
    const pantryQty = inPantry ? inPantry.quantity.value : 0;
    const needed = item.value - pantryQty;
    if (needed > 0) {
      missing.push({
        food: item.food,
        quantity: { value: roundQuantity(needed), unit: item.unit },
        sourceRecipe: item.sources.join(", "),
      });
    }
  }

  return missing;
}

/** Round a quantity to a reasonable precision (avoid 2.0000000001 etc.) */
function roundQuantity(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Checks whether the pantry has enough of a specific ingredient.
 */
export function hasEnoughInPantry(
  pantry: FoodItem[],
  foodItem: string,
  unit: string,
  needed: number
): boolean {
  const normUnit = normalizeUnit(unit);
  const inPantry = pantry.find(
    (p) =>
      p.food.toLowerCase() === foodItem.toLowerCase() &&
      normalizeUnit(p.quantity.unit) === normUnit
  );
  return !!inPantry && inPantry.quantity.value >= needed;
}
