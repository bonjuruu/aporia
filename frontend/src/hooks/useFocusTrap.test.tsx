import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useFocusTrap } from './useFocusTrap'

function TrapContainer({ active }: { active: boolean }) {
  const ref = useFocusTrap(active)
  return (
    <div ref={ref}>
      <button data-testid="first">First</button>
      <button data-testid="second">Second</button>
      <button data-testid="last">Last</button>
    </div>
  )
}

describe('useFocusTrap', () => {
  it('Tab from last element wraps to first', async () => {
    const user = userEvent.setup()
    const { getByTestId } = render(<TrapContainer active={true} />)

    const firstButton = getByTestId('first')
    const lastButton = getByTestId('last')

    lastButton.focus()
    expect(document.activeElement).toBe(lastButton)

    await user.tab()

    expect(document.activeElement).toBe(firstButton)
  })

  it('Shift+Tab from first element wraps to last', async () => {
    const user = userEvent.setup()
    const { getByTestId } = render(<TrapContainer active={true} />)

    const firstButton = getByTestId('first')
    const lastButton = getByTestId('last')

    firstButton.focus()
    expect(document.activeElement).toBe(firstButton)

    await user.tab({ shift: true })

    expect(document.activeElement).toBe(lastButton)
  })

  it('inactive trap does not intercept Tab', async () => {
    const user = userEvent.setup()
    const { getByTestId } = render(<TrapContainer active={false} />)

    const lastButton = getByTestId('last')

    lastButton.focus()
    expect(document.activeElement).toBe(lastButton)

    await user.tab()

    // When inactive, the trap handler is not registered so focus moves naturally
    // (in jsdom, Tab moves to document.body when there are no more focusable elements after last)
    expect(document.activeElement).not.toBe(getByTestId('first'))
  })
})
