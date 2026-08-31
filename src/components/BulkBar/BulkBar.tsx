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
      {showSelectAll ? (
        <button type="button" className={styles.selectAllBtn} onClick={onSelectAll}>
          {`Select all ${formatNumber(matchingCount)} matching`}
        </button>
      ) : null}
      <div className={styles.divider} />
      <button type="button" className={styles.crmBtn} onClick={onAddToCrm}>
        Add to CRM
      </button>
      <button type="button" className={styles.exportBtn} onClick={onExport}>
        Export CSV
      </button>
      <button type="button" className={styles.clearBtn} onClick={onClear} aria-label="Clear selection">
        ×
      </button>
    </div>
  )
}
