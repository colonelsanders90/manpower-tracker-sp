import { describe, it, expect } from 'vitest'
import {
  validatePostingDates,
  findCurrentsToDemote,
  findHeadsToDemote,
  snapHeadLevel,
  computeRoleVacancy,
  rolesReferencingUnit,
  postingsReferencingRole,
  postingsReferencingIndividual,
} from '../invariants'
import type { PostingListItem } from '@/types/postings'
import type { RoleListItem } from '@/types/roles'
import type { UnitListItem } from '@/types/units'

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
    UnitId: null,
    Level: 'L2',
    IsHead: false,
    IsExternal: false,
    ExternalUnit: null,
    EstablishmentRank: null,
    EstablishmentVocation: null,
    StandardTenureMonths: null,
    IsVacant: true,
    Specialisation: null,
    IsActive: true,
    ...overrides,
  }
}

function makeUnit(
  overrides: Pick<UnitListItem, 'Id'> & Partial<UnitListItem>,
): UnitListItem {
  return {
    Title: 'Test Unit',
    Created: '2024-01-01',
    Modified: '2024-01-01',
    Author: { Title: 'Test' },
    Editor: { Title: 'Test' },
    Code: null,
    Level: 'L2',
    ParentUnit: null,
    ParentUnitId: null,
    Description: null,
    IsActive: true,
    ...overrides,
  }
}

// ─── validatePostingDates ─────────────────────────────────────────────────────

describe('validatePostingDates', () => {
  it('returns null for a valid Past posting with both dates', () => {
    expect(validatePostingDates('Past', '2023-01-01', '2024-01-01')).toBeNull()
  })

  it('returns error for Past posting missing start date', () => {
    expect(validatePostingDates('Past', null, '2024-01-01')).not.toBeNull()
  })

  it('returns error for Past posting missing end date', () => {
    expect(validatePostingDates('Past', '2023-01-01', null)).not.toBeNull()
  })

  it('returns error when end date is before start date', () => {
    expect(validatePostingDates('Current', '2024-06-01', '2024-01-01')).not.toBeNull()
  })

  it('returns null for Current posting with no dates', () => {
    expect(validatePostingDates('Current', null, null)).toBeNull()
  })

  it('returns null for Planned posting with no dates', () => {
    expect(validatePostingDates('Planned', null, null)).toBeNull()
  })

  it('returns null for Candidate posting with only a start date', () => {
    expect(validatePostingDates('Candidate', '2025-01-01', null)).toBeNull()
  })

  it('returns error for an unrecognised status', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(validatePostingDates('Unknown' as any, null, null)).not.toBeNull()
  })
})

// ─── findCurrentsToDemote ────────────────────────────────────────────────────

describe('findCurrentsToDemote', () => {
  it('returns empty array when there are no postings', () => {
    expect(findCurrentsToDemote([], 1)).toEqual([])
  })

  it('returns a Current posting on the target role', () => {
    const p = makePosting({ Id: 1, RoleId: 1, IndividualId: 1, Status: 'Current' })
    expect(findCurrentsToDemote([p], 1)).toEqual([p])
  })

  it('ignores a Current posting on a different role', () => {
    const p = makePosting({ Id: 1, RoleId: 2, IndividualId: 1, Status: 'Current' })
    expect(findCurrentsToDemote([p], 1)).toEqual([])
  })

  it('excludes the posting matching exceptPostingId', () => {
    const p = makePosting({ Id: 1, RoleId: 1, IndividualId: 1, Status: 'Current' })
    expect(findCurrentsToDemote([p], 1, 1)).toEqual([])
  })

  it('ignores non-Current postings on the target role', () => {
    const past = makePosting({ Id: 1, RoleId: 1, IndividualId: 1, Status: 'Past' })
    const planned = makePosting({ Id: 2, RoleId: 1, IndividualId: 2, Status: 'Planned' })
    expect(findCurrentsToDemote([past, planned], 1)).toEqual([])
  })
})

// ─── findHeadsToDemote ───────────────────────────────────────────────────────

describe('findHeadsToDemote', () => {
  it('returns empty array when there are no roles', () => {
    expect(findHeadsToDemote([], 1)).toEqual([])
  })

  it('returns an IsHead role in the target unit', () => {
    const r = makeRole({ Id: 1, UnitId: 1, IsHead: true })
    expect(findHeadsToDemote([r], 1)).toEqual([r])
  })

  it('ignores an IsHead role in a different unit', () => {
    const r = makeRole({ Id: 1, UnitId: 2, IsHead: true })
    expect(findHeadsToDemote([r], 1)).toEqual([])
  })

  it('excludes the role matching exceptRoleId', () => {
    const r = makeRole({ Id: 1, UnitId: 1, IsHead: true })
    expect(findHeadsToDemote([r], 1, 1)).toEqual([])
  })

  it('ignores non-head roles in the target unit', () => {
    const r = makeRole({ Id: 1, UnitId: 1, IsHead: false })
    expect(findHeadsToDemote([r], 1)).toEqual([])
  })
})

