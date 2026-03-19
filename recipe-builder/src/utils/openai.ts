import { FoodItem, Recipe, MealPlan, MealPlanPreferences } from "../data/types";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

interface GenerationResult {
  recipes: Recipe[];
  mealPlan: MealPlan;
}

export async function generateMealPlan(
  apiKey: string,
  preferences: MealPlanPreferences,
  pantryItems: FoodItem[],
  existingRecipes: Recipe[]
): Promise<GenerationResult> {
  const days = DAYS_OF_WEEK.slice(0, preferences.days);

  // Build a compact list of existing recipes for the prompt
  const existingList = existingRecipes.map((r, i) => ({
    index: i,
    title: r.title,
    cuisine: r.cuisine,
    time: r.total_time_minutes,
    difficulty: r.difficulty,
    tags: r.dietary_tags,
    calories: r.nutrition_info?.calories,
  }));

  const recipeSource = preferences.recipeSource || "mix";

  let sourceInstruction: string;
  if (recipeSource === "existing") {
    sourceInstruction = `You MUST ONLY use existing saved recipes. Do NOT create any new recipes — the new_recipes array MUST be empty. If there are not enough existing recipes to fill every slot, reuse them across multiple slots.`;
  } else if (recipeSource === "new") {
    sourceInstruction = `Do NOT use any existing saved recipes. Create ALL new recipes for every meal slot. Every meal_plan entry must use {"source":"new","index":N}.`;
  } else {
    sourceInstruction = `You have access to existing saved recipes. USE THEM when they fit the user's preferences — this avoids generating duplicates. Only create new recipes when no existing recipe fits a slot.`;
  }

  const systemPrompt = `You are an expert meal planning chef. Generate a personalized meal plan based on the user's preferences.

${sourceInstruction}

Return ONLY valid JSON matching this structure:
{"new_recipes":[{"title":"Name","description":"One sentence","ingredients":[{"food_item":"X","quantity":{"value":1,"unit":"cups"},"preparation":"diced"}],"instructions":[{"step_number":1,"description":"Step.","duration_minutes":5}],"prep_time_minutes":10,"cook_time_minutes":20,"total_time_minutes":30,"servings":4,"cuisine":"Italian","dietary_tags":[],"difficulty":"Easy","nutrition_info":{"calories":400,"protein_grams":20,"fat_grams":15,"carbohydrates_grams":45}}],"meal_plan":{"Monday":{"Breakfast":{"source":"existing","index":2},"Lunch":{"source":"new","index":0}}}}

Rules:
- meal_plan entries use {"source":"existing","index":N} to reference an existing recipe by its index, or {"source":"new","index":N} to reference a newly generated recipe by its index in new_recipes
- Only include the requested days and meal types
- For new recipes: keep ingredients to 5-8, instructions to 3-5 steps
- Reuse recipes (existing or new) across days when sensible
- Valid units: pieces, cups, tbsp, tsp, oz, lbs, grams, kg, ml, liters
- Valid difficulties: Easy, Medium, Hard
- Include realistic nutrition estimates per serving
- Every recipe MUST respect all dietary restrictions and excluded ingredients — no exceptions
- If the user provides special instructions, treat them as top-priority requirements`;

  // Build the user message from all preferences
  const parts: string[] = [];

  if (existingList.length > 0) {
    parts.push("EXISTING SAVED RECIPES (use these when they fit):");
    for (const r of existingList) {
      parts.push(
        `  [${r.index}] "${r.title}" — ${r.cuisine}, ${r.time} min, ${r.difficulty}${r.tags.length ? `, ${r.tags.join("/")}` : ""}${r.calories ? `, ${r.calories} cal` : ""}`
      );
    }
    parts.push("");
  }

  parts.push(
    `Generate a meal plan for ${days.length} day${days.length > 1 ? "s" : ""} (${days.join(", ")}).`
  );
  parts.push(`Meal types needed each day: ${preferences.mealTypes.join(", ")}.`);
  parts.push(`Servings per recipe: ${preferences.servings}.`);

  if (preferences.difficulty && preferences.difficulty !== "Any") {
    parts.push(`Difficulty level: ${preferences.difficulty} only.`);
  }

  if (preferences.maxCookTimeMinutes) {
    parts.push(
      `Maximum total cook time per recipe: ${preferences.maxCookTimeMinutes} minutes.`
    );
  }

  if (preferences.calorieTarget) {
    parts.push(
      `Target approximately ${preferences.calorieTarget} calories per serving.`
    );
  }

  if (preferences.dietaryPreferences.length > 0) {
    parts.push(
      `STRICT dietary requirements (must follow): ${preferences.dietaryPreferences.join(", ")}.`
    );
  }

  if (preferences.cuisinePreference) {
    parts.push(`Cuisine preference: ${preferences.cuisinePreference}.`);
  }

  if (preferences.includeIngredients.trim()) {
    parts.push(
      `Must include these ingredients in at least some recipes: ${preferences.includeIngredients.trim()}.`
    );
  }

  if (preferences.excludeIngredients.trim()) {
    parts.push(
      `NEVER use these ingredients: ${preferences.excludeIngredients.trim()}.`
    );
  }

  if (preferences.usePantryIngredients && pantryItems.length > 0) {
    const pantryList = pantryItems
      .map((p) => `${p.food} (${p.quantity.value} ${p.quantity.unit})`)
      .join(", ");
    parts.push(`Prioritize using these pantry ingredients: ${pantryList}.`);
  }

  if (preferences.specialInstructions.trim()) {
    parts.push(
      `IMPORTANT — Special instructions from the user: "${preferences.specialInstructions.trim()}"`
    );
  }

  parts.push("Make the meals varied and interesting.");

  const userMessage = parts.join("\n");

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      throw new Error(
        "Request timed out after 3 minutes. Try fewer days or meal types."
      );
    }
    throw err;
  }
  clearTimeout(timeout);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error?.message || `OpenAI API error: ${response.status}`
    );
  }

  const data = await response.json();
  const content = JSON.parse(data.choices[0].message.content);

  // Build new recipes with generated IDs
  const newRecipes: Recipe[] = (content.new_recipes || []).map(
    (r: any, i: number) => ({
      ...r,
      id: `gen-${Date.now()}-${i}`,
    })
  );

  // Build the meal plan, resolving existing vs new recipe references
  const mealPlan: MealPlan = {};
  for (const [day, meals] of Object.entries(content.meal_plan)) {
    mealPlan[day] = {};
    for (const [mealType, ref] of Object.entries(
      meals as Record<string, { source: string; index: number }>
    )) {
      if (ref.source === "existing" && existingRecipes[ref.index]) {
        mealPlan[day][mealType] = existingRecipes[ref.index].id;
      } else if (ref.source === "new" && newRecipes[ref.index]) {
        mealPlan[day][mealType] = newRecipes[ref.index].id;
      }
    }
  }

  return { recipes: newRecipes, mealPlan };
}

