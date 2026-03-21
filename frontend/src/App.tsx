import { useState, useCallback } from 'react'
import { Routes, Route, useNavigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import { useGraph } from './hooks/useGraph'
import { GraphCanvas } from './components/Graph/GraphCanvas'
import { DetailPanel } from './components/Panel/DetailPanel'
import { FilterBar } from './components/Controls/FilterBar'
import { SearchBar } from './components/Controls/SearchBar'
import { ContextMenu } from './components/Controls/ContextMenu'
import { AddNodeModal } from './components/Curation/AddNodeModal'
import { AddEdgeModal } from './components/Curation/AddEdgeModal'
import { ReadingView } from './components/ReadingMode/ReadingView'
import { AuthPage } from './components/Auth/AuthPage'
import type { GraphNode, NodeType } from './types'

const ALL_TYPES = new Set(['THINKER', 'CONCEPT', 'CLAIM', 'TEXT'])

function GraphView({ onLogout }: { onLogout: () => void }) {
  const navigate = useNavigate()
  const { data, loading, error, addNode, addEdge, refetchGraph } = useGraph()
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [activeTypes, setActiveTypes] = useState<Set<string>>(new Set(ALL_TYPES))
  const [addNodeOpen, setAddNodeOpen] = useState(false)
  const [addNodeType, setAddNodeType] = useState<NodeType | null>(null)
  const [addEdgeOpen, setAddEdgeOpen] = useState(false)
  const [edgeSourceNode, setEdgeSourceNode] = useState<{ id: string; label: string; type: string } | null>(null)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null)

  const handleNodeClick = useCallback((node: GraphNode) => {
    setSelectedId(node.id)
  }, [])

  const handleNodeClickById = useCallback((nodeId: string) => {
    setSelectedId(nodeId)
  }, [])

  const handleClosePanel = useCallback(() => setSelectedId(null), [])
  const handleOpenAddNode = useCallback(() => { setAddNodeType(null); setAddNodeOpen(true) }, [])
  const handleCloseAddNode = useCallback(() => { setAddNodeOpen(false); setAddNodeType(null) }, [])
  const handleCloseAddEdge = useCallback(() => { setAddEdgeOpen(false); setEdgeSourceNode(null) }, [])

  const handleAddEdge = useCallback((sourceNode: { id: string; label: string; type: string }) => {
    setEdgeSourceNode(sourceNode)
    setAddEdgeOpen(true)
  }, [])

  const handleReadText = useCallback((textId: string) => {
    navigate(`/reading/${textId}`)
  }, [navigate])

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY })
  }, [])

  const handleContextMenuSelect = useCallback((type: NodeType) => {
    setContextMenu(null)
    setAddNodeType(type)
    setAddNodeOpen(true)
  }, [])

  const handleCloseContextMenu = useCallback(() => setContextMenu(null), [])

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
        onContextMenu={handleContextMenu}
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
        onReadText={handleReadText}
        escapeDisabled={addNodeOpen || addEdgeOpen}
      />

      {/* Floating add button */}
      <button className="fab" onClick={handleOpenAddNode} aria-label="Add node">+</button>

      {/* Context menu */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onSelect={handleContextMenuSelect}
          onClose={handleCloseContextMenu}
        />
      )}

      {/* Modals */}
      <AddNodeModal
        open={addNodeOpen}
        onClose={handleCloseAddNode}
        onNodeCreated={addNode}
        initialType={addNodeType}
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

  return (
    <Routes>
      <Route path="/" element={<GraphView onLogout={logout} />} />
      <Route path="/reading/:id" element={<ReadingView onLogout={logout} />} />
    </Routes>
  )
}
