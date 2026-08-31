import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TopBar } from './TopBar'
import { initialState } from '../../state/reducer'

const setup = () => {
  const dispatch = vi.fn()
  render(<TopBar state={{ ...initialState(), phase: 'ready' }} dispatch={dispatch} />)
  return { dispatch, user: userEvent.setup() }
}

describe('TopBar', () => {
  it('renders every seeded view as a chip', () => {
    setup()
    expect(screen.getByRole('button', { name: /All companies/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /EMEA legacy/ })).toBeInTheDocument()
  })

  it('marks the active view as pressed', () => {
    setup()
    expect(screen.getByRole('button', { name: /ICP · Mid-market SaaS/ })).toHaveAttribute('aria-pressed', 'true')
  })

  it('labels the deleted-field warning for screen readers rather than by colour alone', () => {
    setup()
    const chip = screen.getByRole('button', { name: /EMEA legacy/ })
    expect(chip).toHaveTextContent('!')
    expect(chip.querySelector('[aria-label="references a deleted field"]')).not.toBeNull()
  })

  it('selects a view on click', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('button', { name: /All companies/ }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'view/select', viewId: 'v_all' })
  })

  it('requests the 50k dataset', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('button', { name: '50k' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'load/start', dataN: 50000 })
  })

  it('forces the error state from "break it"', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('button', { name: /break it/i }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'load/error' })
  })

  it('opens and closes the columns menu', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('button', { name: /Columns/ }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'columns/setMenuOpen', open: true })
  })

  it('changes density', async () => {
    const { dispatch, user } = setup()
    await user.click(screen.getByRole('button', { name: 'Spacious' }))
    expect(dispatch).toHaveBeenCalledWith({ type: 'density/set', density: 'Spacious' })
  })
})

describe('TopBar pinned views', () => {
  const withUnpinned = () => {
    const state = { ...initialState(), phase: 'ready' as const }
    return {
      ...state,
      views: [
        ...state.views,
        { id: 'v_hidden', name: 'Not pinned', tree: state.tree },
      ],
    }
  }

  it('gives a chip only to pinned views', () => {
    const dispatch = vi.fn()
    render(<TopBar state={withUnpinned()} dispatch={dispatch} />)
    expect(screen.getByRole('button', { name: /All companies/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Not pinned' })).toBeNull()
  })

  it('always offers the Saved views menu, since it is the only route to unpinned views', () => {
    const dispatch = vi.fn()
    render(<TopBar state={withUnpinned()} dispatch={dispatch} />)
    expect(screen.getByRole('button', { name: 'Saved views' })).toBeInTheDocument()
  })

  it('reflects the menu being open on the button itself', () => {
    const dispatch = vi.fn()
    const state = { ...initialState(), phase: 'ready' as const }
    render(<TopBar state={{ ...state, viewMenuOpen: true }} dispatch={dispatch} />)
    expect(screen.getByRole('button', { name: 'Saved views' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('reflects the columns menu being open on its button', () => {
    const dispatch = vi.fn()
    const state = { ...initialState(), phase: 'ready' as const }
    render(<TopBar state={{ ...state, colMenuOpen: true }} dispatch={dispatch} />)
    expect(screen.getByRole('button', { name: 'Columns' })).toHaveAttribute('aria-expanded', 'true')
  })

  it('marks the active chip when it has unsaved edits', () => {
    const dispatch = vi.fn()
    const state = { ...initialState(), phase: 'ready' as const }
    render(<TopBar state={{ ...state, drafts: { v_icp: state.tree } }} dispatch={dispatch} />)
    const chip = screen.getByRole('button', { name: /ICP · Mid-market SaaS/ })
    expect(chip.querySelector('[aria-label="has unsaved changes"]')).not.toBeNull()
  })

  it('leaves a clean chip unmarked', () => {
    const dispatch = vi.fn()
    render(<TopBar state={{ ...initialState(), phase: 'ready' }} dispatch={dispatch} />)
    const chip = screen.getByRole('button', { name: /ICP · Mid-market SaaS/ })
    expect(chip.querySelector('[aria-label="has unsaved changes"]')).toBeNull()
  })
})
