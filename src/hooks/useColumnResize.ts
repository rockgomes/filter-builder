import { useCallback, useEffect, useRef, type MouseEvent as ReactMouseEvent } from 'react'
import type { Action } from '../state/reducer'

/**
 * Drives column-resize dragging. mousedown on a resize handle captures the
 * column's current rendered width (read straight off its parent header
 * cell's DOM box, so no width state needs threading through) and the
 * pointer's starting X, then tracks mousemove/mouseup on `window` for the
 * duration of one drag — the drag must keep working even once the pointer
 * leaves the handle or the table entirely. The reducer clamps the result to
 * the 70px minimum.
 */
export function useColumnResize(dispatch: (action: Action) => void) {
  // Holds the active drag's teardown so an unmount mid-drag (e.g. switching
  // datasets while resizing) can remove the window listeners too — they'd
  // otherwise only ever be removed by mouseup, and leak past unmount.
  const cleanupRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    return () => cleanupRef.current?.()
  }, [])

  const startResize = useCallback(
    (key: string, event: ReactMouseEvent<HTMLDivElement>) => {
      // Never let a resize drag also register as a header click/sort.
      event.preventDefault()
      event.stopPropagation()

      // A previous drag's listeners should already be gone by mouseup, but
      // guard against overlap defensively before starting a new one.
      cleanupRef.current?.()

      const cell = event.currentTarget.parentElement
      const startWidth = cell ? cell.getBoundingClientRect().width : 0
      const startX = event.clientX

      const onMouseMove = (moveEvent: MouseEvent) => {
        dispatch({ type: 'columns/resize', key, width: startWidth + (moveEvent.clientX - startX) })
      }
      const onMouseUp = () => {
        cleanupRef.current = null
        window.removeEventListener('mousemove', onMouseMove)
        window.removeEventListener('mouseup', onMouseUp)
      }

      window.addEventListener('mousemove', onMouseMove)
      window.addEventListener('mouseup', onMouseUp)
      cleanupRef.current = onMouseUp
    },
    [dispatch]
  )

  return { startResize }
}
