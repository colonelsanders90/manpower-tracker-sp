// src/provisioning/provisioningSequence.ts
//
// One-time list provisioning for the Manpower Tracker.
//
// Run via the /admin/provision route, gated by IsSiteAdmin. Each provisioner
// creates its list, adds columns, and applies baseline permissions. Lists are
// data-lists (users read/write) so all four are 'Contribute'.
//
// CRITICAL: list creation order matters because of lookup fields.
//   1. UNITS         — no lookups, must exist before ROLES + self-lookup
//   2. ROLES         — lookup to UNITS
//   3. INDIVIDUALS   — no lookups
//   4. POSTINGS      — lookups to INDIVIDUALS and ROLES
//
// SCHEMA_VERSION bumps on any column add/remove/rename. The current schema is
// recorded in the app's CLAUDE.md `Schema Changelog`.

import {
  createList,
  addFieldAsXml,
  addTextField,
  addNoteField,
  addNumberField,
  addDateField,
  addChoiceField,
  addBooleanField,
  addMultiChoiceField,
  listExists,
  fieldExists,
  getWebProperty,
  setWebProperty,
} from "@/lib/jsom";
import { applyPermissions } from "./applyPermissions";
import { log } from "@/lib/diagnosticLog";
import { spGetAll, spPost } from "@/lib/sharepoint";
import { UNITS_LIST } from "@/types/units";
import { ROLES_LIST } from "@/types/roles";
import { INDIVIDUALS_LIST } from "@/types/individuals";
import { POSTINGS_LIST } from "@/types/postings";
import { ROA_COURSES_LIST } from "@/types/roaCourses";
import { COURSE_ATTENDANCE_LIST } from "@/types/courseAttendance";
import { PROGRESSION_LIST } from "@/types/progression";

/** Bump on any column add/remove/rename. Mirrored in CLAUDE.md changelog. */
export const SCHEMA_VERSION = 2;

/** Web-property key holding the currently-applied schema version. */
export const SCHEMA_VERSION_KEY = "ManpowerTracker_SchemaVersion";

const LEVELS = ["L1", "L2", "L3"];
const STATUSES = ["Past", "Current", "Planned", "Candidate"];
const PROFILES = ["MDES", "EOS", "DXO"];
const ROA_STATUSES = ["Completed", "Planned", "NotPlanned", "NotApplicable"];

/**
 * SP wants a real list GUID for lookups (the `List` attribute on the field
 * XML). We fetch it via JSOM at provision time and substitute into the field
 * XML below in `addLookupField`.
 *
 * `RelationshipDeleteBehavior="Restrict"` mirrors the Postgres FK behaviour —
 * delete the unit → blocked if roles still reference it — matching the safety
 * guards in the Next.js prototype's server actions.
 */
async function getListGuid(listTitle: string): Promise<string> {
  // Lazy-load to avoid a hard dep on the SP global at module load.
  const win = window as unknown as { SP?: { ClientContext: { get_current(): { get_web(): { get_lists(): { getByTitle(t: string): { get_id(): unknown } } }; load(o: unknown): void; executeQueryAsync(s: () => void, e: () => void): void } } } };
  const SP = win.SP;
  if (!SP) throw new Error("JSOM not available");
  const ctx = SP.ClientContext.get_current();
  const list = ctx.get_web().get_lists().getByTitle(listTitle);
  ctx.load(list);
  await new Promise<void>((res, rej) =>
    ctx.executeQueryAsync(
      () => res(),
      () => rej(new Error(`Failed to read list ${listTitle}`)),
    ),
  );
  // get_id() returns SP.Guid; toString() gives "{xxxxxxxx-...}"
  const idObj = (list as unknown as { get_id(): { toString(): string } }).get_id();
  return idObj.toString();
}

async function addLookupField(
  listTitle: string,
  displayName: string,
  targetListTitle: string,
  required = false,
): Promise<void> {
  const targetGuid = await getListGuid(targetListTitle);
  // RelationshipDeleteBehavior="Restrict" requires the field to be indexed
  // first, which isn't possible at field-creation time in SP 2013. Omitting
  // it — the app's own invariants in lib/invariants.ts enforce FK safety.
  const xml = `
    <Field
      Type="Lookup"
      DisplayName="${displayName}"
      Required="${required}"
      List="${targetGuid}"
      ShowField="Title"
    />
  `;
  await addFieldAsXml(listTitle, xml);
}

