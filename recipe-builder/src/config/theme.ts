import { createTheme } from "@mui/material/styles";

/**
 * Builds the app's MUI theme.
 * Teal/turquoise primary color, rounded shapes, and lowercase button labels.
 */
export function buildTheme(isDark: boolean) {
  return createTheme({
    palette: {
      mode: isDark ? "dark" : "light",
      primary: { main: "#009688" },
      secondary: { main: "#26a69a" },
      background: isDark
        ? { default: "#121212", paper: "#1e1e1e" }
        : { default: "#f5f5f5", paper: "#ffffff" },
    },
    typography: {
      fontFamily:
        '"Inter", "Roboto", "Helvetica Neue", Arial, sans-serif',
      h5: { fontWeight: 700 },
      h6: { fontWeight: 600 },
    },
    shape: { borderRadius: 12 },
    components: {
      MuiButton: {
        styleOverrides: {
          root: {
            textTransform: "none",
            borderRadius: 8,
            padding: "8px 20px",
            fontWeight: 600,
          },
        },
      },
      MuiChip: {
        styleOverrides: {
          root: { borderRadius: 8 },
        },
      },
      MuiCard: {
        styleOverrides: {
          root: {
            borderRadius: 16,
            transition: "box-shadow 0.2s ease, transform 0.15s ease",
          },
        },
      },
      MuiDialog: {
        styleOverrides: {
          paper: {
            borderRadius: 20,
            maxHeight: "85vh",
          },
        },
      },
      MuiBackdrop: {
        styleOverrides: {
          root: {
            backdropFilter: "blur(4px)",
          },
        },
      },
      MuiBottomNavigation: {
        styleOverrides: {
          root: { height: 64 },
        },
      },
      MuiBottomNavigationAction: {
        styleOverrides: {
          root: {
            minWidth: 60,
            padding: "6px 0",
            "&.Mui-selected": { fontWeight: 600 },
          },
        },
      },
      MuiSnackbar: {
        styleOverrides: {
          root: {
            // Clear the bottom nav on mobile
            bottom: 80,
          },
        },
      },
    },
  });
}

/** Cuisine → color mapping for visual distinction in recipe cards. */
export const CUISINE_COLORS: Record<string, string> = {
  Italian: "#e53935",
  Mexican: "#43a047",
  Asian: "#f9a825",
  Chinese: "#f9a825",
  Japanese: "#ff7043",
  Thai: "#ab47bc",
  Indian: "#ff8f00",
  American: "#1e88e5",
  French: "#5e35b1",
  Mediterranean: "#00897b",
  Korean: "#d81b60",
  Vietnamese: "#66bb6a",
  Greek: "#1565c0",
};

export function getCuisineColor(cuisine: string): string | undefined {
  // Try exact match first, then partial
  if (CUISINE_COLORS[cuisine]) return CUISINE_COLORS[cuisine];
  const lower = cuisine.toLowerCase();
  for (const [key, color] of Object.entries(CUISINE_COLORS)) {
    if (lower.includes(key.toLowerCase())) return color;
  }
  return undefined;
}
