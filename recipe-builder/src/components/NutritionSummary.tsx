import React, { useMemo, useState } from "react";
import {
  Typography,
  Box,
  Chip,
  Stack,
  Paper,
  Grid,
  Divider,
  Collapse,
} from "@mui/material";
import LocalFireDepartmentIcon from "@mui/icons-material/LocalFireDepartment";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ExpandLessIcon from "@mui/icons-material/ExpandLess";
import { Recipe, MealPlan } from "../data/types";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

interface NutritionSummaryProps {
  mealPlan: MealPlan;
  getRecipeById: (id: string) => Recipe | undefined;
  isMobile: boolean;
}

export default function NutritionSummary({ mealPlan, getRecipeById, isMobile }: NutritionSummaryProps) {
  const [showNutrition, setShowNutrition] = useState(false);
  const today = new Intl.DateTimeFormat("en-US", { weekday: "long" }).format(new Date());

  const { daily, totals, avg, activeDays } = useMemo(() => {
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
    const active = Object.values(daily).filter((d) => d.count > 0);
    const totals = active.reduce(
      (acc, d) => ({
        calories: acc.calories + d.calories,
        protein: acc.protein + d.protein,
        fat: acc.fat + d.fat,
        carbs: acc.carbs + d.carbs,
      }),
      { calories: 0, protein: 0, fat: 0, carbs: 0 }
    );
    const avg = active.length > 0
      ? {
        calories: Math.round(totals.calories / active.length),
        protein: Math.round(totals.protein / active.length),
        fat: Math.round(totals.fat / active.length),
        carbs: Math.round(totals.carbs / active.length),
      }
      : { calories: 0, protein: 0, fat: 0, carbs: 0 };
    return { daily, totals, avg, activeDays: active.length };
  }, [mealPlan, getRecipeById]);

  if (activeDays === 0) return null;

  return (
    <Paper variant="outlined" sx={{ mt: 1.5, borderRadius: 2, overflow: "hidden" }}>
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
              <Chip label={`${totals.calories} cal`} size="small" color="primary" variant="outlined" />
              <Chip
                label={`~${avg.calories}/day`}
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
              const d = daily[day];
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
                {avg.calories} cal · {avg.protein}g P · {avg.fat}g F · {avg.carbs}g C
              </Typography>
            </Box>
            <Box sx={{ textAlign: "center" }}>
              <Typography variant="body2" sx={{ fontWeight: 600 }}>Week Total</Typography>
              <Typography variant="body2">
                {totals.calories} cal · {totals.protein}g P · {totals.fat}g F · {totals.carbs}g C
              </Typography>
            </Box>
          </Stack>
        </Box>
      </Collapse>
    </Paper>
  );
}
