import React from "react";
import {
  Typography,
  Box,
  Button,
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
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";

const MEAL_TYPES = ["Breakfast", "Lunch", "Dinner"];
const DIETARY_OPTIONS = [
  "Vegetarian",
  "Vegan",
  "Gluten-Free",
  "Dairy-Free",
  "Low-Carb",
  "High-Protein",
];

export interface MealPlanFormState {
  days: number;
  mealTypes: string[];
  dietary: string[];
  cuisine: string;
  usePantry: boolean;
  servings: number;
  difficulty: string;
  maxCookTime: string;
  calorieTarget: string;
  includeIngredients: string;
  excludeIngredients: string;
  specialInstructions: string;
  recipeSource: "new" | "existing" | "mix";
  budget: string;
}

interface MealPlanFormDialogProps {
  open: boolean;
  onClose: () => void;
  loading: boolean;
  loadingMessage: string;
  form: MealPlanFormState;
  setForm: React.Dispatch<React.SetStateAction<MealPlanFormState>>;
  pantryCount: number;
  onGenerate: () => void;
}

export default function MealPlanFormDialog({
  open,
  onClose,
  loading,
  loadingMessage,
  form,
  setForm,
  pantryCount,
  onGenerate,
}: MealPlanFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const update = <K extends keyof MealPlanFormState>(key: K, value: MealPlanFormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleMealType = (type: string) => {
    setForm((prev) => ({
      ...prev,
      mealTypes: prev.mealTypes.includes(type)
        ? prev.mealTypes.filter((t) => t !== type)
        : [...prev.mealTypes, type],
    }));
  };

  const toggleDietary = (pref: string) => {
    setForm((prev) => ({
      ...prev,
      dietary: prev.dietary.includes(pref)
        ? prev.dietary.filter((p) => p !== pref)
        : [...prev.dietary, pref],
    }));
  };

  return (
    <Dialog
      open={open}
      onClose={() => !loading && onClose()}
      maxWidth="sm"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        Generate Meal Plan
        {isMobile && !loading && (
          <IconButton onClick={onClose} edge="end" aria-label="Close">
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      {loading ? (
        <DialogContent>
          <Box sx={{ py: 8, textAlign: "center" }}>
            <CircularProgress size={48} sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {loadingMessage}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              This may take up to a minute for a full week
            </Typography>
          </Box>
        </DialogContent>
      ) : (
        <>
          <DialogContent>
            <Stack spacing={3} sx={{ mt: 1 }}>
              {/* Schedule */}
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: -1 }}>
                Schedule
              </Typography>

              <Stack direction="row" spacing={2}>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Days</InputLabel>
                  <Select value={form.days} label="Days" onChange={(e) => update("days", Number(e.target.value))}>
                    {[1, 2, 3, 4, 5, 6, 7].map((n) => (
                      <MenuItem key={n} value={n}>{n} day{n > 1 ? "s" : ""}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Servings</InputLabel>
                  <Select value={form.servings} label="Servings" onChange={(e) => update("servings", Number(e.target.value))}>
                    {[1, 2, 3, 4, 5, 6, 8, 10].map((n) => (
                      <MenuItem key={n} value={n}>{n}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Meals per day</Typography>
                <FormGroup row>
                  {MEAL_TYPES.map((type) => (
                    <FormControlLabel
                      key={type}
                      control={<Checkbox checked={form.mealTypes.includes(type)} onChange={() => toggleMealType(type)} />}
                      label={type}
                    />
                  ))}
                </FormGroup>
              </Box>

              {/* Dietary */}
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: -1 }}>Dietary</Typography>

              <Box>
                <Typography variant="subtitle2" sx={{ mb: 1 }}>Restrictions</Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                  {DIETARY_OPTIONS.map((option) => (
                    <Chip
                      key={option}
                      label={option}
                      clickable
                      color={form.dietary.includes(option) ? "primary" : "default"}
                      variant={form.dietary.includes(option) ? "filled" : "outlined"}
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
                value={form.calorieTarget}
                onChange={(e) => update("calorieTarget", e.target.value)}
                placeholder="e.g., 500"
                inputProps={{ min: 0 }}
              />

              {/* Preferences */}
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: -1 }}>Preferences</Typography>

              <FormControl size="small" fullWidth>
                <InputLabel>Recipe Source</InputLabel>
                <Select
                  value={form.recipeSource}
                  label="Recipe Source"
                  onChange={(e) => update("recipeSource", e.target.value as "new" | "existing" | "mix")}
                >
                  <MenuItem value="mix">Mix — reuse saved + create new</MenuItem>
                  <MenuItem value="existing">Existing only — use saved recipes</MenuItem>
                  <MenuItem value="new">New only — create all new</MenuItem>
                </Select>
              </FormControl>

              <TextField
                label="Cuisine (optional)"
                size="small"
                fullWidth
                value={form.cuisine}
                onChange={(e) => update("cuisine", e.target.value)}
                placeholder="e.g., Italian, Mexican..."
              />

              {/* Difficulty + Budget: stack on mobile */}
              <Stack direction={isMobile ? "column" : "row"} spacing={2}>
                <FormControl size="small" fullWidth>
                  <InputLabel>Difficulty</InputLabel>
                  <Select value={form.difficulty} label="Difficulty" onChange={(e) => update("difficulty", e.target.value)}>
                    {["Any", "Easy", "Medium", "Hard"].map((d) => (
                      <MenuItem key={d} value={d}>{d}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
                <FormControl size="small" fullWidth>
                  <InputLabel>Budget</InputLabel>
                  <Select value={form.budget} label="Budget" onChange={(e) => update("budget", e.target.value)}>
                    {["Any", "Budget-friendly", "Moderate", "Premium"].map((b) => (
                      <MenuItem key={b} value={b}>{b}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Stack>

              <TextField
                label="Max cook time per recipe (minutes)"
                size="small"
                type="number"
                fullWidth
                value={form.maxCookTime}
                onChange={(e) => update("maxCookTime", e.target.value)}
                placeholder="e.g., 30"
                inputProps={{ min: 0 }}
              />

              {/* Ingredients */}
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: -1 }}>Ingredients</Typography>

              <FormControlLabel
                control={<Checkbox checked={form.usePantry} onChange={(e) => update("usePantry", e.target.checked)} />}
                label={`Prioritize pantry ingredients (${pantryCount} items)`}
              />

              <TextField
                label="Must include (optional)"
                size="small"
                fullWidth
                value={form.includeIngredients}
                onChange={(e) => update("includeIngredients", e.target.value)}
                placeholder="e.g., chicken, rice, broccoli"
              />

              <TextField
                label="Never use (optional)"
                size="small"
                fullWidth
                value={form.excludeIngredients}
                onChange={(e) => update("excludeIngredients", e.target.value)}
                placeholder="e.g., peanuts, shellfish, cilantro"
              />

              {/* Special instructions */}
              <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: -1 }}>Special Instructions</Typography>

              <TextField
                multiline
                rows={3}
                fullWidth
                value={form.specialInstructions}
                onChange={(e) => update("specialInstructions", e.target.value)}
                placeholder="e.g., meal-prep friendly weekdays, comfort food weekends, no raw fish..."
              />
            </Stack>
          </DialogContent>
          <DialogActions sx={{ px: 3, pb: 3 }}>
            {!isMobile && <Button onClick={onClose}>Cancel</Button>}
            <Button
              variant="contained"
              onClick={onGenerate}
              disabled={form.mealTypes.length === 0}
              startIcon={<AutoAwesomeIcon />}
              fullWidth={isMobile}
              size={isMobile ? "large" : "medium"}
            >
              Generate
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
