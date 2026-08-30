import { useFieldset } from './state/useFieldset'
import { formatSortSummary } from './domain/format'
import { TopBar } from './components/TopBar/TopBar'
import { StatusBar } from './components/StatusBar/StatusBar'
import styles from './App.module.css'

export function App() {
  const { state, dispatch, sorted } = useFieldset()

  return (
    <div className={styles.app} onClick={() => dispatch({ type: 'columns/setMenuOpen', open: false })}>
      <TopBar state={state} dispatch={dispatch} />

      {/* FilterPanel arrives in a later task. */}
      <div>Filter panel placeholder</div>

      {/* ReconciliationBanner arrives in a later task. */}
      <div />

      <div className={styles.tableArea}>Table placeholder</div>

      <StatusBar rowCount={sorted.length} sortSummary={formatSortSummary(state.sorts)} />
    </div>
  )
}
