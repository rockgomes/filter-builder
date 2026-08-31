import type { Action } from '../../state/reducer'
import { SaveViewInline } from './SaveViewInline'
import styles from './FilterPanel.module.css'

export interface MatchCountProps {
  count: number
  total: number
  ignoredCount: number
  savingView: boolean
  saveName: string
  dispatch: (action: Action) => void
}

export function MatchCount({ count, total, ignoredCount, savingView, saveName, dispatch }: MatchCountProps) {
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
      {savingView ? (
        <SaveViewInline saveName={saveName} dispatch={dispatch} />
      ) : (
        <button type="button" className={styles.saveBtn} onClick={() => dispatch({ type: 'view/startSave' })}>
          Save as view
        </button>
      )}
    </div>
  )
}
