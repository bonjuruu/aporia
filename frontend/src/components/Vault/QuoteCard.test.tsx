import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QuoteCard } from './QuoteCard'
import { buildQuote } from '../../test/factories'

describe('QuoteCard', () => {
  it('renders quote content and source text title', () => {
    const quote = buildQuote({ content: 'Know thyself', sourceTextTitle: 'Protagoras' })

    render(<QuoteCard quote={quote} onPromote={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.getByText('Know thyself')).toBeInTheDocument()
    expect(screen.getByText('Protagoras')).toBeInTheDocument()
  })

  it('renders page number when present', () => {
    const quote = buildQuote({ page: 42 })

    render(<QuoteCard quote={quote} onPromote={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.getByText('p. 42')).toBeInTheDocument()
  })

  it('shows PROMOTED badge for promoted quotes', () => {
    const quote = buildQuote({ status: 'promoted' })

    render(<QuoteCard quote={quote} onPromote={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.getByText('PROMOTED')).toBeInTheDocument()
  })

  it('does not show action buttons for promoted quotes', () => {
    const quote = buildQuote({ status: 'promoted' })

    render(<QuoteCard quote={quote} onPromote={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.queryByText('PROMOTE')).not.toBeInTheDocument()
    expect(screen.queryByText('DELETE')).not.toBeInTheDocument()
  })

  it('shows PROMOTE and DELETE buttons for raw quotes', () => {
    const quote = buildQuote({ status: 'raw' })

    render(<QuoteCard quote={quote} onPromote={vi.fn()} onDelete={vi.fn()} />)

    expect(screen.getByText('PROMOTE')).toBeInTheDocument()
    expect(screen.getByText('DELETE')).toBeInTheDocument()
  })

  it('shows CONFIRM DELETE and CANCEL after clicking DELETE', async () => {
    const user = userEvent.setup()
    const quote = buildQuote({ status: 'raw' })

    render(<QuoteCard quote={quote} onPromote={vi.fn()} onDelete={vi.fn()} />)

    await user.click(screen.getByText('DELETE'))

    expect(screen.getByText('CONFIRM DELETE')).toBeInTheDocument()
    expect(screen.getByText('CANCEL')).toBeInTheDocument()
  })

  it('returns to DELETE button after clicking CANCEL', async () => {
    const user = userEvent.setup()
    const quote = buildQuote({ status: 'raw' })

    render(<QuoteCard quote={quote} onPromote={vi.fn()} onDelete={vi.fn()} />)

    await user.click(screen.getByText('DELETE'))
    await user.click(screen.getByText('CANCEL'))

    expect(screen.getByText('DELETE')).toBeInTheDocument()
  })

  it('calls onDelete with quote id when CONFIRM DELETE is clicked', async () => {
    const user = userEvent.setup()
    const quote = buildQuote({ status: 'raw' })
    const onDelete = vi.fn()

    render(<QuoteCard quote={quote} onPromote={vi.fn()} onDelete={onDelete} />)

    await user.click(screen.getByText('DELETE'))
    await user.click(screen.getByText('CONFIRM DELETE'))

    expect(onDelete).toHaveBeenCalledWith(quote.id)
  })

  it('calls onPromote with quote id when PROMOTE is clicked', async () => {
    const user = userEvent.setup()
    const quote = buildQuote({ status: 'raw' })
    const onPromote = vi.fn()

    render(<QuoteCard quote={quote} onPromote={onPromote} onDelete={vi.fn()} />)

    await user.click(screen.getByText('PROMOTE'))

    expect(onPromote).toHaveBeenCalledWith(quote.id)
  })
})
