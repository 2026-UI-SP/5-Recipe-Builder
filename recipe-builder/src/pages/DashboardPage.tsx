import React, { useCallback, useEffect, useState } from "react";
import {
  Typography,
  Box,
  Button,
  Card,
  CardContent,
  Grid,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  alpha,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import TodayIcon from "@mui/icons-material/Today";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Recipe, FoodItem, MealPlan } from "../data/types";
import { generateMealPlan } from "../utils/openai";
import { buildShoppingListFromMealPlan } from "../utils/helpers";
import MealSlot from "../components/MealSlot";
import NutritionSummary from "../components/NutritionSummary";
import RecipePickerDialog from "../components/RecipePickerDialog";
import MealPlanFormDialog, { MealPlanFormState } from "../components/MealPlanFormDialog";
import useMobileSwipe from "../hooks/useMobileSwipe";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner"];

const LOADING_MESSAGES = [
  "Planning your meals...",
  "Picking recipes...",
  "Balancing nutrition...",
  "Checking your pantry...",
  "Creating your meal plan...",
];

function getTodayName(): string {
  return new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());
}

interface DashboardPageProps {
  mealPlan: MealPlan;
  setMealPlan: React.Dispatch<React.SetStateAction<MealPlan>>;
  recipes: Recipe[];
  setRecipes: React.Dispatch<React.SetStateAction<Recipe[]>>;
  pantry: FoodItem[];
  setPantry: React.Dispatch<React.SetStateAction<FoodItem[]>>;
  setShoppingList: React.Dispatch<React.SetStateAction<FoodItem[]>>;
  apiKey: string;
  onStartCookMode: (recipe: Recipe) => void;
  onOpenSettings: () => void;
  onSnackbar: (message: string) => void;
}

