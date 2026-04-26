// In-memory mutable mock store for dev mode. Tree-shaken in prod.
//
// Mirrors the SP REST shape so the data-access layer can fork on
// import.meta.env.DEV and call into either this store or the live REST API
// without the rest of the app caring.
//
// Initial data is seeded from mockData.ts on module load. Mutations modify
// the arrays in place. Survives HMR within a single tab session.

import type { UnitListItem, UnitListItemWrite } from "@/types/units";
import type { RoleListItem, RoleListItemWrite } from "@/types/roles";
import type {
  IndividualListItem,
  IndividualListItemWrite,
} from "@/types/individuals";
import type { PostingListItem, PostingListItemWrite } from "@/types/postings";
import type { SPLookup } from "@/types/base";
import {
  MOCK_UNITS,
  MOCK_ROLES,
  MOCK_INDIVIDUALS,
  MOCK_POSTINGS,
} from "./mockData";

let units: UnitListItem[] = MOCK_UNITS.map((u) => ({ ...u }));
let roles: RoleListItem[] = MOCK_ROLES.map((r) => ({ ...r }));
let individuals: IndividualListItem[] = MOCK_INDIVIDUALS.map((i) => ({ ...i }));
let postings: PostingListItem[] = MOCK_POSTINGS.map((p) => ({ ...p }));

let nextId = 1000;
const NOW = () => new Date().toISOString();
const STAFF = { Title: "Mock Author" };

function nextLookupTitle<T extends { Id: number; Title: string }>(
  list: T[],
  id: number,
): SPLookup | null {
  const found = list.find((x) => x.Id === id);
  return found ? { Id: found.Id, Title: found.Title } : null;
}

export const mockStore = {
  getUnits: () => [...units],
  getRoles: () => [...roles],
  getIndividuals: () => [...individuals],
  getPostings: () => [...postings],

  // ─── UNITS ──────────────────────────────────────────────────────────────────
  createUnit(data: Omit<UnitListItemWrite, "__metadata">): number {
    const id = nextId++;
    const u: UnitListItem = {
      Id: id,
      Title: data.Title,
      Code: data.Code,
      Level: data.Level,
      ParentUnitId: data.ParentUnitId,
      ParentUnit:
        data.ParentUnitId != null
          ? nextLookupTitle(units, data.ParentUnitId)
          : null,
      Description: data.Description,
      IsActive: data.IsActive,
      Created: NOW(),
      Modified: NOW(),
      Author: STAFF,
      Editor: STAFF,
    };
    units = [...units, u];
    return id;
  },
  updateUnit(
    id: number,
    patch: Partial<Omit<UnitListItemWrite, "__metadata">>,
  ): void {
    units = units.map((u) =>
      u.Id === id
        ? {
            ...u,
            ...patch,
            ParentUnit:
              "ParentUnitId" in patch
                ? patch.ParentUnitId != null
                  ? nextLookupTitle(units, patch.ParentUnitId)
                  : null
                : u.ParentUnit,
            Modified: NOW(),
          }
        : u,
    );
  },
  deleteUnit(id: number): void {
    units = units.filter((u) => u.Id !== id);
  },

  // ─── ROLES ──────────────────────────────────────────────────────────────────
  createRole(data: Omit<RoleListItemWrite, "__metadata">): number {
    const id = nextId++;
    const r: RoleListItem = {
      Id: id,
      Title: data.Title,
      UnitId: data.UnitId,
      Unit: data.UnitId != null ? nextLookupTitle(units, data.UnitId) : null,
      Level: data.Level,
      IsHead: data.IsHead,
      IsExternal: data.IsExternal,
      ExternalUnit: data.ExternalUnit,
      EstablishmentRank: data.EstablishmentRank,
      EstablishmentVocation: data.EstablishmentVocation,
      StandardTenureMonths: data.StandardTenureMonths,
      IsVacant: data.IsVacant,
      Specialisation: data.Specialisation,
      IsActive: data.IsActive,
      Created: NOW(),
      Modified: NOW(),
      Author: STAFF,
      Editor: STAFF,
    };
    roles = [...roles, r];
    return id;
  },
  updateRole(
    id: number,
    patch: Partial<Omit<RoleListItemWrite, "__metadata">>,
  ): void {
    roles = roles.map((r) =>
      r.Id === id
        ? {
            ...r,
            ...patch,
            Unit:
              "UnitId" in patch
                ? patch.UnitId != null
                  ? nextLookupTitle(units, patch.UnitId)
                  : null
                : r.Unit,
            Modified: NOW(),
          }
        : r,
    );
  },
  deleteRole(id: number): void {
    roles = roles.filter((r) => r.Id !== id);
  },

  // ─── INDIVIDUALS ────────────────────────────────────────────────────────────
  createIndividual(
    data: Omit<IndividualListItemWrite, "__metadata">,
  ): number {
    const id = nextId++;
    const i: IndividualListItem = {
      Id: id,
      Title: data.Title,
      EmployeeId: data.EmployeeId,
      Rank: data.Rank,
      Specialisation: data.Specialisation,
      Email: data.Email,
      IsExternal: data.IsExternal,
      IsActive: data.IsActive,
      Created: NOW(),
      Modified: NOW(),
      Author: STAFF,
      Editor: STAFF,
    };
    individuals = [...individuals, i];
    return id;
  },
  updateIndividual(
    id: number,
    patch: Partial<Omit<IndividualListItemWrite, "__metadata">>,
  ): void {
    individuals = individuals.map((i) =>
      i.Id === id ? { ...i, ...patch, Modified: NOW() } : i,
    );
  },
  deleteIndividual(id: number): void {
    individuals = individuals.filter((i) => i.Id !== id);
  },

  // ─── POSTINGS ───────────────────────────────────────────────────────────────
  createPosting(data: Omit<PostingListItemWrite, "__metadata">): number {
    const id = nextId++;
    const p: PostingListItem = {
      Id: id,
      Title: data.Title,
      IndividualId: data.IndividualId,
      Individual: nextLookupTitle(individuals, data.IndividualId) ?? {
        Id: data.IndividualId,
        Title: "?",
      },
      RoleId: data.RoleId,
      Role: nextLookupTitle(roles, data.RoleId) ?? {
        Id: data.RoleId,
        Title: "?",
      },
      Status: data.Status,
      StartDate: data.StartDate,
      EndDate: data.EndDate,
      Notes: data.Notes,
      Created: NOW(),
      Modified: NOW(),
      Author: STAFF,
      Editor: STAFF,
    };
    postings = [...postings, p];
    return id;
  },
  updatePosting(
    id: number,
    patch: Partial<Omit<PostingListItemWrite, "__metadata">>,
  ): void {
    postings = postings.map((p) =>
      p.Id === id
        ? {
            ...p,
            ...patch,
            Individual:
              "IndividualId" in patch && patch.IndividualId != null
                ? (nextLookupTitle(individuals, patch.IndividualId) ??
                  p.Individual)
                : p.Individual,
            Role:
              "RoleId" in patch && patch.RoleId != null
                ? (nextLookupTitle(roles, patch.RoleId) ?? p.Role)
                : p.Role,
            Modified: NOW(),
          }
        : p,
    );
  },
  deletePosting(id: number): void {
    postings = postings.filter((p) => p.Id !== id);
  },
};
