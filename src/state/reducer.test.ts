import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  MAX_VIEW_NAME_LENGTH,
  RAIL_DEFAULT_WIDTH,
  RAIL_MAX_WIDTH,
  RAIL_MIN_WIDTH,
  clampRailWidth,
  initialState,
  reducer,
  isViewDirty,
  readStoredRailWidth,
  type AppState,
} from './reducer'
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
  // Deliberate model change: editing used to detach the view entirely. A view is
  // now a document you edit and save, so it stays selected and goes dirty instead.
  it('keeps the active view selected when a condition is added, and marks it dirty', () => {
    const s = reducer(ready(), { type: 'tree/addCondition', parentId: 'root' })
    expect(s.activeView).toBe('v_icp')
    expect(isViewDirty(s)).toBe(true)
    expect(s.tree.children).toHaveLength(4)
  })

  it('keeps the active view selected when a condition is patched, and marks it dirty', () => {
    const base = ready()
    const id = base.tree.children[0].id
    const s = reducer(base, { type: 'tree/patchCondition', id, patch: { value: 'Fintech' } })
    expect(s.activeView).toBe('v_icp')
    expect(isViewDirty(s)).toBe(true)
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

describe('rail width', () => {
  it('starts at the default width', () => {
    expect(initialState().railWidth).toBe(RAIL_DEFAULT_WIDTH)
  })

  it('resizes to an exact width', () => {
    expect(reducer(ready(), { type: 'rail/resize', width: 520 }).railWidth).toBe(520)
  })

  it('clamps below the minimum', () => {
    expect(reducer(ready(), { type: 'rail/resize', width: 10 }).railWidth).toBe(RAIL_MIN_WIDTH)
  })

  it('clamps above the maximum', () => {
    expect(reducer(ready(), { type: 'rail/resize', width: 5000 }).railWidth).toBe(RAIL_MAX_WIDTH)
  })

  it('rounds sub-pixel drag values', () => {
    expect(reducer(ready(), { type: 'rail/resize', width: 512.6 }).railWidth).toBe(513)
  })

  it('returns the same state object when the width is unchanged', () => {
    const before = ready()
    expect(reducer(before, { type: 'rail/resize', width: before.railWidth })).toBe(before)
  })
})

describe('clampRailWidth', () => {
  it('rejects values that are not finite', () => {
    expect(clampRailWidth(Number.NaN)).toBe(RAIL_DEFAULT_WIDTH)
    expect(clampRailWidth(Number.POSITIVE_INFINITY)).toBe(RAIL_DEFAULT_WIDTH)
  })
})

describe('readStoredRailWidth', () => {
  const store = (value: string | null) => {
    vi.stubGlobal('localStorage', {
      getItem: () => value,
      setItem: () => {},
    })
  }

  afterEach(() => vi.unstubAllGlobals())

  it('uses a stored width', () => {
    store('530')
    expect(readStoredRailWidth()).toBe(530)
  })

  it('falls back when nothing is stored', () => {
    store(null)
    expect(readStoredRailWidth()).toBe(RAIL_DEFAULT_WIDTH)
  })

  it('falls back on a corrupt value', () => {
    store('not-a-number')
    expect(readStoredRailWidth()).toBe(RAIL_DEFAULT_WIDTH)
  })

  it('clamps a stored value that is out of range', () => {
    store('9999')
    expect(readStoredRailWidth()).toBe(RAIL_MAX_WIDTH)
  })

  it('falls back when localStorage itself throws', () => {
    vi.stubGlobal('localStorage', {
      get getItem(): never {
        throw new Error('access denied')
      },
    })
    expect(readStoredRailWidth()).toBe(RAIL_DEFAULT_WIDTH)
  })
})

describe('hit-count preference', () => {
  it('is off by default', () => {
    expect(initialState().showHitCounts).toBe(false)
  })

  it('toggles both ways', () => {
    const on = reducer(ready(), { type: 'hitCounts/toggle' })
    expect(on.showHitCounts).toBe(true)
    expect(reducer(on, { type: 'hitCounts/toggle' }).showHitCounts).toBe(false)
  })
})

describe('views as documents', () => {
  const editActive = (state: AppState, value: string) =>
    reducer(state, {
      type: 'tree/patchCondition',
      id: state.tree.children[0].id,
      patch: { value },
    })

  it('is clean before anything is edited', () => {
    expect(isViewDirty(ready())).toBe(false)
  })

  it('keeps unsaved edits when you switch away and come back', () => {
    const edited = editActive(ready(), 'Fintech')
    const away = reducer(edited, { type: 'view/select', viewId: 'v_ncrm' })
    expect((away.tree.children[0] as Cond).field).toBe('inCRM')

    const back = reducer(away, { type: 'view/select', viewId: 'v_icp' })
    expect((back.tree.children[0] as Cond).value).toBe('Fintech')
    expect(isViewDirty(back)).toBe(true)
  })

  it('does not discard edits when the active view is reselected', () => {
    const edited = editActive(ready(), 'Fintech')
    const again = reducer(edited, { type: 'view/select', viewId: 'v_icp' })
    expect((again.tree.children[0] as Cond).value).toBe('Fintech')
  })

  it('save writes the draft onto the view and cleans it', () => {
    const saved = reducer(editActive(ready(), 'Fintech'), { type: 'view/save' })
    expect(isViewDirty(saved)).toBe(false)
    const stored = saved.views.find((v) => v.id === 'v_icp')!
    expect((stored.tree.children[0] as Cond).value).toBe('Fintech')
  })

  it('save survives a round trip away and back', () => {
    const saved = reducer(editActive(ready(), 'Fintech'), { type: 'view/save' })
    const away = reducer(saved, { type: 'view/select', viewId: 'v_ncrm' })
    const back = reducer(away, { type: 'view/select', viewId: 'v_icp' })
    expect((back.tree.children[0] as Cond).value).toBe('Fintech')
    expect(isViewDirty(back)).toBe(false)
  })

  it('discard restores the stored tree and cleans the view', () => {
    const discarded = reducer(editActive(ready(), 'Fintech'), { type: 'view/discard' })
    expect((discarded.tree.children[0] as Cond).value).toBe('SaaS')
    expect(isViewDirty(discarded)).toBe(false)
  })

  it('save as gives the edits a home, so the source view is no longer dirty', () => {
    const edited = editActive(ready(), 'Fintech')
    const saved = reducer({ ...edited, savingView: true, saveName: 'Branch' }, { type: 'view/confirmSave' })
    expect(isViewDirty(saved, 'v_icp')).toBe(false)
    expect(saved.views.at(-1)!.name).toBe('Branch')
    expect(saved.activeView).toBe(saved.views.at(-1)!.id)
  })

  it('clearing filters does not dirty the view you were on', () => {
    const cleared = reducer(ready(), { type: 'tree/clear' })
    expect(isViewDirty(cleared, 'v_icp')).toBe(false)
    expect(cleared.activeView).toBe('v_all')
    expect(cleared.tree.children).toHaveLength(0)
  })
})

describe('deleting, renaming and pinning views', () => {
  it('deleting the active view clears the label but leaves the filter alone', () => {
    const before = ready()
    const after = reducer(before, { type: 'view/delete', viewId: 'v_icp' })
    expect(after.activeView).toBeNull()
    expect(after.tree).toEqual(before.tree)
    expect(after.views.some((v) => v.id === 'v_icp')).toBe(false)
  })

  it('deleting another view leaves the active one selected', () => {
    const after = reducer(ready(), { type: 'view/delete', viewId: 'v_ncrm' })
    expect(after.activeView).toBe('v_icp')
    expect(after.views).toHaveLength(3)
  })

  it('deleting a view drops its draft rather than leaking it', () => {
    const edited = reducer(ready(), {
      type: 'tree/patchCondition',
      id: ready().tree.children[0].id,
      patch: { value: 'Fintech' },
    })
    const deleted = reducer(edited, { type: 'view/delete', viewId: 'v_icp' })
    expect(Object.keys(deleted.drafts)).toHaveLength(0)
  })

  it('renames without touching the tree', () => {
    // One base state: icpTree() mints fresh ids per call, so two ready() calls can
    // never compare equal.
    const base = ready()
    const before = base.views.find((v) => v.id === 'v_icp')!.tree
    const renamed = reducer(base, { type: 'view/rename', viewId: 'v_icp', name: 'ICP v2' })
    const view = renamed.views.find((v) => v.id === 'v_icp')!
    expect(view.name).toBe('ICP v2')
    expect(view.tree).toEqual(before)
  })

  it('refuses a blank rename', () => {
    const before = ready()
    expect(reducer(before, { type: 'view/rename', viewId: 'v_icp', name: '   ' })).toBe(before)
  })

  it('seeded views start pinned so the top bar is unchanged', () => {
    expect(initialState().views.every((v) => v.pinned)).toBe(true)
  })

  it('toggles pinning both ways', () => {
    const off = reducer(ready(), { type: 'view/togglePin', viewId: 'v_icp' })
    expect(off.views.find((v) => v.id === 'v_icp')!.pinned).toBe(false)
    const on = reducer(off, { type: 'view/togglePin', viewId: 'v_icp' })
    expect(on.views.find((v) => v.id === 'v_icp')!.pinned).toBe(true)
  })

  // Pinning is a deliberate act in the Saved views menu, not a side effect of
  // saving. A new view goes to the menu and stays there until you pin it.
  it('a newly saved view is not pinned', () => {
    const saved = reducer({ ...ready(), savingView: true, saveName: 'New' }, { type: 'view/confirmSave' })
    expect(saved.views.at(-1)!.pinned).toBeFalsy()
  })
})

describe('switching views abandons an in-progress save', () => {
  const naming = () => ({ ...ready(), savingView: true, saveName: 'Half typed', saveMenuOpen: true })

  it('closes the naming input', () => {
    const switched = reducer(naming(), { type: 'view/select', viewId: 'v_ncrm' })
    expect(switched.savingView).toBe(false)
  })

  it('drops the half-typed name rather than carrying it to the next view', () => {
    const switched = reducer(naming(), { type: 'view/select', viewId: 'v_ncrm' })
    expect(switched.saveName).toBe('')
  })

  it('closes the save menu too', () => {
    const switched = reducer(naming(), { type: 'view/select', viewId: 'v_ncrm' })
    expect(switched.saveMenuOpen).toBe(false)
  })

  it('leaves the naming alone when the same view is reselected', () => {
    const before = naming()
    expect(reducer(before, { type: 'view/select', viewId: 'v_icp' })).toBe(before)
  })
})

describe('view name length', () => {
  const long = 'x'.repeat(120)

  it('caps a new view name', () => {
    const saved = reducer({ ...ready(), savingView: true, saveName: long }, { type: 'view/confirmSave' })
    expect(saved.views.at(-1)!.name).toHaveLength(MAX_VIEW_NAME_LENGTH)
  })

  it('caps a rename', () => {
    const renamed = reducer(ready(), { type: 'view/rename', viewId: 'v_icp', name: long })
    expect(renamed.views.find((v) => v.id === 'v_icp')!.name).toHaveLength(MAX_VIEW_NAME_LENGTH)
  })

  // The inputs carry maxLength too, but the reducer is the rule — anything that
  // dispatches a rename is bound by it, not just the two inputs that happen to exist.
  it('leaves a name within the limit untouched', () => {
    const renamed = reducer(ready(), { type: 'view/rename', viewId: 'v_icp', name: 'Mid-market SaaS, EMEA' })
    expect(renamed.views.find((v) => v.id === 'v_icp')!.name).toBe('Mid-market SaaS, EMEA')
  })
})
