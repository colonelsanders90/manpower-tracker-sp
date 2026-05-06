// /dtco — Dual Track Career Officers ledger.
//
// Read-only view of every INDIVIDUAL where IsDTCO=true. Admin can add new
// DTCOs via "+ Add DTCO" (AD picker + skills). Removal/edit happens via the
// regular Admin · People page (intentional — keeps this view a clean ledger).

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Stack,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/AddOutlined";
import { Link } from "@tanstack/react-router";
import { useIndividuals } from "@/hooks/useIndividuals";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { DTCOFormDialog } from "@/components/dialogs/DTCOFormDialog";
import { LoadingBlock, ErrorBlock, PageHeader } from "./_shared";
import { formatName } from "@/lib/formatters";
import { NAVY, DATAGRID_SX } from "@/lib/tokens";

type Row = {
  id: number;
  name: string;
  skills: string | null;
};

export function DTCOPage() {
  const currentUser = useCurrentUser();
  const individuals = useIndividuals();
  const [addOpen, setAddOpen] = useState(false);

  const rows = useMemo((): Row[] => {
    if (!individuals.data) return [];
    return individuals.data
      .filter((i) => i.IsDTCO && i.IsActive)
      .map((i) => ({
        id: i.Id,
        name: formatName(i.Rank, i.Title),
        skills: i.DTCOSkills,
      }));
  }, [individuals.data]);

  if (currentUser.isLoading || individuals.isLoading)
    return <LoadingBlock label="Loading DTCO ledger…" />;
  if (currentUser.error || individuals.error)
    return <ErrorBlock error={(currentUser.error || individuals.error) as Error} />;

  const isAdmin = currentUser.data?.IsSiteAdmin === true;

  const cols: GridColDef<Row>[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      minWidth: 220,
      renderCell: (params) => (
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
      ),
    },
    {
      field: "skills",
      headerName: "Digital skills",
      flex: 2.5,
      minWidth: 320,
      sortable: false,
      renderCell: (params) =>
        params.row.skills ? (
          <Box sx={{ whiteSpace: "normal", lineHeight: 1.4 }}>
            {params.row.skills}
          </Box>
        ) : (
          <Typography variant="caption" sx={{ color: "text.disabled" }}>
            —
          </Typography>
        ),
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        overline="Manpower · DTCO"
        title="Dual Track Career Officers"
        blurb="Officers tracked for digital skillsets across the broader ecosystem. Click a name to see their full RAiD profile (where applicable)."
      />

      <Stack
        direction="row"
        justifyContent="space-between"
        alignItems="center"
        flexWrap="wrap"
        gap={1}
      >
        <Typography variant="caption" sx={{ color: "text.secondary" }}>
          {rows.length} {rows.length === 1 ? "officer" : "officers"} tracked
        </Typography>
        {isAdmin && (
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={() => setAddOpen(true)}
          >
            Add DTCO
          </Button>
        )}
      </Stack>

      {rows.length === 0 && !isAdmin && (
        <Alert severity="info">
          No DTCOs are tracked yet. Ask an admin to populate the ledger.
        </Alert>
      )}

      <Box sx={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={cols}
          getRowId={(r) => r.id}
          disableRowSelectionOnClick
          getRowHeight={() => "auto"}
          initialState={{
            sorting: { sortModel: [{ field: "name", sort: "asc" }] },
          }}
          sx={DATAGRID_SX}
        />
      </Box>

      {isAdmin && (
        <DTCOFormDialog open={addOpen} onClose={() => setAddOpen(false)} />
      )}
    </Stack>
  );
}
