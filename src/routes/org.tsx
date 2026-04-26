import { Stack, Box, Typography } from "@mui/material";
import { useUnits } from "@/hooks/useUnits";
import { useRoles } from "@/hooks/useRoles";
import { useIndividuals } from "@/hooks/useIndividuals";
import { usePostings } from "@/hooks/usePostings";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { buildUnitTree } from "@/lib/hierarchy";
import { OrgChart } from "@/components/OrgChart";
import { LoadingBlock, ErrorBlock, PageHeader } from "./_shared";

export function OrgPage() {
  const units = useUnits();
  const roles = useRoles();
  const individuals = useIndividuals();
  const postings = usePostings();
  const currentUser = useCurrentUser();
  const isAdmin = currentUser.data?.IsSiteAdmin === true;

  if (units.isLoading || roles.isLoading || individuals.isLoading || postings.isLoading)
    return <LoadingBlock label="Loading org tree…" />;
  if (units.error || roles.error || individuals.error || postings.error)
    return (
      <ErrorBlock
        error={
          (units.error || roles.error || individuals.error || postings.error) as Error
        }
      />
    );

  const u = units.data ?? [];
  const r = roles.data ?? [];
  const i = individuals.data ?? [];
  const p = postings.data ?? [];

  const tree = buildUnitTree(u, r);

  // Per-role current incumbent + pending count
  const incumbents = new Map<number, (typeof i)[number]>();
  const pendingByRole = new Map<number, number>();
  const indById = new Map(i.map((x) => [x.Id, x]));
  for (const post of p) {
    if (post.Status === "Current") {
      const ind = indById.get(post.IndividualId);
      if (ind) incumbents.set(post.RoleId, ind);
    }
    if (post.Status === "Planned" || post.Status === "Candidate") {
      pendingByRole.set(
        post.RoleId,
        (pendingByRole.get(post.RoleId) ?? 0) + 1,
      );
    }
  }

  return (
    <Stack spacing={4}>
      <PageHeader
        overline="Manpower · Organisation"
        title={
          <>
            RA<span style={{ textTransform: "lowercase" }}>i</span>D Org Structure
          </>
        }
        blurb="The whole tree at a glance. Click any role to see incumbents and who is queued to come in."
      />

      <Stack
        direction="row"
        flexWrap="wrap"
        alignItems="center"
        gap={2}
        sx={{
          color: "text.secondary",
          fontFamily: '"Geist Mono", monospace',
          fontSize: 12,
        }}
      >
        <Typography variant="caption">Legend</Typography>
        <LegendDot color="#01219C" label="Head" />
        <LegendDot color="#008ED0" label="Filled" />
        <LegendDot color="#F9866B" label="Vacant" />
        <LegendDot color="#B4B2A9" label="Unfilled" />
      </Stack>

      {isAdmin ? (
        <OrgChart
          tree={tree}
          incumbents={incumbents}
          pendingByRole={pendingByRole}
          editable
          allIndividuals={i}
          allRoles={r}
        />
      ) : (
        <OrgChart
          tree={tree}
          incumbents={incumbents}
          pendingByRole={pendingByRole}
        />
      )}
    </Stack>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
      <Box sx={{ width: 8, height: 8, borderRadius: "50%", bgcolor: color }} />
      {label}
    </Box>
  );
}
