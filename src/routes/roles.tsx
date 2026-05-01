import { useMemo, useState } from "react";
import { Stack, Box, Paper, Typography, Chip } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { Link } from "@tanstack/react-router";
import { useRoles } from "@/hooks/useRoles";
import { useIndividuals } from "@/hooks/useIndividuals";
import { usePostings } from "@/hooks/usePostings";
import { useUnits } from "@/hooks/useUnits";
import {
  buildMovementRows,
  formatEstablishment,
  SIGNAL_RANK,
  type RoleMovementRow,
} from "@/lib/movement";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingBlock, ErrorBlock, PageHeader } from "./_shared";

const NAVY = "#01219C";
const CORAL = "#F9866B";

type FilterKey =
  | "movement"
  | "vacancies"
  | "ending-soon"
  | "incoming"
  | "all";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "movement", label: "All movement" },
  { key: "vacancies", label: "Vacancies" },
  { key: "ending-soon", label: "Ending soon" },
  { key: "incoming", label: "Has incoming" },
  { key: "all", label: "All roles" },
];

function matches(row: RoleMovementRow, key: FilterKey): boolean {
  switch (key) {
    case "all":
      return true;
    case "movement":
      return row.Signal !== "stable";
    case "vacancies":
      return row.IsVacant || row.Signal === "vacant";
    case "ending-soon":
      return row.Signal === "ending-soon";
    case "incoming":
      return row.Incoming.length > 0;
  }
}

