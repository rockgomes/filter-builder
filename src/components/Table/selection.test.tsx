import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Table } from './Table'
import { initialState, type AppState } from '../../state/reducer'
import { generateCompanies } from '../../domain/generateCompanies'
import { computeWindow } from '../../domain/virtual'

const NOW = Date.UTC(2026, 0, 1)
const ROWS = generateCompanies(60, { now: NOW })
const IDS = ROWS.map((r) => r.id)

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

describe('header checkbox', () => {
  it('names itself as the on-screen rows, not all matching rows', () => {
    setup()
    expect(screen.getByLabelText('Select the rows on screen')).toBeInTheDocument()
  })

  it('toggles only the rendered window', async () => {
    const { dispatch, win, user } = setup()
    await user.click(screen.getByLabelText('Select the rows on screen'))
    expect(dispatch).toHaveBeenCalledWith({
      type: 'selection/toggleWindow', windowIds: IDS.slice(win.start, win.end),
    })
  })

  it('is checked only when every rendered row is selected', () => {
    const win = computeWindow({ count: ROWS.length, rowHeight: 32, viewportHeight: 320, scrollTop: 0 })
    setup({ selection: { mode: 'ids', ids: new Set(IDS.slice(win.start, win.end)), snapCount: 0, anchor: null, dismissKey: null } })
    expect(screen.getByLabelText('Select the rows on screen')).toBeChecked()
  })
})

describe('header checkbox partial state', () => {
  const sel = (ids: number[]) => ({
    selection: { mode: 'ids' as const, ids: new Set(ids), snapCount: 0, anchor: null, dismissKey: null },
  })
  const box = () => screen.getByLabelText('Select the rows on screen') as HTMLInputElement

  it('is unchecked and not partial when nothing is selected', () => {
    setup()
    expect(box().checked).toBe(false)
    expect(box().indeterminate).toBe(false)
  })

  it('shows a partial tick when only some rendered rows are selected', () => {
    const win = computeWindow({ count: ROWS.length, rowHeight: 32, viewportHeight: 320, scrollTop: 0 })
    setup(sel(IDS.slice(win.start, win.start + 2)))
    expect(box().checked).toBe(false)
    expect(box().indeterminate).toBe(true)
  })

  it('is fully checked and not partial when every rendered row is selected', () => {
    const win = computeWindow({ count: ROWS.length, rowHeight: 32, viewportHeight: 320, scrollTop: 0 })
    setup(sel(IDS.slice(win.start, win.end)))
    expect(box().checked).toBe(true)
    expect(box().indeterminate).toBe(false)
  })

  // Deliberate behaviour change: this previously asserted the tick cleared when the
  // selected rows were off-screen. That made the indicator vanish as soon as you
  // scrolled past your own selection, which read as a bug. The partial tick now
  // means "a selection exists that this box does not fully cover".
  it('keeps the partial tick when the selected rows have been scrolled past', () => {
    const win = computeWindow({ count: ROWS.length, rowHeight: 32, viewportHeight: 320, scrollTop: 0 })
    const outside = IDS.filter((id) => !IDS.slice(win.start, win.end).includes(id))
    expect(outside.length).toBeGreaterThan(0)
    setup(sel(outside))
    expect(box().checked).toBe(false)
    expect(box().indeterminate).toBe(true)
  })

  it('clears the partial tick only when the selection is empty', () => {
    setup(sel([]))
    expect(box().checked).toBe(false)
    expect(box().indeterminate).toBe(false)
  })
})
