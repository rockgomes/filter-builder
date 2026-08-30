import type { Action, AppState } from '../../state/reducer'
import type { Density } from '../../domain/types'
import { SegmentedControl } from './SegmentedControl'
import { ViewChips } from './ViewChips'
import { ColumnsMenu } from './ColumnsMenu'
import styles from './TopBar.module.css'

export interface TopBarProps {
  state: AppState
  dispatch: (action: Action) => void
}

const DATA_SIZE_OPTIONS = [
  { value: 5000, label: '5k' },
  { value: 50000, label: '50k' },
]

const DENSITY_OPTIONS: Array<{ value: Density; label: string; title: string }> = [
  { value: 'Compact', label: 'S', title: 'Compact' },
  { value: 'Comfortable', label: 'M', title: 'Comfortable' },
  { value: 'Spacious', label: 'L', title: 'Spacious' },
]

export function TopBar({ state, dispatch }: TopBarProps) {
  return (
    <div className={styles.topBar}>
      <div className={styles.brand}>
        <div className={styles.logo}>F</div>
        <div className={styles.wordmark}>Fieldset</div>
      </div>

      <div className={styles.divider} />

      <ViewChips
        views={state.views}
        activeView={state.activeView}
        onSelect={(viewId) => dispatch({ type: 'view/select', viewId })}
      />

      <div className={styles.spacer} />

      <div className={styles.rightGroup}>
        <span className={styles.demoLabel}>demo</span>

        <SegmentedControl
          ariaLabel="Dataset size"
          options={DATA_SIZE_OPTIONS}
          value={state.dataN}
          onChange={(dataN) => dispatch({ type: 'load/start', dataN })}
          mono
        />

        <button
          type="button"
          className={styles.breakBtn}
          onClick={() => dispatch({ type: 'load/error' })}
        >
          break it
        </button>

        <div className={styles.divider} />

        <SegmentedControl
          ariaLabel="Row density"
          options={DENSITY_OPTIONS}
          value={state.density}
          onChange={(density) => dispatch({ type: 'density/set', density })}
        />

        <button
          type="button"
          className={styles.columnsBtn}
          onClick={(event) => {
            // Stop propagation so the root's outside-click handler (which closes the
            // menu) doesn't fire for this same click and immediately undo the toggle.
            event.stopPropagation()
            dispatch({ type: 'columns/setMenuOpen', open: !state.colMenuOpen })
          }}
        >
          Columns ▾
        </button>
      </div>

      {state.colMenuOpen ? (
        <ColumnsMenu
          colOrder={state.colOrder}
          hidden={state.hidden}
          onToggle={(key) => dispatch({ type: 'columns/toggleVisible', key })}
          onMove={(key, direction) => dispatch({ type: 'columns/move', key, direction })}
          onClose={() => dispatch({ type: 'columns/setMenuOpen', open: false })}
        />
      ) : null}
    </div>
  )
}
