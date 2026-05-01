// Org chart — used both as the read-only sidebar on detail pages AND as the
// editable surface on /org. The `editable` prop and the four mutation hooks
// drive the admin affordances. Without `editable`, the layout is identical
// to Phase 2.

import { useState } from "react";
import { Box, IconButton, Paper, Stack, Tooltip, Typography } from "@mui/material";
import EditIcon from "@mui/icons-material/EditOutlined";
import DeleteIcon from "@mui/icons-material/DeleteOutline";
import PersonAddIcon from "@mui/icons-material/PersonAddAltOutlined";
import AddIcon from "@mui/icons-material/AddOutlined";
import { Link } from "@tanstack/react-router";
import type { UnitNode } from "@/lib/hierarchy";
import { formatEstablishment } from "@/lib/movement";
import type { IndividualListItem } from "@/types/individuals";
import type { RoleListItem } from "@/types/roles";
import { UnitFormDialog } from "../dialogs/UnitFormDialog";
import { RoleFormDialog } from "../dialogs/RoleFormDialog";
import { PostingFormDialog } from "../dialogs/PostingFormDialog";
import { useDeleteUnit, useDeleteRole } from "@/hooks/useMutations";
import { useConfirm } from "../shared/ConfirmDialog";

const NAVY = "#01219C";
const ACCENT = "#008ED0";
const CORAL = "#F9866B";

type EditableProps = {
  editable: true;
  allIndividuals: IndividualListItem[];
  allRoles: RoleListItem[];
};
type ReadOnlyProps = { editable?: false };

type Props = (EditableProps | ReadOnlyProps) & {
  tree: UnitNode[];
  incumbents: Map<number, IndividualListItem>;
  pendingByRole: Map<number, number>;
};

export function OrgChart(props: Props) {
  const { tree, incumbents, pendingByRole } = props;
  const root = tree[0];
  const others = tree.slice(1);

  // Dialog state lifted to the chart so a single dialog instance handles all rows
  const [addBranchOpen, setAddBranchOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<{ id: number; name: string } | null>(null);
  const [addRoleFor, setAddRoleFor] = useState<{
    unitId: number;
    unitLevel: "L1" | "L2" | "L3";
  } | null>(null);
  const [editRole, setEditRole] = useState<Parameters<
    typeof RoleFormDialog
  >[0]["role"] | null>(null);
  const [assignFor, setAssignFor] = useState<number | null>(null);

  const deleteUnitM = useDeleteUnit();
  const deleteRoleM = useDeleteRole();
  const { ask, ConfirmHost } = useConfirm();

  function onDeleteUnit(id: number, name: string) {
    ask({
      title: `Delete branch "${name}"?`,
      message: "This cannot be undone. Roles within the branch must be removed first.",
      destructive: true,
      confirmLabel: "Delete branch",
      onConfirm: () => deleteUnitM.mutateAsync(id),
    });
  }

  function onDeleteRole(id: number, title: string) {
    ask({
      title: `Delete role "${title}"?`,
      message:
        "This cannot be undone. Postings that reference this role must be deleted first.",
      destructive: true,
      confirmLabel: "Delete role",
      onConfirm: () => deleteRoleM.mutateAsync(id),
    });
  }

  return (
    <Stack spacing={4}>
      {root && (
        <UnitTreeView
          root={root}
          incumbents={incumbents}
          pendingByRole={pendingByRole}
          editable={props.editable === true}
          onAddBranch={() => setAddBranchOpen(true)}
          onAddRole={(unitId, unitLevel) => setAddRoleFor({ unitId, unitLevel })}
          onEditUnit={(id, name) => setEditUnit({ id, name })}
          onDeleteUnit={onDeleteUnit}
          onEditRole={(role) => setEditRole(role)}
          onDeleteRole={onDeleteRole}
          onAssignTo={(roleId) => setAssignFor(roleId)}
        />
      )}
      {others.map((r) => (
        <UnitTreeView
          key={r.Id}
          root={r}
          incumbents={incumbents}
          pendingByRole={pendingByRole}
          editable={props.editable === true}
          onAddBranch={() => setAddBranchOpen(true)}
          onAddRole={(unitId, unitLevel) => setAddRoleFor({ unitId, unitLevel })}
          onEditUnit={(id, name) => setEditUnit({ id, name })}
          onDeleteUnit={onDeleteUnit}
          onEditRole={(role) => setEditRole(role)}
          onDeleteRole={onDeleteRole}
          onAssignTo={(roleId) => setAssignFor(roleId)}
        />
      ))}

      {props.editable && root && (
        <Box sx={{ pt: 2 }}>
          <Tooltip title="Add a branch under RAiD">
            <Box
              component="button"
              type="button"
              onClick={() => setAddBranchOpen(true)}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                gap: 1,
                px: 3, py: 1.25,
                bgcolor: "background.paper",
                border: `1px dashed ${ACCENT}`,
                borderRadius: 1,
                color: NAVY,
                fontFamily: '"Geist Mono", monospace',
                fontSize: 12,
                cursor: "pointer",
                "&:hover": { bgcolor: "rgba(0,142,208,0.08)" },
              }}
            >
              <AddIcon fontSize="small" /> Add branch
            </Box>
          </Tooltip>
        </Box>
      )}

      {props.editable && root && (
        <UnitFormDialog
          open={addBranchOpen}
          onClose={() => setAddBranchOpen(false)}
          parentUnitId={root.Id}
        />
      )}
      {props.editable && (
        <UnitFormDialog
          open={editUnit != null}
          onClose={() => setEditUnit(null)}
          unit={editUnit ?? undefined}
        />
      )}
      {props.editable && (
        <RoleFormDialog
          open={addRoleFor != null}
          onClose={() => setAddRoleFor(null)}
          unitId={addRoleFor?.unitId}
          unitLevel={addRoleFor?.unitLevel}
        />
      )}
      {props.editable && (
        <RoleFormDialog
          open={editRole != null}
          onClose={() => setEditRole(null)}
          role={editRole ?? undefined}
        />
      )}
      {props.editable && (
        <PostingFormDialog
          open={assignFor != null}
          onClose={() => setAssignFor(null)}
          preselectedRoleId={assignFor ?? undefined}
          individuals={(props as EditableProps).allIndividuals}
          roles={(props as EditableProps).allRoles}
        />
      )}
      {props.editable && ConfirmHost}
    </Stack>
  );
}

