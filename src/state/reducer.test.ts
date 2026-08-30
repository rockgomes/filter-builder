import { describe, expect, it } from 'vitest'
import { initialState, reducer, type AppState } from './reducer'
import { selectedCount } from '../domain/selection'
import type { Cond } from '../domain/types'

const ready = (over: Partial<AppState> = {}): AppState => ({
  ...initialState(), phase: 'ready', ...over,
})

describe('load lifecycle', () => {
  it('enters loading and records the requested size', () => {
    const s = reducer(ready(), { type: 'load/start', dataN: 50000 })
    expect(s.phase).toBe('loading')
    expect(s.dataN).toBe(50000)
  })

  it('clears the selection and scroll position when a new dataset is requested', () => {
    const before = ready({ scrollTop: 900 })
    const withSel = reducer(before, { type: 'selection/toggleWindow', windowIds: [1, 2] })
    const s = reducer(withSel, { type: 'load/start', dataN: 50000 })
    expect(selectedCount(s.selection)).toBe(0)
    expect(s.scrollTop).toBe(0)
  })

  it('bumps the data version on success so memos invalidate', () => {
    const s = reducer(ready(), { type: 'load/success' })
    expect(s.phase).toBe('ready')
    expect(s.dataVersion).toBe(1)
  })

  it('enters the error phase', () => {
    expect(reducer(ready(), { type: 'load/error' }).phase).toBe('error')
  })
})

describe('tree editing', () => {
  it('detaches the active view when a condition is added', () => {
    const s = reducer(ready(), { type: 'tree/addCondition', parentId: 'root' })
    expect(s.activeView).toBeNull()
    expect(s.tree.children).toHaveLength(4)
  })

  it('detaches the active view when a condition is patched', () => {
    const base = ready()
    const id = base.tree.children[0].id
    const s = reducer(base, { type: 'tree/patchCondition', id, patch: { value: 'Fintech' } })
    expect(s.activeView).toBeNull()
    expect((s.tree.children[0] as Cond).value).toBe('Fintech')
  })

  it('clearing filters selects the All companies view', () => {
    const s = reducer(ready(), { type: 'tree/clear' })
    expect(s.tree.children).toHaveLength(0)
    expect(s.activeView).toBe('v_all')
  })
})

describe('view selection', () => {
  it('activates the view and adopts a copy of its tree', () => {
    const s = reducer(ready(), { type: 'view/select', viewId: 'v_legacy' })
    expect(s.activeView).toBe('v_legacy')
    expect(JSON.stringify(s.tree)).toContain('region_emea')
  })

  it('never lets an edit reach back into the saved view', () => {
    const selected = reducer(ready(), { type: 'view/select', viewId: 'v_icp' })
    const edited = reducer(selected, {
      type: 'tree/patchCondition', id: selected.tree.children[0].id, patch: { value: 'Fintech' },
    })
    const saved = edited.views.find((v) => v.id === 'v_icp')!
    expect((saved.tree.children[0] as Cond).value).toBe('SaaS')
  })

  it('saves the current tree as a new active view', () => {
    const naming = reducer(ready(), { type: 'view/setName', name: 'My view' })
    const s = reducer({ ...naming, savingView: true }, { type: 'view/confirmSave' })
    expect(s.views.at(-1)!.name).toBe('My view')
    expect(s.activeView).toBe(s.views.at(-1)!.id)
    expect(s.savingView).toBe(false)
  })

  it('falls back to Untitled view for a blank name', () => {
    const s = reducer({ ...ready(), savingView: true, saveName: '   ' }, { type: 'view/confirmSave' })
    expect(s.views.at(-1)!.name).toBe('Untitled view')
  })

  it('snapshots the tree so later edits do not alter the saved view', () => {
    const saved = reducer({ ...ready(), savingView: true, saveName: 'Snap' }, { type: 'view/confirmSave' })
    const edited = reducer(saved, {
      type: 'tree/patchCondition', id: saved.tree.children[0].id, patch: { value: 'Fintech' },
    })
    expect((edited.views.at(-1)!.tree.children[0] as Cond).value).toBe('SaaS')
  })
})

describe('columns', () => {
  it('hides and shows a column', () => {
    const hidden = reducer(ready(), { type: 'columns/toggleVisible', key: 'stage' })
    expect(hidden.hidden.stage).toBe(true)
    expect(reducer(hidden, { type: 'columns/toggleVisible', key: 'stage' }).hidden.stage).toBe(false)
  })

  it('moves a column up and refuses to move the first one further', () => {
    const s = reducer(ready(), { type: 'columns/move', key: 'stage', direction: -1 })
    expect(s.colOrder[0]).toBe('stage')
    expect(reducer(s, { type: 'columns/move', key: 'stage', direction: -1 }).colOrder[0]).toBe('stage')
  })

  it('reorders by dropping one column onto another', () => {
    const s = reducer(ready(), { type: 'columns/reorder', from: 'owner', to: 'industry' })
    expect(s.colOrder[0]).toBe('owner')
  })

  it('enforces the minimum column width', () => {
    expect(reducer(ready(), { type: 'columns/resize', key: 'stage', width: 10 }).widths.stage).toBe(70)
  })

  it('resizes the sticky company column separately', () => {
    expect(reducer(ready(), { type: 'columns/resize', key: '__name', width: 300 }).nameWidth).toBe(300)
  })
})

describe('sorting', () => {
  it('appends a sort on shift click', () => {
    const s = reducer(ready(), { type: 'sort/toggle', key: 'name', append: true })
    expect(s.sorts).toHaveLength(2)
  })
})
