import { useMemo } from "react";
import { Stack, Box, Typography } from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import { Link } from "@tanstack/react-router";
import { useIndividuals } from "@/hooks/useIndividuals";
import { usePostings } from "@/hooks/usePostings";
import { useRoles } from "@/hooks/useRoles";
import { StatusBadge } from "@/components/StatusBadge";
import { LoadingBlock, ErrorBlock, PageHeader } from "./_shared";
import type { PostingListItem } from "@/types/postings";

type Row = {
  id: number;
  name: string;
  isExternal: boolean;
  current: { roleId: number; roleTitle: string; unitName: string } | null;
  future: PostingListItem[];
};

export function IndividualsPage() {
  const individuals = useIndividuals();
  const postings = usePostings();
  const roles = useRoles();

  const rows = useMemo((): Row[] => {
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
      name: i.Title,
      isExternal: i.IsExternal,
      current: currentByInd.get(i.Id) ?? null,
      future: futureByInd.get(i.Id) ?? [],
    }));
  }, [individuals.data, postings.data, roles.data]);

  if (individuals.isLoading || postings.isLoading || roles.isLoading)
    return <LoadingBlock label="Loading individuals…" />;
  if (individuals.error || postings.error || roles.error)
    return <ErrorBlock error={(individuals.error || postings.error || roles.error) as Error} />;

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
              color: "#01219C",
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
      headerName: "Possible next roles",
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

  return (
    <Stack spacing={3}>
      <PageHeader
        overline="Manpower · Individuals"
        title="Individuals"
        blurb={`${rows.length} people. Click a column header to sort. Click a name to see the movement timeline and where they might go next.`}
      />
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
              bgcolor: "#01219C",
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