/**
 * Each provisioner is independent. Failure of one halts the sequence so a
 * partially-provisioned set doesn't lurk in an inconsistent state.
 */
export const PROVISIONERS: { name: string; provision: () => Promise<void> }[] = [
  {
    name: UNITS_LIST,
    provision: async () => {
      await createList(UNITS_LIST, "RAiD organisational units (HQ + branches)");
      await addTextField(UNITS_LIST, "Code");
      await addChoiceField(UNITS_LIST, "Level", LEVELS, true);
      await addLookupField(UNITS_LIST, "ParentUnit", UNITS_LIST, false);
      await addNoteField(UNITS_LIST, "Description");
      await addBooleanField(UNITS_LIST, "IsActive");
      await applyPermissions(UNITS_LIST, "Contribute");
    },
  },
  {
    name: ROLES_LIST,
    provision: async () => {
      await createList(ROLES_LIST, "Roles within RAiD units (or external)");
      await addLookupField(ROLES_LIST, "Unit", UNITS_LIST, false);
      await addChoiceField(ROLES_LIST, "Level", LEVELS, true);
      await addBooleanField(ROLES_LIST, "IsHead");
      await addBooleanField(ROLES_LIST, "IsExternal");
      await addTextField(ROLES_LIST, "ExternalUnit");
      await addTextField(ROLES_LIST, "EstablishmentRank");
      await addTextField(ROLES_LIST, "EstablishmentVocation");
      await addNumberField(ROLES_LIST, "StandardTenureMonths");
      await addBooleanField(ROLES_LIST, "IsVacant");
      await addTextField(ROLES_LIST, "Specialisation");
      await addBooleanField(ROLES_LIST, "IsActive");
      await applyPermissions(ROLES_LIST, "Contribute");
    },
  },
  {
    name: INDIVIDUALS_LIST,
    provision: async () => {
      await createList(INDIVIDUALS_LIST, "RAiDers and external candidates");
      await addTextField(INDIVIDUALS_LIST, "EmployeeId");
      await addTextField(INDIVIDUALS_LIST, "Rank");
      await addTextField(INDIVIDUALS_LIST, "Specialisation");
      await addTextField(INDIVIDUALS_LIST, "Email");
      await addBooleanField(INDIVIDUALS_LIST, "IsExternal");
      await addBooleanField(INDIVIDUALS_LIST, "IsActive");
      await applyPermissions(INDIVIDUALS_LIST, "Contribute");
    },
  },
  {
    name: POSTINGS_LIST,
    provision: async () => {
      await createList(POSTINGS_LIST, "Movement ledger — past/current/planned/candidate");
      await addLookupField(POSTINGS_LIST, "Individual", INDIVIDUALS_LIST, true);
      await addLookupField(POSTINGS_LIST, "Role", ROLES_LIST, true);
      await addChoiceField(POSTINGS_LIST, "Status", STATUSES, true);
      await addDateField(POSTINGS_LIST, "StartDate");
      await addDateField(POSTINGS_LIST, "EndDate");
      await addNoteField(POSTINGS_LIST, "Notes");
      await applyPermissions(POSTINGS_LIST, "Contribute");
    },
  },
];

export type ProvisioningStepResult =
  | { name: string; status: "ok" }
  | { name: string; status: "error"; error: string };

/**
 * Run the full provisioning sequence. Stops on first failure (so a partial
 * mess is easier to clean up). Returns per-step results so the UI can show a
 * progress board.
 */
