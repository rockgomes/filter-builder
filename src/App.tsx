import { useFieldset } from './state/useFieldset'
import { useRailResize } from './hooks/useRailResize'
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
    state,
    dispatch,
    sorted,
    sortedIds,
    filtered,
    filterKey,
    range,
    rowHeight,
    rows,
    ignoredCount,
    now,
  } = useFieldset()
  const rail = useRailResize(dispatch)

  const reconciling = needsReconciliation(state.selection, filtered.length, filterKey)

  return (
    <div
      className={styles.app}
      onClick={() => {
        dispatch({ type: 'columns/setMenuOpen', open: false })
        dispatch({ type: 'saveMenu/set', open: false })
        dispatch({ type: 'viewMenu/set', open: false })
      }}
    >
      <TopBar state={state} dispatch={dispatch} />

      {/* Above the rail breakpoint .body is a row: the filter sits in a fixed-width
       * rail on the left and everything about the table stacks to its right. Below
       * it, .body is a column and the layout is exactly what it was before. */}
      <div className={styles.body} style={{ ['--rail-width' as string]: `${state.railWidth}px` }}>
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

        <div
          className={styles.railHandle}
          role="separator"
          aria-orientation="vertical"
          aria-label="Resize the filter panel"
          aria-valuenow={state.railWidth}
          aria-valuemin={rail.min}
          aria-valuemax={rail.max}
          tabIndex={0}
          onMouseDown={rail.startResize}
          onKeyDown={(event) => rail.onKeyDown(event, state.railWidth)}
        />

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
