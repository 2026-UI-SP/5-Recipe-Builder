import { FoodItem, Recipe, RecipeIngredient } from "../data/types";

/**
 * Ingredient name synonyms — maps variant names to a single canonical form.
 */
const INGREDIENT_ALIASES: Record<string, string> = {
  "green onion": "scallion",
  "green onions": "scallion",
  "spring onion": "scallion",
  "spring onions": "scallion",
  "scallions": "scallion",
  "red pepper": "red bell pepper",
  "green pepper": "green bell pepper",
  "yellow pepper": "yellow bell pepper",
  "orange pepper": "orange bell pepper",
  "capsicum": "bell pepper",
  "coriander": "cilantro",
  "coriander leaves": "cilantro",
  "fresh coriander": "cilantro",
  "fresh cilantro": "cilantro",
  "rapeseed oil": "canola oil",
  "vegetable stock": "vegetable broth",
  "chicken stock": "chicken broth",
  "beef stock": "beef broth",
  "cornstarch": "corn starch",
  "bicarbonate of soda": "baking soda",
  "aubergine": "eggplant",
  "courgette": "zucchini",
  "rocket": "arugula",
  "prawns": "shrimp",
  "mince": "ground beef",
  "ground meat": "ground beef",
  "minced beef": "ground beef",
  "minced meat": "ground beef",
  "heavy cream": "heavy whipping cream",
  "whipping cream": "heavy whipping cream",
  "double cream": "heavy whipping cream",
  "single cream": "light cream",
  "half-and-half": "half and half",
  "powdered sugar": "confectioners sugar",
  "icing sugar": "confectioners sugar",
  "plain flour": "all-purpose flour",
  "ap flour": "all-purpose flour",
  "wholemeal flour": "whole wheat flour",
  "soy sauce": "soy sauce",
  "shoyu": "soy sauce",
  "tamari": "soy sauce",
  "extra virgin olive oil": "olive oil",
  "evoo": "olive oil",
};

/**
 * Common plural endings to strip for ingredient matching.
 * Order matters — check longer suffixes first.
 */
const PLURAL_RULES: [RegExp, string][] = [
  [/ies$/i, "y"],       // berries → berry, cherries → cherry
  [/ves$/i, "f"],       // loaves → loaf, halves → half
  [/ses$/i, "se"],      // cheeses → cheese (but not "buses")
  [/oes$/i, "o"],       // tomatoes → tomato, potatoes → potato
  [/s$/i, ""],          // peppers → pepper, onions → onion
];

/** Normalize an ingredient name to a canonical singular, lowercase form. */
export function normalizeIngredientName(name: string): string {
  let normalized = name.toLowerCase().trim();

  // Check aliases first (before depluralization)
  if (INGREDIENT_ALIASES[normalized]) {
    return INGREDIENT_ALIASES[normalized];
  }

  // Strip trailing "s" / plurals
  for (const [pattern, replacement] of PLURAL_RULES) {
    const singular = normalized.replace(pattern, replacement);
    // Check alias again with singular form
    if (INGREDIENT_ALIASES[singular]) {
      return INGREDIENT_ALIASES[singular];
    }
    if (singular !== normalized) {
      normalized = singular;
      break;
    }
  }

  return normalized;
}

/** Normalize all ingredients in a recipe (mutates in place for post-processing). */
export function normalizeRecipeIngredients(ingredients: RecipeIngredient[]): RecipeIngredient[] {
  return ingredients.map((ing) => ({
    ...ing,
    food_item: normalizeIngredientName(ing.food_item),
    quantity: {
      ...ing.quantity,
      unit: normalizeUnit(ing.quantity.unit),
    },
  }));
}

/**
 * Canonical unit aliases — maps variant names to a single canonical form.
 * This prevents mismatches between e.g. "count" in pantry and "pieces" in recipes.
 */
const UNIT_ALIASES: Record<string, string> = {
  // Count
  count: "whole",
  piece: "whole",
  pieces: "whole",
  pcs: "whole",
  each: "whole",
  // Slices
  slice: "slices",
  // Volume
  cup: "cups",
  tablespoon: "tbsp",
  tablespoons: "tbsp",
  teaspoon: "tsp",
  teaspoons: "tsp",
  // Weight — imperial
  ounce: "oz",
  ounces: "oz",
  pound: "lbs",
  pounds: "lbs",
  lb: "lbs",
  // Weight — metric → convert to imperial canonical
  gram: "oz",
  grams: "oz",
  g: "oz",
  kilogram: "lbs",
  kilograms: "lbs",
  kg: "lbs",
  // Volume — metric → convert to imperial canonical
  milliliter: "cups",
  milliliters: "cups",
  ml: "cups",
  liter: "cups",
  liters: "cups",
  l: "cups",
  gallon: "gallons",
  // Whole items
  loaves: "loaf",
  heads: "head",
  bunch: "bunches",
  // Containers
  can: "cans",
  jar: "cans",
  jars: "cans",
  bottle: "whole",
  bottles: "whole",
  bag: "whole",
  bags: "whole",
  box: "whole",
  boxes: "whole",
  package: "whole",
  packages: "whole",
  pkg: "whole",
  // Other
  dozen: "dozen",
  stick: "sticks",
  clove: "cloves",
  // Meat cuts → oz by weight
  strip: "oz",
  strips: "oz",
  fillet: "whole",
  fillets: "whole",
  breast: "whole",
  breasts: "whole",
  thigh: "whole",
  thighs: "whole",
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
        normalizeIngredientName(p.food) === normalizeIngredientName(ing.food_item) &&
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
        normalizeIngredientName(p.food) === normalizeIngredientName(ing.food_item) &&
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
        const normName = normalizeIngredientName(ing.food_item);
        const key = `${normName}-${normUnit}`;
        const existing = totals.get(key);
        if (existing) {
          existing.value += ing.quantity.value;
          if (!existing.sources.includes(recipe.title)) {
            existing.sources.push(recipe.title);
          }
        } else {
          totals.set(key, {
            food: normName,
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
        normalizeIngredientName(p.food) === item.food &&
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
      normalizeIngredientName(p.food) === normalizeIngredientName(foodItem) &&
      normalizeUnit(p.quantity.unit) === normUnit
  );
  return !!inPantry && inPantry.quantity.value >= needed;
}
