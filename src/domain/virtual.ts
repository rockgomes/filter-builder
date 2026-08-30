export interface WindowInput {
  count: number
  rowHeight: number
  viewportHeight: number
  scrollTop: number
  overscanAbove?: number
  overscanBelow?: number
}

export interface WindowRange {
  start: number
  end: number
  topPad: number
  botPad: number
}

export function computeWindow({
  count,
  rowHeight,
  viewportHeight,
  scrollTop,
  overscanAbove = 5,
  overscanBelow = 12,
}: WindowInput): WindowRange {
  const start = Math.max(0, Math.floor(scrollTop / rowHeight) - overscanAbove)
  const visible = Math.ceil(viewportHeight / rowHeight)
  const end = Math.min(count, start + visible + overscanBelow)
  return {
    start,
    end,
    topPad: start * rowHeight,
    botPad: Math.max(0, (count - end) * rowHeight),
  }
}
