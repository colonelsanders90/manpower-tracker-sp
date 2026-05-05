// CRUD mutation hooks. Each wraps dataAccess + the four invariants and
// invalidates the relevant TanStack Query cache keys on success.
//
// Errors are surfaced as throws — the calling component catches in its
// onError or via try/catch in an action prop and shows an alert. The
// invariant code throws Error with friendly messages on FK violations or
// validation failures.

import { useMutation, useQueryClient } from "@tanstack/react-query";
import { dataAccess } from "@/lib/dataAccess";
import {
  validatePostingDates,
  findCurrentsToDemote,
  findHeadsToDemote,
  snapHeadLevel,
  computeRoleVacancy,
  rolesReferencingUnit,
  postingsReferencingRole,
  postingsReferencingIndividual,
  todayIso,
} from "@/lib/invariants";
import type { PostingStatus } from "@/types/postings";
import type { UnitLevel } from "@/types/units";
import { UNITS_KEY } from "./useUnits";
import { ROLES_KEY } from "./useRoles";
import { INDIVIDUALS_KEY } from "./useIndividuals";
import { POSTINGS_KEY } from "./usePostings";
import { ROA_COURSES_KEY } from "./useRoaCourses";
import { COURSE_ATTENDANCE_KEY } from "./useCourseAttendance";
import { PROGRESSION_KEY } from "./useProgression";
import type { Profile, RoaStatus, CompetencyTrack, RLevel } from "@/lib/progression";
import { formatName } from "@/lib/formatters";

function useInvalidate() {
  const qc = useQueryClient();
  return (...keys: readonly (readonly unknown[])[]) => {
    for (const k of keys) qc.invalidateQueries({ queryKey: k });
  };
}

// ─── Branches (L2 units under RAiD) ───────────────────────────────────────────

export type CreateBranchInput = {
  parentUnitId: number;
  name: string;
  /** Optional: atomically create the branch head with this title. */
  headTitle?: string | null;
  code?: string | null;
};

export function useCreateBranch() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: CreateBranchInput) => {
      if (!input.name.trim()) throw new Error("Branch name is required");

      const unitId = await dataAccess.createUnit({
        Title: input.name.trim(),
        Code: input.code?.trim() ?? null,
        Level: "L2",
        ParentUnitId: input.parentUnitId,
        Description: null,
        IsActive: true,
      });

      if (input.headTitle && input.headTitle.trim()) {
        await dataAccess.createRole({
          Title: input.headTitle.trim(),
          UnitId: unitId,
          Level: "L2",
          IsHead: true,
          IsExternal: false,
          ExternalUnit: null,
          EstablishmentRank: null,
          EstablishmentVocation: null,
          StandardTenureMonths: null,
          IsVacant: true,
          Specialisation: null,
          IsActive: true,
        });
      }
    },
    onSuccess: () => invalidate(UNITS_KEY, ROLES_KEY),
  });
}

export function useRenameUnit() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: { id: number; name: string }) => {
      if (!input.name.trim()) throw new Error("Name is required");
      await dataAccess.updateUnit(input.id, { Title: input.name.trim() });
    },
    onSuccess: () => invalidate(UNITS_KEY),
  });
}

export function useDeleteUnit() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: number) => {
      const roles = await dataAccess.getRoles();
      const blockers = rolesReferencingUnit(roles, id);
      if (blockers.length > 0) {
        throw new Error(
          `Can't delete this branch — it still has ${blockers.length} role${blockers.length === 1 ? "" : "s"}. Remove the roles first.`,
        );
      }
      await dataAccess.deleteUnit(id);
    },
    onSuccess: () => invalidate(UNITS_KEY),
  });
}

// ─── Roles ────────────────────────────────────────────────────────────────────

export type CreateRoleInput = {
  unitId: number;
  title: string;
  level: UnitLevel; // hint; server snaps to unit.level if isHead
  isHead: boolean;
  specialisation?: string | null;
  establishmentRank?: string | null;
  establishmentVocation?: string | null;
};

