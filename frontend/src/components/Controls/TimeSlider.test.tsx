import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { TimeSlider } from './TimeSlider'

describe('TimeSlider', () => {
  const defaultProps = {
    minYear: -500,
    maxYear: 1900,
    value: 400,
    onChange: vi.fn(),
    playing: false,
    onPlayToggle: vi.fn(),
  }

  it('renders PLAY button when not playing', () => {
    render(<TimeSlider {...defaultProps} />)

    expect(screen.getByRole('button', { name: /play/i })).toHaveTextContent('PLAY')
  })

  it('renders PAUSE button when playing', () => {
    render(<TimeSlider {...defaultProps} playing={true} />)

    expect(screen.getByRole('button', { name: /pause/i })).toHaveTextContent('PAUSE')
  })

  it('calls onPlayToggle when play button is clicked', async () => {
    const user = userEvent.setup()
    const onPlayToggle = vi.fn()
    render(<TimeSlider {...defaultProps} onPlayToggle={onPlayToggle} />)

    await user.click(screen.getByRole('button', { name: /play/i }))

    expect(onPlayToggle).toHaveBeenCalledOnce()
  })

  it('renders slider with correct min, max, and value attributes', () => {
    render(<TimeSlider {...defaultProps} />)

    const slider = screen.getByRole('slider')
    expect(slider).toHaveAttribute('min', '-500')
    expect(slider).toHaveAttribute('max', '1900')
    expect(slider).toHaveValue('400')
  })

  it('shows formatted year labels including BCE', () => {
    render(<TimeSlider {...defaultProps} />)

    expect(screen.getByText('500 BCE')).toBeInTheDocument()
    expect(screen.getByText('1900')).toBeInTheDocument()
    expect(screen.getByText('400')).toBeInTheDocument()
  })
})
