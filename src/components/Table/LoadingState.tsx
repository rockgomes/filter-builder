import { formatNumber } from '../../domain/format'
import styles from './states.module.css'

export interface LoadingStateProps {
  count: number
}

const SKELETON_ROW_COUNT = 14

interface SkeletonRow {
  key: number
  w1: number
  w2: number
  w3: number
}

function skeletonRows(): SkeletonRow[] {
  return Array.from({ length: SKELETON_ROW_COUNT }, (_, i) => ({
    key: i,
    w1: 120 + ((i * 37) % 80),
    w2: 220 + ((i * 53) % 160),
    w3: 90 + ((i * 29) % 60),
  }))
}

/** The header stub plus 14 shimmering skeleton rows shown while `phase` is
 *  `'loading'`. Bar widths are derived deterministically from the row index
 *  so the skeleton doesn't reflow between renders. */
export function LoadingState({ count }: LoadingStateProps) {
  return (
    <div className={styles.loadingRoot}>
      <div className={styles.headerStub} />
      {skeletonRows().map((row) => (
        <div key={row.key} className={styles.skeletonRow}>
          <div className={styles.bar} style={{ width: row.w1 }} />
          <div className={styles.bar} style={{ width: row.w2 }} />
          <div className={styles.bar} style={{ width: row.w3 }} />
        </div>
      ))}
      <div className={styles.loadingCaption}>{`loading ${formatNumber(count)} companies…`}</div>
    </div>
  )
}
