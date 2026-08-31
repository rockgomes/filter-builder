import type { Action } from '../../state/reducer'
import { SaveMenu } from './SaveMenu'
import { SaveViewInline } from './SaveViewInline'
import styles from './FilterPanel.module.css'

export interface MatchCountProps {
  count: number
  total: number
  ignoredCount: number
  savingView: boolean
  saveName: string
  saveMenuOpen: boolean
  /** False when the filter is empty: there is nothing to save. */
  hasConditions: boolean
  /** Name of the open view, or null when none is open. */
  activeViewName: string | null
  /** False for the locked escape-hatch view: saving there must create a new view. */
  canUpdateActiveView: boolean
  /** True when the open view has unsaved edits. */
  isDirty: boolean
  dispatch: (action: Action) => void
}

export function MatchCount({
  count,
  total,
  ignoredCount,
  savingView,
  saveName,
  saveMenuOpen,
  hasConditions,
  activeViewName,
  canUpdateActiveView,
  isDirty,
  dispatch,
}: MatchCountProps) {
  return (
    <div className={styles.header}>
      {/* Which view you are in, and whether it is saved — both facts about the view,
       * so they sit together on their own line. That leaves the count row for the
       * count and the one action. */}
      {activeViewName ? (
        <div className={styles.viewRow}>
          <span className={styles.viewName}>{activeViewName}</span>
          {isDirty ? (
            <>
              <span className={styles.unsavedTag}>Unsaved</span>
              <button
                type="button"
                className={styles.discardLink}
                onClick={() => dispatch({ type: 'view/discard' })}
              >
                Discard
              </button>
            </>
          ) : null}
        </div>
      ) : null}

      <div className={styles.matchRow}>
        <span className={styles.matchCount}>{count}</span>
        <span className={styles.matchLabel}>of {total} match</span>

        {ignoredCount > 0 ? (
          <span className={styles.ignoredNote}>
            {ignoredCount} condition{ignoredCount === 1 ? '' : 's'} ignored (deleted field)
          </span>
        ) : null}

        <div className={styles.spacer} />

        {/* Saving is only offered when there is something unsaved to save. */}
        {hasConditions && isDirty && !savingView ? (
          <SaveMenu
            canUpdate={canUpdateActiveView}
            viewName={activeViewName}
            open={saveMenuOpen}
            dispatch={dispatch}
          />
        ) : null}
      </div>

      {savingView ? <SaveViewInline saveName={saveName} dispatch={dispatch} /> : null}
    </div>
  )
}
