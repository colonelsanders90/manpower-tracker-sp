import { Box, Paper, Stack, Typography } from "@mui/material";
import { Link, useParams } from "@tanstack/react-router";
import { useRoles } from "@/hooks/useRoles";
import { usePostings } from "@/hooks/usePostings";
import { useIndividuals } from "@/hooks/useIndividuals";
import { useUnits } from "@/hooks/useUnits";
import { buildUnitTree } from "@/lib/hierarchy";
import { OrgChart } from "@/components/OrgChart";
import { PostingTimeline } from "@/components/PostingTimeline";
import { StatusBadge } from "@/components/StatusBadge";
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

  if (
    roles.isLoading || postings.isLoading || individuals.isLoading || units.isLoading
  )
    return <LoadingBlock label="Loading…" />;
  if (
    roles.error || postings.error || individuals.error || units.error
  )
    return (
      <ErrorBlock
        error={
          (roles.error || postings.error || individuals.error || units.error) as Error
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

  const myPostings = (postings.data ?? []).filter((p) => p.RoleId === roleId);
  const future = myPostings.filter(
    (p) => p.Status === "Planned" || p.Status === "Candidate",
  );
  const past = myPostings.filter((p) => p.Status === "Past");

  const tree = buildUnitTree(units.data ?? [], roles.data ?? []);
  const incumbents = new Map<
    number,
    NonNullable<typeof individuals.data>[number]
  >();
  const pendingByRole = new Map<number, number>();
  const indById = new Map((individuals.data ?? []).map((i) => [i.Id, i]));
  for (const p of postings.data ?? []) {
    if (p.Status === "Current") {
      const ind = indById.get(p.IndividualId);
      if (ind) incumbents.set(p.RoleId, ind);
    }
    if (p.Status === "Planned" || p.Status === "Candidate") {
      pendingByRole.set(
        p.RoleId,
        (pendingByRole.get(p.RoleId) ?? 0) + 1,
      );
    }
  }

  const est = formatEstablishment(
    role.EstablishmentRank,
    role.EstablishmentVocation,
  );

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
          <Stack
            direction="row"
            alignItems="baseline"
            gap={1.5}
            flexWrap="wrap"
          >
            <span>{role.Title}</span>
            {role.IsVacant && (
              <Typography
                variant="caption"
                sx={{ color: CORAL, fontSize: 12 }}
              >
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
          gridTemplateColumns: { xs: "1fr", lg: "1fr 360px" },
        }}
      >
        <Stack spacing={3}>
          <Paper sx={{ p: 2.5 }}>
            <Typography variant="caption" sx={{ display: "block", mb: 1.5 }}>
              Incumbent timeline
            </Typography>
            <PostingTimeline
              postings={myPostings}
              mode="role"
              roles={roles.data ?? []}
            />
          </Paper>

          <Paper sx={{ p: 2.5 }}>
            <Typography variant="caption" sx={{ display: "block", mb: 1.5 }}>
              Who is coming in next?
            </Typography>
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
                  const ind = (individuals.data ?? []).find(
                    (i) => i.Id === p.IndividualId,
                  );
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
                          {ind?.Title ?? "Unknown"}
                        </Link>
                        {ind?.Rank && (
                          <Box component="span" sx={{ color: "text.secondary" }}>
                            {" "}· {ind.Rank}
                          </Box>
                        )}
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
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </Paper>

          {past.length > 0 && (
            <Paper sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ display: "block", mb: 1.5 }}>
                Past incumbents
              </Typography>
              <Stack spacing={1}>
                {past.map((p) => {
                  const ind = (individuals.data ?? []).find(
                    (i) => i.Id === p.IndividualId,
                  );
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
                          {ind?.Title}
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
            </Box>{" "}· {role.Unit?.Title ?? role.ExternalUnit ?? "External"}
          </Box>
          <OrgChart
            tree={tree}
            incumbents={incumbents}
            pendingByRole={pendingByRole}
          />
        </Paper>
      </Box>
    </Stack>
  );
}
