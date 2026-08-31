import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BulkBar } from './BulkBar'

const setup = (over: Partial<Parameters<typeof BulkBar>[0]> = {}) => {
  const props = {
    count: 31,
    showSelectAll: true,
    matchingCount: 206,
    onSelectAll: vi.fn(),
    onAddToCrm: vi.fn(),
    onExport: vi.fn(),
    onClear: vi.fn(),
    ...over,
  }
  render(<BulkBar {...props} />)
  return { props, user: userEvent.setup() }
}

describe('BulkBar', () => {
  it('reports the selected count', () => {
    setup()
    expect(screen.getByText('31 selected')).toBeInTheDocument()
  })

  it('names the clear action in words rather than a bare glyph', () => {
    setup()
    const clear = screen.getByRole('button', { name: 'Clear' })
    expect(clear).toBeInTheDocument()
    expect(clear.textContent).not.toBe('×')
  })

  it('clears the selection', async () => {
    const { props, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Clear' }))
    expect(props.onClear).toHaveBeenCalled()
  })

  it('keeps "select all matching" distinct from the on-screen selection', async () => {
    const { props, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Select all 206 matching' }))
    expect(props.onSelectAll).toHaveBeenCalled()
  })

  it('hides "select all matching" when there is nothing more to select', () => {
    setup({ showSelectAll: false })
    expect(screen.queryByRole('button', { name: /Select all/ })).toBeNull()
  })

  it('runs the two bulk actions', async () => {
    const { props, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Add to CRM' }))
    await user.click(screen.getByRole('button', { name: 'Export CSV' }))
    expect(props.onAddToCrm).toHaveBeenCalled()
    expect(props.onExport).toHaveBeenCalled()
  })

  it('gives every action the same shape so the tiers read as emphasis', () => {
    setup()
    const names = ['Select all 206 matching', 'Add to CRM', 'Export CSV', 'Clear']
    for (const name of names) {
      expect(screen.getByRole('button', { name }).tagName).toBe('BUTTON')
    }
  })
})
