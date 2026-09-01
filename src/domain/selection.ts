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

/**
 * Adds rows to the selection, never removes. It backs a menu item that says
 * "select", and a menu item that sometimes deselects instead would be a trap. This
 * replaced toggleWindow, whose toggle was invisible: the same click added or removed
 * depending on state you could not see.
 */
export function selectFirst(sel: SelectionState, ids: number[]): SelectionState {
  if (!ids.length) return sel
  const next = new Set(sel.ids)
  for (const id of ids) next.add(id)
  return { ...sel, mode: 'ids', ids: next, snapCount: 0, dismissKey: null }
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

export function stillMatchingCount(sel: SelectionState, filteredIds: number[]): number {
  let count = 0
  for (const id of filteredIds) if (sel.ids.has(id)) count++
  return count
}

/**
 * Whether the user has to be asked what to do with a selection the filter moved
 * under.
 *
 * The question is whether any of THEIR rows stopped matching, not whether the match
 * count moved. Those are different, in both directions:
 *
 * - Loosening a filter adds rows without taking any away. The count changes, the
 *   selection is untouched, and there is nothing to decide. Asking anyway produced a
 *   banner offering "keep 206" or "trim to 206", two buttons that did the same
 *   nothing.
 * - A filter can also swap rows out for others and land on the same count. Rows the
 *   user selected are gone, and a count comparison sees nothing at all.
 *
 * So the trigger is membership, not arithmetic.
 */
export function needsReconciliation(
  sel: SelectionState,
  filteredIds: number[],
  filterKey: string
): boolean {
  if (sel.mode !== 'all' || sel.snapCount === 0) return false
  if (sel.dismissKey === filterKey) return false
  return stillMatchingCount(sel, filteredIds) < sel.snapCount
}

export function keepAll(sel: SelectionState, filterKey: string): SelectionState {
  return { ...sel, dismissKey: filterKey }
}

export function trimToMatching(sel: SelectionState, filteredIds: number[]): SelectionState {
  const ids = new Set<number>()
  for (const id of filteredIds) if (sel.ids.has(id)) ids.add(id)
  return { mode: 'ids', ids, snapCount: 0, anchor: sel.anchor, dismissKey: null }
}
