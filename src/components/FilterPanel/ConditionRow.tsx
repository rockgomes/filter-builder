import { FIELDS, OPS, getField } from '../../domain/fields'
import { fieldChangePatch, opChangePatch } from '../../state/reducer'
import type { Action } from '../../state/reducer'
import type { Cond, OpId } from '../../domain/types'
import { ValueEditor } from './ValueEditor'
import panelStyles from './FilterPanel.module.css'
import styles from './ConditionRow.module.css'

export interface JoinSlotProps {
  isFirst: boolean
  joinerOp: 'AND' | 'OR'
  parentId: string
  small?: boolean
  topOffset?: number
  dispatch: (action: Action) => void
}

/**
 * Leading 44px (or 34px, when nested inside a group) slot shown before a
 * condition or group box: "Where" on the first row, an AND/OR joiner after
 * that. At root level the joiner is a clickable pill that flips the parent
 * group's operator; nested inside a group it is a static label, matching
 * the handoff.
 */
export function JoinSlot({
  isFirst,
  joinerOp,
  parentId,
  small,
  topOffset,
  dispatch,
}: JoinSlotProps) {
  const style = topOffset ? { marginTop: topOffset } : undefined

  if (small) {
    return isFirst ? (
      <span className={panelStyles.joinerBlank} style={style} />
    ) : (
      <span className={panelStyles.joinerStatic} style={style}>
        {joinerOp}
      </span>
    )
  }

  if (isFirst) {
    return (
      <span className={`${panelStyles.leadSlot} ${panelStyles.whereLabel}`.trim()} style={style}>
        Where
      </span>
    )
  }

  return (
    <button
      type="button"
      title="Toggle AND/OR"
      className={panelStyles.joinerPill}
      style={style}
      onClick={() => dispatch({ type: 'tree/toggleOp', id: parentId })}
    >
      {joinerOp}
    </button>
  )
}

export interface ConditionRowProps {
  cond: Cond
  parentId: string
  isFirst: boolean
  joinerOp: 'AND' | 'OR'
  small?: boolean
  hits?: number
  dispatch: (action: Action) => void
}

export function ConditionRow({
  cond,
  parentId,
  isFirst,
  joinerOp,
  small,
  hits,
  dispatch,
}: ConditionRowProps) {
  const field = getField(cond.field)
  const fieldLabel = field?.label ?? cond.field
  const controlClass = small ? styles.controlSmall : ''

  return (
    <div className={styles.row}>
      <JoinSlot
        isFirst={isFirst}
        joinerOp={joinerOp}
        parentId={parentId}
        small={small}
        dispatch={dispatch}
      />
      <div
        className={`${styles.box} ${small ? styles.boxSmall : ''} ${!field ? styles.boxWarn : ''}`.trim()}
      >
        {/* The controls wrap; the remove button, outside this, does not. */}
        <div className={styles.boxContent}>
          <select
            aria-label="Field"
            className={`${styles.select} ${controlClass}`.trim()}
            value={cond.field}
            onChange={(event) =>
              dispatch({
                type: 'tree/patchCondition',
                id: cond.id,
                patch: fieldChangePatch(event.target.value),
              })
            }
          >
            {!field ? <option value={cond.field}>{`${cond.field} (deleted)`}</option> : null}
            {FIELDS.map((f) => (
              <option key={f.key} value={f.key}>
                {f.label}
              </option>
            ))}
          </select>

          {!field ? (
            <span className={styles.warnText}>field was deleted — condition ignored</span>
          ) : (
            <>
              <select
                aria-label="Operator"
                className={`${styles.select} ${styles.selectOperator} ${controlClass}`.trim()}
                value={cond.op}
                onChange={(event) =>
                  dispatch({
                    type: 'tree/patchCondition',
                    id: cond.id,
                    patch: opChangePatch(cond, event.target.value as OpId, cond.field),
                  })
                }
              >
                {OPS[field.type].map(([id, label]) => (
                  <option key={id} value={id}>
                    {label}
                  </option>
                ))}
              </select>
              <ValueEditor cond={cond} field={field} dispatch={dispatch} small={small} />
              {hits !== undefined ? (
                <span className={styles.hits}>
                  {hits} {hits === 1 ? 'hit' : 'hits'}
                </span>
              ) : null}
            </>
          )}
        </div>

        <button
          type="button"
          className={styles.removeBtn}
          aria-label={`Remove condition on ${fieldLabel}`}
          onClick={() => dispatch({ type: 'tree/removeNode', id: cond.id })}
        >
          ×
        </button>
      </div>
    </div>
  )
}
