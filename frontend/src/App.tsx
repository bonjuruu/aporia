import { useState, useCallback } from 'react'
import { useAuth } from './hooks/useAuth'
import { useGraph } from './hooks/useGraph'
import { GraphCanvas } from './components/Graph/GraphCanvas'
import { DetailPanel } from './components/Panel/DetailPanel'
import { FilterBar } from './components/Controls/FilterBar'
import { SearchBar } from './components/Controls/SearchBar'
import { AddNodeModal } from './components/Curation/AddNodeModal'
import { AddEdgeModal } from './components/Curation/AddEdgeModal'
import { AuthPage } from './components/Auth/AuthPage'
import type { GraphNode } from './types'

const ALL_TYPES = new Set(['THINKER', 'CONCEPT', 'CLAIM', 'TEXT'])

function GraphView({ onLogout }: { onLogout: () => void }) {
  const { data, loading, error, addNode, addEdge, refetchGraph } = useGraph()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(ALL_TYPES))
  const [addNodeOpen, setAddNodeOpen] = useState(false)
  const [addEdgeOpen, setAddEdgeOpen] = useState(false)
  const [edgeSourceNode, setEdgeSourceNode] = useState<{ id: string; label: string; type: string } | null>(null)

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedId(node.id)
  }, [])

  const handleNodeClickById = useCallback((nodeId: string) => {
    setSelectedId(nodeId)
  }, [])

  const handleClosePanel = useCallback(() => setSelectedId(null), [])
  const handleOpenAddNode = useCallback(() => setAddNodeOpen(true), [])
  const handleCloseAddNode = useCallback(() => setAddNodeOpen(false), [])
  const handleCloseAddEdge = useCallback(() => { setAddEdgeOpen(false); setEdgeSourceNode(null) }, [])

  const handleAddEdge = useCallback((sourceNode: { id: string; label: string; type: string }) => {
    setEdgeSourceNode(sourceNode)
    setAddEdgeOpen(true)
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
      <div className="centered-screen" style={{ color: 'var(--color-text-muted)' }}>
        LOADING GRAPH...
      </div>
    )
  }

  if (error) {
    return (
      <div className="centered-screen" style={{ color: 'var(--color-node-claim)' }}>
        ERROR: {error}
      </div>
    )
  }

  return (
    <div className="graph-viewport">
      {/* Top bar */}
      <div className="top-bar">
        <div className="top-bar__group">
          <h1 className="app-title">Aporia</h1>
          <FilterBar activeTypes={activeTypes} onToggle={handleToggleType} />
        </div>
        <div className="top-bar__group top-bar__group--right">
          <SearchBar onSelect={handleNodeClickById} />
          <button className="btn btn--sm" onClick={onLogout}>
            LOGOUT
          </button>
        </div>
      </div>

      {/* Graph */}
      <GraphCanvas
        data={data}
        selectedId={selectedId}
        onNodeClick={handleNodeClick}
        // activeTypes is always a subset of ALL_TYPES, so size equality implies set equality
        filterTypes={activeTypes.size === ALL_TYPES.size ? undefined : activeTypes}
      />

      {/* Detail panel */}
      <DetailPanel
        nodeId={selectedId}
        onClose={handleClosePanel}
        onNodeClick={handleNodeClickById}
        onAddEdge={handleAddEdge}
        onNodeUpdated={refetchGraph}
        escapeDisabled={addNodeOpen || addEdgeOpen}
      />

      {/* Floating add button */}
      <button className="fab" onClick={handleOpenAddNode} aria-label="Add node">+</button>

      {/* Modals */}
      <AddNodeModal
        open={addNodeOpen}
        onClose={handleCloseAddNode}
        onNodeCreated={addNode}
      />
      <AddEdgeModal
        open={addEdgeOpen}
        onClose={handleCloseAddEdge}
        onEdgeCreated={addEdge}
        sourceNode={edgeSourceNode}
      />

      {/* Bottom stats */}
      <div className="stats-bar">
        <span>{data.nodes.length} nodes</span>
        <span>{data.edges.length} edges</span>
      </div>
    </div>
  )
}

export default function App() {
  const { user, loading, error: authError, login, register, logout, retry } = useAuth()

  if (loading) {
    return (
      <div className="centered-screen" style={{ color: 'var(--color-text-muted)' }}>
        INITIALIZING...
      </div>
    )
  }

  if (authError) {
    return (
      <div className="centered-screen centered-screen--column">
        <div className="auth-card__error">
          CONNECTION ERROR: {authError}
        </div>
        <button className="btn" onClick={retry} style={{ fontSize: 11 }}>
          RETRY
        </button>
      </div>
    )
  }

  if (!user) {
    return <AuthPage onLogin={login} onRegister={register} />
  }

  return <GraphView onLogout={logout} />
}
