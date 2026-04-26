// Posting-timeline geometry — ported from the Next.js prototype.
// Pure logic; React-free. The component layer (PostingTimeline.tsx) does the
// rendering against MUI primitives.

import type { PostingListItem } from "@/types/postings";

export const WINDOW_YEARS_BACK = 2;
export const WINDOW_YEARS_FORWARD = 2;

export type TimelineWindow = {
  start: Date;
  end: Date;
  todayPct: number;
  yearTicks: { date: Date; year: number }[];
  quarterTicks: Date[];
};

export function computeWindow(today = new Date()): TimelineWindow {
  const start = new Date(
    today.getFullYear() - WINDOW_YEARS_BACK,
    today.getMonth(),
    today.getDate(),
  );
  const end = new Date(
    today.getFullYear() + WINDOW_YEARS_FORWARD,
    today.getMonth(),
    today.getDate(),
  );

  const yearTicks: { date: Date; year: number }[] = [];
  const quarterTicks: Date[] = [];
  for (let y = start.getFullYear(); y <= end.getFullYear() + 1; y++) {
    for (let q = 0; q < 4; q++) {
      const d = new Date(y, q * 3, 1);
      if (d < start || d > end) continue;
      if (q === 0) yearTicks.push({ date: d, year: y });
      else quarterTicks.push(d);
    }
  }

  return {
    start,
    end,
    todayPct: pctBetween(today, start, end),
    yearTicks,
    quarterTicks,
  };
}

export function pctBetween(d: Date, start: Date, end: Date): number {
  const total = end.getTime() - start.getTime();
  if (total <= 0) return 0;
  return Math.max(
    0,
    Math.min(100, ((d.getTime() - start.getTime()) / total) * 100),
  );
}

export type CategorisedPosting =
  | { kind: "dateless"; posting: PostingListItem }
  | {
      kind: "in-window";
      posting: PostingListItem;
      start: Date;
      end: Date;
      startsBeforeWindow: boolean;
      endsAfterWindow: boolean;
    }
  | { kind: "earlier"; posting: PostingListItem }
  | { kind: "later"; posting: PostingListItem };

/**
 * Partition postings against the window. End dates are derived from
 * standardTenureMonths or `today` for Past. Outside-window postings are kept
 * for the caller to render as compact "Earlier / Later" strips.
 */
export function categorisePostings(
  postings: PostingListItem[],
  win: TimelineWindow,
  today: Date,
  roleTenureById: Map<number, number | null>,
): CategorisedPosting[] {
  return postings.map((p): CategorisedPosting => {
    if (
      !p.StartDate &&
      (p.Status === "Candidate" || p.Status === "Planned")
    ) {
      return { kind: "dateless", posting: p };
    }
    const start = p.StartDate ? new Date(p.StartDate) : today;

    let end: Date;
    if (p.EndDate) {
      end = new Date(p.EndDate);
    } else if (p.Status === "Past") {
      end = today;
    } else {
      const tenure = roleTenureById.get(p.RoleId) ?? 24;
      end = new Date(start);
      end.setMonth(end.getMonth() + tenure);
    }

    if (end < win.start) return { kind: "earlier", posting: p };
    if (start > win.end) return { kind: "later", posting: p };

    return {
      kind: "in-window",
      posting: p,
      start,
      end,
      startsBeforeWindow: start < win.start,
      endsAfterWindow: end > win.end,
    };
  });
}

export const STATUS_BAR_COLOR: Record<PostingListItem["Status"], string> = {
  Past: "#B4B2A9",
  Current: "#008ED0",
  Planned: "#1746EA",
  Candidate: "#FAEEDA",
};

export const STATUS_BAR_TEXT: Record<PostingListItem["Status"], string> = {
  Past: "#FFFFFF",
  Current: "#FFFFFF",
  Planned: "#FFFFFF",
  Candidate: "#633806",
};
