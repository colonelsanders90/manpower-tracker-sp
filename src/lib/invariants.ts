// The four data-integrity invariants ported from the Next.js prototype's
// app/actions.ts. Pure functions that compute the SET of changes needed —
// the mutation hooks then drive dataAccess to apply them.
//
//   1. Single-Current per role: only one Current posting per role. New
//      Currents demote any existing Current to Past with a clean handoff.
//   2. Single-head per unit: only one isHead=true role per unit. New heads
//      demote any existing head to non-head.
//   3. Branch-head level snap: a head's Level is always its parent unit's
//      Level (L1 head in L1 unit, L2 head in L2 unit).
//   4. isVacant sync: role.IsVacant is always derived from "no Current
//      posting on this role", recomputed after every posting mutation.

import type { PostingListItem, PostingStatus } from "@/types/postings";
import type { RoleListItem } from "@/types/roles";
import type { UnitListItem, UnitLevel } from "@/types/units";

export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: string };

const VALID_STATUSES: PostingStatus[] = [
  "Past",
  "Current",
  "Planned",
  "Candidate",
];

export function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

/** Returns null if dates are valid for this status, else an error string. */
export function validatePostingDates(
  status: PostingStatus,
  startDate: string | null,
  endDate: string | null,
): string | null {
  if (!VALID_STATUSES.includes(status)) {
    return `Invalid status: ${status}`;
  }
  if (status === "Past" && (!startDate || !endDate)) {
    return "Past postings require both a start and an end date.";
  }
  if (startDate && endDate && endDate < startDate) {
    return "End date must be on or after the start date.";
  }
  return null;
}

// ─── Invariant 1 — single Current per role ────────────────────────────────────

/**
 * Returns the postings to demote (status="Past", endDate=handoffDate) when a
 * new Current is being introduced or an existing posting is being promoted to
 * Current.
 */
export function findCurrentsToDemote(
  postings: PostingListItem[],
  roleId: number,
  exceptPostingId?: number,
): PostingListItem[] {
  return postings.filter(
    (p) =>
      p.RoleId === roleId &&
      p.Status === "Current" &&
      p.Id !== exceptPostingId,
  );
}

// ─── Invariant 2 — single head per unit ───────────────────────────────────────

/**
 * Returns the roles to demote (isHead → false) when a role is being promoted
 * to head on the given unit.
 */
export function findHeadsToDemote(
  roles: RoleListItem[],
  unitId: number,
  exceptRoleId?: number,
): RoleListItem[] {
  return roles.filter(
    (r) =>
      r.UnitId === unitId &&
      r.IsHead === true &&
      r.Id !== exceptRoleId,
  );
}

// ─── Invariant 3 — branch-head level snap ─────────────────────────────────────

/**
 * Returns the level the role should have given isHead and the parent unit.
 *  - If isHead=true: snap to the unit's level (L1 → L1 head, L2 → L2 head).
 *  - If isHead=false: keep the level the caller passed (no opinion).
 */
export function snapHeadLevel(
  isHead: boolean,
  unit: UnitListItem | undefined,
  fallbackLevel: UnitLevel,
): UnitLevel {
  if (!isHead) return fallbackLevel;
  return unit?.Level ?? fallbackLevel;
}

// ─── Invariant 4 — isVacant sync ──────────────────────────────────────────────

/**
 * Returns true if the role would be vacant after the given operation —
 * meaning no Current posting references it. excludePostingId is set when
 * deleting (to ignore the about-to-be-removed row).
 */
export function computeRoleVacancy(
  postings: PostingListItem[],
  roleId: number,
  excludePostingId?: number,
): boolean {
  return !postings.some(
    (p) =>
      p.RoleId === roleId &&
      p.Status === "Current" &&
      p.Id !== excludePostingId,
  );
}

// ─── FK guards (port of the deletion safety in the Next.js actions) ──────────

export function rolesReferencingUnit(
  roles: RoleListItem[],
  unitId: number,
): RoleListItem[] {
  return roles.filter((r) => r.UnitId === unitId);
}

export function postingsReferencingRole(
  postings: PostingListItem[],
  roleId: number,
): PostingListItem[] {
  return postings.filter((p) => p.RoleId === roleId);
}

export function postingsReferencingIndividual(
  postings: PostingListItem[],
  individualId: number,
): PostingListItem[] {
  return postings.filter((p) => p.IndividualId === individualId);
}
