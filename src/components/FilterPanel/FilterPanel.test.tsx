import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { FilterPanel } from './FilterPanel'
import { initialState } from '../../state/reducer'
import { generateCompanies } from '../../domain/generateCompanies'
import { filterRows } from '../../domain/filter'
import { emptyTree } from '../../domain/tree'
import type { AppState } from '../../state/reducer'
import type { Group } from '../../domain/types'

const NOW = Date.UTC(2026, 0, 1)
const ROWS = generateCompanies(200, { now: NOW })

const setup = (over: Partial<AppState> = {}) => {
  const dispatch = vi.fn()
  const state = { ...initialState(), phase: 'ready' as const, ...over }
  render(
    <FilterPanel
      state={state}
      dispatch={dispatch}
      rows={ROWS}
      filtered={filterRows(ROWS, state.tree, NOW)}
      ignoredCount={0}
      now={NOW}
    />,
  )
  return { dispatch, state, user: userEvent.setup() }
}

const legacyTree = (): Group => ({
  kind: 'group',
  id: 'root',
  op: 'AND',
  children: [
    { kind: 'cond', id: 'c_dead', field: 'region_emea', op: 'is', value: 'EMEA', value2: '' },
  ],
})

describe('FilterPanel structure', () => {
  it('labels the first row Where and later rows with the joiner', () => {
    setup()
    expect(screen.getByText('Where')).toBeInTheDocument()
    expect(screen.getAllByRole('button', { name: 'AND' }).length).toBeGreaterThan(0)
  })

  it('adds a condition to the root', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Add condition' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'tree/addCondition', parentId: 'root' })
  })

  it('adds a group', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('button', { name: /\+ Group/ }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'tree/addGroup' })
  })

  it('flips the root operator from the joiner pill', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getAllByRole('button', { name: 'AND' })[0])
    expect(dispatch).toHaveBeenCalledWith({ type: 'tree/toggleOp', id: 'root' })
  })
})

describe('FilterPanel condition editing', () => {
  it('resets the operator and re-seeds the value when the field changes', async () => {
    const { dispatch, state, user } = setup()
    const id = state.tree.children[0].id
    await user.selectOptions(screen.getAllByLabelText('Field')[0], 'headcount')
    expect(dispatch).toHaveBeenCalledWith({
      type: 'tree/patchCondition',
      id,
      patch: { field: 'headcount', op: 'gt', value: '', value2: '' },
    })
  })

  it('wraps the value into an array when switching to is any of', async () => {
    const { dispatch, state, user } = setup()
    const id = state.tree.children[0].id
    await user.selectOptions(screen.getAllByLabelText('Operator')[0], 'any_of')
    expect(dispatch).toHaveBeenCalledWith({
      type: 'tree/patchCondition',
      id,
      patch: { op: 'any_of', value: ['SaaS'] },
    })
  })

  it('shows a second input only for a between range', () => {
    const tree: Group = {
      kind: 'group',
      id: 'root',
      op: 'AND',
      children: [
        { kind: 'cond', id: 'c1', field: 'headcount', op: 'between', value: '10', value2: '20' },
      ],
    }
    setup({ tree })
    expect(screen.getAllByLabelText(/Value/)).toHaveLength(2)
  })

  it('shows no value input for a boolean condition', () => {
    const tree: Group = {
      kind: 'group',
      id: 'root',
      op: 'AND',
      children: [{ kind: 'cond', id: 'c1', field: 'inCRM', op: 'true', value: '', value2: '' }],
    }
    setup({ tree })
    expect(screen.queryByLabelText(/Value/)).toBeNull()
  })

  // Deliberate behaviour change: hit counts used to always render. They are
  // diagnostic rather than part of the query, so they are now off by default and
  // revealed by a toggle in the panel footer.
  it('reports a live hit count for each condition once the toggle is on', () => {
    const tree: Group = {
      kind: 'group',
      id: 'root',
      op: 'AND',
      children: [
        { kind: 'cond', id: 'c1', field: 'industry', op: 'is', value: 'SaaS', value2: '' },
      ],
    }
    setup({ tree, showHitCounts: true })
    expect(screen.getByText(/\d+ hits?$/)).toBeInTheDocument()
  })

  it('hides hit counts by default', () => {
    const tree: Group = {
      kind: 'group',
      id: 'root',
      op: 'AND',
      children: [
        { kind: 'cond', id: 'c1', field: 'industry', op: 'is', value: 'SaaS', value2: '' },
      ],
    }
    setup({ tree })
    expect(screen.queryByText(/\d+ hits?$/)).toBeNull()
  })

  it('removes a condition', async () => {
    const { dispatch, state, user } = setup()
    const id = state.tree.children[0].id
    await user.click(screen.getAllByRole('button', { name: /Remove condition/ })[0])
    expect(dispatch).toHaveBeenCalledWith({ type: 'tree/removeNode', id })
  })
})