export function RolesPage() {
  const [filter, setFilter] = useState<FilterKey>("movement");

  const roles = useRoles();
  const individuals = useIndividuals();
  const postings = usePostings();
  const units = useUnits();

  const allRows = useMemo((): RoleMovementRow[] => {
    if (!roles.data || !individuals.data || !postings.data || !units.data)
      return [];
    const unitNameById = new Map(units.data.map((u) => [u.Id, u.Title]));
    return buildMovementRows(
      roles.data,
      individuals.data,
      postings.data,
      unitNameById,
    );
  }, [roles.data, individuals.data, postings.data, units.data]);

  const filtered = useMemo(
    () => allRows.filter((r) => matches(r, filter)),
    [allRows, filter],
  );

  if (
    roles.isLoading || individuals.isLoading || postings.isLoading || units.isLoading
  )
    return <LoadingBlock label="Loading roles…" />;
  if (
    roles.error || individuals.error || postings.error || units.error
  )
    return (
      <ErrorBlock
        error={
          (roles.error || individuals.error || postings.error || units.error) as Error
        }
      />
    );

  const totals = {
    all: allRows.length,
    vacant: allRows.filter((r) => r.IsVacant || r.Signal === "vacant").length,
    endingSoon: allRows.filter((r) => r.Signal === "ending-soon").length,
    incoming: allRows.reduce((acc, r) => acc + r.Incoming.length, 0),
  };

  const cols: GridColDef<RoleMovementRow>[] = [
    {
      field: "Title",
      headerName: "Role",
      flex: 1.5,
      minWidth: 220,
      valueGetter: (_v, row) => row.Title,
      renderCell: (params) => {
        const r = params.row;
        const est = formatEstablishment(
          r.EstablishmentRank,
          r.EstablishmentVocation,
        );
        return (
          <Stack
            direction="row"
            alignItems="baseline"
            gap={1}
            flexWrap="wrap"
          >
            <Link
              to="/roles/$id"
              params={{ id: String(r.Id) }}
              style={{
                color: NAVY,
                fontWeight: 500,
                textDecoration: "none",
              }}
            >
              {r.Title}
            </Link>
            <Box
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: 10,
                color: "text.secondary",
              }}
            >
              {r.Level}
            </Box>
            {est && (
              <Box
                sx={{
                  fontFamily: '"Geist Mono", monospace',
                  fontSize: 10,
                  px: 0.75, py: 0.25,
                  borderRadius: 0.5,
                  bgcolor: "rgba(0,0,0,0.05)",
                  color: "text.secondary",
                }}
              >
                {est}
              </Box>
            )}
          </Stack>
        );
      },
    },
    {
      field: "UnitName",
      headerName: "Branch",
      flex: 1,
      minWidth: 140,
      valueGetter: (_v, row) => row.UnitName,
      renderCell: (params) => (
        <Box sx={{ color: "text.secondary" }}>{params.row.UnitName}</Box>
      ),
    },
    {
      field: "Signal",
      headerName: "Movement",
      flex: 1.2,
      minWidth: 200,
      sortComparator: (a, b) =>
        SIGNAL_RANK[a as RoleMovementRow["Signal"]] -
        SIGNAL_RANK[b as RoleMovementRow["Signal"]],
      valueGetter: (_v, row) => row.Signal,
      renderCell: (params) => <SignalCell row={params.row} />,
    },
    {
      field: "Out",
      headerName: "Going out",
      flex: 1.5,
      minWidth: 200,
      sortable: false,
      renderCell: (params) => <OutCell row={params.row} />,
    },
    {
      field: "In",
      headerName: "Coming in",
      flex: 2,
      minWidth: 260,
      sortable: false,
      renderCell: (params) => <InCell row={params.row} />,
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        overline="Manpower · Movement watchlist"
        title="Roles in motion"
        blurb="Roles where something is happening — vacancies, current incumbents ending soon, or candidates / planned successors queued. Use the chips to narrow, click a column header to sort, or flip to All roles for the wholesale list."
      />

      <Box
        sx={{
          display: "grid",
          gap: 1.5,
          gridTemplateColumns: { xs: "repeat(2, 1fr)", md: "repeat(4, 1fr)" },
        }}
      >
        <StatBlock label="Vacant" value={totals.vacant} accent={totals.vacant > 0} />
        <StatBlock label="Ending soon" value={totals.endingSoon} />
        <StatBlock label="Incoming queued" value={totals.incoming} />
        <StatBlock label="Total roles" value={totals.all} />
      </Box>

      <Stack direction="row" flexWrap="wrap" gap={1}>
        {FILTERS.map((f) => {
          const count = allRows.filter((r) => matches(r, f.key)).length;
          const isActive = filter === f.key;
          return (
            <Chip
              key={f.key}
              clickable
              label={
                <Box
                  sx={{
                    fontFamily: '"Geist Mono", monospace',
                    fontSize: 11,
                  }}
                >
                  {f.label}{" "}
                  <Box
                    component="span"
                    sx={{
                      ml: 0.5,
                      color: isActive ? "rgba(255,255,255,0.7)" : "text.secondary",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {count}
                  </Box>
                </Box>
              }
              onClick={() => setFilter(f.key)}
              sx={{
                bgcolor: isActive ? NAVY : "background.paper",
                color: isActive ? "white" : "text.primary",
                borderRadius: "999px",
                "&:hover": {
                  bgcolor: isActive ? NAVY : "background.paper",
                  borderColor: "primary.main",
                },
              }}
              variant={isActive ? "filled" : "outlined"}
            />
          );
        })}
      </Stack>

      <Box sx={{ height: 600 }}>
        <DataGrid
          rows={filtered}
          columns={cols}
          getRowId={(r) => r.Id}
          disableRowSelectionOnClick
          getRowHeight={() => "auto"}
          initialState={{
            sorting: { sortModel: [{ field: "Signal", sort: "asc" }] },
          }}
          sx={{
            bgcolor: "background.paper",
            borderColor: "rgba(0,0,0,0.08)",
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: NAVY,
              color: "white",
              borderRadius: 0,
              fontFamily: '"Geist Mono", monospace',
              textTransform: "uppercase",
              fontSize: 11,
              letterSpacing: "0.04em",
            },
            "& .MuiDataGrid-cell": {
              alignItems: "flex-start",
              py: 1.25,
              fontSize: 14,
            },
          }}
        />
      </Box>
    </Stack>
  );
}

