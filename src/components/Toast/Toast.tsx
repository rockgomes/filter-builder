import styles from './Toast.module.css'

export interface ToastProps {
  message: string
}

/** Auto-dismissal (2600ms) lives in `useFieldset` — this component only renders
 *  the current message while `state.toast` is set. */
export function Toast({ message }: ToastProps) {
  return (
    <div className={styles.toast} role="status">
      {message}
    </div>
  )
}
