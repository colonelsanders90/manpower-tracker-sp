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

// ─── Seed data ───────────────────────────────────────────────────────────────
// Static initial data used when localStorage is empty. Kept here (rather than
// a separate file) because it is only ever consumed by this module.

const _NOW = "2026-04-26T00:00:00Z";
const _STAFF = { Title: "Mock Author" };
const _lkp = (id: number, title: string): SPLookup => ({ Id: id, Title: title });

const MOCK_UNITS: UnitListItem[] = [
  // L1
  {
    Id: 1, Title: "RAiD", Code: "RAID", Level: "L1",
    ParentUnit: null, ParentUnitId: null,
    Description: null, IsActive: true,
    Created: _NOW, Modified: _NOW, Author: _STAFF, Editor: _STAFF,
  },
  // L2 branches
  ...[
    "P4B", "Corporate Svcs", "SWiFT", "CyDef",
    "RSAF Data Office", "Mission Data", "A3", "Cloud", "IKC2",
    "PPCOE", "Aether",
  ].map((name, i): UnitListItem => ({
    Id: 2 + i, Title: name, Code: null, Level: "L2",
    ParentUnit: _lkp(1, "RAiD"), ParentUnitId: 1,
    Description: null, IsActive: true,
    Created: _NOW, Modified: _NOW, Author: _STAFF, Editor: _STAFF,
  })),
];

const _branchUnits = MOCK_UNITS.filter((u) => u.Level === "L2");
let _nextRoleId = 1;

const _branchHeadTitles: Record<string, string> = {
  "P4B": "Hd P4B / Dy Hd RAiD",
  "Corporate Svcs": "Hd Corporate Svcs Br",
  "SWiFT": "Hd SWiFT",
  "CyDef": "Hd CyDef",
  "RSAF Data Office": "Hd RSAF Data Office",
  "Mission Data": "Hd Mission Data",
  "A3": "Hd A3",
  "Cloud": "Hd Cloud",
  "IKC2": "Hd IKC2",
  "PPCOE": "Hd PPCOE",
  "Aether": "Hd Aether",
};

// Hd RAiD (L1 head)
const HD_RAID_ID = _nextRoleId++;
const _headRoles: RoleListItem[] = [
  {
    Id: HD_RAID_ID, Title: "Hd RAiD",
    Unit: _lkp(1, "RAiD"), UnitId: 1, Level: "L1",
    IsHead: true, IsExternal: false, ExternalUnit: null,
    EstablishmentRank: null, EstablishmentVocation: null,
    StandardTenureMonths: 36, IsVacant: false,
    Specialisation: null, IsActive: true,
    Created: _NOW, Modified: _NOW, Author: _STAFF, Editor: _STAFF,
  },
];
const _branchHeadIds: Record<string, number> = {};
for (const u of _branchUnits) {
  const id = _nextRoleId++;
  _branchHeadIds[u.Title] = id;
  _headRoles.push({
    Id: id, Title: _branchHeadTitles[u.Title] ?? `Hd ${u.Title}`,
    Unit: _lkp(u.Id, u.Title), UnitId: u.Id, Level: "L2",
    IsHead: true, IsExternal: false, ExternalUnit: null,
    EstablishmentRank: null, EstablishmentVocation: null,
    StandardTenureMonths: 30, IsVacant: false,
    Specialisation: null, IsActive: true,
    Created: _NOW, Modified: _NOW, Author: _STAFF, Editor: _STAFF,
  });
}

const _cyDef = _branchUnits.find((u) => u.Title === "CyDef")!;
const _cloud = _branchUnits.find((u) => u.Title === "Cloud")!;
const _swift = _branchUnits.find((u) => u.Title === "SWiFT")!;
const _mission = _branchUnits.find((u) => u.Title === "Mission Data")!;

