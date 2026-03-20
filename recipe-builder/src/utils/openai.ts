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

// How many days per batch — keeps each request small enough to avoid timeouts
const DAYS_PER_BATCH = 3;

function buildSystemPrompt(
  recipeSource: "new" | "existing" | "mix"
): string {
  let sourceInstruction: string;
  if (recipeSource === "existing") {
    sourceInstruction = `You MUST ONLY use existing saved recipes. Do NOT create any new recipes — the new_recipes array MUST be empty. If there are not enough existing recipes to fill every slot, reuse them across multiple slots.`;
  } else if (recipeSource === "new") {
    sourceInstruction = `Do NOT use any existing saved recipes. Create ALL new recipes for every meal slot. Every meal_plan entry must use {"source":"new","index":N}.`;
  } else {
    sourceInstruction = `You have access to existing saved recipes. USE THEM when they fit the user's preferences — this avoids generating duplicates. Only create new recipes when no existing recipe fits a slot.`;
  }

  return `You are an expert meal planning chef. Return ONLY valid JSON.

${sourceInstruction}

# MEAL TYPE RULES — TOP PRIORITY, NEVER VIOLATE

Breakfast ONLY allows: eggs (scrambled, fried, omelette), oatmeal, pancakes, waffles, smoothies, toast, yogurt parfait, breakfast burritos, french toast, cereal, muffins, granola, bagels, overnight oats, fruit bowls, hash browns, bacon and eggs.

Breakfast STRICTLY FORBIDS: curry, stir-fry, pasta, spaghetti, salmon, rice bowls, tacos, casseroles, grilled meat, roasted vegetables, soup, sandwiches, or ANY food that is typically eaten at lunch or dinner.

Lunch ONLY allows: sandwiches, salads, soups, wraps, grain bowls, quesadillas, light pastas, flatbreads.

Dinner ONLY allows: pasta, stir-fry, grilled proteins, casseroles, curries, tacos, roasted dishes, salmon, rice bowls, hearty meals.

Each new_recipe MUST have a "meal_type" field. Before assigning a recipe to a meal slot, verify it belongs to that meal type.

# JSON structure
{"new_recipes":[{"title":"Name","meal_type":"Breakfast","description":"One sentence","ingredients":[{"food_item":"X","quantity":{"value":1,"unit":"cups"},"preparation":"diced"}],"instructions":[{"step_number":1,"description":"Step.","duration_minutes":5}],"prep_time_minutes":10,"cook_time_minutes":20,"total_time_minutes":30,"servings":4,"cuisine":"Italian","dietary_tags":[],"difficulty":"Easy","nutrition_info":{"calories":400,"protein_grams":20,"fat_grams":15,"carbohydrates_grams":45}}],"meal_plan":{"Monday":{"Breakfast":{"source":"new","index":0},"Lunch":{"source":"existing","index":2}}}}

# Other rules
- meal_plan entries: {"source":"existing"|"new","index":N}
- Only include requested days and meal types
- New recipes: 5-8 ingredients, 3-5 steps
- VARIETY: every dinner must be a different dish. Vary cuisines and proteins. Breakfast may repeat 2-3x max
- Dietary restrictions and excluded ingredients — no exceptions
- Special instructions are top priority
- Valid units: pieces, slices, cups, tbsp, tsp, oz, lbs, grams, kg, ml, liters, cans, sticks, cloves, bunches, dozen, loaf, head
- Difficulties: Easy, Medium, Hard
- Include nutrition estimates per serving
- Use grocery-store units: slices (bread), oz (meat/cheese), cans (canned goods), cups (liquids/chopped), tbsp/tsp (herbs/spices), pieces (whole produce/eggs)
- Use CONSISTENT units for the same ingredient across all recipes`;
}

