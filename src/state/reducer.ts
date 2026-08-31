import { COLS, NAME_COL_DEFAULT_WIDTH, getField, defaultOp } from '../domain/fields'
import {
  addCondition, addGroup, cloneTree, emptyTree, icpTree, patchCondition,
  removeNode, seedViews, toggleNodeOp,
} from '../domain/tree'
import {
  clearSelection, emptySelection, keepAll, selectAllMatching, toggleRow,
  toggleWindow, trimToMatching, type SelectionState,
} from '../domain/selection'
import { toggleSort } from '../domain/sort'
import type { Cond, CompanyKey, Density, Group, Phase, SavedView, SortSpec } from '../domain/types'

export interface AppState {
  phase: Phase
  dataN: number
  dataVersion: number
  tree: Group
  views: SavedView[]
  activeView: string | null
  sorts: SortSpec[]
  colOrder: CompanyKey[]
  hidden: Record<string, boolean>
  widths: Record<string, number>
  nameWidth: number
  selection: SelectionState
  scrollTop: number
  viewportHeight: number
  density: Density
  /** Width of the filter rail in px. Only has an effect above the rail breakpoint. */
  railWidth: number
  /** Per-condition hit counts. Off by default — they are diagnostic, not part of the query. */
  showHitCounts: boolean
  /**
   * Unsaved edits, per view. A view is a document rather than a snapshot: edit it,
   * switch away, come back, and the edits are still here. Deliberately not
   * persisted — a half-finished filter reappearing after a reload is a surprise.
   */
  drafts: Record<string, Group>
  colMenuOpen: boolean
  saveMenuOpen: boolean
  savingView: boolean
  saveName: string
  toast: string | null
  /** Bumped on every `toast/show`, even when the message text is unchanged —
   *  raising the same message twice must restart the 2600ms auto-dismiss
   *  timer, and a timer effect can only key off something with a fresh
   *  identity each time (the message string alone doesn't change). */
  toastNonce: number
}

export type Action =
  | { type: 'load/start'; dataN: number }
  | { type: 'load/success' }
  | { type: 'load/error' }
  | { type: 'tree/addCondition'; parentId: string }
  | { type: 'tree/addGroup' }
  | { type: 'tree/patchCondition'; id: string; patch: Partial<Cond> }
  | { type: 'tree/removeNode'; id: string }
  | { type: 'tree/toggleOp'; id: string }
  | { type: 'tree/clear' }
  | { type: 'view/select'; viewId: string }
  | { type: 'view/startSave' }
  | { type: 'view/cancelSave' }
  | { type: 'view/setName'; name: string }
  | { type: 'view/confirmSave' }
  | { type: 'view/save' }
  | { type: 'view/discard' }
  | { type: 'view/delete'; viewId: string }
  | { type: 'view/rename'; viewId: string; name: string }
  | { type: 'view/togglePin'; viewId: string }
  | { type: 'sort/toggle'; key: CompanyKey; append: boolean }
  | { type: 'columns/toggleVisible'; key: string }
  | { type: 'columns/move'; key: string; direction: -1 | 1 }
  | { type: 'columns/reorder'; from: string; to: string }
  | { type: 'columns/resize'; key: string; width: number }
  | { type: 'columns/setMenuOpen'; open: boolean }
  | { type: 'saveMenu/set'; open: boolean }
  | { type: 'rail/resize'; width: number }
  | { type: 'hitCounts/toggle' }
  | { type: 'density/set'; density: Density }
  | { type: 'scroll/set'; scrollTop: number }
  | { type: 'viewport/set'; height: number }
  | { type: 'selection/toggleRow'; id: number; index: number; shiftKey: boolean; sortedIds: number[] }
  | { type: 'selection/toggleWindow'; windowIds: number[] }
  | { type: 'selection/selectAllMatching'; matchingIds: number[] }
  | { type: 'selection/clear' }
  | { type: 'selection/keep'; filterKey: string }
  | { type: 'selection/trim'; filteredIds: number[] }
  | { type: 'toast/show'; message: string }
  | { type: 'toast/hide' }

