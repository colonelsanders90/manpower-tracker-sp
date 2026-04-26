// Dev-only mock data so the app shows something useful when JSOM/SP REST
// aren't available. The hooks in src/hooks/ branch on import.meta.env.DEV
// and use these instead of hitting SP. In prod this module is tree-shakable
// via Vite — DEV branches are dead code in a build.
//
// Mirror of the Next.js prototype's seed for consistency. SP-shape only:
// every record has the SP-style Id, Title, etc. (uppercase first letter).

import type { UnitListItem } from "@/types/units";
import type { RoleListItem } from "@/types/roles";
import type { IndividualListItem } from "@/types/individuals";
import type { PostingListItem } from "@/types/postings";
import type { SPLookup } from "@/types/base";

const NOW = "2026-04-26T00:00:00Z";
const STAFF = { Title: "Mock Author" };
const lookup = (id: number, title: string): SPLookup => ({ Id: id, Title: title });

// ─── UNITS ────────────────────────────────────────────────────────────────────

export const MOCK_UNITS: UnitListItem[] = [
  // L1
  {
    Id: 1, Title: "RAiD", Code: "RAID", Level: "L1",
    ParentUnit: null, ParentUnitId: null,
    Description: null, IsActive: true,
    Created: NOW, Modified: NOW, Author: STAFF, Editor: STAFF,
  },
  // L2 — 9 branches
  ...[
    "P4B", "Corporate Svcs", "SWiFT", "CyDef",
    "RSAF Data Office", "Mission Data", "A3", "Cloud", "IKC2",
  ].map((name, i): UnitListItem => ({
    Id: 2 + i, Title: name, Code: null, Level: "L2",
    ParentUnit: lookup(1, "RAiD"), ParentUnitId: 1,
    Description: null, IsActive: true,
    Created: NOW, Modified: NOW, Author: STAFF, Editor: STAFF,
  })),
];

// ─── ROLES ────────────────────────────────────────────────────────────────────

const HD_RAID_ID = 1;
const branchHeadIds: Record<string, number> = {};
let nextRoleId = 1;

const branchUnits = MOCK_UNITS.filter((u) => u.Level === "L2");

const headRoles: RoleListItem[] = [
  // Hd RAiD
  {
    Id: HD_RAID_ID, Title: "Hd RAiD",
    Unit: lookup(1, "RAiD"), UnitId: 1, Level: "L1",
    IsHead: true, IsExternal: false, ExternalUnit: null,
    EstablishmentRank: null, EstablishmentVocation: null,
    StandardTenureMonths: 36, IsVacant: false,
    Specialisation: null, IsActive: true,
    Created: NOW, Modified: NOW, Author: STAFF, Editor: STAFF,
  },
];
nextRoleId = 2;

// Branch heads
const branchHeadTitles: Record<string, string> = {
  "P4B": "Hd P4B / Dy Hd RAiD",
  "Corporate Svcs": "Hd Corporate Svcs Br",
  "SWiFT": "Hd SWiFT",
  "CyDef": "Hd CyDef",
  "RSAF Data Office": "Hd RSAF Data Office",
  "Mission Data": "Hd Mission Data",
  "A3": "Hd A3",
  "Cloud": "Hd Cloud",
  "IKC2": "Hd IKC2",
};

for (const u of branchUnits) {
  const id = nextRoleId++;
  branchHeadIds[u.Title] = id;
  headRoles.push({
    Id: id, Title: branchHeadTitles[u.Title] ?? `Hd ${u.Title}`,
    Unit: lookup(u.Id, u.Title), UnitId: u.Id, Level: "L2",
    IsHead: true, IsExternal: false, ExternalUnit: null,
    EstablishmentRank: null, EstablishmentVocation: null,
    StandardTenureMonths: 30, IsVacant: false,
    Specialisation: null, IsActive: true,
    Created: NOW, Modified: NOW, Author: STAFF, Editor: STAFF,
  });
}

