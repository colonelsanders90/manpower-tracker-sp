// Data-access layer — single seam between the app's mutation logic and the
// underlying store. In dev this hits the in-memory mockStore so HR can click
// through CRUD without a SharePoint server. In prod it hits SP REST via
// sharepoint.ts.
//
// Lookup fields are written by id (e.g. UnitId) and read with $expand so the
// app code sees { Id, Title } pairs.

import { spGetAll, spPost, spUpdate, spDelete } from "./sharepoint";
import {
  UNITS_LIST,
  type UnitListItem,
  type UnitListItemWrite,
} from "@/types/units";
import {
  ROLES_LIST,
  type RoleListItem,
  type RoleListItemWrite,
} from "@/types/roles";
import {
  INDIVIDUALS_LIST,
  type IndividualListItem,
  type IndividualListItemWrite,
} from "@/types/individuals";
import {
  POSTINGS_LIST,
  type PostingListItem,
  type PostingListItemWrite,
} from "@/types/postings";
import { mockStore } from "./mockStore";

const IS_DEV = (import.meta.env.MODE !== 'production');

// ─── Read paths ────────────────────────────────────────────────────────────────

async function getUnits(): Promise<UnitListItem[]> {
  if (IS_DEV) return mockStore.getUnits();
  // SP 2013: $select=* is required alongside $expand, otherwise 400.
  return spGetAll<UnitListItem>(
    `/lists/getbytitle('${UNITS_LIST}')/items?$select=*,ParentUnit/Id,ParentUnit/Title&$expand=ParentUnit`,
  );
}

async function getRoles(): Promise<RoleListItem[]> {
  if (IS_DEV) return mockStore.getRoles();
  return spGetAll<RoleListItem>(
    `/lists/getbytitle('${ROLES_LIST}')/items?$select=*,Unit/Id,Unit/Title&$expand=Unit`,
  );
}

async function getIndividuals(): Promise<IndividualListItem[]> {
  if (IS_DEV) return mockStore.getIndividuals();
  return spGetAll<IndividualListItem>(
    `/lists/getbytitle('${INDIVIDUALS_LIST}')/items?$select=*`,
  );
}

async function getPostings(): Promise<PostingListItem[]> {
  if (IS_DEV) return mockStore.getPostings();
  return spGetAll<PostingListItem>(
    `/lists/getbytitle('${POSTINGS_LIST}')/items?$select=*,Individual/Id,Individual/Title,Role/Id,Role/Title&$expand=Individual,Role`,
  );
}

// ─── Write paths ──────────────────────────────────────────────────────────────

type Unit_Body = Omit<UnitListItemWrite, "__metadata">;
type Role_Body = Omit<RoleListItemWrite, "__metadata">;
type Individual_Body = Omit<IndividualListItemWrite, "__metadata">;
type Posting_Body = Omit<PostingListItemWrite, "__metadata">;

async function createUnit(data: Unit_Body): Promise<number> {
  if (IS_DEV) return mockStore.createUnit(data);
  const created = await spPost<{ Id: number }>(
    `/lists/getbytitle('${UNITS_LIST}')/items`,
    { ...data, __metadata: { type: "SP.Data.UNITSListItem" } },
  );
  return created.Id;
}

async function updateUnit(
  id: number,
  patch: Partial<Unit_Body>,
): Promise<void> {
  if (IS_DEV) return mockStore.updateUnit(id, patch);
  await spUpdate(`/lists/getbytitle('${UNITS_LIST}')/items(${id})`, {
    ...patch,
    __metadata: { type: "SP.Data.UNITSListItem" },
  });
}

async function deleteUnit(id: number): Promise<void> {
  if (IS_DEV) return mockStore.deleteUnit(id);
  await spDelete(`/lists/getbytitle('${UNITS_LIST}')/items(${id})`);
}

async function createRole(data: Role_Body): Promise<number> {
  if (IS_DEV) return mockStore.createRole(data);
  const created = await spPost<{ Id: number }>(
    `/lists/getbytitle('${ROLES_LIST}')/items`,
    { ...data, __metadata: { type: "SP.Data.ROLESListItem" } },
  );
  return created.Id;
}

async function updateRole(
  id: number,
  patch: Partial<Role_Body>,
): Promise<void> {
  if (IS_DEV) return mockStore.updateRole(id, patch);
  await spUpdate(`/lists/getbytitle('${ROLES_LIST}')/items(${id})`, {
    ...patch,
    __metadata: { type: "SP.Data.ROLESListItem" },
  });
}

async function deleteRole(id: number): Promise<void> {
  if (IS_DEV) return mockStore.deleteRole(id);
  await spDelete(`/lists/getbytitle('${ROLES_LIST}')/items(${id})`);
}

async function createIndividual(data: Individual_Body): Promise<number> {
  if (IS_DEV) return mockStore.createIndividual(data);
  const created = await spPost<{ Id: number }>(
    `/lists/getbytitle('${INDIVIDUALS_LIST}')/items`,
    { ...data, __metadata: { type: "SP.Data.INDIVIDUALSListItem" } },
  );
  return created.Id;
}

async function updateIndividual(
  id: number,
  patch: Partial<Individual_Body>,
): Promise<void> {
  if (IS_DEV) return mockStore.updateIndividual(id, patch);
  await spUpdate(`/lists/getbytitle('${INDIVIDUALS_LIST}')/items(${id})`, {
    ...patch,
    __metadata: { type: "SP.Data.INDIVIDUALSListItem" },
  });
}

async function deleteIndividual(id: number): Promise<void> {
  if (IS_DEV) return mockStore.deleteIndividual(id);
  await spDelete(`/lists/getbytitle('${INDIVIDUALS_LIST}')/items(${id})`);
}

async function createPosting(data: Posting_Body): Promise<number> {
  if (IS_DEV) return mockStore.createPosting(data);
  const created = await spPost<{ Id: number }>(
    `/lists/getbytitle('${POSTINGS_LIST}')/items`,
    { ...data, __metadata: { type: "SP.Data.POSTINGSListItem" } },
  );
  return created.Id;
}

async function updatePosting(
  id: number,
  patch: Partial<Posting_Body>,
): Promise<void> {
  if (IS_DEV) return mockStore.updatePosting(id, patch);
  await spUpdate(`/lists/getbytitle('${POSTINGS_LIST}')/items(${id})`, {
    ...patch,
    __metadata: { type: "SP.Data.POSTINGSListItem" },
  });
}

async function deletePosting(id: number): Promise<void> {
  if (IS_DEV) return mockStore.deletePosting(id);
  await spDelete(`/lists/getbytitle('${POSTINGS_LIST}')/items(${id})`);
}

export const dataAccess = {
  getUnits,
  getRoles,
  getIndividuals,
  getPostings,
  createUnit,
  updateUnit,
  deleteUnit,
  createRole,
  updateRole,
  deleteRole,
  createIndividual,
  updateIndividual,
  deleteIndividual,
  createPosting,
  updatePosting,
  deletePosting,
};
