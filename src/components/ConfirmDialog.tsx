import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
} from "@mui/material";
import { useState } from "react";

export type ConfirmState = {
  title: string;
  message: string;
  confirmLabel?: string;
  destructive?: boolean;
  onConfirm: () => void | Promise<void>;
};

/**
 * Hook that returns an `ask(state)` to invoke the confirm dialog plus the
 * <ConfirmHost> component to mount once near the page root.
 */
export function useConfirm() {
  const [state, setState] = useState<ConfirmState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  function ask(s: ConfirmState) {
    setError(null);
    setBusy(false);
    setState(s);
  }

  async function handleConfirm() {
    if (!state) return;
    setBusy(true);
    setError(null);
    try {
      await state.onConfirm();
      setState(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  }

  function handleCancel() {
    if (busy) return;
    setState(null);
  }

  const ConfirmHost = (
    <Dialog
      open={state != null}
      onClose={handleCancel}
      maxWidth="xs"
      fullWidth
    >
      {state && (
        <>
          <DialogTitle>{state.title}</DialogTitle>
          <DialogContent>
            <DialogContentText sx={{ whiteSpace: "pre-line" }}>
              {state.message}
            </DialogContentText>
            {error && (
              <Alert severity="error" sx={{ mt: 2 }}>
                {error}
              </Alert>
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={handleCancel} disabled={busy}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              variant="contained"
              color={state.destructive ? "error" : "primary"}
              disabled={busy}
            >
              {state.confirmLabel ?? "Confirm"}
            </Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );

  return { ask, ConfirmHost };
}
