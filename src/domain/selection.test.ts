import { describe, expect, it } from 'vitest'
import {
  canSelectAllMatching, clearSelection, emptySelection, isSelected, keepAll,
  needsReconciliation, selectAllMatching, selectedCount, stillMatchingCount,
  toggleRow, toggleWindow, trimToMatching,
} from './selection'
import type { SelectionState } from './selection'

const SORTED = [10, 11, 12, 13, 14, 15]

const withIds = (ids: number[], over: Partial<SelectionState> = {}): SelectionState => ({
  ...emptySelection(), mode: 'ids', ids: new Set(ids), ...over,
})

const inAllMode = (ids: number[], snapCount: number): SelectionState => ({
  mode: 'all', ids: new Set(ids), snapCount, anchor: null, dismissKey: null,
})

describe('emptySelection', () => {
  it('starts empty in ids mode', () => {
    const sel = emptySelection()
    expect(sel.mode).toBe('ids')
    expect(selectedCount(sel)).toBe(0)
    expect(sel.dismissKey).toBeNull()
  })
})

describe('toggleRow — single click', () => {
  it('selects an unselected row', () => {
    const sel = toggleRow(emptySelection(), { id: 12, index: 2, shiftKey: false, sortedIds: SORTED })
    expect(isSelected(sel, 12)).toBe(true)
    expect(selectedCount(sel)).toBe(1)
  })

  it('deselects a selected row', () => {
    const sel = toggleRow(withIds([12]), { id: 12, index: 2, shiftKey: false, sortedIds: SORTED })
    expect(isSelected(sel, 12)).toBe(false)
  })

  it('records the clicked index as the anchor', () => {
    const sel = toggleRow(emptySelection(), { id: 12, index: 2, shiftKey: false, sortedIds: SORTED })
    expect(sel.anchor).toBe(2)
  })

  it('does not mutate the previous state', () => {
    const before = emptySelection()
    toggleRow(before, { id: 12, index: 2, shiftKey: false, sortedIds: SORTED })
    expect(selectedCount(before)).toBe(0)
  })
})

describe('toggleRow — shift click', () => {
  it('selects the range from the anchor to the clicked row', () => {
    const anchored = toggleRow(emptySelection(), { id: 11, index: 1, shiftKey: false, sortedIds: SORTED })
    const ranged = toggleRow(anchored, { id: 14, index: 4, shiftKey: true, sortedIds: SORTED })
    expect([...ranged.ids].sort((a, b) => a - b)).toEqual([11, 12, 13, 14])
  })

  it('works when the range runs backwards', () => {
    const anchored = toggleRow(emptySelection(), { id: 14, index: 4, shiftKey: false, sortedIds: SORTED })
    const ranged = toggleRow(anchored, { id: 11, index: 1, shiftKey: true, sortedIds: SORTED })
    expect([...ranged.ids].sort((a, b) => a - b)).toEqual([11, 12, 13, 14])
  })

  it('applies the target row new state across the whole range, deselecting when the target was selected', () => {
    const all = withIds([10, 11, 12, 13, 14, 15], { anchor: 0 })
    const ranged = toggleRow(all, { id: 13, index: 3, shiftKey: true, sortedIds: SORTED })
    expect([...ranged.ids].sort((a, b) => a - b)).toEqual([14, 15])
  })

  it('falls back to a single toggle when there is no anchor', () => {
    const sel = toggleRow(emptySelection(), { id: 13, index: 3, shiftKey: true, sortedIds: SORTED })
    expect([...sel.ids]).toEqual([13])
  })
})

describe('toggleRow — materializing an all-mode selection', () => {
  it('drops to ids mode and keeps the snapshot as explicit ids', () => {
    const sel = toggleRow(inAllMode([10, 11, 12], 3), { id: 15, index: 5, shiftKey: false, sortedIds: SORTED })
    expect(sel.mode).toBe('ids')
    expect([...sel.ids].sort((a, b) => a - b)).toEqual([10, 11, 12, 15])
    expect(sel.snapCount).toBe(0)
  })

  it('deselecting inside an all-mode snapshot removes only that row', () => {
    const sel = toggleRow(inAllMode([10, 11, 12], 3), { id: 11, index: 1, shiftKey: false, sortedIds: SORTED })
    expect([...sel.ids].sort((a, b) => a - b)).toEqual([10, 12])
    expect(sel.mode).toBe('ids')
  })
})

