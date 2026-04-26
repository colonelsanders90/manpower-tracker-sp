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
} from "@/lib/jsom";
import { applyPermissions } from "./applyPermissions";
import { log } from "@/lib/diagnosticLog";
import { UNITS_LIST } from "@/types/units";
import { ROLES_LIST } from "@/types/roles";
import { INDIVIDUALS_LIST } from "@/types/individuals";
import { POSTINGS_LIST } from "@/types/postings";

/** Bump on any column add/remove/rename. Mirrored in CLAUDE.md changelog. */
export const SCHEMA_VERSION = 1;

const LEVELS = ["L1", "L2", "L3"];
const STATUSES = ["Past", "Current", "Planned", "Candidate"];

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
  const xml = `
    <Field
      Type="Lookup"
      DisplayName="${displayName}"
      Required="${required}"
      List="${targetGuid}"
      ShowField="Title"
      RelationshipDeleteBehavior="Restrict"
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
