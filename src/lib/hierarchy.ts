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
