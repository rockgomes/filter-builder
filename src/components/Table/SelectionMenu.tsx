import type { Action } from '../../state/reducer'
import { SELECT_BATCH } from '../../state/reducer'
import styles from './SelectionMenu.module.css'

export interface SelectionMenuProps {
  /** How many rows are selected right now, across the whole matching set. */
  selectedCount: number
  /** How many rows the current filter matches. */
  matchingCount: number
  /** Ids of every matching row, in sort order, so the batch option can take a slice. */
  matchingIds: number[]
  open: boolean
  dispatch: (action: Action) => void
}

/**
 * The header control is a menu, not a checkbox.
 *
 * As a checkbox it was a guess: it selected the rows in the virtual window, which is
 * a number nobody can see (it includes overscan rows below the fold), while the
 * gesture reads universally as "select everything". Two very different amounts, one
 * ambiguous click, on the only control in the app that can put thousands of rows
 * into a bulk action.
 *
 * So it states the amounts and makes you pick one. It is a real menu button rather
 * than a checkbox that happens to open a popover: a checkbox that does not toggle
 * announces itself as something it is not.
 */
export function SelectionMenu({
  selectedCount,
  matchingCount,
  matchingIds,
  open,
  dispatch,
}: SelectionMenuProps) {
  const all = matchingCount > 0 && selectedCount >= matchingCount
  const some = selectedCount > 0 && !all
  const close = () => dispatch({ type: 'selMenu/set', open: false })

  const state = all
    ? `all ${matchingCount} rows selected`
    : some
      ? `${selectedCount} of ${matchingCount} rows selected`
      : 'no rows selected'

  return (
    <div className={styles.wrap}>
      <button
        type="button"
        className={styles.trigger}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Selection: ${state}`}
        onClick={(event) => {
          event.stopPropagation()
          dispatch({ type: 'selMenu/set', open: !open })
        }}
      >
        {/* Drawn rather than a real checkbox, because it reports a state instead of
         * offering a toggle. */}
        <span
          className={`${styles.box} ${all ? styles.boxAll : ''} ${some ? styles.boxSome : ''}`.trim()}
          aria-hidden="true"
        >
          {all ? '✓' : some ? '–' : ''}
        </span>
      </button>

      {open ? (
        <div
          className={styles.menu}
          role="menu"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => {
            if (event.key === 'Escape') close()
          }}
        >
          {/* Hidden when it would select the same rows as the option below it. */}
          {matchingCount > SELECT_BATCH ? (
            <button
              type="button"
              role="menuitem"
              className={styles.item}
              onClick={() =>
                dispatch({
                  type: 'selection/selectFirst',
                  ids: matchingIds.slice(0, SELECT_BATCH),
                })
              }
            >
              Select the first {SELECT_BATCH}
            </button>
          ) : null}

          <button
            type="button"
            role="menuitem"
            className={styles.item}
            onClick={() => dispatch({ type: 'selection/selectAllMatching', matchingIds })}
          >
            Select all {matchingCount} matching
          </button>

          {selectedCount > 0 ? (
            <button
              type="button"
              role="menuitem"
              className={styles.item}
              onClick={() => dispatch({ type: 'selection/clear' })}
            >
              Deselect all {selectedCount}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  )
}
