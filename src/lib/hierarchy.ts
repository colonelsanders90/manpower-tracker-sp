// Pure unit-tree builder. Ported verbatim from the Next.js prototype's
// `web/lib/hierarchy.ts`, with the only change being SP field names
// (Id / ParentUnitId / UnitId — capitalised).
//
// External roles (UnitId === null) are skipped — they have no place in the
// internal tree.

import type { UnitListItem } from "@/types/units";
import type { RoleListItem } from "@/types/roles";

export type UnitNode = UnitListItem & {
  children: UnitNode[];
  roles: RoleListItem[];
};

export function buildUnitTree(
  units: UnitListItem[],
  roles: RoleListItem[],
): UnitNode[] {
  const byId = new Map<number, UnitNode>();
  for (const u of units) {
    byId.set(u.Id, { ...u, children: [], roles: [] });
  }
  for (const r of roles) {
    if (r.UnitId == null) continue;
    byId.get(r.UnitId)?.roles.push(r);
  }
  const roots: UnitNode[] = [];
  for (const node of byId.values()) {
    if (node.ParentUnitId == null) {
      roots.push(node);
    } else {
      byId.get(node.ParentUnitId)?.children.push(node);
    }
  }
  return roots;
}

/**
 * Given the UnitId of a role (or any unit), walk up to its L2 ancestor and
 * return a single-element array containing just that branch node from the tree.
 * Falls back to the full tree if the L2 unit cannot be resolved — e.g. when
 * the role is at L1 or the unit isn't in the tree.
 *
 * Used by detail pages to show a focused "org context" sidebar instead of the
 * full organisation.
 */
export function filterToL2Unit(
  tree: UnitNode[],
  unitId: number | null | undefined,
  units: UnitListItem[],
): UnitNode[] {
  if (unitId == null) return tree;
  const unitMap = new Map(units.map((u) => [u.Id, u]));

  // Walk up from unitId until we hit an L2 node
  let cur = unitMap.get(unitId);
  while (cur != null && cur.Level !== "L2") {
    if (cur.ParentUnitId == null) return tree; // hit L1 root — no L2 found
    cur = unitMap.get(cur.ParentUnitId);
  }
  if (cur == null || cur.Level !== "L2") return tree;

  const l2Id = cur.Id;
  for (const root of tree) {
    const found = root.children.find((c) => c.Id === l2Id);
    if (found) return [found];
    if (root.Id === l2Id) return [root]; // unlikely but safe
  }
  return tree;
}
