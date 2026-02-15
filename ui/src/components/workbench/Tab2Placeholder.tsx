import { useEffect, useMemo, useRef, useState } from 'react'
import './Tab2TopologyEditor.css'

import type {
  TopologyGraphPayload,
  TopologySelectionState,
  TopologySpec,
  TopologySplitGroup,
  TopologyVisualEdge,
} from './types'

type Tab2TopologyEditorProps = {
  selection: TopologySelectionState
  onSelectionChange: (next: TopologySelectionState) => void
  onBackToWorkbench: () => void
}

const EMPTY_TOPOLOGY_SELECTION: TopologySelectionState = {
  specs: [{ topology_id: 'N', line_outages: [] }],
  seenTopologyIds: ['N'],
  unseenTopologyIds: [],
}

const TOPOLOGY_API_BASE_CANDIDATES = ['', 'http://localhost:8000', 'http://127.0.0.1:8000'] as const
const TOPOLOGY_LAYOUT_STORAGE_KEY = 'alloy.topology.case39.layout.v1'
const VIEWBOX_WIDTH = 920
const VIEWBOX_HEIGHT = 580

const nodeKindColor: Record<string, string> = {
  slack: '#ef4444',
  gen: '#3b82f6',
  load: '#10b981',
  bus: '#94a3b8',
}

/**
 * Tab2 visual topology editor.
 *
 * Provides graph-based N/N-1 selection, split grouping, backend validation,
 * and app-level persistence through callback props.
 */
