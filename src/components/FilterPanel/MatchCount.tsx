import type { Action } from '../../state/reducer'
import { SaveMenu } from './SaveMenu'
import { ConfirmPopover } from './ConfirmPopover'
import styles from './FilterPanel.module.css'

export interface MatchCountProps {
  count: number
  total: number
  ignoredCount: number
  saveMenuOpen: boolean
  /** False when the filter is empty: there is nothing to save. */
  hasConditions: boolean
  /** Name of the open view, or null when none is open. */
  activeViewName: string | null
  /** False for the locked escape-hatch view: saving there must create a new view. */
  canUpdateActiveView: boolean
  /** True when the open view has unsaved edits. */
  isDirty: boolean
  /** Which destructive action is awaiting confirmation, or null. */
  pendingConfirm: 'clear' | 'discard' | null
  dispatch: (action: Action) => void
}

export function MatchCount({
  count,
  total,
  ignoredCount,
  saveMenuOpen,
  hasConditions,
  activeViewName,
  canUpdateActiveView,
  isDirty,
  pendingConfirm,
  dispatch,
}: MatchCountProps) {
  return (
    <div className={styles.header}>
      {/* Which view you are in, whether it is saved, and the two things you can do
       * about that. All four are about the view, so they share a line, and none of
       * them is anchored to the panel's right edge: the column is resizable, and an
       * action pinned to a moving edge drifts away from everything it belongs to. */}
      {activeViewName ? (
        <div className={styles.viewRow}>
          <span className={styles.viewName}>{activeViewName}</span>

          {/* Grouped so the three wrap together. When the name and the actions
           * cannot share a line the block drops below the name intact, rather
           * than splitting Save from the state it acts on. */}
          {isDirty ? (
            <span className={styles.viewActions}>
              <span className={styles.unsavedTag}>Unsaved</span>

              {/* Saving is only offered when there is something to save. The button
               * stays put while the dialog is open — it is what the dialog came
               * from, so moving it would break the thread. */}
              {hasConditions ? (
                <SaveMenu
                  canUpdate={canUpdateActiveView}
                  viewName={activeViewName}
                  open={saveMenuOpen}
                  dispatch={dispatch}
                />
              ) : null}

              {/* Throws away every edit since the last save, with nothing to get
               * them back, so it asks first. The question hangs off this button
               * rather than the row: a question that opens somewhere else reads as
               * being about something else. */}
              <span className={styles.confirmAnchor}>
                <button
                  type="button"
                  className={styles.discardLink}
                  aria-haspopup="dialog"
                  aria-expanded={pendingConfirm === 'discard'}
                  onClick={(event) => {
                    event.stopPropagation()
                    dispatch({
                      type: 'confirm/set',
                      target: pendingConfirm === 'discard' ? null : 'discard',
                    })
                  }}
                >
                  Discard
                </button>

                {pendingConfirm === 'discard' ? (
                  <ConfirmPopover
                    question="Discard your unsaved edits? This cannot be undone."
                    confirmLabel="Discard edits"
                    align="right"
                    onConfirm={() => dispatch({ type: 'view/discard' })}
                    onCancel={() => dispatch({ type: 'confirm/set', target: null })}
                  />
                ) : null}
              </span>
            </span>
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
      </div>
    </div>
  )
}
