import React, { useState } from "react";
import {
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  InputAdornment,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import SearchIcon from "@mui/icons-material/Search";
import CloseIcon from "@mui/icons-material/Close";
import { Recipe } from "../data/types";

interface RecipePickerDialogProps {
  open: boolean;
  onClose: () => void;
  day: string;
  mealType: string;
  recipes: Recipe[];
  onSelect: (recipe: Recipe) => void;
}

export default function RecipePickerDialog({
  open,
  onClose,
  day,
  mealType,
  recipes,
  onSelect,
}: RecipePickerDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));
  const [search, setSearch] = useState("");

  const filtered = recipes.filter((r) =>
    r.title.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      fullScreen={isMobile}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {day} — {mealType}
        {isMobile && (
          <IconButton onClick={onClose} edge="end" aria-label="Close">
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent>
        <TextField
          size="small"
          fullWidth
          placeholder="Search recipes..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
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
          <List sx={{ maxHeight: isMobile ? undefined : 350, overflow: "auto" }}>
            {filtered.map((recipe) => (
              <ListItem key={recipe.id} disablePadding>
                <ListItemButton
                  onClick={() => onSelect(recipe)}
                  sx={{ borderRadius: 2, mb: 0.5, py: 1.5 }}
                >
                  <ListItemText
                    primary={recipe.title}
                    primaryTypographyProps={{ fontWeight: 500 }}
                    secondary={`${recipe.cuisine} · ${recipe.total_time_minutes} min${recipe.nutrition_info ? ` · ${recipe.nutrition_info.calories} cal` : ""}`}
                  />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        )}
      </DialogContent>
      {!isMobile && (
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
        </DialogActions>
      )}
    </Dialog>
  );
}
