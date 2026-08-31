import { useEffect, useRef } from 'react'
import { MAX_VIEW_NAME_LENGTH } from '../../state/reducer'
import type { Action } from '../../state/reducer'
import styles from './FilterPanel.module.css'

export interface SaveViewInlineProps {
  saveName: string
  dispatch: (action: Action) => void
}

export function SaveViewInline({ saveName, dispatch }: SaveViewInlineProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  return (
    <div className={styles.saveRow}>
      <input
        ref={inputRef}
        aria-label="View name"
        maxLength={MAX_VIEW_NAME_LENGTH}
        className={styles.saveInput}
        value={saveName}
        placeholder="View name…"
        onChange={(event) => dispatch({ type: 'view/setName', name: event.target.value })}
        onKeyDown={(event) => {
          if (event.key === 'Enter') dispatch({ type: 'view/confirmSave' })
        }}
      />
      <button
        type="button"
        className={styles.saveConfirm}
        onClick={() => dispatch({ type: 'view/confirmSave' })}
      >
        Save
      </button>
      <button
        type="button"
        className={styles.saveCancel}
        onClick={() => dispatch({ type: 'view/cancelSave' })}
      >
        Cancel
      </button>
    </div>
  )
}
