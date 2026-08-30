import styles from './SegmentedControl.module.css'

export interface SegmentedOption<T extends string | number> {
  value: T
  label: string
  /** Accessible name (and tooltip) shown when it differs from the visible label. */
  title?: string
}

export interface SegmentedControlProps<T extends string | number> {
  options: SegmentedOption<T>[]
  value: T
  onChange: (value: T) => void
  ariaLabel: string
  mono?: boolean
}

export function SegmentedControl<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
  mono,
}: SegmentedControlProps<T>) {
  return (
    <div className={styles.wrapper} role="group" aria-label={ariaLabel}>
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            className={`${styles.button} ${active ? styles.active : ''} ${mono ? styles.mono : ''}`.trim()}
            aria-pressed={active}
            aria-label={option.title}
            title={option.title}
            onClick={() => onChange(option.value)}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}
