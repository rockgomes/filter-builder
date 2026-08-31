import styles from './ConditionRow.module.css'

export interface EnumChipsProps {
  options: string[]
  selected: string[]
  small?: boolean
  onToggle: (option: string) => void
}

export function EnumChips({ options, selected, small, onToggle }: EnumChipsProps) {
  return (
    <div className={styles.chipsWrap}>
      {options.map((option) => {
        const active = selected.includes(option)
        return (
          <button
            key={option}
            type="button"
            aria-pressed={active}
            className={`${active ? styles.chipActive : styles.chipInactive} ${small ? styles.chipSmall : ''}`.trim()}
            onClick={() => onToggle(option)}
          >
            {option}
          </button>
        )
      })}
    </div>
  )
}
