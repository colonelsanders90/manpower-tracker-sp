import { Box, Paper, Stack, Typography } from "@mui/material";
import { Link, useParams } from "@tanstack/react-router";
import { useIndividuals } from "@/hooks/useIndividuals";
import { usePostings } from "@/hooks/usePostings";
import { useRoles } from "@/hooks/useRoles";
import { useUnits } from "@/hooks/useUnits";
import { buildUnitTree } from "@/lib/hierarchy";
import { OrgChart } from "@/components/charts/OrgChart";
import { PostingTimeline } from "@/components/charts/PostingTimeline";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingBlock, ErrorBlock, PageHeader } from "./_shared";

export function IndividualDetailPage() {
  const { id } = useParams({ from: "/individuals/$id" });
  const individualId = Number(id);

  const individuals = useIndividuals();
  const postings = usePostings();
  const roles = useRoles();
  const units = useUnits();

  if (
    individuals.isLoading || postings.isLoading || roles.isLoading || units.isLoading
  )
    return <LoadingBlock label="Loading…" />;
  if (
    individuals.error || postings.error || roles.error || units.error
  )
    return (
      <ErrorBlock
        error={
          (individuals.error || postings.error || roles.error || units.error) as Error
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

  const myPostings = (postings.data ?? []).filter(
    (p) => p.IndividualId === individualId,
  );
  const current = myPostings.find((p) => p.Status === "Current");
  const future = myPostings.filter(
    (p) => p.Status === "Planned" || p.Status === "Candidate",
  );
  const past = myPostings.filter((p) => p.Status === "Past");

  const allRoles = roles.data ?? [];
  const allUnits = units.data ?? [];
  const tree = buildUnitTree(allUnits, allRoles);

  const incumbents = new Map<number, (typeof ind)>();
  const pendingByRole = new Map<number, number>();
  const indById = new Map((individuals.data ?? []).map((i) => [i.Id, i]));
  for (const p of postings.data ?? []) {
    if (p.Status === "Current") {
      const i2 = indById.get(p.IndividualId);
      if (i2) incumbents.set(p.RoleId, i2);
    }
    if (p.Status === "Planned" || p.Status === "Candidate") {
      pendingByRole.set(
        p.RoleId,
        (pendingByRole.get(p.RoleId) ?? 0) + 1,
      );
    }
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
        title={ind.Title}
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
            {ind.Rank && <span>{ind.Rank}</span>}
            {ind.Specialisation && <span>· {ind.Specialisation}</span>}
            {ind.EmployeeId && <span>· {ind.EmployeeId}</span>}
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
              Movement timeline
            </Typography>
            <PostingTimeline
              postings={myPostings}
              mode="individual"
              roles={allRoles}
            />
          </Paper>

          <Paper sx={{ p: 2.5 }}>
            <Typography variant="caption" sx={{ display: "block", mb: 1.5 }}>
              Where next?
            </Typography>
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
                          {" "}· {role?.Unit?.Title ?? role?.ExternalUnit ?? "External"} ·{" "}
                          {role?.Level}
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
                    </Stack>
                  );
                })}
              </Stack>
            )}
          </Paper>

          {past.length > 0 && (
            <Paper sx={{ p: 2.5 }}>
              <Typography variant="caption" sx={{ display: "block", mb: 1.5 }}>
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
                        <Box component="span" sx={{ color: "text.secondary" }}>
                          {" "}· {role?.Unit?.Title ?? role?.ExternalUnit ?? "External"}
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
              {allRoles.find((r) => r.Id === current.RoleId)?.Unit?.Title ?? "—"}
            </Box>
          )}
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
