import { useMemo, useState } from "react";
import {
  Box,
  Button,
  Chip,
  IconButton,
  Paper,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/EditOutlined";
import AddIcon from "@mui/icons-material/AddOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import { Link, useParams } from "@tanstack/react-router";
import { useIndividuals } from "@/hooks/useIndividuals";
import { usePostings } from "@/hooks/usePostings";
import { useRoles } from "@/hooks/useRoles";
import { useUnits } from "@/hooks/useUnits";
import { useRoaCourses } from "@/hooks/useRoaCourses";
import { useCourseAttendance } from "@/hooks/useCourseAttendance";
import { useProgression } from "@/hooks/useProgression";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useDeletePosting } from "@/hooks/useMutations";
import { buildUnitTree, filterToL2Unit } from "@/lib/hierarchy";
import { OrgChart } from "@/components/charts/OrgChart";
import { PostingTimeline } from "@/components/charts/PostingTimeline";
import { StatusBadge } from "@/components/shared/StatusBadge";
import {
  PostingFormDialog,
  type PostingEdit,
} from "@/components/dialogs/PostingFormDialog";
import { ProgressionFormDialog } from "@/components/dialogs/ProgressionFormDialog";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { LoadingBlock, ErrorBlock, PageHeader } from "./_shared";
import { formatName } from "@/lib/formatters";
import {
  STATUS_FILL,
  STATUS_TEXT,
  STATUS_LABEL,
  getRequiredCourses,
  type RoaStatus,
} from "@/lib/progression";
import { MONO } from "@/lib/tokens";