// ─── snapHeadLevel ───────────────────────────────────────────────────────────

describe('snapHeadLevel', () => {
  it('snaps to L1 when isHead=true and the unit is L1', () => {
    const unit = makeUnit({ Id: 1, Level: 'L1' })
    expect(snapHeadLevel(true, unit, 'L2')).toBe('L1')
  })

  it('snaps to L2 when isHead=true and the unit is L2', () => {
    const unit = makeUnit({ Id: 1, Level: 'L2' })
    expect(snapHeadLevel(true, unit, 'L3')).toBe('L2')
  })

  it('returns the fallback level when isHead=false, regardless of unit level', () => {
    const unit = makeUnit({ Id: 1, Level: 'L1' })
    expect(snapHeadLevel(false, unit, 'L3')).toBe('L3')
  })

  it('returns the fallback level when isHead=true but unit is undefined', () => {
    expect(snapHeadLevel(true, undefined, 'L2')).toBe('L2')
  })
})

// ─── computeRoleVacancy ──────────────────────────────────────────────────────

describe('computeRoleVacancy', () => {
  it('returns true (vacant) when there are no postings', () => {
    expect(computeRoleVacancy([], 1)).toBe(true)
  })

  it('returns false when a Current posting exists on the role', () => {
    const p = makePosting({ Id: 1, RoleId: 1, IndividualId: 1, Status: 'Current' })
    expect(computeRoleVacancy([p], 1)).toBe(false)
  })

  it('returns true when the only Current posting is being excluded (delete path)', () => {
    const p = makePosting({ Id: 1, RoleId: 1, IndividualId: 1, Status: 'Current' })
    expect(computeRoleVacancy([p], 1, 1)).toBe(true)
  })

  it('returns true when only non-Current postings exist', () => {
    const planned = makePosting({ Id: 1, RoleId: 1, IndividualId: 1, Status: 'Planned' })
    const candidate = makePosting({ Id: 2, RoleId: 1, IndividualId: 2, Status: 'Candidate' })
    expect(computeRoleVacancy([planned, candidate], 1)).toBe(true)
  })

  it('returns false when multiple postings exist and one is Current', () => {
    const past = makePosting({ Id: 1, RoleId: 1, IndividualId: 1, Status: 'Past' })
    const current = makePosting({ Id: 2, RoleId: 1, IndividualId: 2, Status: 'Current' })
    expect(computeRoleVacancy([past, current], 1)).toBe(false)
  })
})

// ─── FK guards ───────────────────────────────────────────────────────────────

describe('rolesReferencingUnit', () => {
  it('returns roles whose UnitId matches', () => {
    const r1 = makeRole({ Id: 1, UnitId: 10 })
    const r2 = makeRole({ Id: 2, UnitId: 20 })
    expect(rolesReferencingUnit([r1, r2], 10)).toEqual([r1])
  })

  it('returns empty when no roles match', () => {
    const r = makeRole({ Id: 1, UnitId: 20 })
    expect(rolesReferencingUnit([r], 10)).toEqual([])
  })
})

describe('postingsReferencingRole', () => {
  it('returns postings whose RoleId matches', () => {
    const p1 = makePosting({ Id: 1, RoleId: 5, IndividualId: 1, Status: 'Current' })
    const p2 = makePosting({ Id: 2, RoleId: 6, IndividualId: 1, Status: 'Past' })
    expect(postingsReferencingRole([p1, p2], 5)).toEqual([p1])
  })

  it('returns empty when no postings match', () => {
    const p = makePosting({ Id: 1, RoleId: 6, IndividualId: 1, Status: 'Current' })
    expect(postingsReferencingRole([p], 5)).toEqual([])
  })
})

describe('postingsReferencingIndividual', () => {
  it('returns postings whose IndividualId matches', () => {
    const p1 = makePosting({ Id: 1, RoleId: 1, IndividualId: 99, Status: 'Current' })
    const p2 = makePosting({ Id: 2, RoleId: 2, IndividualId: 100, Status: 'Past' })
    expect(postingsReferencingIndividual([p1, p2], 99)).toEqual([p1])
  })

  it('returns empty when no postings match', () => {
    const p = makePosting({ Id: 1, RoleId: 1, IndividualId: 100, Status: 'Current' })
    expect(postingsReferencingIndividual([p], 99)).toEqual([])
  })
})
