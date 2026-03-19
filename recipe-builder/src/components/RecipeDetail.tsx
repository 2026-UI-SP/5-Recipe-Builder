import React, { useState } from "react";
import {
  Typography,
  Box,
  Button,
  Chip,
  Stack,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  Paper,
} from "@mui/material";
import RemoveIcon from "@mui/icons-material/Remove";
import AddIcon from "@mui/icons-material/Add";
import FavoriteIcon from "@mui/icons-material/Favorite";
import FavoriteBorderIcon from "@mui/icons-material/FavoriteBorder";
import TimerIcon from "@mui/icons-material/Timer";
import PeopleIcon from "@mui/icons-material/People";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CancelOutlinedIcon from "@mui/icons-material/CancelOutlined";
import { FoodItem, Recipe } from "../data/types";
import { hasEnoughInPantry } from "../utils/helpers";

const MODIFICATION_SUGGESTIONS = [
  "Make it healthier",
  "Double the servings",
  "Add more protein",
  "Make it spicy",
];

interface RecipeDetailProps {
  recipe: Recipe;
  pantry: FoodItem[];
  onBack: () => void;
  onToggleFavorite: (id: string) => void;
  onIMadeThis: (recipe: Recipe) => void;
  onAddToShoppingList: (recipe: Recipe) => void;
  onStartCookMode: (recipe: Recipe) => void;
  onSnackbar: (message: string) => void;
}

