// UNITS list — the L1 / L2 organisational tree.
//
// Title = unit name (e.g. "RAiD", "CyDef", "SWiFT").
// Self-referential lookup ParentUnit links L2 branches up to the L1 root.
// Code is a short identifier shown in the navy header; optional.
//
// Schema v1.

import type { SPListItem, SPLookup } from "./base";

export const UNITS_LIST = "UNITS" as const;

export type UnitLevel = "L1" | "L2" | "L3";

export interface UnitListItem extends SPListItem {
  Code: string | null;
  Level: UnitLevel;
  /** Lookup → UNITS. Null for the L1 root. */
  ParentUnit: SPLookup | null;
  ParentUnitId: number | null;
  Description: string | null;
  IsActive: boolean;
}

/** Shape sent in POST/MERGE bodies. SP requires __metadata.type. */
export interface UnitListItemWrite {
  __metadata: { type: "SP.Data.UNITSListItem" };
  Title: string;
  Code: string | null;
  Level: UnitLevel;
  ParentUnitId: number | null;
  Description: string | null;
  IsActive: boolean;
}
