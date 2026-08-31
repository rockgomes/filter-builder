import { useFieldset } from './state/useFieldset'
import { formatSortSummary } from './domain/format'
import { needsReconciliation, stillMatchingCount } from './domain/selection'
import { TopBar } from './components/TopBar/TopBar'
import { FilterPanel } from './components/FilterPanel/FilterPanel'
import { Table } from './components/Table/Table'
import { ReconciliationBanner } from './components/ReconciliationBanner/ReconciliationBanner'
import { StatusBar } from './components/StatusBar/StatusBar'
import styles from './App.module.css'

export function App() {
  const {
    state, dispatch, sorted, sortedIds, filtered, filterKey, range, rowHeight, rows, ignoredCount, now,
  } = useFieldset()

  const reconciling = needsReconciliation(state.selection, filtered.length, filterKey)

  return (
    <div className={styles.app} onClick={() => dispatch({ type: 'columns/setMenuOpen', open: false })}>
      <TopBar state={state} dispatch={dispatch} />

      {/* Above the rail breakpoint .body is a row: the filter sits in a fixed-width
        * rail on the left and everything about the table stacks to its right. Below
        * it, .body is a column and the layout is exactly what it was before. */}
      <div className={styles.body}>
        <div className={styles.rail}>
          <FilterPanel
            state={state}
            dispatch={dispatch}
            rows={rows}
            filtered={filtered}
            ignoredCount={ignoredCount}
            now={now}
          />
        </div>

        <div className={styles.main}>
          {reconciling && (
            <ReconciliationBanner
              snapCount={state.selection.snapCount}
              matchingCount={stillMatchingCount(state.selection, sortedIds)}
              onKeep={() => dispatch({ type: 'selection/keep', filterKey })}
              onTrim={() => dispatch({ type: 'selection/trim', filteredIds: sortedIds })}
              onClear={() => dispatch({ type: 'selection/clear' })}
            />
          )}

          <Table
            state={state}
            dispatch={dispatch}
            sorted={sorted}
            sortedIds={sortedIds}
            range={range}
            rowHeight={rowHeight}
            reconciling={reconciling}
          />
        </div>
      </div>

      <StatusBar rowCount={sorted.length} sortSummary={formatSortSummary(state.sorts)} />
    </div>
  )
}
