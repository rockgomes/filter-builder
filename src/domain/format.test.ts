import { describe, expect, it } from 'vitest'
import { formatDate, formatNumber } from './format'

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
