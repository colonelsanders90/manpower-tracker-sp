// Read-only org chart for Phase 2. Phase 4 will add the editable inline
// CRUD on top of this layout. Mirrors the Next.js movement-board treatment:
// L1 root centred, L2 children in a wrapping auto-fill grid, role cards
// with incumbent + pending pill.

import { Box, Paper, Stack, Typography } from "@mui/material";
import { Link } from "@tanstack/react-router";
import type { UnitNode } from "@/lib/hierarchy";
import { formatEstablishment } from "@/lib/movement";
import type { IndividualListItem } from "@/types/individuals";

const NAVY = "#01219C";
const ACCENT = "#008ED0";
const CORAL = "#F9866B";

export function OrgChart({
  tree,
  incumbents,
  pendingByRole,
}: {
  tree: UnitNode[];
  incumbents: Map<number, IndividualListItem>;
  pendingByRole: Map<number, number>;
}) {
  const root = tree[0];
  const others = tree.slice(1);
  return (
    <Stack spacing={4}>
      {root && (
        <UnitTreeView
          root={root}
          incumbents={incumbents}
          pendingByRole={pendingByRole}
        />
      )}
      {others.map((r) => (
        <UnitTreeView
          key={r.Id}
          root={r}
          incumbents={incumbents}
          pendingByRole={pendingByRole}
        />
      ))}
    </Stack>
  );
}

function UnitTreeView({
  root,
  incumbents,
  pendingByRole,
}: {
  root: UnitNode;
  incumbents: Map<number, IndividualListItem>;
  pendingByRole: Map<number, number>;
}) {
  const children = root.children;
  return (
    <Stack spacing={2}>
      {/* L1 centred */}
      <Box sx={{ display: "flex", justifyContent: "center" }}>
        <UnitCard
          unit={root}
          incumbents={incumbents}
          pendingByRole={pendingByRole}
          tone="L1"
          maxWidth={420}
        />
      </Box>

      {children.length > 0 && (
        <Box>
          <Box sx={{ textAlign: "center", mb: 1.5 }}>
            <Typography variant="caption" sx={{ color: "text.secondary" }}>
              {children.length} branch{children.length === 1 ? "" : "es"}
            </Typography>
            <Box
              sx={{
                width: "1px", height: 16,
                bgcolor: "rgba(0,142,208,0.3)",
                mx: "auto", mt: 0.5,
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
              <UnitCard
                key={child.Id}
                unit={child}
                incumbents={incumbents}
                pendingByRole={pendingByRole}
                tone="L2"
              />
            ))}
          </Box>
        </Box>
      )}
    </Stack>
  );
}

function UnitCard({
  unit,
  incumbents,
  pendingByRole,
  tone,
  maxWidth,
}: {
  unit: UnitNode;
  incumbents: Map<number, IndividualListItem>;
  pendingByRole: Map<number, number>;
  tone: "L1" | "L2";
  maxWidth?: number;
}) {
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
          px: 2, py: 1.5,
          bgcolor: headerBg,
          color: "white",
          display: "flex",
          alignItems: "baseline",
          gap: 1,
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
          }}
        >
          {unit.Title}
        </Typography>
        {unit.Code && (
          <Typography
            sx={{
              ml: "auto",
              fontFamily: '"Geist Mono", monospace',
              fontSize: 11,
              color: "rgba(255,255,255,0.65)",
            }}
          >
            {unit.Code}
          </Typography>
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
              />
            ))}
          </Stack>
        )}
        {unit.roles.length === 0 && (
          <Typography
            variant="caption"
            sx={{ color: "text.secondary" }}
          >
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
        </Box>
      </Stack>
    </Paper>
  );
}

function RoleRow({
  role,
  incumbent,
  pending,
  isHead,
}: {
  role: UnitNode["roles"][number];
  incumbent: IndividualListItem | undefined;
  pending: number;
  isHead?: boolean;
}) {
  const est = formatEstablishment(
    role.EstablishmentRank,
    role.EstablishmentVocation,
  );

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
            title="Establishment — Rank/Vocation"
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
    </Box>
  );
}
