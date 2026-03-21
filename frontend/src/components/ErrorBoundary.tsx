import { Component } from 'react'
import type { ErrorInfo, ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error:', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="centered-screen" style={{ textAlign: 'center' }}>
          <div className="meta-label" style={{ marginBottom: 12, color: 'var(--color-node-claim)' }}>
            FATAL ERROR
          </div>
          <div className="content-text" style={{ marginBottom: 20, maxWidth: 480 }}>
            {this.state.error.message}
          </div>
          <button
            className="btn"
            onClick={() => { this.setState({ error: null }); window.location.assign('/') }}
          >
            RELOAD
          </button>
        </div>
      )
    }
    return this.props.children
  }
}
