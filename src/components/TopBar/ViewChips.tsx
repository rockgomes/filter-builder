import type { SavedView } from '../../domain/types'
import styles from './TopBar.module.css'

export interface ViewChipsProps {
  views: SavedView[]
  activeView: string | null
  onSelect: (viewId: string) => void
}

export function ViewChips({ views, activeView, onSelect }: ViewChipsProps) {
  return (
    <div className={styles.viewsWrap}>
      {views.map((view) => {
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
