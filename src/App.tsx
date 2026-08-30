import { useFieldset } from './state/useFieldset'
import { formatSortSummary } from './domain/format'
import { TopBar } from './components/TopBar/TopBar'
import { FilterPanel } from './components/FilterPanel/FilterPanel'
import { Table } from './components/Table/Table'
import { StatusBar } from './components/StatusBar/StatusBar'
import styles from './App.module.css'

export function App() {
  const { state, dispatch, sorted, sortedIds, range, rowHeight, rows, filtered, ignoredCount, now } = useFieldset()

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

      {/* ReconciliationBanner arrives in a later task. */}
      <div />

      <Table
        state={state}
        dispatch={dispatch}
        sorted={sorted}
        sortedIds={sortedIds}
        range={range}
        rowHeight={rowHeight}
      />

      <StatusBar rowCount={sorted.length} sortSummary={formatSortSummary(state.sorts)} />
    </div>
  )
}
