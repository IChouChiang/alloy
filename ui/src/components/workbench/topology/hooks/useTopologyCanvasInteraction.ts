import { useCallback, useRef, useState } from 'react'

import type { TopologyGraphPayload } from '../../types.ts'
import { useTopologyLayoutPersistence } from './useTopologyLayoutPersistence.ts'
import { useTopologyPointerInteractions } from './useTopologyPointerInteractions.ts'

const VIEWBOX_WIDTH = 920
const VIEWBOX_HEIGHT = 580

/** Input contract for topology canvas interaction orchestration. */
type UseTopologyCanvasInteractionArgs = {
  graph: TopologyGraphPayload | null
}

/** Output contract for topology canvas state, derived layout and handlers. */
type UseTopologyCanvasInteractionResult = {
  svgRef: React.RefObject<SVGSVGElement | null>
  graphZoom: number
  graphOffset: { x: number; y: number }
  isGraphPanning: boolean
  draggingBusId: number | null
  busPositionById: Map<number, { x: number; y: number }>
  viewBox: { width: number; height: number }
  zoomGraphIn: () => void
  zoomGraphOut: () => void
  resetGraphZoom: () => void
  fitGraphView: () => void
  resetLayout: () => void
  handleGraphWheel: (event: React.WheelEvent<SVGSVGElement>) => void
  handleGraphPointerDown: (event: React.PointerEvent<SVGSVGElement>) => void
  handleGraphPointerMove: (event: React.PointerEvent<SVGSVGElement>) => void
  handleGraphPointerUp: (event: React.PointerEvent<SVGSVGElement>) => void
  handleNodePointerDown: (
    busId: number,
    event: React.PointerEvent<SVGCircleElement>,
  ) => void
}

/**
 * Manages graph canvas zoom/pan/node-drag interaction and layout persistence.
 *
 * @param args Hook input including latest topology graph payload.
 * @returns SVG interaction state and handlers for topology canvas rendering.
 */
export function useTopologyCanvasInteraction({
  graph,
}: UseTopologyCanvasInteractionArgs): UseTopologyCanvasInteractionResult {
  const [graphZoom, setGraphZoom] = useState(1)
  const [graphOffset, setGraphOffset] = useState({ x: 0, y: 0 })
  const svgRef = useRef<SVGSVGElement | null>(null)

  const resetGraphTransform = useCallback(() => {
    setGraphOffset({ x: 0, y: 0 })
    setGraphZoom(1)
  }, [])

  const {
    busPositions,
    setBusPositions,
    busPositionById,
    resetLayout,
  } = useTopologyLayoutPersistence({
    graph,
    onGraphReset: resetGraphTransform,
  })

  /** Restricts graph zoom to stable UX bounds. */
  const clampGraphZoom = (value: number) => {
    return Math.min(2.2, Math.max(0.5, value))
  }

  /** Zooms in graph viewport by one step. */
  const zoomGraphIn = () => {
    setGraphZoom((prev) => clampGraphZoom(prev + 0.1))
  }

  /** Zooms out graph viewport by one step. */
  const zoomGraphOut = () => {
    setGraphZoom((prev) => clampGraphZoom(prev - 0.1))
  }

  /** Resets graph zoom and offset back to defaults. */
  const resetGraphZoom = () => {
    resetGraphTransform()
  }

  /** Handles wheel-driven zoom centered on current viewport transform. */
  const handleGraphWheel = (event: React.WheelEvent<SVGSVGElement>) => {
    event.preventDefault()
    const direction = event.deltaY < 0 ? 1 : -1
    setGraphZoom((prev) => clampGraphZoom(prev + direction * 0.08))
  }

  /** Fits all visible bus nodes into the fixed viewBox with margin. */
  const fitGraphView = () => {
    if (!graph || graph.buses.length === 0) {
      return
    }
    const points = graph.buses
      .map((bus) => busPositions[bus.bus_idx])
      .filter((point): point is { x: number; y: number } => point != null)
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

  const {
    isGraphPanning,
    draggingBusId,
    handleGraphPointerDown,
    handleGraphPointerMove,
    handleGraphPointerUp,
    handleNodePointerDown,
  } = useTopologyPointerInteractions({
    svgRef,
    graphZoom,
    graphOffset,
    setGraphOffset,
    busPositions,
    setBusPositions,
    viewBox: { width: VIEWBOX_WIDTH, height: VIEWBOX_HEIGHT },
  })

  return {
    svgRef,
    graphZoom,
    graphOffset,
    isGraphPanning,
    draggingBusId,
    busPositionById,
    viewBox: { width: VIEWBOX_WIDTH, height: VIEWBOX_HEIGHT },
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
  }
}
