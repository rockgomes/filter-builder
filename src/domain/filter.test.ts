import { describe, expect, it } from 'vitest'
import { conditionHits, countIgnoredConditions, evalCond, evalGroup, filterRows } from './filter'
import type { Company, Cond, Group, OpId } from './types'

const NOW = Date.UTC(2026, 0, 1)
const DAY = 864e5

const row = (over: Partial<Company> = {}): Company => ({
  id: 1,
  name: 'Vantage Labs',
  industry: 'SaaS',
  stage: 'Series B',
  headcount: 300,
  revenue: 12.5,
  country: 'Germany',
  founded: Date.UTC(2014, 2, 3),
  lastActivity: NOW - 10 * DAY,
  owner: 'Grace Liu',
  inCRM: false,
  ...over,
})

const cond = (field: string, op: OpId, value: string | string[] = '', value2 = ''): Cond => ({
  kind: 'cond', id: `c_${field}_${op}`, field, op, value, value2,
})

const group = (op: 'AND' | 'OR', children: Group['children']): Group => ({
  kind: 'group', id: 'g', op, children,
})

describe('evalCond — deleted field semantics', () => {
  it('returns null for an unknown field rather than false', () => {
    expect(evalCond(cond('region_emea', 'is', 'EMEA'), row(), NOW)).toBeNull()
  })
})

describe('evalCond — empty value matches everything', () => {
  it('matches when a text value is blank', () => {
    expect(evalCond(cond('name', 'contains', ''), row(), NOW)).toBe(true)
  })

  it('matches when a number value is blank', () => {
    expect(evalCond(cond('headcount', 'gt', ''), row(), NOW)).toBe(true)
  })

  it('matches when an any_of selection is empty', () => {
    expect(evalCond(cond('industry', 'any_of', []), row(), NOW)).toBe(true)
  })

  it('matches when a between range is missing its second bound', () => {
    expect(evalCond(cond('headcount', 'between', '100'), row(), NOW)).toBe(true)
  })
})

describe('evalCond — text operators', () => {
  it('matches contains case-insensitively', () => {
    expect(evalCond(cond('name', 'contains', 'VANTAGE'), row(), NOW)).toBe(true)
    expect(evalCond(cond('name', 'contains', 'nimbus'), row(), NOW)).toBe(false)
  })

  it('matches is, is not and starts with', () => {
    expect(evalCond(cond('name', 'is', 'vantage labs'), row(), NOW)).toBe(true)
    expect(evalCond(cond('name', 'is_not', 'vantage labs'), row(), NOW)).toBe(false)
    expect(evalCond(cond('name', 'starts', 'Van'), row(), NOW)).toBe(true)
  })

  it('treats is empty as a test of the field, not of the query', () => {
    expect(evalCond(cond('owner', 'empty'), row({ owner: '' }), NOW)).toBe(true)
    expect(evalCond(cond('owner', 'empty'), row(), NOW)).toBe(false)
  })
})

describe('evalCond — number operators', () => {
  it('compares with more than, less than and equals', () => {
    expect(evalCond(cond('headcount', 'gt', '200'), row(), NOW)).toBe(true)
    expect(evalCond(cond('headcount', 'lt', '200'), row(), NOW)).toBe(false)
    expect(evalCond(cond('headcount', 'eq', '300'), row(), NOW)).toBe(true)
  })

  it('treats between as inclusive and order-independent', () => {
    expect(evalCond(cond('headcount', 'between', '400', '200'), row(), NOW)).toBe(true)
    expect(evalCond(cond('headcount', 'between', '300', '300'), row(), NOW)).toBe(true)
    expect(evalCond(cond('headcount', 'between', '10', '20'), row(), NOW)).toBe(false)
  })
})

describe('evalCond — enum operators', () => {
  it('matches is and is not', () => {
    expect(evalCond(cond('industry', 'is', 'SaaS'), row(), NOW)).toBe(true)
    expect(evalCond(cond('industry', 'is_not', 'SaaS'), row(), NOW)).toBe(false)
  })

  it('matches any_of and not_any_of against a selection', () => {
    expect(evalCond(cond('industry', 'any_of', ['Fintech', 'SaaS']), row(), NOW)).toBe(true)
    expect(evalCond(cond('industry', 'any_of', ['Fintech']), row(), NOW)).toBe(false)
    expect(evalCond(cond('industry', 'not_any_of', ['Fintech']), row(), NOW)).toBe(true)
  })
})