export function Tab2Placeholder({
  selection,
  onSelectionChange,
  onBackToWorkbench,
}: Tab2TopologyEditorProps) {
  const [graph, setGraph] = useState<TopologyGraphPayload | null>(null)
  const [status, setStatus] = useState('Loading case39 graph...')
  const [graphLoadError, setGraphLoadError] = useState<string | null>(null)
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [graphZoom, setGraphZoom] = useState(1)
  const [graphOffset, setGraphOffset] = useState({ x: 0, y: 0 })
  const [isGraphPanning, setIsGraphPanning] = useState(false)
  const [draggingBusId, setDraggingBusId] = useState<number | null>(null)
  const [busPositions, setBusPositions] = useState<Record<number, { x: number; y: number }>>({})
  const [selectedLineIds, setSelectedLineIds] = useState<Set<number>>(new Set())
  const [splitGroupByTopologyId, setSplitGroupByTopologyId] = useState<Record<string, TopologySplitGroup>>({})
  const svgRef = useRef<SVGSVGElement | null>(null)
  const panState = useRef<{ pointerId: number | null; startClientX: number; startClientY: number; startOffsetX: number; startOffsetY: number }>({
    pointerId: null,
    startClientX: 0,
    startClientY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  })
  const nodeDragState = useRef<{ pointerId: number | null; busId: number | null; startWorldX: number; startWorldY: number; startBusX: number; startBusY: number }>({
    pointerId: null,
    busId: null,
    startWorldX: 0,
    startWorldY: 0,
    startBusX: 0,
    startBusY: 0,
  })

  const toViewboxPoint = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!svgRef.current) {
      return { x: 0, y: 0 }
    }
    const rect = svgRef.current.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      return { x: 0, y: 0 }
    }
    return {
      x: (event.clientX - rect.left) * (VIEWBOX_WIDTH / rect.width),
      y: (event.clientY - rect.top) * (VIEWBOX_HEIGHT / rect.height),
    }
  }

  const createDefaultLayout = (payload: TopologyGraphPayload) => {
    const layout: Record<number, { x: number; y: number }> = {}
    const centerX = 460
    const centerY = 290
    const radius = 210
    for (const [idx, bus] of payload.buses.entries()) {
      const angle = (idx / payload.buses.length) * Math.PI * 2 - Math.PI / 2
      layout[bus.bus_idx] = {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      }
    }
    return layout
  }

  useEffect(() => {
    let active = true

    const fetchJsonWithFallback = async <T,>(
      path: string,
      init?: RequestInit,
    ): Promise<{ data: T; baseUrl: string }> => {
      let lastError = 'unknown error'
      for (const baseUrl of TOPOLOGY_API_BASE_CANDIDATES) {
        const requestUrl = `${baseUrl}${path}`
        try {
          const response = await fetch(requestUrl, init)
          if (!response.ok) {
            lastError = `${requestUrl} -> HTTP ${response.status}`
            continue
          }
          const data = (await response.json()) as T
          return { data, baseUrl }
        } catch (error) {
          lastError = `${requestUrl} -> ${String(error)}`
        }
      }
      throw new Error(lastError)
    }

    const loadGraph = async () => {
      try {
        const result = await fetchJsonWithFallback<TopologyGraphPayload>('/api/topology/case39/graph')
        const payload = result.data
        if (!active) {
          return
        }
        setApiBaseUrl(result.baseUrl)
        setGraph(payload)
        const defaultLayout = createDefaultLayout(payload)
        let restoredLayout = defaultLayout
        try {
          const raw = window.localStorage.getItem(TOPOLOGY_LAYOUT_STORAGE_KEY)
          if (raw) {
            const parsed = JSON.parse(raw) as Record<string, { x: number; y: number }>
            const merged: Record<number, { x: number; y: number }> = { ...defaultLayout }
            for (const [key, point] of Object.entries(parsed)) {
              const busId = Number(key)
              if (Number.isFinite(busId) && merged[busId] != null && point != null) {
                merged[busId] = { x: Number(point.x), y: Number(point.y) }
              }
            }
            restoredLayout = merged
          }
        } catch {
          restoredLayout = defaultLayout
        }
        setBusPositions(restoredLayout)
        setGraphOffset({ x: 0, y: 0 })
        setGraphZoom(1)
        setGraphLoadError(null)
        setStatus(`Graph loaded: ${payload.buses.length} buses, ${payload.lines.length} lines.`)
      } catch (error) {
        if (!active) {
          return
        }
        const message = `Graph load failed: ${String(error)}`
        setGraphLoadError(message)
        setStatus(message)
      }
    }

    loadGraph()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (selection.specs.length === 0) {
      setSelectedLineIds(new Set())
      setSplitGroupByTopologyId({})
      return
    }

    const nextSelected = new Set<number>()
    const nextGroups: Record<string, TopologySplitGroup> = {}

    for (const spec of selection.specs) {
      if (spec.topology_id === 'N') {
        continue
      }
      const line = spec.line_outages[0]
      if (line == null) {
        continue
      }
      const idPart = spec.topology_id.split('_')[1]
      const parsed = Number(idPart)
      if (Number.isFinite(parsed)) {
        nextSelected.add(parsed)
      }
      nextGroups[spec.topology_id] = selection.unseenTopologyIds.includes(spec.topology_id) ? 'unseen' : 'seen'
    }

    setSelectedLineIds(nextSelected)
    setSplitGroupByTopologyId(nextGroups)
  }, [selection])

  useEffect(() => {
    if (graph == null || Object.keys(busPositions).length === 0) {
      return
    }
    try {
      const serialized: Record<string, { x: number; y: number }> = {}
      for (const bus of graph.buses) {
        const point = busPositions[bus.bus_idx]
        if (point != null) {
          serialized[String(bus.bus_idx)] = point
        }
      }
      window.localStorage.setItem(TOPOLOGY_LAYOUT_STORAGE_KEY, JSON.stringify(serialized))
    } catch {
      // Best-effort persistence.
    }
  }, [busPositions, graph])

  const lineById = useMemo(() => {
    if (!graph) {
      return new Map<number, TopologyVisualEdge>()
    }
    return new Map(graph.lines.map((line) => [line.line_idx, line]))
  }, [graph])

  const visualEdges = useMemo<TopologyVisualEdge[]>(() => {
    if (!graph) {
      return []
    }
    if (graph.edges && graph.edges.length > 0) {
      return graph.edges
    }
    return graph.lines.map((line) => ({
      edge_id: `line-${line.line_idx}`,
      kind: 'line',
      from_bus: line.from_bus,
      to_bus: line.to_bus,
      name: line.name,
      line_idx: line.line_idx,
    }))
  }, [graph])

  const selectedLines = useMemo(() => {
    const lines = [...selectedLineIds]
      .map((lineId) => lineById.get(lineId))
      .filter((line): line is TopologyVisualEdge & { line_idx: number } => line != null && line.line_idx != null)
      .sort((left, right) => left.line_idx - right.line_idx)
    return lines
  }, [lineById, selectedLineIds])

  const generatedSpecs = useMemo<TopologySpec[]>(() => {
    const specs: TopologySpec[] = [{ topology_id: 'N', line_outages: [] }]
    for (const line of selectedLines) {
      specs.push({
        topology_id: `N-1_${line.line_idx}_${line.from_bus}_${line.to_bus}`,
        line_outages: [{ from_bus: line.from_bus, to_bus: line.to_bus }],
      })
    }
    return specs
  }, [selectedLines])

  const assignment = useMemo<TopologySelectionState>(() => {
    const seen = ['N']
    const unseen: string[] = []
    for (const spec of generatedSpecs) {
      if (spec.topology_id === 'N') {
        continue
      }
      const group = splitGroupByTopologyId[spec.topology_id] ?? 'seen'
      if (group === 'unseen') {
        unseen.push(spec.topology_id)
      } else {
        seen.push(spec.topology_id)
      }
    }
    return {
      specs: generatedSpecs,
      seenTopologyIds: seen,
      unseenTopologyIds: unseen,
    }
  }, [generatedSpecs, splitGroupByTopologyId])

  const busPositionById = useMemo(() => {
    const positions = new Map<number, { x: number; y: number }>()
    if (!graph) {
      return positions
    }
    for (const bus of graph.buses) {
      const point = busPositions[bus.bus_idx]
      if (point != null) {
        positions.set(bus.bus_idx, point)
      }
    }
    return positions
  }, [busPositions, graph])

  const validateSpecs = async (specs: TopologySpec[]) => {
    const candidates = apiBaseUrl !== '' ? [apiBaseUrl] : [...TOPOLOGY_API_BASE_CANDIDATES]
    let lastError = 'unknown error'
    for (const baseUrl of candidates) {
      const requestUrl = `${baseUrl}/api/topology/specs/validate`
      try {
        const response = await fetch(requestUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topology_specs: specs }),
        })
        if (!response.ok) {
          const payload = await response.json().catch(() => ({ detail: response.statusText }))
          lastError = `${requestUrl} -> ${String(payload.detail ?? response.statusText)}`
          continue
        }
        return response.json()
      } catch (error) {
        lastError = `${requestUrl} -> ${String(error)}`
      }
    }
    throw new Error(lastError)
  }

  const toggleLineSelection = async (line: TopologyVisualEdge) => {
    if (line.kind !== 'line' || line.line_idx == null) {
      return
    }
    const isSelected = selectedLineIds.has(line.line_idx)

    if (isSelected) {
      const lineIdx = line.line_idx
      setSelectedLineIds((prev) => {
        const next = new Set(prev)
        next.delete(lineIdx)
        return next
      })
      setStatus(`Removed ${line.name} from topology list.`)
      return
    }

    const candidateSpecs: TopologySpec[] = [
      ...generatedSpecs,
      {
        topology_id: `N-1_${line.line_idx}_${line.from_bus}_${line.to_bus}`,
        line_outages: [{ from_bus: line.from_bus, to_bus: line.to_bus }],
      },
    ]

    setStatus(`Checking connectivity for ${line.name}...`)
    try {
      const lineIdx = line.line_idx
      await validateSpecs(candidateSpecs)
      setSelectedLineIds((prev) => new Set(prev).add(lineIdx))
      setStatus(`Added ${line.name}.`) 
    } catch (error) {
      setStatus(`Cannot add ${line.name}: ${String(error)}`)
    }
  }

  const clampGraphZoom = (value: number) => {
    return Math.min(2.2, Math.max(0.5, value))
  }

  const zoomGraphIn = () => {
    setGraphZoom((prev) => clampGraphZoom(prev + 0.1))
  }

  const zoomGraphOut = () => {
    setGraphZoom((prev) => clampGraphZoom(prev - 0.1))
  }

  const resetGraphZoom = () => {
    setGraphZoom(1)
    setGraphOffset({ x: 0, y: 0 })
  }

  const handleGraphWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const direction = event.deltaY < 0 ? 1 : -1
    setGraphZoom((prev) => clampGraphZoom(prev + direction * 0.08))
  }

  const fitGraphView = () => {
    if (!graph || graph.buses.length === 0) {
      return
    }
    const points = graph.buses.map((bus) => busPositions[bus.bus_idx]).filter((point): point is { x: number; y: number } => point != null)
    if (points.length === 0) {
      return
    }
    const minX = Math.min(...points.map((point) => point.x))
    const maxX = Math.max(...points.map((point) => point.x))
    const minY = Math.min(...points.map((point) => point.y))
    const maxY = Math.max(...points.map((point) => point.y))
    const contentWidth = Math.max(maxX - minX, 1)
    const contentHeight = Math.max(maxY - minY, 1)
    const margin = 50
    const fitX = (VIEWBOX_WIDTH - margin * 2) / contentWidth
    const fitY = (VIEWBOX_HEIGHT - margin * 2) / contentHeight
    const fitZoom = clampGraphZoom(Math.min(fitX, fitY))

    setGraphZoom(fitZoom)
    setGraphOffset({
      x: VIEWBOX_WIDTH / 2 - ((minX + maxX) / 2) * fitZoom,
      y: VIEWBOX_HEIGHT / 2 - ((minY + maxY) / 2) * fitZoom,
    })
  }

  const resetLayout = () => {
    if (!graph) {
      return
    }
    setBusPositions(createDefaultLayout(graph))
    setGraphZoom(1)
    setGraphOffset({ x: 0, y: 0 })
    setStatus('Layout reset to default circle.')
  }

  const handleGraphPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const target = event.target as Element | null
    if (target?.closest('.topology-line-hit, .topology-node')) {
      return
    }
    event.preventDefault()
    panState.current.pointerId = event.pointerId
    panState.current.startClientX = event.clientX
    panState.current.startClientY = event.clientY
    panState.current.startOffsetX = graphOffset.x
    panState.current.startOffsetY = graphOffset.y
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsGraphPanning(true)
  }

  const handleGraphPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (nodeDragState.current.pointerId === event.pointerId && nodeDragState.current.busId != null) {
      event.preventDefault()
      const viewPoint = toViewboxPoint(event)
      const worldX = (viewPoint.x - graphOffset.x) / graphZoom
      const worldY = (viewPoint.y - graphOffset.y) / graphZoom
      const deltaX = worldX - nodeDragState.current.startWorldX
      const deltaY = worldY - nodeDragState.current.startWorldY
      const busId = nodeDragState.current.busId
      setBusPositions((prev) => ({
        ...prev,
        [busId]: {
          x: nodeDragState.current.startBusX + deltaX,
          y: nodeDragState.current.startBusY + deltaY,
        },
      }))
      return
    }

    if (panState.current.pointerId === event.pointerId) {
      event.preventDefault()
      const dxClient = event.clientX - panState.current.startClientX
      const dyClient = event.clientY - panState.current.startClientY
      const rect = event.currentTarget.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) {
        return
      }
      const dx = dxClient * (VIEWBOX_WIDTH / rect.width)
      const dy = dyClient * (VIEWBOX_HEIGHT / rect.height)
      setGraphOffset({
        x: panState.current.startOffsetX + dx,
        y: panState.current.startOffsetY + dy,
      })
    }
  }

  const handleGraphPointerUp = (event: React.PointerEvent<SVGSVGElement>) => {
    if (nodeDragState.current.pointerId === event.pointerId) {
      nodeDragState.current.pointerId = null
      nodeDragState.current.busId = null
      setDraggingBusId(null)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
      return
    }

    if (panState.current.pointerId === event.pointerId) {
      panState.current.pointerId = null
      setIsGraphPanning(false)
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId)
      }
    }
  }

  const handleNodePointerDown = (busId: number, event: React.PointerEvent<SVGCircleElement>) => {
    event.stopPropagation()
    event.preventDefault()
    const point = busPositions[busId]
    if (!point) {
      return
    }
    const viewPoint = toViewboxPoint(event as unknown as React.PointerEvent<SVGSVGElement>)
    const worldX = (viewPoint.x - graphOffset.x) / graphZoom
    const worldY = (viewPoint.y - graphOffset.y) / graphZoom
    nodeDragState.current.pointerId = event.pointerId
    nodeDragState.current.busId = busId
    nodeDragState.current.startWorldX = worldX
    nodeDragState.current.startWorldY = worldY
    nodeDragState.current.startBusX = point.x
    nodeDragState.current.startBusY = point.y
    event.currentTarget.ownerSVGElement?.setPointerCapture(event.pointerId)
    setDraggingBusId(busId)
  }

  const handleSplitGroupChange = (topologyId: string, group: TopologySplitGroup) => {
    setSplitGroupByTopologyId((prev) => ({
      ...prev,
      [topologyId]: group,
    }))
  }

  const validateCurrent = async () => {
    try {
      setStatus('Validating topology specs...')
      await validateSpecs(assignment.specs)
      setStatus('Topology specs are valid.')
    } catch (error) {
      setStatus(`Validation failed: ${String(error)}`)
    }
  }

  const saveSelection = async () => {
    try {
      setIsSaving(true)
      setStatus('Validating and saving topology selection...')
      await validateSpecs(assignment.specs)
      onSelectionChange(assignment)
      setStatus(
        `Saved ${assignment.specs.length} topologies (seen: ${assignment.seenTopologyIds.length}, unseen: ${assignment.unseenTopologyIds.length}).`
      )
    } catch (error) {
      setStatus(`Save failed: ${String(error)}`)
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <main className="workbench-main">
      <div className="topology-shell">
        <section className="panel-shell topology-panel">
          <div className="panel-title">Tab2 - Topology Visual Editor</div>
          <div className="topology-actions">
            <button className="topology-btn" type="button" onClick={onBackToWorkbench}>Back to Workbench</button>
            <button className="topology-btn" type="button" onClick={validateCurrent}>Validate</button>
            <button className="topology-btn primary" type="button" onClick={saveSelection} disabled={isSaving}>Save Selection</button>
          </div>
          <div className="topology-actions topology-zoom-actions">
            <button className="topology-btn" type="button" onClick={zoomGraphOut}>-</button>
            <span className="topology-zoom-text">{Math.round(graphZoom * 100)}%</span>
            <button className="topology-btn" type="button" onClick={zoomGraphIn}>+</button>
            <button className="topology-btn" type="button" onClick={resetGraphZoom}>100%</button>
            <button className="topology-btn" type="button" onClick={fitGraphView}>Fit</button>
          </div>
          <div className="topology-status">{status}</div>
          <div className="topology-legend">
            <span><i className="dot slack" />Slack</span>
            <span><i className="dot gen" />Generator</span>
            <span><i className="dot load" />Load</span>
            <span><i className="dot bus" />Bus</span>
            <span><i className="line-selected" />Selected outage line</span>
            <span><i className="line-trafo" />Transformer connection</span>
          </div>

          <div className="topology-canvas-wrap">
            <svg
              ref={svgRef}
              className={`topology-canvas${isGraphPanning ? ' panning' : ''}`}
              viewBox={`0 0 ${VIEWBOX_WIDTH} ${VIEWBOX_HEIGHT}`}
              role="img"
              aria-label="Case39 topology graph"
              onWheel={handleGraphWheel}
              onPointerDown={handleGraphPointerDown}
              onPointerMove={handleGraphPointerMove}
              onPointerUp={handleGraphPointerUp}
              onPointerCancel={handleGraphPointerUp}
            >
              <g transform={`translate(${graphOffset.x} ${graphOffset.y}) scale(${graphZoom})`}>
              {visualEdges.map((edge) => {
                const from = busPositionById.get(edge.from_bus)
                const to = busPositionById.get(edge.to_bus)
                if (!from || !to) {
                  return null
                }
                const selected = edge.line_idx != null && selectedLineIds.has(edge.line_idx)
                const isSelectable = edge.kind === 'line' && edge.line_idx != null
                return (
                  <g key={edge.edge_id}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      className={`topology-line ${edge.kind}${selected ? ' selected' : ''}`}
                    />
                    {isSelectable ? (
                      <line
                        x1={from.x}
                        y1={from.y}
                        x2={to.x}
                        y2={to.y}
                        className="topology-line-hit"
                        onPointerDown={(event) => event.stopPropagation()}
                        onClick={() => { void toggleLineSelection(edge) }}
                      />
                    ) : null}
                    {selected ? (
                      <text className="topology-line-label" x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 4}>
                        L{edge.line_idx}
                      </text>
                    ) : null}
                  </g>
                )
              })}

              {graph?.buses.map((bus) => {
                const point = busPositionById.get(bus.bus_idx)
                if (!point) {
                  return null
                }
                return (
                  <g key={bus.bus_idx}>
                    <circle
                      cx={point.x}
                      cy={point.y}
                      r={draggingBusId === bus.bus_idx ? 9 : 8}
                      fill={nodeKindColor[bus.kind] ?? nodeKindColor.bus}
                      className="topology-node"
                      onPointerDown={(event) => handleNodePointerDown(bus.bus_idx, event)}
                    />
                    <text className="topology-node-label" x={point.x + 10} y={point.y + 4}>
                      {bus.bus_idx}
                    </text>
                  </g>
                )
              })}
              </g>

              {!graph ? (
                <g>
                  <text className="topology-empty-title" x="460" y="268">Topology graph is unavailable</text>
                  <text className="topology-empty-text" x="460" y="292">
                    Start backend API, then reload Tab2.
                  </text>
                  <text className="topology-empty-text" x="460" y="314">
                    Example: python -m alloy.experiments.run_topology_gui --port 8000
                  </text>
                  {graphLoadError ? (
                    <text className="topology-empty-error" x="460" y="342">{graphLoadError}</text>
                  ) : null}
                </g>
              ) : null}
            </svg>
          </div>
        </section>

        <section className="panel-shell topology-side-panel">
          <div className="panel-title">Topology Set (N + N-1)</div>
          <div className="topology-summary">
            <p>Total topologies: <strong>{assignment.specs.length}</strong></p>
            <p>Seen: <strong>{assignment.seenTopologyIds.length}</strong></p>
            <p>Unseen: <strong>{assignment.unseenTopologyIds.length}</strong></p>
          </div>

          <div className="topology-spec-list">
            <div className="topology-spec-item fixed">
              <div>
                <strong>N</strong>
                <div className="topology-spec-note">Baseline topology (fixed, always in seen)</div>
              </div>
              <span className="topology-chip">seen</span>
            </div>

            {assignment.specs.filter((spec) => spec.topology_id !== 'N').map((spec) => (
              <div key={spec.topology_id} className="topology-spec-item">
                <div>
                  <strong>{spec.topology_id}</strong>
                  <div className="topology-spec-note">
                    outage ({spec.line_outages[0]?.from_bus}, {spec.line_outages[0]?.to_bus})
                  </div>
                </div>
                <select
                  value={splitGroupByTopologyId[spec.topology_id] ?? 'seen'}
                  onChange={(event) => handleSplitGroupChange(spec.topology_id, event.target.value as TopologySplitGroup)}
                >
                  <option value="seen">seen</option>
                  <option value="unseen">unseen</option>
                </select>
              </div>
            ))}
          </div>

          <div className="topology-side-actions">
            <button
              className="topology-btn"
              type="button"
              onClick={resetLayout}
            >
              Reset layout
            </button>
            <button
              className="topology-btn"
              type="button"
              onClick={() => {
                setSelectedLineIds(new Set())
                setSplitGroupByTopologyId({})
                onSelectionChange(EMPTY_TOPOLOGY_SELECTION)
                setStatus('Reset to baseline N only.')
              }}
            >
              Reset to N only
            </button>
          </div>
        </section>
      </div>
    </main>
  )
}
