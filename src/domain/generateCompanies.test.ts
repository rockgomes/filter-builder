import { describe, expect, it } from 'vitest'
import { generateCompanies } from './generateCompanies'
import { FIELDS } from './fields'

const NOW = Date.UTC(2026, 0, 1)
const gen = (n: number) => generateCompanies(n, { now: NOW })

describe('generateCompanies', () => {
  it('is deterministic for a fixed seed', () => {
    expect(gen(50)).toEqual(gen(50))
  })

  it('produces a prefix-stable sequence regardless of length', () => {
    expect(gen(200).slice(0, 50)).toEqual(gen(50))
  })

  it('assigns sequential ids from zero', () => {
    const rows = gen(10)
    expect(rows.map((r) => r.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8, 9])
  })

  it('draws enum values only from the declared options', () => {
    const industries = new Set(FIELDS[1].options)
    const stages = new Set(FIELDS[2].options)
    const countries = new Set(FIELDS[5].options)
    for (const r of gen(500)) {
      expect(industries.has(r.industry)).toBe(true)
      expect(stages.has(r.stage)).toBe(true)
      expect(countries.has(r.country)).toBe(true)
    }
  })

  it('keeps numeric and temporal values within their documented bounds', () => {
    const day = 864e5
    for (const r of gen(500)) {
      expect(r.headcount).toBeGreaterThanOrEqual(2)
      expect(r.revenue).toBeGreaterThan(0)
      expect(new Date(r.founded).getUTCFullYear()).toBeGreaterThanOrEqual(1995)
      expect(new Date(r.founded).getUTCFullYear()).toBeLessThanOrEqual(2025)
      expect(r.lastActivity).toBeLessThanOrEqual(NOW)
      expect(r.lastActivity).toBeGreaterThan(NOW - 241 * day)
    }
  })

  it('names every company with two words', () => {
    for (const r of gen(100)) expect(r.name.split(' ')).toHaveLength(2)
  })

  it('marks roughly 42 percent of companies as in CRM', () => {
    const rows = gen(5000)
    const share = rows.filter((r) => r.inCRM).length / rows.length
    expect(share).toBeGreaterThan(0.39)
    expect(share).toBeLessThan(0.45)
  })
})