describe('toggleWindow — the header checkbox', () => {
  it('selects every rendered row when not all are selected', () => {
    const sel = toggleWindow(withIds([10]), [10, 11, 12])
    expect([...sel.ids].sort((a, b) => a - b)).toEqual([10, 11, 12])
  })

  it('deselects every rendered row when all are already selected', () => {
    const sel = toggleWindow(withIds([10, 11, 12, 99]), [10, 11, 12])
    expect([...sel.ids]).toEqual([99])
  })

  it('never touches rows outside the rendered window', () => {
    const sel = toggleWindow(withIds([99]), [10, 11])
    expect(sel.ids.has(99)).toBe(true)
  })

  it('materializes an all-mode selection into ids mode', () => {
    const sel = toggleWindow(inAllMode([10, 11], 2), [12])
    expect(sel.mode).toBe('ids')
    expect([...sel.ids].sort((a, b) => a - b)).toEqual([10, 11, 12])
  })

  it('does nothing to an empty window', () => {
    const sel = toggleWindow(withIds([10]), [])
    expect([...sel.ids]).toEqual([10])
  })
})

describe('selectAllMatching', () => {
  it('enters all mode and snapshots the matching set with its count', () => {
    const sel = selectAllMatching(withIds([10]), [10, 11, 12, 13])
    expect(sel.mode).toBe('all')
    expect(sel.snapCount).toBe(4)
    expect(selectedCount(sel)).toBe(4)
  })
})

describe('canSelectAllMatching', () => {
  it('is offered for a partial selection in ids mode', () => {
    expect(canSelectAllMatching(withIds([10]), 100)).toBe(true)
  })

  it('is not offered with nothing selected', () => {
    expect(canSelectAllMatching(emptySelection(), 100)).toBe(false)
  })

  it('is not offered once every matching row is already selected', () => {
    expect(canSelectAllMatching(withIds([10, 11]), 2)).toBe(false)
  })

  it('is not offered while already in all mode', () => {
    expect(canSelectAllMatching(inAllMode([10, 11], 2), 100)).toBe(false)
  })
})

describe('needsReconciliation', () => {
  it('is false in ids mode however the filter changes', () => {
    expect(needsReconciliation(withIds([10]), 3, 'f2')).toBe(false)
  })

  it('is false while the match count still equals the snapshot count', () => {
    expect(needsReconciliation(inAllMode([10, 11, 12], 3), 3, 'f1')).toBe(false)
  })

  it('is true once the match count diverges from the snapshot', () => {
    expect(needsReconciliation(inAllMode([10, 11, 12], 3), 2, 'f2')).toBe(true)
  })

  it('is suppressed for the filter signature the user chose to keep', () => {
    const kept = keepAll(inAllMode([10, 11, 12], 3), 'f2')
    expect(needsReconciliation(kept, 2, 'f2')).toBe(false)
  })

  it('re-arms when the filter changes again after a keep', () => {
    const kept = keepAll(inAllMode([10, 11, 12], 3), 'f2')
    expect(needsReconciliation(kept, 1, 'f3')).toBe(true)
  })
})

describe('stillMatchingCount', () => {
  it('counts snapshot rows that survive the current filter', () => {
    expect(stillMatchingCount(inAllMode([10, 11, 12], 3), [11, 12, 20])).toBe(2)
  })
})

describe('keepAll', () => {
  it('stays in all mode and preserves the snapshot', () => {
    const kept = keepAll(inAllMode([10, 11, 12], 3), 'f2')
    expect(kept.mode).toBe('all')
    expect(selectedCount(kept)).toBe(3)
  })
})

describe('trimToMatching', () => {
  it('intersects the snapshot with the current matches and returns to ids mode', () => {
    const trimmed = trimToMatching(inAllMode([10, 11, 12], 3), [11, 12, 20])
    expect(trimmed.mode).toBe('ids')
    expect([...trimmed.ids].sort((a, b) => a - b)).toEqual([11, 12])
    expect(trimmed.snapCount).toBe(0)
    expect(trimmed.dismissKey).toBeNull()
  })
})

describe('clearSelection', () => {
  it('returns an empty ids-mode selection', () => {
    expect(clearSelection()).toEqual(emptySelection())
  })
})
