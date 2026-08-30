import type { SortSpec } from './types'

export function formatNumber(n: number): string {
  return n.toLocaleString('en-US')
}

export function formatDate(ts: number): string {
  return new Date(ts).toISOString().slice(0, 10)
}

export function formatSortSummary(sorts: SortSpec[]): string {
  if (!sorts.length) return 'none'
  return sorts.map((sort) => `${sort.key} ${sort.dir}`).join(', ')
}
