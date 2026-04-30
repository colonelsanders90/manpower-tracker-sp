import { describe, it, expect } from 'vitest'
import { buildUnitTree } from '../hierarchy'
import type { UnitListItem } from '@/types/units'
import type { RoleListItem } from '@/types/roles'

// ─── Factories ───────────────────────────────────────────────────────────────

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

// ─── buildUnitTree ────────────────────────────────────────────────────────────

describe('buildUnitTree', () => {
  it('returns an empty array for empty input', () => {
    expect(buildUnitTree([], [])).toEqual([])
  })

  it('returns a single root node with no children or roles', () => {
    const unit = makeUnit({ Id: 1, Title: 'RAiD', Level: 'L1', ParentUnitId: null })
    const result = buildUnitTree([unit], [])
    expect(result).toHaveLength(1)
    expect(result[0].Id).toBe(1)
    expect(result[0].Title).toBe('RAiD')
    expect(result[0].children).toEqual([])
    expect(result[0].roles).toEqual([])
  })

  it('nests a child unit under its parent', () => {
    const root = makeUnit({ Id: 1, Level: 'L1', ParentUnitId: null, Title: 'RAiD' })
    const child = makeUnit({ Id: 2, Level: 'L2', ParentUnitId: 1, Title: 'CyDef' })
    const result = buildUnitTree([root, child], [])
    expect(result).toHaveLength(1)
    expect(result[0].children).toHaveLength(1)
    expect(result[0].children[0].Id).toBe(2)
    expect(result[0].children[0].Title).toBe('CyDef')
  })

  it('attaches roles to the correct unit node', () => {
    const unit = makeUnit({ Id: 1, Level: 'L1', ParentUnitId: null })
    const role = makeRole({ Id: 10, UnitId: 1 })
    const result = buildUnitTree([unit], [role])
    expect(result[0].roles).toHaveLength(1)
    expect(result[0].roles[0].Id).toBe(10)
  })

  it('does not attach roles with UnitId=null (external roles)', () => {
    const unit = makeUnit({ Id: 1, Level: 'L1', ParentUnitId: null })
    const external = makeRole({ Id: 10, UnitId: null, IsExternal: true })
    const result = buildUnitTree([unit], [external])
    expect(result[0].roles).toHaveLength(0)
  })

  it('roles are attached to the right child, not the parent', () => {
    const root = makeUnit({ Id: 1, Level: 'L1', ParentUnitId: null })
    const child = makeUnit({ Id: 2, Level: 'L2', ParentUnitId: 1 })
    const role = makeRole({ Id: 10, UnitId: 2 })
    const result = buildUnitTree([root, child], [role])
    expect(result[0].roles).toHaveLength(0)
    expect(result[0].children[0].roles).toHaveLength(1)
    expect(result[0].children[0].roles[0].Id).toBe(10)
  })

  it('returns multiple roots when there is no common parent', () => {
    const r1 = makeUnit({ Id: 1, Level: 'L1', ParentUnitId: null, Title: 'Root A' })
    const r2 = makeUnit({ Id: 2, Level: 'L1', ParentUnitId: null, Title: 'Root B' })
    const result = buildUnitTree([r1, r2], [])
    expect(result).toHaveLength(2)
    const ids = result.map((n) => n.Id).sort()
    expect(ids).toEqual([1, 2])
  })
})
