import React, { useState, useEffect } from "react";
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
  Select,
  MenuItem,
  IconButton,
  CircularProgress,
  Alert,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import AutoAwesomeIcon from "@mui/icons-material/AutoAwesome";
import CloseIcon from "@mui/icons-material/Close";
import { RecipeIngredient } from "../data/types";
import { UNITS } from "../config/constants";

interface RecipeFormDialogProps {
  open: boolean;
  onClose: () => void;
  title: string;
  form: RecipeFormState;
  setForm: (updater: (prev: RecipeFormState) => RecipeFormState) => void;
  onSave: () => void;
  saveLabel: string;
  ai?: {
    prompt: string;
    setPrompt: (value: string) => void;
    loading: boolean;
    error: string;
    onGenerate: () => void;
  };
}

export interface RecipeFormState {
  title: string;
  description: string;
  ingredients: RecipeIngredient[];
  instructions: { step_number: number; description: string }[];
  prep_time_minutes: number;
  cook_time_minutes: number;
  servings: number;
  cuisine: string;
  difficulty: string;
  dietary_tags?: string[];
  nutrition_info?: any;
}

const EMPTY_INGREDIENT: RecipeIngredient = {
  food_item: "",
  quantity: { value: 0, unit: "pieces" },
};

/**
 * Text input for a quantity that tolerates partial decimal entries like "0." or ".5".
 * Holds its own draft string and only syncs a parsed float upward.
 */
function QtyInput({ value, onChange, sx }: { value: number; onChange: (n: number) => void; sx?: any }) {
  const [text, setText] = useState(value ? String(value) : "");

  useEffect(() => {
    const parsed = parseFloat(text);
    if (value !== (isNaN(parsed) ? 0 : parsed)) {
      setText(value ? String(value) : "");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <TextField
      size="small"
      placeholder="Qty"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        const val = e.target.value;
        if (val === "" || /^\d*\.?\d*$/.test(val)) {
          setText(val);
          onChange(val === "" || val === "." ? 0 : parseFloat(val) || 0);
        }
      }}
      sx={sx}
    />
  );
}

