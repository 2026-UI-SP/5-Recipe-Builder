import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Box,
  Typography,
  Button,
  Stepper,
  Step,
  StepLabel,
  StepContent,
  Paper,
  LinearProgress,
  Chip,
  Stack,
  IconButton,
} from "@mui/material";
import TimerIcon from "@mui/icons-material/Timer";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import PauseIcon from "@mui/icons-material/Pause";
import RestartAltIcon from "@mui/icons-material/RestartAlt";
import ScreenLockPortraitIcon from "@mui/icons-material/ScreenLockPortrait";
import { Recipe, FoodItem } from "../data/types";
import { deductIngredients } from "../utils/helpers";

interface CookModePageProps {
  recipe: Recipe;
  pantry: FoodItem[];
  setPantry: React.Dispatch<React.SetStateAction<FoodItem[]>>;
  onExit: () => void;
  onSnackbar: (message: string) => void;
  onRecipeCooked: (id: string) => void;
}

export default function CookModePage({
  recipe,
  pantry,
  setPantry,
  onExit,
  onSnackbar,
  onRecipeCooked,
}: CookModePageProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [timerSeconds, setTimerSeconds] = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const [wakeLockActive, setWakeLockActive] = useState(false);

  const wakeLockSupported = "wakeLock" in navigator;

  const currentInstruction = recipe.instructions[activeStep];
  const allDone = completedSteps.size === recipe.instructions.length;

  const releaseWakeLock = useCallback(async () => {
    if (wakeLockRef.current) {
      await wakeLockRef.current.release();
      wakeLockRef.current = null;
      setWakeLockActive(false);
    }
  }, []);

  const requestWakeLock = useCallback(async () => {
    if (!wakeLockSupported) return;
    try {
      wakeLockRef.current = await navigator.wakeLock.request("screen");
      setWakeLockActive(true);
      wakeLockRef.current.addEventListener("release", () => {
        setWakeLockActive(false);
        wakeLockRef.current = null;
      });
    } catch {
      // Wake lock request can fail (e.g. low battery)
      setWakeLockActive(false);
    }
  }, [wakeLockSupported]);

  // Re-acquire wake lock when tab becomes visible again
  useEffect(() => {
    const handleVisibilityChange = async () => {
      if (document.visibilityState === "visible" && timerRunning && wakeLockSupported) {
        await requestWakeLock();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => document.removeEventListener("visibilitychange", handleVisibilityChange);
  }, [timerRunning, wakeLockSupported, requestWakeLock]);

  const stopTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setTimerRunning(false);
    releaseWakeLock();
  }, [releaseWakeLock]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (wakeLockRef.current) {
        wakeLockRef.current.release().catch(() => {});
        wakeLockRef.current = null;
      }
    };
  }, []);

  const startTimer = async (minutes: number) => {
    stopTimer();
    setTimerSeconds(minutes * 60);
    setTimerRunning(true);
    await requestWakeLock();
    timerRef.current = setInterval(() => {
      setTimerSeconds((prev) => {
        if (prev === null || prev <= 1) {
          stopTimer();
          onSnackbar("Timer done!");
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const toggleTimer = async () => {
    if (timerRunning) {
      stopTimer();
    } else if (timerSeconds !== null && timerSeconds > 0) {
      setTimerRunning(true);
      await requestWakeLock();
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev === null || prev <= 1) {
            stopTimer();
            onSnackbar("Timer done!");
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
  };

  const resetTimer = () => {
    stopTimer();
    if (currentInstruction?.duration_minutes) {
      setTimerSeconds(currentInstruction.duration_minutes * 60);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const handleCompleteStep = () => {
    stopTimer();
    setCompletedSteps((prev) => new Set(prev).add(activeStep));
    if (activeStep < recipe.instructions.length - 1) {
      setActiveStep(activeStep + 1);
      setTimerSeconds(null);
    }
  };

  const handleFinishCooking = () => {
    setPantry((prev) => deductIngredients(prev, recipe));
    onRecipeCooked(recipe.id);
    onSnackbar(`Finished cooking ${recipe.title}! Ingredients deducted from pantry.`);
    onExit();
  };

  const progress =
    (completedSteps.size / recipe.instructions.length) * 100;

  return (
    <Box>
      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 2 }}>
        <IconButton onClick={onExit} aria-label="Exit cook mode">
          <ArrowBackIcon />
        </IconButton>
        <Typography variant="h5" sx={{ fontWeight: 600 }}>
          {recipe.title}
        </Typography>
      </Stack>

      <LinearProgress
        variant="determinate"
        value={progress}
        sx={{ mb: 3, height: 8, borderRadius: 4 }}
      />
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3 }}>
        <Typography variant="body2" color="text.secondary">
          Step {activeStep + 1} of {recipe.instructions.length}
          {allDone ? " — All steps complete!" : ""}
        </Typography>
        {wakeLockActive && (
          <Chip
            icon={<ScreenLockPortraitIcon />}
            label="Screen on"
            size="small"
            color="success"
            variant="outlined"
          />
        )}
      </Stack>

      <Stepper activeStep={activeStep} orientation="vertical">
        {recipe.instructions.map((step, index) => (
          <Step key={index} completed={completedSteps.has(index)}>
            <StepLabel
              onClick={() => {
                setActiveStep(index);
                stopTimer();
                setTimerSeconds(null);
              }}
              sx={{ cursor: "pointer" }}
            >
              <Stack direction="row" spacing={1} alignItems="center">
                <span>Step {step.step_number}</span>
                {step.duration_minutes && (
                  <Chip
                    icon={<TimerIcon />}
                    label={`${step.duration_minutes} min`}
                    size="small"
                    variant="outlined"
                  />
                )}
                {completedSteps.has(index) && (
                  <CheckCircleIcon color="success" fontSize="small" />
                )}
              </Stack>
            </StepLabel>
            <StepContent>
              <Typography sx={{ mb: 2 }}>{step.description}</Typography>

              {step.duration_minutes && (
                <Paper
                  variant="outlined"
                  sx={{ p: 2, mb: 2 }}
                >
                  <Stack
                    direction="row"
                    spacing={2}
                    alignItems="center"
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <TimerIcon color="primary" />
                    <Typography
                      variant="h4"
                      sx={{ fontFamily: "monospace", fontWeight: 700 }}
                    >
                      {timerSeconds !== null
                        ? formatTime(timerSeconds)
                        : formatTime(step.duration_minutes * 60)}
                    </Typography>
                    {timerSeconds === null ? (
                      <Button
                        variant="contained"
                        size="small"
                        startIcon={<PlayArrowIcon />}
                        onClick={() => startTimer(step.duration_minutes!)}
                      >
                        Start
                      </Button>
                    ) : (
                      <>
                        <IconButton onClick={toggleTimer} color="primary" aria-label={timerRunning ? "Pause timer" : "Resume timer"}>
                          {timerRunning ? <PauseIcon /> : <PlayArrowIcon />}
                        </IconButton>
                        <IconButton onClick={resetTimer} color="default" aria-label="Reset timer">
                          <RestartAltIcon />
                        </IconButton>
                      </>
                    )}
                  </Stack>
                </Paper>
              )}

              <Box>
                <Button
                  variant="contained"
                  onClick={handleCompleteStep}
                  disabled={completedSteps.has(index)}
                >
                  {index === recipe.instructions.length - 1
                    ? "Complete Final Step"
                    : "Mark Complete & Next"}
                </Button>
              </Box>
            </StepContent>
          </Step>
        ))}
      </Stepper>

      {allDone && (
        <Paper sx={{ p: 3, mt: 3, textAlign: "center" }}>
          <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            All steps complete!
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Used ingredients will be deducted from your pantry.
          </Typography>
          <Button
            variant="contained"
            size="large"
            onClick={handleFinishCooking}
          >
            Finish Cooking
          </Button>
        </Paper>
      )}
    </Box>
  );
}
