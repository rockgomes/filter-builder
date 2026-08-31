import { useCallback, useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import type { Action } from '../state/reducer'
import { RAIL_MAX_WIDTH, RAIL_MIN_WIDTH } from '../state/reducer'

const KEYBOARD_STEP = 16

/**
 * Drives the filter rail's resize handle. Mirrors `useColumnResize`: the drag
 * tracks mousemove/mouseup on `window` so it keeps working once the pointer
 * leaves the 7px handle, and the teardown is held in a ref so an unmount
 * mid-drag removes the listeners too. The reducer owns the clamp.
 */
export function useRailResize(dispatch: (action: Action) => void) {
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => cleanupRef.current?.()
  }, [])

  const startResize = useCallback(
    (event: ReactMouseEvent<HTMLDivElement>) => {
      // The handle sits between two scrollable regions; without this a drag
      // selects text across the panel.
      event.preventDefault()
      event.stopPropagation()
      cleanupRef.current?.()

      const rail = event.currentTarget.previousElementSibling
      const startWidth = rail ? rail.getBoundingClientRect().width : RAIL_MIN_WIDTH
      const startX = event.clientX

      const onMouseMove = (moveEvent: MouseEvent) => {
        dispatch({ type: 'rail/resize', width: startWidth + (moveEvent.clientX - startX) })
      }
      const onMouseUp = () => cleanupRef.current?.()

      cleanupRef.current = () => {
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
        cleanupRef.current = null
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
    },
    [dispatch]
  )

  /** A mouse-only handle would be the one control in the app a keyboard cannot reach. */
  const onKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>, currentWidth: number) => {
      if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
      event.preventDefault()
      const delta = event.key === 'ArrowRight' ? KEYBOARD_STEP : -KEYBOARD_STEP
      dispatch({ type: 'rail/resize', width: currentWidth + delta })
    },
    [dispatch]
  )

  return { startResize, onKeyDown, min: RAIL_MIN_WIDTH, max: RAIL_MAX_WIDTH }
}
