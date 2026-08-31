import type { Company, CompanyKey, SortSpec } from './types'

export function buildComparator(sorts: SortSpec[]): (a: Company, b: Company) => number {
  return (a, b) => {
    for (const sort of sorts) {
      const av = a[sort.key]
      const bv = b[sort.key]
      let d: number
      if (typeof av === 'string' && typeof bv === 'string') d = av.localeCompare(bv)
      else d = av === bv ? 0 : av > bv ? 1 : -1
      if (d) return sort.dir === 'desc' ? -d : d
    }
    return a.id - b.id
  }
}

export function sortRows(rows: Company[], sorts: SortSpec[]): Company[] {
  if (!sorts.length) return rows
  return rows.slice().sort(buildComparator(sorts))
}

export function toggleSort(sorts: SortSpec[], key: CompanyKey, append: boolean): SortSpec[] {
  const next = sorts.slice()
  const i = next.findIndex((s) => s.key === key)

  if (append) {
    if (i < 0) next.push({ key, dir: 'asc' })
    else if (next[i].dir === 'asc') next[i] = { key, dir: 'desc' }
    else next.splice(i, 1)
    return next
  }

  if (i < 0 || next.length > 1) return [{ key, dir: 'asc' }]
  if (next[0].dir === 'asc') return [{ key, dir: 'desc' }]
  return []
}
