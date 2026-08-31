import type { SavedView } from '../../domain/types'
import styles from './TopBar.module.css'

export interface ViewChipsProps {
  views: SavedView[]
  activeView: string | null
  /** True when the open view has unsaved edits, shown on its chip. */
  isDirty: boolean
  onSelect: (viewId: string) => void
}

export function ViewChips({ views, activeView, isDirty, onSelect }: ViewChipsProps) {
  return (
    <div className={styles.viewsWrap}>
      {/* Only pinned views get a chip. The rest live in the dropdown. */}
      {views
        .filter((view) => view.pinned)
        .map((view) => {
          const active = view.id === activeView
          return (
            <button
              key={view.id}
              type="button"
              className={`${styles.chip} ${active ? styles.chipActive : styles.chipInactive}`}
              aria-pressed={active}
              onClick={() => onSelect(view.id)}
            >
              {view.name}
              {active && isDirty ? (
                <span className={styles.chipDirty} aria-label="has unsaved changes">
                  •
                </span>
              ) : null}
              {view.warn ? (
                <span className={styles.chipWarn} aria-label="references a deleted field">
                  !
                </span>
              ) : null}
            </button>
          )
        })}
    </div>
  )
}
