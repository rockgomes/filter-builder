import { formatNumber } from '../../domain/format'
import styles from './BulkBar.module.css'

export interface BulkBarProps {
  count: number
  showSelectAll: boolean
  matchingCount: number
  onSelectAll: () => void
  onAddToCrm: () => void
  onExport: () => void
  onClear: () => void
}

/** The floating pill offering bulk actions on the current selection. Hidden
 *  entirely while the reconciliation banner is shown — the caller decides
 *  that, this component just renders once mounted. */
export function BulkBar({
  count,
  showSelectAll,
  matchingCount,
  onSelectAll,
  onAddToCrm,
  onExport,
  onClear,
}: BulkBarProps) {
  return (
    <div className={styles.bar}>
      <span className={styles.count}>{`${formatNumber(count)} selected`}</span>
      {/* Three tiers, one per role:
       *  - .primary   filled — the main bulk action
       *  - .secondary outlined — peer actions on the same selection
       *  - .quiet     text only — changes the selection rather than acting on it */}
      {showSelectAll ? (
        <button type="button" className={styles.quiet} onClick={onSelectAll}>
          {`Select all ${formatNumber(matchingCount)} matching`}
        </button>
      ) : null}
      <div className={styles.divider} />
      <button type="button" className={styles.primary} onClick={onAddToCrm}>
        Add to CRM
      </button>
      <button type="button" className={styles.secondary} onClick={onExport}>
        Export CSV
      </button>
      <button type="button" className={styles.quiet} onClick={onClear}>
        Clear
      </button>
    </div>
  )
}
