import type { Action } from '../../state/reducer'
import { SaveViewInline } from './SaveViewInline'
import styles from './FilterPanel.module.css'

export interface MatchCountProps {
  count: number
  total: number
  ignoredCount: number
  savingView: boolean
  saveName: string
  /** False when the filter is empty: there is nothing to save and nothing to clear. */
  hasConditions: boolean
  dispatch: (action: Action) => void
}

export function MatchCount({
  count,
  total,
  ignoredCount,
  savingView,
  saveName,
  hasConditions,
  dispatch,
}: MatchCountProps) {
  return (
    <div className={styles.matchRow}>
      <span className={styles.matchCount}>{count}</span>
      <span className={styles.matchLabel}>of {total} match</span>
      {ignoredCount > 0 ? (
        <span className={styles.ignoredNote}>
          {ignoredCount} condition{ignoredCount === 1 ? '' : 's'} ignored (deleted field)
        </span>
      ) : null}
      <div className={styles.spacer} />
      {/* An empty filter has nothing to save and nothing to clear, so neither
       * action appears — which is also why "All companies" shows no buttons. */}
      {savingView ? (
        <SaveViewInline saveName={saveName} dispatch={dispatch} />
      ) : hasConditions ? (
        <>
          <button
            type="button"
            className={styles.clearBtn}
            onClick={() => dispatch({ type: 'tree/clear' })}
          >
            Clear filters
          </button>
          <button
            type="button"
            className={styles.saveBtn}
            onClick={() => dispatch({ type: 'view/startSave' })}
          >
            Save as view
          </button>
        </>
      ) : null}
    </div>
  )
}