export async function runProvisioning(
  onProgress?: (r: ProvisioningStepResult) => void,
): Promise<ProvisioningStepResult[]> {
  const results: ProvisioningStepResult[] = [];

  log(
    "info",
    `Starting provisioning sequence (SCHEMA_VERSION=${SCHEMA_VERSION})`,
  );

  for (const p of PROVISIONERS) {
    try {
      await p.provision();
      const r: ProvisioningStepResult = { name: p.name, status: "ok" };
      results.push(r);
      onProgress?.(r);
      log("info", `Provisioned ${p.name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const r: ProvisioningStepResult = {
        name: p.name,
        status: "error",
        error: message,
      };
      results.push(r);
      onProgress?.(r);
      log(
        "error",
        `Provisioning failed at ${p.name}: ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
      break; // stop the sequence on first failure
    }
  }

  return results;
}

// ─── v1 → v2 migration ───────────────────────────────────────────────────────
//
// Adds the Development feature: Profile column on INDIVIDUALS, three new lists
// (ROA_COURSES, INDIVIDUAL_COURSE_ATTENDANCE, INDIVIDUAL_PROGRESSION), and a
// seed of the 7 ROA course rows.
//
// Each step is gated by an existence check so re-running is safe — partial
// migrations resume from where they left off without re-creating anything.
// Existing UNITS / ROLES / INDIVIDUALS / POSTINGS data is never touched.

const ROA_COURSE_SEED = [
  { Title: "MDEC",       Label: "Military Domain Expert Course",   Profiles: ["MDES"],         DisplayOrder: 1 },
  { Title: "JFC",        Label: "Joint Forces Course",             Profiles: ["MDES", "EOS"],  DisplayOrder: 2 },
  { Title: "IDSC",       Label: "Intermediate Defence Studies",    Profiles: ["MDES"],         DisplayOrder: 3 },
  { Title: "AFAC",       Label: "Air Force Advanced Course",       Profiles: ["EOS", "DXO"],   DisplayOrder: 4 },
  { Title: "JWC",        Label: "Joint Warfare Course",            Profiles: ["EOS", "DXO"],   DisplayOrder: 5 },
  { Title: "ADSC",       Label: "Advanced Defence Studies Course", Profiles: ["MDES"],         DisplayOrder: 6 },
  { Title: "CSC/CSC(E)", Label: "Command & Staff Course",          Profiles: ["EOS", "DXO"],   DisplayOrder: 7 },
];

/**
 * Read the currently-applied schema version. Returns 1 if no marker exists
 * (every prior deploy is implicitly v1). Returns the parsed integer otherwise.
 */
export async function readSchemaVersion(): Promise<number> {
  const raw = await getWebProperty(SCHEMA_VERSION_KEY);
  if (raw == null) return 1;
  const n = parseInt(raw, 10);
  return Number.isFinite(n) ? n : 1;
}

export const V2_MIGRATIONS: { name: string; run: () => Promise<void> }[] = [
  {
    name: `${INDIVIDUALS_LIST}: add Profile column`,
    run: async () => {
      if (await fieldExists(INDIVIDUALS_LIST, "Profile")) return;
      await addChoiceField(INDIVIDUALS_LIST, "Profile", PROFILES, false);
    },
  },
  {
    name: `${ROA_COURSES_LIST}: create list + columns`,
    run: async () => {
      if (!(await listExists(ROA_COURSES_LIST))) {
        await createList(ROA_COURSES_LIST, "Admin-managed ROA course catalogue");
      }
      // Title column is built-in. Add the rest only if missing.
      if (!(await fieldExists(ROA_COURSES_LIST, "Label"))) await addTextField(ROA_COURSES_LIST, "Label", true);
      if (!(await fieldExists(ROA_COURSES_LIST, "Profiles"))) await addMultiChoiceField(ROA_COURSES_LIST, "Profiles", PROFILES, false);
      if (!(await fieldExists(ROA_COURSES_LIST, "DisplayOrder"))) await addNumberField(ROA_COURSES_LIST, "DisplayOrder", false);
      if (!(await fieldExists(ROA_COURSES_LIST, "IsActive"))) await addBooleanField(ROA_COURSES_LIST, "IsActive", false);
      await applyPermissions(ROA_COURSES_LIST, "Contribute");
    },
  },
  {
    name: `${ROA_COURSES_LIST}: seed 7 default courses (idempotent)`,
    run: async () => {
      // Per workspace CLAUDE.md: idempotent seed guard via $top=1.
      const existing = await spGetAll<{ Id: number }>(
        `/lists/getbytitle('${ROA_COURSES_LIST}')/items?$select=Id&$top=1`,
      );
      if (existing.length > 0) return; // already seeded; do nothing

      for (const c of ROA_COURSE_SEED) {
        await spPost(`/lists/getbytitle('${ROA_COURSES_LIST}')/items`, {
          __metadata: { type: "SP.Data.ROA_COURSESListItem" },
          Title: c.Title,
          Label: c.Label,
          Profiles: { results: c.Profiles },
          DisplayOrder: c.DisplayOrder,
          IsActive: true,
        });
      }
    },
  },
  {
    name: `${COURSE_ATTENDANCE_LIST}: create list + columns`,
    run: async () => {
      if (!(await listExists(COURSE_ATTENDANCE_LIST))) {
        await createList(COURSE_ATTENDANCE_LIST, "ROA course attendance per individual");
      }
      if (!(await fieldExists(COURSE_ATTENDANCE_LIST, "Individual"))) {
        await addLookupField(COURSE_ATTENDANCE_LIST, "Individual", INDIVIDUALS_LIST, true);
      }
      if (!(await fieldExists(COURSE_ATTENDANCE_LIST, "Course"))) {
        await addLookupField(COURSE_ATTENDANCE_LIST, "Course", ROA_COURSES_LIST, true);
      }
      if (!(await fieldExists(COURSE_ATTENDANCE_LIST, "Status"))) {
        await addChoiceField(COURSE_ATTENDANCE_LIST, "Status", ROA_STATUSES, true);
      }
      if (!(await fieldExists(COURSE_ATTENDANCE_LIST, "Date"))) {
        await addDateField(COURSE_ATTENDANCE_LIST, "Date", false);
      }
      await applyPermissions(COURSE_ATTENDANCE_LIST, "Contribute");
    },
  },
  {
    name: `${PROGRESSION_LIST}: create list + columns`,
    run: async () => {
      if (!(await listExists(PROGRESSION_LIST))) {
        await createList(PROGRESSION_LIST, "Per-individual progression: MASC, R-Level, Track, remarks");
      }
      if (!(await fieldExists(PROGRESSION_LIST, "Individual"))) {
        await addLookupField(PROGRESSION_LIST, "Individual", INDIVIDUALS_LIST, true);
      }
      if (!(await fieldExists(PROGRESSION_LIST, "MASCLevel"))) {
        await addNumberField(PROGRESSION_LIST, "MASCLevel", false);
      }
      if (!(await fieldExists(PROGRESSION_LIST, "DateOfExpertise"))) {
        await addDateField(PROGRESSION_LIST, "DateOfExpertise", false);
      }
      if (!(await fieldExists(PROGRESSION_LIST, "EMFRemarks"))) {
        await addNoteField(PROGRESSION_LIST, "EMFRemarks", false);
      }
      if (!(await fieldExists(PROGRESSION_LIST, "Track"))) {
        await addChoiceField(PROGRESSION_LIST, "Track", ["Software", "Data", "Cyber", "PM", "Cloud"], false);
      }
      if (!(await fieldExists(PROGRESSION_LIST, "RLevel"))) {
        await addChoiceField(PROGRESSION_LIST, "RLevel", ["R1", "R2", "R3", "R4", "R5"], false);
      }
      if (!(await fieldExists(PROGRESSION_LIST, "RLevelRemarks"))) {
        await addNoteField(PROGRESSION_LIST, "RLevelRemarks", false);
      }
      if (!(await fieldExists(PROGRESSION_LIST, "CoursesRemarks"))) {
        await addNoteField(PROGRESSION_LIST, "CoursesRemarks", false);
      }
      await applyPermissions(PROGRESSION_LIST, "Contribute");
    },
  },
  {
    name: `Mark schema version = 2`,
    run: async () => {
      await setWebProperty(SCHEMA_VERSION_KEY, "2");
    },
  },
];

/**
 * Run the v1→v2 migration. Mirrors `runProvisioning` shape so the UI can
 * surface progress in the same way. Idempotent — safe to re-run after
 * partial failure.
 */
export async function runMigrationV2(
  onProgress?: (r: ProvisioningStepResult) => void,
): Promise<ProvisioningStepResult[]> {
  const results: ProvisioningStepResult[] = [];
  log("info", `Starting v1→v2 schema migration`);
  for (const step of V2_MIGRATIONS) {
    try {
      await step.run();
      const r: ProvisioningStepResult = { name: step.name, status: "ok" };
      results.push(r);
      onProgress?.(r);
      log("info", `Migration step ok: ${step.name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const r: ProvisioningStepResult = { name: step.name, status: "error", error: message };
      results.push(r);
      onProgress?.(r);
      log(
        "error",
        `Migration step failed: ${step.name}: ${message}`,
        err instanceof Error ? err.stack : undefined,
      );
      break;
    }
  }
  return results;
}
