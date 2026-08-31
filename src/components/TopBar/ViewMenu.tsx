import { useState } from 'react'
import type { Action } from '../../state/reducer'
import type { SavedView } from '../../domain/types'
import styles from './ViewMenu.module.css'

export interface ViewMenuProps {
  views: SavedView[]
  activeView: string | null
  /** Id of the view awaiting delete confirmation, or null. */
  pendingDelete: string | null
  onClose: () => void
  dispatch: (action: Action) => void
}

/**
 * Every view, pinned or not. Pinned ones also appear as chips in the bar, but this
 * is the only place the rest can be reached — so it is not optional chrome once a
 * few views exist.
 *
 * Deleting asks first, inline in the row rather than in a dialog: the confirmation
 * names the view, and the destructive choice is the one you have to move to.
 */
export function ViewMenu({ views, activeView, pendingDelete, onClose, dispatch }: ViewMenuProps) {
  const [renaming, setRenaming] = useState<string | null>(null)
  const [draftName, setDraftName] = useState('')

  const commitRename = (viewId: string) => {
    dispatch({ type: 'view/rename', viewId, name: draftName })
    setRenaming(null)
  }

  return (
    <div
      className={styles.menu}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div className={styles.header}>saved views</div>

      {views.map((view) => {
        if (renaming === view.id) {
          return (
            <div key={view.id} className={styles.row}>
              <input
                autoFocus
                className={styles.renameInput}
                aria-label={`Rename ${view.name}`}
                value={draftName}
                onChange={(event) => setDraftName(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') commitRename(view.id)
                  if (event.key === 'Escape') setRenaming(null)
                }}
              />
              <button type="button" className={styles.rowBtn} onClick={() => commitRename(view.id)}>
                Save
              </button>
            </div>
          )
        }

        if (pendingDelete === view.id) {
          return (
            <div key={view.id} className={`${styles.row} ${styles.rowConfirm}`}>
              <span className={styles.confirmText}>Delete “{view.name}”?</span>
              <button
                type="button"
                className={styles.rowBtn}
                onClick={() => dispatch({ type: 'view/confirmDelete', viewId: null })}
              >
                Cancel
              </button>
              <button
                type="button"
                className={styles.dangerBtn}
                onClick={() => dispatch({ type: 'view/delete', viewId: view.id })}
              >
                Delete
              </button>
            </div>
          )
        }

        return (
          <div key={view.id} className={styles.row}>
            <button
              type="button"
              className={`${styles.name} ${view.id === activeView ? styles.nameActive : ''}`.trim()}
              onClick={() => {
                dispatch({ type: 'view/select', viewId: view.id })
                onClose()
              }}
            >
              {view.name}
            </button>

            {/* The locked view is the way out: it cannot be unpinned, renamed away
              * or deleted, so it offers none of those. */}
            {view.locked ? (
              <span className={styles.lockedNote}>always here</span>
            ) : (
              <>
                <button
                  type="button"
                  className={styles.rowBtn}
                  aria-label={`${view.pinned ? 'Unpin' : 'Pin'} ${view.name}`}
                  aria-pressed={!!view.pinned}
                  onClick={() => dispatch({ type: 'view/togglePin', viewId: view.id })}
                >
                  {view.pinned ? 'Unpin' : 'Pin'}
                </button>
                <button
                  type="button"
                  className={styles.rowBtn}
                  aria-label={`Rename ${view.name}`}
                  onClick={() => {
                    setDraftName(view.name)
                    setRenaming(view.id)
                  }}
                >
                  Rename
                </button>
                <button
                  type="button"
                  className={styles.rowBtn}
                  aria-label={`Delete ${view.name}`}
                  onClick={() => dispatch({ type: 'view/confirmDelete', viewId: view.id })}
                >
                  Delete
                </button>
              </>
            )}
          </div>
        )
      })}
    </div>
  )
}
