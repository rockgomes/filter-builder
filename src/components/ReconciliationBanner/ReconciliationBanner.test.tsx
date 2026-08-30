import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ReconciliationBanner } from './ReconciliationBanner'

const setup = () => {
  const onKeep = vi.fn()
  const onTrim = vi.fn()
  const onClear = vi.fn()
  render(
    <ReconciliationBanner
      snapCount={1240} matchingCount={318}
      onKeep={onKeep} onTrim={onTrim} onClear={onClear}
    />
  )
  return { onKeep, onTrim, onClear, user: userEvent.setup() }
}

describe('ReconciliationBanner', () => {
  it('states what was selected and how much still matches', () => {
    setup()
    expect(
      screen.getByText(
        'You selected all 1,240 rows matching the previous filter. The filter changed — 318 of them still match.'
      )
    ).toBeInTheDocument()
  })

  it('announces itself as a status', () => {
    setup()
    expect(screen.getByRole('status')).toBeInTheDocument()
  })

  it('offers all three resolutions with their counts', () => {
    setup()
    expect(screen.getByRole('button', { name: 'Keep all 1,240' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Trim to 318 matching' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Clear selection' })).toBeInTheDocument()
  })

  it('invokes keep', async () => {
    const { onKeep, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Keep all 1,240' }))
    expect(onKeep).toHaveBeenCalled()
  })

  it('invokes trim', async () => {
    const { onTrim, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Trim to 318 matching' }))
    expect(onTrim).toHaveBeenCalled()
  })

  it('invokes clear', async () => {
    const { onClear, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Clear selection' }))
    expect(onClear).toHaveBeenCalled()
  })
})