function buildUserMessage(
  days: string[],
  preferences: MealPlanPreferences,
  pantryItems: FoodItem[],
  existingList: { index: number; title: string; cuisine: string; time: number; difficulty: string; tags: string[]; calories?: number }[]
): string {
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

  if (preferences.budget && preferences.budget !== "Any") {
    const budgetGuide: Record<string, string> = {
      "Budget-friendly": "Use cheap, affordable ingredients (beans, lentils, rice, eggs, chicken thighs, canned goods, frozen vegetables, oats, pasta, potatoes). Avoid expensive items like steak, seafood, specialty cheeses, or exotic ingredients.",
      "Moderate": "Use a mix of affordable and moderately priced ingredients. Some seafood, lean meats, and fresh produce are fine.",
      "Premium": "Use high-quality, premium ingredients freely (steak, salmon, shrimp, fresh herbs, specialty items).",
    };
    parts.push(`Budget: ${preferences.budget}. ${budgetGuide[preferences.budget] || ""}`);
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

  parts.push("");
  parts.push("FINAL CHECK — For each meal slot, verify the recipe fits the meal type:");
  parts.push("- Breakfast: ONLY eggs, oatmeal, pancakes, waffles, smoothies, toast, yogurt, french toast, cereal, muffins, granola, bagels, overnight oats, fruit bowls, bacon and eggs.");
  parts.push("- Breakfast NEVER: curry, stir-fry, pasta, spaghetti, salmon, rice bowls, tacos, grilled meat, roasted vegetables, soup, sandwiches.");
  parts.push("- Lunch: sandwiches, salads, soups, wraps, grain bowls, quesadillas.");
  parts.push("- Dinner: pasta, stir-fry, grilled proteins, casseroles, curries, tacos, roasted dishes, salmon, rice bowls.");

  return parts.join("\n");
}

async function fetchBatch(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  batchId: string,
  existingRecipes: Recipe[] = []
): Promise<{ newRecipes: Recipe[]; mealPlan: MealPlan }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000); // 2 min per batch

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
        max_completion_tokens: 32768,
        reasoning_effort: "low",
      }),
      signal: controller.signal,
    });
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      throw new Error(`Batch ${batchId} timed out. Try fewer days or meal types.`);
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
  let content: any;
  try {
    let raw = data.choices?.[0]?.message?.content ?? "{}";
    raw = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    content = JSON.parse(raw);
  } catch {
    const raw = data.choices?.[0]?.message?.content ?? "(empty)";
    console.error(`Batch ${batchId} parse error. Raw:`, raw);
    throw new Error(`Failed to parse batch ${batchId} response from AI.`);
  }

  if (!content.meal_plan) {
    console.error(`Batch ${batchId} missing meal_plan:`, JSON.stringify(content));
    throw new Error(`AI returned unexpected format for batch ${batchId}.`);
  }

  const newRecipes: Recipe[] = (content.new_recipes || []).map(
    (r: any, i: number) => ({
      ...r,
      id: `gen-${Date.now()}-${batchId}-${i}`,
    })
  );

  const mealPlan: MealPlan = {};
  for (const [day, meals] of Object.entries(content.meal_plan)) {
    mealPlan[day] = {};
    for (const [mealType, ref] of Object.entries(
      meals as Record<string, { source: string; index: number }>
    )) {
      if (ref.source === "new" && newRecipes[ref.index]) {
        mealPlan[day][mealType] = newRecipes[ref.index].id;
      } else if (ref.source === "existing" && existingRecipes[ref.index]) {
        mealPlan[day][mealType] = existingRecipes[ref.index].id;
      }
    }
  }

  return { newRecipes, mealPlan };
}

