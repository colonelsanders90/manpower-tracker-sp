// Movement signal classification — ported from the Next.js prototype's
// /roles page. Pure logic; no React or SP-API dependencies.

import type { RoleListItem } from "@/types/roles";
import type { IndividualListItem } from "@/types/individuals";
import type { PostingListItem } from "@/types/postings";

const ENDING_SOON_DAYS = 365;

export type MovementSignal =
  | "vacant"
  | "ending-soon"
  | "incoming"
  | "stable";

export type IncomingPosting = {
  Id: number;
  Status: "Planned" | "Candidate";
  IndividualId: number;
  IndividualName: string;
  StartDate: string | null;
};

export type CurrentPosting = {
  Id: number;
  IndividualId: number;
  IndividualName: string;
  Rank: string | null;
  EndDate: string | null;
};

export type RoleMovementRow = {
  Id: number;
  Title: string;
  Level: "L1" | "L2" | "L3";
  UnitId: number | null;
  UnitName: string;
  IsVacant: boolean;
  IsHead: boolean;
  EstablishmentRank: string | null;
  EstablishmentVocation: string | null;
  Current: CurrentPosting | null;
  Incoming: IncomingPosting[];
  NextEventAt: number | null;
  Signal: MovementSignal;
};

export const SIGNAL_RANK: Record<MovementSignal, number> = {
  vacant: 0,
  "ending-soon": 1,
  incoming: 2,
  stable: 3,
};

export function buildMovementRows(
  roles: RoleListItem[],
  individuals: IndividualListItem[],
  postings: PostingListItem[],
  unitNameById: Map<number, string>,
): RoleMovementRow[] {
  const internal = roles.filter((r) => !r.IsExternal && r.UnitId != null);
  const indById = new Map(individuals.map((i) => [i.Id, i]));
  const now = Date.now();
  const cutoff = now + ENDING_SOON_DAYS * 24 * 60 * 60 * 1000;

  const postingsByRole = new Map<number, PostingListItem[]>();
  for (const p of postings) {
    const list = postingsByRole.get(p.RoleId) ?? [];
    list.push(p);
    postingsByRole.set(p.RoleId, list);
  }

  return internal.map((r) => {
    const rolePostings = postingsByRole.get(r.Id) ?? [];

    const currentPosting = rolePostings.find((p) => p.Status === "Current");
    const currentIndividual = currentPosting
      ? indById.get(currentPosting.IndividualId)
      : undefined;

    const incoming: IncomingPosting[] = rolePostings
      .filter((p) => p.Status === "Planned" || p.Status === "Candidate")
      .map((p) => {
        const ind = indById.get(p.IndividualId);
        return {
          Id: p.Id,
          Status: p.Status as "Planned" | "Candidate",
          IndividualId: p.IndividualId,
          IndividualName: ind?.Title ?? "Unknown",
          StartDate: p.StartDate,
        };
      })
      .sort((a, b) => {
        if (a.StartDate && b.StartDate) {
          return (
            new Date(a.StartDate).getTime() - new Date(b.StartDate).getTime()
          );
        }
        if (a.StartDate) return -1;
        if (b.StartDate) return 1;
        return 0;
      });

    const currentEndsAt = currentPosting?.EndDate
      ? new Date(currentPosting.EndDate).getTime()
      : null;
    const isEndingSoon =
      currentEndsAt != null && currentEndsAt > now && currentEndsAt < cutoff;

    let signal: MovementSignal;
    if (r.IsVacant || !currentPosting) {
      signal = "vacant";
    } else if (isEndingSoon) {
      signal = "ending-soon";
    } else if (incoming.length > 0) {
      signal = "incoming";
    } else {
      signal = "stable";
    }

    const inAt = incoming[0]?.StartDate
      ? new Date(incoming[0].StartDate).getTime()
      : null;
    const nextEventAt = pickEarlier(currentEndsAt, inAt);

    const unitName =
      r.UnitId != null
        ? (unitNameById.get(r.UnitId) ?? r.ExternalUnit ?? "—")
        : (r.ExternalUnit ?? "—");

    return {
      Id: r.Id,
      Title: r.Title,
      Level: r.Level,
      UnitId: r.UnitId,
      UnitName: unitName,
      IsVacant: r.IsVacant,
      IsHead: r.IsHead,
      EstablishmentRank: r.EstablishmentRank,
      EstablishmentVocation: r.EstablishmentVocation,
      Current:
        currentPosting && currentIndividual
          ? {
              Id: currentPosting.Id,
              IndividualId: currentIndividual.Id,
              IndividualName: currentIndividual.Title,
              Rank: currentIndividual.Rank,
              EndDate: currentPosting.EndDate,
            }
          : null,
      Incoming: incoming,
      NextEventAt: nextEventAt,
      Signal: signal,
    };
  });
}

function pickEarlier(a: number | null, b: number | null): number | null {
  if (a == null) return b;
  if (b == null) return a;
  return Math.min(a, b);
}

export function formatEstablishment(
  rank: string | null,
  vocation: string | null,
): string | null {
  if (!rank && !vocation) return null;
  if (rank && vocation) return `${rank}/${vocation}`;
  return rank ?? vocation;
}
