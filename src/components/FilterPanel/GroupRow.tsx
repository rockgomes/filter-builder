import type { Action } from '../../state/reducer'
import type { Group } from '../../domain/types'
import { ConditionRow, JoinSlot } from './ConditionRow'
import styles from './GroupRow.module.css'

export interface GroupRowProps {
  group: Group
  parentId: string
  isFirst: boolean
  joinerOp: 'AND' | 'OR'
  small?: boolean
  hitCounts: Record<string, number>
  dispatch: (action: Action) => void
}

export function GroupRow({ group, parentId, isFirst, joinerOp, small, hitCounts, dispatch }: GroupRowProps) {
  const opLabel = group.op === 'AND' ? 'ALL ( AND )' : 'ANY ( OR )'

  return (
    <div className={styles.row}>
      <JoinSlot
        isFirst={isFirst}
        joinerOp={joinerOp}
        parentId={parentId}
        small={small}
        topOffset={isFirst ? 12 : 8}
        dispatch={dispatch}
      />
      <div className={styles.groupBox}>
        <div className={styles.header}>
          <span className={styles.groupLabel}>group · match</span>
          <button
            type="button"
            className={styles.opPill}
            onClick={() => dispatch({ type: 'tree/toggleOp', id: group.id })}
          >
            {opLabel}
          </button>
          <div className={styles.headerSpacer} />
          <button
            type="button"
            className={styles.removeBtn}
            aria-label="Remove group"
            onClick={() => dispatch({ type: 'tree/removeNode', id: group.id })}
          >
            ×
          </button>
        </div>
        <div className={styles.children}>
          {group.children.map((child, i) =>
            child.kind === 'cond' ? (
              <ConditionRow
                key={child.id}
                cond={child}
                parentId={group.id}
                isFirst={i === 0}
                joinerOp={group.op}
                small
                hits={hitCounts[child.id]}
                dispatch={dispatch}
              />
            ) : (
              <GroupRow
                key={child.id}
                group={child}
                parentId={group.id}
                isFirst={i === 0}
                joinerOp={group.op}
                small
                hitCounts={hitCounts}
                dispatch={dispatch}
              />
            )
          )}
        </div>
        <button
          type="button"
          className={styles.addCondBtn}
          onClick={() => dispatch({ type: 'tree/addCondition', parentId: group.id })}
        >
          + condition
        </button>
      </div>
    </div>
  )
}
