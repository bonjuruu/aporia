import React, { useState } from 'react'

interface Props {
  onLogin: (email: string, password: string) => Promise<void>
  onRegister: (email: string, password: string) => Promise<void>
}

export function AuthPage({ onLogin, onRegister }: Props) {
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.SubmitEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (loading) return
    setError(null)
    setLoading(true)
    try {
      if (mode === 'login') {
        await onLogin(email, password)
      } else {
        await onRegister(email, password)
      }
    } catch (submitErr) {
      setError(submitErr instanceof Error ? submitErr.message : 'Authentication failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__subtitle">System Access</div>
        <h1 className="auth-card__title">Aporia</h1>

        <form onSubmit={handleSubmit}>
          <div className="form-field--md">
            <label className="meta-label" htmlFor="auth-email">
              Identifier
            </label>
            <input
              id="auth-email"
              className="input"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@domain.com"
              required
            />
          </div>

          <div className="form-field--lg">
            <label className="meta-label" htmlFor="auth-password">
              Access Key
            </label>
            <input
              id="auth-password"
              className="input"
              type="password"
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="minimum 8 characters"
              required
              minLength={8}
              maxLength={72}
            />
          </div>

          {error && (
            <div className="auth-card__error" role="alert">
              {error}
            </div>
          )}

          <button
            className="btn btn--full"
            type="submit"
            disabled={loading}
            style={{ marginBottom: 16 }}
          >
            {loading ? 'PROCESSING...' : mode === 'login' ? 'AUTHENTICATE' : 'REGISTER'}
          </button>
        </form>

        <div className="text-center">
          <button
            className="link-btn"
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setEmail(''); setPassword(''); setError(null) }}
          >
            {mode === 'login' ? 'REQUEST NEW ACCESS' : 'EXISTING ACCESS'}
          </button>
        </div>
      </div>
    </div>
  )
}
