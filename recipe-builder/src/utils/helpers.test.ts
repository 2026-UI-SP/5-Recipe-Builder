import { deductIngredients, findMissingIngredients } from "./helpers";
import { FoodItem, Recipe } from "../data/types";

/** Minimal recipe factory for tests. */
function makeRecipe(ingredients: { food_item: string; value: number; unit: string }[]): Recipe {
  return {
    id: "test",
    title: "Test Recipe",
    description: "",
    ingredients: ingredients.map((i) => ({
      food_item: i.food_item,
      quantity: { value: i.value, unit: i.unit },
    })),
    instructions: [],
    prep_time_minutes: 0,
    cook_time_minutes: 0,
    total_time_minutes: 0,
    servings: 1,
    cuisine: "Test",
    dietary_tags: [],
    difficulty: "Easy",
  };
}

// ---- deductIngredients ----

test("deductIngredients subtracts only the amount needed, not the whole item", () => {
  const pantry: FoodItem[] = [
    { food: "Onion", quantity: { value: 2, unit: "pieces" } },
  ];
  const recipe = makeRecipe([{ food_item: "Onion", value: 1, unit: "pieces" }]);

  const result = deductIngredients(pantry, recipe);

  expect(result).toHaveLength(1);
  expect(result[0].food).toBe("Onion");
  expect(result[0].quantity.value).toBe(1); // 2 - 1 = 1 remaining
});

test("deductIngredients removes item entirely when pantry has exact amount", () => {
  const pantry: FoodItem[] = [
    { food: "Eggs", quantity: { value: 4, unit: "pieces" } },
  ];
  const recipe = makeRecipe([{ food_item: "Eggs", value: 4, unit: "pieces" }]);

  const result = deductIngredients(pantry, recipe);

  expect(result).toHaveLength(0);
});

test("deductIngredients removes item when pantry has less than recipe needs", () => {
  const pantry: FoodItem[] = [
    { food: "Butter", quantity: { value: 50, unit: "grams" } },
  ];
  const recipe = makeRecipe([{ food_item: "Butter", value: 100, unit: "grams" }]);

  const result = deductIngredients(pantry, recipe);

  expect(result).toHaveLength(0); // can't go negative
});

test("deductIngredients leaves unrelated pantry items untouched", () => {
  const pantry: FoodItem[] = [
    { food: "Onion", quantity: { value: 3, unit: "pieces" } },
    { food: "Rice", quantity: { value: 2, unit: "cups" } },
  ];
  const recipe = makeRecipe([{ food_item: "Onion", value: 1, unit: "pieces" }]);

  const result = deductIngredients(pantry, recipe);

  expect(result).toHaveLength(2);
  expect(result.find((i) => i.food === "Onion")!.quantity.value).toBe(2);
  expect(result.find((i) => i.food === "Rice")!.quantity.value).toBe(2);
});

test("deductIngredients is case-insensitive", () => {
  const pantry: FoodItem[] = [
    { food: "onion", quantity: { value: 5, unit: "pieces" } },
  ];
  const recipe = makeRecipe([{ food_item: "Onion", value: 2, unit: "pieces" }]);

  const result = deductIngredients(pantry, recipe);

  expect(result[0].quantity.value).toBe(3);
});

test("deductIngredients only matches same unit", () => {
  const pantry: FoodItem[] = [
    { food: "Garlic", quantity: { value: 5, unit: "pieces" } },
  ];
  const recipe = makeRecipe([{ food_item: "Garlic", value: 2, unit: "tbsp" }]);

  const result = deductIngredients(pantry, recipe);

  // Different unit — nothing should be deducted
  expect(result).toHaveLength(1);
  expect(result[0].quantity.value).toBe(5);
});

// ---- findMissingIngredients ----

test("findMissingIngredients returns nothing when pantry has enough", () => {
  const pantry: FoodItem[] = [
    { food: "Onion", quantity: { value: 3, unit: "pieces" } },
    { food: "Garlic", quantity: { value: 5, unit: "pieces" } },
  ];
  const recipe = makeRecipe([
    { food_item: "Onion", value: 1, unit: "pieces" },
    { food_item: "Garlic", value: 3, unit: "pieces" },
  ]);

  const result = findMissingIngredients(pantry, recipe);

  expect(result).toHaveLength(0);
});

test("findMissingIngredients returns only the deficit, not the full amount", () => {
  const pantry: FoodItem[] = [
    { food: "Eggs", quantity: { value: 2, unit: "pieces" } },
  ];
  const recipe = makeRecipe([{ food_item: "Eggs", value: 4, unit: "pieces" }]);

  const result = findMissingIngredients(pantry, recipe);

  expect(result).toHaveLength(1);
  expect(result[0].food).toBe("Eggs");
  expect(result[0].quantity.value).toBe(2); // need 4, have 2, deficit = 2
});

test("findMissingIngredients returns full amount when pantry has none", () => {
  const pantry: FoodItem[] = [];
  const recipe = makeRecipe([{ food_item: "Flour", value: 500, unit: "grams" }]);

  const result = findMissingIngredients(pantry, recipe);

  expect(result).toHaveLength(1);
  expect(result[0].quantity.value).toBe(500);
});

test("findMissingIngredients tags items with source recipe title", () => {
  const pantry: FoodItem[] = [];
  const recipe = makeRecipe([{ food_item: "Salt", value: 1, unit: "tsp" }]);

  const result = findMissingIngredients(pantry, recipe);

  expect(result[0].sourceRecipe).toBe("Test Recipe");
});

test("findMissingIngredients skips items pantry has exact amount of", () => {
  const pantry: FoodItem[] = [
    { food: "Sugar", quantity: { value: 2, unit: "cups" } },
  ];
  const recipe = makeRecipe([{ food_item: "Sugar", value: 2, unit: "cups" }]);

  const result = findMissingIngredients(pantry, recipe);

  expect(result).toHaveLength(0);
});

test("findMissingIngredients is case-insensitive", () => {
  const pantry: FoodItem[] = [
    { food: "CHICKEN BREAST", quantity: { value: 500, unit: "grams" } },
  ];
  const recipe = makeRecipe([{ food_item: "chicken breast", value: 500, unit: "grams" }]);

  const result = findMissingIngredients(pantry, recipe);

  expect(result).toHaveLength(0);
});
