import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ViewMenu } from './ViewMenu'
import { seedViews } from '../../domain/tree'
import type { SavedView } from '../../domain/types'

const setup = (over: Partial<Parameters<typeof ViewMenu>[0]> = {}) => {
  const dispatch = vi.fn()
  const onClose = vi.fn()
  const props = { views: seedViews(), activeView: 'v_icp', pendingDelete: null, onClose, dispatch, ...over }
  render(<ViewMenu {...props} />)
  return { dispatch, onClose, props, user: userEvent.setup() }
}

const unpinned: SavedView[] = [
  { id: 'v_all', name: 'All companies', tree: { kind: 'group', id: 'root', op: 'AND', children: [] }, pinned: true, locked: true },
  { id: 'v_x', name: 'Only in the menu', tree: { kind: 'group', id: 'root', op: 'AND', children: [] } },
]

describe('ViewMenu', () => {
  it('lists unpinned views, which have no chip of their own', () => {
    setup({ views: unpinned })
    expect(screen.getByRole('button', { name: 'Only in the menu' })).toBeInTheDocument()
  })

  it('selects a view and closes', async () => {
    const { dispatch, onClose, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Not in CRM, active' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/select', viewId: 'v_ncrm' })
    expect(onClose).toHaveBeenCalled()
  })

  it('pins and unpins', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('button', { name: /Unpin ICP/ }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/togglePin', viewId: 'v_icp' })
  })

  it('renames on Enter', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('button', { name: /Rename ICP/ }))
    const input = screen.getByLabelText(/Rename ICP/)
    await user.clear(input)
    await user.type(input, 'ICP v2{Enter}')
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/rename', viewId: 'v_icp', name: 'ICP v2' })
  })

  it('abandons a rename on Escape', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('button', { name: /Rename ICP/ }))
    await user.type(screen.getByLabelText(/Rename ICP/), '{Escape}')
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'view/rename' }))
  })
})

describe('ViewMenu deletion', () => {
  it('asks before deleting rather than deleting on the first click', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('button', { name: /Delete ICP/ }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/confirmDelete', viewId: 'v_icp' })
    expect(dispatch).not.toHaveBeenCalledWith(expect.objectContaining({ type: 'view/delete' }))
  })

  it('names the view in the confirmation', () => {
    setup({ pendingDelete: 'v_icp' })
    expect(screen.getByText(/Delete “ICP · Mid-market SaaS”\?/)).toBeInTheDocument()
  })

  it('deletes once confirmed', async () => {
    const { dispatch, user } = setup({ pendingDelete: 'v_icp' })
    await user.click(screen.getByRole('button', { name: 'Delete' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/delete', viewId: 'v_icp' })
  })

  it('backs out of the confirmation', async () => {
    const { dispatch, user } = setup({ pendingDelete: 'v_icp' })
    await user.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/confirmDelete', viewId: null })
  })
})

describe('ViewMenu locked view', () => {
  it('offers no destructive actions on the escape-hatch view', () => {
    setup()
    expect(screen.queryByRole('button', { name: /Delete All companies/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Unpin All companies/ })).toBeNull()
    expect(screen.queryByRole('button', { name: /Rename All companies/ })).toBeNull()
  })

  it('says why', () => {
    setup()
    expect(screen.getByText('always here')).toBeInTheDocument()
  })
})
