import { Box, Paper, Stack, Typography } from "@mui/material";
import { Link } from "@tanstack/react-router";
import { useUnits } from "@/hooks/useUnits";
import { useRoles } from "@/hooks/useRoles";
import { useIndividuals } from "@/hooks/useIndividuals";
import { usePostings } from "@/hooks/usePostings";
import { FilledRolesDonut } from "@/components/charts/FilledRolesDonut";
import { UpcomingMovements } from "@/components/charts/UpcomingMovements";
import { LoadingBlock, ErrorBlock } from "./_shared";

const NAVY = "#01219C";
const CORAL = "#F9866B";

export function DashboardPage() {
  const units = useUnits();
  const roles = useRoles();
  const individuals = useIndividuals();
  const postings = usePostings();

  const loading =
    units.isLoading || roles.isLoading || individuals.isLoading || postings.isLoading;
  const error =
    units.error || roles.error || individuals.error || postings.error;

  if (loading) return <LoadingBlock label="Loading manpower data…" />;
  if (error) return <ErrorBlock error={error as Error} />;

  const u = units.data ?? [];
  const r = roles.data ?? [];
  const i = individuals.data ?? [];
  const p = postings.data ?? [];

  // Filled = roles with a Current posting. We don't trust the IsVacant flag
  // on its own (it's a cached derivation; Phase 4 keeps it in sync, but the
  // canonical signal is the postings list).
  const filledRoleIds = new Set<number>();
  for (const post of p) if (post.Status === "Current") filledRoleIds.add(post.RoleId);

  const internalRoles = r.filter((x) => !x.IsExternal);
  const filled = internalRoles.filter((x) => filledRoleIds.has(x.Id)).length;
  const vacant = internalRoles.length - filled;

  const counts = {
    units: u.length,
    roles: internalRoles.length,
    individuals: i.length,
    current: p.filter((x) => x.Status === "Current").length,
    planned: p.filter((x) => x.Status === "Planned").length,
    candidate: p.filter((x) => x.Status === "Candidate").length,
    vacant,
  };

  return (
    <Stack spacing={5}>
      <Box sx={{ borderLeft: `5px solid ${NAVY}`, pl: 2.5, py: 0.5 }}>
        <Typography variant="caption">Manpower · Dashboard</Typography>
        <Typography variant="h4" sx={{ mt: 0.5 }}>
          RA<span style={{ textTransform: "lowercase" }}>i</span>D Manpower Tracker
        </Typography>
        <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5, maxWidth: 640 }}>
          A movement ledger for RA<span style={{ textTransform: "lowercase" }}>i</span>Ders.
          Track who is moving where next, and who is coming in next — across
          RA<span style={{ textTransform: "lowercase" }}>i</span>D HQ and its
          branches.
        </Typography>
      </Box>

      <Box>
        <Typography variant="caption" sx={{ display: "block", mb: 1.5 }}>
          Pick a lens
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", md: "repeat(3, 1fr)" },
          }}
        >
          <LensCard
            to="/org"
            title="By organisation"
            blurb="See the whole tree. Heads, branches, who fills which role, where the gaps are."
            stat={`${counts.units} units · ${counts.vacant} vacant`}
            primary
          />
          <LensCard
            to="/individuals"
            title="By individual"
            blurb="Pick a person to see their posting history, current role, and where they might move next."
            stat={`${counts.individuals} people tracked`}
          />
          <LensCard
            to="/roles"
            title="By role"
            blurb="Pick a role to see past and current incumbents, plus who is queued to come in."
            stat={`${counts.roles} roles`}
          />
        </Box>
      </Box>

      <Box>
        <Typography variant="caption" sx={{ display: "block", mb: 1.5 }}>
          At a glance
        </Typography>
        <Box
          sx={{
            display: "grid",
            gap: 1.5,
            gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
            mb: 2,
          }}
        >
          <Stat label="On Estab" value={counts.current} />
          <Stat
            label="Planned Movements"
            value={counts.planned}
            filter="planned"
          />
          <Stat
            label="Proposed Postings"
            value={counts.candidate}
            filter="candidate"
          />
          <Stat
            label="Vacant roles"
            value={counts.vacant}
            accent={counts.vacant > 0}
          />
        </Box>
        <Box
          sx={{
            display: "grid",
            gap: 2,
            gridTemplateColumns: { xs: "1fr", md: "minmax(280px, 1fr) 2fr" },
            alignItems: "start",
          }}
        >
          <FilledRolesDonut filled={filled} total={internalRoles.length} />
          <UpcomingMovements postings={p} roles={r} individuals={i} />
        </Box>
      </Box>
    </Stack>
  );
}

function LensCard({
  to,
  title,
  blurb,
  stat,
  primary,
}: {
  to: "/org" | "/individuals" | "/roles";
  title: string;
  blurb: string;
  stat: string;
  primary?: boolean;
}) {
  return (
    <Paper
      component={Link}
      to={to}
      sx={{
        display: "block",
        textDecoration: "none",
        color: "inherit",
        p: 2.5,
        transition: "all 150ms",
        outline: primary ? `1px solid rgba(0,142,208,0.3)` : undefined,
        "&:hover": {
          borderColor: "primary.main",
          transform: "translateY(-2px)",
        },
      }}
    >
      <Stack direction="row" alignItems="baseline" gap={1}>
        <Typography sx={{ fontWeight: 600, fontSize: 17 }}>{title}</Typography>
        <Box
          sx={{
            ml: "auto",
            fontFamily: '"Geist Mono", monospace',
            color: "primary.main",
          }}
        >
          →
        </Box>
      </Stack>
      <Typography variant="body2" sx={{ color: "text.secondary", mt: 1, lineHeight: 1.6 }}>
        {blurb}
      </Typography>
      <Typography variant="caption" sx={{ display: "block", mt: 2 }}>
        {stat}
      </Typography>
    </Paper>
  );
}

function Stat({
  label,
  value,
  accent,
  filter,
}: {
  label: string;
  value: number;
  accent?: boolean;
  /** When set, the card becomes a link to /individuals with this filter pre-selected. */
  filter?: "planned" | "candidate";
}) {
  const content = (
    <>
      <Typography variant="caption">{label}</Typography>
      <Box
        sx={{
          fontSize: 28,
          fontWeight: 600,
          mt: 0.5,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
          color: accent ? CORAL : "text.primary",
        }}
      >
        {value}
      </Box>
      {filter && (
        <Box
          sx={{
            mt: 0.75,
            fontFamily: '"Geist Mono", monospace',
            fontSize: 10,
            color: "primary.main",
            letterSpacing: "0.04em",
          }}
        >
          view list →
        </Box>
      )}
    </>
  );

  if (filter) {
    return (
      <Paper
        sx={{
          px: 2,
          py: 1.5,
          transition: "all 150ms",
          cursor: "pointer",
          "&:hover": { transform: "translateY(-1px)" },
        }}
      >
        <Link
          to="/individuals"
          search={{ filter }}
          style={{ display: "block", textDecoration: "none", color: "inherit" }}
        >
          {content}
        </Link>
      </Paper>
    );
  }

  return <Paper sx={{ px: 2, py: 1.5 }}>{content}</Paper>;
}
