import styles from './states.module.css'

export interface ErrorStateProps {
  onRetry: () => void
}

export function ErrorState({ onRetry }: ErrorStateProps) {
  return (
    <div className={styles.centered}>
      <div className={`${styles.tile} ${styles.errorTile}`}>!</div>
      <div className={styles.heading}>Couldn&apos;t load companies</div>
      <div className={styles.detail}>GET /api/companies → 503</div>
      <button type="button" className={styles.retryBtn} onClick={onRetry}>
        Retry
      </button>
    </div>
  )
}
