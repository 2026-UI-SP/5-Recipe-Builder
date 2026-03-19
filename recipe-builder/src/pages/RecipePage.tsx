import React, { useState } from "react";
import { FoodItem, Recipe } from "../data/types";
import { deductIngredients, findMissingIngredients } from "../utils/helpers";
import RecipeGrid from "../components/RecipeGrid";
import RecipeDetail from "../components/RecipeDetail";

interface RecipePageProps {
  pantry: FoodItem[];
  setPantry: React.Dispatch<React.SetStateAction<FoodItem[]>>;
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  setShoppingList: React.Dispatch<React.SetStateAction<FoodItem[]>>;
  onStartCookMode: (recipe: Recipe) => void;
  onSnackbar: (message: string) => void;
}

/**
 * Container for the "Make Meal" tab.
 * Shows a card grid of all recipes; clicking one opens its detail view.
 */
export default function RecipePage({
  pantry,
  setPantry,
  recipes,
  setRecipes,
  setShoppingList,
  onStartCookMode,
  onSnackbar,
}: RecipePageProps) {
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);

  const toggleFavorite = (id: string) => {
    setRecipes((prev) =>
      prev.map((r) => (r.id === id ? { ...r, favorite: !r.favorite } : r))
    );
  };

  const handleIMadeThis = (recipe: Recipe) => {
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
    <RecipeGrid
      recipes={recipes}
      onSelect={setSelectedRecipe}
      onToggleFavorite={toggleFavorite}
      onIMadeThis={handleIMadeThis}
      onAddToShoppingList={handleAddToShoppingList}
    />
  );
}
