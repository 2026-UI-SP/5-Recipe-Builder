import { FoodItem, Recipe, MealPlan, MealPlanPreferences } from "../data/types";
import { normalizeRecipeIngredients } from "./helpers";

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

function buildSystemPrompt(
  recipeSource: "new" | "existing" | "mix",
  mealType: string
): string {
  let sourceInstruction: string;
  if (recipeSource === "existing") {
    sourceInstruction = `You MUST ONLY use existing saved recipes. Do NOT create any new recipes — the new_recipes array MUST be empty. If there are not enough existing recipes to fill every slot, reuse them across multiple slots.`;
  } else if (recipeSource === "new") {
    sourceInstruction = `Do NOT use any existing saved recipes. Create ALL new recipes for every meal slot. Every meal_plan entry must use {"source":"new","index":N}.`;
  } else {
    sourceInstruction = `You have access to existing saved recipes. USE THEM when they fit the user's preferences — this avoids generating duplicates. Only create new recipes when no existing recipe fits a slot.`;
  }

  const mealTypeRules: Record<string, string> = {
    Breakfast: `You are generating ONLY Breakfast recipes. Keep breakfasts simple and classic — no need for fancy cuisines.
Breakfast ONLY allows: eggs (scrambled, fried, omelette), oatmeal, pancakes, waffles, smoothies, toast, yogurt parfait, breakfast burritos, french toast, cereal, muffins, granola, bagels, overnight oats, fruit bowls, hash browns, bacon and eggs.
Breakfast STRICTLY FORBIDS: curry, stir-fry, pasta, spaghetti, salmon, rice bowls, tacos, casseroles, grilled meat, roasted vegetables, soup, sandwiches, or ANY food that is typically eaten at lunch or dinner.
Breakfast may repeat up to 2-3 times across the week. Set "cuisine" to "American" for all breakfast recipes.`,
    Lunch: `You are generating ONLY Lunch recipes.
Lunch allows any light-to-moderate meal including but not limited to: sandwiches, salads, soups, wraps, grain bowls, quesadillas, light pastas, flatbreads, noodle bowls, spring rolls, bento boxes, poke bowls, banh mi, gyoza, cold noodles, lettuce wraps, hummus plates, rice paper rolls, congee, onigiri, and more.
VARIETY IS CRITICAL: Every single lunch MUST be a completely different dish with a different main ingredient. No two lunches should be the same type of food (e.g., not two wraps, not two salads). Vary the cuisine, protein, and style for each day.`,
    Dinner: `You are generating ONLY Dinner recipes.
Dinner allows any hearty, substantial meal including but not limited to: pasta, stir-fry, grilled proteins, casseroles, curries, tacos, roasted dishes, rice bowls, noodle soups (ramen, pho, udon), dumplings, fried rice, teriyaki, braised meats, stews, baked dishes, stuffed peppers, steak, burgers, fajitas, enchiladas, pad thai, lo mein, bibimbap, katsu, sushi bowls, tikka masala, bulgogi, laksa, satay, and more.
VARIETY IS CRITICAL: Every single dinner MUST be a completely different dish with a different main ingredient and cooking style. No two dinners should be similar. Use a different protein and cooking method for each day.`,
  };

  const rules = mealTypeRules[mealType] || `You are generating ONLY ${mealType} recipes. Every recipe must be appropriate for ${mealType}. Each day should have a different dish.`;

  return `You are an expert meal planning chef. You MUST respond with valid JSON only — no text before or after.

${sourceInstruction}

# MEAL TYPE — ${mealType.toUpperCase()} ONLY
${rules}

Every new_recipe MUST have "meal_type":"${mealType}".

# Required JSON structure

{
  "new_recipes": [
    {
      "title": "Recipe Name",
      "meal_type": "${mealType}",
      "description": "One sentence description.",
      "ingredients": [
        { "food_item": "chicken breast", "quantity": { "value": 8, "unit": "oz" }, "preparation": "diced" }
      ],
      "instructions": [
        { "step_number": 1, "description": "Do something.", "duration_minutes": 5 }
      ],
      "prep_time_minutes": 10,
      "cook_time_minutes": 20,
      "total_time_minutes": 30,
      "servings": 4,
      "cuisine": "Italian",
      "dietary_tags": [],
      "difficulty": "Easy",
      "nutrition_info": { "calories": 400, "protein_grams": 20, "fat_grams": 15, "carbohydrates_grams": 45 }
    }
  ],
  "meal_plan": {
    "Monday": { "${mealType}": { "source": "new", "index": 0 } }
  }
}

# Rules
- meal_plan entries use: {"source":"existing","index":N} or {"source":"new","index":N}
- Only include the meal type "${mealType}" in each day
- New recipes: 5-8 ingredients, 3-5 steps
- Dietary restrictions and excluded ingredients — no exceptions
- Special instructions are top priority
- Valid units (USE ONLY THESE): whole, slices, cups, tbsp, tsp, oz, lbs, gallons, cans, cloves, bunches, sticks, loaf, head, dozen
- Difficulties: Easy, Medium, Hard
- Include nutrition estimates per serving
- Use grocery-store units: slices (bread), oz (meat/cheese), cans (canned goods), cups (liquids/chopped), gallons (milk), tbsp/tsp (herbs/spices), whole (produce/eggs)
- Use CONSISTENT units for the same ingredient across all recipes
- CRITICAL: quantity values MUST be decimal numbers, NOT fractions. Use 0.25 instead of 1/4, 0.5 instead of 1/2, 0.33 instead of 1/3, etc.`;
}

