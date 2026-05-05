// INDIVIDUAL_PROGRESSION — one row per individual, holds the non-course
// progression fields:
//   - MASCLevel + DateOfExpertise (only set for MDES profile)
//   - Track (single Choice; not set for MDES per current Excel convention)
//   - RLevel (single Choice; applies to all profiles)
//   - 3 Remarks fields (one per section, matches the source Excel)
//
// App invariant: at most one row per Individual. The mutation hook checks
// for an existing row and either updates it or inserts new.
//
// Schema v2.

import type { SPListItem, SPLookup } from "./base";
import type { CompetencyTrack, RLevel } from "@/lib/progression";

export const PROGRESSION_LIST = "INDIVIDUAL_PROGRESSION" as const;

export interface ProgressionListItem extends SPListItem {
  Individual: SPLookup;
  IndividualId: number;
  /** EMF section — MASC Level (number, e.g. 6). Null for non-MDES. */
  MASCLevel: number | null;
  /** EMF section — date the MASC was attained. Null for non-MDES. */
  DateOfExpertise: string | null;
  EMFRemarks: string | null;
  Track: CompetencyTrack | null;
  RLevel: RLevel | null;
  RLevelRemarks: string | null;
  CoursesRemarks: string | null;
}

export interface ProgressionListItemWrite {
  __metadata: { type: "SP.Data.INDIVIDUAL_PROGRESSIONListItem" };
  Title: string;
  IndividualId: number;
  MASCLevel: number | null;
  DateOfExpertise: string | null;
  EMFRemarks: string | null;
  Track: CompetencyTrack | null;
  RLevel: RLevel | null;
  RLevelRemarks: string | null;
  CoursesRemarks: string | null;
}
