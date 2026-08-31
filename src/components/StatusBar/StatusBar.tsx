import styles from './StatusBar.module.css'

export interface StatusBarProps {
  rowCount: number
  sortSummary: string
}

export function StatusBar({ rowCount, sortSummary }: StatusBarProps) {
  return (
    <div className={styles.statusBar}>
      <span>{rowCount} rows · virtualized</span>
      <span>sort: {sortSummary}</span>
      <div className={styles.spacer} />
      <span>fieldset — a filter &amp; table edge-case study</span>
    </div>
  )
}