function buildUserMessage(
  days: string[],
  mealType: string,
  preferences: MealPlanPreferences,
  pantryItems: FoodItem[],
  existingList: { index: number; title: string; cuisine: string; time: number; difficulty: string; tags: string[]; calories?: number }[],
  avoidDishes: string[] = []
): string {
  const parts: string[] = [];

  if (avoidDishes.length > 0) {
    parts.push(`IMPORTANT — The following dishes are ALREADY planned for other meals this week. Do NOT use any of these or anything similar:`);
    parts.push(avoidDishes.map((d) => `  - ${d}`).join("\n"));
    parts.push("");
  }

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
    `Generate ${mealType} recipes for ${days.length} day${days.length > 1 ? "s" : ""} (${days.join(", ")}).`
  );
  parts.push(`Each day needs exactly one ${mealType} recipe.`);
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

  if (preferences.cuisinePreference && mealType !== "Breakfast") {
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

  return parts.join("\n");
}

const MAX_RETRIES = 3;

async function fetchWithRetry(
  url: string,
  options: RequestInit,
  batchId: string,
  onProgress?: (message: string) => void
): Promise<Response> {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const response = await fetch(url, options);
    if (response.status === 429 && attempt < MAX_RETRIES) {
      // Parse retry delay from error or default to 15s
      const body = await response.json().catch(() => ({}));
      const msg = body.error?.message || "";
      const match = msg.match(/try again in (\d+(\.\d+)?)s/i);
      const waitSec = match ? Math.ceil(parseFloat(match[1])) + 1 : 30;
      onProgress?.(`Rate limited, waiting ${waitSec}s before retrying ${batchId}...`);
      await new Promise((r) => setTimeout(r, waitSec * 1000));
      continue;
    }
    return response;
  }
  throw new Error(`Rate limit exceeded after ${MAX_RETRIES} retries for ${batchId}.`);
}

