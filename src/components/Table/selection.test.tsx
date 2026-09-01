import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Table } from './Table'
import { initialState, reducer, SELECT_BATCH, type AppState } from '../../state/reducer'
import { generateCompanies } from '../../domain/generateCompanies'
import { computeWindow } from '../../domain/virtual'

const NOW = Date.UTC(2026, 0, 1)
const ROWS = generateCompanies(60, { now: NOW })
const IDS = ROWS.map((r) => r.id)

const sel = (ids: number[]) => ({
  selection: { mode: 'ids' as const, ids: new Set(ids), snapCount: 0, anchor: null, dismissKey: null },
})

const setup = (over: Partial<AppState> = {}) => {
  const dispatch = vi.fn()
  const win = computeWindow({ count: ROWS.length, rowHeight: 32, viewportHeight: 320, scrollTop: 0 })
  render(
    <Table
      state={{ ...initialState(), phase: 'ready', sorts: [], ...over }}
      dispatch={dispatch}
      sorted={ROWS}
      sortedIds={IDS}
      range={win}
      rowHeight={32}
    />
  )
  return { dispatch, win, user: userEvent.setup() }
}

describe('row selection', () => {
  it('toggles a row with its absolute index in the sorted set', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByLabelText(`Select ${ROWS[2].name}`))
    expect(dispatch).toHaveBeenCalledWith({
      type: 'selection/toggleRow', id: ROWS[2].id, index: 2, shiftKey: false, sortedIds: IDS,
    })
  })

  it('reports a shift click so the reducer can extend the range', async () => {
    const { dispatch, user } = setup()
    await user.keyboard('{Shift>}')
    await user.click(screen.getByLabelText(`Select ${ROWS[4].name}`))
    await user.keyboard('{/Shift}')
    expect(dispatch).toHaveBeenCalledWith(
      expect.objectContaining({ type: 'selection/toggleRow', shiftKey: true, index: 4 })
    )
  })
})

// Replaces the header checkbox. As a checkbox it selected the rendered virtual
// window, a number nobody can see, while the gesture reads as "select everything".
// It now states both amounts and makes you pick.
describe('header selection menu', () => {
  const trigger = () => screen.getByRole('button', { name: /^Selection:/ })

  it('reports the current selection in its accessible name', () => {
    setup()
    expect(trigger()).toHaveAccessibleName('Selection: no rows selected')
  })

  it('counts the selection against the matching set, not the rendered window', () => {
    setup(sel(IDS.slice(0, 3)))
    expect(trigger()).toHaveAccessibleName(`Selection: 3 of ${ROWS.length} rows selected`)
  })

  it('says so when everything matching is selected', () => {
    setup(sel(IDS))
    expect(trigger()).toHaveAccessibleName(`Selection: all ${ROWS.length} rows selected`)
  })

  it('opens a menu rather than selecting something', async () => {
    const { dispatch, user } = setup()
    await user.click(trigger())
    expect(dispatch).toHaveBeenCalledWith({ type: 'selMenu/set', open: true })
    expect(dispatch).not.toHaveBeenCalledWith(
      expect.objectContaining({ type: 'selection/selectAllMatching' })
    )
  })

  it('offers both amounts by name', () => {
    setup({ selMenuOpen: true })
    expect(screen.getByRole('menuitem', { name: `Select the first ${SELECT_BATCH}` })).toBeInTheDocument()
    expect(screen.getByRole('menuitem', { name: `Select all ${ROWS.length} matching` })).toBeInTheDocument()
  })

  it('takes a fixed batch off the top of the matching set', async () => {
    const { dispatch, user } = setup({ selMenuOpen: true })
    await user.click(screen.getByRole('menuitem', { name: `Select the first ${SELECT_BATCH}` }))
    expect(dispatch).toHaveBeenCalledWith({
      type: 'selection/selectFirst', ids: IDS.slice(0, SELECT_BATCH),
    })
  })

  it('selects every matching row from the other option', async () => {
    const { dispatch, user } = setup({ selMenuOpen: true })
    await user.click(screen.getByRole('menuitem', { name: `Select all ${ROWS.length} matching` }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'selection/selectAllMatching', matchingIds: IDS })
  })

  // Found on a running build: picking an option left the menu sitting open over the
  // rows it had just ticked.
  it('closes itself once an option is taken', () => {
    const base = { ...initialState(), phase: 'ready' as const, selMenuOpen: true }
    for (const action of [
      { type: 'selection/selectAllMatching', matchingIds: IDS } as const,
      { type: 'selection/selectFirst', ids: IDS.slice(0, 3) } as const,
      { type: 'selection/clear' } as const,
    ]) {
      expect(reducer(base, action).selMenuOpen).toBe(false)
    }
  })

  // The complaint that prompted this: from a partial tick there was no way to tell
  // whether clicking would select the rest or drop what you had.
  it('offers deselect only when there is something to deselect', () => {
    setup({ selMenuOpen: true })
    expect(screen.queryByRole('menuitem', { name: /^Deselect/ })).toBeNull()
  })

  it('names the count it would deselect', async () => {
    const { dispatch, user } = setup({ selMenuOpen: true, ...sel(IDS.slice(0, 3)) })
    await user.click(screen.getByRole('menuitem', { name: 'Deselect all 3' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'selection/clear' })
  })

  it('drops the batch option when it would mean the same as select all', () => {
    const few = ROWS.slice(0, 10)
    const dispatch = vi.fn()
    render(
      <Table
        state={{ ...initialState(), phase: 'ready', sorts: [], selMenuOpen: true }}
        dispatch={dispatch}
        sorted={few}
        sortedIds={few.map((r) => r.id)}
        range={computeWindow({ count: few.length, rowHeight: 32, viewportHeight: 320, scrollTop: 0 })}
        rowHeight={32}
      />
    )
    expect(screen.queryByRole('menuitem', { name: /Select the first/ })).toBeNull()
    expect(screen.getByRole('menuitem', { name: 'Select all 10 matching' })).toBeInTheDocument()
  })
})

describe('header selection glyph', () => {
  const glyph = () => screen.getByRole('button', { name: /^Selection:/ }).textContent

  it('is empty when nothing is selected', () => {
    setup()
    expect(glyph()).toBe('')
  })

  // Deliberately not scoped to the rendered window: scrolling past your own
  // selection must not clear the indicator while the selection is still live.
  it('shows a partial mark for a selection of any size', () => {
    setup(sel(IDS.slice(0, 2)))
    expect(glyph()).toBe('–')
  })

  it('shows a tick once every matching row is selected', () => {
    setup(sel(IDS))
    expect(glyph()).toBe('✓')
  })
})