export default function RecipeFormDialog({
  open,
  onClose,
  title,
  form,
  setForm,
  onSave,
  saveLabel,
  ai,
}: RecipeFormDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const addIngredient = () => {
    setForm((f) => ({
      ...f,
      ingredients: [...f.ingredients, { ...EMPTY_INGREDIENT, quantity: { ...EMPTY_INGREDIENT.quantity } }],
    }));
  };

  const removeIngredient = (idx: number) => {
    setForm((f) => ({
      ...f,
      ingredients: f.ingredients.filter((_, i) => i !== idx),
    }));
  };

  const addStep = () => {
    setForm((f) => ({
      ...f,
      instructions: [...f.instructions, { step_number: f.instructions.length + 1, description: "" }],
    }));
  };

  const removeStep = (idx: number) => {
    setForm((f) => ({
      ...f,
      instructions: f.instructions
        .filter((_, i) => i !== idx)
        .map((s, i) => ({ ...s, step_number: i + 1 })),
    }));
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm" fullScreen={isMobile}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {title}
        {isMobile && (
          <IconButton onClick={onClose} edge="end" aria-label="Close">
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent>
        {/* AI generation section */}
        {ai && (
          <Box sx={{ mb: 2, mt: 1, p: 2, bgcolor: "action.hover", borderRadius: 2 }}>
            <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
              <AutoAwesomeIcon fontSize="small" color="primary" />
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Generate with AI</Typography>
            </Stack>
            <Stack spacing={1}>
              <TextField
                size="small"
                fullWidth
                placeholder="e.g. A spicy Thai coconut curry with shrimp"
                value={ai.prompt}
                onChange={(e) => ai.setPrompt(e.target.value)}
                disabled={ai.loading}
                onKeyDown={(e) => { if (e.key === "Enter") ai.onGenerate(); }}
              />
              <Button
                variant="contained"
                size="small"
                fullWidth={isMobile}
                onClick={ai.onGenerate}
                disabled={ai.loading || !ai.prompt.trim()}
              >
                {ai.loading ? <CircularProgress size={20} /> : "Generate"}
              </Button>
            </Stack>
            {ai.error && <Alert severity="error" sx={{ mt: 1 }}>{ai.error}</Alert>}
          </Box>
        )}

        {/* Recipe form fields */}
        <Stack spacing={2.5} sx={{ mt: ai ? 0 : 1 }}>
          <TextField
            label="Title"
            fullWidth
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            autoFocus={!isMobile}
          />
          <TextField
            label="Description"
            fullWidth
            multiline
            rows={2}
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />

          {/* Cuisine + Difficulty: stack on mobile */}
          <Stack direction={isMobile ? "column" : "row"} spacing={2}>
            <TextField
              label="Cuisine"
              fullWidth
              value={form.cuisine}
              onChange={(e) => setForm((f) => ({ ...f, cuisine: e.target.value }))}
            />
            <Select
              value={form.difficulty}
              onChange={(e) => setForm((f) => ({ ...f, difficulty: e.target.value }))}
              fullWidth={isMobile}
              sx={{ minWidth: isMobile ? undefined : 100 }}
            >
              {["Easy", "Medium", "Hard"].map((d) => (
                <MenuItem key={d} value={d}>{d}</MenuItem>
              ))}
            </Select>
          </Stack>

          {/* Prep / Cook / Servings: 2 rows on mobile */}
          <Stack direction="row" spacing={2} sx={{ flexWrap: "wrap", gap: isMobile ? 2 : 0 }}>
            <TextField
              label="Prep (min)"
              type="number"
              value={form.prep_time_minutes === 0 ? "" : form.prep_time_minutes}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, prep_time_minutes: v === "" ? 0 : Math.max(0, parseInt(v) || 0) }));
              }}
              inputProps={{ min: 0 }}
              sx={{ flex: 1, minWidth: isMobile ? "45%" : "auto" }}
            />
            <TextField
              label="Cook (min)"
              type="number"
              value={form.cook_time_minutes === 0 ? "" : form.cook_time_minutes}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, cook_time_minutes: v === "" ? 0 : Math.max(0, parseInt(v) || 0) }));
              }}
              inputProps={{ min: 0 }}
              sx={{ flex: 1, minWidth: isMobile ? "45%" : "auto" }}
            />
            <TextField
              label="Servings"
              type="number"
              value={form.servings === 0 ? "" : form.servings}
              onChange={(e) => {
                const v = e.target.value;
                setForm((f) => ({ ...f, servings: v === "" ? 0 : Math.max(0, parseInt(v) || 0) }));
              }}
              onBlur={() => setForm((f) => ({ ...f, servings: f.servings < 1 ? 1 : f.servings }))}
              inputProps={{ min: 1 }}
              sx={{ flex: 1, minWidth: isMobile ? "45%" : "auto" }}
            />
          </Stack>

          {/* Ingredients */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Ingredients</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addIngredient}>Add</Button>
            </Stack>
            <Stack spacing={1.5}>
              {form.ingredients.map((ing, idx) => (
                <Box key={idx}>
                  {/* On mobile: name on first row, qty + unit + delete on second row */}
                  {isMobile ? (
                    <Stack spacing={1}>
                      <TextField
                        size="small"
                        fullWidth
                        placeholder="Ingredient"
                        value={ing.food_item}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            ingredients: f.ingredients.map((item, i) =>
                              i === idx ? { ...item, food_item: e.target.value } : item
                            ),
                          }))
                        }
                      />
                      <Stack direction="row" spacing={1} alignItems="center">
                        <QtyInput
                          value={ing.quantity.value}
                          onChange={(n) =>
                            setForm((f) => ({
                              ...f,
                              ingredients: f.ingredients.map((item, i) =>
                                i === idx
                                  ? { ...item, quantity: { ...item.quantity, value: n } }
                                  : item
                              ),
                            }))
                          }
                          sx={{ flex: 1 }}
                        />
                        <Select
                          size="small"
                          value={ing.quantity.unit}
                          onChange={(e) =>
                            setForm((f) => ({
                              ...f,
                              ingredients: f.ingredients.map((item, i) =>
                                i === idx
                                  ? { ...item, quantity: { ...item.quantity, unit: e.target.value } }
                                  : item
                              ),
                            }))
                          }
                          sx={{ flex: 1 }}
                        >
                          {UNITS.map((u) => (
                            <MenuItem key={u} value={u}>{u}</MenuItem>
                          ))}
                        </Select>
                        <IconButton size="small" color="error" onClick={() => removeIngredient(idx)} disabled={form.ingredients.length <= 1}>
                          <DeleteOutlineIcon fontSize="small" />
                        </IconButton>
                      </Stack>
                    </Stack>
                  ) : (
                    <Stack direction="row" spacing={1} alignItems="center">
                      <TextField
                        size="small"
                        placeholder="Ingredient"
                        value={ing.food_item}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            ingredients: f.ingredients.map((item, i) =>
                              i === idx ? { ...item, food_item: e.target.value } : item
                            ),
                          }))
                        }
                        sx={{ flex: 2 }}
                      />
                      <QtyInput
                        value={ing.quantity.value}
                        onChange={(n) =>
                          setForm((f) => ({
                            ...f,
                            ingredients: f.ingredients.map((item, i) =>
                              i === idx
                                ? { ...item, quantity: { ...item.quantity, value: n } }
                                : item
                            ),
                          }))
                        }
                        sx={{ flex: 0.7 }}
                      />
                      <Select
                        size="small"
                        value={ing.quantity.unit}
                        onChange={(e) =>
                          setForm((f) => ({
                            ...f,
                            ingredients: f.ingredients.map((item, i) =>
                              i === idx
                                ? { ...item, quantity: { ...item.quantity, unit: e.target.value } }
                                : item
                            ),
                          }))
                        }
                        sx={{ flex: 1 }}
                      >
                        {UNITS.map((u) => (
                          <MenuItem key={u} value={u}>{u}</MenuItem>
                        ))}
                      </Select>
                      <IconButton size="small" color="error" onClick={() => removeIngredient(idx)} disabled={form.ingredients.length <= 1}>
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </Stack>
                  )}
                </Box>
              ))}
            </Stack>
          </Box>

          {/* Instructions */}
          <Box>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Instructions</Typography>
              <Button size="small" startIcon={<AddIcon />} onClick={addStep}>Add Step</Button>
            </Stack>
            <Stack spacing={1}>
              {form.instructions.map((step, idx) => (
                <Stack key={idx} direction="row" spacing={1} alignItems="flex-start">
                  <Chip label={idx + 1} size="small" sx={{ mt: 0.75 }} />
                  <TextField
                    size="small"
                    fullWidth
                    multiline
                    placeholder={`Step ${idx + 1}`}
                    value={step.description}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        instructions: f.instructions.map((s, i) =>
                          i === idx ? { ...s, description: e.target.value } : s
                        ),
                      }))
                    }
                  />
                  <IconButton size="small" color="error" onClick={() => removeStep(idx)} disabled={form.instructions.length <= 1}>
                    <DeleteOutlineIcon fontSize="small" />
                  </IconButton>
                </Stack>
              ))}
            </Stack>
          </Box>
        </Stack>
      </DialogContent>
      <DialogActions sx={{ px: 3, pb: 3 }}>
        {!isMobile && <Button onClick={onClose}>Cancel</Button>}
        <Button
          variant="contained"
          onClick={onSave}
          fullWidth={isMobile}
          size={isMobile ? "large" : "medium"}
        >
          {saveLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
