import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Box,
  Typography,
  Button,
  Stack,
  Paper,
  IconButton,
  alpha,
  useTheme,
  LinearProgress,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";

export interface TourStep {
  /** data-tour attribute value to highlight */
  target: string;
  /** Title shown in the tooltip card */
  title: string;
  /** Body text */
  body: string;
  /** Which tab to switch to before showing this step (-1 = no switch) */
  tab: number;
  /** Preferred placement of the tooltip relative to the target */
  placement: "above" | "below";
}

export const TOUR_STEPS: TourStep[] = [
  {
    target: "tour-settings-btn",
    title: "Settings",
    body: "Tap here to choose an AI provider (OpenAI or free OpenRouter) and add your API key. This powers AI meal plan generation. Your key stays in your browser and is never shared.",
    tab: -1,
    placement: "below",
  },
  {
    target: "tour-generate-btn",
    title: "Generate a Meal Plan",
    body: "Tap this button to open the meal plan generator. Choose how many days, which meals, dietary needs, budget, and more — the AI builds your whole week.",
    tab: 0,
    placement: "below",
  },
  {
    target: "tour-day-card",
    title: "Your Meal Plan",
    body: "Each day shows your Breakfast, Lunch, and Dinner. Tap a meal to see the recipe, swap it, or remove it. On mobile, swipe left and right to change days.",
    tab: 0,
    placement: "above",
  },
  {
    target: "tour-nav-recipes",
    title: "Recipes Tab",
    body: "Browse all your recipes here. You can add your own manually or use AI to generate one from a description like \"quick chicken stir-fry\".",
    tab: 1,
    placement: "above",
  },
  {
    target: "tour-nav-pantry",
    title: "Pantry Tab",
    body: "Add ingredients you already have at home. The AI can prioritize these when generating meal plans so nothing goes to waste.",
    tab: 2,
    placement: "above",
  },
  {
    target: "tour-nav-shopping",
    title: "Shopping List",
    body: "After generating a meal plan, tap the cart icon on the Plan tab to auto-generate a shopping list. It combines all ingredients and subtracts what's in your pantry.",
    tab: 3,
    placement: "above",
  },
  {
    target: "tour-help-btn",
    title: "Need Help Again?",
    body: "You can reopen this tour anytime by tapping the help icon. Happy cooking!",
    tab: -1,
    placement: "below",
  },
];

interface HelpGuideProps {
  open: boolean;
  onClose: () => void;
  onSetTab: (tab: number) => void;
}

const PADDING = 8;
const BORDER_RADIUS = 12;