function SignalCell({ row }: { row: RoleMovementRow }) {
  const badges: { label: string; bg: string; color: string }[] = [];
  if (row.IsVacant || row.Signal === "vacant") {
    badges.push({ label: "Vacant", bg: "rgba(249,134,107,0.10)", color: CORAL });
  }
  if (row.Signal === "ending-soon") {
    badges.push({ label: "Ending soon", bg: "#FAEEDA", color: "#633806" });
  }
  if (row.Incoming.some((p) => p.Status === "Planned")) {
    badges.push({ label: "Successor planned", bg: "#B5D4F4", color: "#0C447C" });
  } else if (row.Incoming.some((p) => p.Status === "Candidate")) {
    badges.push({ label: "Has candidates", bg: "#B5D4F4", color: "#0C447C" });
  }
  if (badges.length === 0) {
    return (
      <Typography
        variant="caption"
        sx={{ color: "text.secondary" }}
      >
        Stable
      </Typography>
    );
  }
  return (
    <Stack direction="row" flexWrap="wrap" gap={0.75}>
      {badges.map((b) => (
        <Box
          key={b.label}
          sx={{
            fontFamily: '"Sometype Mono", monospace',
            fontSize: 10.5,
            fontWeight: 600,
            letterSpacing: "0.07em",
            textTransform: "uppercase",
            borderRadius: "999px",
            px: 1, py: 0.25,
            bgcolor: b.bg,
            color: b.color,
          }}
        >
          {b.label}
        </Box>
      ))}
    </Stack>
  );
}

function OutCell({ row }: { row: RoleMovementRow }) {
  const c = row.Current;
  if (!c)
    return (
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        —
      </Typography>
    );
  return (
    <Box sx={{ lineHeight: 1.4 }}>
      <Link
        to="/individuals/$id"
        params={{ id: String(c.IndividualId) }}
        style={{ textDecoration: "none", color: "inherit" }}
      >
        {c.IndividualName}
      </Link>
      {c.Rank && (
        <Box component="span" sx={{ color: "text.secondary" }}>
          {" "}· {c.Rank}
        </Box>
      )}
      {c.EndDate && (
        <Box
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 10,
            color: "text.secondary",
            mt: 0.25,
          }}
        >
          ends {c.EndDate}
        </Box>
      )}
    </Box>
  );
}

function InCell({ row }: { row: RoleMovementRow }) {
  if (row.Incoming.length === 0)
    return (
      <Typography variant="caption" sx={{ color: "text.secondary" }}>
        —
      </Typography>
    );
  const shown = row.Incoming.slice(0, 2);
  const rest = row.Incoming.length - shown.length;
  return (
    <Stack spacing={0.5}>
      {shown.map((p) => (
        <Stack
          key={p.Id}
          direction="row"
          alignItems="center"
          gap={1}
          sx={{ lineHeight: 1.4 }}
        >
          <StatusBadge status={p.Status} />
          <Link
            to="/individuals/$id"
            params={{ id: String(p.IndividualId) }}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            {p.IndividualName}
          </Link>
          {p.StartDate && (
            <Box
              sx={{
                fontFamily: '"Geist Mono", monospace',
                fontSize: 10,
                color: "text.secondary",
              }}
            >
              {p.StartDate}
            </Box>
          )}
        </Stack>
      ))}
      {rest > 0 && (
        <Box
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 10,
            color: "text.secondary",
          }}
        >
          + {rest} more
        </Box>
      )}
    </Stack>
  );
}

function StatBlock({
  label,
  value,
  accent,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <Paper sx={{ px: 2, py: 1.5 }}>
      <Typography variant="caption">{label}</Typography>
      <Box
        sx={{
          fontSize: 24,
          fontWeight: 600,
          mt: 0.5,
          fontVariantNumeric: "tabular-nums",
          lineHeight: 1,
          color: accent ? CORAL : "text.primary",
        }}
      >
        {value}
      </Box>
    </Paper>
  );
}
