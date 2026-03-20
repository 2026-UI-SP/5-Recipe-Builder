import React from "react";
import {
  Typography,
  Box,
  Card,
  CardContent,
  CardActions,
  Button,
  Chip,
  Stack,
  IconButton,
  Tooltip,
} from "@mui/material";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import TimerIcon from "@mui/icons-material/Timer";
import PeopleIcon from "@mui/icons-material/People";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import EditIcon from "@mui/icons-material/Edit";
import { Recipe } from "../data/types";
import { getCuisineColor } from "../config/theme";

interface RecipeCardProps {
  recipe: Recipe;
  onSelect: (recipe: Recipe) => void;
  onToggleFavorite: (id: string) => void;
  onIMadeThis: (recipe: Recipe) => void;
  onAddToShoppingList: (recipe: Recipe) => void;
  onDelete?: (id: string) => void;
  onEdit?: (recipe: Recipe) => void;
}

export default function RecipeCard({
  recipe,
  onSelect,
  onToggleFavorite,
  onIMadeThis,
  onAddToShoppingList,
  onDelete,
  onEdit,
}: RecipeCardProps) {
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
      <Box sx={{ height: 4, bgcolor: cuisineColor || "primary.main" }} />

      <CardContent sx={{ flexGrow: 1, pt: 2 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
          <Typography variant="h6" sx={{ fontWeight: 600, mb: 0.5, lineHeight: 1.3 }}>
            {recipe.title}
          </Typography>
          <Stack direction="row" spacing={0}>
            {onEdit && (
              <Tooltip title="Edit recipe">
                <IconButton
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onEdit(recipe); }}
                  aria-label={`Edit ${recipe.title}`}
                >
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            )}
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); onToggleFavorite(recipe.id); }}
              aria-label={recipe.favorite ? `Remove ${recipe.title} from favorites` : `Add ${recipe.title} to favorites`}
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
                  aria-label={`Delete ${recipe.title}`}
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
            <Chip key={tag} label={tag} size="small" color="success" variant="outlined" />
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
