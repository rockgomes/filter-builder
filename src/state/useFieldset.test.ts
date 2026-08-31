import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useFieldset } from './useFieldset'

describe('useFieldset', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('starts in the loading phase', () => {
    const { result } = renderHook(() => useFieldset())
    expect(result.current.state.phase).toBe('loading')
  })

  it('becomes ready with the default dataset once the load timer fires', () => {
    const { result } = renderHook(() => useFieldset())

    act(() => {
      vi.advanceTimersByTime(900)
    })

    expect(result.current.state.phase).toBe('ready')
    expect(result.current.state.dataVersion).toBe(1)
    expect(result.current.rows).toHaveLength(5000)
  })

  it('reloads a larger dataset on load/start, returning to loading and then ready after its own delay', () => {
    const { result } = renderHook(() => useFieldset())
    act(() => {
      vi.advanceTimersByTime(900)
    })

    act(() => {
      result.current.dispatch({ type: 'load/start', dataN: 50000 })
    })
    expect(result.current.state.phase).toBe('loading')

    act(() => {
      vi.advanceTimersByTime(1100)
    })
    expect(result.current.state.phase).toBe('ready')
    expect(result.current.rows).toHaveLength(50000)
  })

  it('auto-dismisses a toast 2600ms after it is shown', () => {
    const { result } = renderHook(() => useFieldset())

    act(() => {
      result.current.dispatch({ type: 'toast/show', message: 'Saved' })
    })
    expect(result.current.state.toast).toBe('Saved')

    act(() => {
      vi.advanceTimersByTime(2600)
    })
    expect(result.current.state.toast).toBeNull()
  })

  it('derives non-empty filtered/sorted rows once ready, sorted by revenue descending', () => {
    const { result } = renderHook(() => useFieldset())
    act(() => {
      vi.advanceTimersByTime(900)
    })

    expect(result.current.filtered.length).toBeGreaterThan(0)
    expect(result.current.sorted).toHaveLength(result.current.filtered.length)
    expect(result.current.sorted[0].revenue).toBeGreaterThanOrEqual(result.current.sorted[1].revenue)
  })

  it('restarts the full 2600ms dismiss window when the same message is raised again', () => {
    const { result } = renderHook(() => useFieldset())

    act(() => {
      result.current.dispatch({ type: 'toast/show', message: 'Export CSV' })
    })
    expect(result.current.state.toast).toBe('Export CSV')

    // Raise the identical message again before the first timer would fire.
    act(() => {
      vi.advanceTimersByTime(2500)
      result.current.dispatch({ type: 'toast/show', message: 'Export CSV' })
    })
    expect(result.current.state.toast).toBe('Export CSV')

    // The original timer's deadline (2500ms + 100ms = 2600ms since the first
    // raise) has now passed. A correctly-restarted timer must NOT have fired.
    act(() => {
      vi.advanceTimersByTime(100)
    })
    expect(result.current.state.toast).toBe('Export CSV')

    // The rest of the second raise's own 2600ms window.
    act(() => {
      vi.advanceTimersByTime(2500)
    })
    expect(result.current.state.toast).toBeNull()
  })

  it('cleans up the load timer on unmount without an act/state-update warning', () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const { unmount } = renderHook(() => useFieldset())

    unmount()
    act(() => {
      vi.advanceTimersByTime(2000)
    })

    expect(errorSpy).not.toHaveBeenCalled()
    errorSpy.mockRestore()
  })
})
