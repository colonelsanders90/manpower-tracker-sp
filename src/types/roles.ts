// ROLES list — positions within a unit (or external).
//
// Internal role: Unit lookup populated, IsExternal = false.
// External role: Unit empty, IsExternal = true, ExternalUnit holds free text
// (e.g. "DPLD", "X AELG", "APD").
//
// Establishment profile: rank/vocation pegged to the role (e.g. "LTC"/"AAO").
//
// IsVacant is server-derived from "no Current posting" — admins can leave it
// alone; the provisioning sequence on first run sets all to true.
//
// Schema v1.

import type { SPListItem, SPLookup } from "./base";
import type { UnitLevel } from "./units";

export const ROLES_LIST = "ROLES" as const;

export interface RoleListItem extends SPListItem {
  /** Lookup → UNITS. Null when IsExternal=true. */
  Unit: SPLookup | null;
  UnitId: number | null;
  Level: UnitLevel;
  IsHead: boolean;
  IsExternal: boolean;
  ExternalUnit: string | null;
  EstablishmentRank: string | null;
  EstablishmentVocation: string | null;
  StandardTenureMonths: number | null;
  IsVacant: boolean;
  Specialisation: string | null;
  IsActive: boolean;
}

export interface RoleListItemWrite {
  __metadata: { type: "SP.Data.ROLESListItem" };
  Title: string;
  UnitId: number | null;
  Level: UnitLevel;
  IsHead: boolean;
  IsExternal: boolean;
  ExternalUnit: string | null;
  EstablishmentRank: string | null;
  EstablishmentVocation: string | null;
  StandardTenureMonths: number | null;
  IsVacant: boolean;
  Specialisation: string | null;
  IsActive: boolean;
}
