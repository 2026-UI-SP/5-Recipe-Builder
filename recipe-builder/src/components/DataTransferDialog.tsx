import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Stack,
  IconButton,
  LinearProgress,
  Alert,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import { QRCodeSVG } from "qrcode.react";
import { Html5Qrcode } from "html5-qrcode";
import { exportAppData, parseChunk, reassembleAndImport } from "../utils/dataTransfer";

interface DataTransferDialogProps {
  open: boolean;
  mode: "export" | "import";
  onClose: () => void;
}

export default function DataTransferDialog({ open, mode, onClose }: DataTransferDialogProps) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  // --- Export state ---
  const [chunks, setChunks] = useState<string[]>([]);
  const [chunkIndex, setChunkIndex] = useState(0);

  // --- Import state ---
  const [scannedParts, setScannedParts] = useState<Map<number, string>>(new Map());
  const [expectedTotal, setExpectedTotal] = useState<number | null>(null);
  const [scanError, setScanError] = useState("");
  const [importReady, setImportReady] = useState(false);
  const [confirmImport, setConfirmImport] = useState(false);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const scannerContainerId = "qr-scanner-container";

  // Generate chunks on export open
  useEffect(() => {
    if (open && mode === "export") {
      try {
        const data = exportAppData();
        setChunks(data);
        setChunkIndex(0);
      } catch {
        setScanError("Failed to export data");
      }
    }
  }, [open, mode]);

  // Reset import state
  useEffect(() => {
    if (open && mode === "import") {
      setScannedParts(new Map());
      setExpectedTotal(null);
      setScanError("");
      setImportReady(false);
      setConfirmImport(false);
    }
  }, [open, mode]);

  // Start/stop scanner
  const startScanner = useCallback(async () => {
    // Clean up any existing scanner
    if (scannerRef.current) {
      try { await scannerRef.current.stop(); } catch { /* ignore */ }
      scannerRef.current = null;
    }

    // Wait for DOM element
    await new Promise((r) => setTimeout(r, 300));
    const container = document.getElementById(scannerContainerId);
    if (!container) return;

    let scanner: Html5Qrcode;
    try {
      scanner = new Html5Qrcode(scannerContainerId);
    } catch {
      setScanError("Could not initialize camera scanner");
      return;
    }
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: "environment" },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        (decodedText) => {
          const parsed = parseChunk(decodedText);
          if (!parsed) {
            setScanError("Invalid QR code format");
            return;
          }
          setScanError("");
          setExpectedTotal(parsed.total);
          setScannedParts((prev) => {
            const next = new Map(prev);
            next.set(parsed.part, decodedText);
            if (next.size === parsed.total) {
              setImportReady(true);
              scanner.stop().catch(() => {});
            }
            return next;
          });
        },
        () => {} // ignore scan failures (no QR in frame)
      );
    } catch (err: any) {
      scannerRef.current = null;
      setScanError(err?.message || "Could not access camera. Please grant camera permission and try again.");
    }
  }, []);

  useEffect(() => {
    if (open && mode === "import") {
      startScanner();
    }
    return () => {
      const scanner = scannerRef.current;
      scannerRef.current = null;
      if (scanner) {
        try { scanner.stop().catch(() => {}); } catch { /* ignore */ }
      }
    };
  }, [open, mode, startScanner]);

  const handleImport = () => {
    const allChunks = Array.from(scannedParts.values());
    const success = reassembleAndImport(allChunks);
    if (success) {
      window.location.reload();
    } else {
      setScanError("Failed to import data. Some QR codes may be invalid.");
      setConfirmImport(false);
    }
  };

  const handleClose = () => {
    setChunks([]);
    setChunkIndex(0);
    setScannedParts(new Map());
    setExpectedTotal(null);
    setScanError("");
    setImportReady(false);
    setConfirmImport(false);
    onClose();
  };

  return (
    <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth fullScreen={isMobile}>
      <DialogTitle sx={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {mode === "export" ? "Export Data" : "Import Data"}
        <IconButton onClick={handleClose} size="small">
          <CloseIcon />
        </IconButton>
      </DialogTitle>

      <DialogContent>
        {mode === "export" ? (
          <Stack alignItems="center" spacing={2} sx={{ py: 2 }}>
            <Typography variant="body2" color="text.secondary" textAlign="center">
              Scan {chunks.length > 1 ? "each QR code" : "this QR code"} on your other device to transfer your data.
            </Typography>

            {chunks.length > 0 && (
              <Box
                sx={{
                  p: 2,
                  bgcolor: "white",
                  borderRadius: 2,
                  display: "flex",
                  justifyContent: "center",
                }}
              >
                <QRCodeSVG value={chunks[chunkIndex]} size={280} level="L" />
              </Box>
            )}

            {chunks.length > 1 && (
              <>
                <Stack direction="row" alignItems="center" spacing={2}>
                  <IconButton
                    onClick={() => setChunkIndex((i) => i - 1)}
                    disabled={chunkIndex === 0}
                    size="small"
                    sx={{ border: 1, borderColor: "divider" }}
                  >
                    <ArrowBackIcon fontSize="small" />
                  </IconButton>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {chunkIndex + 1} of {chunks.length}
                  </Typography>
                  <IconButton
                    onClick={() => setChunkIndex((i) => i + 1)}
                    disabled={chunkIndex === chunks.length - 1}
                    size="small"
                    sx={{ border: 1, borderColor: "divider" }}
                  >
                    <ArrowForwardIcon fontSize="small" />
                  </IconButton>
                </Stack>
                <LinearProgress
                  variant="determinate"
                  value={((chunkIndex + 1) / chunks.length) * 100}
                  sx={{ width: "100%", borderRadius: 1 }}
                />
              </>
            )}
          </Stack>
        ) : (
          <Stack spacing={2} sx={{ py: 1 }}>
            {!importReady && (
              <>
                <Typography variant="body2" color="text.secondary" textAlign="center">
                  Point your camera at the QR code{expectedTotal && expectedTotal > 1 ? "s" : ""} on the other device.
                </Typography>
                <Box
                  id={scannerContainerId}
                  sx={{
                    width: "100%",
                    maxWidth: 350,
                    mx: "auto",
                    borderRadius: 2,
                    overflow: "hidden",
                    "& video": { borderRadius: 2 },
                  }}
                />
                {expectedTotal && expectedTotal > 1 && (
                  <Box sx={{ textAlign: "center" }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      Scanned {scannedParts.size} of {expectedTotal} parts
                    </Typography>
                    <LinearProgress
                      variant="determinate"
                      value={(scannedParts.size / expectedTotal) * 100}
                      sx={{ mt: 1, borderRadius: 1 }}
                    />
                  </Box>
                )}
              </>
            )}

            {importReady && !confirmImport && (
              <Alert severity="success">
                All {expectedTotal} QR code{expectedTotal !== 1 ? "s" : ""} scanned successfully!
              </Alert>
            )}

            {confirmImport && (
              <Alert severity="warning">
                This will replace all your current data (recipes, meal plan, pantry, shopping list, and settings). This cannot be undone.
              </Alert>
            )}

            {scanError && <Alert severity="error">{scanError}</Alert>}
          </Stack>
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 3 }}>
        <Button onClick={handleClose}>Cancel</Button>
        {mode === "import" && importReady && !confirmImport && (
          <Button variant="contained" onClick={() => setConfirmImport(true)}>
            Import Data
          </Button>
        )}
        {mode === "import" && confirmImport && (
          <Button variant="contained" color="error" onClick={handleImport}>
            Confirm Replace All Data
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
