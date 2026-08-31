import { useMemo } from 'react'
import { getField } from '../../domain/fields'
import { conditionHits } from '../../domain/filter'
import { countConditions } from '../../domain/tree'
import { isViewDirty } from '../../state/reducer'
import type { Action, AppState } from '../../state/reducer'
import type { Company, TreeNode } from '../../domain/types'
import { MatchCount } from './MatchCount'
import { ConditionRow } from './ConditionRow'
import { GroupRow } from './GroupRow'
import { ConfirmPopover } from './ConfirmPopover'
import styles from './FilterPanel.module.css'

export interface FilterPanelProps {
  state: AppState
  dispatch: (action: Action) => void
  rows: Company[]
  filtered: Company[]
  ignoredCount: number
  now: number
}

export function FilterPanel({
  state,
  dispatch,
  rows,
  filtered,
  ignoredCount,
  now,
}: FilterPanelProps) {
  // Hit counts must not be recomputed inline per render per condition — at 50k rows
  // that is a full dataset scan per condition on every keystroke. Compute them once
  // per render pass, keyed on the data version and the serialized tree, and hand
  // each condition its own count.
  const treeSignature = JSON.stringify(state.tree)
  const hitCounts = useMemo(() => {
    // Off by default. Skipping the memo entirely also skips a full-dataset scan
    // per condition, so the counts cost nothing at all when they are hidden.
    if (!state.showHitCounts) return {}
    const counts: Record<string, number> = {}
    const visit = (node: TreeNode) => {
      if (node.kind === 'group') node.children.forEach(visit)
      else if (getField(node.field)) counts[node.id] = conditionHits(rows, node, now)
    }
    state.tree.children.forEach(visit)
    return counts
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.dataVersion, treeSignature, rows, now, state.showHitCounts])

  const hasConditions = state.tree.children.length > 0
  // "Remove everything" is easier to weigh when you are told how much everything is.
  const conditionCount = countConditions(state.tree)
  const clearQuestion =
    conditionCount === 1
      ? 'Remove the only condition? This cannot be undone.'
      : `Remove all ${conditionCount} conditions? This cannot be undone.`
  const activeView = state.views.find((v) => v.id === state.activeView)

  return (
    <div className={styles.panel}>
      <MatchCount
        count={filtered.length}
        total={rows.length}
        ignoredCount={ignoredCount}
        saveMenuOpen={state.saveMenuOpen}
        hasConditions={hasConditions}
        activeViewName={activeView?.name ?? null}
        canUpdateActiveView={activeView !== undefined && !activeView.locked}
        pendingConfirm={state.pendingConfirm}
        isDirty={isViewDirty(state)}
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
          ),
        )}
        <div className={`${styles.footer} ${hasConditions ? '' : styles.footerFlush}`.trim()}>
          <button
            type="button"
            className={styles.dashedBtn}
            onClick={() => dispatch({ type: 'tree/addCondition', parentId: 'root' })}
            aria-label="Add condition"
          >
            + Condition
          </button>
          <button
            type="button"
            className={styles.dashedBtn}
            onClick={() => dispatch({ type: 'tree/addGroup' })}
          >
            + Group ( OR )
          </button>

          {/* Same family as the add buttons — these all change how many rows there
           * are — and coloured against them, because this one removes every row at
           * once. It asks before doing it: there is no undo, and it now sits one
           * small gap from a button people press repeatedly. */}
          {hasConditions ? (
            <button
              type="button"
              className={styles.dangerBtn}
              aria-haspopup="dialog"
              aria-expanded={state.pendingConfirm === 'clear'}
              onClick={(event) => {
                event.stopPropagation()
                dispatch({
                  type: 'confirm/set',
                  target: state.pendingConfirm === 'clear' ? null : 'clear',
                })
              }}
            >
              Clear filters
            </button>
          ) : null}

          {/* Anchored to the row rather than the button, so it cannot be pushed off
           * the edge of a narrow column. */}
          {state.pendingConfirm === 'clear' ? (
            <ConfirmPopover
              question={clearQuestion}
              confirmLabel="Clear all"
              onConfirm={() => dispatch({ type: 'tree/clear' })}
              onCancel={() => dispatch({ type: 'confirm/set', target: null })}
            />
          ) : null}
        </div>

        {/* Lives in the panel rather than a top-bar menu: it only affects what the
         * panel shows, so it belongs where its effect is visible. Hidden until
         * there is a condition to count. */}
        {hasConditions ? (
          <label className={styles.hitsToggle}>
            <input
              type="checkbox"
              checked={state.showHitCounts}
              onChange={() => dispatch({ type: 'hitCounts/toggle' })}
            />
            Show hit count per condition
          </label>
        ) : null}
      </div>
    </div>
  )
}
