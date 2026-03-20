import React, { useMemo, useState } from "react";
import {
  Typography,
  TextField,
  Select,
  MenuItem,
  Button,
  Chip,
  Box,
  Stack,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import KitchenIcon from "@mui/icons-material/Kitchen";
import InventoryIcon from "@mui/icons-material/Inventory2";
import { FoodItem } from "../data/types";
import { UNITS } from "../config/constants";
import { categorizeFood, CATEGORY_ORDER, CATEGORY_ICONS } from "../utils/foodCategories";

interface PantryPageProps {
  pantry: FoodItem[];
  setPantry: React.Dispatch<React.SetStateAction<FoodItem[]>>;
  onSnackbar: (message: string) => void;
}

export default function PantryPage({ pantry, setPantry, onSnackbar }: PantryPageProps) {
  const [search, setSearch] = useState("");

  // Category filter
  const [activeFilter, setActiveFilter] = useState("All");

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addUnit, setAddUnit] = useState("pieces");

  // Edit dialog (opens directly on item tap)
  const [editOpen, setEditOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editUnit, setEditUnit] = useState("pieces");

  const handleAdd = () => {
    const trimmed = addName.trim();
    const value = parseFloat(addAmount);
    if (!trimmed || isNaN(value) || value <= 0) return;

    setPantry((prev) => [...prev, { food: trimmed, quantity: { value, unit: addUnit } }]);
    setAddName("");
    setAddAmount("");
    setAddUnit("pieces");
    setAddOpen(false);
    onSnackbar(`Added ${trimmed} to pantry`);
  };

  const openEdit = (index: number) => {
    const item = pantry[index];
    setEditIndex(index);
    setEditName(item.food);
    setEditAmount(String(item.quantity.value));
    setEditUnit(item.quantity.unit);
    setEditOpen(true);
  };

  const closeEdit = () => {
    setEditOpen(false);
    setEditIndex(null);
  };

  const handleEditSave = () => {
    const trimmed = editName.trim();
    const value = parseFloat(editAmount);
    if (!trimmed || isNaN(value) || value <= 0 || editIndex === null) return;

    setPantry((prev) =>
      prev.map((item, i) =>
        i === editIndex
          ? { food: trimmed, quantity: { value, unit: editUnit } }
          : item
      )
    );
    closeEdit();
    onSnackbar(`Updated ${trimmed}`);
  };

  const handleDelete = () => {
    if (editIndex === null) return;
    const item = pantry[editIndex];
    setPantry((prev) => prev.filter((_, i) => i !== editIndex));
    closeEdit();
    onSnackbar(`Removed ${item.food} from pantry`);
  };

  // Filter by search, preserving original indices
  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pantry
      .map((item, i) => ({ item, realIndex: i }))
      .filter((entry) => !q || entry.item.food.toLowerCase().includes(q));
  }, [pantry, search]);

  // Build category counts and available filters
  const { filters, grouped } = useMemo(() => {
    const itemsWithIndex = searched.map(({ item, realIndex }) => ({
      item,
      realIndex,
      category: categorizeFood(item.food),
    }));

    const categoryCounts: Record<string, number> = {};
    for (const entry of itemsWithIndex) {
      categoryCounts[entry.category] = (categoryCounts[entry.category] || 0) + 1;
    }

    const f: { label: string; icon: string; count: number }[] = [
      { label: "All", icon: "", count: itemsWithIndex.length },
    ];
    for (const category of CATEGORY_ORDER) {
      if (categoryCounts[category]) {
        f.push({
          label: category,
          icon: CATEGORY_ICONS[category] || "",
          count: categoryCounts[category],
        });
      }
    }

    const groups: { category: string; icon: string; items: typeof itemsWithIndex }[] = [];
    for (const category of CATEGORY_ORDER) {
      const categoryItems = itemsWithIndex
        .filter((e) => e.category === category)
        .sort((a, b) => a.item.food.localeCompare(b.item.food));
      if (categoryItems.length > 0) {
        groups.push({
          category,
          icon: CATEGORY_ICONS[category] || "",
          items: categoryItems,
        });
      }
    }

    return { filters: f, grouped: groups };
  }, [searched]);

  const safeFilter = filters.find((f) => f.label === activeFilter) ? activeFilter : "All";
  const filteredGroups = safeFilter === "All"
    ? grouped
    : grouped.filter((g) => g.category === safeFilter);

  return (
    <Box>
      {/* Header with add button */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <KitchenIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Pantry
          </Typography>
          {pantry.length > 0 && (
            <Chip label={`${pantry.length} item${pantry.length !== 1 ? "s" : ""}`} size="small" variant="outlined" />
          )}
        </Stack>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          size="small"
          onClick={() => setAddOpen(true)}
        >
          Add
        </Button>
      </Stack>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Track what ingredients you have on hand
      </Typography>

      {/* Search */}
      {pantry.length > 5 && (
        <TextField
          size="small"
          placeholder="Search pantry..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          fullWidth
          sx={{ mb: 2 }}
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
      )}

      {/* Pantry content */}
      {pantry.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3 }}>
          <InventoryIcon sx={{ fontSize: 56, color: "text.disabled", mb: 1.5 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Your pantry is empty
          </Typography>
          <Typography variant="body2" color="text.disabled" sx={{ mb: 2 }}>
            Tap "Add" to start tracking your ingredients
          </Typography>
        </Paper>
      ) : searched.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: "center", borderRadius: 3 }}>
          <Typography color="text.secondary">
            No ingredients match "{search}"
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Category filter chips */}
          <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1, mb: 2 }}>
            {filters.map((f) => {
              const isActive = f.label === safeFilter;
              return (
                <Chip
                  key={f.label}
                  label={`${f.icon ? f.icon + " " : ""}${f.label}${f.label !== "All" ? ` (${f.count})` : ""}`}
                  clickable
                  onClick={() => setActiveFilter(f.label)}
                  variant={isActive ? "filled" : "outlined"}
                  color={isActive ? "primary" : "default"}
                  sx={{ fontWeight: 600, fontSize: "0.8rem" }}
                />
              );
            })}
          </Stack>

          {/* Items grouped by category */}
          <Stack spacing={1}>
            {filteredGroups.map((group) => (
              <Paper key={group.category} variant="outlined" sx={{ borderRadius: 2, overflow: "hidden" }}>
                <Box sx={{ px: 2, py: 1.25, bgcolor: "action.hover" }}>
                  <Stack direction="row" alignItems="center" spacing={0.75}>
                    <Typography sx={{ fontSize: "1rem" }}>{group.icon}</Typography>
                    <Typography variant="subtitle2" sx={{ fontWeight: 700, fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: 0.5 }}>
                      {group.category}
                    </Typography>
                    <Chip label={group.items.length} size="small" sx={{ height: 20, fontSize: "0.7rem" }} />
                  </Stack>
                </Box>
                <List disablePadding dense>
                  {group.items.map(({ item, realIndex }, idx) => (
                    <React.Fragment key={realIndex}>
                      {idx > 0 && <Divider component="li" />}
                      <ListItem
                        sx={{ py: 1, px: 2, cursor: "pointer", "&:hover": { bgcolor: "action.hover" } }}
                        onClick={() => openEdit(realIndex)}
                      >
                        <ListItemText
                          primary={item.food}
                          primaryTypographyProps={{ fontWeight: 500, fontSize: "0.95rem" }}
                        />
                        <ListItemSecondaryAction>
                          <Chip
                            label={`${item.quantity.value} ${item.quantity.unit}`}
                            size="small"
                            variant="outlined"
                            sx={{ fontWeight: 600, fontSize: "0.8rem" }}
                            onClick={() => openEdit(realIndex)}
                          />
                        </ListItemSecondaryAction>
                      </ListItem>
                    </React.Fragment>
                  ))}
                </List>
              </Paper>
            ))}
          </Stack>
        </>
      )}

      {/* Add ingredient dialog */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Add Ingredient</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Ingredient"
              fullWidth
              value={addName}
              onChange={(e) => setAddName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleAdd()}
              autoFocus
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Amount"
                type="number"
                value={addAmount}
                onChange={(e) => setAddAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAdd()}
                sx={{ flex: 1 }}
                inputProps={{ min: 0, step: "any" }}
              />
              <Select
                value={addUnit}
                onChange={(e) => setAddUnit(e.target.value)}
                sx={{ flex: 1 }}
              >
                {UNITS.map((u) => (
                  <MenuItem key={u} value={u}>{u}</MenuItem>
                ))}
              </Select>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button onClick={() => setAddOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAdd}>Add</Button>
        </DialogActions>
      </Dialog>

      {/* Edit ingredient dialog */}
      <Dialog
        open={editOpen}
        onClose={closeEdit}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Edit Ingredient</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Ingredient"
              fullWidth
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleEditSave()}
              autoFocus
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="Amount"
                type="number"
                value={editAmount}
                onChange={(e) => setEditAmount(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleEditSave()}
                sx={{ flex: 1 }}
                inputProps={{ min: 0, step: "any" }}
              />
              <Select
                value={editUnit}
                onChange={(e) => setEditUnit(e.target.value)}
                sx={{ flex: 1 }}
              >
                {UNITS.map((u) => (
                  <MenuItem key={u} value={u}>{u}</MenuItem>
                ))}
              </Select>
            </Stack>
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3, justifyContent: "space-between" }}>
          <Button color="error" onClick={handleDelete}>Delete</Button>
          <Stack direction="row" spacing={1}>
            <Button onClick={closeEdit}>Cancel</Button>
            <Button variant="contained" onClick={handleEditSave}>Save</Button>
          </Stack>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
