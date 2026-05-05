// ROA_COURSES list — admin-managed catalogue of milestone courses.
//
// Title = course code, e.g. "MDEC", "JFC", "CSC/CSC(E)" — short identifier
// that's also the column header in the Development table.
// Label = human-readable display name (admin-editable).
// Profiles = which profiles default to taking this course. Per-individual
// overrides happen on INDIVIDUAL_COURSE_ATTENDANCE (e.g. NotApplicable).
// IsActive = soft delete; inactive courses are hidden from the table but
// preserved so attendance history remains intact.
//
// Schema v2.

import type { SPListItem } from "./base";
import type { Profile } from "@/lib/progression";

export const ROA_COURSES_LIST = "ROA_COURSES" as const;

export interface RoaCourseListItem extends SPListItem {
  /** course code, mirrored from Title for ergonomics */
  Title: string;
  Label: string;
  /** which profiles default-require this course */
  Profiles: Profile[];
  DisplayOrder: number;
  IsActive: boolean;
}

export interface RoaCourseListItemWrite {
  __metadata: { type: "SP.Data.ROA_COURSESListItem" };
  Title: string;
  Label: string;
  /** SP multi-choice fields are written as { results: [...] } in REST */
  Profiles: { results: Profile[] };
  DisplayOrder: number;
  IsActive: boolean;
}