describe('FilterPanel deleted field', () => {
  it('explains that the condition is ignored rather than failing', () => {
    setup({ tree: legacyTree() })
    expect(screen.getByText(/field was deleted — condition ignored/)).toBeInTheDocument()
  })

  it('offers no operator or value editor for a dead condition', () => {
    setup({ tree: legacyTree() })
    expect(screen.queryByLabelText('Operator')).toBeNull()
    expect(screen.queryByLabelText(/Value/)).toBeNull()
  })

  it('surfaces the ignored count beside the match count', () => {
    const dispatch = vi.fn()
    render(
      <FilterPanel
        state={{ ...initialState(), phase: 'ready', tree: legacyTree() }}
        dispatch={dispatch}
        rows={ROWS}
        filtered={ROWS}
        ignoredCount={1}
        now={NOW}
      />,
    )
    expect(screen.getByText('1 condition ignored (deleted field)')).toBeInTheDocument()
  })
})

describe('FilterPanel saving a view', () => {
  it('swaps the button for a name input and saves', async () => {
    const { dispatch, user } = setup({ savingView: true, saveName: 'My view' })
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/confirmSave' })
  })

  it('cancels without saving', async () => {
    const { dispatch, user } = setup({ savingView: true })
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/cancelSave' })
  })
})

describe('FilterPanel empty tree', () => {
  it('renders the footer actions with no conditions', () => {
    setup({ tree: emptyTree() })
    expect(screen.getByRole('button', { name: 'Add condition' })).toBeInTheDocument()
  })
})

describe('FilterPanel add-condition buttons', () => {
  // Both buttons read "+ Condition" on screen. They do different things, so their
  // accessible names must differ or a screen-reader user cannot tell them apart.
  it('distinguishes the root and group add-condition actions by accessible name', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Add condition' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Add condition to this group' })).toBeInTheDocument()
  })

  it('adds to the group, not the root, from the group button', async () => {
    const { dispatch, state, user } = setup()
    const groupId = state.tree.children[1].id
    await user.click(screen.getByRole('button', { name: 'Add condition to this group' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'tree/addCondition', parentId: groupId })
  })
})

describe('FilterPanel hit-count toggle', () => {
  const label = /Show hit count per condition/

  it('offers the toggle unchecked by default', () => {
    setup()
    expect(screen.getByLabelText(label)).not.toBeChecked()
  })

  it('reflects the on state', () => {
    setup({ showHitCounts: true })
    expect(screen.getByLabelText(label)).toBeChecked()
  })

  it('dispatches on toggle', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByLabelText(label))
    expect(dispatch).toHaveBeenCalledWith({ type: 'hitCounts/toggle' })
  })
})

