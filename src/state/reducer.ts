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
  colMenuOpen: boolean
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
  | { type: 'sort/toggle'; key: CompanyKey; append: boolean }
  | { type: 'columns/toggleVisible'; key: string }
  | { type: 'columns/move'; key: string; direction: -1 | 1 }
  | { type: 'columns/reorder'; from: string; to: string }
  | { type: 'columns/resize'; key: string; width: number }
  | { type: 'columns/setMenuOpen'; open: boolean }
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
    colMenuOpen: false,
    savingView: false,
    saveName: '',
    toast: null,
    toastNonce: 0,
  }
}

/** Editing the filter always detaches the active view and re-arms reconciliation. */
function afterTreeEdit(state: AppState, tree: Group): AppState {
  return {
    ...state,
    tree,
    activeView: null,
    selection: { ...state.selection, dismissKey: null },
  }
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
    case 'tree/clear':
      return { ...afterTreeEdit(state, emptyTree()), activeView: 'v_all' }

    case 'view/select': {
      const view = state.views.find((v) => v.id === action.viewId)
      if (!view) return state
      return {
        ...state,
        tree: cloneTree(view.tree),
        activeView: view.id,
        selection: { ...state.selection, dismissKey: null },
      }
    }
    case 'view/startSave':
      return { ...state, savingView: true, saveName: '' }
    case 'view/cancelSave':
      return { ...state, savingView: false }
    case 'view/setName':
      return { ...state, saveName: action.name }
    case 'view/confirmSave': {
      const name = state.saveName.trim() || 'Untitled view'
      const id = `v_${Date.now()}_${state.views.length}`
      return {
        ...state,
        views: [...state.views, { id, name, tree: cloneTree(state.tree) }],
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
