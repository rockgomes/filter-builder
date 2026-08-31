import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Table } from './Table'
import { initialState, type AppState } from '../../state/reducer'
import { generateCompanies } from '../../domain/generateCompanies'
import { computeWindow } from '../../domain/virtual'

const NOW = Date.UTC(2026, 0, 1)
const ROWS = generateCompanies(60, { now: NOW })

const setup = (over: Partial<AppState> = {}) => {
  const dispatch = vi.fn()
  const state = { ...initialState(), phase: 'ready' as const, sorts: [], ...over }
  const range = computeWindow({
    count: ROWS.length, rowHeight: 32, viewportHeight: 320, scrollTop: 0,
  })
  render(
    <Table
      state={state}
      dispatch={dispatch}
      sorted={ROWS}
      sortedIds={ROWS.map((r) => r.id)}
      range={range}
      rowHeight={32}
    />
  )
  return { dispatch, state, range, user: userEvent.setup() }
}

describe('Table virtualization', () => {
  it('renders only the windowed rows, not the whole dataset', () => {
    const { range } = setup()
    expect(screen.getAllByRole('row').length - 1).toBe(range.end - range.start)
    expect(range.end).toBeLessThan(ROWS.length)
  })
})

describe('Table sorting', () => {
  it('sorts ascending on a plain header click', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('button', { name: /Headcount/ }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'sort/toggle', key: 'headcount', append: false })
  })

  it('appends a sort on shift click', async () => {
    const { dispatch, user } = setup()
    await user.keyboard('{Shift>}')
    await user.click(screen.getByRole('button', { name: /Headcount/ }))
    await user.keyboard('{/Shift}')
    expect(dispatch).toHaveBeenCalledWith({ type: 'sort/toggle', key: 'headcount', append: true })
  })

  it('exposes sort direction through aria-sort', () => {
    setup({ sorts: [{ key: 'revenue', dir: 'desc' }] })
    const header = screen.getByRole('columnheader', { name: /Revenue/ })
    expect(header).toHaveAttribute('aria-sort', 'descending')
  })

  it('marks unsorted columns as aria-sort none', () => {
    setup({ sorts: [{ key: 'revenue', dir: 'desc' }] })
    expect(screen.getByRole('columnheader', { name: /Country/ })).toHaveAttribute('aria-sort', 'none')
  })

  it('shows a priority number only when more than one sort is active', () => {
    setup({ sorts: [{ key: 'revenue', dir: 'desc' }, { key: 'name', dir: 'asc' }] })
    expect(screen.getByRole('columnheader', { name: /Revenue/ })).toHaveTextContent('↓1')
  })
})

describe('Table columns', () => {
  it('hides a column that is marked hidden', () => {
    setup({ hidden: { country: true } })
    expect(screen.queryByRole('columnheader', { name: /Country/ })).toBeNull()
  })

  it('respects the configured column order', () => {
    setup({ colOrder: ['owner', 'industry', 'stage', 'headcount', 'revenue', 'country', 'founded', 'lastActivity', 'inCRM'] })
    const headers = screen.getAllByRole('columnheader').map((h) => h.textContent)
    expect(headers[2]).toMatch(/Owner/)
  })
})

describe('Table cells', () => {
  it('renders the CRM badge in both states', () => {
    setup()
    const badges = screen.getAllByText(/In CRM|—/)
    expect(badges.length).toBeGreaterThan(0)
  })

  it('formats dates as ISO calendar dates', () => {
    setup()
    expect(screen.getAllByText(/^\d{4}-\d{2}-\d{2}$/).length).toBeGreaterThan(0)
  })
})
