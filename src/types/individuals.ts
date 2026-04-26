// INDIVIDUALS list — RAiDers and external candidates.
//
// Title = full name including rank prefix as it should display
// (e.g. "MAJ Jane Lim").
// IsExternal = true means the person is outside RAiD — used on Past postings
// (someone who moved out) and Planned/Candidate postings (someone moving in).
//
// EmployeeId / Email are optional — kept null for externals typically.
//
// Schema v1.

import type { SPListItem } from "./base";

export const INDIVIDUALS_LIST = "INDIVIDUALS" as const;

export interface IndividualListItem extends SPListItem {
  EmployeeId: string | null;
  Rank: string | null;
  Specialisation: string | null;
  Email: string | null;
  IsExternal: boolean;
  IsActive: boolean;
}

export interface IndividualListItemWrite {
  __metadata: { type: "SP.Data.INDIVIDUALSListItem" };
  Title: string;
  EmployeeId: string | null;
  Rank: string | null;
  Specialisation: string | null;
  Email: string | null;
  IsExternal: boolean;
  IsActive: boolean;
}
