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
  ToggleButtonGroup,
  ToggleButton,
  Alert,
  Link,
  MenuItem,
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
import HelpOutlineIcon from "@mui/icons-material/HelpOutline";
import { FoodItem, Recipe, MealPlan } from "./data/types";
import { AiProvider, OPENROUTER_MODEL_OPTIONS, DEFAULT_OPENROUTER_MODEL } from "./utils/openai";
import { buildTheme } from "./config/theme";
import sampleRecipes from "./data/sampleRecipes";
import DashboardPage from "./pages/DashboardPage";
import RecipesPage from "./pages/RecipesPage";
import PantryPage from "./pages/PantryPage";
import ShoppingListPage from "./pages/ShoppingListPage";
import CookModePage from "./pages/CookModePage";
import HelpGuide from "./components/HelpGuide";
import DataTransferDialog from "./components/DataTransferDialog";

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
  const [aiProvider, setAiProvider] = useLocalStorageState<AiProvider>("ai-provider", {
    defaultValue: "openai",
  });
  const [openaiKey, setOpenaiKey] = useLocalStorageState<string>("openai-api-key", {
    defaultValue: "",
  });
  const [openrouterKey, setOpenrouterKey] = useLocalStorageState<string>("openrouter-api-key", {
    defaultValue: "",
  });
  const [openrouterModel, setOpenrouterModel] = useLocalStorageState<string>("openrouter-model", {
    defaultValue: DEFAULT_OPENROUTER_MODEL,
  });
  React.useEffect(() => {
    if (!OPENROUTER_MODEL_OPTIONS.some((o) => o.value === openrouterModel)) {
      setOpenrouterModel(DEFAULT_OPENROUTER_MODEL);
    }
  }, [openrouterModel, setOpenrouterModel]);
  const apiKey = aiProvider === "openrouter" ? openrouterKey : openaiKey;

  // --- Session-only state ---
  const [tab, setTab] = useState(0);
  const [cookingRecipe, setCookingRecipe] = useState<Recipe | null>(null);
  const [cookedRecipeIds, setCookedRecipeIds] = useState<Set<string>>(new Set());
  const [snackbar, setSnackbar] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [openaiKeyDraft, setOpenaiKeyDraft] = useState("");
  const [openrouterKeyDraft, setOpenrouterKeyDraft] = useState("");
  const [providerDraft, setProviderDraft] = useState<AiProvider>("openai");
  const [openrouterModelDraft, setOpenrouterModelDraft] = useState(DEFAULT_OPENROUTER_MODEL);
  const [hasSeenHelp, setHasSeenHelp] = useLocalStorageState<boolean>("has-seen-help", {
    defaultValue: false,
  });
  const [helpOpen, setHelpOpen] = useState(false);
  const [dataTransferOpen, setDataTransferOpen] = useState(false);
  const [dataTransferMode, setDataTransferMode] = useState<"export" | "import">("export");

  // --- Dark mode ---
  const prefersDark = useMediaQuery("(prefers-color-scheme: dark)");
  const isDark = darkMode !== null ? darkMode : prefersDark;
  const theme = useMemo(() => buildTheme(isDark), [isDark]);

  // Show help guide on first visit
  React.useEffect(() => {
    if (!hasSeenHelp) {
      setHelpOpen(true);
      setHasSeenHelp(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const openSettings = () => {
    setProviderDraft(aiProvider);
    setOpenaiKeyDraft(openaiKey);
    setOpenrouterKeyDraft(openrouterKey);
    setOpenrouterModelDraft(openrouterModel);
    setShowKey(false);
    setSettingsOpen(true);
  };

  const keyDraft = providerDraft === "openrouter" ? openrouterKeyDraft : openaiKeyDraft;
  const setKeyDraft = (value: string) => {
    if (providerDraft === "openrouter") setOpenrouterKeyDraft(value);
    else setOpenaiKeyDraft(value);
  };

  const saveSettings = () => {
    const openaiTrimmed = openaiKeyDraft.trim();
    const openrouterTrimmed = openrouterKeyDraft.trim();
    setOpenaiKey(openaiTrimmed);
    setOpenrouterKey(openrouterTrimmed);
    setOpenrouterModel(openrouterModelDraft);
    setAiProvider(providerDraft);
    setSettingsOpen(false);
    const activeKey = providerDraft === "openrouter" ? openrouterTrimmed : openaiTrimmed;
    setSnackbar(activeKey ? "Settings saved" : "Settings saved (API key cleared)");
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

          {/* AI Provider + API Key */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              AI Provider
            </Typography>
            <ToggleButtonGroup
              value={providerDraft}
              exclusive
              size="small"
              onChange={(_, v) => v && setProviderDraft(v as AiProvider)}
              sx={{ mb: 2 }}
            >
              <ToggleButton value="openai">OpenAI (paid)</ToggleButton>
              <ToggleButton value="openrouter">OpenRouter (free)</ToggleButton>
            </ToggleButtonGroup>
            {providerDraft === "openrouter" ? (
              <>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  Free OpenRouter models are <strong>slow and unreliable</strong>. Expect long waits,
                  rate limits, and occasional failures. Get a free key at{" "}
                  <Link href="https://openrouter.ai/keys" target="_blank" rel="noopener">
                    openrouter.ai/keys
                  </Link>
                  .
                </Alert>
                <TextField
                  select
                  label="Model"
                  fullWidth
                  size="small"
                  value={openrouterModelDraft}
                  onChange={(e) => setOpenrouterModelDraft(e.target.value)}
                  helperText="DeepSeek and Gemini handle JSON best. Swap here if one model fails on you."
                  sx={{ mb: 2 }}
                >
                  {OPENROUTER_MODEL_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      <Box>
                        <Typography variant="body2">{opt.label}</Typography>
                        <Typography variant="caption" color="text.secondary">{opt.note}</Typography>
                      </Box>
                    </MenuItem>
                  ))}
                </TextField>
              </>
            ) : (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Uses your paid OpenAI account. Fast and reliable. Get a key at{" "}
                <Link href="https://platform.openai.com/api-keys" target="_blank" rel="noopener">
                  platform.openai.com/api-keys
                </Link>
                .
              </Typography>
            )}
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Stored only in your browser's localStorage. Never sent anywhere except{" "}
              {providerDraft === "openrouter" ? "OpenRouter" : "OpenAI"}.
            </Typography>
            <TextField
              label={`${providerDraft === "openrouter" ? "OpenRouter" : "OpenAI"} API Key`}
              fullWidth
              size="small"
              value={keyDraft}
              onChange={(e) => setKeyDraft(e.target.value)}
              type={showKey ? "text" : "password"}
              placeholder={providerDraft === "openrouter" ? "sk-or-..." : "sk-..."}
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

          <Divider />

          {/* Data Transfer */}
          <Box>
            <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>
              Data Transfer
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Move your recipes, meal plan, pantry, and settings to another device via QR code.
            </Typography>
            <Stack direction="row" spacing={1.5}>
              <Button
                variant="outlined"
                size="small"
                onClick={() => { setDataTransferMode("export"); setDataTransferOpen(true); setSettingsOpen(false); }}
              >
                Export Data
              </Button>
              <Button
                variant="outlined"
                size="small"
                onClick={() => { setDataTransferMode("import"); setDataTransferOpen(true); setSettingsOpen(false); }}
              >
                Import Data
              </Button>
            </Stack>
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
            <IconButton onClick={() => setHelpOpen(true)} sx={{ color: "text.secondary" }} aria-label="Help" data-tour="tour-help-btn">
              <HelpOutlineIcon />
            </IconButton>
            <IconButton onClick={openSettings} sx={{ color: "text.secondary" }} aria-label="Settings" data-tour="tour-settings-btn">
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
              aiProvider={aiProvider}
              openrouterModel={openrouterModel}
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
              aiProvider={aiProvider}
              openrouterModel={openrouterModel}
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
            <BottomNavigationAction label="Plan" icon={<CalendarMonthIcon />} data-tour="tour-nav-plan" />
            <BottomNavigationAction label="Recipes" icon={<MenuBookIcon />} data-tour="tour-nav-recipes" />
            <BottomNavigationAction label="Pantry" icon={<KitchenIcon />} data-tour="tour-nav-pantry" />
            <BottomNavigationAction
              label="Shopping"
              data-tour="tour-nav-shopping"
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
      <HelpGuide open={helpOpen} onClose={() => setHelpOpen(false)} onSetTab={setTab} />
      <DataTransferDialog open={dataTransferOpen} mode={dataTransferMode} onClose={() => setDataTransferOpen(false)} />
      {snackbarElement}
    </ThemeProvider>
  );
}

export default App;