export default function HelpGuide({ open, onClose, onSetTab }: HelpGuideProps) {
  const theme = useTheme();
  const [step, setStep] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const current = TOUR_STEPS[step];

  const measureTarget = useCallback(() => {
    if (!open) return;
    const el = document.querySelector(`[data-tour="${current.target}"]`);
    if (el) {
      // Scroll the element into view so there's room for the tooltip
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      // Measure after scroll settles (two passes: immediate + delayed)
      requestAnimationFrame(() => setTargetRect(el.getBoundingClientRect()));
      setTimeout(() => setTargetRect(el.getBoundingClientRect()), 400);
    } else {
      setTargetRect(null);
    }
  }, [open, current.target]);

  // Switch tab and measure after render
  useEffect(() => {
    if (!open) return;
    if (current.tab >= 0) {
      onSetTab(current.tab);
    }
    // Delay to let tab content render and scroll settle
    const timer = setTimeout(measureTarget, 300);
    return () => clearTimeout(timer);
  }, [open, step, current.tab, onSetTab, measureTarget]);

  // Re-measure on scroll/resize
  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);
    return () => {
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [open, measureTarget]);

  // Reset step when opening
  useEffect(() => {
    if (open) setStep(0);
  }, [open]);

  if (!open) return null;

  const isFirst = step === 0;
  const isLast = step === TOUR_STEPS.length - 1;
  const progress = ((step + 1) / TOUR_STEPS.length) * 100;

  const handleNext = () => {
    if (isLast) {
      onClose();
    } else {
      setStep((s) => s + 1);
    }
  };

  const handleBack = () => {
    if (!isFirst) setStep((s) => s - 1);
  };

  // Compute spotlight cutout and tooltip position
  let spotlightStyle: React.CSSProperties = {};
  let tooltipTop = "50%";
  let tooltipTransform = "translate(-50%, -50%)";

  if (targetRect) {
    const x = targetRect.left - PADDING;
    const y = targetRect.top - PADDING;
    const w = targetRect.width + PADDING * 2;
    const h = targetRect.height + PADDING * 2;

    spotlightStyle = {
      clipPath: `polygon(
        0% 0%, 0% 100%, 100% 100%, 100% 0%, 0% 0%,
        ${x}px ${y}px,
        ${x}px ${y + h}px,
        ${x + w}px ${y + h}px,
        ${x + w}px ${y}px,
        ${x}px ${y}px
      )`,
    };

    const tooltipMaxHeight = 220;
    const gap = 12;
    const bottomNavHeight = 72;
    const maxBottom = window.innerHeight - bottomNavHeight;

    if (current.placement === "below") {
      const belowY = targetRect.bottom + PADDING + gap;
      if (belowY + tooltipMaxHeight < maxBottom) {
        tooltipTop = `${belowY}px`;
        tooltipTransform = "translateX(-50%)";
      } else {
        tooltipTop = `${targetRect.top - PADDING - gap}px`;
        tooltipTransform = "translate(-50%, -100%)";
      }
    } else {
      const aboveY = targetRect.top - PADDING - gap;
      const belowY = targetRect.bottom + PADDING + gap;
      const fitsAbove = aboveY - tooltipMaxHeight > 0;
      const fitsBelow = belowY + tooltipMaxHeight < maxBottom;

      if (fitsAbove) {
        tooltipTop = `${aboveY}px`;
        tooltipTransform = "translate(-50%, -100%)";
      } else if (fitsBelow) {
        tooltipTop = `${belowY}px`;
        tooltipTransform = "translateX(-50%)";
      } else {
        // Neither fits cleanly — pin the tooltip so its bottom edge
        // sits just above the bottom nav with some breathing room
        const pinned = maxBottom - tooltipMaxHeight - 8;
        tooltipTop = `${Math.max(8, pinned)}px`;
        tooltipTransform = "translateX(-50%)";
      }
    }
  }

  return (
    <>
      {/* Backdrop with spotlight cutout */}
      <Box
        onClick={handleNext}
        sx={{
          position: "fixed",
          inset: 0,
          zIndex: 1400,
          bgcolor: alpha(theme.palette.common.black, 0.6),
          transition: "clip-path 0.3s ease",
          cursor: "pointer",
          ...spotlightStyle,
        }}
      />

      {/* Spotlight border ring */}
      {targetRect && (
        <Box
          sx={{
            position: "fixed",
            left: targetRect.left - PADDING,
            top: targetRect.top - PADDING,
            width: targetRect.width + PADDING * 2,
            height: targetRect.height + PADDING * 2,
            borderRadius: `${BORDER_RADIUS}px`,
            border: `2px solid ${alpha(theme.palette.primary.main, 0.7)}`,
            boxShadow: `0 0 0 4px ${alpha(theme.palette.primary.main, 0.2)}`,
            zIndex: 1401,
            pointerEvents: "none",
            transition: "all 0.3s ease",
          }}
        />
      )}

      {/* Tooltip card */}
      <Paper
        ref={tooltipRef}
        elevation={8}
        sx={{
          position: "fixed",
          left: "50%",
          top: tooltipTop,
          transform: tooltipTransform,
          zIndex: 1402,
          width: { xs: "calc(100vw - 32px)", sm: 380 },
          maxWidth: 420,
          borderRadius: 3,
          overflow: "hidden",
          transition: "top 0.3s ease, transform 0.3s ease",
        }}
      >
        {/* Progress bar */}
        <LinearProgress
          variant="determinate"
          value={progress}
          sx={{
            height: 3,
            bgcolor: alpha(theme.palette.primary.main, 0.1),
          }}
        />

        <Box sx={{ p: 2.5, pb: 1.5 }}>
          {/* Header */}
          <Stack direction="row" alignItems="flex-start" justifyContent="space-between" sx={{ mb: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography
                variant="caption"
                sx={{
                  color: "primary.main",
                  fontWeight: 700,
                  letterSpacing: 0.5,
                  textTransform: "uppercase",
                  fontSize: "0.65rem",
                }}
              >
                Step {step + 1} of {TOUR_STEPS.length}
              </Typography>
              <Typography variant="subtitle1" sx={{ fontWeight: 700, lineHeight: 1.3 }}>
                {current.title}
              </Typography>
            </Box>
            <IconButton size="small" onClick={onClose} sx={{ mt: -0.5, mr: -0.5 }}>
              <CloseIcon fontSize="small" />
            </IconButton>
          </Stack>

          {/* Body */}
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2, lineHeight: 1.6 }}>
            {current.body}
          </Typography>

          {/* Navigation */}
          <Stack direction="row" alignItems="center" justifyContent="space-between">
            <Button
              size="small"
              onClick={onClose}
              sx={{ color: "text.disabled", textTransform: "none", fontSize: "0.8rem" }}
            >
              Skip tour
            </Button>
            <Stack direction="row" spacing={1}>
              {!isFirst && (
                <IconButton size="small" onClick={handleBack} sx={{ border: 1, borderColor: "divider" }}>
                  <ArrowBackIcon fontSize="small" />
                </IconButton>
              )}
              <Button
                variant="contained"
                size="small"
                onClick={handleNext}
                endIcon={!isLast ? <ArrowForwardIcon fontSize="small" /> : undefined}
                sx={{ textTransform: "none", borderRadius: 2, px: 2 }}
              >
                {isLast ? "Done" : "Next"}
              </Button>
            </Stack>
          </Stack>
        </Box>
      </Paper>
    </>
  );
}
