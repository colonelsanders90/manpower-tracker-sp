import { describe, it, expect } from 'vitest'
import { buildMovementRows, formatEstablishment } from '../movement'
import type { PostingListItem } from '@/types/postings'
import type { RoleListItem } from '@/types/roles'
import type { IndividualListItem } from '@/types/individuals'

// ─── Factories ───────────────────────────────────────────────────────────────

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

function makeRole(
  overrides: Pick<RoleListItem, 'Id'> & Partial<RoleListItem>,
): RoleListItem {
  return {
    Title: 'Test Role',
    Created: '2024-01-01',
    Modified: '2024-01-01',
    Author: { Title: 'Test' },
    Editor: { Title: 'Test' },
    Unit: null,
    UnitId: 10,
    Level: 'L2',
    IsHead: false,
    IsExternal: false,
    ExternalUnit: null,
    EstablishmentRank: null,
    EstablishmentVocation: null,
    StandardTenureMonths: null,
    IsVacant: false,
    Specialisation: null,
    IsActive: true,
    ...overrides,
  }
}

function makeIndividual(
  overrides: Pick<IndividualListItem, 'Id'> & Partial<IndividualListItem>,
): IndividualListItem {
  return {
    Title: 'Test Person',
    Created: '2024-01-01',
    Modified: '2024-01-01',
    Author: { Title: 'Test' },
    Editor: { Title: 'Test' },
    EmployeeId: null,
    Rank: null,
    Specialisation: null,
    Email: null,
    IsExternal: false,
    IsActive: true,
    Profile: null,
    ...overrides,
  }
}

// ─── Date helpers (all relative to now to survive the ENDING_SOON_DAYS check) ─

function daysFromNow(n: number): string {
  const d = new Date()
  d.setDate(d.getDate() + n)
  return d.toISOString().slice(0, 10)
}

const UNIT_MAP = new Map([[10, 'CyDef']])

// ─── buildMovementRows ────────────────────────────────────────────────────────

