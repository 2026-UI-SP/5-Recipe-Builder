import React, { useMemo, useState } from "react";
import {
  Typography,
  Box,
  Button,
  TextField,
  Select,
  MenuItem,
  Stack,
  Chip,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  InputAdornment,
  alpha,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import SearchIcon from "@mui/icons-material/Search";
import ShoppingCartIcon from "@mui/icons-material/ShoppingCart";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { FoodItem } from "../data/types";
import { UNITS } from "../config/constants";
import { categorizeFood, CATEGORY_ORDER, CATEGORY_ICONS } from "../utils/foodCategories";
import { normalizeUnit } from "../utils/helpers";

interface ShoppingListPageProps {
  shoppingList: FoodItem[];
  setShoppingList: React.Dispatch<React.SetStateAction<FoodItem[]>>;
  setPantry: React.Dispatch<React.SetStateAction<FoodItem[]>>;
  onSnackbar: (message: string) => void;
}

export default function ShoppingListPage({
  shoppingList,
  setShoppingList,
  setPantry,
  onSnackbar,
}: ShoppingListPageProps) {
  const [search, setSearch] = useState("");

  // Add dialog
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addAmount, setAddAmount] = useState("");
  const [addUnit, setAddUnit] = useState("pieces");

  // Edit dialog (opens on item tap)
  const [editOpen, setEditOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editAmount, setEditAmount] = useState("");
  const [editUnit, setEditUnit] = useState("pieces");

  const handleAdd = () => {
    const trimmed = addName.trim();
    const value = parseFloat(addAmount);
    if (!trimmed || isNaN(value) || value <= 0) return;

    setShoppingList((prev) => [
      ...prev,
      { food: trimmed, quantity: { value, unit: addUnit } },
    ]);
    setAddName("");
    setAddAmount("");
    setAddUnit("pieces");
    setAddOpen(false);
    onSnackbar(`Added ${trimmed} to shopping list`);
  };

  const addItemToPantry = (item: FoodItem) => {
    setPantry((prev) => {
      const existing = prev.findIndex(
        (p) =>
          p.food.toLowerCase() === item.food.toLowerCase() &&
          normalizeUnit(p.quantity.unit) === normalizeUnit(item.quantity.unit)
      );
      if (existing >= 0) {
        return prev.map((p, i) =>
          i === existing
            ? {
              ...p,
              quantity: {
                ...p.quantity,
                value: p.quantity.value + item.quantity.value,
              },
            }
            : p
        );
      }
      return [...prev, { food: item.food, quantity: { ...item.quantity } }];
    });
  };

  const openEdit = (index: number) => {
    const item = shoppingList[index];
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

    setShoppingList((prev) =>
      prev.map((item, i) =>
        i === editIndex
          ? { ...item, food: trimmed, quantity: { value, unit: editUnit } }
          : item
      )
    );
    closeEdit();
    onSnackbar(`Updated ${trimmed}`);
  };

  const handleDelete = () => {
    if (editIndex === null) return;
    const item = shoppingList[editIndex];
    setShoppingList((prev) => prev.filter((_, i) => i !== editIndex));
    closeEdit();
    onSnackbar(`Removed ${item.food} from shopping list`);
  };

  const handleMarkBought = () => {
    if (editIndex === null) return;
    const item = shoppingList[editIndex];
    addItemToPantry(item);
    setShoppingList((prev) => prev.filter((_, i) => i !== editIndex));
    closeEdit();
    onSnackbar(`${item.food} moved to pantry`);
  };

  const markAllBought = () => {
    shoppingList.forEach((item) => addItemToPantry(item));
    setShoppingList([]);
    onSnackbar(`All items moved to pantry`);
  };

  // Group by food category, filtered by search
  const grouped = useMemo(() => {
    const q = search.toLowerCase().trim();
    const itemsWithIndex = shoppingList
      .map((item, i) => ({
        item,
        originalIndex: i,
        category: categorizeFood(item.food),
      }))
      .filter((entry) => !q || entry.item.food.toLowerCase().includes(q));

    const groups: { category: string; icon: string; items: typeof itemsWithIndex }[] = [];
    for (const category of CATEGORY_ORDER) {
      const categoryItems = itemsWithIndex.filter((e) => e.category === category);
      if (categoryItems.length > 0) {
        groups.push({
          category,
          icon: CATEGORY_ICONS[category] || "",
          items: categoryItems,
        });
      }
    }
    return groups;
  }, [shoppingList, search]);

  return (
    <Box>
      {/* Header with add button */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 0.5 }}>
        <Stack direction="row" alignItems="center" spacing={1}>
          <ShoppingCartIcon color="primary" />
          <Typography variant="h5" sx={{ fontWeight: 700 }}>
            Grocery List
          </Typography>
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
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Items you need for your selected recipes
        </Typography>
        {shoppingList.length > 0 && (
          <Chip
            label={`${shoppingList.length} item${shoppingList.length !== 1 ? "s" : ""}`}
            size="small"
            variant="outlined"
          />
        )}
      </Stack>

      {/* Search */}
      {shoppingList.length > 5 && (
        <TextField
          size="small"
          placeholder="Search shopping list..."
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

      {shoppingList.length === 0 ? (
        <Paper sx={{ p: 6, textAlign: "center", borderRadius: 3 }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 56, color: "success.main", mb: 1.5 }} />
          <Typography variant="h6" color="text.secondary" gutterBottom>
            Your shopping list is empty
          </Typography>
          <Typography variant="body2" color="text.disabled">
            Add items manually or use "Shop All" from your meal plan
          </Typography>
        </Paper>
      ) : (
        <Box>
          {/* Grouped chips */}
          <Stack spacing={2.5}>
            {grouped.map((group) => (
              <Box key={group.category}>
                <Stack direction="row" alignItems="center" spacing={0.75} sx={{ mb: 1 }}>
                  <Typography sx={{ fontSize: "1rem" }}>{group.icon}</Typography>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700, color: "text.secondary", fontSize: "0.8rem", textTransform: "uppercase", letterSpacing: 0.5 }}>
                    {group.category}
                  </Typography>
                </Stack>
                <Stack direction="row" sx={{ flexWrap: "wrap", gap: 1 }}>
                  {group.items.map(({ item, originalIndex }) => (
                    <Chip
                      key={originalIndex}
                      label={
                        item.sourceRecipe
                          ? `${item.food}  ·  ${item.quantity.value} ${item.quantity.unit}  ·  ${item.sourceRecipe}`
                          : `${item.food}  ·  ${item.quantity.value} ${item.quantity.unit}`
                      }
                      onClick={() => openEdit(originalIndex)}
                      variant="outlined"
                      sx={{
                        height: 36,
                        borderRadius: 2,
                        fontWeight: 500,
                        fontSize: "0.8rem",
                        "&:hover": { bgcolor: (t) => alpha(t.palette.primary.main, 0.08) },
                      }}
                    />
                  ))}
                </Stack>
              </Box>
            ))}
          </Stack>

          {/* Bottom action */}
          <Button
            variant="contained"
            fullWidth
            onClick={markAllBought}
            startIcon={<CheckCircleOutlineIcon />}
            sx={{ mt: 3, py: 1.5, borderRadius: 2 }}
          >
            Mark All as Bought
          </Button>
        </Box>
      )}

      {/* Add item dialog */}
      <Dialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Add Item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Item"
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

      {/* Edit item dialog */}
      <Dialog
        open={editOpen}
        onClose={closeEdit}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>Edit Item</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Item"
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
        <Stack sx={{ px: 3, pb: 3 }} spacing={1.5}>
          <Button
            fullWidth
            color="success"
            variant="outlined"
            startIcon={<CheckCircleOutlineIcon />}
            onClick={handleMarkBought}
            sx={{ py: 1 }}
          >
            Mark Bought
          </Button>
          <Stack direction="row" justifyContent="space-between">
            <Button color="error" onClick={handleDelete}>Delete</Button>
            <Stack direction="row" spacing={1}>
              <Button onClick={closeEdit}>Cancel</Button>
              <Button variant="contained" onClick={handleEditSave}>Save</Button>
            </Stack>
          </Stack>
        </Stack>
      </Dialog>
    </Box>
  );
}
