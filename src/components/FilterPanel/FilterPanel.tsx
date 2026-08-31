import { useMemo } from 'react'
import { getField } from '../../domain/fields'
import { conditionHits } from '../../domain/filter'
import type { Action, AppState } from '../../state/reducer'
import type { Company, TreeNode } from '../../domain/types'
import { MatchCount } from './MatchCount'
import { ConditionRow } from './ConditionRow'
import { GroupRow } from './GroupRow'
import styles from './FilterPanel.module.css'

export interface FilterPanelProps {
  state: AppState
  dispatch: (action: Action) => void
  rows: Company[]
  filtered: Company[]
  ignoredCount: number
  now: number
}

export function FilterPanel({ state, dispatch, rows, filtered, ignoredCount, now }: FilterPanelProps) {
  // Hit counts must not be recomputed inline per render per condition — at 50k rows
  // that is a full dataset scan per condition on every keystroke. Compute them once
  // per render pass, keyed on the data version and the serialized tree, and hand
  // each condition its own count.
  const treeSignature = JSON.stringify(state.tree)
  const hitCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    const visit = (node: TreeNode) => {
      if (node.kind === 'group') node.children.forEach(visit)
      else if (getField(node.field)) counts[node.id] = conditionHits(rows, node, now)
    }
    state.tree.children.forEach(visit)
    return counts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.dataVersion, treeSignature, rows, now])

  return (
    <div className={styles.panel}>
      <MatchCount
        count={filtered.length}
        total={rows.length}
        ignoredCount={ignoredCount}
        savingView={state.savingView}
        saveName={state.saveName}
        dispatch={dispatch}
      />
      <div className={styles.rows}>
        {state.tree.children.map((node, i) =>
          node.kind === 'cond' ? (
            <ConditionRow
              key={node.id}
              cond={node}
              parentId="root"
              isFirst={i === 0}
              joinerOp={state.tree.op}
              hits={hitCounts[node.id]}
              dispatch={dispatch}
            />
          ) : (
            <GroupRow
              key={node.id}
              group={node}
              parentId="root"
              isFirst={i === 0}
              joinerOp={state.tree.op}
              hitCounts={hitCounts}
              dispatch={dispatch}
            />
          )
        )}
        <div className={styles.footer}>
          <button
            type="button"
            className={styles.dashedBtn}
            onClick={() => dispatch({ type: 'tree/addCondition', parentId: 'root' })}
            aria-label="Add condition"
          >
            + Condition
          </button>
          <button type="button" className={styles.dashedBtn} onClick={() => dispatch({ type: 'tree/addGroup' })}>
            + Group ( OR )
          </button>
        </div>
      </div>
    </div>
  )
}
