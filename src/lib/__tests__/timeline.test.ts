import { describe, it, expect } from 'vitest'
import {
  pctBetween,
  computeWindow,
  categorisePostings,
  WINDOW_YEARS_BACK,
  WINDOW_YEARS_FORWARD,
} from '../timeline'
import type { PostingListItem } from '@/types/postings'

// ─── Factory ─────────────────────────────────────────────────────────────────

function makePosting(
  overrides: Pick<PostingListItem, 'Id' | 'RoleId' | 'IndividualId' | 'Status'> &
    Partial<PostingListItem>,
): PostingListItem {
  return {
    Title: 'Test Posting',
    Created: '2024-01-01',
    Modified: '2024-01-01',
    Author: { Title: 'Test' },
    Editor: { Title: 'Test' },
    Individual: { Id: overrides.IndividualId, Title: 'Test Individual' },
    Role: { Id: overrides.RoleId, Title: 'Test Role' },
    StartDate: null,
    EndDate: null,
    Notes: null,
    ...overrides,
  }
}

// ─── pctBetween ───────────────────────────────────────────────────────────────

describe('pctBetween', () => {
  const start = new Date(2024, 0, 1) // Jan 1 2024 (local)
  const end = new Date(2025, 0, 1)   // Jan 1 2025 (local)

  it('returns 0 when the date equals start', () => {
    expect(pctBetween(start, start, end)).toBe(0)
  })

  it('returns 100 when the date equals end', () => {
    expect(pctBetween(end, start, end)).toBe(100)
  })

  it('returns approximately 50 at the midpoint', () => {
    const mid = new Date(2024, 6, 2) // early July — rough midpoint
    const result = pctBetween(mid, start, end)
    expect(result).toBeGreaterThan(49)
    expect(result).toBeLessThan(51)
  })

  it('clamps to 0 for dates before start', () => {
    const before = new Date(2023, 0, 1)
    expect(pctBetween(before, start, end)).toBe(0)
  })

  it('clamps to 100 for dates after end', () => {
    const after = new Date(2026, 0, 1)
    expect(pctBetween(after, start, end)).toBe(100)
  })

  it('returns 0 when start equals end (degenerate range)', () => {
    expect(pctBetween(start, start, start)).toBe(0)
  })
})

// ─── computeWindow ────────────────────────────────────────────────────────────

describe('computeWindow', () => {
  // Use new Date(y, m, d) to avoid UTC/local timezone issues
  const today = new Date(2024, 5, 15) // Jun 15, 2024

  it('start is WINDOW_YEARS_BACK years before today', () => {
    const win = computeWindow(today)
    expect(win.start.getFullYear()).toBe(today.getFullYear() - WINDOW_YEARS_BACK)
    expect(win.start.getMonth()).toBe(today.getMonth())
    expect(win.start.getDate()).toBe(today.getDate())
  })

  it('end is WINDOW_YEARS_FORWARD years after today', () => {
    const win = computeWindow(today)
    expect(win.end.getFullYear()).toBe(today.getFullYear() + WINDOW_YEARS_FORWARD)
    expect(win.end.getMonth()).toBe(today.getMonth())
    expect(win.end.getDate()).toBe(today.getDate())
  })

  it('todayPct is approximately 50 (today sits near the centre of the window)', () => {
    const win = computeWindow(today)
    // The 4-year window is symmetric around today; leap year effects keep it within ±1%
    expect(win.todayPct).toBeCloseTo(50, 0)
  })

  it('yearTicks all fall on January 1 (q=0 months)', () => {
    const win = computeWindow(today)
    expect(win.yearTicks.length).toBeGreaterThan(0)
    for (const tick of win.yearTicks) {
      expect(tick.date.getMonth()).toBe(0) // January
      expect(tick.date.getDate()).toBe(1)
    }
  })

  it('quarterTicks never fall in January (those go to yearTicks)', () => {
    const win = computeWindow(today)
    for (const tick of win.quarterTicks) {
      expect(tick.getMonth()).not.toBe(0)
    }
  })

  it('yearTick years match the year of each tick date', () => {
    const win = computeWindow(today)
    for (const tick of win.yearTicks) {
      expect(tick.year).toBe(tick.date.getFullYear())
    }
  })
})