export function IndividualDetailPage() {
  const { id } = useParams({ from: "/individuals/$id" });
  const individualId = Number(id);

  const individuals = useIndividuals();
  const postings = usePostings();
  const roles = useRoles();
  const units = useUnits();
  const roaCourses = useRoaCourses();
  const attendance = useCourseAttendance();
  const progression = useProgression();
  const currentUser = useCurrentUser();
  const deletePosting = useDeletePosting();
  const { ask, ConfirmHost } = useConfirm();

  const [editingPosting, setEditingPosting] = useState<PostingEdit | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [progOpen, setProgOpen] = useState(false);

  if (
    individuals.isLoading ||
    postings.isLoading ||
    roles.isLoading ||
    units.isLoading
  )
    return <LoadingBlock label="Loading…" />;
  if (individuals.error || postings.error || roles.error || units.error)
    return (
      <ErrorBlock
        error={
          (individuals.error ||
            postings.error ||
            roles.error ||
            units.error) as Error
        }
      />
    );

  const ind = individuals.data?.find((i) => i.Id === individualId);
  if (!ind) {
    return (
      <Stack spacing={2}>
        <Typography variant="h5">Individual not found</Typography>
        <Link to="/individuals" style={{ textDecoration: "none" }}>
          ← Back to individuals
        </Link>
      </Stack>
    );
  }

  const isAdmin = currentUser.data?.IsSiteAdmin === true;
  const allRoles = roles.data ?? [];
  const allUnits = units.data ?? [];
  const allIndividuals = individuals.data ?? [];

  const myPostings = (postings.data ?? []).filter(
    (p) => p.IndividualId === individualId,
  );
  const current = myPostings.find((p) => p.Status === "Current");
  const future = myPostings.filter(
    (p) => p.Status === "Planned" || p.Status === "Candidate",
  );
  const past = myPostings.filter((p) => p.Status === "Past");

  // Org context: focus on the L2 unit of the current role
  const currentRoleUnitId = allRoles.find((r) => r.Id === current?.RoleId)?.UnitId;
  const fullTree = buildUnitTree(allUnits, allRoles);
  const contextTree = filterToL2Unit(fullTree, currentRoleUnitId, allUnits);

  const incumbents = new Map<number, (typeof ind)>();
  const pendingByRole = new Map<number, number>();
  const indById = new Map(allIndividuals.map((i) => [i.Id, i]));
  for (const p of postings.data ?? []) {
    if (p.Status === "Current") {
      const i2 = indById.get(p.IndividualId);
      if (i2) incumbents.set(p.RoleId, i2);
    }
    if (p.Status === "Planned" || p.Status === "Candidate") {
      pendingByRole.set(p.RoleId, (pendingByRole.get(p.RoleId) ?? 0) + 1);
    }
  }

  function buildEdit(p: (typeof myPostings)[number]): PostingEdit {
    const role = allRoles.find((r) => r.Id === p.RoleId);
    // ind is non-null here — the early return above guards this code path
    return {
      id: p.Id,
      individualName: formatName(ind!.Rank, ind!.Title),
      roleTitle: role?.Title ?? p.Role.Title,
      unitName: role?.Unit?.Title ?? role?.ExternalUnit ?? "External",
      status: p.Status,
      startDate: p.StartDate,
      endDate: p.EndDate,
      notes: p.Notes,
    };
  }

  function handleDelete(p: (typeof myPostings)[number]) {
    const role = allRoles.find((r) => r.Id === p.RoleId);
    ask({
      title: "Delete this posting?",
      message: `Remove ${p.Status.toLowerCase()} posting for ${role?.Title ?? "this role"}? This cannot be undone.`,
      destructive: true,
      confirmLabel: "Delete posting",
      onConfirm: () => deletePosting.mutateAsync(p.Id),
    });
  }

  return (
    <Stack spacing={3}>
      <Link
        to="/individuals"
        style={{
          color: "rgba(0,0,0,0.5)",
          fontSize: 11,
          fontFamily: '"Geist Mono", monospace',
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          textDecoration: "none",
        }}
      >
        ← Individuals
      </Link>

      <PageHeader
        overline="Manpower · Individual"
        title={formatName(ind.Rank, ind.Title)}
        blurb={
          <Stack
            direction="row"
            flexWrap="wrap"
            gap={1.5}
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: 11,
              color: "text.secondary",
              mt: 1,
            }}
          >
            {ind.Specialisation && <span>{ind.Specialisation}</span>}
            {ind.EmployeeId && <span>· {ind.EmployeeId}</span>}
          </Stack>
        }
      />

      <Box
        sx={{
          display: "grid",
          gap: 3,
          gridTemplateColumns: { xs: "1fr", lg: "1fr 320px" },
        }}
      >
        {/* ── left column ─────────────────────────────────── */}
        <Stack spacing={3}>

          {/* Current assignment card */}
          <Paper sx={{ p: 2.5 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1.5 }}
            >
              <Typography variant="caption">Current assignment</Typography>
              {isAdmin && current && (
                <Tooltip title="Edit posting dates / status">
                  <IconButton
                    size="small"
                    onClick={() => setEditingPosting(buildEdit(current))}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>

            {current ? (
              <Stack direction="row" alignItems="flex-start" gap={1.5}>
                <StatusBadge status={current.Status} />
                <Box sx={{ flex: 1, fontSize: 14 }}>
                  <Link
                    to="/roles/$id"
                    params={{ id: String(current.RoleId) }}
                    style={{
                      color: "#01219C",
                      fontWeight: 500,
                      textDecoration: "none",
                    }}
                  >
                    {allRoles.find((r) => r.Id === current.RoleId)?.Title}
                  </Link>
                  <Box component="span" sx={{ color: "text.secondary" }}>
                    {" "}
                    ·{" "}
                    {allRoles.find((r) => r.Id === current.RoleId)?.Unit
                      ?.Title ??
                      allRoles.find((r) => r.Id === current.RoleId)
                        ?.ExternalUnit ??
                      "External"}
                  </Box>
                  {(current.StartDate || current.EndDate) && (
                    <Box
                      sx={{
                        fontFamily: '"Geist Mono", monospace',
                        fontSize: 10,
                        color: "text.secondary",
                        mt: 0.5,
                      }}
                    >
                      {current.StartDate ?? "?"} →{" "}
                      {current.EndDate ?? "ongoing"}
                    </Box>
                  )}
                  {current.Notes && (
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", fontStyle: "italic", mt: 0.75 }}
                    >
                      {current.Notes}
                    </Typography>
                  )}
                </Box>
              </Stack>
            ) : (
              <Stack direction="row" alignItems="center" gap={2}>
                <Typography
                  variant="body2"
                  sx={{ color: "text.secondary", fontStyle: "italic" }}
                >
                  No current assignment.
                </Typography>
                {isAdmin && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setAddOpen(true)}
                  >
                    Assign to role
                  </Button>
                )}
              </Stack>
            )}
          </Paper>

          {/* Movement timeline */}
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="caption" sx={{ display: "block", mb: 1.5 }}>
              Movement timeline
            </Typography>
            <PostingTimeline
              postings={myPostings}
              mode="individual"
              roles={allRoles}
            />
          </Paper>

          {/* Where next? */}
          <Paper sx={{ p: 2.5 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1.5 }}
            >
              <Typography variant="caption">Where next?</Typography>
              {isAdmin && (
                <Tooltip title="Add a planned or candidate posting">
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setAddOpen(true)}
                    sx={{ minWidth: 0 }}
                  >
                    Add posting
                  </Button>
                </Tooltip>
              )}
            </Stack>

            {future.length === 0 ? (
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", fontStyle: "italic" }}
              >
                No planned or candidate postings yet.
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {future.map((p) => {
                  const role = allRoles.find((r) => r.Id === p.RoleId);
                  return (
                    <Stack
                      key={p.Id}
                      direction="row"
                      alignItems="flex-start"
                      gap={1.5}
                      sx={{
                        border: "1px solid rgba(0,0,0,0.06)",
                        borderRadius: 1,
                        p: 1.5,
                        bgcolor: "rgba(0,0,0,0.015)",
                        fontSize: 14,
                      }}
                    >
                      <StatusBadge status={p.Status} />
                      <Box sx={{ flex: 1 }}>
                        <Link
                          to="/roles/$id"
                          params={{ id: String(p.RoleId) }}
                          style={{
                            color: "#01219C",
                            fontWeight: 500,
                            textDecoration: "none",
                          }}
                        >
                          {role?.Title}
                        </Link>
                        <Box component="span" sx={{ color: "text.secondary" }}>
                          {" "}· {role?.Unit?.Title ??
                            role?.ExternalUnit ??
                            "External"}{" "}
                          · {role?.Level}
                        </Box>
                        {(p.StartDate || p.EndDate) && (
                          <Box
                            sx={{
                              fontFamily: '"Geist Mono", monospace',
                              fontSize: 10,
                              color: "text.secondary",
                              mt: 0.5,
                            }}
                          >
                            {p.StartDate ?? "?"} → {p.EndDate ?? "?"}
                          </Box>
                        )}
                        {p.Notes && (
                          <Typography
                            variant="body2"
                            sx={{
                              color: "text.secondary",
                              fontStyle: "italic",
                              mt: 0.75,
                            }}
                          >
                            {p.Notes}
                          </Typography>
                        )}
                      </Box>
                      {isAdmin && (
                        <Stack direction="row" gap={0.25} flexShrink={0}>
                          <Tooltip title="Edit">
                            <IconButton
                              size="small"
                              onClick={() => setEditingPosting(buildEdit(p))}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                          <Tooltip title="Delete">
                            <IconButton
                              size="small"
                              onClick={() => handleDelete(p)}
                            >
                              <DeleteIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      )}
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </Paper>

          {/* Past postings */}
          {past.length > 0 && (
            <Paper sx={{ p: 2.5 }}>
              <Typography
                variant="caption"
                sx={{ display: "block", mb: 1.5 }}
              >
                Past postings
              </Typography>
              <Stack spacing={1}>
                {past.map((p) => {
                  const role = allRoles.find((r) => r.Id === p.RoleId);
                  return (
                    <Stack
                      key={p.Id}
                      direction="row"
                      alignItems="flex-start"
                      gap={1.5}
                    >
                      <StatusBadge status={p.Status} />
                      <Box sx={{ flex: 1, fontSize: 14 }}>
                        <Link
                          to="/roles/$id"
                          params={{ id: String(p.RoleId) }}
                          style={{
                            fontWeight: 500,
                            textDecoration: "none",
                            color: "inherit",
                          }}
                        >
                          {role?.Title}
                        </Link>
                        <Box
                          component="span"
                          sx={{ color: "text.secondary" }}
                        >
                          {" "}
                          ·{" "}
                          {role?.Unit?.Title ??
                            role?.ExternalUnit ??
                            "External"}
                        </Box>
                        <Box
                          component="span"
                          sx={{
                            ml: 1,
                            fontFamily: '"Geist Mono", monospace',
                            fontSize: 10,
                            color: "text.secondary",
                          }}
                        >
                          {p.StartDate} → {p.EndDate}
                        </Box>
                      </Box>
                    </Stack>
                  );
                })}
              </Stack>
            </Paper>
          )}
        </Stack>

        {/* ── right column: focused org context ───────────── */}
        <Paper sx={{ p: 2 }}>
          <Typography variant="caption" sx={{ display: "block", mb: 1.5 }}>
            Org context
          </Typography>
          {current && (
            <Box
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: 10.5,
                color: "text.secondary",
                mb: 1.5,
                lineHeight: 1.4,
              }}
            >
              Currently:{" "}
              <Box
                component="span"
                sx={{ color: "text.primary", fontWeight: 500 }}
              >
                {allRoles.find((r) => r.Id === current.RoleId)?.Title}
              </Box>
              {" · "}
              {allRoles.find((r) => r.Id === current.RoleId)?.Unit?.Title ??
                "—"}
            </Box>
          )}
          <OrgChart
            tree={contextTree}
            incumbents={incumbents}
            pendingByRole={pendingByRole}
          />
        </Paper>
      </Box>

      {/* ── Development snapshot (baseball card) ───────────────────────── */}
      <DevelopmentSnapshot
        ind={ind}
        myAttendance={(attendance.data ?? []).filter((a) => a.IndividualId === individualId)}
        myProgression={(progression.data ?? []).find((p) => p.IndividualId === individualId)}
        allCourses={roaCourses.data ?? []}
        isAdmin={isAdmin}
        onEdit={() => setProgOpen(true)}
      />

      {/* Dialogs */}
      {isAdmin && (
        <PostingFormDialog
          open={editingPosting != null}
          onClose={() => setEditingPosting(null)}
          posting={editingPosting ?? undefined}
          individuals={allIndividuals}
          roles={allRoles}
        />
      )}
      {isAdmin && (
        <PostingFormDialog
          open={addOpen}
          onClose={() => setAddOpen(false)}
          individuals={allIndividuals}
          roles={allRoles}
        />
      )}
      {isAdmin && (
        <ProgressionFormDialog
          open={progOpen}
          onClose={() => setProgOpen(false)}
          edit={{
            individualId,
            individualName: formatName(ind.Rank, ind.Title),
            profile: ind.Profile,
            mascLevel:
              progression.data?.find((p) => p.IndividualId === individualId)?.MASCLevel ?? null,
            dateOfExpertise:
              progression.data?.find((p) => p.IndividualId === individualId)?.DateOfExpertise ?? null,
            emfRemarks:
              progression.data?.find((p) => p.IndividualId === individualId)?.EMFRemarks ?? null,
            track: progression.data?.find((p) => p.IndividualId === individualId)?.Track ?? null,
            rLevel: progression.data?.find((p) => p.IndividualId === individualId)?.RLevel ?? null,
            rLevelRemarks:
              progression.data?.find((p) => p.IndividualId === individualId)?.RLevelRemarks ?? null,
            coursesRemarks:
              progression.data?.find((p) => p.IndividualId === individualId)?.CoursesRemarks ?? null,
            attendance: (attendance.data ?? []).filter((a) => a.IndividualId === individualId),
          }}
          allCourses={roaCourses.data ?? []}
        />
      )}
      {ConfirmHost}
    </Stack>
  );
}

// ── Baseball-card panel ─────────────────────────────────────────────────────
// Compact view of one person's development state. Lives below the existing
// posting timeline / org context section. Editable via the same
// ProgressionFormDialog the Development tab uses.

function DevelopmentSnapshot({
  ind,
  myAttendance,
  myProgression,
  allCourses,
  isAdmin,
  onEdit,
}: {
  ind: { Rank: string | null; Title: string; Profile: import("@/lib/progression").Profile | null };
  myAttendance: import("@/types/courseAttendance").CourseAttendanceListItem[];
  myProgression: import("@/types/progression").ProgressionListItem | undefined;
  allCourses: import("@/types/roaCourses").RoaCourseListItem[];
  isAdmin: boolean;
  onEdit: () => void;
}) {
  const required = useMemo(
    () => getRequiredCourses(ind.Profile, allCourses),
    [ind.Profile, allCourses],
  );
  const attByCourse = useMemo(
    () => new Map(myAttendance.map((a) => [a.CourseId, a])),
    [myAttendance],
  );

  return (
    <Paper sx={{ p: 2.5 }}>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{ mb: 2 }}
      >
        <Stack direction="row" alignItems="center" gap={1.5}>
          <Typography variant="caption">Development snapshot</Typography>
          {ind.Profile ? (
            <Chip
              label={ind.Profile}
              size="small"
              sx={{ fontFamily: MONO, fontSize: 10, height: 22 }}
            />
          ) : (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              No profile assigned
            </Typography>
          )}
        </Stack>
        {isAdmin && (
          <Tooltip title="Edit progression">
            <IconButton size="small" onClick={onEdit}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        )}
      </Stack>

      {ind.Profile == null && !isAdmin && (
        <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
          No development profile recorded for this individual.
        </Typography>
      )}

      {ind.Profile != null && (
        <Stack spacing={2}>
          {/* Top row: MASC / Track / R-Level */}
          <Stack direction="row" gap={3} flexWrap="wrap">
            {myProgression?.MASCLevel != null && (
              <Box>
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                  MASC Level
                </Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 600, lineHeight: 1.2 }}>
                  {myProgression.MASCLevel}
                </Typography>
                {myProgression.DateOfExpertise && (
                  <Typography
                    sx={{ fontFamily: MONO, fontSize: 10, color: "text.secondary" }}
                  >
                    {myProgression.DateOfExpertise}
                  </Typography>
                )}
              </Box>
            )}
            {myProgression?.Track && (
              <Box>
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                  Track
                </Typography>
                <Typography sx={{ fontSize: 14 }}>{myProgression.Track}</Typography>
              </Box>
            )}
            {myProgression?.RLevel && (
              <Box>
                <Typography variant="caption" sx={{ display: "block", color: "text.secondary" }}>
                  R-Level
                </Typography>
                <Typography sx={{ fontSize: 18, fontWeight: 600, lineHeight: 1.2 }}>
                  {myProgression.RLevel}
                </Typography>
              </Box>
            )}
          </Stack>

          {/* ROA strip */}
          {required.length > 0 && (
            <Box>
              <Typography variant="caption" sx={{ display: "block", mb: 1, color: "text.secondary" }}>
                ROA courses
              </Typography>
              <Stack direction="row" gap={1} flexWrap="wrap">
                {required.map((c) => {
                  const att = attByCourse.get(c.Id);
                  const status: RoaStatus = att?.Status ?? "NotPlanned";
                  return (
                    <Tooltip
                      key={c.Id}
                      title={`${c.Label}${att?.Date ? ` · ${att.Date}` : ""}`}
                    >
                      <Box
                        sx={{
                          bgcolor: STATUS_FILL[status],
                          color: STATUS_TEXT[status],
                          fontFamily: MONO,
                          fontSize: 10,
                          fontWeight: 600,
                          borderRadius: 0.5,
                          px: 1,
                          py: 0.5,
                          minWidth: 70,
                          textAlign: "center",
                          lineHeight: 1.4,
                        }}
                      >
                        <Box>{c.Title}</Box>
                        <Box sx={{ fontSize: 9, opacity: 0.85 }}>
                          {att?.Date ?? STATUS_LABEL[status]}
                        </Box>
                      </Box>
                    </Tooltip>
                  );
                })}
              </Stack>
            </Box>
          )}

          {/* Remarks (if any) */}
          {(myProgression?.EMFRemarks ||
            myProgression?.RLevelRemarks ||
            myProgression?.CoursesRemarks) && (
            <Stack spacing={0.75}>
              {myProgression.EMFRemarks && (
                <RemarkLine label="EMF" text={myProgression.EMFRemarks} />
              )}
              {myProgression.RLevelRemarks && (
                <RemarkLine label="R-Level" text={myProgression.RLevelRemarks} />
              )}
              {myProgression.CoursesRemarks && (
                <RemarkLine label="Courses" text={myProgression.CoursesRemarks} />
              )}
            </Stack>
          )}
        </Stack>
      )}
    </Paper>
  );
}

function RemarkLine({ label, text }: { label: string; text: string }) {
  return (
    <Box sx={{ fontSize: 12.5, color: "text.secondary", fontStyle: "italic" }}>
      <Box
        component="span"
        sx={{
          fontFamily: MONO,
          fontStyle: "normal",
          fontSize: 9.5,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          mr: 1,
          color: "text.disabled",
        }}
      >
        {label}
      </Box>
      {text}
    </Box>
  );
}
