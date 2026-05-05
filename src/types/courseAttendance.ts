// INDIVIDUAL_COURSE_ATTENDANCE — one row per (Individual × Course).
//
// App invariant: at most one row per pair. The mutation hook checks for an
// existing row before insert and either updates it or inserts new.
//
// Status drives the cell's traffic-light render in the Development table:
//   Completed     — green fill + completion Date
//   Planned       — amber fill + planned Date
//   NotPlanned    — red fill, no Date
//   NotApplicable — grey "NA" text, no fill (admin-set; e.g. "this course
//                   doesn't apply to this person despite their profile")
//
// "Empty cell" in the table = no row exists yet → render as NotPlanned by default.
//
// Schema v2.

import type { SPListItem, SPLookup } from "./base";
import type { RoaStatus } from "@/lib/progression";

export const COURSE_ATTENDANCE_LIST = "INDIVIDUAL_COURSE_ATTENDANCE" as const;

export interface CourseAttendanceListItem extends SPListItem {
  Individual: SPLookup;
  IndividualId: number;
  Course: SPLookup;
  CourseId: number;
  Status: RoaStatus;
  /** Completion date when Completed; planned date when Planned; null otherwise. */
  Date: string | null;
}

export interface CourseAttendanceListItemWrite {
  __metadata: { type: "SP.Data.INDIVIDUAL_COURSE_ATTENDANCEListItem" };
  Title: string;
  IndividualId: number;
  CourseId: number;
  Status: RoaStatus;
  Date: string | null;
}
