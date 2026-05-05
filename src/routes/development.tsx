// Manpower · Development tab.
//
// Wide table view of every individual, their MASC / Track / R-Level / ROA
// course attendance status. Course columns are built dynamically from the
// active ROA_COURSES catalogue, ordered by DisplayOrder.
//
// Cell-fill colour matches the source Excel UX:
//   green  = Completed (ATT) + completion date
//   amber  = Planned + planned date
//   red    = NotPlanned (no row, or row.Status = NotPlanned)
//   grey   = NotApplicable ("NA")
//   "—"    = course not required for this person's profile

import { useMemo, useState } from "react";
import {
  Box,
  Chip,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from "@mui/material";
import EditIcon from "@mui/icons-material/EditOutlined";
import { Link, useSearch, useNavigate } from "@tanstack/react-router";
import {
  DataGrid,
  type GridColDef,
} from "@mui/x-data-grid";
import { useIndividuals } from "@/hooks/useIndividuals";
import { useRoaCourses } from "@/hooks/useRoaCourses";
import { useCourseAttendance } from "@/hooks/useCourseAttendance";
import { useProgression } from "@/hooks/useProgression";
import { useCurrentUser } from "@/hooks/useCurrentUser";
import {
  getRequiredCourses,
  STATUS_FILL,
  STATUS_TEXT,
  STATUS_LABEL,
  PROFILES,
  type Profile,
  type RoaStatus,
} from "@/lib/progression";
import { formatName } from "@/lib/formatters";
import { NAVY, MONO, DATAGRID_SX } from "@/lib/tokens";
import { ProgressionFormDialog, type ProgressionEdit } from "@/components/dialogs/ProgressionFormDialog";
import { LoadingBlock, ErrorBlock, PageHeader } from "./_shared";

type FilterKey = "all" | Profile;

type CellState = {
  status: RoaStatus | null; // null when course not required for this profile
  date: string | null;
};

type Row = {
  id: number;
  name: string;
  profile: Profile | null;
  mascLevel: number | null;
  doe: string | null;
  track: string | null;
  rLevel: string | null;
  // courseId → cell state
  cells: Record<number, CellState>;
};

export function DevelopmentPage() {
  const search = useSearch({ from: "/development" });
  const activeFilter: FilterKey = (search.profile as FilterKey | undefined) ?? "all";
  const navigate = useNavigate({ from: "/development" });

  const currentUser = useCurrentUser();
  const individuals = useIndividuals();
  const courses = useRoaCourses();
  const attendance = useCourseAttendance();
  const progression = useProgression();

  const [editingId, setEditingId] = useState<number | null>(null);

  const isAdmin = currentUser.data?.IsSiteAdmin === true;
  const allCourses = courses.data ?? [];
  const activeCourses = useMemo(
    () =>
      allCourses
        .filter((c) => c.IsActive)
        .sort((a, b) => a.DisplayOrder - b.DisplayOrder),
    [allCourses],
  );

  const rows = useMemo((): Row[] => {
    if (!individuals.data || !attendance.data || !progression.data) return [];

    // Index attendance + progression by individual
    const attByInd = new Map<number, typeof attendance.data>();
    for (const a of attendance.data) {
      const list = attByInd.get(a.IndividualId) ?? [];
      list.push(a);
      attByInd.set(a.IndividualId, list);
    }
    const progByInd = new Map(progression.data.map((p) => [p.IndividualId, p]));

    return individuals.data
      .filter((i) => !i.IsExternal && i.IsActive)
      .map((i): Row => {
        const myAtt = attByInd.get(i.Id) ?? [];
        const myProg = progByInd.get(i.Id);

        // Required courses for this profile
        const required = getRequiredCourses(i.Profile, allCourses);
        const requiredIds = new Set(required.map((c) => c.Id));

        // Build cells: every active course gets an entry
        const cells: Record<number, CellState> = {};
        for (const c of activeCourses) {
          const att = myAtt.find((a) => a.CourseId === c.Id);
          if (att) {
            cells[c.Id] = { status: att.Status, date: att.Date };
          } else if (requiredIds.has(c.Id)) {
            cells[c.Id] = { status: "NotPlanned", date: null };
          } else {
            cells[c.Id] = { status: null, date: null }; // grey "—"
          }
        }

        return {
          id: i.Id,
          name: formatName(i.Rank, i.Title),
          profile: i.Profile,
          mascLevel: myProg?.MASCLevel ?? null,
          doe: myProg?.DateOfExpertise ?? null,
          track: myProg?.Track ?? null,
          rLevel: myProg?.RLevel ?? null,
          cells,
        };
      });
  }, [individuals.data, attendance.data, progression.data, allCourses, activeCourses]);

  const filteredRows = useMemo(() => {
    if (activeFilter === "all") return rows;
    return rows.filter((r) => r.profile === activeFilter);
  }, [rows, activeFilter]);

  if (
    individuals.isLoading ||
    courses.isLoading ||
    attendance.isLoading ||
    progression.isLoading ||
    currentUser.isLoading
  )
    return <LoadingBlock label="Loading development data…" />;
  if (
    individuals.error ||
    courses.error ||
    attendance.error ||
    progression.error ||
    currentUser.error
  )
    return (
      <ErrorBlock
        error={
          (individuals.error ||
            courses.error ||
            attendance.error ||
            progression.error ||
            currentUser.error) as Error
        }
      />
    );

  const counts: Record<FilterKey, number> = {
    all: rows.length,
    MDES: rows.filter((r) => r.profile === "MDES").length,
    EOS: rows.filter((r) => r.profile === "EOS").length,
    DXO: rows.filter((r) => r.profile === "DXO").length,
  };

  // Build columns dynamically from the active course catalogue
  const courseCols: GridColDef<Row>[] = activeCourses.map((c) => ({
    field: `course_${c.Id}`,
    headerName: c.Title,
    width: 110,
    sortable: false,
    valueGetter: (_v, row) => row.cells[c.Id]?.date ?? "",
    renderCell: (params) => {
      const cell = params.row.cells[c.Id];
      if (!cell || cell.status == null) {
        return (
          <Box
            sx={{
              width: "100%",
              textAlign: "center",
              color: "text.disabled",
              fontFamily: MONO,
              fontSize: 11,
            }}
          >
            —
          </Box>
        );
      }
      const fill = STATUS_FILL[cell.status];
      const txt = STATUS_TEXT[cell.status];
      return (
        <Tooltip title={`${cell.status}${cell.date ? ` · ${cell.date}` : ""} — ${c.Label}`}>
          <Box
            sx={{
              bgcolor: fill,
              color: txt,
              fontFamily: MONO,
              fontSize: 10,
              fontWeight: 600,
              borderRadius: 0.5,
              px: 0.75,
              py: 0.5,
              textAlign: "center",
              lineHeight: 1.3,
              width: "100%",
              minHeight: 36,
              display: "flex",
              flexDirection: "column",
              justifyContent: "center",
            }}
          >
            <Box>{STATUS_LABEL[cell.status]}</Box>
            {cell.date && <Box sx={{ fontSize: 9, opacity: 0.85 }}>{cell.date}</Box>}
          </Box>
        </Tooltip>
      );
    },
  }));

  const cols: GridColDef<Row>[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 1,
      minWidth: 180,
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
      field: "profile",
      headerName: "Profile",
      width: 90,
      renderCell: (params) =>
        params.row.profile ? (
          <Chip
            label={params.row.profile}
            size="small"
            sx={{
              fontFamily: MONO,
              fontSize: 10,
              fontWeight: 600,
              height: 22,
            }}
          />
        ) : (
          <Typography variant="caption" sx={{ color: "text.disabled" }}>
            —
          </Typography>
        ),
    },
    {
      field: "mascLevel",
      headerName: "MASC",
      width: 80,
      renderCell: (params) =>
        params.row.mascLevel != null ? (
          <Stack>
            <Box sx={{ fontWeight: 600 }}>{params.row.mascLevel}</Box>
            {params.row.doe && (
              <Box sx={{ fontFamily: MONO, fontSize: 9, color: "text.secondary" }}>
                {params.row.doe}
              </Box>
            )}
          </Stack>
        ) : (
          <Typography variant="caption" sx={{ color: "text.disabled" }}>
            —
          </Typography>
        ),
    },
    {
      field: "track",
      headerName: "Track",
      width: 110,
      valueGetter: (_v, row) => row.track ?? "",
      renderCell: (params) =>
        params.row.track ? (
          <Box sx={{ fontSize: 13 }}>{params.row.track}</Box>
        ) : (
          <Typography variant="caption" sx={{ color: "text.disabled" }}>
            —
          </Typography>
        ),
    },
    {
      field: "rLevel",
      headerName: "R-Level",
      width: 80,
      valueGetter: (_v, row) => row.rLevel ?? "",
      renderCell: (params) =>
        params.row.rLevel ? (
          <Box sx={{ fontWeight: 600 }}>{params.row.rLevel}</Box>
        ) : (
          <Typography variant="caption" sx={{ color: "text.disabled" }}>
            —
          </Typography>
        ),
    },
    ...courseCols,
    ...(isAdmin
      ? [
          {
            field: "actions",
            headerName: "",
            width: 60,
            sortable: false,
            renderCell: (params) => (
              <Tooltip title="Edit progression">
                <IconButton size="small" onClick={() => setEditingId(params.row.id)}>
                  <EditIcon fontSize="small" />
                </IconButton>
              </Tooltip>
            ),
          } as GridColDef<Row>,
        ]
      : []),
  ];

  // Build the edit payload for the dialog (must include attendance + progression)
  const editingRow = editingId != null ? rows.find((r) => r.id === editingId) : null;
  const editingPayload: ProgressionEdit | null = useMemo(() => {
    if (!editingRow || !attendance.data || !progression.data) return null;
    const myAtt = attendance.data.filter((a) => a.IndividualId === editingRow.id);
    const myProg = progression.data.find((p) => p.IndividualId === editingRow.id);
    return {
      individualId: editingRow.id,
      individualName: editingRow.name,
      profile: editingRow.profile,
      mascLevel: myProg?.MASCLevel ?? null,
      dateOfExpertise: myProg?.DateOfExpertise ?? null,
      emfRemarks: myProg?.EMFRemarks ?? null,
      track: myProg?.Track ?? null,
      rLevel: myProg?.RLevel ?? null,
      rLevelRemarks: myProg?.RLevelRemarks ?? null,
      coursesRemarks: myProg?.CoursesRemarks ?? null,
      attendance: myAtt,
    };
  }, [editingRow, attendance.data, progression.data]);

  const FILTERS: { key: FilterKey; label: string }[] = [
    { key: "all", label: "All" },
    ...PROFILES.map((p) => ({ key: p as FilterKey, label: p })),
  ];

  return (
    <Stack spacing={3}>
      <PageHeader
        overline="Manpower · Development"
        title="Development"
        blurb={
          <Typography variant="body2" sx={{ color: "text.secondary", mt: 0.5 }}>
            Track progression: MASC, R-Level, Track, and ROA milestone courses
            across all RAiDers.
            {isAdmin && (
              <>
                {" "}
                <Link
                  to="/admin/roa-courses"
                  style={{ color: NAVY, textDecoration: "underline" }}
                >
                  Manage course catalogue →
                </Link>
              </>
            )}
          </Typography>
        }
      />

      {/* Filter chips */}
      <Stack direction="row" spacing={1} flexWrap="wrap">
        {FILTERS.map((f) => (
          <Chip
            key={f.key}
            label={`${f.label} (${counts[f.key]})`}
            onClick={() =>
              navigate({ search: f.key === "all" ? {} : { profile: f.key } })
            }
            variant={activeFilter === f.key ? "filled" : "outlined"}
            sx={{
              fontFamily: MONO,
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

      <Box sx={{ height: 600, width: "100%" }}>
        <DataGrid
          rows={filteredRows}
          columns={cols}
          getRowId={(r) => r.id}
          disableRowSelectionOnClick
          getRowHeight={() => "auto"}
          initialState={{
            sorting: { sortModel: [{ field: "name", sort: "asc" }] },
          }}
          sx={{
            ...DATAGRID_SX,
            "& .MuiDataGrid-cell": {
              ...DATAGRID_SX["& .MuiDataGrid-cell"],
              py: 1,
            },
          }}
        />
      </Box>

      {isAdmin && editingPayload && (
        <ProgressionFormDialog
          open={editingId != null}
          onClose={() => setEditingId(null)}
          edit={editingPayload}
          allCourses={allCourses}
        />
      )}
    </Stack>
  );
}
