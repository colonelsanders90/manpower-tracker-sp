// Outgoing / Incoming movements panel for the dashboard.
//
// Filters Planned/Candidate postings whose StartDate is within the next 90
// days, by direction:
//   - "out" → RAiDer (Individual.IsExternal=false) moving to an external role
//             (Role.IsExternal=true). i.e. someone leaving RAiD.
//   - "in"  → External individual (Individual.IsExternal=true) moving into a
//             RAiD role (Role.IsExternal=false). i.e. someone coming in.
//
// Internal moves (RAiDer → RAiD role) are NOT shown — those are normal tour
// rotations, surfaced on the Roles page instead.

import { Box, Paper, Stack, Typography } from "@mui/material";
import { Link } from "@tanstack/react-router";
import { StatusBadge } from "../shared/StatusBadge";
import { formatName, formatDate } from "@/lib/formatters";
import { NAVY } from "@/lib/tokens";
import type { PostingListItem } from "@/types/postings";
import type { RoleListItem } from "@/types/roles";
import type { IndividualListItem } from "@/types/individuals";

const WINDOW_DAYS = 90;

export type MovementDirection = "out" | "in";

type Props = {
  direction: MovementDirection;
  postings: PostingListItem[];
  roles: RoleListItem[];
  individuals: IndividualListItem[];
};

type Row = {
  postingId: number;
  status: "Planned" | "Candidate";
  startDate: string;
  individualId: number;
  individualName: string;
  individualRank: string | null;
  roleId: number;
  roleTitle: string;
  unitName: string;
};

const TITLE: Record<MovementDirection, string> = {
  out: "Outgoing — leaving RAiD",
  in: "Incoming — joining RAiD",
};

const EMPTY: Record<MovementDirection, string> = {
  out: "Nobody planned to leave RAiD in the next quarter.",
  in: "Nobody planned to join RAiD in the next quarter.",
};

export function UpcomingMovements({
  direction,
  postings,
  roles,
  individuals,
}: Props) {
  const today = new Date();
  const cutoff = new Date(today);
  cutoff.setDate(cutoff.getDate() + WINDOW_DAYS);

  const indById = new Map(individuals.map((i) => [i.Id, i]));
  const roleById = new Map(roles.map((r) => [r.Id, r]));

  const rows: Row[] = postings
    .filter((p) => {
      if (p.Status !== "Planned" && p.Status !== "Candidate") return false;
      if (!p.StartDate) return false;
      const start = new Date(p.StartDate);
      if (start < today || start > cutoff) return false;

      const ind = indById.get(p.IndividualId);
      const role = roleById.get(p.RoleId);
      if (!ind || !role) return false;

      // Direction filter
      if (direction === "out") {
        // RAiDer → external role
        return ind.IsExternal === false && role.IsExternal === true;
      }
      // direction === "in" — external individual → RAiD role
      return ind.IsExternal === true && role.IsExternal === false;
    })
    .map((p): Row | null => {
      const ind = indById.get(p.IndividualId);
      const role = roleById.get(p.RoleId);
      if (!ind || !role || !p.StartDate) return null;
      return {
        postingId: p.Id,
        status: p.Status as "Planned" | "Candidate",
        startDate: p.StartDate,
        individualId: ind.Id,
        individualName: formatName(ind.Rank, ind.Title),
        individualRank: ind.Rank,
        roleId: role.Id,
        roleTitle: role.Title,
        unitName: role.Unit?.Title ?? role.ExternalUnit ?? "External",
      };
    })
    .filter((r): r is Row => r !== null)
    .sort(
      (a, b) =>
        new Date(a.startDate).getTime() - new Date(b.startDate).getTime(),
    );

  return (
    <Paper sx={{ p: 3, height: "100%" }}>
      <Stack direction="row" alignItems="baseline" justifyContent="space-between">
        <Typography variant="caption">{TITLE[direction]}</Typography>
        <Typography
          variant="caption"
          sx={{ color: "text.secondary", textTransform: "none", letterSpacing: 0 }}
        >
          next {WINDOW_DAYS} days
        </Typography>
      </Stack>

      {rows.length === 0 ? (
        <Box
          sx={{
            mt: 2,
            py: 4,
            textAlign: "center",
            color: "text.secondary",
            fontStyle: "italic",
          }}
        >
          {EMPTY[direction]}
        </Box>
      ) : (
        <Stack
          spacing={1.25}
          sx={{
            mt: 2,
            maxHeight: 320,
            overflowY: "auto",
            pr: 0.5,
          }}
        >
          {rows.map((r) => (
            <UpcomingRow key={r.postingId} row={r} />
          ))}
        </Stack>
      )}
    </Paper>
  );
}

function UpcomingRow({ row }: { row: Row }) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "auto auto 1fr",
        gap: 1.25,
        alignItems: "baseline",
        py: 1,
        borderBottom: "1px solid rgba(0,0,0,0.06)",
        "&:last-child": { borderBottom: "none" },
      }}
    >
      <Box
        sx={{
          fontFamily: "Geist Mono, monospace",
          fontSize: 11,
          color: "text.secondary",
          letterSpacing: "0.04em",
          minWidth: 92,
        }}
      >
        {formatDate(row.startDate, "")}
      </Box>
      <Box>
        <StatusBadge status={row.status} />
      </Box>
      <Box sx={{ fontSize: 13.5, lineHeight: 1.4 }}>
        <Link
          to="/individuals/$id"
          params={{ id: String(row.individualId) }}
          style={{ color: NAVY, textDecoration: "none", fontWeight: 500 }}
        >
          {row.individualName}
        </Link>{" "}
        <Box component="span" sx={{ color: "text.secondary" }}>
          →
        </Box>{" "}
        <Link
          to="/roles/$id"
          params={{ id: String(row.roleId) }}
          style={{ color: "inherit", textDecoration: "none" }}
        >
          {row.roleTitle}{" "}
          <Box component="span" sx={{ color: "text.secondary" }}>
            · {row.unitName}
          </Box>
        </Link>
      </Box>
    </Box>
  );
}
