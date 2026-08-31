import type { ReactNode } from 'react'
import { formatDate, formatNumber } from '../../domain/format'
import type { Company, ColumnDef } from '../../domain/types'
import { CrmBadge } from './CrmBadge'
import styles from './Table.module.css'

export interface TableCellProps {
  company: Company
  column: ColumnDef
}

function cellContent(company: Company, column: ColumnDef): ReactNode {
  switch (column.key) {
    case 'inCRM':
      return <CrmBadge inCRM={company.inCRM} />
    case 'headcount':
      return formatNumber(company.headcount)
    case 'revenue':
      return `$${company.revenue}M`
    case 'founded':
      return formatDate(company.founded)
    case 'lastActivity':
      return formatDate(company.lastActivity)
    default:
      return String(company[column.key])
  }
}

export function TableCell({ company, column }: TableCellProps) {
  const className = [styles.cell, column.mono && styles.cellMono, column.right && styles.cellRight]
    .filter(Boolean)
    .join(' ')

  return (
    <div role="cell" className={className} style={{ width: column.w }}>
      {cellContent(company, column)}
    </div>
  )
}
