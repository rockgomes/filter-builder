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

      <FilterPanel
        state={state}
        dispatch={dispatch}
        rows={rows}
        filtered={filtered}
        ignoredCount={ignoredCount}
        now={now}
      />

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

      <StatusBar rowCount={sorted.length} sortSummary={formatSortSummary(state.sorts)} />
    </div>
  )
}
