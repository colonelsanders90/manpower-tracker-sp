import { useState, useEffect } from "react";
import {
  Alert,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  useCreateIndividual,
  useUpdateIndividual,
} from "@/hooks/useMutations";
import { AdPersonPicker } from "@/components/shared/AdPersonPicker";
import { PROFILES, type Profile } from "@/lib/progression";

type IndividualEdit = {
  id: number;
  name: string;
  rank: string | null;
  specialisation: string | null;
  employeeId: string | null;
  email: string | null;
  isExternal: boolean;
  profile: Profile | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  individual?: IndividualEdit;
};

export function IndividualFormDialog({ open, onClose, individual }: Props) {
  const isEdit = !!individual;
  const [name, setName] = useState(individual?.name ?? "");
  const [rank, setRank] = useState(individual?.rank ?? "");
  const [spec, setSpec] = useState(individual?.specialisation ?? "");
  const [employeeId, setEmployeeId] = useState(individual?.employeeId ?? "");
  const [email, setEmail] = useState(individual?.email ?? "");
  const [isExternal, setIsExternal] = useState(individual?.isExternal ?? false);
  // "" = unassigned/null. Used as the empty string for MUI Select's value.
  const [profile, setProfile] = useState<Profile | "">(individual?.profile ?? "");
  const [error, setError] = useState<string | null>(null);

  const create = useCreateIndividual();
  const update = useUpdateIndividual();
  const busy = create.isPending || update.isPending;

  useEffect(() => {
    if (open) {
      setName(individual?.name ?? "");
      setRank(individual?.rank ?? "");
      setSpec(individual?.specialisation ?? "");
      setEmployeeId(individual?.employeeId ?? "");
      setEmail(individual?.email ?? "");
      setIsExternal(individual?.isExternal ?? false);
      setProfile(individual?.profile ?? "");
      setError(null);
    }
  }, [open, individual]);

  async function handleSubmit() {
    setError(null);
    try {
      if (isEdit && individual) {
        await update.mutateAsync({
          id: individual.id,
          name,
          rank: rank || null,
          specialisation: spec || null,
          employeeId: employeeId || null,
          email: email || null,
          profile: profile || null,
        });
      } else {
        await create.mutateAsync({
          name,
          rank: rank || null,
          specialisation: spec || null,
          employeeId: employeeId || null,
          email: email || null,
          isExternal,
          profile: profile || null,
        });
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Edit individual" : "Add an individual"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {!isEdit && (
            <>
              <AdPersonPicker
                onPick={(user) => {
                  setName(user.name);
                  if (user.email) setEmail(user.email);
                }}
              />
              <Divider sx={{ my: 1 }}>
                <Typography
                  variant="caption"
                  sx={{
                    color: "text.secondary",
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: 10,
                    textTransform: "uppercase",
                    letterSpacing: "0.07em",
                  }}
                >
                  Or enter manually
                </Typography>
              </Divider>
            </>
          )}
          <TextField
            autoFocus
            label="Name"
            placeholder="e.g. MAJ Jane Lim"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            fullWidth
            disabled={busy}
          />
          <Stack direction="row" spacing={2}>
            <TextField
              label="Rank"
              placeholder="MAJ / LTC / COL …"
              value={rank}
              onChange={(e) => setRank(e.target.value)}
              fullWidth
              disabled={busy}
            />
            <TextField
              label="Employee ID"
              value={employeeId}
              onChange={(e) => setEmployeeId(e.target.value)}
              fullWidth
              disabled={busy}
            />
          </Stack>
          <TextField
            label="Specialisation"
            placeholder="e.g. Software Engineering"
            value={spec}
            onChange={(e) => setSpec(e.target.value)}
            fullWidth
            disabled={busy}
          />
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            fullWidth
            disabled={busy}
          />
          <FormControl fullWidth disabled={busy}>
            <InputLabel id="ind-profile-label">Profile</InputLabel>
            <Select
              labelId="ind-profile-label"
              label="Profile"
              value={profile}
              onChange={(e) => setProfile(e.target.value as Profile | "")}
            >
              <MenuItem value="">
                <em>(unassigned)</em>
              </MenuItem>
              {PROFILES.map((p) => (
                <MenuItem key={p} value={p}>
                  {p}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          {!isEdit && (
            <FormControlLabel
              control={
                <Switch
                  checked={isExternal}
                  onChange={(e) => setIsExternal(e.target.checked)}
                  disabled={busy}
                />
              }
              label="External (not part of RAiD)"
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
          {isEdit ? "Save" : "Add individual"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
