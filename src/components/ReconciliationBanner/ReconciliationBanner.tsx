import { formatNumber } from '../../domain/format'
import styles from './ReconciliationBanner.module.css'

export interface ReconciliationBannerProps {
  snapCount: number
  matchingCount: number
  onKeep: () => void
  onTrim: () => void
  onClear: () => void
}

/** Shown when a "select all N matching" snapshot no longer matches the current
 *  filter — see `needsReconciliation` in `domain/selection`. The three actions
 *  map straight onto the `selection/keep`, `selection/trim` and `selection/clear`
 *  reducer actions; the caller wires up which filter signature and which ids
 *  those dispatch against. */
export function ReconciliationBanner({
  snapCount,
  matchingCount,
  onKeep,
  onTrim,
  onClear,
}: ReconciliationBannerProps) {
  return (
    <div className={styles.strip} role="status">
      <span className={styles.tag}>SELECTION</span>
      <span>
        {`You selected all ${formatNumber(snapCount)} rows matching the previous filter. The filter changed — ${formatNumber(matchingCount)} of them still match.`}
      </span>
      <div className={styles.spacer} />
      <button type="button" className={styles.keepBtn} onClick={onKeep}>
        {`Keep all ${formatNumber(snapCount)}`}
      </button>
      <button type="button" className={styles.trimBtn} onClick={onTrim}>
        {`Trim to ${formatNumber(matchingCount)} matching`}
      </button>
      <button type="button" className={styles.clearBtn} onClick={onClear}>
        Clear selection
      </button>
    </div>
  )
}