export function useCreateRole() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: CreateRoleInput) => {
      if (!input.title.trim()) throw new Error("Role title is required");

      // Invariant 2 + 3: if becoming head, demote any existing head and
      // snap the level to the parent unit's level.
      let level = input.level;
      if (input.isHead) {
        const [units, roles] = await Promise.all([
          dataAccess.getUnits(),
          dataAccess.getRoles(),
        ]);
        const parent = units.find((u) => u.Id === input.unitId);
        if (!parent) throw new Error("Unit not found");
        level = snapHeadLevel(true, parent, level);

        const toDemote = findHeadsToDemote(roles, input.unitId);
        for (const r of toDemote) {
          await dataAccess.updateRole(r.Id, { IsHead: false });
        }
      }

      await dataAccess.createRole({
        Title: input.title.trim(),
        UnitId: input.unitId,
        Level: level,
        IsHead: input.isHead,
        IsExternal: false,
        ExternalUnit: null,
        EstablishmentRank: input.establishmentRank?.trim() || null,
        EstablishmentVocation: input.establishmentVocation?.trim() || null,
        StandardTenureMonths: null,
        IsVacant: true,
        Specialisation: input.specialisation?.trim() || null,
        IsActive: true,
      });
    },
    onSuccess: () => invalidate(ROLES_KEY),
  });
}

export type UpdateRoleInput = {
  id: number;
  title: string;
  isHead: boolean;
  specialisation?: string | null;
  establishmentRank?: string | null;
  establishmentVocation?: string | null;
};

export function useUpdateRole() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: UpdateRoleInput) => {
      if (!input.title.trim()) throw new Error("Role title is required");

      const [units, roles] = await Promise.all([
        dataAccess.getUnits(),
        dataAccess.getRoles(),
      ]);
      const role = roles.find((r) => r.Id === input.id);
      if (!role) throw new Error("Role not found");

      // Invariants 2 + 3 if becoming head
      let level = role.Level;
      if (input.isHead && role.UnitId != null) {
        const parent = units.find((u) => u.Id === role.UnitId);
        if (parent) level = parent.Level;
        const toDemote = findHeadsToDemote(roles, role.UnitId, role.Id);
        for (const r of toDemote) {
          await dataAccess.updateRole(r.Id, { IsHead: false });
        }
      }

      await dataAccess.updateRole(input.id, {
        Title: input.title.trim(),
        IsHead: input.isHead,
        Level: level,
        Specialisation: input.specialisation?.trim() || null,
        EstablishmentRank: input.establishmentRank?.trim() || null,
        EstablishmentVocation: input.establishmentVocation?.trim() || null,
      });
    },
    onSuccess: () => invalidate(ROLES_KEY),
  });
}

export function useDeleteRole() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: number) => {
      const postings = await dataAccess.getPostings();
      const blockers = postingsReferencingRole(postings, id);
      if (blockers.length > 0) {
        throw new Error(
          `Can't delete this role — ${blockers.length} posting${blockers.length === 1 ? "" : "s"} still reference it. Remove the postings first.`,
        );
      }
      await dataAccess.deleteRole(id);
    },
    onSuccess: () => invalidate(ROLES_KEY),
  });
}

export function useToggleRoleVacancy() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: { id: number; isVacant: boolean }) => {
      // Manual toggle — Invariant 4 normally derives this, but we keep the
      // toggle for HR's "anticipated vacancy" flag.
      await dataAccess.updateRole(input.id, { IsVacant: !input.isVacant });
    },
    onSuccess: () => invalidate(ROLES_KEY),
  });
}

// ─── Individuals ──────────────────────────────────────────────────────────────

export type CreateIndividualInput = {
  name: string;
  rank?: string | null;
  specialisation?: string | null;
  employeeId?: string | null;
  email?: string | null;
  isExternal: boolean;
  /** v2 — null = unassigned. Admin can edit later via the Development tab. */
  profile?: import("@/lib/progression").Profile | null;
};

export function useCreateIndividual() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: CreateIndividualInput) => {
      if (!input.name.trim()) throw new Error("Name is required");
      await dataAccess.createIndividual({
        Title: input.name.trim(),
        Rank: input.rank?.trim() || null,
        Specialisation: input.specialisation?.trim() || null,
        EmployeeId: input.employeeId?.trim() || null,
        Email: input.email?.trim() || null,
        IsExternal: input.isExternal,
        IsActive: true,
        Profile: input.profile ?? null,
      });
    },
    onSuccess: () => invalidate(INDIVIDUALS_KEY),
  });
}

export type UpdateIndividualInput = {
  id: number;
  name: string;
  rank?: string | null;
  specialisation?: string | null;
  employeeId?: string | null;
  email?: string | null;
  profile?: Profile | null;
};

