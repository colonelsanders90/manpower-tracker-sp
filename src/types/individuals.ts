// INDIVIDUALS list — RAiDers and external candidates.
//
// Title = the person's name (rank is a separate field, NOT embedded — joined
// at display time via formatName(rank, title)).
// IsExternal = true means the person is outside RAiD — used on Past postings
// (someone who moved out) and Planned/Candidate postings (someone moving in).
// Profile (added in v2) — MDES | EOS | DXO. Drives the Development tab's
// per-profile field visibility and which ROA courses apply by default.
// IsDTCO (added in v3) — flag for Dual Track Career Officers (officers
// tracked for digital skillsets). DTCOSkills carries free-text skills.
//
// EmployeeId / Email are optional — kept null for externals typically.
//
// Schema v1, Profile added in v2, IsDTCO + DTCOSkills added in v3.

import type { SPListItem } from "./base";
import type { Profile } from "@/lib/progression";

export const INDIVIDUALS_LIST = "INDIVIDUALS" as const;

export interface IndividualListItem extends SPListItem {
  EmployeeId: string | null;
  Rank: string | null;
  Specialisation: string | null;
  Email: string | null;
  IsExternal: boolean;
  IsActive: boolean;
  /** v2 — null for pre-migration rows until admin assigns a value. */
  Profile: Profile | null;
  /** v3 — Dual Track Career Officer flag. Drives the /dtco ledger. */
  IsDTCO: boolean;
  /** v3 — free-text skills, e.g. "Cyber Ops, Cloud Architecture, ML/AI". */
  DTCOSkills: string | null;
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
  Profile: Profile | null;
  IsDTCO: boolean;
  DTCOSkills: string | null;
}
