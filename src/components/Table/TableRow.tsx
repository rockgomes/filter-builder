import { memo } from 'react'
import type { Company, ColumnDef } from '../../domain/types'
import { TableCell } from './TableCell'
import styles from './Table.module.css'

export interface TableRowProps {
  company: Company
  columns: ColumnDef[]
  nameWidth: number
  rowHeight: number
  /** Index within the full sorted array (not the rendered window) — zebra
   *  stripes must key off this or they flicker while scrolling. */
  absIndex: number
  selected: boolean
}

function TableRowImpl({ company, columns, nameWidth, rowHeight, absIndex, selected }: TableRowProps) {
  const className = [styles.row, absIndex % 2 === 1 && styles.zebra, selected && styles.selected]
    .filter(Boolean)
    .join(' ')

  return (
    <div role="row" className={className} style={{ height: rowHeight }}>
      <div className={styles.checkboxCell}>
        {/* Selection wiring arrives in Task 10 — this checkbox is display-only for now. */}
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={selected}
          readOnly
          disabled
          aria-label={`Select ${company.name}`}
        />
      </div>
      <div className={styles.nameCell} style={{ width: nameWidth }}>
        {company.name}
      </div>
      {columns.map((column) => (
        <TableCell key={column.key} company={company} column={column} />
      ))}
    </div>
  )
}

export const TableRow = memo(TableRowImpl)
