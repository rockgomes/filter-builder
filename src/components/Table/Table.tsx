import { useEffect, useMemo, useRef } from 'react'
import type { Action, AppState } from '../../state/reducer'
import type { WindowRange } from '../../domain/virtual'
import type { Company, ColumnDef } from '../../domain/types'
import { getColumn } from '../../domain/fields'
import { isSelected, selectedCount, canSelectAllMatching } from '../../domain/selection'
import { useRafScroll } from '../../hooks/useRafScroll'
import { useColumnResize } from '../../hooks/useColumnResize'
import { TableHeader } from './TableHeader'
import { TableRow } from './TableRow'
import { LoadingState } from './LoadingState'
import { ErrorState } from './ErrorState'
import { EmptyState } from './EmptyState'
import { BulkBar } from '../BulkBar/BulkBar'
import { Toast } from '../Toast/Toast'
import styles from './Table.module.css'

export interface TableProps {
  state: AppState
  dispatch: (action: Action) => void
  sorted: Company[]
  sortedIds: number[]
  range: WindowRange
  rowHeight: number
  /** True while the reconciliation banner (owned by the app shell, above the
   *  table) is shown; the bulk bar hides so the two never compete for
   *  attention. Defaults to false so this component stays self-contained for
   *  isolated tests and stories. */
  reconciling?: boolean
}

export function Table({
  state,
  dispatch,
  sorted,
  sortedIds,
  range,
  rowHeight,
  reconciling = false,
}: TableProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const onScroll = useRafScroll((scrollTop) => dispatch({ type: 'scroll/set', scrollTop }))
  const { startResize } = useColumnResize(dispatch)

  // The scroll container's height drives the virtual window, so it must be
  // measured with a ResizeObserver rather than window.innerHeight — the app
  // can be embedded in an iframe, where the two differ. The reducer no-ops
  // when the height is unchanged, so this observer can't feedback-loop.
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const observer = new ResizeObserver((entries) => {
      const height = entries[0]?.contentRect.height
      if (height !== undefined) dispatch({ type: 'viewport/set', height })
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [dispatch])

  const columns: ColumnDef[] = useMemo(
    () =>
      state.colOrder
        .filter((key) => !state.hidden[key])
        .map((key) => getColumn(key))
        .filter((column): column is ColumnDef => column !== undefined)
        .map((column) => ({ ...column, w: state.widths[column.key] ?? column.w })),
    [state.colOrder, state.hidden, state.widths]
  )

  const windowRows = sorted.slice(range.start, range.end)
  const windowIds = sortedIds.slice(range.start, range.end)
  const headerChecked = windowIds.length > 0 && windowIds.every((id) => isSelected(state.selection, id))

  // sorted is filtered rows reordered — it never drops or adds rows, so its
  // length is the current matching count the selection helpers need.
  const matchingCount = sorted.length
  const selCount = selectedCount(state.selection)
  const showSelectAll = canSelectAllMatching(state.selection, matchingCount)
  const bulkBarVisible = state.phase === 'ready' && selCount > 0 && !reconciling

  return (
    <div className={styles.tableArea}>
      {state.phase === 'ready' && (
        <div ref={scrollRef} className={styles.scrollContainer} onScroll={onScroll}>
          <TableHeader
            sorts={state.sorts}
            nameWidth={state.nameWidth}
            columns={columns}
            dispatch={dispatch}
            startResize={startResize}
            headerChecked={headerChecked}
            onToggleWindow={() => dispatch({ type: 'selection/toggleWindow', windowIds })}
          />

          {sorted.length > 0 ? (
            <>
              <div style={{ height: range.topPad }} />
              {windowRows.map((company, i) => (
                <TableRow
                  key={company.id}
                  company={company}
                  columns={columns}
                  nameWidth={state.nameWidth}
                  rowHeight={rowHeight}
                  absIndex={range.start + i}
                  selected={isSelected(state.selection, company.id)}
                  sortedIds={sortedIds}
                  dispatch={dispatch}
                />
              ))}
              <div style={{ height: range.botPad }} />
            </>
          ) : (
            <EmptyState onClear={() => dispatch({ type: 'tree/clear' })} />
          )}
        </div>
      )}

      {state.phase === 'loading' && <LoadingState count={state.dataN} />}

      {state.phase === 'error' && (
        <ErrorState onRetry={() => dispatch({ type: 'load/start', dataN: state.dataN })} />
      )}

      {bulkBarVisible && (
        <BulkBar
          count={selCount}
          showSelectAll={showSelectAll}
          matchingCount={matchingCount}
          onSelectAll={() => dispatch({ type: 'selection/selectAllMatching', matchingIds: sortedIds })}
          onAddToCrm={() =>
            dispatch({ type: 'toast/show', message: `${selCount} companies queued for CRM import` })
          }
          onExport={() => dispatch({ type: 'toast/show', message: `Exported ${selCount} rows to CSV` })}
          onClear={() => dispatch({ type: 'selection/clear' })}
        />
      )}

      {state.toast ? <Toast message={state.toast} /> : null}
    </div>
  )
}