// ─── tree layout ──────────────────────────────────────────────────────────────

type UnitTreeProps = {
  root: UnitNode;
  incumbents: Map<number, IndividualListItem>;
  pendingByRole: Map<number, number>;
  editable: boolean;
  onAddBranch: () => void;
  onAddRole: (unitId: number, unitLevel: "L1" | "L2" | "L3") => void;
  onEditUnit: (id: number, name: string) => void;
  onDeleteUnit: (id: number, name: string) => void;
  onEditRole: (role: NonNullable<Parameters<typeof RoleFormDialog>[0]["role"]>) => void;
  onDeleteRole: (id: number, title: string) => void;
  onAssignTo: (roleId: number) => void;
};

function UnitTreeView(props: UnitTreeProps) {
  const { root, ...rest } = props;
  const children = root.children;
  return (
    <Stack spacing={2}>
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <UnitCard root={root} tone="L1" maxWidth={420} {...rest} />
      </Box>

      {children.length > 0 && (
        <Box>
          <Box sx={{ textAlign: "center", mb: 1.5 }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {children.length} branch{children.length === 1 ? "" : "es"}
            </Typography>
            <Box
              sx={{
                width: "1px",
                height: 16,
                bgcolor: "rgba(0,142,208,0.3)",
                mx: "auto",
                mt: 0.5,
              }}
            />
          </Box>
          <Box
            sx={{
              display: "grid",
              gap: 2,
              gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
            }}
          >
            {children.map((child) => (
              <UnitCard key={child.Id} root={child} tone="L2" {...rest} />
            ))}
          </Box>
        </Box>
      )}
    </Stack>
  );
}

// ─── unit card ────────────────────────────────────────────────────────────────

type UnitCardProps = Omit<UnitTreeProps, "root"> & {
  root: UnitNode;
  tone: "L1" | "L2";
  maxWidth?: number;
};

function UnitCard(props: UnitCardProps) {
  const {
    root: unit,
    incumbents,
    pendingByRole,
    tone,
    maxWidth,
    editable,
    onAddRole,
    onEditUnit,
    onDeleteUnit,
    onEditRole,
    onDeleteRole,
    onAssignTo,
  } = props;

  const head = unit.roles.find((r) => r.IsHead);
  const staff = unit.roles.filter((r) => !r.IsHead);
  const filled = unit.roles.filter((r) => incumbents.has(r.Id)).length;
  const headerBg = tone === "L1" ? NAVY : ACCENT;

  return (
    <Paper
      sx={{
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        maxWidth: maxWidth ? `${maxWidth}px` : undefined,
        width: "100%",
      }}
    >
      <Box
        sx={{
          px: 2,
          py: 1.25,
          bgcolor: headerBg,
          color: "white",
          display: "flex",
          alignItems: "baseline",
          gap: 1,
          minHeight: 44,
        }}
      >
        <Typography variant="caption" sx={{ color: "rgba(255,255,255,0.65)" }}>
          {unit.Level}
        </Typography>
        <Typography
          sx={{
            fontWeight: 600,
            fontSize: 15,
            letterSpacing: "-0.01em",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            flex: 1,
          }}
        >
          {unit.Title}
        </Typography>
        {unit.Code && (
          <Typography
            sx={{
              fontFamily: '"Geist Mono", monospace',
              fontSize: 11,
              color: "rgba(255,255,255,0.65)",
            }}
          >
            {unit.Code}
          </Typography>
        )}
        {editable && tone === "L2" && (
          <Stack direction="row" spacing={0}>
            <Tooltip title="Rename branch">
              <IconButton
                size="small"
                onClick={() => onEditUnit(unit.Id, unit.Title)}
                sx={{ color: "rgba(255,255,255,0.85)" }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete branch">
              <IconButton
                size="small"
                onClick={() => onDeleteUnit(unit.Id, unit.Title)}
                sx={{ color: "rgba(255,255,255,0.85)" }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Stack>
        )}
      </Box>

      <Stack
        spacing={1.5}
        sx={{ p: 2, flex: 1, display: "flex", flexDirection: "column" }}
      >
        {head && (
          <RoleRow
            role={head}
            incumbent={incumbents.get(head.Id)}
            pending={pendingByRole.get(head.Id) ?? 0}
            isHead
            editable={editable}
            onEdit={onEditRole}
            onDelete={onDeleteRole}
            onAssign={onAssignTo}
          />
        )}
        {staff.length > 0 && (
          <Stack spacing={0.75}>
            {staff.map((r) => (
              <RoleRow
                key={r.Id}
                role={r}
                incumbent={incumbents.get(r.Id)}
                pending={pendingByRole.get(r.Id) ?? 0}
                editable={editable}
                onEdit={onEditRole}
                onDelete={onDeleteRole}
                onAssign={onAssignTo}
              />
            ))}
          </Stack>
        )}
        {unit.roles.length === 0 && (
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            No roles defined
          </Typography>
        )}
        <Box
          sx={{
            mt: "auto",
            pt: 1.5,
            borderTop: "1px solid rgba(0,0,0,0.06)",
            display: "flex",
            alignItems: "center",
            gap: 1,
            fontFamily: '"Geist Mono", monospace',
            fontSize: 11,
          }}
        >
          <Box sx={{ color: "text.secondary" }}>Filled</Box>
          <Box sx={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
            {filled}/{unit.roles.length}
          </Box>
          {unit.roles.some((r) => r.IsVacant) && (
            <Box sx={{ color: CORAL }}>● Vacancy</Box>
          )}
          {editable && (
            <Box
              component="button"
              type="button"
              onClick={() => onAddRole(unit.Id, unit.Level)}
              sx={{
                ml: "auto",
                px: 1.25,
                py: 0.25,
                bgcolor: "rgba(0,142,208,0.10)",
                color: NAVY,
                border: "none",
                borderRadius: 0.5,
                fontFamily: '"Geist Mono", monospace',
                fontSize: 11,
                fontWeight: 600,
                cursor: "pointer",
                "&:hover": { bgcolor: "rgba(0,142,208,0.20)" },
              }}
            >
              + Add role
            </Box>
          )}
        </Box>
      </Stack>
    </Paper>
  );
}

// ─── role row ─────────────────────────────────────────────────────────────────

type RoleRowProps = {
  role: UnitNode["roles"][number];
  incumbent: IndividualListItem | undefined;
  pending: number;
  isHead?: boolean;
  editable: boolean;
  onEdit: (role: NonNullable<Parameters<typeof RoleFormDialog>[0]["role"]>) => void;
  onDelete: (id: number, title: string) => void;
  onAssign: (roleId: number) => void;
};

function RoleRow({
  role,
  incumbent,
  pending,
  isHead,
  editable,
  onEdit,
  onDelete,
  onAssign,
}: RoleRowProps) {
  const est = formatEstablishment(role.EstablishmentRank, role.EstablishmentVocation);
  return (
    <Box
      sx={{
        borderRadius: 1,
        px: 1.5, py: 1,
        bgcolor: isHead ? "rgba(1,33,156,0.04)" : "rgba(0,0,0,0.02)",
      }}
    >
      <Stack direction="row" alignItems="baseline" gap={1} flexWrap="wrap">
        <Link
          to="/roles/$id"
          params={{ id: String(role.Id) }}
          style={{
            color: isHead ? NAVY : "inherit",
            fontWeight: isHead ? 600 : 500,
            fontSize: 13,
            textDecoration: "none",
          }}
        >
          {role.Title}
        </Link>
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
        {role.IsVacant && (
          <Typography variant="caption" sx={{ color: CORAL }}>
            Vacant
          </Typography>
        )}
        {pending > 0 && (
          <Box
            sx={{
              ml: "auto",
              fontFamily: '"Geist Mono", monospace',
              fontSize: 10,
              px: 0.75, py: 0.25,
              borderRadius: 0.5,
              bgcolor: "#B5D4F4",
              color: "#0C447C",
            }}
            title="Planned + Candidate postings"
          >
            +{pending} pending
          </Box>
        )}
      </Stack>
      <Box sx={{ mt: 0.5, fontSize: 12.5 }}>
        {incumbent ? (
          <Link
            to="/individuals/$id"
            params={{ id: String(incumbent.Id) }}
            style={{ color: "inherit", textDecoration: "none" }}
          >
            {incumbent.Title}
            {incumbent.Rank && (
              <Box component="span" sx={{ color: "text.secondary" }}>
                {" "}· {incumbent.Rank}
              </Box>
            )}
          </Link>
        ) : (
          <Typography
            component="span"
            sx={{
              fontFamily: '"Sometype Mono", monospace',
              fontSize: 10.5,
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              color: "text.secondary",
            }}
          >
            Unfilled
          </Typography>
        )}
      </Box>
      {editable && (
        <Stack
          direction="row"
          spacing={0.5}
          sx={{
            mt: 1,
            pt: 1,
            borderTop: "1px dashed rgba(0,0,0,0.08)",
          }}
        >
          <Tooltip title="Assign a person to this role">
            <IconButton
              size="small"
              onClick={() => onAssign(role.Id)}
              sx={{
                color: NAVY,
                bgcolor: "rgba(0,142,208,0.10)",
                "&:hover": { bgcolor: "rgba(0,142,208,0.20)" },
              }}
            >
              <PersonAddIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Edit role">
            <IconButton
              size="small"
              onClick={() =>
                onEdit({
                  id: role.Id,
                  title: role.Title,
                  isHead: role.IsHead,
                  specialisation: role.Specialisation,
                  establishmentRank: role.EstablishmentRank,
                  establishmentVocation: role.EstablishmentVocation,
                })
              }
              sx={{ color: "text.secondary" }}
            >
              <EditIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Delete role">
            <IconButton
              size="small"
              onClick={() => onDelete(role.Id, role.Title)}
              sx={{ color: "#B33", "&:hover": { bgcolor: "rgba(180,50,50,0.08)" } }}
            >
              <DeleteIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Stack>
      )}
    </Box>
  );
}