export const RAIL_DEFAULT_WIDTH = 500
export const RAIL_MIN_WIDTH = 300
export const RAIL_MAX_WIDTH = 680
const RAIL_STORAGE_KEY = 'fieldset.railWidth'
const HITS_STORAGE_KEY = 'fieldset.showHitCounts'

export function clampRailWidth(width: number): number {
  if (!Number.isFinite(width)) return RAIL_DEFAULT_WIDTH
  return Math.min(RAIL_MAX_WIDTH, Math.max(RAIL_MIN_WIDTH, Math.round(width)))
}

/**
 * The only persisted state in the app. Reads are wrapped because accessing
 * localStorage throws outright in some privacy modes, and a stored value can be
 * absent, non-numeric, or out of range if the clamp bounds ever change.
 */
export function readStoredRailWidth(): number {
  try {
    const raw = globalThis.localStorage?.getItem(RAIL_STORAGE_KEY)
    if (raw === null || raw === undefined) return RAIL_DEFAULT_WIDTH
    const parsed = Number(raw)
    if (!Number.isFinite(parsed)) return RAIL_DEFAULT_WIDTH
    return clampRailWidth(parsed)
  } catch {
    return RAIL_DEFAULT_WIDTH
  }
}

export function readStoredHitCounts(): boolean {
  try {
    return globalThis.localStorage?.getItem(HITS_STORAGE_KEY) === 'true'
  } catch {
    return false
  }
}

export function writeStoredHitCounts(show: boolean): void {
  try {
    globalThis.localStorage?.setItem(HITS_STORAGE_KEY, String(show))
  } catch {
    // Storage unavailable — the preference simply resets next load.
  }
}

export function writeStoredRailWidth(width: number): void {
  try {
    globalThis.localStorage?.setItem(RAIL_STORAGE_KEY, String(width))
  } catch {
    // Storage unavailable — the rail simply resets next load.
  }
}

export function initialState(): AppState {
  return {
    phase: 'loading',
    dataN: 5000,
    dataVersion: 0,
    tree: icpTree(),
    views: seedViews(),
    activeView: 'v_icp',
    sorts: [{ key: 'revenue', dir: 'desc' }],
    colOrder: COLS.map((c) => c.key),
    hidden: {},
    widths: {},
    nameWidth: NAME_COL_DEFAULT_WIDTH,
    selection: emptySelection(),
    scrollTop: 0,
    viewportHeight: 600,
    density: 'Compact',
    railWidth: readStoredRailWidth(),
    showHitCounts: readStoredHitCounts(),
    drafts: {},
    colMenuOpen: false,
    saveMenuOpen: false,
    savingView: false,
    saveName: '',
    toast: null,
    toastNonce: 0,
  }
}

/**
 * Editing the filter keeps the active view selected and records the edit as that
 * view's draft, so the view reads as "open and unsaved" rather than detaching.
 * Reconciliation re-arms either way, since the match set has moved.
 */
function afterTreeEdit(state: AppState, tree: Group): AppState {
  const next: AppState = {
    ...state,
    tree,
    selection: { ...state.selection, dismissKey: null },
  }
  if (!state.activeView) return next
  return { ...next, drafts: { ...state.drafts, [state.activeView]: tree } }
}

/** Removes one key from a record without the unused-binding that rest-destructuring leaves behind. */
function omitKey<T>(record: Record<string, T>, key: string): Record<string, T> {
  if (!(key in record)) return record
  const next = { ...record }
  delete next[key]
  return next
}

/** A view is dirty when it has a draft — an edit that has not been saved onto it. */
export function isViewDirty(state: AppState, viewId: string | null = state.activeView): boolean {
  return viewId !== null && viewId in state.drafts
}

const MIN_COL_WIDTH = 70

