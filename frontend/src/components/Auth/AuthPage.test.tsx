import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthPage } from './AuthPage'

describe('AuthPage', () => {
  it('renders login mode by default', () => {
    render(<AuthPage onLogin={vi.fn()} onRegister={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'AUTHENTICATE' })).toBeInTheDocument()
  })

  it('switches to register mode when toggle is clicked', async () => {
    const user = userEvent.setup()
    render(<AuthPage onLogin={vi.fn()} onRegister={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'REQUEST NEW ACCESS' }))

    expect(screen.getByRole('button', { name: 'REGISTER' })).toBeInTheDocument()
  })

  it('submits login form with email and password', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn().mockResolvedValue(undefined)
    render(<AuthPage onLogin={onLogin} onRegister={vi.fn()} />)

    await user.type(screen.getByLabelText('Identifier'), 'plato@academy.gr')
    await user.type(screen.getByLabelText('Access Key'), 'knowledge42')
    await user.click(screen.getByRole('button', { name: 'AUTHENTICATE' }))

    expect(onLogin).toHaveBeenCalledWith('plato@academy.gr', 'knowledge42')
  })

  it('shows error on login failure', async () => {
    const user = userEvent.setup()
    const onLogin = vi.fn().mockRejectedValue(new Error('Bad credentials'))
    render(<AuthPage onLogin={onLogin} onRegister={vi.fn()} />)

    await user.type(screen.getByLabelText('Identifier'), 'plato@academy.gr')
    await user.type(screen.getByLabelText('Access Key'), 'wrongpass1')
    await user.click(screen.getByRole('button', { name: 'AUTHENTICATE' }))

    expect(screen.getByRole('alert')).toHaveTextContent('Bad credentials')
  })

  it('disables submit button while loading', async () => {
    const user = userEvent.setup()
    let resolveLogin: () => void
    const onLogin = vi.fn().mockImplementation(
      () => new Promise<void>((resolve) => { resolveLogin = resolve }),
    )
    render(<AuthPage onLogin={onLogin} onRegister={vi.fn()} />)

    await user.type(screen.getByLabelText('Identifier'), 'plato@academy.gr')
    await user.type(screen.getByLabelText('Access Key'), 'knowledge42')
    await user.click(screen.getByRole('button', { name: 'AUTHENTICATE' }))

    expect(screen.getByRole('button', { name: 'PROCESSING...' })).toBeDisabled()

    resolveLogin!()
  })
})
