import styles from './states.module.css'

export interface EmptyStateProps {
  onClear: () => void
}

/** Rendered in place of the row list, inside the scrolling table area, when
 *  the filter matches zero rows. `position: sticky; left: 0` keeps it visible
 *  even when the table has scrolled horizontally. */
export function EmptyState({ onClear }: EmptyStateProps) {
  return (
    <div className={styles.emptyWrap}>
      <div className={`${styles.tile} ${styles.emptyTile}`}>0</div>
      <div className={styles.heading}>No companies match this filter</div>
      <div className={styles.emptyDetail}>Loosen a condition, or start over.</div>
      <button type="button" className={styles.clearFiltersBtn} onClick={onClear}>
        Clear filters
      </button>
    </div>
  )
}
