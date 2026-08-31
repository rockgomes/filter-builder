import type { Action } from '../../state/reducer'
import styles from './FilterPanel.module.css'

export interface SaveMenuProps {
  /** False for the locked escape-hatch view, or when no view is open. */
  canUpdate: boolean
  /** Name of the open view, so the update option says what it will overwrite. */
  viewName: string | null
  open: boolean
  dispatch: (action: Action) => void
}

/**
 * One save control rather than two buttons. With nowhere to update — the locked
 * "All companies" view, or no view at all — it goes straight to naming a new
 * view, because that is the only thing saving could mean. Otherwise it opens a
 * menu so updating and branching are one deliberate choice apart.
 */
export function SaveMenu({ canUpdate, viewName, open, dispatch }: SaveMenuProps) {
  if (!canUpdate) {
    return (
      <button
        type="button"
        className={styles.saveBtn}
        onClick={() => dispatch({ type: 'view/startSave' })}
      >
        Save
      </button>
    )
  }

  return (
    <div className={styles.saveMenuWrap}>
      <button
        type="button"
        className={styles.saveBtn}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={(event) => {
          event.stopPropagation()
          dispatch({ type: 'saveMenu/set', open: !open })
        }}
      >
        Save <span aria-hidden="true">▾</span>
      </button>

      {open ? (
        <div className={styles.saveMenu} role="menu" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            role="menuitem"
            className={styles.saveMenuItem}
            onClick={() => dispatch({ type: 'view/save' })}
          >
            Update “{viewName}”
          </button>
          <button
            type="button"
            role="menuitem"
            className={styles.saveMenuItem}
            onClick={() => dispatch({ type: 'view/startSave' })}
          >
            Save as a new view
          </button>
        </div>
      ) : null}
    </div>
  )
}
