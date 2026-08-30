import { getField } from './fields'
import type { Company, Cond, Group, TreeNode } from './types'

const DAY = 864e5

export function evalCond(cond: Cond, row: Company, now: number): boolean | null {
  const field = getField(cond.field)
  if (!field) return null

  const raw = row[cond.field as keyof Company]
  const query = Array.isArray(cond.value) ? '' : (cond.value ?? '') + ''

  switch (field.type) {
    case 'text': {
      const text = String(raw).toLowerCase()
      const q = query.toLowerCase()
      if (cond.op === 'empty') return !text
      if (!q) return true
      if (cond.op === 'contains') return text.includes(q)
      if (cond.op === 'is') return text === q
      if (cond.op === 'is_not') return text !== q
      if (cond.op === 'starts') return text.startsWith(q)
      return true
    }
    case 'number': {
      if (query === '') return true
      const value = raw as number
      const a = parseFloat(query)
      const b = parseFloat(cond.value2)
      if (Number.isNaN(a)) return true
      if (cond.op === 'gt') return value > a
      if (cond.op === 'lt') return value < a
      if (cond.op === 'eq') return value === a
      if (cond.op === 'between') {
        if (Number.isNaN(b)) return true
        return value >= Math.min(a, b) && value <= Math.max(a, b)
      }
      return true
    }
    case 'enum': {
      if (cond.op === 'any_of' || cond.op === 'not_any_of') {
        const selected = Array.isArray(cond.value) ? cond.value : []
        if (!selected.length) return true
        return cond.op === 'any_of'
          ? selected.includes(raw as string)
          : !selected.includes(raw as string)
      }
      if (!query) return true
      return cond.op === 'is_not' ? raw !== query : raw === query
    }
    case 'date': {
      const value = raw as number
      if (cond.op === 'last30') return value >= now - 30 * DAY
      if (cond.op === 'last90') return value >= now - 90 * DAY
      const a = Date.parse(query)
      const b = Date.parse(cond.value2)
      if (Number.isNaN(a)) return true
      if (cond.op === 'before') return value < a
      if (cond.op === 'after') return value > a
      if (cond.op === 'between') {
        if (Number.isNaN(b)) return true
        return value >= Math.min(a, b) && value <= Math.max(a, b)
      }
      return true
    }
    case 'boolean':
      return cond.op === 'false' ? !raw : !!raw
  }
}

export function evalGroup(group: Group, row: Company, now: number): boolean {
  const results: boolean[] = []
  for (const child of group.children) {
    const result = child.kind === 'group' ? evalGroup(child, row, now) : evalCond(child, row, now)
    if (result !== null) results.push(result)
  }
  if (!results.length) return true
  return group.op === 'OR' ? results.some(Boolean) : results.every(Boolean)
}

export function filterRows(rows: Company[], tree: Group, now: number): Company[] {
  return rows.filter((row) => evalGroup(tree, row, now))
}

export function countIgnoredConditions(tree: Group): number {
  let count = 0
  const visit = (node: TreeNode) => {
    if (node.kind === 'group') node.children.forEach(visit)
    else if (!getField(node.field)) count++
  }
  tree.children.forEach(visit)
  return count
}

export function conditionHits(rows: Company[], cond: Cond, now: number): number {
  let hits = 0
  for (const row of rows) if (evalCond(cond, row, now) === true) hits++
  return hits
}
