import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@mui/material";
import { onCriticalError, downloadLog } from "@/lib/diagnosticLog";

/**
 * Listens for critical errors (window.onerror, unhandledrejection,
 * ErrorBoundary) and surfaces a modal with a Download log button. Lives
 * OUTSIDE ErrorBoundary so it survives render crashes.
 */
export default function GlobalErrorDialog() {
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    return onCriticalError((m) => setMessage(m));
  }, []);

  const open = message != null;

  return (
    <Dialog open={open} onClose={() => setMessage(null)} maxWidth="sm" fullWidth>
      <DialogTitle>Unexpected error</DialogTitle>
      <DialogContent>
        <Alert severity="error">{message ?? ""}</Alert>
      </DialogContent>
      <DialogActions>
        <Button onClick={downloadLog}>Download log</Button>
        <Button onClick={() => setMessage(null)} variant="contained">
          Dismiss
        </Button>
      </DialogActions>
    </Dialog>
  );
}