export function useUpdateIndividual() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: UpdateIndividualInput) => {
      if (!input.name.trim()) throw new Error("Name is required");
      const patch: Parameters<typeof dataAccess.updateIndividual>[1] = {
        Title: input.name.trim(),
        Rank: input.rank?.trim() || null,
        Specialisation: input.specialisation?.trim() || null,
        EmployeeId: input.employeeId?.trim() || null,
        Email: input.email?.trim() || null,
      };
      // Only update Profile if explicitly provided — otherwise leave the
      // existing value untouched. Useful when the dialog doesn't surface the field.
      if ("profile" in input) patch.Profile = input.profile ?? null;
      await dataAccess.updateIndividual(input.id, patch);
    },
    onSuccess: () => invalidate(INDIVIDUALS_KEY),
  });
}

export function useDeleteIndividual() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: number) => {
      const postings = await dataAccess.getPostings();
      const blockers = postingsReferencingIndividual(postings, id);
      if (blockers.length > 0) {
        throw new Error(
          `Can't delete this person — ${blockers.length} posting${blockers.length === 1 ? "" : "s"} reference them. Remove the postings on Admin → Postings first.`,
        );
      }
      await dataAccess.deleteIndividual(id);
    },
    onSuccess: () => invalidate(INDIVIDUALS_KEY),
  });
}

// ─── Postings ─────────────────────────────────────────────────────────────────

export type CreatePostingInput = {
  individualId?: number;
  roleId?: number;
  externalIndividual?: { name: string; rank?: string | null };
  externalRole?: { title: string; subUnit: string };
  status: PostingStatus;
  startDate: string | null;
  endDate: string | null;
  notes?: string | null;
};

export function useCreatePosting() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: CreatePostingInput) => {
      // Status=Current shouldn't carry an end date
      const endDate =
        input.status === "Current" ? null : input.endDate;

      const dateError = validatePostingDates(
        input.status,
        input.startDate,
        endDate,
      );
      if (dateError) throw new Error(dateError);

      // Resolve / create individual
      let individualId = input.individualId;
      if (input.externalIndividual) {
        if (!input.externalIndividual.name.trim()) {
          throw new Error("Person name is required");
        }
        individualId = await dataAccess.createIndividual({
          Title: input.externalIndividual.name.trim(),
          Rank: input.externalIndividual.rank?.trim() || null,
          Specialisation: null,
          EmployeeId: null,
          Email: null,
          IsExternal: true,
          IsActive: true,
          Profile: null, // externals don't track progression
        });
      }
      if (individualId == null) throw new Error("Individual is required");

      // Resolve / create role
      let roleId = input.roleId;
      if (input.externalRole) {
        if (!input.externalRole.title.trim() || !input.externalRole.subUnit.trim()) {
          throw new Error("External role title and sub-unit are required");
        }
        roleId = await dataAccess.createRole({
          Title: input.externalRole.title.trim(),
          UnitId: null,
          Level: "L3",
          IsHead: false,
          IsExternal: true,
          ExternalUnit: input.externalRole.subUnit.trim(),
          EstablishmentRank: null,
          EstablishmentVocation: null,
          StandardTenureMonths: null,
          IsVacant: true,
          Specialisation: null,
          IsActive: true,
        });
      }
      if (roleId == null) throw new Error("Role is required");

      // Invariant 1: demote existing Current on this role
      if (input.status === "Current") {
        const postings = await dataAccess.getPostings();
        const handoffDate = input.startDate ?? todayIso();
        const toDemote = findCurrentsToDemote(postings, roleId);
        for (const p of toDemote) {
          await dataAccess.updatePosting(p.Id, {
            Status: "Past",
            EndDate: handoffDate,
          });
        }
      }

      // Synthesize a Title for the posting (SP requires it)
      const [allInd, allRoles] = await Promise.all([
        dataAccess.getIndividuals(),
        dataAccess.getRoles(),
      ]);
      const ind = allInd.find((i) => i.Id === individualId);
      const role = allRoles.find((r) => r.Id === roleId);
      const title = `${ind?.Title ?? "?"} → ${role?.Title ?? "?"}`;

      await dataAccess.createPosting({
        Title: title,
        IndividualId: individualId,
        RoleId: roleId,
        Status: input.status,
        StartDate: input.startDate,
        EndDate: endDate,
        Notes: input.notes?.trim() || null,
      });

      // Invariant 4: re-derive isVacant
      const postings = await dataAccess.getPostings();
      const isVacant = computeRoleVacancy(postings, roleId);
      await dataAccess.updateRole(roleId, { IsVacant: isVacant });
    },
    onSuccess: () =>
      invalidate(POSTINGS_KEY, ROLES_KEY, INDIVIDUALS_KEY),
  });
}

