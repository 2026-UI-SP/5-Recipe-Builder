import React, { useMemo, useRef, useState } from "react";
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
  TextField,
  FormControlLabel,
  Checkbox,
  FormGroup,
  CircularProgress,
  Paper,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  IconButton,
  Divider,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  InputAdornment,
  Tooltip,
  Collapse,
  useMediaQuery,
  useTheme,
  alpha,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import TimerIcon from "@mui/icons-material/Timer";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import AddIcon from "@mui/icons-material/Add";
import CloseIcon from "@mui/icons-material/Close";
import SearchIcon from "@mui/icons-material/Search";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import DownloadIcon from "@mui/icons-material/Download";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import TodayIcon from "@mui/icons-material/Today";
import NavigateBeforeIcon from "@mui/icons-material/NavigateBefore";
import NavigateNextIcon from "@mui/icons-material/NavigateNext";
import { Recipe, FoodItem, MealPlan } from "../data/types";
import { generateMealPlan } from "../utils/openai";
import { findMissingIngredients } from "../utils/helpers";

const DAYS_OF_WEEK = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner"];

const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Low-Carb",
  "High-Protein",
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

  const [dialogOpen, setDialogOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  // Recipe picker state
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerDay, setPickerDay] = useState("");
  const [pickerMealType, setPickerMealType] = useState("");
  const [pickerSearch, setPickerSearch] = useState("");

  // Mobile swipeable day view — default to today
  const todayIndex = DAYS_OF_WEEK.indexOf(today);
  const [mobileDayIndex, setMobileDayIndex] = useState(todayIndex >= 0 ? todayIndex : 0);

  // Touch swipe for mobile day navigation
  const touchStartX = useRef<number | null>(null);
  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };
  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const MIN_SWIPE = 50;
    if (dx < -MIN_SWIPE) {
      setMobileDayIndex((i) => Math.min(6, i + 1));
    } else if (dx > MIN_SWIPE) {
      setMobileDayIndex((i) => Math.max(0, i - 1));
    }
    touchStartX.current = null;
  };

  // Form state
  const [days, setDays] = useState(7);
  const [mealTypes, setMealTypes] = useState<string[]>([
    "Breakfast",
    "Lunch",
    "Dinner",
  ]);
  const [dietary, setDietary] = useState<string[]>([]);
  const [cuisine, setCuisine] = useState("");
  const [usePantry, setUsePantry] = useState(true);
  const [servings, setServings] = useState(4);
  const [difficulty, setDifficulty] = useState("Any");
  const [maxCookTime, setMaxCookTime] = useState("");
  const [calorieTarget, setCalorieTarget] = useState("");
  const [includeIngredients, setIncludeIngredients] = useState("");
  const [excludeIngredients, setExcludeIngredients] = useState("");
  const [specialInstructions, setSpecialInstructions] = useState("");
  const [recipeSource, setRecipeSource] = useState<"new" | "existing" | "mix">("mix");

  const toggleMealType = (type: string) => {
    setMealTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const toggleDietary = (pref: string) => {
    setDietary((prev) =>
      prev.includes(pref) ? prev.filter((p) => p !== pref) : [...prev, pref]
    );
  };

  const handleGenerate = async () => {
    if (!apiKey) {
      onSnackbar("Please set your OpenAI API key first.");
      onOpenSettings();
      return;
    }
    if (mealTypes.length === 0) {
      onSnackbar("Select at least one meal type.");
      return;
    }
    if (recipeSource === "existing" && recipes.length === 0) {
      onSnackbar("No saved recipes to use. Try 'New only' or 'Mix' instead.");
      return;
    }

    setLoading(true);
    try {
      const result = await generateMealPlan(
        apiKey,
        {
          days,
          mealTypes,
          dietaryPreferences: dietary,
          cuisinePreference: cuisine,
          usePantryIngredients: usePantry,
          servings,
          difficulty,
          maxCookTimeMinutes: maxCookTime ? parseInt(maxCookTime, 10) : null,
          calorieTarget: calorieTarget ? parseInt(calorieTarget, 10) : null,
          includeIngredients,
          excludeIngredients,
          specialInstructions,
          recipeSource,
        },
        pantry,
        recipes
      );
      setRecipes((prev) => [...prev, ...result.recipes]);
      setMealPlan(result.mealPlan);
      setDialogOpen(false);
      onSnackbar(
        `Generated ${result.recipes.length} recipes for your meal plan!`
      );
    } catch (err: any) {
      onSnackbar(`Error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // --- Recipe actions used by meal slots ---

  const handleAddToShoppingList = (recipe: Recipe) => {
    const missing = findMissingIngredients(pantry, recipe);
    if (missing.length === 0) {
      onSnackbar("You have all the ingredients!");
      return;
    }
    setShoppingList((prev) => [...prev, ...missing]);
    onSnackbar(`Added ${missing.length} missing ingredient(s) to shopping list`);
  };

  const getRecipeById = (id: string) => recipes.find((r) => r.id === id);

  const openPicker = (day: string, mealType: string) => {
    setPickerDay(day);
    setPickerMealType(mealType);
    setPickerSearch("");
    setPickerOpen(true);
  };

  const assignRecipe = (recipe: Recipe) => {
    setMealPlan((prev) => ({
      ...prev,
      [pickerDay]: {
        ...(prev[pickerDay] || {}),
        [pickerMealType]: recipe.id,
      },
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

  const hasMealPlan = Object.keys(mealPlan).length > 0;

  // --- Add all to shopping list ---
  const handleAddAllToShoppingList = () => {
    const seen = new Set<string>();
    const allMissing: FoodItem[] = [];
    for (const dayMeals of Object.values(mealPlan)) {
      for (const recipeId of Object.values(dayMeals)) {
        const recipe = getRecipeById(recipeId);
        if (!recipe) continue;
        const missing = findMissingIngredients(pantry, recipe);
        for (const item of missing) {
          const key = `${item.food.toLowerCase()}-${item.quantity.unit}`;
          if (!seen.has(key)) {
            seen.add(key);
            allMissing.push(item);
          }
        }
      }
    }
    if (allMissing.length === 0) {
      onSnackbar("You have all the ingredients for your meal plan!");
      return;
    }
    setShoppingList((prev) => [...prev, ...allMissing]);
    onSnackbar(`Added ${allMissing.length} missing ingredient(s) to shopping list`);
  };

  // --- Nutrition summary ---
  const [showNutrition, setShowNutrition] = useState(false);
  const nutritionSummary = useMemo(() => {
    const daily: Record<string, { calories: number; protein: number; fat: number; carbs: number; count: number }> = {};
    for (const day of DAYS_OF_WEEK) {
      daily[day] = { calories: 0, protein: 0, fat: 0, carbs: 0, count: 0 };
      const dayMeals = mealPlan[day] || {};
      for (const recipeId of Object.values(dayMeals)) {
        const recipe = getRecipeById(recipeId);
        if (recipe?.nutrition_info) {
          daily[day].calories += recipe.nutrition_info.calories;
          daily[day].protein += recipe.nutrition_info.protein_grams;
          daily[day].fat += recipe.nutrition_info.fat_grams;
          daily[day].carbs += recipe.nutrition_info.carbohydrates_grams;
          daily[day].count += 1;
        }
      }
    }
    const activeDays = Object.values(daily).filter((d) => d.count > 0);
    const totals = activeDays.reduce(
      (acc, d) => ({
        calories: acc.calories + d.calories,
        protein: acc.protein + d.protein,
        fat: acc.fat + d.fat,
        carbs: acc.carbs + d.carbs,
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );
    const avg = activeDays.length > 0
      ? {
          calories: Math.round(totals.calories / activeDays.length),
          protein: Math.round(totals.protein / activeDays.length),
          fat: Math.round(totals.fat / activeDays.length),
          carbs: Math.round(totals.carbs / activeDays.length),
        }
      : { calories: 0, protein: 0, fat: 0, carbs: 0 };
    return { daily, totals, avg, activeDays: activeDays.length };
  }, [mealPlan, recipes]); // eslint-disable-line react-hooks/exhaustive-deps

  // --- Export meal plan ---
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
    if (nutritionSummary.activeDays > 0) {
      lines.push("WEEKLY TOTALS");
      lines.push(`  Calories: ${nutritionSummary.totals.calories}  |  Avg/day: ${nutritionSummary.avg.calories}`);
      lines.push(`  Protein: ${nutritionSummary.totals.protein}g  |  Fat: ${nutritionSummary.totals.fat}g  |  Carbs: ${nutritionSummary.totals.carbs}g`);
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

  // --- Drag and drop ---
  const [dragSource, setDragSource] = useState<{ day: string; mealType: string } | null>(null);

  const handleDragStart = (day: string, mealType: string) => {
    setDragSource({ day, mealType });
  };

  const handleDrop = (targetDay: string, targetMealType: string) => {
    if (!dragSource) return;
    if (dragSource.day === targetDay && dragSource.mealType === targetMealType) return;

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
    onSnackbar("Meal moved!");
  };

  // --- Shared meal slot renderer ---
  const renderMealSlot = (day: string, mealType: string) => {
    const dayMeals = mealPlan[day] || {};
    const recipeId = dayMeals[mealType];
    const recipe = recipeId ? getRecipeById(recipeId) : null;

    if (recipe) {
      return (
        <Box
          key={mealType}
          draggable
          onDragStart={() => handleDragStart(day, mealType)}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); handleDrop(day, mealType); }}
          onClick={() => onStartCookMode(recipe)}
          sx={{
            cursor: "pointer",
            p: 1.5,
            borderRadius: 2,
            bgcolor: (t) => alpha(t.palette.primary.main, 0.04),
            "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.08) },
            transition: "background-color 0.15s",
            border: dragSource?.day === day && dragSource?.mealType === mealType
              ? "2px solid"
              : "1px solid transparent",
            borderColor: dragSource?.day === day && dragSource?.mealType === mealType
              ? "primary.main"
              : "transparent",
          }}
        >
          <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
            <Stack direction="row" alignItems="center" spacing={0.5}>
              <DragIndicatorIcon sx={{ fontSize: 16, color: "text.disabled", cursor: "grab" }} />
              <Typography
                variant="caption"
                color="text.secondary"
                sx={{ textTransform: "uppercase", fontWeight: 600, letterSpacing: 0.5, fontSize: "0.65rem" }}
              >
                {mealType}
              </Typography>
            </Stack>
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); removeMeal(day, mealType); }}
              sx={{ mt: -0.5, mr: -0.5, p: 0.75 }}
            >
              <CloseIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
          <Typography variant="body2" sx={{ fontWeight: 500, mt: 0.25 }}>
            {recipe.title}
          </Typography>
          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.5 }}>
            <Chip
              icon={<TimerIcon />}
              label={`${recipe.total_time_minutes} min`}
              size="small"
              variant="outlined"
              sx={{ height: 24, fontSize: "0.7rem" }}
            />
            {recipe.nutrition_info && (
              <Chip
                label={`${recipe.nutrition_info.calories} cal`}
                size="small"
                variant="outlined"
                sx={{ height: 24, fontSize: "0.7rem" }}
              />
            )}
            <Box sx={{ flexGrow: 1 }} />
            <IconButton
              size="small"
              onClick={(e) => { e.stopPropagation(); handleAddToShoppingList(recipe); }}
              sx={{ p: 0.75 }}
            >
              <ShoppingCartIcon sx={{ fontSize: 18 }} />
            </IconButton>
          </Stack>
        </Box>
      );
    }

    // Empty slot
    return (
      <Box
        key={mealType}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => { e.preventDefault(); handleDrop(day, mealType); }}
        onClick={() => openPicker(day, mealType)}
        sx={{
          p: 1.5,
          borderRadius: 2,
          border: "1.5px dashed",
          borderColor: "divider",
          cursor: "pointer",
          "&:hover": { borderColor: "primary.main", bgcolor: "action.hover" },
          transition: "all 0.15s",
          display: "flex",
          alignItems: "center",
          gap: 1,
          minHeight: 44,
        }}
      >
        <AddIcon sx={{ fontSize: 18, color: "text.disabled" }} />
        <Typography variant="body2" color="text.disabled">
          {mealType}
        </Typography>
      </Box>
    );
  };

  // --- Mobile swipeable helpers ---
  const mobileDay = DAYS_OF_WEEK[mobileDayIndex];
  const isMobileToday = mobileDay === today;
  const mobileDayMeals = mealPlan[mobileDay] || {};
  const mobileMealCount = Object.keys(mobileDayMeals).length;

  return (
    <Box>
      {/* ===== MEAL PLAN HEADER ===== */}
      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Meal Plan
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Your weekly meal schedule
          </Typography>
        </Box>
        <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
          {hasMealPlan && (
            <>
              <Tooltip title="Add all missing ingredients to shopping list">
                <IconButton onClick={handleAddAllToShoppingList} color="primary" sx={{ p: 1 }}>
                  <ShoppingCartIcon />
                </IconButton>
              </Tooltip>
              <Tooltip title="Copy to clipboard">
                <IconButton onClick={handleCopyMealPlan} sx={{ p: 1 }}>
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Download as text">
                <IconButton onClick={handleDownloadMealPlan} sx={{ p: 1 }}>
                  <DownloadIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Clear meal plan">
                <IconButton
                  color="error"
                  onClick={() => { setMealPlan({}); onSnackbar("Meal plan cleared"); }}
                  sx={{ p: 1 }}
                >
                  <DeleteOutlineIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            </>
          )}
          <Button
            variant="contained"
            startIcon={<AutoAwesomeIcon />}
            onClick={() => setDialogOpen(true)}
            size={isMobile ? "small" : "medium"}
          >
            Generate
          </Button>
        </Stack>
      </Stack>

      {/* ===== MEAL PLAN: SWIPEABLE ON MOBILE, GRID ON DESKTOP ===== */}
      {isMobile ? (
        // Mobile: Swipeable day view — one day at a time
        <Box onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
          {/* Day navigation header */}
          <Stack
            direction="row"
            alignItems="center"
            justifyContent="space-between"
            sx={{ mb: 1.5 }}
          >
            <IconButton
              onClick={() => setMobileDayIndex((i) => Math.max(0, i - 1))}
              disabled={mobileDayIndex === 0}
              sx={{ p: 1 }}
            >
              <NavigateBeforeIcon />
            </IconButton>
            <Stack alignItems="center" spacing={0.25}>
              <Stack direction="row" alignItems="center" spacing={0.5}>
                {isMobileToday && <TodayIcon color="primary" sx={{ fontSize: 18 }} />}
                <Typography variant="h6" sx={{ fontWeight: isMobileToday ? 700 : 600 }}>
                  {mobileDay}
                </Typography>
                {isMobileToday && (
                  <Chip label="Today" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />
                )}
              </Stack>
              {mobileMealCount > 0 && (
                <Typography variant="caption" color="text.secondary">
                  {mobileMealCount} meal{mobileMealCount > 1 ? "s" : ""}
                </Typography>
              )}
            </Stack>
            <IconButton
              onClick={() => setMobileDayIndex((i) => Math.min(6, i + 1))}
              disabled={mobileDayIndex === 6}
              sx={{ p: 1 }}
            >
              <NavigateNextIcon />
            </IconButton>
          </Stack>

          {/* Dot indicators */}
          <Stack direction="row" justifyContent="center" spacing={0.5} sx={{ mb: 2 }}>
            {DAYS_OF_WEEK.map((day, i) => {
              const isActive = i === mobileDayIndex;
              const isDayToday = day === today;
              return (
                <Box
                  key={day}
                  onClick={() => setMobileDayIndex(i)}
                  sx={{
                    width: isActive ? 20 : 8,
                    height: 8,
                    borderRadius: 4,
                    bgcolor: isActive
                      ? "primary.main"
                      : isDayToday
                        ? (t) => alpha(t.palette.primary.main, 0.3)
                        : "action.disabled",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                />
              );
            })}
          </Stack>

          {/* Day content */}
          <Card
            sx={{
              borderTop: 3,
              borderColor: isMobileToday ? "primary.main" : "divider",
              bgcolor: isMobileToday ? (t) => alpha(t.palette.primary.main, 0.03) : undefined,
            }}
          >
            <CardContent>
              <Stack spacing={1}>
                {MEAL_TYPES.map((mealType) => renderMealSlot(mobileDay, mealType))}
              </Stack>
            </CardContent>
          </Card>
        </Box>
      ) : (
        // Desktop: Grid view
        <Grid container spacing={2}>
          {DAYS_OF_WEEK.map((day) => {
            const isToday = day === today;
            return (
              <Grid size={{ xs: 12, sm: 6, md: 4 }} key={day}>
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
                      <Typography variant="h6" sx={{ fontWeight: isToday ? 700 : 600 }}>
                        {day}
                      </Typography>
                      {isToday && (
                        <Chip label="Today" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: "0.65rem" }} />
                      )}
                    </Stack>
                    <Stack spacing={1}>
                      {MEAL_TYPES.map((mealType) => renderMealSlot(day, mealType))}
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      )}

      {/* ===== NUTRITION SUMMARY ===== */}
      {hasMealPlan && nutritionSummary.activeDays > 0 && (
        <Paper variant="outlined" sx={{ mt: 3, borderRadius: 3, overflow: "hidden" }}>
          <Stack
            direction="row"
            justifyContent="space-between"
            alignItems="center"
            onClick={() => setShowNutrition(!showNutrition)}
            sx={{ cursor: "pointer", p: 2 }}
          >
            <Stack direction="row" alignItems="center" spacing={1}>
              <LocalFireDepartmentIcon color="primary" />
              <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                Weekly Nutrition
              </Typography>
              {!showNutrition && (
                <>
                  <Chip
                    label={`${nutritionSummary.totals.calories} cal`}
                    size="small"
                    color="primary"
                    variant="outlined"
                  />
                  <Chip
                    label={`~${nutritionSummary.avg.calories}/day`}
                    size="small"
                    variant="outlined"
                    sx={{ display: { xs: "none", sm: "flex" } }}
                  />
                </>
              )}
            </Stack>
            {showNutrition ? <ExpandLessIcon /> : <ExpandMoreIcon />}
          </Stack>
          <Collapse in={showNutrition}>
            <Box sx={{ px: 2, pb: 2 }}>
              <Grid container spacing={1}>
                {DAYS_OF_WEEK.map((day) => {
                  const d = nutritionSummary.daily[day];
                  if (d.count === 0) return null;
                  const isToday = day === today;
                  return (
                    <Grid size={{ xs: 6, sm: 4, md: 3 }} key={day}>
                      <Paper
                        variant="outlined"
                        sx={{
                          p: 1.5,
                          textAlign: "center",
                          borderRadius: 2,
                          border: isToday ? 2 : 1,
                          borderColor: isToday ? "primary.main" : "divider",
                        }}
                      >
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>
                          {isMobile ? day.slice(0, 3) : day}
                        </Typography>
                        <Typography variant="h6">{d.calories}</Typography>
                        <Typography variant="caption" color="text.secondary">cal</Typography>
                        <Stack direction="row" justifyContent="center" spacing={0.5} sx={{ mt: 0.5 }}>
                          <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>P:{d.protein}g</Typography>
                          <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>F:{d.fat}g</Typography>
                          <Typography variant="caption" sx={{ fontSize: "0.65rem" }}>C:{d.carbs}g</Typography>
                        </Stack>
                      </Paper>
                    </Grid>
                  );
                })}
              </Grid>
              <Divider sx={{ my: 1.5 }} />
              <Stack
                direction={{ xs: "column", sm: "row" }}
                spacing={2}
                justifyContent="center"
                alignItems="center"
              >
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Avg/Day</Typography>
                  <Typography variant="body2">
                    {nutritionSummary.avg.calories} cal · {nutritionSummary.avg.protein}g P · {nutritionSummary.avg.fat}g F · {nutritionSummary.avg.carbs}g C
                  </Typography>
                </Box>
                <Box sx={{ textAlign: "center" }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>Week Total</Typography>
                  <Typography variant="body2">
                    {nutritionSummary.totals.calories} cal · {nutritionSummary.totals.protein}g P · {nutritionSummary.totals.fat}g F · {nutritionSummary.totals.carbs}g C
                  </Typography>
                </Box>
              </Stack>
            </Box>
          </Collapse>
        </Paper>
      )}

      {/* ===== GENERATION DIALOG (bottom sheet on mobile) ===== */}
      <Dialog
        open={dialogOpen}
        onClose={() => !loading && setDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          Generate Meal Plan
        </DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 1 }}>
            {/* --- Schedule --- */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: -1 }}>
              Schedule
            </Typography>

            <Stack direction="row" spacing={2}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Days</InputLabel>
                <Select
                  value={days}
                  label="Days"
                  onChange={(e) => setDays(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                    <MenuItem key={n} value={n}>
                      {n} day{n > 1 ? "s" : ""}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Servings</InputLabel>
                <Select
                  value={servings}
                  label="Servings"
                  onChange={(e) => setServings(Number(e.target.value))}
                >
                  {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                    <MenuItem key={n} value={n}>
                      {n}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Meals per day
              </Typography>
              <FormGroup row>
                {MEAL_TYPES.map((type) => (
                  <FormControlLabel
                    key={type}
                    control={
                      <Checkbox
                        checked={mealTypes.includes(type)}
                        onChange={() => toggleMealType(type)}
                      />
                    }
                    label={type}
                  />
                ))}
              </FormGroup>
            </Box>

            {/* --- Dietary --- */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: -1 }}>
              Dietary
            </Typography>

            <Box>
              <Typography variant="subtitle2" sx={{ mb: 1 }}>
                Restrictions
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {DIETARY_OPTIONS.map((option) => (
                  <Chip
                    key={option}
                    label={option}
                    clickable
                    color={dietary.includes(option) ? "primary" : "default"}
                    variant={dietary.includes(option) ? "filled" : "outlined"}
                    onClick={() => toggleDietary(option)}
                  />
                ))}
              </Stack>
            </Box>

            <TextField
              label="Calorie target per serving (optional)"
              size="small"
              type="number"
              fullWidth
              value={calorieTarget}
              onChange={(e) => setCalorieTarget(e.target.value)}
              placeholder="e.g., 500"
              inputProps={{ min: 0 }}
            />

            {/* --- Preferences --- */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: -1 }}>
              Preferences
            </Typography>

            <FormControl size="small" fullWidth>
              <InputLabel>Recipe Source</InputLabel>
              <Select
                value={recipeSource}
                label="Recipe Source"
                onChange={(e) => setRecipeSource(e.target.value as "new" | "existing" | "mix")}
              >
                <MenuItem value="mix">Mix — reuse saved + create new</MenuItem>
                <MenuItem value="existing">Existing only — use saved recipes</MenuItem>
                <MenuItem value="new">New only — create all new</MenuItem>
              </Select>
            </FormControl>

            <Stack direction="row" spacing={2}>
              <TextField
                label="Cuisine (optional)"
                size="small"
                fullWidth
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                placeholder="e.g., Italian, Mexican..."
              />
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <InputLabel>Difficulty</InputLabel>
                <Select
                  value={difficulty}
                  label="Difficulty"
                  onChange={(e) => setDifficulty(e.target.value)}
                >
                  {["Any", "Easy", "Medium", "Hard"].map((d) => (
                    <MenuItem key={d} value={d}>{d}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Stack>

            <TextField
              label="Max cook time per recipe (minutes)"
              size="small"
              type="number"
              fullWidth
              value={maxCookTime}
              onChange={(e) => setMaxCookTime(e.target.value)}
              placeholder="e.g., 30"
              inputProps={{ min: 0 }}
            />

            {/* --- Ingredients --- */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: -1 }}>
              Ingredients
            </Typography>

            <FormControlLabel
              control={
                <Checkbox
                  checked={usePantry}
                  onChange={(e) => setUsePantry(e.target.checked)}
                />
              }
              label={`Prioritize pantry ingredients (${pantry.length} items)`}
            />

            <TextField
              label="Must include (optional)"
              size="small"
              fullWidth
              value={includeIngredients}
              onChange={(e) => setIncludeIngredients(e.target.value)}
              placeholder="e.g., chicken, rice, broccoli"
            />

            <TextField
              label="Never use (optional)"
              size="small"
              fullWidth
              value={excludeIngredients}
              onChange={(e) => setExcludeIngredients(e.target.value)}
              placeholder="e.g., peanuts, shellfish, cilantro"
            />

            {/* --- Special instructions --- */}
            <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: -1 }}>
              Special Instructions
            </Typography>

            <TextField
              multiline
              rows={3}
              fullWidth
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              placeholder="e.g., meal-prep friendly weekdays, comfort food weekends, no raw fish..."
            />
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDialogOpen(false)} disabled={loading}>
            Cancel
          </Button>
          <Button
            variant="contained"
            onClick={handleGenerate}
            disabled={loading || mealTypes.length === 0}
            startIcon={
              loading ? <CircularProgress size={18} /> : <AutoAwesomeIcon />
            }
          >
            {loading ? "Generating..." : "Generate"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* ===== RECIPE PICKER DIALOG ===== */}
      <Dialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {pickerDay} — {pickerMealType}
        </DialogTitle>
        <DialogContent>
          <TextField
            size="small"
            fullWidth
            placeholder="Search recipes..."
            value={pickerSearch}
            onChange={(e) => setPickerSearch(e.target.value)}
            sx={{ mb: 1, mt: 1 }}
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
          {recipes.length === 0 ? (
            <Paper sx={{ p: 4, textAlign: "center" }}>
              <Typography variant="body2" color="text.secondary">
                No recipes available. Generate some first!
              </Typography>
            </Paper>
          ) : (
            <List dense sx={{ maxHeight: 350, overflow: "auto" }}>
              {recipes
                .filter((r) =>
                  r.title.toLowerCase().includes(pickerSearch.toLowerCase())
                )
                .map((recipe) => (
                  <ListItem key={recipe.id} disablePadding>
                    <ListItemButton
                      onClick={() => assignRecipe(recipe)}
                      sx={{ borderRadius: 2, mb: 0.5 }}
                    >
                      <ListItemText
                        primary={recipe.title}
                        secondary={`${recipe.cuisine} · ${recipe.total_time_minutes} min${recipe.nutrition_info ? ` · ${recipe.nutrition_info.calories} cal` : ""}`}
                      />
                    </ListItemButton>
                  </ListItem>
                ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPickerOpen(false)}>Cancel</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
