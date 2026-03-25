import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { FilterBar } from './FilterBar'
import type { NodeType } from '../../types'

describe('FilterBar', () => {
  it('renders all 4 node type buttons', () => {
    render(<FilterBar activeTypes={new Set<NodeType>()} onToggle={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'THINKER' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CONCEPT' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'CLAIM' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'TEXT' })).toBeInTheDocument()
  })

  it('sets aria-pressed based on activeTypes', () => {
    const activeTypes = new Set<NodeType>(['THINKER', 'CLAIM'])
    render(<FilterBar activeTypes={activeTypes} onToggle={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'THINKER' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'CLAIM' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'CONCEPT' })).toHaveAttribute('aria-pressed', 'false')
    expect(screen.getByRole('button', { name: 'TEXT' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('calls onToggle with the correct type when clicked', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()
    render(<FilterBar activeTypes={new Set<NodeType>()} onToggle={onToggle} />)

    await user.click(screen.getByRole('button', { name: 'CONCEPT' }))

    expect(onToggle).toHaveBeenCalledWith('CONCEPT')
  })
})
