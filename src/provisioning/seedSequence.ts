// src/provisioning/seedSequence.ts
//
// One-time seed for the RAiD org structure.
// Creates the L1 root unit (RAiD) then all L2 branches in order.
// Run from /admin/provision AFTER the four lists have been provisioned.
//
// Safe to inspect before running — it checks whether UNITS already has rows
// and aborts with a clear message if so, so you can't double-seed.

import { spPost, spGetAll } from "@/lib/sharepoint";
import { log } from "@/lib/diagnosticLog";
import { UNITS_LIST } from "@/types/units";

// ─── RAiD org structure ───────────────────────────────────────────────────────

const ROOT_UNIT = { Title: "RAiD", Code: "RAID" } as const;

// Order matters for display — P4B first, rest as agreed.
const L2_BRANCHES: string[] = [
  "P4B",
  "Corporate Svcs",
  "SWiFT",
  "CyDef",
  "RSAF Data Office",
  "Mission Data",
  "A3",
  "Cloud",
  "IKC2",
  "PPCOE",
  "Aether",
];

// ─── Types ────────────────────────────────────────────────────────────────────

export type SeedStepResult =
  | { name: string; status: "ok" }
  | { name: string; status: "skip"; reason: string }
  | { name: string; status: "error"; error: string };

// All step names in order, used to pre-populate the UI.
export const SEED_STEP_NAMES: string[] = [
  ROOT_UNIT.Title,
  ...L2_BRANCHES,
];

// ─── Runner ───────────────────────────────────────────────────────────────────

export async function runSeed(
  onProgress?: (r: SeedStepResult) => void,
): Promise<SeedStepResult[]> {
  const results: SeedStepResult[] = [];

  log("info", "Starting RAiD structure seed");

  // Guard — abort if units already exist so we never double-seed.
  const existing = await spGetAll<{ Id: number }>(
    `/lists/getbytitle('${UNITS_LIST}')/items?$select=Id&$top=1`,
  );
  if (existing.length > 0) {
    const r: SeedStepResult = {
      name: ROOT_UNIT.Title,
      status: "skip",
      reason: "UNITS list already has items — seed aborted to avoid duplicates.",
    };
    results.push(r);
    onProgress?.(r);
    log("warn", r.reason);
    return results;
  }

  // Step 1 — create the L1 root.
  let rootId: number;
  try {
    const created = await spPost<{ Id: number }>(
      `/lists/getbytitle('${UNITS_LIST}')/items`,
      {
        __metadata: { type: "SP.Data.UNITSListItem" },
        Title: ROOT_UNIT.Title,
        Code: ROOT_UNIT.Code,
        Level: "L1",
        ParentUnitId: null,
        Description: null,
        IsActive: true,
      },
    );
    rootId = created.Id;
    const r: SeedStepResult = { name: ROOT_UNIT.Title, status: "ok" };
    results.push(r);
    onProgress?.(r);
    log("info", `Seeded ${ROOT_UNIT.Title} (L1, Id=${rootId})`);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const r: SeedStepResult = {
      name: ROOT_UNIT.Title,
      status: "error",
      error: message,
    };
    results.push(r);
    onProgress?.(r);
    log("error", `Seed failed at ${ROOT_UNIT.Title}: ${message}`);
    // Cannot seed branches without the root — stop here.
    return results;
  }

  // Step 2 — create each L2 branch. Continue on individual failures so a
  // single bad name doesn't lose the rest.
  for (const name of L2_BRANCHES) {
    try {
      await spPost(
        `/lists/getbytitle('${UNITS_LIST}')/items`,
        {
          __metadata: { type: "SP.Data.UNITSListItem" },
          Title: name,
          Code: null,
          Level: "L2",
          ParentUnitId: rootId,
          Description: null,
          IsActive: true,
        },
      );
      const r: SeedStepResult = { name, status: "ok" };
      results.push(r);
      onProgress?.(r);
      log("info", `Seeded branch ${name}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      const r: SeedStepResult = { name, status: "error", error: message };
      results.push(r);
      onProgress?.(r);
      log("error", `Seed failed at branch ${name}: ${message}`);
    }
  }

  log("info", "RAiD structure seed complete");
  return results;
}
