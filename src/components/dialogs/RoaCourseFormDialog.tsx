// Admin dialog to add or edit a single ROA course.
//
// Mirrors the shape of UnitFormDialog / RoleFormDialog. On save it calls
// useCreateRoaCourse or useUpdateRoaCourse from useMutations.

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  Switch,
  TextField,
  Typography,
} from "@mui/material";
import {
  useCreateRoaCourse,
  useUpdateRoaCourse,
} from "@/hooks/useMutations";
import { PROFILES, type Profile } from "@/lib/progression";

export type RoaCourseEdit = {
  id: number;
  title: string;
  label: string;
  profiles: Profile[];
  displayOrder: number;
  isActive: boolean;
};

type Props = {
  open: boolean;
  onClose: () => void;
  /** Provide for edit mode. Omit for add mode. */
  course?: RoaCourseEdit;
  /** Used to suggest the next display order when adding. */
  nextDisplayOrder?: number;
};

export function RoaCourseFormDialog({ open, onClose, course, nextDisplayOrder }: Props) {
  const isEdit = !!course;
  const [title, setTitle] = useState(course?.title ?? "");
  const [label, setLabel] = useState(course?.label ?? "");
  const [profiles, setProfiles] = useState<Profile[]>(course?.profiles ?? []);
  const [displayOrder, setDisplayOrder] = useState<number>(
    course?.displayOrder ?? nextDisplayOrder ?? 1,
  );
  const [isActive, setIsActive] = useState<boolean>(course?.isActive ?? true);
  const [error, setError] = useState<string | null>(null);

  const create = useCreateRoaCourse();
  const update = useUpdateRoaCourse();
  const busy = create.isPending || update.isPending;

  useEffect(() => {
    if (open) {
      setTitle(course?.title ?? "");
      setLabel(course?.label ?? "");
      setProfiles(course?.profiles ?? []);
      setDisplayOrder(course?.displayOrder ?? nextDisplayOrder ?? 1);
      setIsActive(course?.isActive ?? true);
      setError(null);
    }
  }, [open, course, nextDisplayOrder]);

  async function handleSubmit() {
    setError(null);
    try {
      if (isEdit && course) {
        await update.mutateAsync({
          id: course.id,
          input: {
            title: title.trim(),
            label: label.trim(),
            profiles,
            displayOrder,
            isActive,
          },
        });
      } else {
        await create.mutateAsync({
          title: title.trim(),
          label: label.trim(),
          profiles,
          displayOrder,
          isActive,
        });
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{isEdit ? "Edit ROA course" : "Add ROA course"}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <Stack direction="row" spacing={2}>
            <TextField
              autoFocus
              label="Course code"
              placeholder="e.g. MDEC"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              fullWidth
              disabled={busy}
              helperText="Short, used as the column header in the Development table."
            />
            <TextField
              label="Order"
              type="number"
              value={displayOrder}
              onChange={(e) => setDisplayOrder(Number(e.target.value) || 0)}
              sx={{ width: 100 }}
              disabled={busy}
            />
          </Stack>
          <TextField
            label="Display label"
            placeholder="e.g. Military Domain Expert Course"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            required
            fullWidth
            disabled={busy}
          />
          <FormControl fullWidth disabled={busy}>
            <InputLabel id="profiles-label">Applicable profiles</InputLabel>
            <Select<Profile[]>
              labelId="profiles-label"
              multiple
              value={profiles}
              onChange={(e) =>
                setProfiles(
                  typeof e.target.value === "string"
                    ? (e.target.value.split(",") as Profile[])
                    : e.target.value,
                )
              }
              input={<OutlinedInput label="Applicable profiles" />}
              renderValue={(selected) => selected.join(", ")}
            >
              {PROFILES.map((p) => (
                <MenuItem key={p} value={p}>
                  <Checkbox checked={profiles.includes(p)} />
                  <ListItemText primary={p} />
                </MenuItem>
              ))}
            </Select>
            <Typography variant="caption" sx={{ mt: 0.5, color: "text.secondary" }}>
              Individuals with one of these profiles will see this course on the
              Development table by default. Per-person "NA" overrides happen on
              the individual's progression dialog.
            </Typography>
          </FormControl>
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={isActive}
                  onChange={(e) => setIsActive(e.target.checked)}
                  disabled={busy}
                />
              }
              label="Active"
            />
            <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
              Inactive courses are hidden from the Development table but their
              attendance history is preserved.
            </Typography>
          </Box>
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
          disabled={busy || !title.trim() || !label.trim()}
        >
          {isEdit ? "Save" : "Add course"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
