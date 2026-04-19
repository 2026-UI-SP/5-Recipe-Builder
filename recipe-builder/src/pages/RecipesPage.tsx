import React, { useMemo, useState } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  Stack,
  Typography,
  Button,
  Chip,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import { Recipe, FoodItem, MealPlan } from "../data/types";
import { deductIngredients, findMissingIngredients } from "../utils/helpers";
import { generateSingleRecipe, AiProvider } from "../utils/openai";
import RecipeGrid from "../components/RecipeGrid";
import RecipeDetail from "../components/RecipeDetail";
import RecipeFormDialog, { RecipeFormState } from "../components/RecipeFormDialog";

interface RecipesPageProps {
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  pantry: FoodItem[];
  setPantry: React.Dispatch<React.SetStateAction<FoodItem[]>>;
  setShoppingList: React.Dispatch<React.SetStateAction<FoodItem[]>>;
  mealPlan: MealPlan;
  setMealPlan: React.Dispatch<React.SetStateAction<MealPlan>>;
  cookedRecipeIds: Set<string>;
  onStartCookMode: (recipe: Recipe) => void;
  onSnackbar: (message: string) => void;
  apiKey: string;
  aiProvider: AiProvider;
  openrouterModel: string;
}

function makeEmptyForm(): RecipeFormState {
  return {
    title: "",
    description: "",
    ingredients: [{ food_item: "", quantity: { value: 0, unit: "pieces" } }],
    instructions: [{ step_number: 1, description: "" }],
    prep_time_minutes: 0,
    cook_time_minutes: 0,
    servings: 4,
    cuisine: "",
    difficulty: "Easy",
  };
}