export type UpdatePostingInput = {
  id: number;
  status: PostingStatus;
  startDate: string | null;
  endDate: string | null;
  notes?: string | null;
};

export function useUpdatePosting() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: UpdatePostingInput) => {
      const endDate =
        input.status === "Current" ? null : input.endDate;

      const dateError = validatePostingDates(
        input.status,
        input.startDate,
        endDate,
      );
      if (dateError) throw new Error(dateError);

      const allPostings = await dataAccess.getPostings();
      const existing = allPostings.find((p) => p.Id === input.id);
      if (!existing) throw new Error("Posting not found");

      // Invariant 1: if transitioning into Current, demote any other Current
      if (input.status === "Current" && existing.Status !== "Current") {
        const handoffDate = input.startDate ?? todayIso();
        const toDemote = findCurrentsToDemote(
          allPostings,
          existing.RoleId,
          input.id,
        );
        for (const p of toDemote) {
          await dataAccess.updatePosting(p.Id, {
            Status: "Past",
            EndDate: handoffDate,
          });
        }
      }

      await dataAccess.updatePosting(input.id, {
        Status: input.status,
        StartDate: input.startDate,
        EndDate: endDate,
        Notes: input.notes?.trim() || null,
      });

      // Invariant 4: if status changed, re-derive isVacant
      if (existing.Status !== input.status) {
        const fresh = await dataAccess.getPostings();
        const isVacant = computeRoleVacancy(fresh, existing.RoleId);
        await dataAccess.updateRole(existing.RoleId, { IsVacant: isVacant });
      }
    },
    onSuccess: () => invalidate(POSTINGS_KEY, ROLES_KEY),
  });
}

export function useDeletePosting() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: number) => {
      const allPostings = await dataAccess.getPostings();
      const existing = allPostings.find((p) => p.Id === id);

      await dataAccess.deletePosting(id);

      // Invariant 4: if the deleted posting was Current, re-derive vacancy
      if (existing && existing.Status === "Current") {
        const fresh = await dataAccess.getPostings();
        const isVacant = computeRoleVacancy(fresh, existing.RoleId, id);
        await dataAccess.updateRole(existing.RoleId, { IsVacant: isVacant });
      }
    },
    onSuccess: () => invalidate(POSTINGS_KEY, ROLES_KEY),
  });
}

// ─── ROA Courses (admin-managed catalogue) ──────────────────────────────────

export type RoaCourseInput = {
  /** course code, e.g. "MDEC" */
  title: string;
  label: string;
  profiles: Profile[];
  displayOrder: number;
  isActive: boolean;
};

export function useCreateRoaCourse() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: RoaCourseInput) => {
      if (!input.title.trim()) throw new Error("Course code is required");
      if (!input.label.trim()) throw new Error("Course label is required");
      // Uniqueness check on Title (course code)
      const existing = await dataAccess.getRoaCourses();
      if (existing.some((c) => c.Title.toLowerCase() === input.title.trim().toLowerCase())) {
        throw new Error(`Course code "${input.title}" already exists`);
      }
      await dataAccess.createRoaCourse({
        Title: input.title.trim(),
        Label: input.label.trim(),
        Profiles: { results: input.profiles },
        DisplayOrder: input.displayOrder,
        IsActive: input.isActive,
      });
    },
    onSuccess: () => invalidate(ROA_COURSES_KEY),
  });
}

export function useUpdateRoaCourse() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async ({ id, input }: { id: number; input: Partial<RoaCourseInput> }) => {
      const patch: Parameters<typeof dataAccess.updateRoaCourse>[1] = {};
      if (input.title != null) patch.Title = input.title.trim();
      if (input.label != null) patch.Label = input.label.trim();
      if (input.profiles != null) patch.Profiles = { results: input.profiles };
      if (input.displayOrder != null) patch.DisplayOrder = input.displayOrder;
      if (input.isActive != null) patch.IsActive = input.isActive;
      await dataAccess.updateRoaCourse(id, patch);
    },
    onSuccess: () => invalidate(ROA_COURSES_KEY),
  });
}

