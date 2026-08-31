export type SelMode = 'ids' | 'all'

export interface SelectionState {
  /** 'ids' holds an explicit selection. 'all' holds a snapshot of the matching set. */
  mode: SelMode
  ids: ReadonlySet<number>
  /** Match count at the moment "select all matching" was pressed. Zero in ids mode. */
  snapCount: number
  anchor: number | null
  /** Filter signature the user chose to keep a stale all-selection against. */
  dismissKey: string | null
}

export function emptySelection(): SelectionState {
  return { mode: 'ids', ids: new Set(), snapCount: 0, anchor: null, dismissKey: null }
}

export function clearSelection(): SelectionState {
  return emptySelection()
}

export function isSelected(sel: SelectionState, id: number): boolean {
  return sel.ids.has(id)
}

export function selectedCount(sel: SelectionState): number {
  return sel.ids.size
}

interface ToggleRowInput {
  id: number
  index: number
  shiftKey: boolean
  sortedIds: number[]
}

export function toggleRow(sel: SelectionState, input: ToggleRowInput): SelectionState {
  const { id, index, shiftKey, sortedIds } = input
  const ids = new Set(sel.ids)
  const target = !isSelected(sel, id)

  if (shiftKey && sel.anchor !== null) {
    const from = Math.min(sel.anchor, index)
    const to = Math.max(sel.anchor, index)
    for (let i = from; i <= to; i++) {
      const rowId = sortedIds[i]
      if (rowId === undefined) continue
      if (target) ids.add(rowId)
      else ids.delete(rowId)
    }
  } else if (target) {
    ids.add(id)
  } else {
    ids.delete(id)
  }

  return { mode: 'ids', ids, snapCount: 0, anchor: index, dismissKey: null }
}

export function toggleWindow(sel: SelectionState, windowIds: number[]): SelectionState {
  if (!windowIds.length) return sel
  const ids = new Set(sel.ids)
  const allSelected = windowIds.every((id) => ids.has(id))
  for (const id of windowIds) {
    if (allSelected) ids.delete(id)
    else ids.add(id)
  }
  return { ...sel, mode: 'ids', ids, snapCount: 0, dismissKey: null }
}

export function selectAllMatching(sel: SelectionState, matchingIds: number[]): SelectionState {
  return {
    mode: 'all',
    ids: new Set(matchingIds),
    snapCount: matchingIds.length,
    anchor: sel.anchor,
    dismissKey: null,
  }
}

export function canSelectAllMatching(sel: SelectionState, filteredCount: number): boolean {
  return sel.mode === 'ids' && sel.ids.size > 0 && sel.ids.size < filteredCount
}

export function needsReconciliation(
  sel: SelectionState,
  filteredCount: number,
  filterKey: string
): boolean {
  return (
    sel.mode === 'all' &&
    sel.snapCount > 0 &&
    filteredCount !== sel.snapCount &&
    sel.dismissKey !== filterKey
  )
}

export function stillMatchingCount(sel: SelectionState, filteredIds: number[]): number {
  let count = 0
  for (const id of filteredIds) if (sel.ids.has(id)) count++
  return count
}

export function keepAll(sel: SelectionState, filterKey: string): SelectionState {
  return { ...sel, dismissKey: filterKey }
}

export function trimToMatching(sel: SelectionState, filteredIds: number[]): SelectionState {
  const ids = new Set<number>()
  for (const id of filteredIds) if (sel.ids.has(id)) ids.add(id)
  return { mode: 'ids', ids, snapCount: 0, anchor: sel.anchor, dismissKey: null }
}
