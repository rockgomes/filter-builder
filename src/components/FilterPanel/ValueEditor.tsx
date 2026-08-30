import type { Action } from '../../state/reducer'
import type { Cond, Field } from '../../domain/types'
import { EnumChips } from './EnumChips'
import styles from './ConditionRow.module.css'

export interface ValueEditorProps {
  cond: Cond
  field: Field
  dispatch: (action: Action) => void
  small?: boolean
}

const NO_VALUE_OPS = new Set(['empty', 'last30', 'last90'])

/**
 * Picks the value editor from the field type and operator, exactly as the
 * handoff does: no editor for boolean fields or date-relative / empty ops, a
 * single input for text, one or two numeric/date inputs (the second only for
 * "between"), a single select for enum is/is not, and chips for the
 * any-of/not-any-of multi-select operators.
 */
export function ValueEditor({ cond, field, dispatch, small }: ValueEditorProps) {
  if (field.type === 'boolean' || NO_VALUE_OPS.has(cond.op)) return null

  const setValue = (value: string) => dispatch({ type: 'tree/patchCondition', id: cond.id, patch: { value } })
  const setValue2 = (value2: string) => dispatch({ type: 'tree/patchCondition', id: cond.id, patch: { value2 } })
  const controlClass = small ? styles.controlSmall : ''

  if (field.type === 'text') {
    return (
      <input
        aria-label="Value"
        className={`${styles.input} ${small ? styles.valueTextSmall : styles.valueText} ${controlClass}`.trim()}
        value={cond.value as string}
        placeholder="type to filter…"
        onChange={(event) => setValue(event.target.value)}
      />
    )
  }

  if (field.type === 'number' || field.type === 'date') {
    const inputType = field.type === 'number' ? 'number' : 'date'
    const widthClass = small ? styles.valueNumberSmall : styles.valueNumber
    return (
      <>
        <input
          aria-label="Value"
          type={inputType}
          className={`${styles.input} ${styles.mono} ${widthClass} ${controlClass}`.trim()}
          value={cond.value as string}
          onChange={(event) => setValue(event.target.value)}
        />
        {cond.op === 'between' ? (
          <>
            <span className={styles.and}>and</span>
            <input
              aria-label="Value (to)"
              type={inputType}
              className={`${styles.input} ${styles.mono} ${widthClass} ${controlClass}`.trim()}
              value={cond.value2}
              onChange={(event) => setValue2(event.target.value)}
            />
          </>
        ) : null}
      </>
    )
  }

  // enum
  if (cond.op === 'is' || cond.op === 'is_not') {
    return (
      <select
        aria-label="Value"
        className={`${styles.select} ${controlClass}`.trim()}
        value={cond.value as string}
        onChange={(event) => setValue(event.target.value)}
      >
        {(field.options ?? []).map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    )
  }

  const selected = Array.isArray(cond.value) ? cond.value : []
  return (
    <EnumChips
      options={field.options ?? []}
      selected={selected}
      small={small}
      onToggle={(option) => {
        const next = selected.includes(option) ? selected.filter((v) => v !== option) : [...selected, option]
        dispatch({ type: 'tree/patchCondition', id: cond.id, patch: { value: next } })
      }}
    />
  )
}