async function fetchBatch(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  batchId: string,
  existingRecipes: Recipe[] = [],
  onProgress?: (message: string) => void
): Promise<{ newRecipes: Recipe[]; mealPlan: MealPlan }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 300000); // 5 min per batch (includes retry waits)

  let response: Response;
  try {
    response = await fetchWithRetry(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: "nvidia/nemotron-3-super-120b-a12b:free",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          max_tokens: 8192,
          response_format: { type: "json_object" },
        }),
        signal: controller.signal,
      },
      batchId,
      onProgress
    );
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
      error.error?.message || `OpenRouter API error: ${response.status}`
    );
  }

  const data = await response.json();
  let content: any;
  try {
    let raw = data.choices?.[0]?.message?.content ?? "{}";
    console.log(`[${batchId}] Raw AI response:`, raw.slice(0, 500));
    // Strip thinking blocks (some reasoning models wrap output in <think>...</think>)
    raw = raw.replace(/<think>[\s\S]*?<\/think>/gi, "").trim();
    raw = raw.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    // Fix fractions like 1/4, 1/2, 3/4 that the model outputs as bare expressions
    raw = raw.replace(/:\s*(\d+)\s*\/\s*(\d+)/g, (_: string, n: string, d: string) => `: ${(parseInt(n) / parseInt(d)).toFixed(2)}`);
    content = JSON.parse(raw);
    console.log(`[${batchId}] Parsed keys:`, Object.keys(content));
  } catch (e) {
    console.error(`[${batchId}] Parse error:`, e);
    throw new Error(`Failed to parse batch ${batchId} response from AI.`);
  }

  // Normalize common key variations from different models
  if (!content.meal_plan) {
    const altKeys = ["mealPlan", "meal-plan", "mealplan", "plan"];
    for (const key of altKeys) {
      if (content[key] && typeof content[key] === "object") {
        content.meal_plan = content[key];
        break;
      }
    }
  }
  if (!content.meal_plan) {
    throw new Error(`AI returned unexpected format for batch ${batchId}.`);
  }
  if (!content.new_recipes && content.newRecipes) {
    content.new_recipes = content.newRecipes;
  }

  const newRecipes: Recipe[] = (content.new_recipes || []).map(
    (r: any, i: number) => ({
      ...r,
      id: `gen-${Date.now()}-${batchId}-${i}`,
      ingredients: normalizeRecipeIngredients(r.ingredients || []),
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

let _generating = false;

export async function generateMealPlan(
  apiKey: string,
  preferences: MealPlanPreferences,
  pantryItems: FoodItem[],
  existingRecipes: Recipe[],
  onProgress?: (message: string) => void
): Promise<GenerationResult> {
  if (_generating) throw new Error("Generation already in progress.");
  _generating = true;
  try {
    return await _generateMealPlan(apiKey, preferences, pantryItems, existingRecipes, onProgress);
  } finally {
    _generating = false;
  }
}

async function _generateMealPlan(
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

  const mealTypes = preferences.mealTypes;
  const allNewRecipes: Recipe[] = [];
  const mergedMealPlan: MealPlan = {};
  const usedDishNames: string[] = [];

  // Run each meal type sequentially with spacing to stay within free tier rate limits
  let isFirstBatch = true;
  for (const mealType of mealTypes) {
    if (!isFirstBatch) {
      await new Promise((r) => setTimeout(r, 2000));
    }
    isFirstBatch = false;
    onProgress?.(`Generating ${mealType}...`);
    const systemPrompt = buildSystemPrompt(recipeSource, mealType);
    const userMessage = buildUserMessage(allDays, mealType, preferences, pantryItems, existingList, usedDishNames);
    const result = await fetchBatch(apiKey, systemPrompt, userMessage, mealType, existingRecipes, onProgress);

    allNewRecipes.push(...result.newRecipes);
    for (const r of result.newRecipes) {
      usedDishNames.push(r.title);
    }
    for (const [day, meals] of Object.entries(result.mealPlan)) {
      mergedMealPlan[day] = { ...mergedMealPlan[day], ...meals };
    }
  }

  onProgress?.("Finalizing meal plan...");

  // Check for missing slots and try to fill them sequentially
  const missingSlots: { day: string; mealType: string }[] = [];
  for (const day of allDays) {
    for (const mealType of mealTypes) {
      if (!mergedMealPlan[day]?.[mealType]) {
        missingSlots.push({ day, mealType });
      }
    }
  }

  if (missingSlots.length > 0) {
    const missingByType = new Map<string, string[]>();
    for (const { day, mealType } of missingSlots) {
      if (!missingByType.has(mealType)) missingByType.set(mealType, []);
      missingByType.get(mealType)!.push(day);
    }

    try {
      for (const [mealType, days] of Array.from(missingByType.entries())) {
        const systemPrompt = buildSystemPrompt(recipeSource, mealType);
        const userMessage = buildUserMessage(days, mealType, preferences, pantryItems, existingList, usedDishNames);
        const result = await fetchBatch(apiKey, systemPrompt, userMessage, `fill-${mealType}`, existingRecipes, onProgress);

        allNewRecipes.push(...result.newRecipes);
        for (const [day, meals] of Object.entries(result.mealPlan)) {
          if (!mergedMealPlan[day]) mergedMealPlan[day] = {};
          for (const [mealType, id] of Object.entries(meals)) {
            if (!mergedMealPlan[day][mealType]) {
              mergedMealPlan[day][mealType] = id;
            }
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
- Valid units (USE ONLY THESE): whole, slices, cups, tbsp, tsp, oz, lbs, gallons, cans, cloves, bunches, sticks, loaf, head, dozen
- Valid difficulties: Easy, Medium, Hard
- Include realistic nutrition estimates per serving
- Be creative and detailed in the description and instructions
- Use grocery-store units: slices (bread), oz (meat/cheese), cans (canned goods), cups (liquids/chopped), gallons (milk), tbsp/tsp (herbs/spices), whole (produce/eggs)`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 180000);

  let response: Response;
  try {
    response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "nvidia/nemotron-3-super-120b-a12b:free",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_tokens: 8192,
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
      error.error?.message || `OpenRouter API error: ${response.status}`
    );
  }

  const data = await response.json();
  let recipe: any;
  try {
    let rawRecipe = data.choices?.[0]?.message?.content ?? "{}";
    rawRecipe = rawRecipe.replace(/^```(?:json)?\s*\n?/i, "").replace(/\n?```\s*$/i, "").trim();
    rawRecipe = rawRecipe.replace(/:\s*(\d+)\s*\/\s*(\d+)/g, (_: string, n: string, d: string) => `: ${(parseInt(n) / parseInt(d)).toFixed(2)}`);
    recipe = JSON.parse(rawRecipe);
  } catch {
    throw new Error("Failed to parse recipe response from AI. Please try again.");
  }
  if (!recipe.title) {
    throw new Error("AI returned an unexpected response format. Please try again.");
  }
  recipe.ingredients = normalizeRecipeIngredients(recipe.ingredients || []);
  return recipe;
}