export function useDeleteRoaCourse() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: number) => {
      // FK guard: if attendance rows reference this course, soft-delete
      // (set IsActive=false). Hard-delete only when there are no references.
      const refs = await dataAccess.getCourseAttendance();
      const hasRefs = refs.some((r) => r.CourseId === id);
      if (hasRefs) {
        await dataAccess.updateRoaCourse(id, { IsActive: false });
      } else {
        await dataAccess.deleteRoaCourse(id);
      }
    },
    onSuccess: () => invalidate(ROA_COURSES_KEY, COURSE_ATTENDANCE_KEY),
  });
}

// ─── Course Attendance (upsert by individual + course) ──────────────────────

export type AttendanceInput = {
  individualId: number;
  courseId: number;
  status: RoaStatus;
  date: string | null;
};

/**
 * Upsert one (individual, course) attendance row. The app-level invariant
 * is "at most one row per pair" — this hook checks for an existing row and
 * either updates it or inserts a new one.
 *
 * If status is NotPlanned and no row exists, this is a no-op (saves an empty
 * write). If status is NotPlanned and a row DOES exist, the row is deleted
 * (cleaner than carrying around explicit-NotPlanned rows).
 */
export function useUpsertAttendance() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: AttendanceInput) => {
      const all = await dataAccess.getCourseAttendance();
      const existing = all.find(
        (a) => a.IndividualId === input.individualId && a.CourseId === input.courseId,
      );

      if (input.status === "NotPlanned") {
        if (existing) await dataAccess.deleteCourseAttendance(existing.Id);
        return;
      }

      // Compose a friendly Title for SP views
      const individuals = await dataAccess.getIndividuals();
      const courses = await dataAccess.getRoaCourses();
      const ind = individuals.find((i) => i.Id === input.individualId);
      const course = courses.find((c) => c.Id === input.courseId);
      const title = `${formatName(ind?.Rank, ind?.Title ?? "?")} · ${course?.Title ?? "?"}`;

      if (existing) {
        await dataAccess.updateCourseAttendance(existing.Id, {
          Status: input.status,
          Date: input.date,
        });
      } else {
        await dataAccess.createCourseAttendance({
          Title: title,
          IndividualId: input.individualId,
          CourseId: input.courseId,
          Status: input.status,
          Date: input.date,
        });
      }
    },
    onSuccess: () => invalidate(COURSE_ATTENDANCE_KEY),
  });
}

export function useDeleteAttendance() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (id: number) => dataAccess.deleteCourseAttendance(id),
    onSuccess: () => invalidate(COURSE_ATTENDANCE_KEY),
  });
}

// ─── Progression (upsert by individual) ─────────────────────────────────────

export type ProgressionInput = {
  individualId: number;
  mascLevel: number | null;
  dateOfExpertise: string | null;
  emfRemarks: string | null;
  track: CompetencyTrack | null;
  rLevel: RLevel | null;
  rLevelRemarks: string | null;
  coursesRemarks: string | null;
};

/**
 * Upsert the progression row for one individual. Invariant: at most one row
 * per individual.
 */
export function useUpsertProgression() {
  const invalidate = useInvalidate();
  return useMutation({
    mutationFn: async (input: ProgressionInput) => {
      const all = await dataAccess.getProgression();
      const existing = all.find((p) => p.IndividualId === input.individualId);

      const individuals = await dataAccess.getIndividuals();
      const ind = individuals.find((i) => i.Id === input.individualId);
      const title = `${formatName(ind?.Rank, ind?.Title ?? "?")} — progression`;

      const body = {
        Title: title,
        IndividualId: input.individualId,
        MASCLevel: input.mascLevel,
        DateOfExpertise: input.dateOfExpertise,
        EMFRemarks: input.emfRemarks,
        Track: input.track,
        RLevel: input.rLevel,
        RLevelRemarks: input.rLevelRemarks,
        CoursesRemarks: input.coursesRemarks,
      };

      if (existing) {
        await dataAccess.updateProgression(existing.Id, body);
      } else {
        await dataAccess.createProgression(body);
      }
    },
    onSuccess: () => invalidate(PROGRESSION_KEY),
  });
}