// A few illustrative L3 roles
const cyDef = branchUnits.find((u) => u.Title === "CyDef")!;
const cloud = branchUnits.find((u) => u.Title === "Cloud")!;
const swift = branchUnits.find((u) => u.Title === "SWiFT")!;
const mission = branchUnits.find((u) => u.Title === "Mission Data")!;

const CYBER_ENG_ID = nextRoleId++;
const CYBER_ANA_ID = nextRoleId++;
const CLOUD_ENG_ID = nextRoleId++;
const SW_ENG_ID = nextRoleId++;
const DATA_ANA_ID = nextRoleId++;

const l3Roles: RoleListItem[] = [
  {
    Id: CYBER_ENG_ID, Title: "Cyber Engineer",
    Unit: lookup(cyDef.Id, cyDef.Title), UnitId: cyDef.Id, Level: "L3",
    IsHead: false, IsExternal: false, ExternalUnit: null,
    EstablishmentRank: null, EstablishmentVocation: null,
    StandardTenureMonths: 24, IsVacant: false,
    Specialisation: "Cyber", IsActive: true,
    Created: NOW, Modified: NOW, Author: STAFF, Editor: STAFF,
  },
  {
    Id: CYBER_ANA_ID, Title: "Cyber Analyst",
    Unit: lookup(cyDef.Id, cyDef.Title), UnitId: cyDef.Id, Level: "L3",
    IsHead: false, IsExternal: false, ExternalUnit: null,
    EstablishmentRank: null, EstablishmentVocation: null,
    StandardTenureMonths: 24, IsVacant: true,
    Specialisation: "Cyber", IsActive: true,
    Created: NOW, Modified: NOW, Author: STAFF, Editor: STAFF,
  },
  {
    Id: CLOUD_ENG_ID, Title: "Cloud Engineer",
    Unit: lookup(cloud.Id, cloud.Title), UnitId: cloud.Id, Level: "L3",
    IsHead: false, IsExternal: false, ExternalUnit: null,
    EstablishmentRank: null, EstablishmentVocation: null,
    StandardTenureMonths: 24, IsVacant: false,
    Specialisation: "Cloud", IsActive: true,
    Created: NOW, Modified: NOW, Author: STAFF, Editor: STAFF,
  },
  {
    Id: SW_ENG_ID, Title: "Software Engineer",
    Unit: lookup(swift.Id, swift.Title), UnitId: swift.Id, Level: "L3",
    IsHead: false, IsExternal: false, ExternalUnit: null,
    EstablishmentRank: null, EstablishmentVocation: null,
    StandardTenureMonths: 24, IsVacant: false,
    Specialisation: "Software Engineering", IsActive: true,
    Created: NOW, Modified: NOW, Author: STAFF, Editor: STAFF,
  },
  {
    Id: DATA_ANA_ID, Title: "Data Analyst",
    Unit: lookup(mission.Id, mission.Title), UnitId: mission.Id, Level: "L3",
    IsHead: false, IsExternal: false, ExternalUnit: null,
    EstablishmentRank: null, EstablishmentVocation: null,
    StandardTenureMonths: 24, IsVacant: false,
    Specialisation: "Data", IsActive: true,
    Created: NOW, Modified: NOW, Author: STAFF, Editor: STAFF,
  },
];

export const MOCK_ROLES: RoleListItem[] = [...headRoles, ...l3Roles];

// ─── INDIVIDUALS ──────────────────────────────────────────────────────────────

export const MOCK_INDIVIDUALS: IndividualListItem[] = [
  ["Col Tan Wei Ming", "COL", "Software Engineering", "E1001"],
  ["LTC Siti Aminah", "LTC", "Software Engineering", "E1002"],
  ["LTC Raj Kumar", "LTC", "Cyber", "E1003"],
  ["LTC Wong Hui", "LTC", "Cloud", "E1004"],
  ["MAJ Jane Lim", "MAJ", "Software Engineering", "E1005"],
  ["MAJ Alex Chua", "MAJ", "Data", "E1006"],
  ["CPT Daniel Ong", "CPT", "Cyber", "E1007"],
  ["CPT Priya Nair", "CPT", "Cyber", "E1008"],
  ["CPT Marcus Teo", "CPT", "Software Engineering", "E1009"],
].map(([name, rank, spec, eid], i): IndividualListItem => ({
  Id: i + 1, Title: name,
  Rank: rank, Specialisation: spec, EmployeeId: eid,
  Email: null, IsExternal: false, IsActive: true,
  Created: NOW, Modified: NOW, Author: STAFF, Editor: STAFF,
}));

