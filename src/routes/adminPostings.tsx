// /admin/postings — full CRUD for the movement ledger.
// Admin-only: page checks IsSiteAdmin and renders a warning otherwise.

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
import { useUnits } from "@/hooks/useUnits";
import { useRoles } from "@/hooks/useRoles";
import { useIndividuals } from "@/hooks/useIndividuals";
import { usePostings } from "@/hooks/usePostings";
import { useDeletePosting } from "@/hooks/useMutations";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { PostingFormDialog } from "@/components/dialogs/PostingFormDialog";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { LoadingBlock, ErrorBlock, PageHeader } from "./_shared";
import { formatName } from "@/lib/formatters";
import type { PostingStatus } from "@/types/postings";

const NAVY = "#01219C";

type Row = {
  id: number;
  status: PostingStatus;
  individualId: number;
  individualName: string;
  individualIsExternal: boolean;
  roleId: number;
  roleTitle: string;
  unitName: string;
  roleIsExternal: boolean;
  startDate: string | null;
  endDate: string | null;
  notes: string | null;
};

const STATUS_RANK: Record<PostingStatus, number> = {
  Current: 0,
  Planned: 1,
  Candidate: 2,
  Past: 3,
};

export function AdminPostingsPage() {
  const currentUser = useCurrentUser();
  const units = useUnits();
  const roles = useRoles();
  const individuals = useIndividuals();
  const postings = usePostings();

  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const deletePosting = useDeletePosting();
  const { ask, ConfirmHost } = useConfirm();

  const rows = useMemo((): Row[] => {
    if (!postings.data || !roles.data) return [];
    const roleById = new Map(roles.data.map((r) => [r.Id, r]));
    return postings.data.map((p) => {
      const role = roleById.get(p.RoleId);
      return {
        id: p.Id,
        status: p.Status,
        individualId: p.IndividualId,
        individualName: (() => {
          const ind = (individuals.data ?? []).find((i) => i.Id === p.IndividualId);
          return formatName(ind?.Rank, ind?.Title ?? p.Individual.Title);
        })(),
        individualIsExternal:
          (individuals.data ?? []).find((i) => i.Id === p.IndividualId)?.IsExternal ??
          false,
        roleId: p.RoleId,
        roleTitle: role?.Title ?? p.Role.Title,
        unitName: role?.Unit?.Title ?? role?.ExternalUnit ?? "—",
        roleIsExternal: role?.IsExternal ?? false,
        startDate: p.StartDate,
        endDate: p.EndDate,
        notes: p.Notes,
      };
    });
  }, [postings.data, roles.data, individuals.data]);

  const editingRow = editId != null ? rows.find((r) => r.id === editId) : undefined;

  if (
    currentUser.isLoading ||
    units.isLoading || roles.isLoading || individuals.isLoading || postings.isLoading
  )
    return <LoadingBlock label="Loading postings…" />;
  if (
    currentUser.error ||
    units.error || roles.error || individuals.error || postings.error
  )
    return (
      <ErrorBlock
        error={
          (currentUser.error || units.error || roles.error || individuals.error || postings.error) as Error
        }
      />
    );

  if (!currentUser.data?.IsSiteAdmin) {
    return (
      <Stack spacing={3}>
        <PageHeader overline="Manpower · Admin" title="Postings" />
        <Alert severity="warning">
          Only HR officers (site administrators) can manage postings.
        </Alert>
      </Stack>
    );
  }

  const cols: GridColDef<Row>[] = [
    {
      field: "status",
      headerName: "Status",
      width: 130,
      sortComparator: (a, b) =>
        STATUS_RANK[a as PostingStatus] - STATUS_RANK[b as PostingStatus],
      renderCell: (params) => <StatusBadge status={params.row.status} />,
    },
    {
      field: "individual",
      headerName: "Individual",
      flex: 1,
      minWidth: 200,
      valueGetter: (_v, row) => row.individualName,
      renderCell: (params) => (
        <Box>
          {params.row.individualName}
          {params.row.individualIsExternal && (
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
      field: "role",
      headerName: "Role",
      flex: 1.5,
      minWidth: 240,
      valueGetter: (_v, row) => row.roleTitle,
      renderCell: (params) => (
        <Box>
          {params.row.roleTitle}{" "}
          <Box component="span" sx={{ color: "text.secondary" }}>
            · {params.row.unitName}
          </Box>
          {params.row.roleIsExternal && (
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
      field: "startDate",
      headerName: "Start",
      width: 120,
      valueGetter: (_v, row) =>
        row.startDate ? new Date(row.startDate).getTime() : null,
      renderCell: (p) => (
        <Box sx={{ fontFamily: '"Geist Mono", monospace', fontSize: 11, color: "text.secondary" }}>
          {p.row.startDate ?? "—"}
        </Box>
      ),
    },
    {
      field: "endDate",
      headerName: "End",
      width: 120,
      valueGetter: (_v, row) =>
        row.endDate ? new Date(row.endDate).getTime() : null,
      renderCell: (p) => (
        <Box sx={{ fontFamily: '"Geist Mono", monospace', fontSize: 11, color: "text.secondary" }}>
          {p.row.endDate ?? "—"}
        </Box>
      ),
    },
    {
      field: "notes",
      headerName: "Notes",
      flex: 1,
      minWidth: 200,
      sortable: false,
      renderCell: (p) => (
        <Box
          sx={{
            color: "text.secondary",
            fontStyle: "italic",
            fontSize: 12,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {p.row.notes ?? ""}
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
                  title: "Delete posting?",
                  message: "This cannot be undone.",
                  destructive: true,
                  confirmLabel: "Delete",
                  onConfirm: () => deletePosting.mutateAsync(p.row.id),
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
        title="Postings"
        blurb={`${rows.length} rows. Add, edit, or delete postings — the four data-integrity invariants are enforced server-side.`}
      />

      <Box>
        <Button
          startIcon={<AddIcon />}
          variant="contained"
          onClick={() => setAddOpen(true)}
        >
          Add posting
        </Button>
      </Box>

      <Box sx={{ height: 600 }}>
        <DataGrid
          rows={rows}
          columns={cols}
          getRowId={(r) => r.id}
          disableRowSelectionOnClick
          initialState={{
            sorting: { sortModel: [{ field: "status", sort: "asc" }] },
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

      <PostingFormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        individuals={individuals.data ?? []}
        roles={roles.data ?? []}
      />
      {editingRow && (
        <PostingFormDialog
          open={editId != null}
          onClose={() => setEditId(null)}
          posting={{
            id: editingRow.id,
            individualName: editingRow.individualName,
            roleTitle: editingRow.roleTitle,
            unitName: editingRow.unitName,
            status: editingRow.status,
            startDate: editingRow.startDate,
            endDate: editingRow.endDate,
            notes: editingRow.notes,
          }}
          individuals={individuals.data ?? []}
          roles={roles.data ?? []}
        />
      )}
      {ConfirmHost}
    </Stack>
  );
}
