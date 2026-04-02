import React, { useMemo, useState } from "react";
import {
  Typography,
  Box,
  Button,
  Stack,
  Chip,
  Paper,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  Divider,
  Checkbox,
  IconButton,
  Tooltip,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import ShareIcon from "@mui/icons-material/Share";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import { FoodItem } from "../data/types";
import { categorizeFood, CATEGORY_ORDER, CATEGORY_ICONS } from "../utils/foodCategories";
import { normalizeUnit, normalizeIngredientName } from "../utils/helpers";
import FoodItemDialog from "../components/FoodItemDialog";
import EmptyState from "../components/EmptyState";
import { formatShoppingListText, shareShoppingList } from "../utils/shareHelpers";

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
  // Dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  // Checked items (visual only until "bought")
  const [checkedItems, setCheckedItems] = useState<Set<number>>(new Set());

  const editItem = editIndex !== null ? shoppingList[editIndex] : null;

  // --- CRUD ---
  const handleAdd = (name: string, amount: number, unit: string) => {
    setShoppingList((prev) => [...prev, { food: name, quantity: { value: amount, unit } }]);
    setAddOpen(false);
    onSnackbar(`Added ${name} to shopping list`);
  };

  const handleEditSave = (name: string, amount: number, unit: string) => {
    if (editIndex === null) return;
    setShoppingList((prev) =>
      prev.map((item, i) =>
        i === editIndex ? { ...item, food: name, quantity: { value: amount, unit } } : item
      )
    );
    setEditIndex(null);
    onSnackbar(`Updated ${name}`);
  };

  const handleDelete = () => {
    if (editIndex === null) return;
    const item = shoppingList[editIndex];
    setShoppingList((prev) => prev.filter((_, i) => i !== editIndex));
    setCheckedItems((prev) => { const n = new Set(prev); n.delete(editIndex); return n; });
    setEditIndex(null);
    onSnackbar(`Removed ${item.food} from shopping list`);
  };

  // --- Pantry integration ---
  const addItemToPantry = (item: FoodItem) => {
    setPantry((prev) => {
      const existing = prev.findIndex(
        (p) =>
          normalizeIngredientName(p.food) === normalizeIngredientName(item.food) &&
          normalizeUnit(p.quantity.unit) === normalizeUnit(item.quantity.unit)
      );
      if (existing >= 0) {
        return prev.map((p, i) =>
          i === existing
            ? { ...p, quantity: { ...p.quantity, value: p.quantity.value + item.quantity.value } }
            : p
        );
      }
      return [...prev, { food: item.food, quantity: { ...item.quantity } }];
    });
  };

  const handleMarkBought = () => {
    if (editIndex === null) return;
    const item = shoppingList[editIndex];
    addItemToPantry(item);
    setShoppingList((prev) => prev.filter((_, i) => i !== editIndex));
    setCheckedItems((prev) => { const n = new Set(prev); n.delete(editIndex); return n; });
    setEditIndex(null);
    onSnackbar(`${item.food} moved to pantry`);
  };

  const toggleCheck = (index: number) => {
    setCheckedItems((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  const markAllBought = () => {
    shoppingList.forEach((item) => addItemToPantry(item));
    setShoppingList([]);
    setCheckedItems(new Set());
    onSnackbar("All items moved to pantry");
  };

  const markCheckedBought = () => {
    const indices = Array.from(checkedItems).sort((a, b) => b - a);
    for (const idx of indices) {
      if (shoppingList[idx]) addItemToPantry(shoppingList[idx]);
    }
    setShoppingList((prev) => prev.filter((_, i) => !checkedItems.has(i)));
    setCheckedItems(new Set());
    onSnackbar(`${indices.length} item${indices.length !== 1 ? "s" : ""} moved to pantry`);
  };

  // --- Grouping ---
  const grouped = useMemo(() => {
    const itemsWithIndex = shoppingList.map((item, i) => ({
      item,
      originalIndex: i,
      category: categorizeFood(item.food),
    }));

    const groups: { category: string; icon: string; items: typeof itemsWithIndex }[] = [];
    for (const category of CATEGORY_ORDER) {
      const categoryItems = itemsWithIndex.filter((e) => e.category === category);
      if (categoryItems.length > 0) {
        groups.push({ category, icon: CATEGORY_ICONS[category] || "", items: categoryItems });
      }
    }
    return groups;
  }, [shoppingList]);

  const checkedCount = checkedItems.size;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={0.5} sx={{ mb: 1 }}>
        {shoppingList.length > 0 && (
          <Chip label={`${shoppingList.length} item${shoppingList.length !== 1 ? "s" : ""}`} size="small" variant="outlined" />
        )}
        {shoppingList.length > 0 && (
          <Tooltip title="Share list">
            <IconButton size="small" onClick={() => shareShoppingList(formatShoppingListText(grouped), onSnackbar)} aria-label="Share shopping list">
              <ShareIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
        <Box sx={{ flexGrow: 1 }} />
        <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => setAddOpen(true)}>
          Add
        </Button>
      </Stack>

      {shoppingList.length === 0 ? (
        <EmptyState
          icon={<CheckCircleOutlineIcon sx={{ color: "success.main" }} />}
          title="Your shopping list is empty"
          subtitle='Add items manually or use "Shop All" from your meal plan'
        />
      ) : (
        <Box>
          {/* Grouped list */}
          <Stack spacing={1}>
            {grouped.map((group) => (
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
                  {group.items.map(({ item, originalIndex }, idx) => {
                    const isChecked = checkedItems.has(originalIndex);
                    return (
                      <React.Fragment key={originalIndex}>
                        {idx > 0 && <Divider component="li" />}
                        <ListItem
                          sx={{
                            py: 0.75,
                            px: 1,
                            cursor: "pointer",
                            "&:hover": { bgcolor: "action.hover" },
                            opacity: isChecked ? 0.5 : 1,
                          }}
                        >
                          <Checkbox
                            edge="start"
                            checked={isChecked}
                            onChange={() => toggleCheck(originalIndex)}
                            size="small"
                            sx={{ mr: 0.5 }}
                            inputProps={{ "aria-label": `Mark ${item.food} as checked` } as any}
                          />
                          <ListItemText
                            primary={item.food}
                            primaryTypographyProps={{
                              fontWeight: 500,
                              fontSize: "0.95rem",
                              sx: isChecked ? { textDecoration: "line-through" } : undefined,
                            }}
                            onClick={() => setEditIndex(originalIndex)}
                          />
                          <ListItemSecondaryAction>
                            <Chip
                              label={`${item.quantity.value} ${item.quantity.unit}`}
                              size="small"
                              variant="outlined"
                              sx={{ fontWeight: 600, fontSize: "0.8rem" }}
                              onClick={() => setEditIndex(originalIndex)}
                            />
                          </ListItemSecondaryAction>
                        </ListItem>
                      </React.Fragment>
                    );
                  })}
                </List>
              </Paper>
            ))}
          </Stack>

          {/* Bottom actions */}
          <Stack spacing={1.5} sx={{ mt: 3 }}>
            {checkedCount > 0 && (
              <Button
                variant="contained"
                color="success"
                fullWidth
                onClick={markCheckedBought}
                startIcon={<CheckCircleOutlineIcon />}
                sx={{ py: 1.5, borderRadius: 2 }}
              >
                Mark {checkedCount} Checked as Bought
              </Button>
            )}
            <Button
              variant={checkedCount > 0 ? "outlined" : "contained"}
              fullWidth
              onClick={markAllBought}
              startIcon={<CheckCircleOutlineIcon />}
              sx={{ py: 1.5, borderRadius: 2 }}
            >
              Mark All as Bought
            </Button>
            <Button
              variant="text"
              color="error"
              fullWidth
              onClick={() => { setShoppingList([]); setCheckedItems(new Set()); onSnackbar("Shopping list cleared"); }}
              sx={{ py: 1 }}
            >
              Clear List
            </Button>
          </Stack>
        </Box>
      )}

      {/* Add dialog */}
      <FoodItemDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleAdd}
        title="Add Item"
        nameLabel="Item"
      />

      {/* Edit dialog */}
      <FoodItemDialog
        open={editIndex !== null}
        onClose={() => setEditIndex(null)}
        onSave={handleEditSave}
        title="Edit Item"
        nameLabel="Item"
        initialName={editItem?.food || ""}
        initialAmount={editItem ? String(editItem.quantity.value) : ""}
        initialUnit={editItem?.quantity.unit || "pieces"}
        extraActions={
          <Stack sx={{ px: 3, pb: 1 }} spacing={1.5}>
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
            <Stack direction="row" justifyContent="flex-start">
              <Button color="error" onClick={handleDelete}>Delete</Button>
            </Stack>
          </Stack>
        }
      />
    </Box>
  );
}
