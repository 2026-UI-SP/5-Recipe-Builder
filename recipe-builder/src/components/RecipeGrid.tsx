import React, { useMemo, useState } from "react";
import {
  Box,
  Grid,
  Button,
  Chip,
  Stack,
  Dialog,
  DialogTitle,
  DialogActions,
} from "@mui/material";
import StarIcon from "@mui/icons-material/Star";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import { Recipe } from "../data/types";
import { getCuisineColor } from "../config/theme";
import RecipeCard from "./RecipeCard";
import EmptyState from "./EmptyState";

interface RecipeGridProps {
  recipes: Recipe[];
  onSelect: (recipe: Recipe) => void;
  onToggleFavorite: (id: string) => void;
  onIMadeThis: (recipe: Recipe) => void;
  onAddToShoppingList: (recipe: Recipe) => void;
  onDelete?: (id: string) => void;
}

export default function RecipeGrid({
  recipes,
  onSelect,
  onToggleFavorite,
  onIMadeThis,
  onAddToShoppingList,
  onDelete,
}: RecipeGridProps) {
  const [activeFilter, setActiveFilter] = useState("All");
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; title: string } | null>(null);

  const { filters, filterMap } = useMemo(() => {
    const favorites = recipes.filter((r) => r.favorite);
    const groups: Record<string, Recipe[]> = {};
    for (const recipe of recipes) {
      const key = recipe.cuisine || "Other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(recipe);
    }
    const sortedCuisines = Object.entries(groups).sort(([a], [b]) => a.localeCompare(b));

    const f: { label: string; recipes: Recipe[] }[] = [{ label: "All", recipes }];
    if (favorites.length > 0) {
      f.push({ label: "Favorites", recipes: favorites });
    }
    for (const [cuisine, cuisineRecipes] of sortedCuisines) {
      f.push({ label: cuisine, recipes: cuisineRecipes });
    }

    const map: Record<string, Recipe[]> = {};
    for (const entry of f) map[entry.label] = entry.recipes;
    return { filters: f, filterMap: map };
  }, [recipes]);

  const safeFilter = filterMap[activeFilter] ? activeFilter : "All";
  const visibleRecipes = filterMap[safeFilter] || recipes;

  return (
    <Box>
      {recipes.length === 0 ? (
        <EmptyState
          icon={<MenuBookIcon />}
          title="No recipes yet"
          subtitle="Generate a meal plan above to get started!"
        />
      ) : (
        <>
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mb: 3 }}>
            {filters.map((f) => {
              const isActive = f.label === safeFilter;
              const cuisineColor = getCuisineColor(f.label);
              return (
                <Chip
                  key={f.label}
                  label={f.label === "Favorites" ? undefined : f.label}
                  icon={
                    f.label === "Favorites" ? (
                      <StarIcon fontSize="small" sx={{ color: isActive ? "#fff" : "warning.main" }} />
                    ) : undefined
                  }
                  clickable
                  onClick={() => setActiveFilter(f.label)}
                  variant={isActive ? "filled" : "outlined"}
                  color={isActive && !cuisineColor ? "primary" : "default"}
                  sx={{
                    fontWeight: 600,
                    fontSize: "0.8rem",
                    ...(cuisineColor && isActive
                      ? { bgcolor: cuisineColor, color: "#fff", borderColor: cuisineColor, "&:hover": { bgcolor: cuisineColor } }
                      : cuisineColor
                        ? { borderColor: cuisineColor, color: cuisineColor }
                        : {}),
                    ...(f.label === "Favorites" && isActive
                      ? { bgcolor: "warning.main", color: "#fff", "&:hover": { bgcolor: "warning.dark" } }
                      : {}),
                  }}
                />
              );
            })}
          </Stack>

          <Grid container spacing={3}>
            {visibleRecipes.map((recipe) => (
              <Grid size={{ xs: 12, sm: 6 }} key={recipe.id}>
                <RecipeCard
                  recipe={recipe}
                  onSelect={onSelect}
                  onToggleFavorite={onToggleFavorite}
                  onIMadeThis={onIMadeThis}
                  onAddToShoppingList={onAddToShoppingList}
                  onDelete={onDelete ? (id) => {
                    const r = recipes.find((rec) => rec.id === id);
                    setDeleteConfirm({ id, title: r?.title || "this recipe" });
                  } : undefined}
                />
              </Grid>
            ))}
          </Grid>
        </>
      )}

      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)}>
        <DialogTitle>Delete "{deleteConfirm?.title}"?</DialogTitle>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirm(null)}>Cancel</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              if (deleteConfirm && onDelete) onDelete(deleteConfirm.id);
              setDeleteConfirm(null);
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
