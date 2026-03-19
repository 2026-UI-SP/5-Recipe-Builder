import React, { useMemo, useState } from "react";
import {
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Grid,
  Button,
  Chip,
  Stack,
  IconButton,
  Paper,
  Tooltip,
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import TimerIcon from "@mui/icons-material/Timer";
import PeopleIcon from "@mui/icons-material/People";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import { Recipe } from "../data/types";
import { getCuisineColor } from "../config/theme";

interface RecipeGridProps {
  recipes: Recipe[];
  onSelect: (recipe: Recipe) => void;
  onToggleFavorite: (id: string) => void;
  onIMadeThis: (recipe: Recipe) => void;
  onAddToShoppingList: (recipe: Recipe) => void;
  onDelete?: (id: string) => void;
  onEdit?: (recipe: Recipe) => void;
}

function RecipeCard({
  recipe,
  onSelect,
  onToggleFavorite,
  onIMadeThis,
  onAddToShoppingList,
  onDelete,
  onEdit,
}: {
  recipe: Recipe;
  onSelect: (recipe: Recipe) => void;
  onToggleFavorite: (id: string) => void;
  onIMadeThis: (recipe: Recipe) => void;
  onAddToShoppingList: (recipe: Recipe) => void;
  onDelete?: (id: string) => void;
  onEdit?: (recipe: Recipe) => void;
}) {
  const cuisineColor = getCuisineColor(recipe.cuisine);

  return (
    <Card
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        cursor: "pointer",
        "&:hover": { boxShadow: 6, transform: "translateY(-2px)" },
        transition: "box-shadow 0.2s, transform 0.2s",
        overflow: "hidden",
      }}
      onClick={() => onSelect(recipe)}
    >
      {/* Colored cuisine accent bar */}
      <Box sx={{ height: 4, bgcolor: cuisineColor || "primary.main" }} />

      <CardContent sx={{ flexGrow: 1, pt: 2 }}>
        <Stack
          direction="row"
          justifyContent="space-between"
          alignItems="flex-start"
        >
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, lineHeight: 1.3 }}>
            {recipe.title}
          </Typography>
          <Stack direction="row" spacing={0}>
            {onEdit && (
              <Tooltip title="Edit recipe">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onEdit(recipe); }}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(recipe.id); }}
            >
              {recipe.favorite ? (
                <FavoriteIcon color="error" fontSize="small" />
              ) : (
                <FavoriteBorderIcon fontSize="small" />
              )}
            </IconButton>
            {onDelete && (
              <Tooltip title="Delete recipe">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onDelete(recipe.id); }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
          </Stack>
        </Stack>

        <Typography
          variant="body2"
          color="text.secondary"
          sx={{ mb: 1.5, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}
        >
          {recipe.description}
        </Typography>

        <Stack direction="row" spacing={0.5} sx={{ mb: 1, flexWrap: "wrap", gap: 0.5 }}>
          <Chip icon={<TimerIcon />} label={`${recipe.total_time_minutes} min`} size="small" />
          <Chip icon={<PeopleIcon />} label={`${recipe.servings}`} size="small" />
          {recipe.nutrition_info && (
            <Chip icon={<LocalFireDepartmentIcon />} label={`${recipe.nutrition_info.calories} cal`} size="small" />
          )}
        </Stack>

        <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
          {/* Cuisine chip with matching color */}
          <Chip
            label={recipe.cuisine}
            size="small"
            variant="outlined"
            sx={{
              borderColor: cuisineColor || undefined,
              color: cuisineColor || undefined,
              fontWeight: 600,
              fontSize: "0.7rem",
            }}
          />
          {recipe.dietary_tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              color="success"
              variant="outlined"
            />
          ))}
        </Stack>
      </CardContent>
      <CardActions sx={{ px: 2, pb: 2, flexWrap: "wrap", gap: 1 }}>
        <Button
          size="small"
          variant="outlined"
          onClick={(e) => { e.stopPropagation(); onIMadeThis(recipe); }}
        >
          I Made This
        </Button>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ShoppingCartIcon />}
          onClick={(e) => { e.stopPropagation(); onAddToShoppingList(recipe); }}
        >
          Shopping List
        </Button>
      </CardActions>
    </Card>
  );
}

export default function RecipeGrid({
  recipes,
  onSelect,
  onToggleFavorite,
  onIMadeThis,
  onAddToShoppingList,
  onDelete,
  onEdit,
}: RecipeGridProps) {
  const [activeFilter, setActiveFilter] = useState("All");

  const { filters, filterMap } = useMemo(() => {
    const favorites = recipes.filter((r) => r.favorite);
    const groups: Record<string, Recipe[]> = {};
    for (const recipe of recipes) {
      const key = recipe.cuisine || "Other";
      if (!groups[key]) groups[key] = [];
      groups[key].push(recipe);
    }
    const sortedCuisines = Object.entries(groups).sort(([a], [b]) =>
      a.localeCompare(b)
    );

    const f: { label: string; recipes: Recipe[] }[] = [
      { label: "All", recipes },
    ];
    if (favorites.length > 0) {
      f.push({ label: "Favorites", recipes: favorites });
    }
    for (const [cuisine, cuisineRecipes] of sortedCuisines) {
      f.push({ label: cuisine, recipes: cuisineRecipes });
    }

    const map: Record<string, Recipe[]> = {};
    for (const entry of f) {
      map[entry.label] = entry.recipes;
    }
    return { filters: f, filterMap: map };
  }, [recipes]);

  // Reset filter if it no longer exists
  const safeFilter = filterMap[activeFilter] ? activeFilter : "All";
  const visibleRecipes = filterMap[safeFilter] || recipes;

  return (
    <Box>
      <Typography variant="h5" gutterBottom sx={{ fontWeight: 700 }}>
        Recipes
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Browse recipes and start cooking with what's in your pantry
      </Typography>

      {recipes.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3 }}>
          <MenuBookIcon sx={{ fontSize: 56, color: "text.disabled", mb: 1.5 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            No recipes yet
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Generate a meal plan above to get started!
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Wrapping filter chips */}
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
                      <FavoriteIcon fontSize="small" sx={{ color: isActive ? "#fff" : "error.main" }} />
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
                      ? { bgcolor: "error.main", color: "#fff", "&:hover": { bgcolor: "error.dark" } }
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
                  onDelete={onDelete}
                  onEdit={onEdit}
                />
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Box>
  );
}
