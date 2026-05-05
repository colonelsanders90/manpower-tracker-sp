// /admin/people — full CRUD for individuals (RAiDers + externals).

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  IconButton,
  Stack,
  Tooltip,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/AddOutlined";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useIndividuals } from "@/hooks/useIndividuals";
import { usePostings } from "@/hooks/usePostings";
import { useDeleteIndividual } from "@/hooks/useMutations";
import { IndividualFormDialog } from "@/components/dialogs/IndividualFormDialog";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { LoadingBlock, ErrorBlock, PageHeader } from "./_shared";

const NAVY = "#01219C";

type Row = {
  id: number;
  name: string;
  rank: string | null;
  specialisation: string | null;
  employeeId: string | null;
  email: string | null;
  isExternal: boolean;
  profile: import("@/lib/progression").Profile | null;
  postingCount: number;
};

export function AdminPeoplePage() {
  const currentUser = useCurrentUser();
  const individuals = useIndividuals();
  const postings = usePostings();

  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const deleteInd = useDeleteIndividual();
  const { ask, ConfirmHost } = useConfirm();

  const rows = useMemo((): Row[] => {
    if (!individuals.data || !postings.data) return [];
    const counts = new Map<number, number>();
    for (const p of postings.data) {
      counts.set(p.IndividualId, (counts.get(p.IndividualId) ?? 0) + 1);
    }
    return individuals.data.map((i) => ({
      id: i.Id,
      name: i.Title,
      rank: i.Rank,
      specialisation: i.Specialisation,
      employeeId: i.EmployeeId,
      email: i.Email,
      isExternal: i.IsExternal,
      profile: i.Profile,
      postingCount: counts.get(i.Id) ?? 0,
    }));
  }, [individuals.data, postings.data]);

  const editingRow = editId != null ? rows.find((r) => r.id === editId) : undefined;

  if (currentUser.isLoading || individuals.isLoading || postings.isLoading)
    return <LoadingBlock label="Loading people…" />;
  if (currentUser.error || individuals.error || postings.error)
    return (
      <ErrorBlock
        error={(currentUser.error || individuals.error || postings.error) as Error}
      />
    );

  if (!currentUser.data?.IsSiteAdmin) {
    return (
      <Stack spacing={3}>
        <PageHeader overline="Manpower · Admin" title="People" />
        <Alert severity="warning">
          Only HR officers (site administrators) can manage people.
        </Alert>
      </Stack>
    );
  }

  const cols: GridColDef<Row>[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      minWidth: 200,
      renderCell: (p) => (
        <Box>
          {p.row.name}
          {p.row.isExternal && (
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
    { field: "rank", headerName: "Rank", width: 100 },
    { field: "specialisation", headerName: "Specialisation", flex: 1, minWidth: 180 },
    { field: "employeeId", headerName: "Employee ID", width: 130 },
    {
      field: "isExternal",
      headerName: "Type",
      width: 110,
      valueGetter: (_v, row) => (row.isExternal ? "external" : "internal"),
      renderCell: (p) => (
        <Box
          sx={{
            fontFamily: '"Geist Mono", monospace',
            fontSize: 11,
            color: "text.secondary",
          }}
        >
          {p.row.isExternal ? "external" : "internal"}
        </Box>
      ),
    },
    {
      field: "postingCount",
      headerName: "Postings",
      width: 100,
      type: "number",
      renderCell: (p) => (
        <Box sx={{ fontFamily: '"Geist Mono", monospace', fontVariantNumeric: "tabular-nums" }}>
          {p.row.postingCount}
        </Box>
      ),
    },
    {
      field: "actions",
      headerName: "",
      width: 100,
      sortable: false,
      renderCell: (p) => (
        <Stack direction="row" spacing={0.5}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => setEditId(p.row.id)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton
              size="small"
              onClick={() =>
                ask({
                  title: `Delete ${p.row.name}?`,
                  message:
                    p.row.postingCount > 0
                      ? `This person has ${p.row.postingCount} posting(s). The server will refuse — remove the postings via Admin → Postings first.`
                      : "This cannot be undone.",
                  destructive: true,
                  confirmLabel: "Delete",
                  onConfirm: () => deleteInd.mutateAsync(p.row.id),
                })
              }
              sx={{ color: "#B33" }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      ),
    },
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        overline="Manpower · Admin"
        title="People"
        blurb={`${rows.length} individuals. Internal RAiDers and externals — externals can also be added inline from the +Assign flow.`}
      />

      <Box>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => setAddOpen(true)}
        >
          Add individual
        </Button>
      </Box>

      <Box sx={{ height: 600 }}>
        <DataGrid
          rows={rows}
          columns={cols}
          getRowId={(r) => r.id}
          disableRowSelectionOnClick
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
          }}
        />
      </Box>

      <IndividualFormDialog open={addOpen} onClose={() => setAddOpen(false)} />
      {editingRow && (
        <IndividualFormDialog
          open={editId != null}
          onClose={() => setEditId(null)}
          individual={editingRow}
        />
      )}
      {ConfirmHost}
    </Stack>
  );
}
