// Slim "+ Add DTCO" dialog. Admin picks a person from AD, optionally types
// digital skills, and we upsert an INDIVIDUAL row with IsDTCO=true.
//
// If the picked person already exists in INDIVIDUALS (matched by email,
// fallback to name), we just flip IsDTCO=true and update DTCOSkills — no
// duplicate row. If they don't exist yet, we create with IsExternal=true.

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import { AdPersonPicker } from "@/components/shared/AdPersonPicker";
import { useUpsertDTCO } from "@/hooks/useMutations";

type Props = {
  open: boolean;
  onClose: () => void;
};

export function DTCOFormDialog({ open, onClose }: Props) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState<string | null>(null);
  const [skills, setSkills] = useState("");
  const [error, setError] = useState<string | null>(null);

  const upsert = useUpsertDTCO();
  const busy = upsert.isPending;

  useEffect(() => {
    if (open) {
      setName("");
      setEmail(null);
      setSkills("");
      setError(null);
    }
  }, [open]);

  async function handleSubmit() {
    setError(null);
    try {
      if (!name.trim()) {
        setError("Pick a person from Active Directory first.");
        return;
      }
      await upsert.mutateAsync({
        name,
        email,
        skills: skills.trim() || null,
      });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        Add DTCO
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          Dual Track Career Officer — pick from AD, then add their digital skills.
        </Typography>
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <AdPersonPicker
            onPick={(user) => {
              setName(user.name);
              setEmail(user.email);
            }}
          />
          {name && (
            <Typography variant="body2" sx={{ color: "text.secondary" }}>
              Selected: <strong>{name}</strong>
              {email && ` · ${email}`}
            </Typography>
          )}
          <TextField
            label="Digital skills"
            placeholder="e.g. Cyber Ops, Cloud Architecture, ML/AI"
            value={skills}
            onChange={(e) => setSkills(e.target.value)}
            fullWidth
            multiline
            rows={3}
            disabled={busy}
            helperText="Free text — comma-separated or short prose."
          />
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
          Add to DTCO
        </Button>
      </DialogActions>
    </Dialog>
  );
}
