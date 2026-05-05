// /admin/roa-courses — admin-only catalogue management.
// Add / edit / soft-delete courses. Profile multi-choice + display order +
// IsActive flag drive the Development tab's columns.

import { useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import { DataGrid, type GridColDef } from "@mui/x-data-grid";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import AddIcon from "@mui/icons-material/AddOutlined";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import { useRoaCourses } from "@/hooks/useRoaCourses";
import { useDeleteRoaCourse } from "@/hooks/useMutations";
import {
  RoaCourseFormDialog,
  type RoaCourseEdit,
} from "@/components/dialogs/RoaCourseFormDialog";
import { useConfirm } from "@/components/shared/ConfirmDialog";
import { LoadingBlock, ErrorBlock, PageHeader } from "./_shared";
import { MONO, DATAGRID_SX } from "@/lib/tokens";
import type { Profile } from "@/lib/progression";

type Row = {
  id: number;
  title: string;
  label: string;
  profiles: Profile[];
  displayOrder: number;
  isActive: boolean;
};

export function AdminRoaCoursesPage() {
  const currentUser = useCurrentUser();
  const courses = useRoaCourses();
  const deleteCourse = useDeleteRoaCourse();
  const { ask, ConfirmHost } = useConfirm();

  const [addOpen, setAddOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);

  const rows = useMemo((): Row[] => {
    if (!courses.data) return [];
    return courses.data.map((c) => ({
      id: c.Id,
      title: c.Title,
      label: c.Label,
      profiles: c.Profiles,
      displayOrder: c.DisplayOrder,
      isActive: c.IsActive,
    }));
  }, [courses.data]);

  const editingRow = editId != null ? rows.find((r) => r.id === editId) : undefined;

  if (currentUser.isLoading || courses.isLoading)
    return <LoadingBlock label="Loading courses…" />;
  if (currentUser.error || courses.error)
    return <ErrorBlock error={(currentUser.error || courses.error) as Error} />;

  if (!currentUser.data?.IsSiteAdmin) {
    return (
      <Stack spacing={3}>
        <PageHeader overline="Manpower · Admin" title="ROA Courses" />
        <Alert severity="warning">Admin only.</Alert>
      </Stack>
    );
  }

  const nextOrder = rows.length === 0 ? 1 : Math.max(...rows.map((r) => r.displayOrder)) + 1;

  const cols: GridColDef<Row>[] = [
    {
      field: "displayOrder",
      headerName: "Order",
      width: 80,
      type: "number",
    },
    {
      field: "title",
      headerName: "Code",
      width: 130,
      renderCell: (params) => (
        <Box sx={{ fontFamily: MONO, fontWeight: 600, fontSize: 12 }}>
          {params.row.title}
        </Box>
      ),
    },
    {
      field: "label",
      headerName: "Label",
      flex: 1,
      minWidth: 240,
    },
    {
      field: "profiles",
      headerName: "Profiles",
      width: 180,
      sortable: false,
      renderCell: (params) =>
        params.row.profiles.length === 0 ? (
          <Typography variant="caption" sx={{ color: "text.disabled" }}>
            (none — invisible to all)
          </Typography>
        ) : (
          <Stack direction="row" gap={0.5} flexWrap="wrap">
            {params.row.profiles.map((p) => (
              <Chip
                key={p}
                label={p}
                size="small"
                sx={{ fontFamily: MONO, fontSize: 10, height: 20 }}
              />
            ))}
          </Stack>
        ),
    },
    {
      field: "isActive",
      headerName: "Active",
      width: 90,
      renderCell: (params) =>
        params.row.isActive ? (
          <Chip label="Active" size="small" color="success" sx={{ fontFamily: MONO, fontSize: 10, height: 20 }} />
        ) : (
          <Chip label="Inactive" size="small" sx={{ fontFamily: MONO, fontSize: 10, height: 20 }} />
        ),
    },
    {
      field: "actions",
      headerName: "",
      width: 100,
      sortable: false,
      renderCell: (params) => (
        <Stack direction="row" gap={0.25}>
          <Tooltip title="Edit">
            <IconButton size="small" onClick={() => setEditId(params.row.id)}>
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete (soft-delete if attendance exists)">
            <IconButton
              size="small"
              onClick={() => {
                ask({
                  title: `Delete ${params.row.title}?`,
                  message:
                    "If attendance records reference this course it will be soft-deleted (set Inactive). Otherwise hard-deleted. Cannot be undone for hard delete.",
                  destructive: true,
                  confirmLabel: "Delete",
                  onConfirm: () => deleteCourse.mutateAsync(params.row.id),
                });
              }}
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
        title="ROA Courses"
        blurb="Manage the catalogue of milestone courses. Adding a course makes it visible as a column on the Development tab for any profile you assign."
      />

      <Stack direction="row" justifyContent="flex-end">
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setAddOpen(true)}
        >
          Add course
        </Button>
      </Stack>

      <Box sx={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={rows}
          columns={cols}
          getRowId={(r) => r.id}
          disableRowSelectionOnClick
          initialState={{
            sorting: { sortModel: [{ field: "displayOrder", sort: "asc" }] },
          }}
          sx={DATAGRID_SX}
        />
      </Box>

      <RoaCourseFormDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        nextDisplayOrder={nextOrder}
      />
      {editingRow && (
        <RoaCourseFormDialog
          open={editId != null}
          onClose={() => setEditId(null)}
          course={editingRow as RoaCourseEdit}
        />
      )}
      {ConfirmHost}
    </Stack>
  );
}
