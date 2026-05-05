// ProgressionFormDialog — combined edit dialog for one individual's
// development snapshot (General tab) and per-course attendance (Courses tab).
//
// Profile drives which fields the General tab surfaces:
//   MDES → MASC + Date of Expertise + R-Level (no Track per current Excel)
//   EOS  → Track + R-Level
//   DXO  → Track + R-Level
// All profiles get EMFRemarks, RLevelRemarks, CoursesRemarks. (EMFRemarks is
// only shown when MASC is shown; RLevelRemarks always shown; CoursesRemarks on
// the Courses tab.)
//
// Save logic:
//   - General: useUpsertProgression upserts the single PROGRESSION row.
//   - Courses: for each row in state, useUpsertAttendance upserts a row
//     (deletes if NotPlanned + no date and a row already existed).

import { useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import {
  useUpsertAttendance,
  useUpsertProgression,
} from "@/hooks/useMutations";
import {
  R_LEVELS,
  TRACKS,
  ROA_STATUSES,
  STATUS_FILL,
  STATUS_TEXT,
  STATUS_LABEL,
  SHOWS_MASC,
  SHOWS_TRACK,
  SHOWS_RLEVEL,
  getRelevantCourses,
  type Profile,
  type RoaStatus,
  type CompetencyTrack,
  type RLevel,
} from "@/lib/progression";
import type { RoaCourseListItem } from "@/types/roaCourses";
import type { CourseAttendanceListItem } from "@/types/courseAttendance";

type CourseRow = {
  courseId: number;
  status: RoaStatus;
  date: string | null;
};

export type ProgressionEdit = {
  individualId: number;
  individualName: string; // for the dialog title
  profile: Profile | null;
  // General tab fields — null if no progression row exists yet
  mascLevel: number | null;
  dateOfExpertise: string | null;
  emfRemarks: string | null;
  track: CompetencyTrack | null;
  rLevel: RLevel | null;
  rLevelRemarks: string | null;
  coursesRemarks: string | null;
  // Per-course attendance for this person
  attendance: CourseAttendanceListItem[];
};

type Props = {
  open: boolean;
  onClose: () => void;
  edit: ProgressionEdit | null;
  /** All known active courses, used to resolve which courses are required. */
  allCourses: RoaCourseListItem[];
};

export function ProgressionFormDialog({ open, onClose, edit, allCourses }: Props) {
  const [tab, setTab] = useState(0);

  // General tab state
  const [masc, setMasc] = useState<number | "">(edit?.mascLevel ?? "");
  const [doe, setDoe] = useState(edit?.dateOfExpertise ?? "");
  const [emfRemarks, setEmfRemarks] = useState(edit?.emfRemarks ?? "");
  const [track, setTrack] = useState<CompetencyTrack | "">(edit?.track ?? "");
  const [rLevel, setRLevel] = useState<RLevel | "">(edit?.rLevel ?? "");
  const [rLevelRemarks, setRLevelRemarks] = useState(edit?.rLevelRemarks ?? "");
  const [coursesRemarks, setCoursesRemarks] = useState(edit?.coursesRemarks ?? "");

  // Courses tab state — keyed by courseId so we can rebuild from edit changes
  const [rows, setRows] = useState<Record<number, CourseRow>>({});

  const [error, setError] = useState<string | null>(null);

  const upsertProgression = useUpsertProgression();
  const upsertAttendance = useUpsertAttendance();
  const busy = upsertProgression.isPending || upsertAttendance.isPending;

  // Resolve which courses to render: profile-required + any extras the
  // person has existing attendance for (e.g. admin-set NA outside profile).
  const relevantCourses = useMemo(() => {
    if (!edit) return [];
    const existingIds = new Set(edit.attendance.map((a) => a.CourseId));
    return getRelevantCourses(edit.profile, allCourses, existingIds);
  }, [edit, allCourses]);

  // Reset state when dialog opens
  useEffect(() => {
    if (open && edit) {
      setMasc(edit.mascLevel ?? "");
      setDoe(edit.dateOfExpertise ?? "");
      setEmfRemarks(edit.emfRemarks ?? "");
      setTrack(edit.track ?? "");
      setRLevel(edit.rLevel ?? "");
      setRLevelRemarks(edit.rLevelRemarks ?? "");
      setCoursesRemarks(edit.coursesRemarks ?? "");

      // Build rows: existing attendance keyed by courseId, defaulting unfilled
      // courses to { NotPlanned, null }.
      const existingByCourse = new Map(
        edit.attendance.map((a) => [a.CourseId, a]),
      );
      const initial: Record<number, CourseRow> = {};
      const existingIds = new Set(edit.attendance.map((a) => a.CourseId));
      const courses = getRelevantCourses(edit.profile, allCourses, existingIds);
      for (const c of courses) {
        const existing = existingByCourse.get(c.Id);
        initial[c.Id] = {
          courseId: c.Id,
          status: existing?.Status ?? "NotPlanned",
          date: existing?.Date ?? null,
        };
      }
      setRows(initial);
      setError(null);
      setTab(0);
    }
  }, [open, edit, allCourses]);

  if (!edit) return null;

  const showMasc = edit.profile != null && SHOWS_MASC[edit.profile];
  const showTrack = edit.profile != null && SHOWS_TRACK[edit.profile];
  const showRLevel = edit.profile != null && SHOWS_RLEVEL[edit.profile];

  function setRow(courseId: number, patch: Partial<CourseRow>) {
    setRows((prev) => ({
      ...prev,
      [courseId]: {
        courseId,
        status: prev[courseId]?.status ?? "NotPlanned",
        date: prev[courseId]?.date ?? null,
        ...patch,
      },
    }));
  }

  async function handleSubmit() {
    if (!edit) return;
    setError(null);
    try {
      // 1. Upsert the progression row (always — even profile-conditional fields
      //    that are hidden are written as null so the row stays consistent).
      await upsertProgression.mutateAsync({
        individualId: edit.individualId,
        mascLevel: showMasc ? (typeof masc === "number" ? masc : (masc === "" ? null : Number(masc))) : null,
        dateOfExpertise: showMasc ? (doe || null) : null,
        emfRemarks: showMasc ? (emfRemarks || null) : null,
        track: showTrack ? (track || null) : null,
        rLevel: showRLevel ? (rLevel || null) : null,
        rLevelRemarks: showRLevel ? (rLevelRemarks || null) : null,
        coursesRemarks: coursesRemarks || null,
      });

      // 2. Upsert each attendance row. NotPlanned + no date = delete (the
      //    mutation hook handles the delete logic on its own).
      for (const row of Object.values(rows)) {
        await upsertAttendance.mutateAsync({
          individualId: edit.individualId,
          courseId: row.courseId,
          status: row.status,
          date: row.date,
        });
      }

      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
  }

  return (
    <Dialog open={open} onClose={busy ? undefined : onClose} maxWidth="md" fullWidth>
      <DialogTitle>
        Edit progression
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
          {edit.individualName} · {edit.profile ?? "Profile not set"}
        </Typography>
      </DialogTitle>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{ borderBottom: 1, borderColor: "divider", px: 3 }}
      >
        <Tab label="General" />
        <Tab label={`Courses (${relevantCourses.length})`} />
      </Tabs>

      <DialogContent>
        {edit.profile == null && (
          <Alert severity="info" sx={{ mb: 2 }}>
            This person has no profile assigned. Set their Profile (MDES / EOS /
            DXO) on the Admin · People page first — then their applicable
            fields and courses will appear here.
          </Alert>
        )}

        {/* ── General tab ──────────────────────────────────────────────── */}
        {tab === 0 && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            {showMasc && (
              <Box>
                <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
                  EMF
                </Typography>
                <Stack direction="row" spacing={2}>
                  <TextField
                    label="MASC Level"
                    type="number"
                    value={masc}
                    onChange={(e) =>
                      setMasc(e.target.value === "" ? "" : Number(e.target.value))
                    }
                    sx={{ width: 160 }}
                    disabled={busy}
                  />
                  <TextField
                    label="Date of Expertise"
                    type="date"
                    InputLabelProps={{ shrink: true }}
                    value={doe}
                    onChange={(e) => setDoe(e.target.value)}
                    fullWidth
                    disabled={busy}
                  />
                </Stack>
                <TextField
                  label="EMF Remarks"
                  value={emfRemarks}
                  onChange={(e) => setEmfRemarks(e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  disabled={busy}
                  sx={{ mt: 2 }}
                  placeholder="e.g. Planned for next upgrade in Q3 2026"
                />
              </Box>
            )}

            {(showTrack || showRLevel) && (
              <Box>
                <Typography variant="caption" sx={{ display: "block", mb: 1 }}>
                  R-Level
                </Typography>
                <Stack direction="row" spacing={2}>
                  {showTrack && (
                    <FormControl fullWidth disabled={busy}>
                      <InputLabel id="track-label">Track</InputLabel>
                      <Select
                        labelId="track-label"
                        label="Track"
                        value={track}
                        onChange={(e) => setTrack(e.target.value as CompetencyTrack | "")}
                      >
                        <MenuItem value="">
                          <em>(not set)</em>
                        </MenuItem>
                        {TRACKS.map((t) => (
                          <MenuItem key={t} value={t}>
                            {t}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                  {showRLevel && (
                    <FormControl sx={{ width: 160 }} disabled={busy}>
                      <InputLabel id="rlevel-label">R-Level</InputLabel>
                      <Select
                        labelId="rlevel-label"
                        label="R-Level"
                        value={rLevel}
                        onChange={(e) => setRLevel(e.target.value as RLevel | "")}
                      >
                        <MenuItem value="">
                          <em>(not set)</em>
                        </MenuItem>
                        {R_LEVELS.map((l) => (
                          <MenuItem key={l} value={l}>
                            {l}
                          </MenuItem>
                        ))}
                      </Select>
                    </FormControl>
                  )}
                </Stack>
                <TextField
                  label="R-Level Remarks"
                  value={rLevelRemarks}
                  onChange={(e) => setRLevelRemarks(e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  disabled={busy}
                  sx={{ mt: 2 }}
                  placeholder="e.g. Planned for next upgrade in Q3 2026"
                />
              </Box>
            )}

            {error && <Alert severity="error">{error}</Alert>}
          </Stack>
        )}

        {/* ── Courses tab ──────────────────────────────────────────────── */}
        {tab === 1 && (
          <Stack spacing={2} sx={{ mt: 1 }}>
            {relevantCourses.length === 0 ? (
              <Alert severity="info">
                No applicable courses for this person's profile. Manage the
                catalogue on Admin · ROA Courses.
              </Alert>
            ) : (
              <Box>
                <Stack spacing={1.5}>
                  {relevantCourses.map((course) => {
                    const row = rows[course.Id] ?? {
                      courseId: course.Id,
                      status: "NotPlanned" as RoaStatus,
                      date: null,
                    };
                    const dateRequired = row.status === "Completed" || row.status === "Planned";
                    return (
                      <Stack
                        key={course.Id}
                        direction="row"
                        alignItems="center"
                        spacing={2}
                        sx={{
                          py: 1.5,
                          px: 1.5,
                          border: "1px solid rgba(0,0,0,0.08)",
                          borderRadius: 1,
                        }}
                      >
                        <Box sx={{ minWidth: 140 }}>
                          <Typography
                            variant="body2"
                            sx={{ fontWeight: 600, fontSize: 13 }}
                          >
                            {course.Title}
                          </Typography>
                          <Typography
                            variant="caption"
                            sx={{
                              color: "text.secondary",
                              display: "block",
                              fontSize: 10.5,
                            }}
                          >
                            {course.Label}
                          </Typography>
                        </Box>
                        <FormControl size="small" sx={{ width: 180 }} disabled={busy}>
                          <Select
                            value={row.status}
                            onChange={(e) =>
                              setRow(course.Id, { status: e.target.value as RoaStatus })
                            }
                            sx={{
                              bgcolor: STATUS_FILL[row.status],
                              color: STATUS_TEXT[row.status],
                              fontWeight: 600,
                              fontSize: 12,
                              "& .MuiSelect-icon": { color: STATUS_TEXT[row.status] },
                            }}
                          >
                            {ROA_STATUSES.map((s) => (
                              <MenuItem key={s} value={s}>
                                {STATUS_LABEL[s]} — {s}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                        <TextField
                          size="small"
                          type="date"
                          InputLabelProps={{ shrink: true }}
                          value={row.date ?? ""}
                          onChange={(e) =>
                            setRow(course.Id, { date: e.target.value || null })
                          }
                          disabled={busy || !dateRequired}
                          placeholder={dateRequired ? "" : "n/a"}
                          sx={{ width: 180 }}
                        />
                      </Stack>
                    );
                  })}
                </Stack>
                <TextField
                  label="ROA Courses Remarks"
                  value={coursesRemarks}
                  onChange={(e) => setCoursesRemarks(e.target.value)}
                  fullWidth
                  multiline
                  rows={2}
                  disabled={busy}
                  sx={{ mt: 3 }}
                  placeholder="e.g. Planned for IDSC in Q3 2026"
                />
                {error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
              </Box>
            )}
          </Stack>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} variant="contained" disabled={busy}>
          Save
        </Button>
      </DialogActions>
    </Dialog>
  );
}
