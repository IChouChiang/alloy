import { useMemo, useState } from 'react'
import './Tab2TopologyEditor.css'

import { TopologySpecListPanel } from './TopologySpecListPanel'
import { EMPTY_TOPOLOGY_SELECTION, useTopologyGraphData } from './hooks/useTopologyGraphData'
import { useTopologyCanvasInteraction } from './hooks/useTopologyCanvasInteraction'
import type { TopologySelectionState } from './types'

type Tab2TopologyEditorProps = {
  selection: TopologySelectionState
  onSelectionChange: (next: TopologySelectionState) => void
  onBackToWorkbench: () => void
}

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
export function Tab2TopologyEditor({
  selection,
  onSelectionChange,
  onBackToWorkbench,
}: Tab2TopologyEditorProps) {
  const [focusedTopologyId, setFocusedTopologyId] = useState<string | null>(null)
  const {
    graph,
    status,
    setStatus,
    graphLoadError,
    isSaving,
    setIsSaving,
    selectedLineIds,
    setSelectedLineIds,
    splitGroupByTopologyId,
    setSplitGroupByTopologyId,
    visualEdges,
    assignment,
    selectedSpecs,
    validateSpecs,
    toggleLineSelection,
    handleSplitGroupChange,
    assignAllTopologies,
    removeTopologySpec,
  } = useTopologyGraphData({ selection })

  const {
    svgRef,
    graphZoom,
    graphOffset,
    isGraphPanning,
    draggingBusId,
    busPositionById,
    viewBox,
    zoomGraphIn,
    zoomGraphOut,
    resetGraphZoom,
    fitGraphView,
    resetLayout,
    handleGraphWheel,
    handleGraphPointerDown,
    handleGraphPointerMove,
    handleGraphPointerUp,
    handleNodePointerDown,
  } = useTopologyCanvasInteraction({ graph })

  const focusedLineIdx = useMemo(() => {
    if (!focusedTopologyId || focusedTopologyId === 'N') {
      return null
    }
    const parsed = Number(focusedTopologyId.split('_')[1])
    return Number.isFinite(parsed) ? parsed : null
  }, [focusedTopologyId])

  const resetLayoutWithStatus = () => {
    resetLayout()
    setStatus('Layout reset to default circle.')
  }

  const resetToBaseline = () => {
    setSelectedLineIds(new Set())
    setSplitGroupByTopologyId({})
    onSelectionChange(EMPTY_TOPOLOGY_SELECTION)
    setStatus('Reset to baseline N only.')
  }

  const handleRemoveTopologySpec = (topologyId: string) => {
    removeTopologySpec(topologyId, focusedTopologyId, () => setFocusedTopologyId(null))
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
              viewBox={`0 0 ${viewBox.width} ${viewBox.height}`}
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
                const focused = edge.line_idx != null && focusedLineIdx === edge.line_idx
                const isSelectable = edge.kind === 'line' && edge.line_idx != null
                return (
                  <g key={edge.edge_id}>
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      className={`topology-line ${edge.kind}${selected ? ' selected' : ''}${focused ? ' focused' : ''}`}
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

        <TopologySpecListPanel
          assignment={assignment}
          selectedSpecs={selectedSpecs}
          splitGroupByTopologyId={splitGroupByTopologyId}
          focusedTopologyId={focusedTopologyId}
          onSetFocusedTopologyId={setFocusedTopologyId}
          onSplitGroupChange={handleSplitGroupChange}
          onAssignAllTopologies={assignAllTopologies}
          onRemoveTopologySpec={handleRemoveTopologySpec}
          onResetLayout={resetLayoutWithStatus}
          onResetToBaseline={resetToBaseline}
        />
      </div>
    </main>
  )
}
