import { useCallback, useEffect, useRef } from 'react'

/**
 * Coalesces scroll events onto animation frames: only the latest scrollTop
 * from a burst of native scroll events is delivered, once per frame, so the
 * virtual window recompute never runs more than 60x/sec regardless of how
 * fast the browser fires the scroll event.
 */
export function useRafScroll(onScroll: (top: number) => void) {
  const frame = useRef<number | null>(null)
  const latest = useRef(0)

  useEffect(() => () => {
    if (frame.current !== null) cancelAnimationFrame(frame.current)
  }, [])

  return useCallback(
    (event: React.UIEvent<HTMLDivElement>) => {
      latest.current = event.currentTarget.scrollTop
      if (frame.current !== null) return
      frame.current = requestAnimationFrame(() => {
        frame.current = null
        onScroll(latest.current)
      })
    },
    [onScroll]
  )
}
