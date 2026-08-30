import { useFieldset } from './state/useFieldset'
import { formatSortSummary } from './domain/format'
import { TopBar } from './components/TopBar/TopBar'
import { FilterPanel } from './components/FilterPanel/FilterPanel'
import { StatusBar } from './components/StatusBar/StatusBar'
import styles from './App.module.css'

export function App() {
  const { state, dispatch, sorted, rows, filtered, ignoredCount, now } = useFieldset()

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

      <div className={styles.tableArea}>Table placeholder</div>

      <StatusBar rowCount={sorted.length} sortSummary={formatSortSummary(state.sorts)} />
    </div>
  )
}
