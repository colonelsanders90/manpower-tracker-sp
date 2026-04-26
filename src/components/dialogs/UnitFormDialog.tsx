import { useState, useEffect } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import { useCreateBranch, useRenameUnit } from "@/hooks/useMutations";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Required for create mode (the parent of the new branch — usually RAiD L1). */
  parentUnitId?: number;
  /** Provide for edit mode. */
  unit?: { id: number; name: string };
};

export function UnitFormDialog({ open, onClose, parentUnitId, unit }: Props) {
  const isEdit = !!unit;
  const [name, setName] = useState(unit?.name ?? "");
  const [headTitle, setHeadTitle] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useCreateBranch();
  const rename = useRenameUnit();
  const busy = create.isPending || rename.isPending;

  useEffect(() => {
    if (open) {
      setName(unit?.name ?? "");
      setHeadTitle("");
      setError(null);
    }
  }, [open, unit]);

  async function handleSubmit() {
    setError(null);
    try {
      if (isEdit && unit) {
        await rename.mutateAsync({ id: unit.id, name });
      } else {
        if (parentUnitId == null) {
          setError("No parent unit specified.");
          return;
        }
        await create.mutateAsync({
          parentUnitId,
          name,
          headTitle: headTitle.trim() || null,
        });
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="xs" fullWidth>
      <DialogTitle>{isEdit ? "Rename branch" : "Add a branch"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            autoFocus
            label="Branch name"
            placeholder="e.g. SWiFT, CyDef"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
            disabled={busy}
          />
          {!isEdit && (
            <TextField
              label="Branch head title (optional)"
              placeholder="e.g. Hd SWiFT"
              helperText="If set, the branch head role is created automatically."
              value={headTitle}
              onChange={(e) => setHeadTitle(e.target.value)}
              fullWidth
              disabled={busy}
            />
          )}
          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={busy || !name.trim()}
        >
          {isEdit ? "Save" : "Create branch"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