// ─── categorisePostings ───────────────────────────────────────────────────────

describe('categorisePostings', () => {
  // Window centred on Jan 1 2024: 2022-01-01 → 2026-01-01
  const fixedToday = new Date(2024, 0, 1)
  const win = computeWindow(fixedToday)
  const noTenure = new Map<number, number | null>()

  it('categorises a Candidate posting with no date as "dateless"', () => {
    const p = makePosting({ Id: 1, RoleId: 1, IndividualId: 1, Status: 'Candidate', StartDate: null })
    const [result] = categorisePostings([p], win, fixedToday, noTenure)
    expect(result.kind).toBe('dateless')
  })

  it('categorises a Planned posting with no date as "dateless"', () => {
    const p = makePosting({ Id: 1, RoleId: 1, IndividualId: 1, Status: 'Planned', StartDate: null })
    const [result] = categorisePostings([p], win, fixedToday, noTenure)
    expect(result.kind).toBe('dateless')
  })

  it('does not treat a dated Candidate as dateless', () => {
    const p = makePosting({ Id: 1, RoleId: 1, IndividualId: 1, Status: 'Candidate', StartDate: '2025-01-01', EndDate: '2025-12-31' })
    const [result] = categorisePostings([p], win, fixedToday, noTenure)
    expect(result.kind).not.toBe('dateless')
  })

  it('categorises a posting within the window as "in-window"', () => {
    const p = makePosting({
      Id: 1, RoleId: 1, IndividualId: 1, Status: 'Current',
      StartDate: '2024-01-01', EndDate: '2024-12-31',
    })
    const [result] = categorisePostings([p], win, fixedToday, noTenure)
    expect(result.kind).toBe('in-window')
  })

  it('categorises a posting that ended before the window as "earlier"', () => {
    const p = makePosting({
      Id: 1, RoleId: 1, IndividualId: 1, Status: 'Past',
      StartDate: '2010-01-01', EndDate: '2011-01-01',
    })
    const [result] = categorisePostings([p], win, fixedToday, noTenure)
    expect(result.kind).toBe('earlier')
  })

  it('categorises a posting that starts after the window as "later"', () => {
    const p = makePosting({
      Id: 1, RoleId: 1, IndividualId: 1, Status: 'Planned',
      StartDate: '2035-01-01', EndDate: '2036-01-01',
    })
    const [result] = categorisePostings([p], win, fixedToday, noTenure)
    expect(result.kind).toBe('later')
  })

  it('sets startsBeforeWindow=true when the posting starts before the window but ends inside it', () => {
    // window.start = 2022-01-01; posting starts 2020-01-01
    const p = makePosting({
      Id: 1, RoleId: 1, IndividualId: 1, Status: 'Current',
      StartDate: '2020-01-01', EndDate: '2024-06-01',
    })
    const [result] = categorisePostings([p], win, fixedToday, noTenure)
    expect(result.kind).toBe('in-window')
    if (result.kind === 'in-window') {
      expect(result.startsBeforeWindow).toBe(true)
    }
  })

  it('sets startsBeforeWindow=false when the posting starts inside the window', () => {
    const p = makePosting({
      Id: 1, RoleId: 1, IndividualId: 1, Status: 'Current',
      StartDate: '2023-06-01', EndDate: '2024-06-01',
    })
    const [result] = categorisePostings([p], win, fixedToday, noTenure)
    expect(result.kind).toBe('in-window')
    if (result.kind === 'in-window') {
      expect(result.startsBeforeWindow).toBe(false)
    }
  })

  it('uses role tenure to compute end date when EndDate is missing on a Current posting', () => {
    // Role 1 has 12-month tenure. Posting starts Jan 2024 → should end Jan 2025 (still in window)
    const p = makePosting({
      Id: 1, RoleId: 1, IndividualId: 1, Status: 'Current',
      StartDate: '2024-01-01', EndDate: null,
    })
    const tenure = new Map<number, number | null>([[1, 12]])
    const [result] = categorisePostings([p], win, fixedToday, tenure)
    expect(result.kind).toBe('in-window')
  })
})