export async function generateMealPlan(
  apiKey: string,
  preferences: MealPlanPreferences,
  pantryItems: FoodItem[],
  existingRecipes: Recipe[],
  onProgress?: (message: string) => void
): Promise<GenerationResult> {
  const allDays = DAYS_OF_WEEK.slice(0, preferences.days);
  const recipeSource = preferences.recipeSource || "mix";

  const existingList = existingRecipes.map((r, i) => ({
    index: i,
    title: r.title,
    cuisine: r.cuisine,
    time: r.total_time_minutes,
    difficulty: r.difficulty,
    tags: r.dietary_tags,
    calories: r.nutrition_info?.calories,
  }));

  const systemPrompt = buildSystemPrompt(recipeSource);

  // Split days into batches
  const batches: string[][] = [];
  for (let i = 0; i < allDays.length; i += DAYS_PER_BATCH) {
    batches.push(allDays.slice(i, i + DAYS_PER_BATCH));
  }

  // For small plans (1 batch), just do a single request
  if (batches.length === 1) {
    onProgress?.("Generating your meal plan...");
    const userMessage = buildUserMessage(allDays, preferences, pantryItems, existingList);
    const result = await fetchBatch(apiKey, systemPrompt, userMessage, "0", existingRecipes);

    // Check for missing slots and fill them
    const missingSlots: { day: string; mealType: string }[] = [];
    for (const day of allDays) {
      for (const mealType of preferences.mealTypes) {
        if (!result.mealPlan[day]?.[mealType]) {
          missingSlots.push({ day, mealType });
        }
      }
    }
    if (missingSlots.length > 0) {
      try {
        const fillMessage = `Generate ONLY recipes for these missing slots: ${missingSlots.map((s) => `${s.day} ${s.mealType}`).join(", ")}.\nReturn JSON: {"new_recipes":[...],"meal_plan":{"Day":{"MealType":{"source":"new","index":0}}}}`;
        const fillResult = await fetchBatch(apiKey, systemPrompt, fillMessage, "fill", existingRecipes);
        result.newRecipes.push(...fillResult.newRecipes);
        for (const [day, meals] of Object.entries(fillResult.mealPlan)) {
          if (!result.mealPlan[day]) result.mealPlan[day] = {};
          for (const [mt, id] of Object.entries(meals)) {
            if (!result.mealPlan[day][mt]) result.mealPlan[day][mt] = id;
          }
        }
      } catch { /* return what we have */ }
    }
    return { recipes: result.newRecipes, mealPlan: result.mealPlan };
  }

  // For larger plans, run batches in parallel
  onProgress?.(`Generating ${batches.length} batches in parallel...`);

  const batchPromises = batches.map((batchDays, idx) => {
    const userMessage = buildUserMessage(batchDays, preferences, pantryItems, existingList);
    return fetchBatch(apiKey, systemPrompt, userMessage, String(idx), existingRecipes);
  });

  const batchResults = await Promise.all(batchPromises);

  // Merge all batch results
  const allNewRecipes: Recipe[] = [];
  const mergedMealPlan: MealPlan = {};

  for (const result of batchResults) {
    allNewRecipes.push(...result.newRecipes);
    for (const [day, meals] of Object.entries(result.mealPlan)) {
      mergedMealPlan[day] = { ...mergedMealPlan[day], ...meals };
    }
  }

  onProgress?.("Finalizing meal plan...");

  // Check for missing slots
  const missingSlots: { day: string; mealType: string }[] = [];
  for (const day of allDays) {
    for (const mealType of preferences.mealTypes) {
      if (!mergedMealPlan[day]?.[mealType]) {
        missingSlots.push({ day, mealType });
      }
    }
  }

  if (missingSlots.length > 0) {
    // Try to fill missing slots with one small follow-up request
    try {
      const fillDays = Array.from(new Set(missingSlots.map((s) => s.day)));
      const fillMessage = buildUserMessage(fillDays, preferences, pantryItems, existingList)
        + `\n\nONLY fill these specific slots: ${missingSlots.map((s) => `${s.day} ${s.mealType}`).join(", ")}. Do not generate recipes for any other slots.`;
      const fillResult = await fetchBatch(apiKey, systemPrompt, fillMessage, "fill", existingRecipes);
      allNewRecipes.push(...fillResult.newRecipes);
      for (const [day, meals] of Object.entries(fillResult.mealPlan)) {
        if (!mergedMealPlan[day]) mergedMealPlan[day] = {};
        for (const [mealType, id] of Object.entries(meals)) {
          if (!mergedMealPlan[day][mealType]) {
            mergedMealPlan[day][mealType] = id;
          }
        }
      }
    } catch {
      // Return what we have if fill fails
    }
  }

  return { recipes: allNewRecipes, mealPlan: mergedMealPlan };
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
- Valid units: pieces, slices, cups, tbsp, tsp, oz, lbs, grams, kg, ml, liters, loaf, head, cans, bunches, dozen, sticks
- Valid difficulties: Easy, Medium, Hard
- Include realistic nutrition estimates per serving
- Be creative and detailed in the description and instructions
- Use realistic grocery-store quantities and units (e.g. "slices" for bread, "oz" for meat, "cans" for canned goods, "cups" for liquids)`;

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
        max_completion_tokens: 16384,
        reasoning_effort: "low",
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
  let recipe: any;
  try {
    let rawRecipe = data.choices?.[0]?.message?.content ?? "{}";
    rawRecipe = rawRecipe.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    recipe = JSON.parse(rawRecipe);
  } catch {
    throw new Error("Failed to parse recipe response from AI. Please try again.");
  }
  if (!recipe.title) {
    throw new Error("AI returned an unexpected response format. Please try again.");
  }
  return recipe;
}
