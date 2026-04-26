// POSTINGS list — the movement ledger. One row per (individual, role, status).
//
// Status drives the timeline visual:
//   Past      — completed tour
//   Current   — present incumbent (single per role — invariant enforced client-side)
//   Planned   — successor approved
//   Candidate — under consideration
//
// StartDate / EndDate are optional but the renderer derives a sensible end
// from role.StandardTenureMonths if EndDate is missing on a Planned/Candidate.
//
// Schema v1.

import type { SPListItem, SPLookup } from "./base";

export const POSTINGS_LIST = "POSTINGS" as const;

export type PostingStatus = "Past" | "Current" | "Planned" | "Candidate";

export interface PostingListItem extends SPListItem {
  /** Lookup → INDIVIDUALS. */
  Individual: SPLookup;
  IndividualId: number;
  /** Lookup → ROLES. */
  Role: SPLookup;
  RoleId: number;
  Status: PostingStatus;
  StartDate: string | null;
  EndDate: string | null;
  Notes: string | null;
}

export interface PostingListItemWrite {
  __metadata: { type: "SP.Data.POSTINGSListItem" };
  /**
   * SP requires lookup ids on write, not the full lookup object.
   * Title is required by SP on every list item even if we don't use it
   * meaningfully — set to "<individualName> → <roleTitle>" or similar at write time.
   */
  Title: string;
  IndividualId: number;
  RoleId: number;
  Status: PostingStatus;
  StartDate: string | null;
  EndDate: string | null;
  Notes: string | null;
}
