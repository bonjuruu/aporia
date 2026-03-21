import { useEffect, useRef, useMemo } from 'react'
import * as d3 from 'd3'
import type { GraphData, GraphNode, GraphEdge } from '../../types'

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

function getNeighborIds(nodeId: string, edges: GraphEdge[]): Set<string> {
  const neighbors = new Set<string>()
  for (const edge of edges) {
    const sourceId = typeof edge.source === 'string' ? edge.source : edge.source.id
    const targetId = typeof edge.target === 'string' ? edge.target : edge.target.id
    if (sourceId === nodeId) neighbors.add(targetId)
    if (targetId === nodeId) neighbors.add(sourceId)
  }
  return neighbors
}

function edgeNodeId(node: string | GraphNode): string {
  return typeof node === 'string' ? node : node.id
}

interface Props {
  data: GraphData
  selectedId: string | null
  onNodeClick: (node: GraphNode) => void
  filterTypes?: Set<string>
  onContextMenu?: (e: React.MouseEvent) => void
}

export function GraphCanvas({ data, selectedId, onNodeClick, filterTypes, onContextMenu }: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const simulationRef = useRef<d3.Simulation<GraphNode, GraphEdge> | null>(null)
  const colorsRef = useRef<Record<string, string>>({})
  const onNodeClickRef = useRef(onNodeClick)
  onNodeClickRef.current = onNodeClick

  const filteredData = useMemo<GraphData>(() => {
    const nodes = filterTypes && filterTypes.size > 0
      ? data.nodes.filter(n => filterTypes.has(n.type)).map(n => ({ ...n }))
      : data.nodes.map(n => ({ ...n }))
    const nodeIds = new Set(nodes.map(n => n.id))
    // Clone edges and reset source/target to string IDs so forceLink
    // resolves them to the new node objects (not stale references)
    const edges = data.edges
      .filter(e => nodeIds.has(edgeNodeId(e.source)) && nodeIds.has(edgeNodeId(e.target)))
      .map(e => ({ ...e, source: edgeNodeId(e.source), target: edgeNodeId(e.target) }))
    return { nodes, edges }
  }, [data, filterTypes])

  // Initialize simulation once on mount
  useEffect(() => {
    const svg = d3.select(svgRef.current!)
    const { width, height } = svgRef.current!.getBoundingClientRect()

    svg.selectAll('*').remove()

    // Arrow marker
    svg.append('defs').append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 -4 8 8')
      .attr('refX', 18)
      .attr('markerWidth', 6)
      .attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-4L8,0L0,4')
      .attr('fill', 'rgba(200,180,160,0.4)')

    svg.append('g').attr('class', 'edges-layer')
    svg.append('g').attr('class', 'nodes-layer')

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        svg.select('.edges-layer').attr('transform', event.transform)
        svg.select('.nodes-layer').attr('transform', event.transform)
      })
    svg.call(zoom)

    colorsRef.current = getNodeColors()

    simulationRef.current = d3.forceSimulation<GraphNode>()
      .force('link', d3.forceLink<GraphNode, GraphEdge>().id(d => d.id).distance(120))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(20))

    return () => { simulationRef.current?.stop() }
  }, [])

  // Resize handling
  useEffect(() => {
    const svgEl = svgRef.current
    if (!svgEl) return
    const observer = new ResizeObserver(entries => {
      const { width, height } = entries[0].contentRect
      const sim = simulationRef.current
      if (sim) {
        sim.force('center', d3.forceCenter(width / 2, height / 2))
        sim.alpha(0.1).restart()
      }
    })
    observer.observe(svgEl)
    return () => observer.disconnect()
  }, [])

  // Update simulation when data or filters change
  useEffect(() => {
    const svg = d3.select(svgRef.current!)
    const sim = simulationRef.current
    if (!sim) return

    const colors = colorsRef.current

    // Reset hover opacity in case a hovered node was removed by a filter change
    svg.selectAll('g.node').style('opacity', 1)
    svg.selectAll('line').style('opacity', 1)

    // Edges — enter/update/exit
    const edgeSelection = svg.select('.edges-layer')
      .selectAll<SVGLineElement, GraphEdge>('line')
      .data(filteredData.edges, (d: GraphEdge) => d.id)

    edgeSelection.exit().remove()

    const edgesEnter = edgeSelection.enter().append('line')
      .attr('stroke', 'rgba(200,180,160,0.15)')
      .attr('stroke-width', 0.5)
      .attr('marker-end', 'url(#arrow)')

    edgesEnter.append('title').text(d => d.type)

    const edges = edgesEnter.merge(edgeSelection)

    // Nodes — enter/update/exit
    const nodeSelection = svg.select('.nodes-layer')
      .selectAll<SVGGElement, GraphNode>('g.node')
      .data(filteredData.nodes, (d: GraphNode) => d.id)

    nodeSelection.exit().remove()

    const nodesEnter = nodeSelection.enter().append('g')
      .attr('class', 'node')
      .style('cursor', 'pointer')

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

      g.append('text')
        .attr('y', 18)
        .attr('text-anchor', 'middle')
        .attr('font-family', "'JetBrains Mono', monospace")
        .attr('font-size', '10px')
        .attr('fill', '#a09880')
        .attr('pointer-events', 'none')
        .text(d.label)
    })

    const nodes = nodesEnter.merge(nodeSelection)

    // Drag + click + hover on ALL nodes (merged selection, not just enter)
    nodes.call(
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
    .on('mouseover', (_, d) => {
      const neighborIds = getNeighborIds(d.id, filteredData.edges)
      svg.selectAll<SVGGElement, GraphNode>('g.node')
        .style('opacity', n => n.id === d.id || neighborIds.has(n.id) ? 1 : 0.15)
      svg.selectAll<SVGLineElement, GraphEdge>('line')
        .style('opacity', e =>
          (e.source as GraphNode).id === d.id || (e.target as GraphNode).id === d.id ? 0.8 : 0.05
        )
    })
    .on('mouseout', () => {
      svg.selectAll('g.node').style('opacity', 1)
      svg.selectAll('line').style('opacity', 1)
    })

    // Update simulation
    sim.nodes(filteredData.nodes)
    ;(sim.force('link') as d3.ForceLink<GraphNode, GraphEdge>).links(filteredData.edges)

    sim.on('tick', () => {
      edges
        .attr('x1', d => (d.source as GraphNode).x ?? 0)
        .attr('y1', d => (d.source as GraphNode).y ?? 0)
        .attr('x2', d => (d.target as GraphNode).x ?? 0)
        .attr('y2', d => (d.target as GraphNode).y ?? 0)

      nodes.attr('transform', (d: GraphNode) => `translate(${d.x ?? 0},${d.y ?? 0})`)
    })

    sim.alpha(0.3).restart()
  }, [filteredData])

  // Update selected ring without reheating simulation
  useEffect(() => {
    const svg = d3.select(svgRef.current!)
    const colors = colorsRef.current
    svg.select('.nodes-layer')
      .selectAll<SVGGElement, GraphNode>('g.node')
      .select('circle, polygon, rect')
      .attr('stroke-width', (d: GraphNode) => d.id === selectedId ? 1.5 : 0.5)
      .attr('stroke', (d: GraphNode) => d.id === selectedId ? '#e8e0d0' : (colors[d.type] ?? '#888'))
  }, [selectedId])

  return (
    <svg
      ref={svgRef}
      style={{ width: '100%', height: '100%', background: 'var(--color-bg-primary)' }}
      onContextMenu={onContextMenu}
    />
  )
}