describe('buildMovementRows', () => {
  it('filters out external roles (IsExternal=true)', () => {
    const ext = makeRole({ Id: 1, UnitId: null, IsExternal: true })
    expect(buildMovementRows([ext], [], [], UNIT_MAP)).toHaveLength(0)
  })

  it('filters out roles with UnitId=null even if IsExternal=false', () => {
    const noUnit = makeRole({ Id: 1, UnitId: null, IsExternal: false })
    expect(buildMovementRows([noUnit], [], [], UNIT_MAP)).toHaveLength(0)
  })

  it('signal is "vacant" when IsVacant flag is true', () => {
    const role = makeRole({ Id: 1, IsVacant: true })
    const [row] = buildMovementRows([role], [], [], UNIT_MAP)
    expect(row.Signal).toBe('vacant')
  })

  it('signal is "vacant" when IsVacant=false but no Current posting exists', () => {
    const role = makeRole({ Id: 1, IsVacant: false })
    // Only a Planned posting — no Current
    const planned = makePosting({ Id: 100, RoleId: 1, IndividualId: 1, Status: 'Planned' })
    const ind = makeIndividual({ Id: 1 })
    const [row] = buildMovementRows([role], [ind], [planned], UNIT_MAP)
    expect(row.Signal).toBe('vacant')
  })

  it('signal is "ending-soon" when Current posting ends within 365 days', () => {
    const role = makeRole({ Id: 1, IsVacant: false })
    const ind = makeIndividual({ Id: 1, Title: 'MAJ Jane Lim', Rank: 'MAJ' })
    const current = makePosting({
      Id: 100, RoleId: 1, IndividualId: 1, Status: 'Current',
      EndDate: daysFromNow(180), // 6 months — inside the cutoff
    })
    const [row] = buildMovementRows([role], [ind], [current], UNIT_MAP)
    expect(row.Signal).toBe('ending-soon')
  })

  it('signal is "stable" when Current posting ends far in the future', () => {
    const role = makeRole({ Id: 1, IsVacant: false })
    const ind = makeIndividual({ Id: 1 })
    const current = makePosting({
      Id: 100, RoleId: 1, IndividualId: 1, Status: 'Current',
      EndDate: daysFromNow(800), // > 365 days — outside the cutoff
    })
    const [row] = buildMovementRows([role], [ind], [current], UNIT_MAP)
    expect(row.Signal).toBe('stable')
  })

  it('signal is "incoming" when there is a Current posting (no end date) and incoming postings', () => {
    const role = makeRole({ Id: 1, IsVacant: false })
    const ind1 = makeIndividual({ Id: 1, Title: 'MAJ Alpha' })
    const ind2 = makeIndividual({ Id: 2, Title: 'CPT Beta' })
    // Current with no EndDate → isEndingSoon=false
    const current = makePosting({ Id: 100, RoleId: 1, IndividualId: 1, Status: 'Current' })
    const incoming = makePosting({ Id: 101, RoleId: 1, IndividualId: 2, Status: 'Planned' })
    const [row] = buildMovementRows([role], [ind1, ind2], [current, incoming], UNIT_MAP)
    expect(row.Signal).toBe('incoming')
  })

  it('populates Current with rank + name combined and raw rank', () => {
    const role = makeRole({ Id: 1, IsVacant: false })
    // Title holds only the name — rank is a separate field (never embed in Title)
    const ind = makeIndividual({ Id: 1, Title: 'Rock Tan', Rank: 'LTC' })
    const current = makePosting({ Id: 100, RoleId: 1, IndividualId: 1, Status: 'Current' })
    const [row] = buildMovementRows([role], [ind], [current], UNIT_MAP)
    expect(row.Current).not.toBeNull()
    expect(row.Current!.IndividualName).toBe('LTC Rock Tan')
    expect(row.Current!.Rank).toBe('LTC')
    expect(row.Current!.Id).toBe(100)
  })

  it('Current is null when individual record is missing', () => {
    const role = makeRole({ Id: 1, IsVacant: false })
    const current = makePosting({ Id: 100, RoleId: 1, IndividualId: 999, Status: 'Current' })
    // individual with Id 999 is not in the list
    const [row] = buildMovementRows([role], [], [current], UNIT_MAP)
    expect(row.Current).toBeNull()
  })

  it('sorts incoming postings by StartDate (earliest first)', () => {
    const role = makeRole({ Id: 1, IsVacant: false })
    const ind1 = makeIndividual({ Id: 1 })
    const ind2 = makeIndividual({ Id: 2 })
    const ind3 = makeIndividual({ Id: 3 })
    const current = makePosting({ Id: 100, RoleId: 1, IndividualId: 1, Status: 'Current' })
    // Deliberately insert the later posting first
    const laterIncoming = makePosting({ Id: 102, RoleId: 1, IndividualId: 3, Status: 'Planned', StartDate: '2026-01-01' })
    const earlierIncoming = makePosting({ Id: 101, RoleId: 1, IndividualId: 2, Status: 'Planned', StartDate: '2025-06-01' })
    const [row] = buildMovementRows([role], [ind1, ind2, ind3], [current, laterIncoming, earlierIncoming], UNIT_MAP)
    expect(row.Incoming).toHaveLength(2)
    expect(row.Incoming[0].StartDate).toBe('2025-06-01')
    expect(row.Incoming[1].StartDate).toBe('2026-01-01')
  })

  it('resolves unit name from the unitNameById map', () => {
    const role = makeRole({ Id: 1, UnitId: 10, IsVacant: true })
    const [row] = buildMovementRows([role], [], [], UNIT_MAP)
    expect(row.UnitName).toBe('CyDef')
  })
})

// ─── formatEstablishment ─────────────────────────────────────────────────────

describe('formatEstablishment', () => {
  it('returns null when both rank and vocation are null', () => {
    expect(formatEstablishment(null, null)).toBeNull()
  })

  it('returns rank when vocation is null', () => {
    expect(formatEstablishment('LTC', null)).toBe('LTC')
  })

  it('returns vocation when rank is null', () => {
    expect(formatEstablishment(null, 'AAO')).toBe('AAO')
  })

  it('joins rank and vocation with a slash when both are present', () => {
    expect(formatEstablishment('LTC', 'AAO')).toBe('LTC/AAO')
  })
})
