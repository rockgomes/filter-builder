import { memo } from 'react'
import type { Action } from '../../state/reducer'
import type { Company, ColumnDef } from '../../domain/types'
import { TableCell } from './TableCell'
import styles from './Table.module.css'

export interface TableRowProps {
  company: Company
  columns: ColumnDef[]
  nameWidth: number
  rowHeight: number
  /** Index within the full sorted array (not the rendered window) — zebra
   *  stripes must key off this or they flicker while scrolling, and it is
   *  also the index the selection reducer needs for shift-click ranges. */
  absIndex: number
  selected: boolean
  sortedIds: number[]
  dispatch: (action: Action) => void
}

function TableRowImpl({
  company,
  columns,
  nameWidth,
  rowHeight,
  absIndex,
  selected,
  sortedIds,
  dispatch,
}: TableRowProps) {
  const className = [styles.row, absIndex % 2 === 1 && styles.zebra, selected && styles.selected]
    .filter(Boolean)
    .join(' ')

  return (
    <div role="row" className={className} style={{ height: rowHeight }}>
      <div role="cell" className={styles.checkboxCell}>
        <input
          type="checkbox"
          className={styles.checkbox}
          checked={selected}
          // The dispatch happens on click (not change) so we can read
          // event.shiftKey for range selection; onChange is a no-op just to
          // satisfy React's controlled-input contract.
          onChange={() => {}}
          onClick={(event) => {
            event.stopPropagation()
            dispatch({
              type: 'selection/toggleRow',
              id: company.id,
              index: absIndex,
              shiftKey: event.shiftKey,
              sortedIds,
            })
          }}
          aria-label={`Select ${company.name}`}
        />
      </div>
      <div role="cell" className={styles.nameCell} style={{ width: nameWidth }}>
        {company.name}
      </div>
      {columns.map((column) => (
        <TableCell key={column.key} company={company} column={column} />
      ))}
    </div>
  )
}

export const TableRow = memo(TableRowImpl)