export default function RecipeDetail({
  recipe,
  pantry,
  onBack,
  onToggleFavorite,
  onIMadeThis,
  onAddToShoppingList,
  onStartCookMode,
  onSnackbar,
}: RecipeDetailProps) {
  const [modifyDialogOpen, setModifyDialogOpen] = useState(false);
  const [modifyText, setModifyText] = useState("");
  const [scaledServings, setScaledServings] = useState(recipe.servings);
  const scaleFactor = scaledServings / recipe.servings;

  return (
    <Box>
      {/* Header */}
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={onBack}>
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 600, flexGrow: 1 }}>
          {recipe.title}
        </Typography>
        <IconButton onClick={() => onToggleFavorite(recipe.id)}>
          {recipe.favorite ? (
            <FavoriteIcon color="error" />
          ) : (
            <FavoriteBorderIcon />
          )}
        </IconButton>
      </Stack>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 2 }}>
        {recipe.description}
      </Typography>

      {/* Metadata chips */}
      <Stack direction="row" spacing={2} sx={{ mb: 3, flexWrap: "wrap", gap: 1 }}>
        <Chip icon={<TimerIcon />} label={`${recipe.total_time_minutes} min`} />
        <Chip
          icon={<PeopleIcon />}
          label={
            <Stack direction="row" alignItems="center" spacing={0.5} component="span">
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); setScaledServings(Math.max(1, scaledServings - 1)); }}
                sx={{ p: 0.25 }}
              >
                <RemoveIcon sx={{ fontSize: 16 }} />
              </IconButton>
              <span>{scaledServings} servings{scaleFactor !== 1 ? ` (${scaleFactor.toFixed(1)}x)` : ""}</span>
              <IconButton
                size="small"
                onClick={(e) => { e.stopPropagation(); setScaledServings(scaledServings + 1); }}
                sx={{ p: 0.25 }}
              >
                <AddIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Stack>
          }
        />
        <Chip label={recipe.difficulty} variant="outlined" />
        <Chip label={recipe.cuisine} variant="outlined" />
        {recipe.dietary_tags.map((tag) => (
          <Chip key={tag} label={tag} color="success" size="small" />
        ))}
      </Stack>

      {/* Nutrition panel */}
      {recipe.nutrition_info && (
        <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
          <Typography variant="subtitle2" gutterBottom>
            Nutrition (per serving{scaleFactor !== 1 ? ` — scaled ${scaleFactor.toFixed(1)}x` : ""})
          </Typography>
          <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
            <Box>
              <Typography variant="h6">{recipe.nutrition_info.calories}</Typography>
              <Typography variant="caption" color="text.secondary">Calories</Typography>
            </Box>
            <Box>
              <Typography variant="h6">{recipe.nutrition_info.protein_grams}g</Typography>
              <Typography variant="caption" color="text.secondary">Protein</Typography>
            </Box>
            <Box>
              <Typography variant="h6">{recipe.nutrition_info.fat_grams}g</Typography>
              <Typography variant="caption" color="text.secondary">Fat</Typography>
            </Box>
            <Box>
              <Typography variant="h6">{recipe.nutrition_info.carbohydrates_grams}g</Typography>
              <Typography variant="caption" color="text.secondary">Carbs</Typography>
            </Box>
          </Stack>
          {scaleFactor !== 1 && (
            <>
              <Divider sx={{ my: 1 }} />
              <Typography variant="subtitle2" gutterBottom>
                Total for {scaledServings} servings
              </Typography>
              <Stack direction="row" spacing={3} flexWrap="wrap" useFlexGap>
                <Box>
                  <Typography variant="h6">{Math.round(recipe.nutrition_info.calories * scaleFactor)}</Typography>
                  <Typography variant="caption" color="text.secondary">Calories</Typography>
                </Box>
                <Box>
                  <Typography variant="h6">{Math.round(recipe.nutrition_info.protein_grams * scaleFactor)}g</Typography>
                  <Typography variant="caption" color="text.secondary">Protein</Typography>
                </Box>
                <Box>
                  <Typography variant="h6">{Math.round(recipe.nutrition_info.fat_grams * scaleFactor)}g</Typography>
                  <Typography variant="caption" color="text.secondary">Fat</Typography>
                </Box>
                <Box>
                  <Typography variant="h6">{Math.round(recipe.nutrition_info.carbohydrates_grams * scaleFactor)}g</Typography>
                  <Typography variant="caption" color="text.secondary">Carbs</Typography>
                </Box>
              </Stack>
            </>
          )}
        </Paper>
      )}

      {/* Ingredients as compact chips */}
      <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1 }}>
        Ingredients
      </Typography>
      <Stack direction="row" sx={{ flexWrap: "wrap", gap: 0.75, mb: 1 }}>
        {recipe.ingredients.map((ing, i) => {
          const have = hasEnoughInPantry(
            pantry,
            ing.food_item,
            ing.quantity.unit,
            ing.quantity.value
          );
          const qty = parseFloat((ing.quantity.value * scaleFactor).toFixed(2));
          return (
            <Chip
              key={i}
              size="small"
              icon={have ? <CheckCircleOutlineIcon /> : <CancelOutlinedIcon />}
              label={`${qty} ${ing.quantity.unit} ${ing.food_item}`}
              variant="outlined"
              color={have ? "success" : "error"}
              sx={{ fontSize: "0.75rem" }}
            />
          );
        })}
      </Stack>

      {/* Action buttons — stack vertically on mobile */}
      <Stack
        direction={{ xs: "column", sm: "row" }}
        spacing={2}
        sx={{ mt: 3, flexWrap: "wrap", gap: 1 }}
      >
        <Button
          variant="contained"
          startIcon={<MenuBookIcon />}
          onClick={() => onStartCookMode(recipe)}
        >
          Start Cook Mode
        </Button>
        <Button
          variant="outlined"
          onClick={() => onIMadeThis(recipe)}
        >
          I Made This
        </Button>
        <Button
          variant="outlined"
          startIcon={<ShoppingCartIcon />}
          onClick={() => onAddToShoppingList(recipe)}
        >
          Add Missing to Shopping List
        </Button>
        <Button
          variant="outlined"
          onClick={() => setModifyDialogOpen(true)}
        >
          Ask for Modifications
        </Button>
      </Stack>

      {/* Modification dialog */}
      <Dialog
        open={modifyDialogOpen}
        onClose={() => setModifyDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Ask for Recipe Modifications</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Describe how you'd like to modify "{recipe.title}":
          </Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: "wrap", gap: 1 }}>
            {MODIFICATION_SUGGESTIONS.map((suggestion) => (
              <Chip
                key={suggestion}
                label={suggestion}
                clickable
                variant="outlined"
                onClick={() => setModifyText(suggestion)}
              />
            ))}
          </Stack>
          <TextField
            fullWidth
            multiline
            rows={3}
            value={modifyText}
            onChange={(e) => setModifyText(e.target.value)}
            placeholder="e.g., Replace chicken with tofu, reduce sodium..."
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setModifyDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!modifyText.trim()}
            onClick={() => {
              onSnackbar(
                "AI recipe modification will be available once OpenAI integration is set up."
              );
              setModifyDialogOpen(false);
              setModifyText("");
            }}
          >
            Submit
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
