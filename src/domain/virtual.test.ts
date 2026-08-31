import { describe, expect, it } from 'vitest'
import { computeWindow } from './virtual'

const base = { count: 5000, rowHeight: 32, viewportHeight: 640, scrollTop: 0 }

describe('computeWindow', () => {
  it('starts at zero and never goes negative at the top', () => {
    const w = computeWindow(base)
    expect(w.start).toBe(0)
    expect(w.topPad).toBe(0)
  })

  it('overscans five rows above the visible range', () => {
    const w = computeWindow({ ...base, scrollTop: 3200 })
    expect(w.start).toBe(95)
    expect(w.topPad).toBe(95 * 32)
  })

  it('overscans twelve rows below the visible range', () => {
    const w = computeWindow({ ...base, scrollTop: 3200 })
    expect(w.end).toBe(95 + Math.ceil(640 / 32) + 12)
  })

  it('clamps the end to the row count', () => {
    const w = computeWindow({ ...base, count: 10 })
    expect(w.end).toBe(10)
    expect(w.botPad).toBe(0)
  })

  it('pads the remaining rows below the window', () => {
    const w = computeWindow({ ...base, scrollTop: 0 })
    expect(w.botPad).toBe((5000 - w.end) * 32)
  })

  it('handles an empty dataset', () => {
    const w = computeWindow({ ...base, count: 0 })
    expect(w).toEqual({ start: 0, end: 0, topPad: 0, botPad: 0 })
  })

  it('handles a zero-height viewport before measurement', () => {
    const w = computeWindow({ ...base, viewportHeight: 0 })
    expect(w.start).toBe(0)
    expect(w.end).toBe(12)
  })

  it('handles stale deep scrollTop against small count — start <= end', () => {
    const w = computeWindow({ count: 100, rowHeight: 32, viewportHeight: 640, scrollTop: 100000 })
    expect(w.start).toBeLessThanOrEqual(w.end)
    expect(w.end).toBe(100)
    // Content-height identity: spacers + rendered rows = total content height
    const contentHeight = w.topPad + w.botPad + (w.end - w.start) * 32
    expect(contentHeight).toBe(100 * 32)
  })

  it('handles stale deep scrollTop against zero count', () => {
    const w = computeWindow({ count: 0, rowHeight: 32, viewportHeight: 640, scrollTop: 100000 })
    expect(w).toEqual({ start: 0, end: 0, topPad: 0, botPad: 0 })
  })

  it('satisfies content-height identity in normal mid-scroll case', () => {
    const w = computeWindow({ ...base, scrollTop: 3200 })
    const contentHeight = w.topPad + w.botPad + (w.end - w.start) * 32
    expect(contentHeight).toBe(5000 * 32)
  })
})
