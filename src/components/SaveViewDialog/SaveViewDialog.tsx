import { useEffect, useRef } from 'react'
import type { KeyboardEvent } from 'react'
import { MAX_VIEW_NAME_LENGTH } from '../../state/reducer'
import type { Action } from '../../state/reducer'
import styles from './SaveViewDialog.module.css'

export interface SaveViewDialogProps {
  saveName: string
  /** The "pin it" choice, held in app state so the dialog stays stateless. */
  pinned: boolean
  dispatch: (action: Action) => void
}

/**
 * Naming a new view happens here rather than in the panel itself. Inline, the
 * naming row appeared below the Save button and carried its own Save button, so
 * the control you were reaching for moved across the panel mid-action. A dialog
 * leaves the panel exactly where it was and puts the whole decision — name, and
 * whether it goes in the top bar — in one place.
 */
export function SaveViewDialog({ saveName, pinned, dispatch }: SaveViewDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const canSave = saveName.trim().length > 0

  // Focus moves in on open and back to whatever opened the dialog on close, so a
  // keyboard user is never dropped at the top of the document.
  useEffect(() => {
    const returnTo = document.activeElement as HTMLElement | null
    inputRef.current?.focus()
    return () => returnTo?.focus?.()
  }, [])

  const cancel = () => dispatch({ type: 'view/cancelSave' })

  /** Tab cycles inside the dialog: a modal that leaks focus to the page behind it
   *  is only modal for people using a mouse. */
  const trapTab = (event: KeyboardEvent) => {
    if (event.key === 'Escape') {
      cancel()
      return
    }
    if (event.key !== 'Tab' || !dialogRef.current) return
    const focusable = [
      ...dialogRef.current.querySelectorAll<HTMLElement>(
        'input:not(:disabled), button:not(:disabled)',
      ),
    ]
    if (focusable.length === 0) return
    const first = focusable[0]
    const last = focusable[focusable.length - 1]
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault()
      last.focus()
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault()
      first.focus()
    }
  }

  return (
    <div className={styles.backdrop} onClick={cancel}>
      <div
        ref={dialogRef}
        className={styles.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="save-view-title"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={trapTab}
      >
        <h2 id="save-view-title" className={styles.title}>
          Save as a new view
        </h2>

        <form
          onSubmit={(event) => {
            event.preventDefault()
            if (canSave) dispatch({ type: 'view/confirmSave' })
          }}
        >
          <div className={styles.labelRow}>
            <label className={styles.label} htmlFor="save-view-name">
              Name
            </label>
            {/* Only once it matters. The input stops accepting characters at the
             * limit, and silent truncation reads as a broken keyboard. */}
            {saveName.length > MAX_VIEW_NAME_LENGTH - 10 ? (
              <span className={styles.counter}>
                {saveName.length}/{MAX_VIEW_NAME_LENGTH}
              </span>
            ) : null}
          </div>

          <input
            id="save-view-name"
            ref={inputRef}
            className={styles.input}
            maxLength={MAX_VIEW_NAME_LENGTH}
            value={saveName}
            placeholder="ICP · Mid-market SaaS"
            onChange={(event) => dispatch({ type: 'view/setName', name: event.target.value })}
          />

          <label className={styles.check}>
            <input
              type="checkbox"
              checked={pinned}
              onChange={(event) =>
                dispatch({ type: 'view/setSavePinned', pinned: event.target.checked })
              }
            />
            Pin it to the top bar
          </label>

          <div className={styles.actions}>
            <button type="button" className={styles.cancel} onClick={cancel}>
              Cancel
            </button>
            <button type="submit" className={styles.confirm} disabled={!canSave}>
              Save view
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
