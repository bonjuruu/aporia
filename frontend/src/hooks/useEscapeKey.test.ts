import { renderHook } from '@testing-library/react'
import { useEscapeKey } from './useEscapeKey'

function pressKey(key: string) {
  document.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }))
}

describe('useEscapeKey', () => {
  it('calls onEscape when Escape pressed and active=true', () => {
    const onEscape = vi.fn()
    renderHook(() => useEscapeKey(true, onEscape))

    pressKey('Escape')

    expect(onEscape).toHaveBeenCalledOnce()
  })

  it('does not call onEscape when active=false', () => {
    const onEscape = vi.fn()
    renderHook(() => useEscapeKey(false, onEscape))

    pressKey('Escape')

    expect(onEscape).not.toHaveBeenCalled()
  })

  it('does not call onEscape for non-Escape keys', () => {
    const onEscape = vi.fn()
    renderHook(() => useEscapeKey(true, onEscape))

    pressKey('Enter')
    pressKey('Tab')
    pressKey('a')

    expect(onEscape).not.toHaveBeenCalled()
  })

  it('uses ref for callback identity so latest callback is called', () => {
    const firstCallback = vi.fn()
    const secondCallback = vi.fn()

    const { rerender } = renderHook(
      ({ callback }) => useEscapeKey(true, callback),
      { initialProps: { callback: firstCallback } },
    )

    rerender({ callback: secondCallback })

    pressKey('Escape')

    expect(firstCallback).not.toHaveBeenCalled()
    expect(secondCallback).toHaveBeenCalledOnce()
  })
})
