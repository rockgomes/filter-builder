import { describe, expect, it } from 'vitest'
import { sortRows, toggleSort } from './sort'
import type { Company, SortSpec } from './types'

const co = (id: number, over: Partial<Company> = {}): Company => ({
  id, name: 'Atlas Core', industry: 'SaaS', stage: 'Seed', headcount: 10, revenue: 1,
  country: 'Canada', founded: 0, lastActivity: 0, owner: 'Dev Patel', inCRM: false, ...over,
})

describe('sortRows', () => {
  it('returns a new array and leaves the input order untouched', () => {
    const rows = [co(1, { revenue: 5 }), co(2, { revenue: 9 })]
    const sorted = sortRows(rows, [{ key: 'revenue', dir: 'desc' }])
    expect(sorted.map((r) => r.id)).toEqual([2, 1])
    expect(rows.map((r) => r.id)).toEqual([1, 2])
  })

  it('preserves input order when there are no sorts', () => {
    const rows = [co(2), co(1)]
    expect(sortRows(rows, []).map((r) => r.id)).toEqual([2, 1])
  })

  it('sorts strings with locale comparison', () => {
    const rows = [co(1, { name: 'Zenith Ops' }), co(2, { name: 'Arden Labs' })]
    expect(sortRows(rows, [{ key: 'name', dir: 'asc' }]).map((r) => r.id)).toEqual([2, 1])
  })

  it('applies later sorts only to break ties in earlier ones', () => {
    const rows = [
      co(1, { industry: 'SaaS', revenue: 2 }),
      co(2, { industry: 'Fintech', revenue: 9 }),
      co(3, { industry: 'SaaS', revenue: 8 }),
    ]
    const sorts: SortSpec[] = [{ key: 'industry', dir: 'asc' }, { key: 'revenue', dir: 'desc' }]
    expect(sortRows(rows, sorts).map((r) => r.id)).toEqual([2, 3, 1])
  })

  it('breaks remaining ties by id', () => {
    const rows = [co(3, { revenue: 1 }), co(1, { revenue: 1 }), co(2, { revenue: 1 })]
    expect(sortRows(rows, [{ key: 'revenue', dir: 'asc' }]).map((r) => r.id)).toEqual([1, 2, 3])
  })
})

describe('toggleSort — plain click', () => {
  it('sorts a new column ascending', () => {
    expect(toggleSort([], 'revenue', false)).toEqual([{ key: 'revenue', dir: 'asc' }])
  })

  it('cycles ascending to descending', () => {
    expect(toggleSort([{ key: 'revenue', dir: 'asc' }], 'revenue', false))
      .toEqual([{ key: 'revenue', dir: 'desc' }])
  })

  it('cycles descending back to no sort', () => {
    expect(toggleSort([{ key: 'revenue', dir: 'desc' }], 'revenue', false)).toEqual([])
  })

  it('collapses an existing multi-sort down to the clicked column', () => {
    const sorts: SortSpec[] = [{ key: 'industry', dir: 'asc' }, { key: 'revenue', dir: 'desc' }]
    expect(toggleSort(sorts, 'revenue', false)).toEqual([{ key: 'revenue', dir: 'asc' }])
  })

  it('replaces a different single sort', () => {
    expect(toggleSort([{ key: 'industry', dir: 'desc' }], 'revenue', false))
      .toEqual([{ key: 'revenue', dir: 'asc' }])
  })
})

describe('toggleSort — shift click', () => {
  it('appends a new column ascending', () => {
    expect(toggleSort([{ key: 'industry', dir: 'asc' }], 'revenue', true))
      .toEqual([{ key: 'industry', dir: 'asc' }, { key: 'revenue', dir: 'asc' }])
  })

  it('cycles an appended column to descending in place', () => {
    const sorts: SortSpec[] = [{ key: 'industry', dir: 'asc' }, { key: 'revenue', dir: 'asc' }]
    expect(toggleSort(sorts, 'industry', true))
      .toEqual([{ key: 'industry', dir: 'desc' }, { key: 'revenue', dir: 'asc' }])
  })

  it('removes a column on its third shift click', () => {
    const sorts: SortSpec[] = [{ key: 'industry', dir: 'desc' }, { key: 'revenue', dir: 'asc' }]
    expect(toggleSort(sorts, 'industry', true)).toEqual([{ key: 'revenue', dir: 'asc' }])
  })

  it('does not mutate the input array', () => {
    const sorts: SortSpec[] = [{ key: 'industry', dir: 'asc' }]
    toggleSort(sorts, 'revenue', true)
    expect(sorts).toHaveLength(1)
  })
})
