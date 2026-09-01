import type { DragEvent, MouseEvent } from 'react'
import type { Action } from '../../state/reducer'
import type { ColumnDef, CompanyKey, SortSpec } from '../../domain/types'
import { SelectionMenu } from './SelectionMenu'
import styles from './Table.module.css'

export interface TableHeaderProps {
  sorts: SortSpec[]
  nameWidth: number
  columns: ColumnDef[]
  dispatch: (action: Action) => void
  startResize: (key: string, event: MouseEvent<HTMLDivElement>) => void
  selectedCount: number
  matchingCount: number
  matchingIds: number[]
  selMenuOpen: boolean
}

interface SortDisplay {
  ariaSort: 'ascending' | 'descending' | 'none'
  glyph: string
}

/** Sort glyph is the arrow alone, unless multiple sorts are active — then it's
 *  followed by this column's 1-based priority among them, e.g. "↓1". */
function sortDisplay(sorts: SortSpec[], key: CompanyKey): SortDisplay {
  const index = sorts.findIndex((sort) => sort.key === key)
  if (index < 0) return { ariaSort: 'none', glyph: '' }
  const { dir } = sorts[index]
  const arrow = dir === 'asc' ? '↑' : '↓'
  return {
    ariaSort: dir === 'asc' ? 'ascending' : 'descending',
    glyph: sorts.length > 1 ? `${arrow}${index + 1}` : arrow,
  }
}

export function TableHeader({
  sorts,
  nameWidth,
  columns,
  dispatch,
  startResize,
  selectedCount,
  matchingCount,
  matchingIds,
  selMenuOpen,
}: TableHeaderProps) {
  const nameSort = sortDisplay(sorts, 'name')

  const handleDragStart = (event: DragEvent<HTMLDivElement>, key: string) => {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', key)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>, toKey: string) => {
    event.preventDefault()
    const fromKey = event.dataTransfer.getData('text/plain')
    if (fromKey && fromKey !== toKey) dispatch({ type: 'columns/reorder', from: fromKey, to: toKey })
  }

  return (
    <div role="row" className={styles.headerRow}>
      <div role="columnheader" className={styles.checkboxHeaderCell}>
        {/* A menu rather than a checkbox. The amounts on offer are far apart and the
         *  gesture is ambiguous, so it states them instead of picking one. */}
        <SelectionMenu
          selectedCount={selectedCount}
          matchingCount={matchingCount}
          matchingIds={matchingIds}
          open={selMenuOpen}
          dispatch={dispatch}
        />
      </div>

      <div
        role="columnheader"
        aria-sort={nameSort.ariaSort}
        className={`${styles.headerCell} ${styles.nameHeaderCell}`}
        style={{ width: nameWidth }}
      >
        <button
          type="button"
          className={styles.headerBtn}
          onClick={(event) => dispatch({ type: 'sort/toggle', key: 'name', append: event.shiftKey })}
        >
          <span className={styles.headerLabel}>Company</span>
          {nameSort.glyph ? <span className={styles.sortGlyph}>{nameSort.glyph}</span> : null}
        </button>
        <div
          className={styles.resizeHandle}
          onMouseDown={(event) => startResize('__name', event)}
        />
      </div>

      {columns.map((column) => {
        const sort = sortDisplay(sorts, column.key)
        return (
          <div
            key={column.key}
            role="columnheader"
            aria-sort={sort.ariaSort}
            className={styles.headerCell}
            style={{ width: column.w }}
            draggable
            onDragStart={(event) => handleDragStart(event, column.key)}
            onDragOver={(event) => event.preventDefault()}
            onDrop={(event) => handleDrop(event, column.key)}
            title="Click to sort · shift-click to multi-sort · drag to reorder"
          >
            <button
              type="button"
              className={styles.headerBtn}
              style={{ justifyContent: column.right ? 'flex-end' : undefined }}
              onClick={(event) => dispatch({ type: 'sort/toggle', key: column.key, append: event.shiftKey })}
            >
              <span className={styles.headerLabel}>{column.label}</span>
              {sort.glyph ? <span className={styles.sortGlyph}>{sort.glyph}</span> : null}
            </button>
            <div
              className={styles.resizeHandle}
              onMouseDown={(event) => startResize(column.key, event)}
            />
          </div>
        )
      })}
    </div>
  )
}