// ─── POSTINGS ─────────────────────────────────────────────────────────────────

const indById = (id: number) => MOCK_INDIVIDUALS.find((p) => p.Id === id)!;
const roleById = (id: number) => MOCK_ROLES.find((r) => r.Id === id)!;

const TAN = 1, SITI = 2, RAJ = 3, WONG = 4, JANE = 5, ALEX = 6,
  DANIEL = 7, PRIYA = 8, MARCUS = 9;

const rawPostings: Array<{
  i: number; r: number;
  Status: PostingListItem["Status"];
  StartDate: string | null;
  EndDate: string | null;
  Notes?: string;
}> = [
  { i: TAN, r: HD_RAID_ID, Status: "Current", StartDate: "2024-01-01", EndDate: "2026-12-31" },
  { i: SITI, r: branchHeadIds["P4B"], Status: "Current", StartDate: "2024-01-01", EndDate: "2026-06-30" },
  { i: SITI, r: HD_RAID_ID, Status: "Candidate", StartDate: "2026-07-01", EndDate: "2029-06-30",
    Notes: "Strong succession candidate; pending COL promotion. Q3 2026 take-over." },
  { i: RAJ, r: branchHeadIds["CyDef"], Status: "Current", StartDate: "2023-06-01", EndDate: "2026-05-31" },
  { i: DANIEL, r: CYBER_ENG_ID, Status: "Current", StartDate: "2024-01-01", EndDate: "2026-12-31" },
  { i: PRIYA, r: CYBER_ANA_ID, Status: "Candidate", StartDate: "2026-07-01", EndDate: "2028-06-30",
    Notes: "Natural rotation. Q3 2026 take-over." },
  { i: PRIYA, r: CYBER_ENG_ID, Status: "Past", StartDate: "2022-01-01", EndDate: "2023-12-31",
    Notes: "First tour." },
  { i: WONG, r: branchHeadIds["Cloud"], Status: "Current", StartDate: "2024-01-01", EndDate: "2026-12-31" },
  { i: MARCUS, r: CLOUD_ENG_ID, Status: "Candidate", StartDate: "2027-01-01", EndDate: "2028-12-31",
    Notes: "Cross-branch move from SWiFT being considered." },
  { i: JANE, r: SW_ENG_ID, Status: "Current", StartDate: "2024-01-01", EndDate: "2026-06-30" },
  { i: JANE, r: branchHeadIds["SWiFT"], Status: "Planned", StartDate: "2026-07-01", EndDate: "2028-12-31",
    Notes: "Approved succession." },
  { i: MARCUS, r: SW_ENG_ID, Status: "Past", StartDate: "2022-01-01", EndDate: "2023-12-31" },
  { i: ALEX, r: DATA_ANA_ID, Status: "Current", StartDate: "2024-06-01", EndDate: "2026-12-31" },
  { i: ALEX, r: branchHeadIds["Mission Data"], Status: "Candidate", StartDate: "2027-01-01", EndDate: "2029-12-31",
    Notes: "Earmarked for next cycle." },
];

export const MOCK_POSTINGS: PostingListItem[] = rawPostings.map((p, idx) => {
  const ind = indById(p.i);
  const role = roleById(p.r);
  return {
    Id: idx + 1,
    Title: `${ind.Title} → ${role.Title}`,
    Individual: lookup(ind.Id, ind.Title),
    IndividualId: ind.Id,
    Role: lookup(role.Id, role.Title),
    RoleId: role.Id,
    Status: p.Status,
    StartDate: p.StartDate,
    EndDate: p.EndDate,
    Notes: p.Notes ?? null,
    Created: NOW, Modified: NOW, Author: STAFF, Editor: STAFF,
  };
});
