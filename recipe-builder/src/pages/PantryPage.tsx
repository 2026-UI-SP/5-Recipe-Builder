import React, { useMemo, useState } from "react";
import {
  Typography,
  TextField,
  Button,
  Chip,
  Box,
  Stack,
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
import InventoryIcon from "@mui/icons-material/Inventory2";
import { FoodItem } from "../data/types";
import { categorizeFood, CATEGORY_ORDER, CATEGORY_ICONS } from "../utils/foodCategories";
import FoodItemDialog from "../components/FoodItemDialog";
import EmptyState from "../components/EmptyState";

interface PantryPageProps {
  pantry: FoodItem[];
  setPantry: React.Dispatch<React.SetStateAction<FoodItem[]>>;
  onSnackbar: (message: string) => void;
}

export default function PantryPage({ pantry, setPantry, onSnackbar }: PantryPageProps) {
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("All");

  // Dialog state
  const [addOpen, setAddOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);

  const editItem = editIndex !== null ? pantry[editIndex] : null;

  const handleAdd = (name: string, amount: number, unit: string) => {
    setPantry((prev) => [...prev, { food: name, quantity: { value: amount, unit } }]);
    setAddOpen(false);
    onSnackbar(`Added ${name} to pantry`);
  };

  const handleEditSave = (name: string, amount: number, unit: string) => {
    if (editIndex === null) return;
    setPantry((prev) =>
      prev.map((item, i) =>
        i === editIndex ? { food: name, quantity: { value: amount, unit } } : item
      )
    );
    setEditIndex(null);
    onSnackbar(`Updated ${name}`);
  };

  const handleDelete = () => {
    if (editIndex === null) return;
    const item = pantry[editIndex];
    setPantry((prev) => prev.filter((_, i) => i !== editIndex));
    setEditIndex(null);
    onSnackbar(`Removed ${item.food} from pantry`);
  };

  // Search + categorize
  const searched = useMemo(() => {
    const q = search.trim().toLowerCase();
    return pantry
      .map((item, i) => ({ item, realIndex: i }))
      .filter((entry) => !q || entry.item.food.toLowerCase().includes(q));
  }, [pantry, search]);

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
        f.push({ label: category, icon: CATEGORY_ICONS[category] || "", count: categoryCounts[category] });
      }
    }

    const groups: { category: string; icon: string; items: typeof itemsWithIndex }[] = [];
    for (const category of CATEGORY_ORDER) {
      const categoryItems = itemsWithIndex
        .filter((e) => e.category === category)
        .sort((a, b) => a.item.food.localeCompare(b.item.food));
      if (categoryItems.length > 0) {
        groups.push({ category, icon: CATEGORY_ICONS[category] || "", items: categoryItems });
      }
    }

    return { filters: f, grouped: groups };
  }, [searched]);

  const safeFilter = filters.find((f) => f.label === activeFilter) ? activeFilter : "All";
  const filteredGroups = safeFilter === "All" ? grouped : grouped.filter((g) => g.category === safeFilter);

  return (
    <Box>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1 }}>
        {pantry.length > 0 && (
          <Chip label={`${pantry.length} item${pantry.length !== 1 ? "s" : ""}`} size="small" variant="outlined" />
        )}
        <Button variant="contained" startIcon={<AddIcon />} size="small" onClick={() => setAddOpen(true)}>
          Add
        </Button>
      </Stack>

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

      {pantry.length === 0 ? (
        <EmptyState
          icon={<InventoryIcon />}
          title="Your pantry is empty"
          subtitle='Tap "Add" to start tracking your ingredients'
        />
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
                        onClick={() => setEditIndex(realIndex)}
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
                            onClick={() => setEditIndex(realIndex)}
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

      {/* Add dialog */}
      <FoodItemDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        onSave={handleAdd}
        title="Add Ingredient"
        nameLabel="Ingredient"
      />

      {/* Edit dialog */}
      <FoodItemDialog
        open={editIndex !== null}
        onClose={() => setEditIndex(null)}
        onSave={handleEditSave}
        title="Edit Ingredient"
        nameLabel="Ingredient"
        initialName={editItem?.food || ""}
        initialAmount={editItem ? String(editItem.quantity.value) : ""}
        initialUnit={editItem?.quantity.unit || "pieces"}
        extraActions={
          <Stack direction="row" justifyContent="flex-start" sx={{ px: 3 }}>
            <Button color="error" onClick={handleDelete}>Delete</Button>
          </Stack>
        }
      />
    </Box>
  );
}
