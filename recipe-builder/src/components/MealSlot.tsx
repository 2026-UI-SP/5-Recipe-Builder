import React from "react";
import {
  Typography,
  Box,
  Chip,
  Stack,
  IconButton,
  alpha,
} from "@mui/material";
import TimerIcon from "@mui/icons-material/Timer";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import { Recipe } from "../data/types";

interface MealSlotProps {
  day: string;
  mealType: string;
  recipe: Recipe | null;
  isDragging: boolean;
  onRemove: (day: string, mealType: string) => void;
  onOpenPicker: (day: string, mealType: string) => void;
  onStartCookMode: (recipe: Recipe) => void;
  onDragStart: (day: string, mealType: string) => void;
  onDrop: (day: string, mealType: string) => void;
}

export default function MealSlot({
  day,
  mealType,
  recipe,
  isDragging,
  onRemove,
  onOpenPicker,
  onStartCookMode,
  onDragStart,
  onDrop,
}: MealSlotProps) {
  if (recipe) {
    return (
      <Box
        role="button"
        tabIndex={0}
        aria-label={`${mealType}: ${recipe.title}. Tap to cook.`}
        draggable
        onDragStart={() => onDragStart(day, mealType)}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); onDrop(day, mealType); }}
        onClick={() => onStartCookMode(recipe)}
        sx={{
          cursor: "pointer",
          p: 1.25,
          borderRadius: 2,
          bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
          "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.08) },
          transition: "background-color 0.15s",
          border: isDragging ? "2px solid" : "1px solid transparent",
          borderColor: isDragging ? "primary.main" : "transparent",
        }}
      >
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ textTransform: "uppercase", fontWeight: 700, letterSpacing: 0.5, fontSize: "0.65rem" }}
          >
            {mealType}
          </Typography>
          <IconButton
            size="small"
            onClick={(e) => { e.stopPropagation(); onRemove(day, mealType); }}
            aria-label={`Remove ${recipe.title}`}
            sx={{ p: 0.25 }}
          >
            <CloseIcon sx={{ fontSize: 14 }} />
          </IconButton>
        </Stack>

        <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5, lineHeight: 1.3 }}>
          {recipe.title}
        </Typography>

        <Stack direction="row" spacing={0.5} sx={{ flexWrap: "wrap", gap: 0.5 }}>
          <Chip
            icon={<TimerIcon />}
            label={`${recipe.total_time_minutes} min`}
            size="small"
            variant="outlined"
            sx={{ height: 22, fontSize: "0.65rem", "& .MuiChip-icon": { fontSize: 14 } }}
          />
          <Chip
            label={recipe.difficulty}
            size="small"
            variant="outlined"
            color={recipe.difficulty === "Easy" ? "success" : recipe.difficulty === "Hard" ? "error" : "warning"}
            sx={{ height: 22, fontSize: "0.65rem" }}
          />
          {recipe.nutrition_info && (
            <Chip
              label={`${recipe.nutrition_info.calories} cal · ${recipe.nutrition_info.protein_grams}P · ${recipe.nutrition_info.fat_grams}F · ${recipe.nutrition_info.carbohydrates_grams}C`}
              size="small"
              variant="outlined"
              sx={{ height: 22, fontSize: "0.6rem" }}
            />
          )}
          {recipe.cuisine && (
            <Chip
              label={recipe.cuisine}
              size="small"
              variant="outlined"
              sx={{ height: 22, fontSize: "0.65rem" }}
            />
          )}
          {recipe.dietary_tags.map((tag) => (
            <Chip
              key={tag}
              label={tag}
              size="small"
              color="success"
              variant="outlined"
              sx={{ height: 22, fontSize: "0.6rem" }}
            />
          ))}
        </Stack>
      </Box>
    );
  }

  // Empty slot
  return (
    <Box
      role="button"
      tabIndex={0}
      aria-label={`Add ${mealType} recipe`}
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => { e.preventDefault(); onDrop(day, mealType); }}
      onClick={() => onOpenPicker(day, mealType)}
      sx={{
        p: 1,
        borderRadius: 1.5,
        border: "1.5px dashed",
        borderColor: "divider",
        cursor: "pointer",
        "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
        transition: "all 0.15s",
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        minHeight: 40,
      }}
    >
      <AddIcon sx={{ fontSize: 16, color: "text.disabled" }} />
      <Typography variant="body2" color="text.disabled" sx={{ fontSize: "0.85rem" }}>
        {mealType}
      </Typography>
    </Box>
  );
}
