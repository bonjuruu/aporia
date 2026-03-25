import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { NodeSearchInput } from './NodeSearchInput'
import { buildSearchResult } from '../../test/factories'

vi.mock('../../api/client')

import { searchNodes } from '../../api/client'

const searchNodesMock = vi.mocked(searchNodes)

describe('NodeSearchInput', () => {
  beforeEach(() => {
    vi.useFakeTimers({ shouldAdvanceTime: true })
    searchNodesMock.mockReset()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('renders selected display with label and clear button when value is set', () => {
    const value = buildSearchResult({ label: 'Aristotle', type: 'THINKER' })
    const onChange = vi.fn()

    render(<NodeSearchInput value={value} onChange={onChange} />)

    expect(screen.getByText('Aristotle')).toBeInTheDocument()
    expect(screen.getByLabelText('Clear selection: Aristotle')).toBeInTheDocument()
  })

  it('calls onChange(null) when clear button is clicked', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const value = buildSearchResult({ label: 'Aristotle' })
    const onChange = vi.fn()

    render(<NodeSearchInput value={value} onChange={onChange} />)

    await user.click(screen.getByLabelText('Clear selection: Aristotle'))

    expect(onChange).toHaveBeenCalledWith(null)
  })

  it('triggers debounced search after 250ms when query >= 2 chars', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const resultList = [buildSearchResult({ label: 'Plato' })]
    searchNodesMock.mockResolvedValue(resultList)
    const onChange = vi.fn()

    render(<NodeSearchInput value={null} onChange={onChange} />)

    await user.type(screen.getByRole('combobox'), 'Pla')
    expect(searchNodesMock).not.toHaveBeenCalled()

    vi.advanceTimersByTime(250)

    await waitFor(() => {
      expect(searchNodesMock).toHaveBeenCalledWith('Pla', expect.any(AbortSignal))
    })
  })

  it('displays results in dropdown as option elements', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const resultList = [
      buildSearchResult({ label: 'Plato', type: 'THINKER' }),
      buildSearchResult({ label: 'Platonism', type: 'CONCEPT' }),
    ]
    searchNodesMock.mockResolvedValue(resultList)

    render(<NodeSearchInput value={null} onChange={vi.fn()} />)

    await user.type(screen.getByRole('combobox'), 'Pla')
    vi.advanceTimersByTime(250)

    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(2)
    })
  })

  it('calls onChange with the clicked result', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const platoResult = buildSearchResult({ label: 'Plato', type: 'THINKER' })
    searchNodesMock.mockResolvedValue([platoResult])
    const onChange = vi.fn()

    render(<NodeSearchInput value={null} onChange={onChange} />)

    await user.type(screen.getByRole('combobox'), 'Pla')
    vi.advanceTimersByTime(250)

    await waitFor(() => {
      expect(screen.getByRole('option')).toBeInTheDocument()
    })

    await user.click(screen.getByRole('option'))

    expect(onChange).toHaveBeenCalledWith(platoResult)
  })

  it('does not search when query is shorter than 2 characters', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })

    render(<NodeSearchInput value={null} onChange={vi.fn()} />)

    await user.type(screen.getByRole('combobox'), 'P')
    vi.advanceTimersByTime(250)

    expect(searchNodesMock).not.toHaveBeenCalled()
  })

  it('filters out results matching excludeId', async () => {
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime })
    const excludedId = crypto.randomUUID()
    const resultList = [
      buildSearchResult({ id: excludedId, label: 'Plato' }),
      buildSearchResult({ label: 'Platonism' }),
    ]
    searchNodesMock.mockResolvedValue(resultList)

    render(<NodeSearchInput value={null} onChange={vi.fn()} excludeId={excludedId} />)

    await user.type(screen.getByRole('combobox'), 'Pla')
    vi.advanceTimersByTime(250)

    await waitFor(() => {
      expect(screen.getAllByRole('option')).toHaveLength(1)
    })
  })
})