describe('FilterPanel empty-filter affordances', () => {
  const empty = { tree: emptyTree() }

  it('offers Clear filters when there are conditions', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Clear filters' })).toBeInTheDocument()
  })

  it('clears the whole filter', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Clear filters' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'tree/clear' })
  })

  // Nothing to save, nothing to clear, and nothing to count — so none of the three
  // appear. This is what makes "All companies" show a bare panel.
  it('hides Clear filters when the filter is empty', () => {
    setup(empty)
    expect(screen.queryByRole('button', { name: 'Clear filters' })).toBeNull()
  })

  it('hides Save as… when the filter is empty', () => {
    setup(empty)
    expect(screen.queryByRole('button', { name: 'Save as…' })).toBeNull()
  })

  it('hides the hit-count toggle when the filter is empty', () => {
    setup(empty)
    expect(screen.queryByLabelText(/Show hit count per condition/)).toBeNull()
  })

  it('still offers the add-condition actions when empty', () => {
    setup(empty)
    expect(screen.getByRole('button', { name: 'Add condition' })).toBeInTheDocument()
  })
})

describe('FilterPanel view actions', () => {
  const dirty = (over: Partial<AppState> = {}) => {
    const base = { ...initialState(), phase: 'ready' as const }
    return setup({ ...base, drafts: { v_icp: base.tree }, ...over })
  }

  it('marks the view as unsaved when it has a draft', () => {
    dirty()
    expect(screen.getByText('Unsaved')).toBeInTheDocument()
  })

  it('shows no unsaved marker on a clean view', () => {
    setup()
    expect(screen.queryByText('Unsaved')).toBeNull()
  })

  // Redesign: Save used to sit there disabled on a clean view. There is nothing to
  // save, so it is simply absent.
  it('offers no save control while the view is clean', () => {
    setup()
    expect(screen.queryByRole('button', { name: /^Save/ })).toBeNull()
  })

  it('offers a save control once there are unsaved edits', () => {
    dirty()
    expect(screen.getByRole('button', { name: /^Save/ })).toBeInTheDocument()
  })

  it('opens a menu rather than saving on the first click', async () => {
    const { dispatch, user } = dirty()
    await user.click(screen.getByRole('button', { name: /^Save/ }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'saveMenu/set', open: true })
    expect(dispatch).not.toHaveBeenCalledWith({ type: 'view/save' })
  })

  it('updates the open view from the menu', async () => {
    const { dispatch, user } = dirty({ saveMenuOpen: true })
    await user.click(screen.getByRole('menuitem', { name: /Update/ }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/save' })
  })

  it('names the view the update would overwrite', () => {
    dirty({ saveMenuOpen: true })
    expect(screen.getByRole('menuitem', { name: /ICP · Mid-market SaaS/ })).toBeInTheDocument()
  })

  it('branches to a new view from the menu', async () => {
    const { dispatch, user } = dirty({ saveMenuOpen: true })
    await user.click(screen.getByRole('menuitem', { name: /Save as a new view/ }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/startSave' })
  })

  it('offers Discard only when there are unsaved edits', () => {
    setup()
    expect(screen.queryByRole('button', { name: 'Discard' })).toBeNull()
  })

  it('discards unsaved edits', async () => {
    const { dispatch, user } = dirty()
    await user.click(screen.getByRole('button', { name: 'Discard' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/discard' })
  })

  // The escape-hatch view cannot be overwritten, so saving there can only mean
  // "make a new view" — no menu, straight to naming it. This is the bug that let
  // building a filter on "All companies" silently overwrite it.
  it('goes straight to naming a new view on the locked view', async () => {
    const base = { ...initialState(), phase: 'ready' as const }
    const { dispatch, user } = setup({
      ...base,
      activeView: 'v_all',
      drafts: { v_all: base.tree },
    })
    await user.click(screen.getByRole('button', { name: 'Save' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/startSave' })
    expect(dispatch).not.toHaveBeenCalledWith({ type: 'view/save' })
  })

  it('offers no update menu on the locked view', () => {
    const base = { ...initialState(), phase: 'ready' as const }
    setup({ ...base, activeView: 'v_all', drafts: { v_all: base.tree } })
    expect(screen.getByRole('button', { name: 'Save' })).not.toHaveAttribute('aria-haspopup')
  })
})
