import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { SaveViewDialog } from './SaveViewDialog'
import { MAX_VIEW_NAME_LENGTH } from '../../state/reducer'

const setup = (over: { saveName?: string; pinned?: boolean } = {}) => {
  const dispatch = vi.fn()
  render(
    <SaveViewDialog
      saveName={over.saveName ?? ''}
      pinned={over.pinned ?? false}
      dispatch={dispatch}
    />,
  )
  return { dispatch, user: userEvent.setup() }
}

describe('SaveViewDialog naming', () => {
  it('focuses the name input on open', () => {
    setup()
    expect(screen.getByLabelText('Name')).toHaveFocus()
  })

  it('reports each keystroke to the reducer', async () => {
    const { dispatch, user } = setup()
    await user.type(screen.getByLabelText('Name'), 'A')
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/setName', name: 'A' })
  })

  it('stops the input at the name limit', () => {
    setup()
    expect(screen.getByLabelText('Name')).toHaveAttribute('maxlength', String(MAX_VIEW_NAME_LENGTH))
  })

  it('counts down only once the limit is close', () => {
    setup({ saveName: 'x'.repeat(MAX_VIEW_NAME_LENGTH - 3) })
    expect(
      screen.getByText(`${MAX_VIEW_NAME_LENGTH - 3}/${MAX_VIEW_NAME_LENGTH}`),
    ).toBeInTheDocument()
  })

  it('stays quiet about the limit on a short name', () => {
    setup({ saveName: 'Short' })
    expect(screen.queryByText(new RegExp(`/${MAX_VIEW_NAME_LENGTH}`))).toBeNull()
  })
})

describe('SaveViewDialog saving', () => {
  it('refuses an empty name rather than inventing one', () => {
    setup({ saveName: '   ' })
    expect(screen.getByRole('button', { name: 'Save view' })).toBeDisabled()
  })

  it('saves a named view', async () => {
    const { dispatch, user } = setup({ saveName: 'My view' })
    await user.click(screen.getByRole('button', { name: 'Save view' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/confirmSave' })
  })

  it('saves on Enter from the name field', async () => {
    const { dispatch, user } = setup({ saveName: 'My view' })
    await user.type(screen.getByLabelText('Name'), '{Enter}')
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/confirmSave' })
  })
})

describe('SaveViewDialog pinning', () => {
  // Saving used to pin on your behalf. The choice is offered here instead, off by
  // default, so a run of saved views does not silently fill the top bar.
  it('starts unpinned', () => {
    setup()
    expect(screen.getByRole('checkbox', { name: /Pin it/ })).not.toBeChecked()
  })

  it('asks for the pin', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('checkbox', { name: /Pin it/ }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/setSavePinned', pinned: true })
  })

  it('reflects a pin already chosen', () => {
    setup({ pinned: true })
    expect(screen.getByRole('checkbox', { name: /Pin it/ })).toBeChecked()
  })
})

describe('SaveViewDialog dismissal', () => {
  it('cancels from the button', async () => {
    const { dispatch, user } = setup({ saveName: 'Half typed' })
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/cancelSave' })
  })

  it('cancels on Escape', async () => {
    const { dispatch, user } = setup()
    await user.keyboard('{Escape}')
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/cancelSave' })
  })

  it('cancels on a click outside the dialog', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('dialog').parentElement!)
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/cancelSave' })
  })

  it('does not cancel on a click inside the dialog', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('heading', { name: 'Save as a new view' }))
    expect(dispatch).not.toHaveBeenCalled()
  })
})

describe('SaveViewDialog accessibility', () => {
  it('is a modal dialog named by its heading', () => {
    setup()
    expect(screen.getByRole('dialog', { name: 'Save as a new view' })).toHaveAttribute(
      'aria-modal',
      'true',
    )
  })

  // Tab out of the last control and focus lands back on the first, not on the page
  // behind the dialog.
  it('keeps Tab inside the dialog', async () => {
    const { user } = setup({ saveName: 'My view' })
    const name = screen.getByLabelText('Name')
    await user.tab()
    await user.tab()
    await user.tab()
    expect(document.activeElement).not.toBe(document.body)
    await user.tab()
    expect(name).toHaveFocus()
  })
})
