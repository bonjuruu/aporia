import { useState } from 'react'

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
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
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100vh',
      background: 'var(--color-bg-primary)',
    }}>
      <div style={{
        width: 360,
        padding: 32,
        border: '1px solid var(--color-border-strong)',
        background: 'var(--color-bg-panel)',
      }}>
        <div style={{
          fontFamily: 'var(--font-mono)',
          fontSize: 11,
          letterSpacing: '0.15em',
          color: 'var(--color-text-muted)',
          marginBottom: 4,
          textTransform: 'uppercase',
        }}>
          System Access
        </div>
        <h1 style={{
          fontFamily: 'var(--font-serif)',
          fontSize: 28,
          fontWeight: 400,
          color: 'var(--color-text-primary)',
          marginBottom: 32,
        }}>
          Aporia
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 16 }}>
            <label className="meta-label" style={{ display: 'block', marginBottom: 6 }}>
              Identifier
            </label>
            <input
              className="input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="email@domain.com"
              required
            />
          </div>

          <div style={{ marginBottom: 24 }}>
            <label className="meta-label" style={{ display: 'block', marginBottom: 6 }}>
              Access Key
            </label>
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="minimum 8 characters"
              required
              minLength={8}
            />
          </div>

          {error && (
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--color-node-claim)',
              marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          <button
            className="btn"
            type="submit"
            disabled={loading}
            style={{ width: '100%', padding: '10px', marginBottom: 16 }}
          >
            {loading ? 'PROCESSING...' : mode === 'login' ? 'AUTHENTICATE' : 'REGISTER'}
          </button>
        </form>

        <div style={{ textAlign: 'center' }}>
          <button
            onClick={() => { setMode(mode === 'login' ? 'register' : 'login'); setError(null) }}
            style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 11,
              color: 'var(--color-text-muted)',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              textDecoration: 'underline',
              textUnderlineOffset: 3,
            }}
          >
            {mode === 'login' ? 'REQUEST NEW ACCESS' : 'EXISTING ACCESS'}
          </button>
        </div>
      </div>
    </div>
  )
}
