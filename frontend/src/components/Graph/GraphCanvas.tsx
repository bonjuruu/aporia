import { useEffect, useId, useRef, useMemo } from 'react'
import * as d3 from 'd3'
import type { GraphData, GraphNode, GraphEdge, NodeType } from '../../types'
import { edgeEndpointId } from '../../types'

/** Apply path dim opacity, or restore full opacity if no path is active. */
function applyPathOrFullOpacity(
  svg: d3.Selection<SVGSVGElement, unknown, null, undefined>,
  pNodeIds: Set<string> | null,
  pEdgeIds: Set<string> | null,
) {
  if (pNodeIds) {
    svg.selectAll<SVGGElement, GraphNode>('g.node')
      .style('opacity', d => pNodeIds.has(d.id) ? 1 : 0.12)
    svg.selectAll<SVGLineElement, GraphEdge>('line')
      .style('opacity', e => pEdgeIds?.has(e.id) ? 0.8 : 0.03)
    // Show edge labels along the path
    svg.selectAll<SVGTextElement, GraphEdge>('text.edge-label')
      .attr('opacity', e => pEdgeIds?.has(e.id) ? 0.7 : 0)
  } else {
    svg.selectAll('g.node').style('opacity', 1)
    svg.selectAll('line').style('opacity', 1)
    svg.selectAll('text.edge-label').attr('opacity', 0)
  }
}

const NODE_COLOR_VARS: Record<string, string> = {
  THINKER: '--color-node-thinker',
  CONCEPT: '--color-node-concept',
  CLAIM:   '--color-node-claim',
  TEXT:    '--color-node-text',
}

function getNodeColors(): Record<string, string> {
  const style = getComputedStyle(document.documentElement)
  return Object.fromEntries(
    Object.entries(NODE_COLOR_VARS).map(([type, varName]) => [type, style.getPropertyValue(varName).trim() || '#888'])
  )
}

/** Pre-compute a bidirectional adjacency map: nodeId → Set of neighbor nodeIds. */
function buildAdjacencyMap(edges: GraphEdge[]): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>()
  for (const edge of edges) {
    const sourceId = edgeEndpointId(edge.source)
    const targetId = edgeEndpointId(edge.target)
    if (!map.has(sourceId)) map.set(sourceId, new Set())
    if (!map.has(targetId)) map.set(targetId, new Set())
    map.get(sourceId)!.add(targetId)
    map.get(targetId)!.add(sourceId)
  }
  return map
}

interface Props {
  data: GraphData
  selectedId: string | null
  onNodeClick: (node: GraphNode) => void
  filterTypes?: Set<NodeType>
  filterYear?: number | null
  onContextMenu?: (e: React.MouseEvent) => void
  progressMap?: Map<string, number>
  pathNodeIds?: Set<string> | null
  pathEdgeIds?: Set<string> | null
}