export async function generateSingleRecipe(
  apiKey: string,
  prompt: string
): Promise<Omit<Recipe, "id">> {
  const systemPrompt = `You are an expert chef. The user will describe a recipe they want. Generate a complete recipe based on their description.

Return ONLY valid JSON matching this structure:
{"title":"Name","description":"One sentence","ingredients":[{"food_item":"X","quantity":{"value":1,"unit":"cups"},"preparation":"diced"}],"instructions":[{"step_number":1,"description":"Step.","duration_minutes":5}],"prep_time_minutes":10,"cook_time_minutes":20,"total_time_minutes":30,"servings":4,"cuisine":"Italian","dietary_tags":[],"difficulty":"Easy","nutrition_info":{"calories":400,"protein_grams":20,"fat_grams":15,"carbohydrates_grams":45}}

Rules:
- Keep ingredients to 5-12 items
- Keep instructions to 3-8 steps
- Valid units: pieces, cups, tbsp, tsp, oz, lbs, grams, kg, ml, liters
- Valid difficulties: Easy, Medium, Hard
- Include realistic nutrition estimates per serving
- Be creative and detailed in the description and instructions`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);

  let response: Response;
  try {
    response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-5-nano",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        response_format: { type: "json_object" },
      }),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      throw new Error("Request timed out. Try a simpler recipe description.");
    }
    throw err;
  }
  clearTimeout(timeout);

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(
      error.error?.message || `OpenAI API error: ${response.status}`
    );
  }

  const data = await response.json();
  const recipe = JSON.parse(data.choices[0].message.content);
  return recipe;
}
