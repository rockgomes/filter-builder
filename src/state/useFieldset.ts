import { useEffect, useMemo, useReducer, useRef } from 'react'
import { filterRows, countIgnoredConditions } from '../domain/filter'
import { generateCompanies } from '../domain/generateCompanies'
import { sortRows } from '../domain/sort'
import { computeWindow } from '../domain/virtual'
import { ROW_HEIGHT, type Company } from '../domain/types'
import { initialState, reducer } from './reducer'

const LOAD_MS: Record<number, number> = { 5000: 700, 50000: 1100 }

export function useFieldset() {
  const [state, dispatch] = useReducer(reducer, undefined, initialState)
  const rowsRef = useRef<Company[]>([])
  // Date.now() is captured once, on mount, as the stable "now" the pure domain layer
  // evaluates date-relative filters against; it is not re-read on every render.
  // eslint-disable-next-line react-hooks/purity
  const nowRef = useRef(Date.now())

  useEffect(() => {
    if (state.phase !== 'loading') return
    const delay = LOAD_MS[state.dataN] ?? 900
    const timer = setTimeout(() => {
      nowRef.current = Date.now()
      rowsRef.current = generateCompanies(state.dataN, { now: nowRef.current })
      dispatch({ type: 'load/success' })
    }, delay)
    return () => clearTimeout(timer)
  }, [state.phase, state.dataN])

  useEffect(() => {
    if (!state.toast) return
    const timer = setTimeout(() => dispatch({ type: 'toast/hide' }), 2600)
    return () => clearTimeout(timer)
  }, [state.toast])

  // rowsRef holds the loaded dataset; it only changes on load/success (a dispatch,
  // which re-renders), so reading it here is safe despite the lint rule's generality.
  // eslint-disable-next-line react-hooks/refs
  const rows = rowsRef.current
  const filterKey = useMemo(
    () => `${state.dataVersion}|${JSON.stringify(state.tree)}`,
    [state.dataVersion, state.tree]
  )

  const filtered = useMemo(
    // nowRef is a stable snapshot captured at load time (see above), not a live read.
    // eslint-disable-next-line react-hooks/refs
    () => (state.phase === 'ready' ? filterRows(rows, state.tree, nowRef.current) : []),
    // filterKey encodes both dependencies; rows changes only with dataVersion.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [filterKey, state.phase]
  )

  const sorted = useMemo(() => sortRows(filtered, state.sorts), [filtered, state.sorts])
  const sortedIds = useMemo(() => sorted.map((r) => r.id), [sorted])
  const ignoredCount = useMemo(() => countIgnoredConditions(state.tree), [state.tree])

  const rowHeight = ROW_HEIGHT[state.density]
  const range = useMemo(
    () => computeWindow({
      count: sorted.length,
      rowHeight,
      viewportHeight: state.viewportHeight,
      scrollTop: state.scrollTop,
    }),
    [sorted.length, rowHeight, state.viewportHeight, state.scrollTop]
  )

  // Both rows and nowRef.current are stable snapshots (see above), safe to expose as-is.
  // eslint-disable-next-line react-hooks/refs
  return { state, dispatch, rows, filtered, sorted, sortedIds, filterKey, ignoredCount, rowHeight, range, now: nowRef.current }
}
