import { useEffect, useMemo, useRef } from 'react'
import type { Action, AppState } from '../../state/reducer'
import type { WindowRange } from '../../domain/virtual'
import type { Company, ColumnDef } from '../../domain/types'
import { getColumn } from '../../domain/fields'
import { isSelected } from '../../domain/selection'
import { useRafScroll } from '../../hooks/useRafScroll'
import { useColumnResize } from '../../hooks/useColumnResize'
import { TableHeader } from './TableHeader'
import { TableRow } from './TableRow'
import styles from './Table.module.css'

export interface TableProps {
  state: AppState
  dispatch: (action: Action) => void
  sorted: Company[]
  // Reserved for row-range selection, wired up in Task 10.
  sortedIds: number[]
  range: WindowRange
  rowHeight: number
}

export function Table({ state, dispatch, sorted, range, rowHeight }: TableProps) {
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

  return (
    <div ref={scrollRef} className={styles.scrollContainer} onScroll={onScroll}>
      <TableHeader
        sorts={state.sorts}
        nameWidth={state.nameWidth}
        columns={columns}
        dispatch={dispatch}
        startResize={startResize}
      />

      {windowRows.length > 0 ? (
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
            />
          ))}
          <div style={{ height: range.botPad }} />
        </>
      ) : null}
    </div>
  )
}