const CYBER_ENG_ID = _nextRoleId++;
const CYBER_ANA_ID = _nextRoleId++;
const CLOUD_ENG_ID = _nextRoleId++;
const SW_ENG_ID = _nextRoleId++;
const DATA_ANA_ID = _nextRoleId++;

const MOCK_ROLES: RoleListItem[] = [
  ..._headRoles,
  { Id: CYBER_ENG_ID, Title: "Cyber Engineer", Unit: _lkp(_cyDef.Id, _cyDef.Title), UnitId: _cyDef.Id, Level: "L3", IsHead: false, IsExternal: false, ExternalUnit: null, EstablishmentRank: null, EstablishmentVocation: null, StandardTenureMonths: 24, IsVacant: false, Specialisation: "Cyber", IsActive: true, Created: _NOW, Modified: _NOW, Author: _STAFF, Editor: _STAFF },
  { Id: CYBER_ANA_ID, Title: "Cyber Analyst", Unit: _lkp(_cyDef.Id, _cyDef.Title), UnitId: _cyDef.Id, Level: "L3", IsHead: false, IsExternal: false, ExternalUnit: null, EstablishmentRank: null, EstablishmentVocation: null, StandardTenureMonths: 24, IsVacant: true, Specialisation: "Cyber", IsActive: true, Created: _NOW, Modified: _NOW, Author: _STAFF, Editor: _STAFF },
  { Id: CLOUD_ENG_ID, Title: "Cloud Engineer", Unit: _lkp(_cloud.Id, _cloud.Title), UnitId: _cloud.Id, Level: "L3", IsHead: false, IsExternal: false, ExternalUnit: null, EstablishmentRank: null, EstablishmentVocation: null, StandardTenureMonths: 24, IsVacant: false, Specialisation: "Cloud", IsActive: true, Created: _NOW, Modified: _NOW, Author: _STAFF, Editor: _STAFF },
  { Id: SW_ENG_ID, Title: "Software Engineer", Unit: _lkp(_swift.Id, _swift.Title), UnitId: _swift.Id, Level: "L3", IsHead: false, IsExternal: false, ExternalUnit: null, EstablishmentRank: null, EstablishmentVocation: null, StandardTenureMonths: 24, IsVacant: false, Specialisation: "Software Engineering", IsActive: true, Created: _NOW, Modified: _NOW, Author: _STAFF, Editor: _STAFF },
  { Id: DATA_ANA_ID, Title: "Data Analyst", Unit: _lkp(_mission.Id, _mission.Title), UnitId: _mission.Id, Level: "L3", IsHead: false, IsExternal: false, ExternalUnit: null, EstablishmentRank: null, EstablishmentVocation: null, StandardTenureMonths: 24, IsVacant: false, Specialisation: "Data", IsActive: true, Created: _NOW, Modified: _NOW, Author: _STAFF, Editor: _STAFF },
];

const MOCK_INDIVIDUALS: IndividualListItem[] = (
  [
    ["Col Tan Wei Ming", "COL", "Software Engineering", "E1001"],
    ["LTC Siti Aminah",  "LTC", "Software Engineering", "E1002"],
    ["LTC Raj Kumar",    "LTC", "Cyber",                "E1003"],
    ["LTC Wong Hui",     "LTC", "Cloud",                "E1004"],
    ["MAJ Jane Lim",     "MAJ", "Software Engineering", "E1005"],
    ["MAJ Alex Chua",    "MAJ", "Data",                 "E1006"],
    ["CPT Daniel Ong",   "CPT", "Cyber",                "E1007"],
    ["CPT Priya Nair",   "CPT", "Cyber",                "E1008"],
    ["CPT Marcus Teo",   "CPT", "Software Engineering", "E1009"],
  ] as [string, string, string, string][]
).map(([name, rank, spec, eid], i): IndividualListItem => ({
  Id: i + 1, Title: name,
  Rank: rank, Specialisation: spec, EmployeeId: eid,
  Email: null, IsExternal: false, IsActive: true,
  Created: _NOW, Modified: _NOW, Author: _STAFF, Editor: _STAFF,
}));

