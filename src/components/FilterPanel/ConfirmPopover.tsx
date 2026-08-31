import { useEffect, useRef } from 'react'
import styles from './ConfirmPopover.module.css'

export interface ConfirmPopoverProps {
  /** What is about to happen, stated in full so the button can stay short. */
  question: string
  confirmLabel: string
  onConfirm: () => void
  onCancel: () => void
}

/**
 * A question hanging off the row that raised it, rather than a dialog over the whole
 * app. Clearing the filter and discarding edits are small, frequent actions that
 * happen to be unrecoverable; a modal would treat them as bigger than they are, and
 * an inline swap would widen a row that has to survive a 300px column. The row is
 * the anchor rather than the button so a trigger near the edge cannot open it
 * off-panel.
 *
 * The cancel is focused, not the confirm: if this opened by accident, the key you
 * reach for should be the one that undoes it.
 */
export function ConfirmPopover({
  question,
  confirmLabel,
  onConfirm,
  onCancel,
}: ConfirmPopoverProps) {
  const cancelRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    cancelRef.current?.focus()
  }, [])

  return (
    <div
      className={styles.pop}
      role="dialog"
      aria-label={question}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel()
      }}
    >
      <p className={styles.question}>{question}</p>
      <div className={styles.actions}>
        <button ref={cancelRef} type="button" className={styles.cancel} onClick={onCancel}>
          Cancel
        </button>
        <button type="button" className={styles.confirm} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </div>
  )
}