export default function DashboardPage({
  mealPlan,
  setMealPlan,
  recipes,
  setRecipes,
  pantry,
  setPantry,
  setShoppingList,
  apiKey,
  onStartCookMode,
  onOpenSettings,
  onSnackbar,
}: DashboardPageProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const today = getTodayName();

  // --- Dialog states ---
  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);

  // --- Recipe picker ---
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDay, setPickerDay] = useState("");
  const [pickerMealType, setPickerMealType] = useState("");

  // --- Mobile day navigation ---
  const todayIndex = DAYS_OF_WEEK.indexOf(today);
  const [mobileDayIndex, setMobileDayIndex] = useState(todayIndex >= 0 ? todayIndex : 0);
  const mobileDay = DAYS_OF_WEEK[mobileDayIndex];
  const isMobileToday = mobileDay === today;

  const swipeHandlers = useMobileSwipe(
    useCallback(() => setMobileDayIndex((i) => (i + 1) % 7), []),
    useCallback(() => setMobileDayIndex((i) => (i + 6) % 7), [])
  );

  // --- Drag and drop ---
  const [dragSource, setDragSource] = useState<{ day: string; mealType: string } | null>(null);

  // --- Form state ---
  const [form, setForm] = useState<MealPlanFormState>({
    days: 7,
    mealTypes: ["Breakfast", "Lunch", "Dinner"],
    dietary: [],
    cuisine: "",
    usePantry: true,
    servings: 4,
    difficulty: "Any",
    maxCookTime: "",
    calorieTarget: "",
    includeIngredients: "",
    excludeIngredients: "",
    specialInstructions: "",
    recipeSource: "mix",
    budget: "Any",
  });

  // --- Loading messages ---
  useEffect(() => {
    if (!loading) return;
    setLoadingMessage(LOADING_MESSAGES[0]);
    let i = 1;
    const interval = setInterval(() => {
      setLoadingMessage(LOADING_MESSAGES[i % LOADING_MESSAGES.length]);
      i++;
    }, 3000);
    return () => clearInterval(interval);
  }, [loading]);

  // --- Helpers ---
  const getRecipeById = useCallback(
    (id: string) => recipes.find((r) => r.id === id),
    [recipes]
  );
  const hasMealPlan = Object.keys(mealPlan).length > 0;

  // --- Generation ---
  const startGenerate = () => {
    if (!apiKey) {
      onSnackbar("Please set your OpenAI API key first.");
      onOpenSettings();
      return;
    }
    if (form.mealTypes.length === 0) {
      onSnackbar("Select at least one meal type.");
      return;
    }
    if (form.recipeSource === "existing" && recipes.length === 0) {
      onSnackbar("No saved recipes to use. Try 'New only' or 'Mix' instead.");
      return;
    }
    if (hasMealPlan) {
      setConfirmOpen(true);
      return;
    }
    handleGenerate();
  };

  const handleGenerate = async () => {
    setConfirmOpen(false);
    setLoading(true);
    try {
      const result = await generateMealPlan(
        apiKey,
        {
          days: form.days,
          mealTypes: form.mealTypes,
          dietaryPreferences: form.dietary,
          cuisinePreference: form.cuisine,
          usePantryIngredients: form.usePantry,
          servings: form.servings,
          difficulty: form.difficulty,
          maxCookTimeMinutes: form.maxCookTime ? parseInt(form.maxCookTime, 10) : null,
          calorieTarget: form.calorieTarget ? parseInt(form.calorieTarget, 10) : null,
          includeIngredients: form.includeIngredients,
          excludeIngredients: form.excludeIngredients,
          specialInstructions: form.specialInstructions,
          recipeSource: form.recipeSource,
          budget: form.budget,
        },
        pantry,
        recipes,
        setLoadingMessage
      );
      setRecipes((prev) => [...prev, ...result.recipes]);
      setMealPlan(result.mealPlan);
      setShoppingList([]);
      setDialogOpen(false);
      onSnackbar("Meal plan ready! Shopping list cleared for the new plan.");
    } catch (err: any) {
      onSnackbar(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Recipe picker ---
  const openPicker = (day: string, mealType: string) => {
    setPickerDay(day);
    setPickerMealType(mealType);
    setPickerOpen(true);
  };

  const assignRecipe = (recipe: Recipe) => {
    setMealPlan((prev) => ({
      ...prev,
      [pickerDay]: { ...(prev[pickerDay] || {}), [pickerMealType]: recipe.id },
    }));
    setPickerOpen(false);
    onSnackbar(`${recipe.title} → ${pickerDay} ${pickerMealType}`);
  };

  const removeMeal = (day: string, mealType: string) => {
    setMealPlan((prev) => {
      const dayPlan = { ...(prev[day] || {}) };
      delete dayPlan[mealType];
      const updated = { ...prev };
      if (Object.keys(dayPlan).length === 0) {
        delete updated[day];
      } else {
        updated[day] = dayPlan;
      }
      return updated;
    });
  };

  // --- Drag & drop ---
  const handleDrop = (targetDay: string, targetMealType: string) => {
    if (!dragSource) return;
    if (dragSource.day === targetDay && dragSource.mealType === targetMealType) return;

    const isSwap = !!mealPlan[targetDay]?.[targetMealType];
    setMealPlan((prev) => {
      const updated = { ...prev };
      const sourceRecipeId = prev[dragSource.day]?.[dragSource.mealType];
      const targetRecipeId = prev[targetDay]?.[targetMealType];

      if (targetRecipeId) {
        updated[dragSource.day] = { ...(updated[dragSource.day] || {}), [dragSource.mealType]: targetRecipeId };
      } else {
        const sourceDayPlan = { ...(updated[dragSource.day] || {}) };
        delete sourceDayPlan[dragSource.mealType];
        if (Object.keys(sourceDayPlan).length === 0) {
          delete updated[dragSource.day];
        } else {
          updated[dragSource.day] = sourceDayPlan;
        }
      }

      if (sourceRecipeId) {
        updated[targetDay] = { ...(updated[targetDay] || {}), [targetMealType]: sourceRecipeId };
      }
      return updated;
    });
    setDragSource(null);
    onSnackbar(isSwap ? "Meals swapped!" : "Meal moved!");
  };

  // --- Shopping list ---
  const handleAddAllToShoppingList = () => {
    const allMissing = buildShoppingListFromMealPlan(mealPlan, getRecipeById, pantry);
    if (allMissing.length === 0) {
      onSnackbar("You have all the ingredients for your meal plan!");
      return;
    }
    setShoppingList((prev) => [...prev, ...allMissing]);
    onSnackbar(`Added ${allMissing.length} missing ingredient(s) to shopping list`);
  };

  // --- Export ---
  const exportMealPlanText = () => {
    const lines: string[] = ["MEAL PLAN", "=========", ""];
    for (const day of DAYS_OF_WEEK) {
      const dayMeals = mealPlan[day];
      if (!dayMeals || Object.keys(dayMeals).length === 0) continue;
      lines.push(day.toUpperCase());
      for (const mealType of MEAL_TYPES) {
        const recipeId = dayMeals[mealType];
        if (!recipeId) continue;
        const recipe = getRecipeById(recipeId);
        if (recipe) {
          const info = recipe.nutrition_info ? ` (${recipe.nutrition_info.calories} cal)` : "";
          lines.push(`  ${mealType}: ${recipe.title} — ${recipe.total_time_minutes} min${info}`);
        }
      }
      lines.push("");
    }
    return lines.join("\n");
  };

  const handleCopyMealPlan = async () => {
    try {
      await navigator.clipboard.writeText(exportMealPlanText());
      onSnackbar("Meal plan copied to clipboard!");
    } catch {
      onSnackbar("Failed to copy — try the download option instead.");
    }
  };

  const handleDownloadMealPlan = () => {
    const blob = new Blob([exportMealPlanText()], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "meal-plan.txt";
    a.click();
    URL.revokeObjectURL(url);
    onSnackbar("Meal plan downloaded!");
  };

  // --- Render helpers ---
  const renderDay = (day: string) => {
    const isToday = day === today;
    return (
      <Card
        sx={{
          height: "100%",
          borderTop: 3,
          borderColor: isToday ? "primary.main" : "divider",
          bgcolor: isToday ? (t) => alpha(t.palette.primary.main, 0.03) : undefined,
          position: "relative",
        }}
      >
        <CardContent>
          <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1.5 }}>
            {isToday && <TodayIcon color="primary" sx={{ fontSize: 18 }} />}
            <Typography variant="h6" sx={{ fontWeight: isToday ? 700 : 600 }}>{day}</Typography>
            {isToday && <Chip label="Today" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />}
          </Stack>
          <Stack spacing={1}>
            {MEAL_TYPES.map((mealType) => (
              <MealSlot
                key={mealType}
                day={day}
                mealType={mealType}
                recipe={mealPlan[day]?.[mealType] ? getRecipeById(mealPlan[day][mealType]) || null : null}
                isDragging={dragSource?.day === day && dragSource?.mealType === mealType}
                onRemove={removeMeal}
                onOpenPicker={openPicker}
                onStartCookMode={onStartCookMode}
                onDragStart={(d, m) => setDragSource({ day: d, mealType: m })}
                onDrop={handleDrop}
              />
            ))}
          </Stack>
        </CardContent>
      </Card>
    );
  };

  return (
    <Box>
      {/* Action buttons */}
      <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1 }}>
        <Button variant="contained" startIcon={<AutoAwesomeIcon />} onClick={() => setDialogOpen(true)} size="small" sx={{ whiteSpace: "nowrap" }}>
          Generate
        </Button>
        <Box sx={{ flexGrow: 1 }} />
        {hasMealPlan && (
          <>
            <Tooltip title="Add all to shopping list">
              <IconButton size="small" onClick={handleAddAllToShoppingList} aria-label="Add all to shopping list">
                <ShoppingCartIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Copy meal plan">
              <IconButton size="small" onClick={handleCopyMealPlan} aria-label="Copy meal plan">
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Export meal plan">
              <IconButton size="small" onClick={handleDownloadMealPlan} aria-label="Download meal plan">
                <DownloadIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Clear meal plan">
              <IconButton size="small" color="error" onClick={() => { setMealPlan({}); onSnackbar("Meal plan cleared"); }} aria-label="Clear meal plan">
                <DeleteOutlineIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </>
        )}
      </Stack>

      {/* Meal plan display */}
      {isMobile ? (
        <Box onTouchStart={swipeHandlers.handleTouchStart} onTouchEnd={swipeHandlers.handleTouchEnd}>
          {/* Day navigation */}
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.75 }}>
            <IconButton onClick={() => setMobileDayIndex((i) => Math.max(0, i - 1))} disabled={mobileDayIndex === 0} aria-label="Previous day" sx={{ p: 1 }}>
              <NavigateBeforeIcon />
            </IconButton>
            <Stack direction="row" alignItems="center" spacing={0.5}>
              {isMobileToday && <TodayIcon color="primary" sx={{ fontSize: 16 }} />}
              <Typography variant="subtitle1" sx={{ fontWeight: isMobileToday ? 700 : 600 }}>{mobileDay}</Typography>
              {isMobileToday && <Chip label="Today" size="small" color="primary" variant="outlined" sx={{ height: 18, fontSize: "0.6rem" }} />}
            </Stack>
            <IconButton onClick={() => setMobileDayIndex((i) => Math.min(6, i + 1))} disabled={mobileDayIndex === 6} aria-label="Next day" sx={{ p: 1 }}>
              <NavigateNextIcon />
            </IconButton>
          </Stack>

          {/* Dot indicators */}
          <Stack direction="row" justifyContent="center" spacing={0.5} sx={{ mb: 1 }}>
            {DAYS_OF_WEEK.map((day, i) => (
              <Box
                key={day}
                onClick={() => setMobileDayIndex(i)}
                sx={{
                  width: i === mobileDayIndex ? 20 : 8,
                  height: 8,
                  borderRadius: 4,
                  bgcolor: i === mobileDayIndex
                    ? "primary.main"
                    : day === today
                      ? (t) => alpha(t.palette.primary.main, 0.3)
                      : "action.disabled",
                  cursor: "pointer",
                  transition: "all 0.2s",
                }}
              />
            ))}
          </Stack>

          {/* Day card */}
          <Card
            sx={{
              borderTop: 2,
              borderColor: isMobileToday ? "primary.main" : "divider",
              bgcolor: isMobileToday ? (t) => alpha(t.palette.primary.main, 0.03) : undefined,
            }}
          >
            <CardContent sx={{ p: 1.5, "&:last-child": { pb: 1.5 } }}>
              <Stack spacing={1}>
                {MEAL_TYPES.map((mealType) => (
                  <MealSlot
                    key={mealType}
                    day={mobileDay}
                    mealType={mealType}
                    recipe={mealPlan[mobileDay]?.[mealType] ? getRecipeById(mealPlan[mobileDay][mealType]) || null : null}
                    isDragging={dragSource?.day === mobileDay && dragSource?.mealType === mealType}
                    onRemove={removeMeal}
                    onOpenPicker={openPicker}
                    onStartCookMode={onStartCookMode}
                    onDragStart={(d, m) => setDragSource({ day: d, mealType: m })}
                    onDrop={handleDrop}
                  />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {DAYS_OF_WEEK.map((day) => (
            <Grid size={{ xs: 12, sm: 6, md: 4 }} key={day}>
              {renderDay(day)}
            </Grid>
          ))}
        </Grid>
      )}

      {/* Nutrition summary */}
      {hasMealPlan && (
        <NutritionSummary mealPlan={mealPlan} getRecipeById={getRecipeById} isMobile={isMobile} />
      )}

      {/* Generation dialog */}
      <MealPlanFormDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        loading={loading}
        loadingMessage={loadingMessage}
        form={form}
        setForm={setForm}
        pantryCount={pantry.length}
        onGenerate={startGenerate}
      />

      {/* Confirm overwrite dialog */}
      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)} maxWidth="xs">
        <DialogTitle>Replace current meal plan?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary">
            This will replace your current meal plan and clear your shopping list. Any manual changes you've made will be lost.
          </Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleGenerate}>Replace</Button>
        </DialogActions>
      </Dialog>

      {/* Recipe picker */}
      <RecipePickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        day={pickerDay}
        mealType={pickerMealType}
        recipes={recipes}
        onSelect={assignRecipe}
      />
    </Box>
  );
}
