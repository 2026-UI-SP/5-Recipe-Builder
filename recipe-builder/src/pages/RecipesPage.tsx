import React, { useMemo, useState } from "react";
import {
  Box,
  TextField,
  InputAdornment,
  Stack,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Select,
  MenuItem,
  IconButton,
  Chip,
  CircularProgress,
  Alert,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import { Recipe, RecipeIngredient, FoodItem, MealPlan } from "../data/types";
import { UNITS } from "../config/constants";
import { deductIngredients, findMissingIngredients } from "../utils/helpers";
import { generateSingleRecipe } from "../utils/openai";
import RecipeGrid from "../components/RecipeGrid";
import RecipeDetail from "../components/RecipeDetail";

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
}

const EMPTY_INGREDIENT: RecipeIngredient = {
  food_item: "",
  quantity: { value: 0, unit: "pieces" },
};

function makeEmptyRecipe(): Omit<Recipe, "id"> {
  return {
    title: "",
    description: "",
    ingredients: [{ ...EMPTY_INGREDIENT, quantity: { ...EMPTY_INGREDIENT.quantity } }],
    instructions: [{ step_number: 1, description: "" }],
    prep_time_minutes: 0,
    cook_time_minutes: 0,
    total_time_minutes: 0,
    servings: 4,
    cuisine: "",
    dietary_tags: [],
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
}: RecipesPageProps) {
  const [search, setSearch] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  // Add recipe dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addForm, setAddForm] = useState(makeEmptyRecipe());

  // AI generate state
  const [aiPrompt, setAiPrompt] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // Edit recipe dialog
  const [editOpen, setEditOpen] = useState(false);
  const [editRecipe, setEditRecipe] = useState<Recipe | null>(null);

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
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r))
    );
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
    // Remove any meal plan slots that reference this recipe
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

  const handleOpenEdit = (recipe: Recipe) => {
    setEditRecipe(JSON.parse(JSON.stringify(recipe)));
    setEditOpen(true);
  };

  // --- Add recipe handlers ---
  const handleAddIngredient = () => {
    setAddForm((f) => ({
      ...f,
      ingredients: [...f.ingredients, { ...EMPTY_INGREDIENT, quantity: { ...EMPTY_INGREDIENT.quantity } }],
    }));
  };

  const handleRemoveIngredient = (idx: number) => {
    setAddForm((f) => ({
      ...f,
      ingredients: f.ingredients.filter((_, i) => i !== idx),
    }));
  };

  const handleAddStep = () => {
    setAddForm((f) => ({
      ...f,
      instructions: [...f.instructions, { step_number: f.instructions.length + 1, description: "" }],
    }));
  };

  const handleRemoveStep = (idx: number) => {
    setAddForm((f) => ({
      ...f,
      instructions: f.instructions
        .filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, step_number: i + 1 })),
    }));
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) return;
    if (!apiKey) {
      setAiError("Please set your OpenAI API key in Settings first.");
      return;
    }
    setAiLoading(true);
    setAiError("");
    try {
      const generated = await generateSingleRecipe(apiKey, aiPrompt.trim());
      setAddForm({
        title: generated.title || "",
        description: generated.description || "",
        ingredients: generated.ingredients?.length ? generated.ingredients : [{ ...EMPTY_INGREDIENT, quantity: { ...EMPTY_INGREDIENT.quantity } }],
        instructions: generated.instructions?.length ? generated.instructions : [{ step_number: 1, description: "" }],
        prep_time_minutes: generated.prep_time_minutes || 0,
        cook_time_minutes: generated.cook_time_minutes || 0,
        total_time_minutes: generated.total_time_minutes || 0,
        servings: generated.servings || 4,
        cuisine: generated.cuisine || "",
        dietary_tags: generated.dietary_tags || [],
        difficulty: generated.difficulty || "Easy",
        nutrition_info: generated.nutrition_info,
      });
      setAiPrompt("");
    } catch (err: any) {
      setAiError(err.message || "Failed to generate recipe");
    } finally {
      setAiLoading(false);
    }
  };

  const handleSaveNewRecipe = () => {
    if (!addForm.title.trim()) return;
    const validIngredients = addForm.ingredients.filter(
      (ing) => ing.food_item.trim() && ing.quantity.value > 0
    );
    const validSteps = addForm.instructions.filter((s) => s.description.trim());
    if (validIngredients.length === 0 || validSteps.length === 0) return;

    const newRecipe: Recipe = {
      ...addForm,
      id: `user-${Date.now()}`,
      title: addForm.title.trim(),
      description: addForm.description.trim(),
      cuisine: addForm.cuisine.trim() || "Other",
      ingredients: validIngredients,
      instructions: validSteps.map((s, i) => ({ ...s, step_number: i + 1 })),
      total_time_minutes: addForm.prep_time_minutes + addForm.cook_time_minutes,
    };
    setRecipes((prev) => [...prev, newRecipe]);
    setAddForm(makeEmptyRecipe());
    setAddOpen(false);
    onSnackbar(`Added "${newRecipe.title}"`);
  };

  // --- Edit recipe handlers ---
  const handleEditIngredient = () => {
    if (!editRecipe) return;
    setEditRecipe({
      ...editRecipe,
      ingredients: [...editRecipe.ingredients, { ...EMPTY_INGREDIENT, quantity: { ...EMPTY_INGREDIENT.quantity } }],
    });
  };

  const handleEditRemoveIngredient = (idx: number) => {
    if (!editRecipe) return;
    setEditRecipe({
      ...editRecipe,
      ingredients: editRecipe.ingredients.filter((_, i) => i !== idx),
    });
  };

  const handleEditStep = () => {
    if (!editRecipe) return;
    setEditRecipe({
      ...editRecipe,
      instructions: [
        ...editRecipe.instructions,
        { step_number: editRecipe.instructions.length + 1, description: "" },
      ],
    });
  };

  const handleEditRemoveStep = (idx: number) => {
    if (!editRecipe) return;
    setEditRecipe({
      ...editRecipe,
      instructions: editRecipe.instructions
        .filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, step_number: i + 1 })),
    });
  };

  const handleSaveEdit = () => {
    if (!editRecipe || !editRecipe.title.trim()) return;
    const validIngredients = editRecipe.ingredients.filter(
      (ing) => ing.food_item.trim() && ing.quantity.value > 0
    );
    const validSteps = editRecipe.instructions.filter((s) => s.description.trim());
    if (validIngredients.length === 0 || validSteps.length === 0) return;

    const updated: Recipe = {
      ...editRecipe,
      title: editRecipe.title.trim(),
      description: editRecipe.description.trim(),
      cuisine: editRecipe.cuisine.trim() || "Other",
      ingredients: validIngredients,
      instructions: validSteps.map((s, i) => ({ ...s, step_number: i + 1 })),
      total_time_minutes: editRecipe.prep_time_minutes + editRecipe.cook_time_minutes,
    };
    setRecipes((prev) => prev.map((r) => (r.id === updated.id ? updated : r)));
    setEditOpen(false);
    setEditRecipe(null);
    onSnackbar(`Updated "${updated.title}"`);
  };

  // --- Shared recipe form renderer ---
  const renderRecipeForm = (
    form: Omit<Recipe, "id"> | Recipe,
    setForm: (updater: (prev: any) => any) => void,
    onAddIngredient: () => void,
    onRemoveIngredient: (idx: number) => void,
    onAddStep: () => void,
    onRemoveStep: (idx: number) => void,
  ) => (
    <Stack spacing={2.5} sx={{ mt: 1 }}>
      <TextField
        label="Title"
        fullWidth
        value={form.title}
        onChange={(e) => setForm((f: any) => ({ ...f, title: e.target.value }))}
        autoFocus
      />
      <TextField
        label="Description"
        fullWidth
        multiline
        rows={2}
        value={form.description}
        onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))}
      />
      <Stack direction="row" spacing={2}>
        <TextField
          label="Cuisine"
          value={form.cuisine}
          onChange={(e) => setForm((f: any) => ({ ...f, cuisine: e.target.value }))}
          sx={{ flex: 1 }}
        />
        <Select
          value={form.difficulty}
          onChange={(e) => setForm((f: any) => ({ ...f, difficulty: e.target.value }))}
          sx={{ minWidth: 100 }}
        >
          {["Easy", "Medium", "Hard"].map((d) => (
            <MenuItem key={d} value={d}>{d}</MenuItem>
          ))}
        </Select>
      </Stack>
      <Stack direction="row" spacing={2}>
        <TextField
          label="Prep (min)"
          type="number"
          value={form.prep_time_minutes || ""}
          onChange={(e) => setForm((f: any) => ({ ...f, prep_time_minutes: parseInt(e.target.value) || 0 }))}
          inputProps={{ min: 0 }}
          sx={{ flex: 1 }}
        />
        <TextField
          label="Cook (min)"
          type="number"
          value={form.cook_time_minutes || ""}
          onChange={(e) => setForm((f: any) => ({ ...f, cook_time_minutes: parseInt(e.target.value) || 0 }))}
          inputProps={{ min: 0 }}
          sx={{ flex: 1 }}
        />
        <TextField
          label="Servings"
          type="number"
          value={form.servings || ""}
          onChange={(e) => setForm((f: any) => ({ ...f, servings: parseInt(e.target.value) || 1 }))}
          inputProps={{ min: 1 }}
          sx={{ flex: 1 }}
        />
      </Stack>

      {/* Ingredients */}
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Ingredients</Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={onAddIngredient}>Add</Button>
        </Stack>
        <Stack spacing={1}>
          {form.ingredients.map((ing: RecipeIngredient, idx: number) => (
            <Stack key={idx} direction="row" spacing={1} alignItems="center">
              <TextField
                size="small"
                placeholder="Ingredient"
                value={ing.food_item}
                onChange={(e) =>
                  setForm((f: any) => ({
                    ...f,
                    ingredients: f.ingredients.map((item: RecipeIngredient, i: number) =>
                      i === idx ? { ...item, food_item: e.target.value } : item
                    ),
                  }))
                }
                sx={{ flex: 2 }}
              />
              <TextField
                size="small"
                type="number"
                placeholder="Qty"
                value={ing.quantity.value || ""}
                onChange={(e) =>
                  setForm((f: any) => ({
                    ...f,
                    ingredients: f.ingredients.map((item: RecipeIngredient, i: number) =>
                      i === idx
                        ? { ...item, quantity: { ...item.quantity, value: parseFloat(e.target.value) || 0 } }
                        : item
                    ),
                  }))
                }
                inputProps={{ min: 0, step: "any" }}
                sx={{ flex: 0.7 }}
              />
              <Select
                size="small"
                value={ing.quantity.unit}
                onChange={(e) =>
                  setForm((f: any) => ({
                    ...f,
                    ingredients: f.ingredients.map((item: RecipeIngredient, i: number) =>
                      i === idx
                        ? { ...item, quantity: { ...item.quantity, unit: e.target.value } }
                        : item
                    ),
                  }))
                }
                sx={{ flex: 1 }}
              >
                {UNITS.map((u) => (
                  <MenuItem key={u} value={u}>{u}</MenuItem>
                ))}
              </Select>
              <IconButton size="small" onClick={() => onRemoveIngredient(idx)} disabled={form.ingredients.length <= 1}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      </Box>

      {/* Instructions */}
      <Box>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Instructions</Typography>
          <Button size="small" startIcon={<AddIcon />} onClick={onAddStep}>Add Step</Button>
        </Stack>
        <Stack spacing={1}>
          {form.instructions.map((step: any, idx: number) => (
            <Stack key={idx} direction="row" spacing={1} alignItems="flex-start">
              <Chip label={idx + 1} size="small" sx={{ mt: 0.75 }} />
              <TextField
                size="small"
                fullWidth
                multiline
                placeholder={`Step ${idx + 1}`}
                value={step.description}
                onChange={(e) =>
                  setForm((f: any) => ({
                    ...f,
                    instructions: f.instructions.map((s: any, i: number) =>
                      i === idx ? { ...s, description: e.target.value } : s
                    ),
                  }))
                }
              />
              <IconButton size="small" onClick={() => onRemoveStep(idx)} disabled={form.instructions.length <= 1}>
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Stack>
          ))}
        </Stack>
      </Box>
    </Stack>
  );

  if (selectedRecipe) {
    return (
      <RecipeDetail
        recipe={selectedRecipe}
        pantry={pantry}
        onBack={() => setSelectedRecipe(null)}
        onToggleFavorite={toggleFavorite}
        onIMadeThis={handleIMadeThis}
        onAddToShoppingList={handleAddToShoppingList}
        onStartCookMode={onStartCookMode}
        onSnackbar={onSnackbar}
      />
    );
  }

  return (
    <Box>
      {/* Header with add button */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <MenuBookIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Recipes
          </Typography>
          {recipes.length > 0 && (
            <Chip label={`${recipes.length} recipe${recipes.length !== 1 ? "s" : ""}`} size="small" variant="outlined" />
          )}
        </Stack>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size="small"
          onClick={() => { setAddForm(makeEmptyRecipe()); setAiPrompt(""); setAiError(""); setAddOpen(true); }}
        >
          Add
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Browse recipes and start cooking with what's in your pantry
      </Typography>

      {/* Search bar */}
      {recipes.length > 3 && (
        <TextField
          size="small"
          fullWidth
          placeholder="Search recipes by name, cuisine, or tag..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          sx={{ mb: 3 }}
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
          onEdit={handleOpenEdit}
        />
      )}

      {/* Add recipe dialog */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Add Recipe</DialogTitle>
        <DialogContent>
          <Box sx={{ mb: 2, mt: 1, p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <AutoAwesomeIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Generate with AI</Typography>
            </Stack>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                fullWidth
                placeholder="e.g. A spicy Thai coconut curry with shrimp, easy to make"
                value={aiPrompt}
                onChange={(e) => setAiPrompt(e.target.value)}
                disabled={aiLoading}
                onKeyDown={(e) => { if (e.key === "Enter") handleAiGenerate(); }}
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleAiGenerate}
                disabled={aiLoading || !aiPrompt.trim()}
                sx={{ minWidth: 100 }}
              >
                {aiLoading ? <CircularProgress size={20} /> : "Generate"}
              </Button>
            </Stack>
            {aiError && <Alert severity="error" sx={{ mt: 1 }}>{aiError}</Alert>}
          </Box>
          {renderRecipeForm(
            addForm,
            setAddForm,
            handleAddIngredient,
            handleRemoveIngredient,
            handleAddStep,
            handleRemoveStep,
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveNewRecipe}>Add Recipe</Button>
        </DialogActions>
      </Dialog>

      {/* Edit recipe dialog */}
      <Dialog
        open={editOpen}
        onClose={() => { setEditOpen(false); setEditRecipe(null); }}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>Edit Recipe</DialogTitle>
        <DialogContent>
          {editRecipe &&
            renderRecipeForm(
              editRecipe,
              (updater) => setEditRecipe((prev) => prev ? updater(prev) : prev),
              handleEditIngredient,
              handleEditRemoveIngredient,
              handleEditStep,
              handleEditRemoveStep,
            )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => { setEditOpen(false); setEditRecipe(null); }}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveEdit}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
