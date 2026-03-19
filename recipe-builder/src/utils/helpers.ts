import { FoodItem, Recipe } from "../data/types";

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
    const idx = updated.findIndex(
      (p) =>
        p.food.toLowerCase() === ing.food_item.toLowerCase() &&
        p.quantity.unit === ing.quantity.unit
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
    const inPantry = pantry.find(
      (p) =>
        p.food.toLowerCase() === ing.food_item.toLowerCase() &&
        p.quantity.unit === ing.quantity.unit
    );
    if (!inPantry || inPantry.quantity.value < ing.quantity.value) {
      const needed = inPantry
        ? ing.quantity.value - inPantry.quantity.value
        : ing.quantity.value;
      missing.push({
        food: ing.food_item,
        quantity: { value: needed, unit: ing.quantity.unit },
        sourceRecipe: recipe.title,
      });
    }
  }
  return missing;
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
  const inPantry = pantry.find(
    (p) =>
      p.food.toLowerCase() === foodItem.toLowerCase() &&
      p.quantity.unit === unit
  );
  return !!inPantry && inPantry.quantity.value >= needed;
}
