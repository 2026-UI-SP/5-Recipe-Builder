import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  Button,
  Stack,
  IconButton,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { UNITS } from "../config/constants";

interface FoodItemDialogProps {
  open: boolean;
  onClose: () => void;
  onSave: (name: string, amount: number, unit: string) => void;
  title: string;
  nameLabel: string;
  initialName?: string;
  initialAmount?: string;
  initialUnit?: string;
  extraActions?: React.ReactNode;
}

export default function FoodItemDialog({
  open,
  onClose,
  onSave,
  title,
  nameLabel,
  initialName = "",
  initialAmount = "",
  initialUnit = "pieces",
  extraActions,
}: FoodItemDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const [name, setName] = useState(initialName);
  const [amount, setAmount] = useState(initialAmount);
  const [unit, setUnit] = useState(initialUnit);

  useEffect(() => {
    if (open) {
      setName(initialName);
      setAmount(initialAmount);
      setUnit(initialUnit);
    }
  }, [open, initialName, initialAmount, initialUnit]);

  const handleSave = () => {
    const trimmed = name.trim();
    const value = parseFloat(amount);
    if (!trimmed || isNaN(value) || value <= 0) return;
    onSave(trimmed, value, unit);
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xs"
      fullScreen={isMobile}
    >
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {title}
        {isMobile && (
          <IconButton onClick={onClose} edge="end" aria-label="Close">
            <CloseIcon />
          </IconButton>
        )}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2.5} sx={{ mt: 1 }}>
          <TextField
            label={nameLabel}
            fullWidth
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSave()}
            autoFocus={!isMobile}
          />
          <TextField
            label="Amount"
            inputMode="decimal"
            fullWidth
            value={amount}
            onChange={(e) => {
              const val = e.target.value;
              if (val === "" || /^\d*\.?\d*$/.test(val)) setAmount(val);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") { handleSave(); return; }
              if (
                e.key.length === 1 &&
                !e.ctrlKey && !e.metaKey &&
                !/[\d.]/.test(e.key)
              ) e.preventDefault();
            }}
            inputProps={{ min: 0, step: "any" }}
          />
          <Select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            fullWidth
          >
            {UNITS.map((u) => (
              <MenuItem key={u} value={u}>{u}</MenuItem>
            ))}
          </Select>
        </Stack>
      </DialogContent>
      {extraActions}
      <DialogActions sx={{ px: 3, pb: 3, pt: 1 }}>
        {!isMobile && <Button onClick={onClose}>Cancel</Button>}
        <Button
          variant="contained"
          onClick={handleSave}
          fullWidth={isMobile}
          size={isMobile ? "large" : "medium"}
        >
          {initialName ? "Save" : "Add"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
