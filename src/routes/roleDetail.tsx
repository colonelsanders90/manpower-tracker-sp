import { useState } from "react";
import {
  Box,
  Button,
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
import { useRoles } from "@/hooks/useRoles";
import { usePostings } from "@/hooks/usePostings";
import { useIndividuals } from "@/hooks/useIndividuals";
import { useUnits } from "@/hooks/useUnits";
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
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { formatName, formatDate } from "@/lib/formatters";
import { formatEstablishment } from "@/lib/movement";
import { LoadingBlock, ErrorBlock, PageHeader } from "./_shared";

const CORAL = "#F9866B";

export function RoleDetailPage() {
  const { id } = useParams({ from: "/roles/$id" });
  const roleId = Number(id);

  const roles = useRoles();
  const postings = usePostings();
  const individuals = useIndividuals();
  const units = useUnits();
  const currentUser = useCurrentUser();
  const deletePosting = useDeletePosting();
  const { ask, ConfirmHost } = useConfirm();

  const [editingPosting, setEditingPosting] = useState<PostingEdit | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  if (
    roles.isLoading ||
    postings.isLoading ||
    individuals.isLoading ||
    units.isLoading
  )
    return <LoadingBlock label="Loading…" />;
  if (roles.error || postings.error || individuals.error || units.error)
    return (
      <ErrorBlock
        error={
          (roles.error ||
            postings.error ||
            individuals.error ||
            units.error) as Error
        }
      />
    );

  const role = roles.data?.find((r) => r.Id === roleId);
  if (!role) {
    return (
      <Stack spacing={2}>
        <Typography variant="h5">Role not found</Typography>
        <Link to="/roles" style={{ textDecoration: "none" }}>
          ← Back to roles
        </Link>
      </Stack>
    );
  }

  const isAdmin = currentUser.data?.IsSiteAdmin === true;
  const allRoles = roles.data ?? [];
  const allUnits = units.data ?? [];
  const allIndividuals = individuals.data ?? [];

  const myPostings = (postings.data ?? []).filter((p) => p.RoleId === roleId);
  const currentPosting = myPostings.find((p) => p.Status === "Current");
  const future = myPostings.filter(
    (p) => p.Status === "Planned" || p.Status === "Candidate",
  );
  const past = myPostings.filter((p) => p.Status === "Past");

  // Org context: focus on this role's L2 unit
  const fullTree = buildUnitTree(allUnits, allRoles);
  const contextTree = filterToL2Unit(fullTree, role.UnitId, allUnits);

  const indById = new Map(allIndividuals.map((i) => [i.Id, i]));
  const incumbents = new Map<number, NonNullable<typeof individuals.data>[number]>();
  const pendingByRole = new Map<number, number>();
  for (const p of postings.data ?? []) {
    if (p.Status === "Current") {
      const ind = indById.get(p.IndividualId);
      if (ind) incumbents.set(p.RoleId, ind);
    }
    if (p.Status === "Planned" || p.Status === "Candidate") {
      pendingByRole.set(p.RoleId, (pendingByRole.get(p.RoleId) ?? 0) + 1);
    }
  }

  const currentIncumbent = currentPosting
    ? indById.get(currentPosting.IndividualId)
    : undefined;

  const est = formatEstablishment(role.EstablishmentRank, role.EstablishmentVocation);

  function buildEdit(p: (typeof myPostings)[number]): PostingEdit {
    const ind = indById.get(p.IndividualId);
    // role is non-null here — the early return above guards this code path
    return {
      id: p.Id,
      individualName: formatName(ind?.Rank, ind?.Title ?? p.Individual.Title),
      roleTitle: role!.Title,
      unitName: role!.Unit?.Title ?? role!.ExternalUnit ?? "External",
      status: p.Status,
      startDate: p.StartDate,
      endDate: p.EndDate,
      notes: p.Notes,
    };
  }

  function handleDelete(p: (typeof myPostings)[number]) {
    const ind = indById.get(p.IndividualId);
    ask({
      title: "Delete this posting?",
      message: `Remove ${p.Status.toLowerCase()} posting for ${formatName(ind?.Rank, ind?.Title ?? "Unknown")}? This cannot be undone.`,
      destructive: true,
      confirmLabel: "Delete posting",
      onConfirm: () => deletePosting.mutateAsync(p.Id),
    });
  }

  return (
    <Stack spacing={3}>
      <Link
        to="/roles"
        style={{
          color: "rgba(0,0,0,0.5)",
          fontSize: 11,
          fontFamily: '"Geist Mono", monospace',
          textTransform: "uppercase",
          letterSpacing: "0.04em",
          textDecoration: "none",
        }}
      >
        ← Roles
      </Link>

      <PageHeader
        overline="Manpower · Role"
        title={
          <Stack direction="row" alignItems="baseline" gap={1.5} flexWrap="wrap">
            <span>{role.Title}</span>
            {role.IsVacant && (
              <Typography variant="caption" sx={{ color: CORAL, fontSize: 12 }}>
                Vacant
              </Typography>
            )}
          </Stack>
        }
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
            <span>{role.Unit?.Title ?? role.ExternalUnit ?? "External"}</span>
            <span>· {role.Level}</span>
            {est && <span>· {est}</span>}
            {role.IsExternal && <span>· External</span>}
            {role.Specialisation && <span>· {role.Specialisation}</span>}
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

          {/* Current incumbent */}
          <Paper sx={{ p: 2.5 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1.5 }}
            >
              <Typography variant="caption">Current incumbent</Typography>
              {isAdmin && currentPosting && (
                <Tooltip title="Edit posting dates / status">
                  <IconButton
                    size="small"
                    onClick={() => setEditingPosting(buildEdit(currentPosting))}
                  >
                    <EditIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Stack>

            {currentPosting && currentIncumbent ? (
              <Stack direction="row" alignItems="flex-start" gap={1.5}>
                <StatusBadge status={currentPosting.Status} />
                <Box sx={{ flex: 1, fontSize: 14 }}>
                  <Link
                    to="/individuals/$id"
                    params={{ id: String(currentIncumbent.Id) }}
                    style={{
                      color: "#01219C",
                      fontWeight: 500,
                      textDecoration: "none",
                    }}
                  >
                    {formatName(currentIncumbent.Rank, currentIncumbent.Title)}
                  </Link>
                  {(currentPosting.StartDate || currentPosting.EndDate) && (
                    <Box
                      sx={{
                        fontFamily: '"Geist Mono", monospace',
                        fontSize: 10,
                        color: "text.secondary",
                        mt: 0.5,
                      }}
                    >
                      {formatDate(currentPosting.StartDate, "?")} →{" "}
                      {formatDate(currentPosting.EndDate, "ongoing")}
                    </Box>
                  )}
                  {currentPosting.Notes && (
                    <Typography
                      variant="body2"
                      sx={{ color: "text.secondary", fontStyle: "italic", mt: 0.75 }}
                    >
                      {currentPosting.Notes}
                    </Typography>
                  )}
                </Box>
              </Stack>
            ) : (
              <Stack direction="row" alignItems="center" gap={2}>
                <Typography
                  variant="body2"
                  sx={{ color: CORAL, fontStyle: "italic" }}
                >
                  Vacant — no current incumbent.
                </Typography>
                {isAdmin && (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<AddIcon />}
                    onClick={() => setAddOpen(true)}
                  >
                    Assign person
                  </Button>
                )}
              </Stack>
            )}
          </Paper>

          {/* Incumbent timeline */}
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="caption" sx={{ display: "block", mb: 1.5 }}>
              Incumbent timeline
            </Typography>
            <PostingTimeline
              postings={myPostings}
              mode="role"
              roles={allRoles}
              individuals={allIndividuals}
            />
          </Paper>

          {/* Who is coming in next? */}
          <Paper sx={{ p: 2.5 }}>
            <Stack
              direction="row"
              alignItems="center"
              justifyContent="space-between"
              sx={{ mb: 1.5 }}
            >
              <Typography variant="caption">Who is coming in next?</Typography>
              {isAdmin && (
                <Tooltip title="Add a planned or candidate posting for this role">
                  <Button
                    size="small"
                    startIcon={<AddIcon />}
                    onClick={() => setAddOpen(true)}
                    sx={{ minWidth: 0 }}
                  >
                    Assign incoming
                  </Button>
                </Tooltip>
              )}
            </Stack>

            {future.length === 0 ? (
              <Typography
                variant="body2"
                sx={{ color: "text.secondary", fontStyle: "italic" }}
              >
                No planned or candidate incumbents yet.
              </Typography>
            ) : (
              <Stack spacing={1.25}>
                {future.map((p) => {
                  const ind = indById.get(p.IndividualId);
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
                          to="/individuals/$id"
                          params={{ id: String(p.IndividualId) }}
                          style={{
                            color: "#01219C",
                            fontWeight: 500,
                            textDecoration: "none",
                          }}
                        >
                          {formatName(ind?.Rank, ind?.Title ?? "Unknown")}
                        </Link>
                        {(p.StartDate || p.EndDate) && (
                          <Box
                            sx={{
                              fontFamily: '"Geist Mono", monospace',
                              fontSize: 10,
                              color: "text.secondary",
                              mt: 0.5,
                            }}
                          >
                            {formatDate(p.StartDate, "?")} → {formatDate(p.EndDate, "?")}
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

          {/* Past incumbents */}
          {past.length > 0 && (
            <Paper sx={{ p: 2.5 }}>
              <Typography
                variant="caption"
                sx={{ display: "block", mb: 1.5 }}
              >
                Past incumbents
              </Typography>
              <Stack spacing={1}>
                {past.map((p) => {
                  const ind = indById.get(p.IndividualId);
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
                          to="/individuals/$id"
                          params={{ id: String(p.IndividualId) }}
                          style={{
                            fontWeight: 500,
                            textDecoration: "none",
                            color: "inherit",
                          }}
                        >
                          {formatName(ind?.Rank, ind?.Title ?? "Unknown")}
                        </Link>
                        <Box
                          component="span"
                          sx={{
                            ml: 1,
                            fontFamily: '"Geist Mono", monospace',
                            fontSize: 10,
                            color: "text.secondary",
                          }}
                        >
                          {formatDate(p.StartDate)} → {formatDate(p.EndDate)}
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
          <Box
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: 10.5,
              color: "text.secondary",
              mb: 1.5,
              lineHeight: 1.4,
            }}
          >
            Highlighted:{" "}
            <Box
              component="span"
              sx={{ color: "text.primary", fontWeight: 500 }}
            >
              {role.Title}
            </Box>
            {" "}· {role.Unit?.Title ?? role.ExternalUnit ?? "External"}
          </Box>
          <OrgChart
            tree={contextTree}
            incumbents={incumbents}
            pendingByRole={pendingByRole}
          />
        </Paper>
      </Box>

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
          preselectedRoleId={roleId}
          individuals={allIndividuals}
          roles={allRoles}
        />
      )}
      {ConfirmHost}
    </Stack>
  );
}
