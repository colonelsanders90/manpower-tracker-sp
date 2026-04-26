import { useState, useEffect } from "react";
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
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
import { useCreatePosting, useUpdatePosting } from "@/hooks/useMutations";
import type { PostingStatus } from "@/types/postings";
import type { IndividualListItem } from "@/types/individuals";
import type { RoleListItem } from "@/types/roles";

type PostingEdit = {
  id: number;
  individualName: string;
  roleTitle: string;
  unitName: string;
  status: PostingStatus;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Pre-selected role for "+ Assign on this role" flow. */
  preselectedRoleId?: number;
  /** Provide for edit mode. */
  posting?: PostingEdit;
  /** All known individuals (internal + external) for the dropdown. */
  individuals: IndividualListItem[];
  /** All known internal roles for the dropdown. */
  roles: RoleListItem[];
};

const STATUSES: PostingStatus[] = ["Candidate", "Planned", "Current", "Past"];

export function PostingFormDialog({
  open,
  onClose,
  preselectedRoleId,
  posting,
  individuals,
  roles,
}: Props) {
  const isEdit = !!posting;
  const [externalIndividual, setExternalIndividual] = useState(false);
  const [externalRole, setExternalRole] = useState(false);
  const [individualId, setIndividualId] = useState<number | null>(null);
  const [roleId, setRoleId] = useState<number | null>(preselectedRoleId ?? null);
  const [extName, setExtName] = useState("");
  const [extRank, setExtRank] = useState("");
  const [extRoleTitle, setExtRoleTitle] = useState("");
  const [extRoleSubUnit, setExtRoleSubUnit] = useState("");
  const [status, setStatus] = useState<PostingStatus>(
    posting?.status ?? "Candidate",
  );
  const [startDate, setStartDate] = useState(posting?.startDate ?? "");
  const [endDate, setEndDate] = useState(posting?.endDate ?? "");
  const [notes, setNotes] = useState(posting?.notes ?? "");
  const [error, setError] = useState<string | null>(null);

  const create = useCreatePosting();
  const update = useUpdatePosting();
  const busy = create.isPending || update.isPending;

  const showEnd = status !== "Current";

  useEffect(() => {
    if (open) {
      setExternalIndividual(false);
      setExternalRole(false);
      setIndividualId(null);
      setRoleId(preselectedRoleId ?? null);
      setExtName("");
      setExtRank("");
      setExtRoleTitle("");
      setExtRoleSubUnit("");
      setStatus(posting?.status ?? "Candidate");
      setStartDate(posting?.startDate ?? "");
      setEndDate(posting?.endDate ?? "");
      setNotes(posting?.notes ?? "");
      setError(null);
    }
  }, [open, posting, preselectedRoleId]);

  async function handleSubmit() {
    setError(null);
    try {
      if (isEdit && posting) {
        await update.mutateAsync({
          id: posting.id,
          status,
          startDate: startDate || null,
          endDate: endDate || null,
          notes: notes || null,
        });
      } else {
        await create.mutateAsync({
          individualId: externalIndividual ? undefined : (individualId ?? undefined),
          roleId: externalRole ? undefined : (roleId ?? undefined),
          externalIndividual: externalIndividual
            ? { name: extName, rank: extRank || null }
            : undefined,
          externalRole: externalRole
            ? { title: extRoleTitle, subUnit: extRoleSubUnit }
            : undefined,
          status,
          startDate: startDate || null,
          endDate: endDate || null,
          notes: notes || null,
        });
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  const internalIndividuals = individuals;
  const internalRoles = roles.filter((r) => !r.IsExternal);

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>
        {isEdit ? "Edit posting" : "Add a posting"}
        {isEdit && posting && (
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            {posting.individualName} → {posting.roleTitle} · {posting.unitName}
          </Typography>
        )}
      </DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          {!isEdit && (
            <>
              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="caption">Individual</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={externalIndividual}
                        onChange={(e) => setExternalIndividual(e.target.checked)}
                        disabled={busy}
                      />
                    }
                    label={
                      <Typography
                        sx={{
                          fontFamily: '"Geist Mono", monospace',
                          fontSize: 11,
                          color: "text.secondary",
                        }}
                      >
                        Outside RAiD
                      </Typography>
                    }
                  />
                </Stack>
                {externalIndividual ? (
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <TextField
                      placeholder="Full name (e.g. COL James Lim)"
                      value={extName}
                      onChange={(e) => setExtName(e.target.value)}
                      fullWidth
                      disabled={busy}
                    />
                    <TextField
                      placeholder="Rank"
                      value={extRank}
                      onChange={(e) => setExtRank(e.target.value)}
                      sx={{ width: 120 }}
                      disabled={busy}
                    />
                  </Stack>
                ) : (
                  <Autocomplete
                    sx={{ mt: 1 }}
                    options={internalIndividuals}
                    getOptionLabel={(o) =>
                      `${o.Title}${o.Rank ? ` (${o.Rank})` : ""}${
                        o.IsExternal ? " · external" : ""
                      }`
                    }
                    value={
                      individualId
                        ? individuals.find((i) => i.Id === individualId) ?? null
                        : null
                    }
                    onChange={(_, v) => setIndividualId(v?.Id ?? null)}
                    renderInput={(params) => (
                      <TextField {...params} placeholder="Select a person…" />
                    )}
                    disabled={busy}
                  />
                )}
              </Box>

              <Box>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Typography variant="caption">Role</Typography>
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={externalRole}
                        onChange={(e) => setExternalRole(e.target.checked)}
                        disabled={busy || !!preselectedRoleId}
                      />
                    }
                    label={
                      <Typography
                        sx={{
                          fontFamily: '"Geist Mono", monospace',
                          fontSize: 11,
                          color: "text.secondary",
                        }}
                      >
                        Outside RAiD
                      </Typography>
                    }
                  />
                </Stack>
                {externalRole ? (
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <TextField
                      placeholder="Role title (e.g. Hd Cloud Plans)"
                      value={extRoleTitle}
                      onChange={(e) => setExtRoleTitle(e.target.value)}
                      fullWidth
                      disabled={busy}
                    />
                    <TextField
                      placeholder="Sub-unit (e.g. DPLD, X AELG)"
                      value={extRoleSubUnit}
                      onChange={(e) => setExtRoleSubUnit(e.target.value)}
                      fullWidth
                      disabled={busy}
                    />
                  </Stack>
                ) : (
                  <Autocomplete
                    sx={{ mt: 1 }}
                    options={internalRoles}
                    getOptionLabel={(o) =>
                      `${o.Title} — ${o.Unit?.Title ?? "—"} (${o.Level})`
                    }
                    value={
                      roleId
                        ? roles.find((r) => r.Id === roleId) ?? null
                        : null
                    }
                    onChange={(_, v) => setRoleId(v?.Id ?? null)}
                    disabled={!!preselectedRoleId || busy}
                    renderInput={(params) => (
                      <TextField {...params} placeholder="Select a role…" />
                    )}
                  />
                )}
              </Box>
            </>
          )}

          <Stack direction="row" spacing={2}>
            <FormControl fullWidth disabled={busy}>
              <InputLabel id="posting-status-label">Status</InputLabel>
              <Select
                labelId="posting-status-label"
                label="Status"
                value={status}
                onChange={(e) => setStatus(e.target.value as PostingStatus)}
              >
                {STATUSES.map((s) => (
                  <MenuItem key={s} value={s}>
                    {s}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              type="date"
              label={status === "Past" ? "Start date" : "Posted-in date"}
              InputLabelProps={{ shrink: true }}
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              fullWidth
              disabled={busy}
            />
          </Stack>

          {showEnd ? (
            <TextField
              type="date"
              label={`End date${status === "Past" ? "" : " (optional)"}`}
              InputLabelProps={{ shrink: true }}
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              fullWidth
              disabled={busy}
            />
          ) : (
            <Typography
              variant="caption"
              sx={{
                color: "text.secondary",
                fontFamily: '"Geist Mono", monospace',
                lineHeight: 1.5,
              }}
            >
              Currently on the job — no end date. Any existing Current
              incumbent on this role moves to Past automatically.
            </Typography>
          )}

          <TextField
            label="Notes"
            placeholder="Optional context"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            fullWidth
            multiline
            rows={2}
            disabled={busy}
          />

          {error && <Alert severity="error">{error}</Alert>}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={busy}>
          {isEdit ? "Save" : "Add posting"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
