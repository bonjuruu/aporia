import { useState, useCallback } from 'react'
import { useAuth } from './hooks/useAuth'
import { useGraph } from './hooks/useGraph'
import { GraphCanvas } from './components/Graph/GraphCanvas'
import { DetailPanel } from './components/Panel/DetailPanel'
import { FilterBar } from './components/Controls/FilterBar'
import { SearchBar } from './components/Controls/SearchBar'
import { AuthPage } from './components/Auth/AuthPage'
import type { GraphNode } from './types'

const ALL_TYPES = new Set(['THINKER', 'CONCEPT', 'CLAIM', 'TEXT'])

function GraphView({ onLogout }: { onLogout: () => void }) {
  const { data, loading, error } = useGraph()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(ALL_TYPES))

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedId(node.id)
  }, [])

  const handleNodeClickById = useCallback((nodeId: string) => {
    setSelectedId(nodeId)
  }, [])

  const handleToggleType = useCallback((type: string) => {
    setActiveTypes(prev => {
      const next = new Set(prev)
      if (next.has(type)) {
        next.delete(type)
      } else {
        next.add(type)
      }
      return next
    })
  }, [])

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--color-text-muted)',
      }}>
        LOADING GRAPH...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--color-node-claim)',
      }}>
        ERROR: {error}
      </div>
    )
  }

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', overflow: 'hidden' }}>
      {/* Top bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '12px 16px',
        background: 'linear-gradient(to bottom, var(--color-bg-primary), transparent)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <h1 style={{
            fontFamily: 'var(--font-serif)',
            fontSize: 18,
            fontWeight: 400,
            color: 'var(--color-text-primary)',
            letterSpacing: '0.05em',
          }}>
            Aporia
          </h1>
          <FilterBar activeTypes={activeTypes} onToggle={handleToggleType} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <SearchBar onSelect={handleNodeClickById} />
          <button className="btn" onClick={onLogout} style={{ fontSize: 10, padding: '4px 10px' }}>
            LOGOUT
          </button>
        </div>
      </div>

      {/* Graph */}
      <GraphCanvas
        data={data}
        selectedId={selectedId}
        onNodeClick={handleNodeClick}
        filterTypes={activeTypes.size === ALL_TYPES.size ? undefined : activeTypes}
      />

      {/* Detail panel */}
      <DetailPanel
        nodeId={selectedId}
        onClose={() => setSelectedId(null)}
        onNodeClick={handleNodeClickById}
      />

      {/* Bottom stats */}
      <div style={{
        position: 'absolute',
        bottom: 12,
        left: 16,
        fontFamily: 'var(--font-mono)',
        fontSize: 10,
        color: 'var(--color-text-muted)',
        display: 'flex',
        gap: 16,
      }}>
        <span>{data.nodes.length} nodes</span>
        <span>{data.edges.length} edges</span>
      </div>
    </div>
  )
}

export default function App() {
  const { user, loading, login, register, logout } = useAuth()

  if (loading) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: '100vh',
        fontFamily: 'var(--font-mono)',
        fontSize: 12,
        color: 'var(--color-text-muted)',
      }}>
        INITIALIZING...
      </div>
    )
  }

  if (!user) {
    return <AuthPage onLogin={login} onRegister={register} />
  }

  return <GraphView onLogout={logout} />
}
