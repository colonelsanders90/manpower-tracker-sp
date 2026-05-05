// Progression helpers — pure logic, no React/SP deps.
//
// Drives the Development tab and the related dialogs. Three concerns:
//   1. The Profile / Track / R-Level enums (single source of truth)
//   2. Cell-fill colours that match the source Excel (HR's existing UX)
//   3. Profile→required-courses lookup, resolved at runtime from the
//      admin-managed ROA_COURSES catalogue (NOT hardcoded).
//
// Per the workspace CLAUDE.md, this module has no React/SP imports so it can
// be exercised in vitest under the standard "src/lib/__tests__/<name>.test.ts"
// pattern without jsdom.

import type { RoaCourseListItem } from "@/types/roaCourses";

// ── Domain enums ─────────────────────────────────────────────────────────────

/**
 * Workforce profile — drives which fields are visible per individual and
 * which ROA courses default-apply.
 *
 * Stored as a Choice column on INDIVIDUALS (added in schema v2).
 */
export type Profile = "MDES" | "EOS" | "DXO";

/** Single-Choice — the person's competency track. */
export type CompetencyTrack = "Software" | "Data" | "Cyber" | "PM" | "Cloud";

/** Single-Choice — the person's R-Level within their track. */
export type RLevel = "R1" | "R2" | "R3" | "R4" | "R5";

/**
 * ROA course attendance status. Four states (matches the Excel):
 *   Completed     — green fill in the table, completion Date set
 *   Planned       — amber fill, planned Date set
 *   NotPlanned    — red fill (no Date) — default when no row exists yet
 *   NotApplicable — grey "NA" text, no fill — admin-set, distinct from blank
 */
export type RoaStatus =
  | "Completed"
  | "Planned"
  | "NotPlanned"
  | "NotApplicable";

// Convenient arrays for dropdowns / iteration.
export const PROFILES: Profile[] = ["MDES", "EOS", "DXO"];
export const TRACKS: CompetencyTrack[] = [
  "Software",
  "Data",
  "Cyber",
  "PM",
  "Cloud",
];
export const R_LEVELS: RLevel[] = ["R1", "R2", "R3", "R4", "R5"];
export const ROA_STATUSES: RoaStatus[] = [
  "Completed",
  "Planned",
  "NotPlanned",
  "NotApplicable",
];

// ── Status visuals ───────────────────────────────────────────────────────────

/**
 * Cell-fill colours, mirrored from the source Excel's existing fills:
 *   ATT (Attended)         → green   #92D050  (Excel FF92D050)
 *   Planned                → amber   #FFC000  (Excel FFFFC000)
 *   NotPlanned             → red     theme.error
 *   NotApplicable          → grey    theme.stone (or render "NA" with no fill)
 *
 * The text inside the cell shows the date for Completed/Planned, "NA" for
 * NotApplicable, and nothing for NotPlanned.
 */
export const STATUS_FILL: Record<RoaStatus, string> = {
  Completed: "#92D050",
  Planned: "#FFC000",
  NotPlanned: "#E24B4A",
  NotApplicable: "#DEDCD8",
};

/**
 * Text colour to use against the corresponding fill — picked for legibility.
 * Cells with red fill get white text; the others get near-black.
 */
export const STATUS_TEXT: Record<RoaStatus, string> = {
  Completed: "#085041", // dark green
  Planned: "#633806", // dark amber
  NotPlanned: "#FFFFFF",
  NotApplicable: "#5F5E5A", // muted grey
};

/** Short label for the cell — what to render inside when no date is present. */
export const STATUS_LABEL: Record<RoaStatus, string> = {
  Completed: "ATT",
  Planned: "Planned",
  NotPlanned: "—",
  NotApplicable: "NA",
};

// ── Profile-conditional fields ───────────────────────────────────────────────
//
// Drives the edit dialog and the table renderers. Per the user's confirmation
// in the plan:
//   - MASC + Date of Expertise: only MDES
//   - Track: DXO + EOS (NOT MDES per the source Excel; flag if this changes)
//   - R-Level: everyone (all 3 profiles)

export const SHOWS_MASC: Record<Profile, boolean> = {
  MDES: true,
  EOS: false,
  DXO: false,
};

export const SHOWS_TRACK: Record<Profile, boolean> = {
  MDES: false,
  EOS: true,
  DXO: true,
};

export const SHOWS_RLEVEL: Record<Profile, boolean> = {
  MDES: true,
  EOS: true,
  DXO: true,
};

// ── Course catalogue lookup ──────────────────────────────────────────────────

/**
 * Resolve the courses required for a given profile from the admin-managed
 * ROA_COURSES catalogue. Filters out inactive courses and sorts by
 * DisplayOrder so the table column order is stable and admin-controlled.
 *
 * Returns [] when:
 *   - profile is null (individual hasn't been assigned a profile yet)
 *   - no active courses target that profile
 *
 * Per-individual NotApplicable overrides happen at the attendance row level,
 * not here — this just gives the default "applicable" set.
 */
export function getRequiredCourses(
  profile: Profile | null,
  allCourses: readonly RoaCourseListItem[],
): RoaCourseListItem[] {
  if (profile == null) return [];
  return allCourses
    .filter((c) => c.IsActive && c.Profiles.includes(profile))
    .sort((a, b) => a.DisplayOrder - b.DisplayOrder);
}

/**
 * Same as getRequiredCourses but also includes any courses where an
 * attendance record already exists for this individual — even if the course
 * doesn't formally apply to their profile. This is what the Edit dialog
 * needs to render: the admin must be able to flip a row from NA→Planned for
 * a course that's outside the profile's defaults, and we need to surface
 * those existing rows so the admin sees what's there.
 */
export function getRelevantCourses(
  profile: Profile | null,
  allCourses: readonly RoaCourseListItem[],
  existingCourseIds: ReadonlySet<number>,
): RoaCourseListItem[] {
  // No profile → nothing to show. Admin should assign Profile first.
  if (profile == null) return [];
  const required = getRequiredCourses(profile, allCourses);
  const requiredIds = new Set(required.map((c) => c.Id));
  const extras = allCourses
    .filter((c) => c.IsActive && existingCourseIds.has(c.Id) && !requiredIds.has(c.Id))
    .sort((a, b) => a.DisplayOrder - b.DisplayOrder);
  return [...required, ...extras];
}
