import React, { useState, useMemo } from "react";
import useLocalStorageState from "use-local-storage-state";
import {
  AppBar,
  Toolbar,
  Typography,
  Box,
  Container,
  BottomNavigation,
  BottomNavigationAction,
  Paper,
  Snackbar,
  IconButton,
  useMediaQuery,
  CssBaseline,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  InputAdornment,
  Fade,
  Badge,
  Stack,
  Switch,
  FormControlLabel,
  Divider,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import CalendarMonthIcon from "@mui/icons-material/CalendarMonth";
import KitchenIcon from "@mui/icons-material/Kitchen";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import MenuBookIcon from "@mui/icons-material/MenuBook";
import SettingsIcon from "@mui/icons-material/Settings";
import CloseIcon from "@mui/icons-material/Close";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";
import { FoodItem, Recipe, MealPlan } from "./data/types";
import { buildTheme } from "./config/theme";
import sampleRecipes from "./data/sampleRecipes";
import DashboardPage from "./pages/DashboardPage";
import RecipesPage from "./pages/RecipesPage";
import PantryPage from "./pages/PantryPage";
import ShoppingListPage from "./pages/ShoppingListPage";
import CookModePage from "./pages/CookModePage";

function App() {
  // --- Persistent state ---
  const [pantry, setPantry] = useLocalStorageState<FoodItem[]>("pantry", {
    defaultValue: [],
  });
  const [shoppingList, setShoppingList] = useLocalStorageState<FoodItem[]>(
    "shoppingList",
    { defaultValue: [] }
  );
  const [recipes, setRecipes] = useLocalStorageState<Recipe[]>("recipes", {
    defaultValue: sampleRecipes,
  });
  const [mealPlan, setMealPlan] = useLocalStorageState<MealPlan>("mealPlan", {
    defaultValue: {},
  });
  const [darkMode, setDarkMode] = useLocalStorageState<boolean | null>(
    "darkMode",
    { defaultValue: null }
  );
  const [apiKey, setApiKey] = useLocalStorageState<string>("openai-api-key", {
    defaultValue: "",
  });

  // --- Session-only state ---
  const [tab, setTab] = useState(0);
  const [cookingRecipe, setCookingRecipe] = useState<Recipe | null>(null);
  const [cookedRecipeIds, setCookedRecipeIds] = useState<Set<string>>(new Set());
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [keyDraft, setKeyDraft] = useState("");

  // --- Dark mode ---
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const isDark = darkMode !== null ? darkMode : prefersDark;
  const theme = useMemo(() => buildTheme(isDark), [isDark]);


  const openSettings = () => {
    setKeyDraft(apiKey);
    setShowKey(false);
    setSettingsOpen(true);
  };

  const saveSettings = () => {
    setApiKey(keyDraft.trim());
    setSettingsOpen(false);
    setSnackbar(keyDraft.trim() ? "Settings saved" : "Settings saved (API key cleared)");
  };

  const snackbarElement = (
    <Snackbar
      open={snackbar !== null}
      autoHideDuration={3000}
      onClose={() => setSnackbar(null)}
      message={snackbar}
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      action={
        <IconButton size="small" color="inherit" onClick={() => setSnackbar(null)}>
          <CloseIcon fontSize="small" />
        </IconButton>
      }
    />
  );

  // --- Settings dialog (API key + dark mode) ---
  const settingsDialog = (
    <Dialog
      open={settingsOpen}
      onClose={() => setSettingsOpen(false)}
      maxWidth="sm"
      fullWidth
    >
      <DialogTitle>Settings</DialogTitle>
      <DialogContent>
        <Stack spacing={3} sx={{ mt: 1 }}>
          {/* Appearance */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Appearance
            </Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={isDark}
                  onChange={(e) => setDarkMode(e.target.checked)}
                />
              }
              label="Dark mode"
            />
          </Box>

          <Divider />

          {/* API Key */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              OpenAI API Key
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Stored only in your browser's localStorage. Never sent anywhere except OpenAI.
            </Typography>
            <TextField
              label="API Key"
              fullWidth
              size="small"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              type={showKey ? "text" : "password"}
              placeholder="sk-..."
              slotProps={{
                input: {
                  endAdornment: (
                    <InputAdornment position="end">
                      <IconButton
                        size="small"
                        onClick={() => setShowKey(!showKey)}
                        edge="end"
                      >
                        {showKey ? <VisibilityOffIcon /> : <VisibilityIcon />}
                      </IconButton>
                    </InputAdornment>
                  ),
                },
              }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={() => setSettingsOpen(false)}>Cancel</Button>
        <Button variant="contained" onClick={saveSettings}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );

  // --- Cook mode ---
  if (cookingRecipe) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Fade in timeout={300}>
          <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
            <AppBar position="static" elevation={0} sx={{ borderBottom: 1, borderColor: "divider" }}>
              <Toolbar>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  Cook Mode
                </Typography>
              </Toolbar>
            </AppBar>
            <Container maxWidth="md" sx={{ py: 3, pb: 6, flexGrow: 1 }}>
              <CookModePage
                recipe={cookingRecipe}
                pantry={pantry}
                setPantry={setPantry}
                onExit={() => setCookingRecipe(null)}
                onSnackbar={setSnackbar}
                onRecipeCooked={(id) => setCookedRecipeIds((prev) => new Set(prev).add(id))}
              />
            </Container>
          </Box>
        </Fade>
        {snackbarElement}
      </ThemeProvider>
    );
  }

  // --- Main layout ---
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: "flex", flexDirection: "column", minHeight: "100vh" }}>
        <AppBar
          position="sticky"
          elevation={0}
          sx={{
            borderBottom: 1,
            borderColor: "divider",
            backdropFilter: "blur(8px)",
            bgcolor: isDark ? "rgba(18,18,18,0.9)" : "rgba(255,255,255,0.9)",
            color: "text.primary",
          }}
        >
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1, color: "primary.main", fontWeight: 700 }}>
              {["Meal Plan", "Recipes", "Pantry", "Shopping List"][tab]}
            </Typography>
            <IconButton onClick={openSettings} sx={{ color: "text.secondary" }} aria-label="Settings">
              <SettingsIcon />
            </IconButton>
          </Toolbar>
        </AppBar>

        <Container maxWidth="md" sx={{ py: 1.5, px: { xs: 1.5, sm: 3 }, pb: 10, flexGrow: 1 }}>
          {tab === 0 && (
            <DashboardPage
              mealPlan={mealPlan}
              setMealPlan={setMealPlan}
              recipes={recipes}
              setRecipes={setRecipes}
              pantry={pantry}
              setPantry={setPantry}
              setShoppingList={setShoppingList}
              apiKey={apiKey}
              onStartCookMode={setCookingRecipe}
              onOpenSettings={openSettings}
              onSnackbar={setSnackbar}
            />
          )}
          {tab === 1 && (
            <RecipesPage
              recipes={recipes}
              setRecipes={setRecipes}
              pantry={pantry}
              setPantry={setPantry}
              setShoppingList={setShoppingList}
              mealPlan={mealPlan}
              setMealPlan={setMealPlan}
              cookedRecipeIds={cookedRecipeIds}
              onStartCookMode={setCookingRecipe}
              onSnackbar={setSnackbar}
              apiKey={apiKey}
            />
          )}
          {tab === 2 && (
            <PantryPage
              pantry={pantry}
              setPantry={setPantry}
              onSnackbar={setSnackbar}
            />
          )}
          {tab === 3 && (
            <ShoppingListPage
              shoppingList={shoppingList}
              setShoppingList={setShoppingList}
              setPantry={setPantry}
              onSnackbar={setSnackbar}
            />
          )}
        </Container>

        <Paper
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 1100,
            borderTop: 1,
            borderColor: "divider",
          }}
          elevation={0}
        >
          <BottomNavigation
            value={tab}
            onChange={(_, v) => setTab(v)}
            showLabels
            sx={{ bgcolor: "background.paper" }}
            component="nav"
            aria-label="Main navigation"
          >
            <BottomNavigationAction label="Plan" icon={<CalendarMonthIcon />} />
            <BottomNavigationAction label="Recipes" icon={<MenuBookIcon />} />
            <BottomNavigationAction label="Pantry" icon={<KitchenIcon />} />
            <BottomNavigationAction
              label="Shopping"
              icon={
                <Badge badgeContent={shoppingList.length} color="error" max={99} invisible={shoppingList.length === 0}>
                  <ShoppingCartIcon />
                </Badge>
              }
            />
          </BottomNavigation>
        </Paper>
      </Box>

      {settingsDialog}
      {snackbarElement}
    </ThemeProvider>
  );
}

export default App;
