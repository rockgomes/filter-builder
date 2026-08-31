import styles from './CrmBadge.module.css'

export interface CrmBadgeProps {
  inCRM: boolean
}

export function CrmBadge({ inCRM }: CrmBadgeProps) {
  return (
    <span className={`${styles.badge} ${inCRM ? styles.in : styles.out}`}>
      {inCRM ? 'In CRM' : '—'}
    </span>
  )
}
