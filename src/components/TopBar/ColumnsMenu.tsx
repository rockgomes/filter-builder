import { getColumn } from '../../domain/fields'
import type { CompanyKey } from '../../domain/types'
import styles from './ColumnsMenu.module.css'

export interface ColumnsMenuProps {
  colOrder: CompanyKey[]
  hidden: Record<string, boolean>
  onToggle: (key: string) => void
  onMove: (key: string, direction: -1 | 1) => void
  onClose: () => void
}

export function ColumnsMenu({ colOrder, hidden, onToggle, onMove, onClose }: ColumnsMenuProps) {
  return (
    <div
      className={styles.menu}
      onClick={(event) => event.stopPropagation()}
      onKeyDown={(event) => {
        if (event.key === 'Escape') onClose()
      }}
    >
      <div className={styles.header}>show / hide · reorder</div>
      {colOrder.map((key) => {
        const column = getColumn(key)
        const label = column?.label ?? key
        return (
          <div key={key} className={styles.row}>
            <input
              type="checkbox"
              className={styles.checkbox}
              checked={!hidden[key]}
              onChange={() => onToggle(key)}
              aria-label={`${label} column`}
            />
            <span className={styles.label}>{label}</span>
            <button
              type="button"
              className={styles.moveBtn}
              onClick={() => onMove(key, -1)}
              aria-label={`Move ${label} up`}
            >
              ↑
            </button>
            <button
              type="button"
              className={styles.moveBtn}
              onClick={() => onMove(key, 1)}
              aria-label={`Move ${label} down`}
            >
              ↓
            </button>
          </div>
        )
      })}
    </div>
  )
}