export default function RecipesPage({
  recipes,
  setRecipes,
  pantry,
  setPantry,
  setShoppingList,
  mealPlan,
  setMealPlan,
  cookedRecipeIds,
  onStartCookMode,
  onSnackbar,
  apiKey,
  aiProvider,
  openrouterModel,
}: RecipesPageProps) {
  const [search, setSearch] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(makeEmptyForm());

  // AI generate
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // Edit dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState<(RecipeFormState & { id: string }) | null>(null);

  const filteredRecipes = useMemo(() => {
    if (!search.trim()) return recipes;
    const q = search.toLowerCase();
    return recipes.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.cuisine.toLowerCase().includes(q) ||
        r.dietary_tags.some((t) => t.toLowerCase().includes(q)) ||
        r.description.toLowerCase().includes(q)
    );
  }, [recipes, search]);

  const toggleFavorite = (id: string) => {
    setRecipes((prev) => prev.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r)));
  };

  const handleIMadeThis = (recipe: Recipe) => {
    if (cookedRecipeIds.has(recipe.id)) {
      onSnackbar(`Ingredients for "${recipe.title}" were already deducted via Cook Mode`);
      return;
    }
    setPantry((prev) => deductIngredients(prev, recipe));
    onSnackbar(`Ingredients for "${recipe.title}" deducted from pantry!`);
  };

  const handleAddToShoppingList = (recipe: Recipe) => {
    const missing = findMissingIngredients(pantry, recipe);
    if (missing.length === 0) {
      onSnackbar("You have all the ingredients!");
      return;
    }
    setShoppingList((prev) => [...prev, ...missing]);
    onSnackbar(`Added ${missing.length} missing ingredient(s) to shopping list`);
  };

  const handleDeleteRecipe = (id: string) => {
    setRecipes((prev) => prev.filter((r) => r.id !== id));
    setMealPlan((prev) => {
      const updated: MealPlan = {};
      for (const [day, meals] of Object.entries(prev)) {
        const filtered: Record<string, string> = {};
        for (const [mealType, recipeId] of Object.entries(meals)) {
          if (recipeId !== id) filtered[mealType] = recipeId;
        }
        if (Object.keys(filtered).length > 0) updated[day] = filtered;
      }
      return updated;
    });
    onSnackbar("Recipe deleted");
  };

  // --- AI generation ---
  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    if (!apiKey) {
      setAiError(`Please set your ${aiProvider === "openrouter" ? "OpenRouter" : "OpenAI"} API key in Settings first.`);
      return;
    }
    setAiLoading(true);
    setAiError("");
    try {
      const generated = await generateSingleRecipe(apiKey, aiProvider, openrouterModel, aiPrompt.trim());
      setAddForm({
        title: generated.title || "",
        description: generated.description || "",
        ingredients: generated.ingredients?.length
          ? generated.ingredients
          : [{ food_item: "", quantity: { value: 0, unit: "pieces" } }],
        instructions: generated.instructions?.length
          ? generated.instructions
          : [{ step_number: 1, description: "" }],
        prep_time_minutes: generated.prep_time_minutes || 0,
        cook_time_minutes: generated.cook_time_minutes || 0,
        servings: generated.servings || 4,
        cuisine: generated.cuisine || "",
        difficulty: generated.difficulty || "Easy",
        dietary_tags: generated.dietary_tags,
        nutrition_info: generated.nutrition_info,
      });
      setAiPrompt("");
    } catch (err: any) {
      setAiError(err.message || "Failed to generate recipe");
    } finally {
      setAiLoading(false);
    }
  };

  // --- Save new recipe ---
  const handleSaveNew = () => {
    if (!addForm.title.trim()) return;
    const validIngredients = addForm.ingredients.filter((ing) => ing.food_item.trim() && ing.quantity.value > 0);
    const validSteps = addForm.instructions.filter((s) => s.description.trim());
    if (validIngredients.length === 0 || validSteps.length === 0) return;

    const newRecipe: Recipe = {
      id: `user-${Date.now()}`,
      title: addForm.title.trim(),
      description: addForm.description.trim(),
      cuisine: addForm.cuisine.trim() || "Other",
      ingredients: validIngredients,
      instructions: validSteps.map((s, i) => ({ ...s, step_number: i + 1 })),
      prep_time_minutes: addForm.prep_time_minutes,
      cook_time_minutes: addForm.cook_time_minutes,
      total_time_minutes: addForm.prep_time_minutes + addForm.cook_time_minutes,
      servings: addForm.servings,
      difficulty: addForm.difficulty as "Easy" | "Medium" | "Hard",
      dietary_tags: addForm.dietary_tags || [],
      nutrition_info: addForm.nutrition_info,
    };
    setRecipes((prev) => [...prev, newRecipe]);
    setAddForm(makeEmptyForm());
    setAddOpen(false);
    onSnackbar(`Added "${newRecipe.title}"`);
  };

  // --- Save edited recipe ---
  const handleSaveEdit = () => {
    if (!editForm || !editForm.title.trim()) return;
    const validIngredients = editForm.ingredients.filter((ing) => ing.food_item.trim() && ing.quantity.value > 0);
    const validSteps = editForm.instructions.filter((s) => s.description.trim());
    if (validIngredients.length === 0 || validSteps.length === 0) return;

    const updated: Recipe = {
      id: editForm.id,
      title: editForm.title.trim(),
      description: editForm.description.trim(),
      cuisine: editForm.cuisine.trim() || "Other",
      ingredients: validIngredients,
      instructions: validSteps.map((s, i) => ({ ...s, step_number: i + 1 })),
      prep_time_minutes: editForm.prep_time_minutes,
      cook_time_minutes: editForm.cook_time_minutes,
      total_time_minutes: editForm.prep_time_minutes + editForm.cook_time_minutes,
      servings: editForm.servings,
      difficulty: editForm.difficulty as "Easy" | "Medium" | "Hard",
      dietary_tags: editForm.dietary_tags || [],
      nutrition_info: editForm.nutrition_info,
    };
    setRecipes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setEditOpen(false);
    setEditForm(null);
    onSnackbar(`Updated "${updated.title}"`);
  };

  if (selectedRecipe) {
    return (
      <RecipeDetail
        recipe={selectedRecipe}
        pantry={pantry}
        apiKey={apiKey}
        aiProvider={aiProvider}
        openrouterModel={openrouterModel}
        onBack={() => setSelectedRecipe(null)}
        onToggleFavorite={toggleFavorite}
        onIMadeThis={handleIMadeThis}
        onAddToShoppingList={handleAddToShoppingList}
        onStartCookMode={onStartCookMode}
        onUpdateRecipe={(updated) => {
          setRecipes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
          setSelectedRecipe(updated);
        }}
        onSnackbar={onSnackbar}
      />
    );
  }

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size="small"
          onClick={() => { setAddForm(makeEmptyForm()); setAiPrompt(""); setAiError(""); setAddOpen(true); }}
        >
          Add
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        {recipes.length > 0 && (
          <Chip label={`${recipes.length} recipe${recipes.length !== 1 ? "s" : ""}`} size="small" variant="outlined" />
        )}
      </Stack>

      {recipes.length > 3 && (
        <TextField
          size="small"
          fullWidth
          placeholder="Search recipes by name, cuisine, or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 1.5 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
        />
      )}

      {search.trim() && filteredRecipes.length === 0 ? (
        <Box sx={{ textAlign: "center", py: 6 }}>
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No recipes match "{search}"
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Try a different search term
          </Typography>
        </Box>
      ) : (
        <RecipeGrid
          recipes={filteredRecipes}
          onSelect={setSelectedRecipe}
          onToggleFavorite={toggleFavorite}
          onIMadeThis={handleIMadeThis}
          onAddToShoppingList={handleAddToShoppingList}
          onDelete={handleDeleteRecipe}
        />
      )}

      {/* Add recipe dialog */}
      <RecipeFormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Recipe"
        form={addForm}
        setForm={setAddForm}
        onSave={handleSaveNew}
        saveLabel="Add Recipe"
        ai={{
          prompt: aiPrompt,
          setPrompt: setAiPrompt,
          loading: aiLoading,
          error: aiError,
          onGenerate: handleAiGenerate,
        }}
      />

      {/* Edit recipe dialog */}
      {editForm && (
        <RecipeFormDialog
          open={editOpen}
          onClose={() => { setEditOpen(false); setEditForm(null); }}
          title="Edit Recipe"
          form={editForm}
          setForm={(updater) => setEditForm((prev) => prev ? { ...updater(prev), id: prev.id } : prev)}
          onSave={handleSaveEdit}
          saveLabel="Save"
        />
      )}
    </Box>
  );
}