describe('evalCond — date operators', () => {
  it('matches relative windows against the injected now', () => {
    expect(evalCond(cond('lastActivity', 'last30'), row(), NOW)).toBe(true)
    expect(evalCond(cond('lastActivity', 'last30'), row({ lastActivity: NOW - 60 * DAY }), NOW)).toBe(false)
    expect(evalCond(cond('lastActivity', 'last90'), row({ lastActivity: NOW - 60 * DAY }), NOW)).toBe(true)
  })

  it('matches before, after and between', () => {
    expect(evalCond(cond('founded', 'before', '2020-01-01'), row(), NOW)).toBe(true)
    expect(evalCond(cond('founded', 'after', '2020-01-01'), row(), NOW)).toBe(false)
    expect(evalCond(cond('founded', 'between', '2010-01-01', '2016-01-01'), row(), NOW)).toBe(true)
  })
})

describe('evalCond — boolean operators', () => {
  it('matches is true and is false', () => {
    expect(evalCond(cond('inCRM', 'true'), row({ inCRM: true }), NOW)).toBe(true)
    expect(evalCond(cond('inCRM', 'false'), row({ inCRM: false }), NOW)).toBe(true)
    expect(evalCond(cond('inCRM', 'true'), row({ inCRM: false }), NOW)).toBe(false)
  })
})

describe('evalGroup', () => {
  it('matches everything when the group is empty', () => {
    expect(evalGroup(group('AND', []), row(), NOW)).toBe(true)
  })

  it('excludes null results rather than treating them as false', () => {
    const g = group('AND', [cond('region_emea', 'is', 'EMEA'), cond('industry', 'is', 'SaaS')])
    expect(evalGroup(g, row(), NOW)).toBe(true)
  })

  it('matches everything when every child is ignored', () => {
    const g = group('AND', [cond('region_emea', 'is', 'EMEA')])
    expect(evalGroup(g, row(), NOW)).toBe(true)
  })

  it('requires every live child under AND', () => {
    const g = group('AND', [cond('industry', 'is', 'SaaS'), cond('country', 'is', 'France')])
    expect(evalGroup(g, row(), NOW)).toBe(false)
  })

  it('requires one live child under OR', () => {
    const g = group('OR', [cond('industry', 'is', 'Fintech'), cond('country', 'is', 'Germany')])
    expect(evalGroup(g, row(), NOW)).toBe(true)
  })

  it('evaluates nested groups', () => {
    const g = group('AND', [
      cond('industry', 'is', 'SaaS'),
      group('OR', [cond('headcount', 'gt', '200'), cond('revenue', 'gt', '5')]),
    ])
    expect(evalGroup(g, row(), NOW)).toBe(true)
    expect(evalGroup(g, row({ headcount: 5, revenue: 1 }), NOW)).toBe(false)
  })
})

describe('filterRows', () => {
  it('returns only matching rows', () => {
    const rows = [row({ id: 1 }), row({ id: 2, industry: 'Fintech' })]
    const g = group('AND', [cond('industry', 'is', 'SaaS')])
    expect(filterRows(rows, g, NOW).map((r) => r.id)).toEqual([1])
  })
})

describe('countIgnoredConditions', () => {
  it('counts unknown-field conditions at every depth', () => {
    const g = group('AND', [
      cond('region_emea', 'is', 'EMEA'),
      group('OR', [cond('legacy_tier', 'is', 'A'), cond('industry', 'is', 'SaaS')]),
    ])
    expect(countIgnoredConditions(g)).toBe(2)
  })

  it('counts nothing when every field is live', () => {
    expect(countIgnoredConditions(group('AND', [cond('industry', 'is', 'SaaS')]))).toBe(0)
  })
})

describe('conditionHits', () => {
  it('counts rows matching a single condition across the whole dataset', () => {
    const rows = [row({ id: 1 }), row({ id: 2, industry: 'Fintech' }), row({ id: 3 })]
    expect(conditionHits(rows, cond('industry', 'is', 'SaaS'), NOW)).toBe(2)
  })

  it('counts nothing for a deleted field', () => {
    expect(conditionHits([row()], cond('region_emea', 'is', 'EMEA'), NOW)).toBe(0)
  })
})