export function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'load/start':
      return {
        ...state,
        phase: 'loading',
        dataN: action.dataN,
        scrollTop: 0,
        selection: clearSelection(),
      }
    case 'load/success':
      return { ...state, phase: 'ready', dataVersion: state.dataVersion + 1 }
    case 'load/error':
      return { ...state, phase: 'error' }

    case 'tree/addCondition':
      return afterTreeEdit(state, addCondition(state.tree, action.parentId))
    case 'tree/addGroup':
      return afterTreeEdit(state, addGroup(state.tree))
    case 'tree/patchCondition':
      return afterTreeEdit(state, patchCondition(state.tree, action.id, action.patch))
    case 'tree/removeNode':
      return afterTreeEdit(state, removeNode(state.tree, action.id))
    case 'tree/toggleOp':
      return afterTreeEdit(state, toggleNodeOp(state.tree, action.id))
    case 'tree/clear': {
      // Clearing is not an edit of the current view — it moves you to the empty
      // view. Drafting an empty tree onto whatever you were on would mark that
      // view dirty for something you did not do to it.
      const drafts = omitKey(state.drafts, state.activeView ?? '')
      return {
        ...state,
        tree: emptyTree(),
        activeView: 'v_all',
        drafts,
        selection: { ...state.selection, dismissKey: null },
      }
    }

    case 'view/select': {
      const view = state.views.find((v) => v.id === action.viewId)
      if (!view) return state
      // Selecting the view you are already on is a no-op, not a discard.
      if (view.id === state.activeView) return state
      const draft = state.drafts[view.id]
      return {
        ...state,
        tree: draft ? cloneTree(draft) : cloneTree(view.tree),
        activeView: view.id,
        selection: { ...state.selection, dismissKey: null },
      }
    }

    case 'view/save': {
      if (!state.activeView) return state
      const target = state.views.find((v) => v.id === state.activeView)
      // Refused rather than silently applied: saving onto the escape-hatch view
      // would overwrite the one filter the user can always get back to. The UI
      // routes them to "save as new" instead.
      if (!target || target.locked) return state
      const activeView = state.activeView
      const drafts = omitKey(state.drafts, activeView)
      return {
        ...state,
        views: state.views.map((v) =>
          v.id === activeView ? { ...v, tree: cloneTree(state.tree), warn: undefined } : v
        ),
        drafts,
        toast: 'View saved',
        saveMenuOpen: false,
      }
    }

    case 'view/discard': {
      if (!state.activeView) return state
      const activeView = state.activeView
      const view = state.views.find((v) => v.id === activeView)
      if (!view) return state
      const drafts = omitKey(state.drafts, activeView)
      return {
        ...state,
        tree: cloneTree(view.tree),
        drafts,
        selection: { ...state.selection, dismissKey: null },
      }
    }

    case 'view/delete': {
      if (state.views.find((v) => v.id === action.viewId)?.locked) return state
      const drafts = omitKey(state.drafts, action.viewId)
      const views = state.views.filter((v) => v.id !== action.viewId)
      // The filter itself is untouched: your rows should not change because a
      // label went away. Only the association with the view is lost.
      return {
        ...state,
        views,
        drafts,
        activeView: state.activeView === action.viewId ? null : state.activeView,
      }
    }

    case 'view/rename': {
      const name = action.name.trim()
      if (!name) return state
      return {
        ...state,
        views: state.views.map((v) => (v.id === action.viewId ? { ...v, name } : v)),
      }
    }

    case 'view/togglePin': {
      if (state.views.find((v) => v.id === action.viewId)?.locked) return state
      return {
        ...state,
        views: state.views.map((v) => (v.id === action.viewId ? { ...v, pinned: !v.pinned } : v)),
      }
    }
    case 'view/startSave':
      return { ...state, savingView: true, saveName: '', saveMenuOpen: false }
    case 'view/cancelSave':
      return { ...state, savingView: false }
    case 'view/setName':
      return { ...state, saveName: action.name }
    case 'view/confirmSave': {
      const name = state.saveName.trim() || 'Untitled view'
      const id = `v_${Date.now()}_${state.views.length}`
      // The edits have found a home in the new view, so the view they came from
      // is no longer carrying them.
      const drafts = omitKey(state.drafts, state.activeView ?? '')
      return {
        ...state,
        drafts,
        views: [...state.views, { id, name, tree: cloneTree(state.tree), pinned: true }],
        activeView: id,
        savingView: false,
        saveName: '',
        toast: `View “${name}” saved`,
        toastNonce: state.toastNonce + 1,
      }
    }

    case 'sort/toggle':
      return { ...state, sorts: toggleSort(state.sorts, action.key, action.append) }

    case 'columns/toggleVisible':
      return { ...state, hidden: { ...state.hidden, [action.key]: !state.hidden[action.key] } }
    case 'columns/move': {
      const order = state.colOrder.slice()
      const i = order.indexOf(action.key as CompanyKey)
      const j = i + action.direction
      if (i < 0 || j < 0 || j >= order.length) return state
      ;[order[i], order[j]] = [order[j], order[i]]
      return { ...state, colOrder: order }
    }
    case 'columns/reorder': {
      if (action.from === action.to) return state
      const order = state.colOrder.filter((k) => k !== action.from)
      const at = order.indexOf(action.to as CompanyKey)
      if (at < 0) return state
      order.splice(at, 0, action.from as CompanyKey)
      return { ...state, colOrder: order }
    }
    case 'columns/resize': {
      const width = Math.max(MIN_COL_WIDTH, action.width)
      if (action.key === '__name') return { ...state, nameWidth: width }
      return { ...state, widths: { ...state.widths, [action.key]: width } }
    }
    case 'rail/resize': {
      const width = clampRailWidth(action.width)
      return state.railWidth === width ? state : { ...state, railWidth: width }
    }
    case 'hitCounts/toggle':
      return { ...state, showHitCounts: !state.showHitCounts }
    case 'saveMenu/set':
      return state.saveMenuOpen === action.open ? state : { ...state, saveMenuOpen: action.open }
    case 'columns/setMenuOpen':
      return { ...state, colMenuOpen: action.open }

    case 'density/set':
      return { ...state, density: action.density }
    case 'scroll/set':
      return { ...state, scrollTop: action.scrollTop }
    case 'viewport/set':
      return state.viewportHeight === action.height ? state : { ...state, viewportHeight: action.height }

    case 'selection/toggleRow':
      return {
        ...state,
        selection: toggleRow(state.selection, {
          id: action.id, index: action.index, shiftKey: action.shiftKey, sortedIds: action.sortedIds,
        }),
      }
    case 'selection/toggleWindow':
      return { ...state, selection: toggleWindow(state.selection, action.windowIds) }
    case 'selection/selectAllMatching':
      return { ...state, selection: selectAllMatching(state.selection, action.matchingIds) }
    case 'selection/clear':
      return { ...state, selection: clearSelection() }
    case 'selection/keep':
      return { ...state, selection: keepAll(state.selection, action.filterKey) }
    case 'selection/trim':
      return { ...state, selection: trimToMatching(state.selection, action.filteredIds) }

    case 'toast/show':
      return { ...state, toast: action.message, toastNonce: state.toastNonce + 1 }
    case 'toast/hide':
      return { ...state, toast: null }
  }
}

/** Field changes reset the operator and re-seed the value for the new type. */
export function fieldChangePatch(nextFieldKey: string): Partial<Cond> {
  const field = getField(nextFieldKey)
  if (!field) return { field: nextFieldKey, op: 'is', value: '', value2: '' }
  return {
    field: nextFieldKey,
    op: defaultOp(field.type),
    value: field.type === 'enum' ? (field.options?.[0] ?? '') : '',
    value2: '',
  }
}

/** Switching to or from a multi-select operator wraps or unwraps the value. */
export function opChangePatch(cond: Cond, nextOp: Cond['op'], fieldKey: string): Partial<Cond> {
  const multi = nextOp === 'any_of' || nextOp === 'not_any_of'
  const wasMulti = Array.isArray(cond.value)
  if (multi && !wasMulti) return { op: nextOp, value: cond.value ? [cond.value as string] : [] }
  if (!multi && wasMulti) {
    const first = (cond.value as string[])[0]
    const fallback = getField(fieldKey)?.options?.[0] ?? ''
    return { op: nextOp, value: first ?? fallback }
  }
  return { op: nextOp }
}