export function GraphCanvas({ data, selectedId, onNodeClick, filterTypes, filterYear, onContextMenu, progressMap, pathNodeIds, pathEdgeIds }: Props) {
  const reactId = useId()
  const arrowId = `arrow-${reactId.replace(/:/g, '')}`
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null)
  const colorsRef = useRef<Record<string, string>>({})
  const onNodeClickRef = useRef(onNodeClick)
  onNodeClickRef.current = onNodeClick
  const filteredDataRef = useRef<GraphData>({ nodes: [], edges: [] })
  const adjacencyRef = useRef<Map<string, Set<string>>>(new Map())
  const progressMapRef = useRef<Map<string, number>>(new Map())
  progressMapRef.current = progressMap ?? new Map()
  const pathNodeIdsRef = useRef<Set<string> | null>(null)
  pathNodeIdsRef.current = pathNodeIds ?? null
  const pathEdgeIdsRef = useRef<Set<string> | null>(null)
  pathEdgeIdsRef.current = pathEdgeIds ?? null
  const isMobileRef = useRef(false)

  const filteredData = useMemo<GraphData>(() => {
    const nodes = data.nodes
      .filter(n => !filterTypes || filterTypes.has(n.type))
      .filter(n => filterYear == null || n.year == null || n.year <= filterYear)
      .map(n => ({ ...n }))
    const nodeIds = new Set(nodes.map(n => n.id))
    // Clone edges and reset source/target to string IDs so forceLink
    // resolves them to the new node objects (not stale references)
    const edges = data.edges
      .filter(e => nodeIds.has(edgeEndpointId(e.source)) && nodeIds.has(edgeEndpointId(e.target)))
      .map(e => ({ ...e, source: edgeEndpointId(e.source), target: edgeEndpointId(e.target) }))
    return { nodes, edges }
  }, [data, filterTypes, filterYear])
  filteredDataRef.current = filteredData

  const adjacencyMap = useMemo(() => buildAdjacencyMap(filteredData.edges), [filteredData])
  adjacencyRef.current = adjacencyMap

  // Initialize simulation once on mount
  useEffect(() => {
    const svg = d3.select(svgRef.current!)
    const { width, height } = svgRef.current!.getBoundingClientRect()

    svg.selectAll('*').remove()

    // Arrow marker
    svg.append('defs').append('marker')
      .attr('id', arrowId)
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 18)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', 'rgba(200,180,160,0.4)')

    svg.append('g').attr('class', 'edges-layer')
    svg.append('g').attr('class', 'edge-labels-layer')
    svg.append('g').attr('class', 'nodes-layer')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        svg.select('.edges-layer').attr('transform', event.transform)
        svg.select('.edge-labels-layer').attr('transform', event.transform)
        svg.select('.nodes-layer').attr('transform', event.transform)
      })
    svg.call(zoom)

    colorsRef.current = getNodeColors()

    const isMobile = width < 768
    isMobileRef.current = isMobile
    // On mobile, account for top bar (~120px) and bottom toolbar (~60px)
    const topInset = isMobile ? 130 : 0
    // Bottom: toolbar(60) + stats(20) + FAB(50) + slider(50) — reserve for worst case
    const bottomInset = isMobile ? 170 : 0
    const pad = 30 // padding from edges for labels
    const visibleCenterY = topInset + (height - topInset - bottomInset) / 2
    simulationRef.current = d3.forceSimulation<GraphNode>()
      .force('link', d3.forceLink<GraphNode, GraphEdge>().id(d => d.id).distance(isMobile ? 80 : 120))
      .force('charge', d3.forceManyBody().strength(isMobile ? -200 : -400))
      .force('center', d3.forceCenter(width / 2, visibleCenterY))
      .force('collision', d3.forceCollide(isMobile ? 16 : 20))
    // On mobile, clamp nodes inside the visible area so nothing gets clipped
    if (isMobile) {
      const xMin = pad, xMax = width - pad
      const yMin = topInset + pad, yMax = height - bottomInset - pad
      simulationRef.current.force('bounds', () => {
        for (const n of simulationRef.current!.nodes() as GraphNode[]) {
          if (n.x != null) n.x = Math.max(xMin, Math.min(xMax, n.x))
          if (n.y != null) n.y = Math.max(yMin, Math.min(yMax, n.y))
        }
      })
    }

    return () => {
      simulationRef.current?.stop()
      svg.on('.zoom', null)
    }
  }, [arrowId])

  // Resize handling
  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl) return
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      const sim = simulationRef.current
      if (sim) {
        const mobile = width < 768
        isMobileRef.current = mobile
        const topOff = mobile ? 130 : 0
        const bottomOff = mobile ? 170 : 0
        const p = 30
        const centerY = topOff + (height - topOff - bottomOff) / 2
        sim.force('center', d3.forceCenter(width / 2, centerY))
        if (mobile) {
          const xMin = p, xMax = width - p
          const yMin = topOff + p, yMax = height - bottomOff - p
          sim.force('bounds', () => {
            for (const n of sim.nodes() as GraphNode[]) {
              if (n.x != null) n.x = Math.max(xMin, Math.min(xMax, n.x))
              if (n.y != null) n.y = Math.max(yMin, Math.min(yMax, n.y))
            }
          })
        } else {
          sim.force('bounds', null)
        }
        sim.alpha(0.1).restart()
      }
    })
    observer.observe(svgEl)
    return () => observer.disconnect()
  }, [])

  // Track previous node/edge ID sets to detect real data changes vs. reference-only changes
  const prevNodeIdsRef = useRef<Set<string>>(new Set())
  const prevEdgeIdsRef = useRef<Set<string>>(new Set())

  // Update simulation when data or filters change
  useEffect(() => {
    const svg = d3.select(svgRef.current!)
    const sim = simulationRef.current
    if (!sim) return

    const colors = colorsRef.current

    // Preserve positions from previous simulation nodes onto new cloned objects
    const prevPositions = new Map<string, { x: number; y: number; vx: number; vy: number }>()
    for (const node of sim.nodes() as GraphNode[]) {
      if (node.x != null && node.y != null) {
        prevPositions.set(node.id, { x: node.x, y: node.y, vx: node.vx ?? 0, vy: node.vy ?? 0 })
      }
    }

    // Build a quick lookup of neighbors for positioning new nodes
    const neighborIndex = new Map<string, string[]>()
    for (const edge of filteredData.edges) {
      const s = edgeEndpointId(edge.source)
      const t = edgeEndpointId(edge.target)
      if (!neighborIndex.has(s)) neighborIndex.set(s, [])
      if (!neighborIndex.has(t)) neighborIndex.set(t, [])
      neighborIndex.get(s)!.push(t)
      neighborIndex.get(t)!.push(s)
    }

    // Compute mean position of existing nodes as fallback for isolated new nodes
    let meanX = 0, meanY = 0, meanCount = 0
    for (const [, pos] of prevPositions) {
      meanX += pos.x; meanY += pos.y; meanCount++
    }
    if (meanCount > 0) { meanX /= meanCount; meanY /= meanCount }

    for (const node of filteredData.nodes) {
      const prev = prevPositions.get(node.id)
      if (prev) {
        node.x = prev.x
        node.y = prev.y
        node.vx = prev.vx
        node.vy = prev.vy
      } else {
        // New node: seed position near its neighbors so it doesn't fly in from center
        const neighbors = neighborIndex.get(node.id) ?? []
        let sumX = 0, sumY = 0, count = 0
        for (const nId of neighbors) {
          const nPos = prevPositions.get(nId)
          if (nPos) { sumX += nPos.x; sumY += nPos.y; count++ }
        }
        if (count > 0) {
          node.x = sumX / count + (Math.random() - 0.5) * 30
          node.y = sumY / count + (Math.random() - 0.5) * 30
        } else if (meanCount > 0) {
          // No neighbors (isolated node): place near the cluster center
          node.x = meanX + (Math.random() - 0.5) * 60
          node.y = meanY + (Math.random() - 0.5) * 60
        }
      }
    }

    // Detect whether the actual set of nodes/edges changed (not just object references)
    const currNodeIds = new Set(filteredData.nodes.map(n => n.id))
    const currEdgeIds = new Set(filteredData.edges.map(e => e.id))
    let nodeSetChanged = currNodeIds.size !== prevNodeIdsRef.current.size
    if (!nodeSetChanged) {
      for (const id of currNodeIds) { if (!prevNodeIdsRef.current.has(id)) { nodeSetChanged = true; break } }
    }
    let edgeSetChanged = currEdgeIds.size !== prevEdgeIdsRef.current.size
    if (!edgeSetChanged) {
      for (const id of currEdgeIds) { if (!prevEdgeIdsRef.current.has(id)) { edgeSetChanged = true; break } }
    }
    const dataSetChanged = nodeSetChanged || edgeSetChanged
    prevNodeIdsRef.current = currNodeIds
    prevEdgeIdsRef.current = currEdgeIds

    // Reset opacity — restore path dim if active, otherwise full opacity
    applyPathOrFullOpacity(svg, pathNodeIdsRef.current, pathEdgeIdsRef.current)

    // Edges — enter/update/exit
    const edgeSelection = svg.select('.edges-layer')
      .selectAll<SVGLineElement, GraphEdge>('line')
      .data(filteredData.edges, (d: GraphEdge) => d.id)

    edgeSelection.exit().remove()

    const edgesEnter = edgeSelection.enter().append('line')
      .attr('stroke', 'rgba(200,180,160,0.15)')
      .attr('stroke-width', 0.5)
      .attr('marker-end', `url(#${arrowId})`)

    edgesEnter.append('title').text(d => d.type)

    const edges = edgesEnter.merge(edgeSelection)

    // Edge labels — enter/update/exit (hidden by default, shown on node hover)
    const edgeLabelSelection = svg.select('.edge-labels-layer')
      .selectAll<SVGTextElement, GraphEdge>('text.edge-label')
      .data(filteredData.edges, (d: GraphEdge) => d.id)

    edgeLabelSelection.exit().remove()

    const edgeLabelsEnter = edgeLabelSelection.enter().append('text')
      .attr('class', 'edge-label')
      .attr('text-anchor', 'middle')
      .attr('font-family', "'JetBrains Mono', monospace")
      .attr('font-size', '9px')
      .attr('letter-spacing', '0.08em')
      .attr('fill', 'var(--color-text-muted)')
      .attr('pointer-events', 'none')
      .attr('opacity', 0)
      .text(d => d.type.replace(/_/g, ' '))

    const edgeLabels = edgeLabelsEnter.merge(edgeLabelSelection)

    // Nodes — enter/update/exit
    const nodeSelection = svg.select('.nodes-layer')
      .selectAll<SVGGElement, GraphNode>('g.node')
      .data(filteredData.nodes, (d: GraphNode) => d.id)

    nodeSelection.exit().remove()

    const nodesEnter = nodeSelection.enter().append('g')
      .attr('class', 'node')
      .attr('tabindex', '0')
      .attr('role', 'button')
      .attr('aria-label', (d: GraphNode) => `${d.type} — ${d.label}`)
      .style('cursor', 'pointer')

    // Invisible hit-area circle for better touch targets on mobile
    if (isMobileRef.current) {
      nodesEnter.append('circle')
        .attr('class', 'hit-area')
        .attr('r', 22)
        .attr('fill', 'transparent')
        .attr('stroke', 'none')
    }

    // Sync hit-area circles on existing nodes when viewport crosses the mobile breakpoint
    const allNodes = nodesEnter.merge(nodeSelection)
    if (isMobileRef.current) {
      allNodes.each(function () {
        const g = d3.select(this)
        if (g.select('circle.hit-area').empty()) {
          g.insert('circle', ':first-child')
            .attr('class', 'hit-area')
            .attr('r', 22)
            .attr('fill', 'transparent')
            .attr('stroke', 'none')
        }
      })
    } else {
      allNodes.selectAll('circle.hit-area').remove()
    }

    // Update aria-label on all nodes (handles label changes after edit)
    allNodes.attr('aria-label', (d: GraphNode) => `${d.type} — ${d.label}`)

    // Draw shape per node type (only for new nodes)
    nodesEnter.each(function(d) {
      const g = d3.select(this)
      const color = colors[d.type] ?? '#888'

      switch (d.type) {
        case 'THINKER':
          g.append('circle').attr('r', 8)
            .attr('fill', color).attr('fill-opacity', 0.15)
            .attr('stroke', color).attr('stroke-width', 0.5)
          break
        case 'CONCEPT':
          g.append('polygon').attr('points', '0,-10 9,5 -9,5')
            .attr('fill', color).attr('fill-opacity', 0.15)
            .attr('stroke', color).attr('stroke-width', 0.5)
          break
        case 'CLAIM':
          g.append('rect').attr('x', -9).attr('y', -6).attr('width', 18).attr('height', 12)
            .attr('fill', color).attr('fill-opacity', 0.15)
            .attr('stroke', color).attr('stroke-width', 0.5)
          break
        case 'TEXT':
          g.append('polygon').attr('points', '0,-10 10,0 0,10 -10,0')
            .attr('fill', color).attr('fill-opacity', 0.15)
            .attr('stroke', color).attr('stroke-width', 0.5)
          break
      }

      // Truncate long labels — shorter on mobile
      const mobile = isMobileViewport
      const maxLen = mobile ? 18 : 28
      const truncated = d.label.length > maxLen
        ? d.label.slice(0, maxLen - 1).trimEnd() + '…'
        : d.label
      const fontSize = mobile ? '10px' : '11px'

      g.append('text')
        .attr('y', 22)
        .attr('text-anchor', 'middle')
        .attr('font-family', "'EB Garamond', Georgia, serif")
        .attr('font-size', fontSize)
        .attr('font-weight', '400')
        .attr('fill', color)
        .attr('fill-opacity', 0.75)
        .attr('pointer-events', 'none')
        .text(truncated)
    })

    // Bind drag + click + hover only on newly entered nodes.
    // Handlers use refs so they always access current data without re-binding.
    nodesEnter.call(
      d3.drag<SVGGElement, GraphNode>()
        .on('start', (event, d) => {
          if (!event.active) sim.alphaTarget(0.3).restart()
          d.fx = d.x; d.fy = d.y
        })
        .on('drag', (event, d) => {
          d.fx = event.x; d.fy = event.y
        })
        .on('end', (event, d) => {
          if (!event.active) sim.alphaTarget(0)
          d.fx = null; d.fy = null
        })
    )
    .on('click', (_, d) => onNodeClickRef.current(d))
    .on('keydown', (event: KeyboardEvent, d) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault()
        onNodeClickRef.current(d)
      }
    })
    .on('mouseover', (_, d) => {
      // Skip neighbor dimming when a path is active — path dim takes priority
      if (pathNodeIdsRef.current) return
      const neighborIds = adjacencyRef.current.get(d.id) ?? new Set<string>()
      svg.selectAll<SVGGElement, GraphNode>('g.node')
        .style('opacity', n => n.id === d.id || neighborIds.has(n.id) ? 1 : 0.15)
      svg.selectAll<SVGLineElement, GraphEdge>('line')
        .style('opacity', e =>
          (e.source as GraphNode).id === d.id || (e.target as GraphNode).id === d.id ? 0.8 : 0.05
        )
      // Show edge labels for connected edges
      svg.selectAll<SVGTextElement, GraphEdge>('text.edge-label')
        .attr('opacity', e =>
          (e.source as GraphNode).id === d.id || (e.target as GraphNode).id === d.id ? 0.7 : 0
        )
    })
    .on('mouseout', () => {
      // When path is active, restore path dim instead of full opacity
      applyPathOrFullOpacity(svg, pathNodeIdsRef.current, pathEdgeIdsRef.current)
      // Restore edge labels: show path edge labels if path active, hide all otherwise
      const pathEdges = pathEdgeIdsRef.current
      if (pathEdges && pathEdges.size > 0) {
        svg.selectAll<SVGTextElement, GraphEdge>('text.edge-label')
          .attr('opacity', e => pathEdges.has(e.id) ? 0.7 : 0)
      } else {
        svg.selectAll('text.edge-label').attr('opacity', 0)
      }
    })

    const nodes = allNodes

    // Update simulation
    sim.nodes(filteredData.nodes)
    ;(sim.force('link') as d3.ForceLink<GraphNode, GraphEdge>).links(filteredData.edges)

    sim.on('tick', null)
    sim.on('tick', () => {
      edges
        .attr('x1', d => (d.source as GraphNode).x ?? 0)
        .attr('y1', d => (d.source as GraphNode).y ?? 0)
        .attr('x2', d => (d.target as GraphNode).x ?? 0)
        .attr('y2', d => (d.target as GraphNode).y ?? 0)

      // Position edge labels at midpoint, offset slightly above the line
      edgeLabels
        .attr('x', d => (((d.source as GraphNode).x ?? 0) + ((d.target as GraphNode).x ?? 0)) / 2)
        .attr('y', d => (((d.source as GraphNode).y ?? 0) + ((d.target as GraphNode).y ?? 0)) / 2 - 4)

      nodes.attr('transform', (d: GraphNode) => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    // Only reheat simulation when nodes/edges actually changed;
    // year ticks that don't add/remove nodes skip the reheat to prevent jitter
    if (dataSetChanged) {
      // Higher alpha for new node additions so they settle visibly
      sim.alpha(nodeSetChanged ? 0.15 : 0.05).restart()
    }

  }, [filteredData, arrowId])

  // Update selected ring without reheating simulation
  useEffect(() => {
    const svg = d3.select(svgRef.current!)
    const colors = colorsRef.current
    svg.select('.nodes-layer')
      .selectAll<SVGGElement, GraphNode>('g.node')
      .select('circle:not(.hit-area):not(.progress-ring), polygon, rect')
      .attr('stroke-width', (d: GraphNode) => d.id === selectedId ? 1.5 : 0.5)
      .attr('stroke', (d: GraphNode) => d.id === selectedId ? '#e8e0d0' : (colors[d.type] ?? '#888'))
  }, [selectedId])

  // Update progress rings on TEXT nodes without reheating simulation
  useEffect(() => {
    const svg = d3.select(svgRef.current!)
    const pMap = progressMapRef.current

    svg.select('.nodes-layer')
      .selectAll<SVGGElement, GraphNode>('g.node')
      .each(function(d) {
        const g = d3.select(this)

        if (d.type !== 'TEXT') return
        g.selectAll('.progress-ring').remove()

        const pct = pMap.get(d.id)
        if (!pct || pct <= 0) return

        const arcPath = d3.arc()({
          innerRadius: 12,
          outerRadius: 15,
          startAngle: 0,
          endAngle: pct * 2 * Math.PI,
        } as d3.DefaultArcObject)

        g.append('path')
          .attr('class', 'progress-ring')
          .attr('d', arcPath)
          .attr('fill', '#c4973a')
          .attr('opacity', 0.7)
      })
  }, [progressMap])

  // Dim non-path nodes/edges when a path is active (no simulation reheat)
  useEffect(() => {
    const svg = d3.select(svgRef.current!)
    applyPathOrFullOpacity(svg, pathNodeIdsRef.current, pathEdgeIdsRef.current)
  }, [pathNodeIds, pathEdgeIds])

  return (
    <>
      <svg
        ref={svgRef}
        role="img"
        aria-label="Philosophy graph visualization"
        style={{ width: '100%', height: '100%', background: 'var(--color-bg-primary)' }}
        onContextMenu={onContextMenu}
      />
      {/* Screen-reader accessible node list — hidden visually */}
      <ul className="sr-only" role="list" aria-label="Graph nodes">
        {filteredData.nodes.map(node => (
          <li key={node.id}>
            <button onClick={() => onNodeClickRef.current(node)}>
              {node.type}: {node.label}{node.year != null ? ` (${node.year})` : ''}
            </button>
          </li>
        ))}
      </ul>
    </>
  )
}