const _ind = (id: number) => MOCK_INDIVIDUALS.find((p) => p.Id === id)!;
const _role = (id: number) => MOCK_ROLES.find((r) => r.Id === id)!;

const [TAN, SITI, RAJ, WONG, JANE, ALEX, DANIEL, PRIYA, MARCUS] =
  MOCK_INDIVIDUALS.map((i) => i.Id);

const MOCK_POSTINGS: PostingListItem[] = (
  [
    { i: TAN,    r: HD_RAID_ID,                         Status: "Current",   StartDate: "2024-01-01", EndDate: "2026-12-31", Notes: null },
    { i: SITI,   r: _branchHeadIds["P4B"],              Status: "Current",   StartDate: "2024-01-01", EndDate: "2026-06-30", Notes: null },
    { i: SITI,   r: HD_RAID_ID,                         Status: "Candidate", StartDate: "2026-07-01", EndDate: "2029-06-30", Notes: "Strong succession candidate; pending COL promotion. Q3 2026 take-over." },
    { i: RAJ,    r: _branchHeadIds["CyDef"],            Status: "Current",   StartDate: "2023-06-01", EndDate: "2026-05-31", Notes: null },
    { i: DANIEL, r: CYBER_ENG_ID,                       Status: "Current",   StartDate: "2024-01-01", EndDate: "2026-12-31", Notes: null },
    { i: PRIYA,  r: CYBER_ANA_ID,                       Status: "Candidate", StartDate: "2026-07-01", EndDate: "2028-06-30", Notes: "Natural rotation. Q3 2026 take-over." },
    { i: PRIYA,  r: CYBER_ENG_ID,                       Status: "Past",      StartDate: "2022-01-01", EndDate: "2023-12-31", Notes: "First tour." },
    { i: WONG,   r: _branchHeadIds["Cloud"],            Status: "Current",   StartDate: "2024-01-01", EndDate: "2026-12-31", Notes: null },
    { i: MARCUS, r: CLOUD_ENG_ID,                       Status: "Candidate", StartDate: "2027-01-01", EndDate: "2028-12-31", Notes: "Cross-branch move from SWiFT being considered." },
    { i: JANE,   r: SW_ENG_ID,                          Status: "Current",   StartDate: "2024-01-01", EndDate: "2026-06-30", Notes: null },
    { i: JANE,   r: _branchHeadIds["SWiFT"],            Status: "Planned",   StartDate: "2026-07-01", EndDate: "2028-12-31", Notes: "Approved succession." },
    { i: MARCUS, r: SW_ENG_ID,                          Status: "Past",      StartDate: "2022-01-01", EndDate: "2023-12-31", Notes: null },
    { i: ALEX,   r: DATA_ANA_ID,                        Status: "Current",   StartDate: "2024-06-01", EndDate: "2026-12-31", Notes: null },
    { i: ALEX,   r: _branchHeadIds["Mission Data"],     Status: "Candidate", StartDate: "2027-01-01", EndDate: "2029-12-31", Notes: "Earmarked for next cycle." },
  ] as Array<{ i: number; r: number; Status: PostingListItem["Status"]; StartDate: string | null; EndDate: string | null; Notes: string | null }>
).map((p, idx): PostingListItem => {
  const ind = _ind(p.i);
  const role = _role(p.r);
  return {
    Id: idx + 1,
    Title: `${ind.Title} → ${role.Title}`,
    Individual: _lkp(ind.Id, ind.Title), IndividualId: ind.Id,
    Role: _lkp(role.Id, role.Title),     RoleId: role.Id,
    Status: p.Status, StartDate: p.StartDate, EndDate: p.EndDate, Notes: p.Notes,
    Created: _NOW, Modified: _NOW, Author: _STAFF, Editor: _STAFF,
  };
});


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
