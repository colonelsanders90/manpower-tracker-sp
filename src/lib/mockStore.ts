// In-memory mutable mock store for dev mode. Tree-shaken in prod.
//
// Mirrors the SP REST shape so the data-access layer can fork on
// import.meta.env.DEV and call into either this store or the live REST API
// without the rest of the app caring.
//
// Mutations are persisted to localStorage so data survives page reloads
// during local development. Call mockStore.reset() to wipe back to seed data.

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

// ─── localStorage persistence helpers ───────────────────────────────────────

const LS_KEYS = {
  units: "mock_units",
  roles: "mock_roles",
  individuals: "mock_individuals",
  postings: "mock_postings",
  nextId: "mock_next_id",
};

function lsGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function lsSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Quota exceeded or private-browsing restriction — silently ignore.
  }
}

function lsClear(): void {
  Object.values(LS_KEYS).forEach((k) => localStorage.removeItem(k));
}

// ─── Initial state — prefer localStorage, fall back to seed data ─────────────

let units: UnitListItem[] = lsGet(LS_KEYS.units, MOCK_UNITS.map((u) => ({ ...u })));
let roles: RoleListItem[] = lsGet(LS_KEYS.roles, MOCK_ROLES.map((r) => ({ ...r })));
let individuals: IndividualListItem[] = lsGet(LS_KEYS.individuals, MOCK_INDIVIDUALS.map((i) => ({ ...i })));
let postings: PostingListItem[] = lsGet(LS_KEYS.postings, MOCK_POSTINGS.map((p) => ({ ...p })));

let nextId: number = lsGet(LS_KEYS.nextId, 1000);

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
  /** Reset every list back to the seed data and clear localStorage. */
  reset(): void {
    units = MOCK_UNITS.map((u) => ({ ...u }));
    roles = MOCK_ROLES.map((r) => ({ ...r }));
    individuals = MOCK_INDIVIDUALS.map((i) => ({ ...i }));
    postings = MOCK_POSTINGS.map((p) => ({ ...p }));
    nextId = 1000;
    lsClear();
  },

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
    lsSet(LS_KEYS.units, units);
    lsSet(LS_KEYS.nextId, nextId);
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
    lsSet(LS_KEYS.units, units);
  },
  deleteUnit(id: number): void {
    units = units.filter((u) => u.Id !== id);
    lsSet(LS_KEYS.units, units);
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
    lsSet(LS_KEYS.roles, roles);
    lsSet(LS_KEYS.nextId, nextId);
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
    lsSet(LS_KEYS.roles, roles);
  },
  deleteRole(id: number): void {
    roles = roles.filter((r) => r.Id !== id);
    lsSet(LS_KEYS.roles, roles);
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
    lsSet(LS_KEYS.individuals, individuals);
    lsSet(LS_KEYS.nextId, nextId);
    return id;
  },
  updateIndividual(
    id: number,
    patch: Partial<Omit<IndividualListItemWrite, "__metadata">>,
  ): void {
    individuals = individuals.map((i) =>
      i.Id === id ? { ...i, ...patch, Modified: NOW() } : i,
    );
    lsSet(LS_KEYS.individuals, individuals);
  },
  deleteIndividual(id: number): void {
    individuals = individuals.filter((i) => i.Id !== id);
    lsSet(LS_KEYS.individuals, individuals);
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
    lsSet(LS_KEYS.postings, postings);
    lsSet(LS_KEYS.nextId, nextId);
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
    lsSet(LS_KEYS.postings, postings);
  },
  deletePosting(id: number): void {
    postings = postings.filter((p) => p.Id !== id);
    lsSet(LS_KEYS.postings, postings);
  },
};
