import { describe, expect, it } from 'vitest'
import { formatDate, formatNumber, formatSortSummary } from './format'

describe('formatNumber', () => {
  it('groups thousands with commas', () => {
    expect(formatNumber(5000)).toBe('5,000')
    expect(formatNumber(50000)).toBe('50,000')
    expect(formatNumber(7)).toBe('7')
  })
})

describe('formatDate', () => {
  it('renders an ISO calendar date in UTC', () => {
    expect(formatDate(Date.UTC(2021, 4, 9))).toBe('2021-05-09')
  })
})

describe('formatSortSummary', () => {
  it('returns "none" when there are no sorts', () => {
    expect(formatSortSummary([])).toBe('none')
  })

  it('formats a single sort as "key dir"', () => {
    expect(formatSortSummary([{ key: 'revenue', dir: 'desc' }])).toBe('revenue desc')
  })

  it('joins multiple sorts with ", " in priority order', () => {
    expect(
      formatSortSummary([
        { key: 'industry', dir: 'asc' },
        { key: 'revenue', dir: 'desc' },
      ])
    ).toBe('industry asc, revenue desc')
  })
})
