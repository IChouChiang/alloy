import { useEffect, useMemo, useState } from 'react'

import type {
  TopologyGraphPayload,
  TopologyLineEdge,
  TopologySelectionState,
  TopologySpec,
  TopologySplitGroup,
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
  const [selectedLineIds, setSelectedLineIds] = useState<Set<number>>(new Set())
  const [splitGroupByTopologyId, setSplitGroupByTopologyId] = useState<Record<string, TopologySplitGroup>>({})

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

  const lineById = useMemo(() => {
    if (!graph) {
      return new Map<number, TopologyLineEdge>()
    }
    return new Map(graph.lines.map((line) => [line.line_idx, line]))
  }, [graph])

  const selectedLines = useMemo(() => {
    const lines = [...selectedLineIds]
      .map((lineId) => lineById.get(lineId))
      .filter((line): line is TopologyLineEdge => line != null)
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
    if (!graph || graph.buses.length === 0) {
      return positions
    }

    const centerX = 460
    const centerY = 290
    const radius = 210
    for (const [idx, bus] of graph.buses.entries()) {
      const angle = (idx / graph.buses.length) * Math.PI * 2 - Math.PI / 2
      positions.set(bus.bus_idx, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      })
    }
    return positions
  }, [graph])

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

  const toggleLineSelection = async (line: TopologyLineEdge) => {
    const isSelected = selectedLineIds.has(line.line_idx)

    if (isSelected) {
      setSelectedLineIds((prev) => {
        const next = new Set(prev)
        next.delete(line.line_idx)
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
      await validateSpecs(candidateSpecs)
      setSelectedLineIds((prev) => new Set(prev).add(line.line_idx))
      setStatus(`Added ${line.name}.`) 
    } catch (error) {
      setStatus(`Cannot add ${line.name}: ${String(error)}`)
    }
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
          <div className="topology-status">{status}</div>
          <div className="topology-legend">
            <span><i className="dot slack" />Slack</span>
            <span><i className="dot gen" />Generator</span>
            <span><i className="dot load" />Load</span>
            <span><i className="dot bus" />Bus</span>
            <span><i className="line-selected" />Selected outage line</span>
          </div>

          <div className="topology-canvas-wrap">
            <svg className="topology-canvas" viewBox="0 0 920 580" role="img" aria-label="Case39 topology graph">
              {graph?.lines.map((line) => {
                const from = busPositionById.get(line.from_bus)
                const to = busPositionById.get(line.to_bus)
                if (!from || !to) {
                  return null
                }
                const selected = selectedLineIds.has(line.line_idx)
                return (
                  <g key={line.line_idx}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      className={selected ? 'topology-line selected' : 'topology-line'}
                      onClick={() => { void toggleLineSelection(line) }}
                    />
                    {selected ? (
                      <text className="topology-line-label" x={(from.x + to.x) / 2} y={(from.y + to.y) / 2 - 4}>
                        L{line.line_idx}
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
                      r={8}
                      fill={nodeKindColor[bus.kind] ?? nodeKindColor.bus}
                      className="topology-node"
                    />
                    <text className="topology-node-label" x={point.x + 10} y={point.y + 4}>
                      {bus.bus_idx}
                    </text>
                  </g>
                )
              })}

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
