import { useState, useEffect } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import { useCreateRole, useUpdateRole } from "@/hooks/useMutations";
import type { UnitLevel } from "@/types/units";

type RoleEdit = {
  id: number;
  title: string;
  isHead: boolean;
  specialisation: string | null;
  establishmentRank: string | null;
  establishmentVocation: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** For create mode — parent unit context. */
  unitId?: number;
  unitLevel?: UnitLevel;
  /** For edit mode. */
  role?: RoleEdit;
};

export function RoleFormDialog({
  open,
  onClose,
  unitId,
  unitLevel,
  role,
}: Props) {
  const isEdit = !!role;
  const [title, setTitle] = useState(role?.title ?? "");
  const [isHead, setIsHead] = useState(role?.isHead ?? false);
  const [spec, setSpec] = useState(role?.specialisation ?? "");
  const [estRank, setEstRank] = useState(role?.establishmentRank ?? "");
  const [estVoc, setEstVoc] = useState(role?.establishmentVocation ?? "");
  const [error, setError] = useState<string | null>(null);

  const create = useCreateRole();
  const update = useUpdateRole();
  const busy = create.isPending || update.isPending;

  useEffect(() => {
    if (open) {
      setTitle(role?.title ?? "");
      setIsHead(role?.isHead ?? false);
      setSpec(role?.specialisation ?? "");
      setEstRank(role?.establishmentRank ?? "");
      setEstVoc(role?.establishmentVocation ?? "");
      setError(null);
    }
  }, [open, role]);

  async function handleSubmit() {
    setError(null);
    try {
      if (isEdit && role) {
        await update.mutateAsync({
          id: role.id,
          title,
          isHead,
          specialisation: spec || null,
          establishmentRank: estRank || null,
          establishmentVocation: estVoc || null,
        });
      } else {
        if (unitId == null) {
          setError("No parent unit specified.");
          return;
        }
        await create.mutateAsync({
          unitId,
          title,
          // Head roles snap to unit's level on the server; non-head roles
          // default to L3 inside L2 units, L1 inside L1 unit.
          level: unitLevel === "L1" ? "L1" : "L3",
          isHead,
          specialisation: spec || null,
          establishmentRank: estRank || null,
          establishmentVocation: estVoc || null,
        });
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Edit role" : "Add a role"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField
            autoFocus
            label="Role title"
            placeholder="e.g. Software Engineer, Hd CyDef"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            fullWidth
            disabled={busy}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Establishment rank"
              placeholder="e.g. LTC, ME6"
              value={estRank}
              onChange={(e) => setEstRank(e.target.value)}
              fullWidth
              disabled={busy}
            />
            <TextField
              label="Vocation"
              placeholder="e.g. AAO, AFE"
              value={estVoc}
              onChange={(e) => setEstVoc(e.target.value)}
              fullWidth
              disabled={busy}
            />
          </Stack>
          <TextField
            label="Specialisation"
            placeholder="Free text — optional"
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            fullWidth
            disabled={busy}
          />
          <FormControlLabel
            control={
              <Switch
                checked={isHead}
                onChange={(e) => setIsHead(e.target.checked)}
                disabled={busy}
              />
            }
            label="Head role"
          />
          {isHead && (
            <Typography variant="caption" sx={{ color: "text.secondary", lineHeight: 1.4 }}>
              Head roles auto-snap their level to the parent unit and replace
              any existing head on this branch.
            </Typography>
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
          disabled={busy || !title.trim()}
        >
          {isEdit ? "Save" : "Add role"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
