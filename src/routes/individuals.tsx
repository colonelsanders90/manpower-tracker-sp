import { useMemo } from "react";
import { Stack, Box, Typography, Chip } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { Link, useSearch, useNavigate } from "@tanstack/react-router";
import { useIndividuals } from "@/hooks/useIndividuals";
import { usePostings } from "@/hooks/usePostings";
import { useRoles } from "@/hooks/useRoles";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { LoadingBlock, ErrorBlock, PageHeader } from "./_shared";
import { formatName } from "@/lib/formatters";
import type { PostingListItem } from "@/types/postings";

const NAVY = "#01219C";

type FilterKey = "planned" | "candidate" | "all";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "planned", label: "Planned" },
  { key: "candidate", label: "Proposed" },
  { key: "all", label: "All" },
];

type Row = {
  id: number;
  name: string;
  isExternal: boolean;
  current: { roleId: number; roleTitle: string; unitName: string } | null;
  future: PostingListItem[];
};

export function IndividualsPage() {
  // Read the filter from the URL — defaults to "planned" when not set.
  const search = useSearch({ from: "/individuals" });
  const activeFilter: FilterKey = search.filter ?? "planned";
  const navigate = useNavigate({ from: "/individuals" });

  const individuals = useIndividuals();
  const postings = usePostings();
  const roles = useRoles();

  const allRows = useMemo((): Row[] => {
    if (!individuals.data || !postings.data || !roles.data) return [];
    const roleById = new Map(roles.data.map((r) => [r.Id, r]));

    const currentByInd = new Map<number, Row["current"]>();
    const futureByInd = new Map<number, PostingListItem[]>();
    for (const p of postings.data) {
      const role = roleById.get(p.RoleId);
      if (p.Status === "Current") {
        currentByInd.set(p.IndividualId, {
          roleId: p.RoleId,
          roleTitle: role?.Title ?? "?",
          unitName: role?.Unit?.Title ?? role?.ExternalUnit ?? "External",
        });
      } else if (p.Status === "Planned" || p.Status === "Candidate") {
        const list = futureByInd.get(p.IndividualId) ?? [];
        list.push(p);
        futureByInd.set(p.IndividualId, list);
      }
    }

    return individuals.data.map((i) => ({
      id: i.Id,
      name: formatName(i.Rank, i.Title),
      isExternal: i.IsExternal,
      current: currentByInd.get(i.Id) ?? null,
      future: futureByInd.get(i.Id) ?? [],
    }));
  }, [individuals.data, postings.data, roles.data]);

  const rows = useMemo(() => {
    switch (activeFilter) {
      case "planned":
        return allRows.filter((r) => r.future.some((p) => p.Status === "Planned"));
      case "candidate":
        return allRows.filter((r) => r.future.some((p) => p.Status === "Candidate"));
      case "all":
        return allRows;
    }
  }, [allRows, activeFilter]);

  if (individuals.isLoading || postings.isLoading || roles.isLoading)
    return <LoadingBlock label="Loading individuals…" />;
  if (individuals.error || postings.error || roles.error)
    return <ErrorBlock error={(individuals.error || postings.error || roles.error) as Error} />;

  const counts: Record<FilterKey, number> = {
    planned: allRows.filter((r) => r.future.some((p) => p.Status === "Planned")).length,
    candidate: allRows.filter((r) => r.future.some((p) => p.Status === "Candidate")).length,
    all: allRows.length,
  };

  const cols: GridColDef<Row>[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      minWidth: 200,
      renderCell: (params) => (
        <Box>
          <Link
            to="/individuals/$id"
            params={{ id: String(params.row.id) }}
            style={{
              color: NAVY,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            {params.row.name}
          </Link>
          {params.row.isExternal && (
            <Box
              component="span"
              sx={{
                ml: 1,
                fontFamily: '"Geist Mono", monospace',
                fontSize: 10,
                color: "text.secondary",
              }}
            >
              external
            </Box>
          )}
        </Box>
      ),
    },
    {
      field: "current",
      headerName: "Current role",
      flex: 1.5,
      minWidth: 250,
      sortComparator: (a, b) =>
        (a as Row["current"])?.roleTitle.localeCompare(
          (b as Row["current"])?.roleTitle ?? "",
        ) ?? 0,
      valueGetter: (_v, row) => row.current?.roleTitle ?? "",
      renderCell: (params) => {
        const cur = params.row.current;
        if (!cur)
          return (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              None
            </Typography>
          );
        return (
          <Link
            to="/roles/$id"
            params={{ id: String(cur.roleId) }}
            style={{ textDecoration: "none", color: "inherit" }}
          >
            {cur.roleTitle}
            <Box component="span" sx={{ color: "text.secondary" }}>
              {" "}· {cur.unitName}
            </Box>
          </Link>
        );
      },
    },
    {
      field: "future",
      headerName: "Upcoming postings",
      flex: 2,
      minWidth: 300,
      sortable: false,
      renderCell: (params) => {
        const future = params.row.future;
        if (future.length === 0)
          return (
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              —
            </Typography>
          );
        return (
          <Stack spacing={0.5} sx={{ py: 0.5 }}>
            {future.map((p) => (
              <Stack
                key={p.Id}
                direction="row"
                alignItems="center"
                gap={1}
              >
                <StatusBadge status={p.Status} />
                <Link
                  to="/roles/$id"
                  params={{ id: String(p.RoleId) }}
                  style={{ textDecoration: "none", color: "inherit" }}
                >
                  {p.Role.Title}
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
          </Stack>
        );
      },
    },
  ];

  const filterLabel =
    activeFilter === "planned"
      ? "people with confirmed upcoming moves"
      : activeFilter === "candidate"
        ? "people proposed for a move"
        : `all ${counts.all} people`;

  return (
    <Stack spacing={3}>
      <PageHeader
        overline="Manpower · Individuals"
        title="Individuals"
        blurb={`Showing ${rows.length} ${filterLabel}. Click a name to see the full posting history.`}
      />

      {/* Filter toggles */}
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={`${f.label} (${counts[f.key]})`}
            onClick={() =>
              navigate({ search: f.key === "planned" ? {} : { filter: f.key } })
            }
            variant={activeFilter === f.key ? "filled" : "outlined"}
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: 11,
              letterSpacing: "0.04em",
              ...(activeFilter === f.key && {
                bgcolor: NAVY,
                color: "white",
                "&:hover": { bgcolor: NAVY },
              }),
            }}
          />
        ))}
      </Stack>

      <Box sx={{ height: 600 }}>
        <DataGrid
          rows={rows}
          columns={cols}
          getRowId={(r) => r.id}
          disableRowSelectionOnClick
          getRowHeight={() => "auto"}
          initialState={{
            sorting: { sortModel: [{ field: "name", sort: "asc" }] },
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
