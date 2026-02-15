import { useEffect, useMemo, useRef, useState } from 'react'

import type { TopologyBusNode, TopologyGraphPayload } from '../../types'

const TOPOLOGY_LAYOUT_STORAGE_KEY = 'alloy.topology.case39.layout.v1'
const VIEWBOX_WIDTH = 920
const VIEWBOX_HEIGHT = 580

type UseTopologyCanvasInteractionArgs = {
  graph: TopologyGraphPayload | null
}

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
 * Builds default circular layout for case39 buses.
 *
 * @param buses Bus list from topology graph payload.
 * @returns Bus position map keyed by bus index.
 */
function createDefaultLayout(buses: TopologyBusNode[]) {
  const layout: Record<number, { x: number; y: number }> = {}
  const centerX = 460
  const centerY = 290
  const radius = 210
  for (const [idx, bus] of buses.entries()) {
    const angle = (idx / buses.length) * Math.PI * 2 - Math.PI / 2
    layout[bus.bus_idx] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    }
  }
  return layout
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
  const [isGraphPanning, setIsGraphPanning] = useState(false)
  const [draggingBusId, setDraggingBusId] = useState<number | null>(null)
  const [busPositions, setBusPositions] = useState<
    Record<number, { x: number; y: number }>
  >({})
  const svgRef = useRef<SVGSVGElement | null>(null)
  const panState = useRef<{
    pointerId: number | null
    startClientX: number
    startClientY: number
    startOffsetX: number
    startOffsetY: number
  }>({
    pointerId: null,
    startClientX: 0,
    startClientY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  })
  const nodeDragState = useRef<{
    pointerId: number | null
    busId: number | null
    startWorldX: number
    startWorldY: number
    startBusX: number
    startBusY: number
  }>({
    pointerId: null,
    busId: null,
    startWorldX: 0,
    startWorldY: 0,
    startBusX: 0,
    startBusY: 0,
  })

  useEffect(() => {
    if (!graph) {
      setBusPositions({})
      return
    }
    const defaultLayout = createDefaultLayout(graph.buses)
    let restoredLayout = defaultLayout
    try {
      const raw = window.localStorage.getItem(TOPOLOGY_LAYOUT_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, { x: number; y: number }>
        const merged: Record<number, { x: number; y: number }> = {
          ...defaultLayout,
        }
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
  }, [graph])

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
      window.localStorage.setItem(
        TOPOLOGY_LAYOUT_STORAGE_KEY,
        JSON.stringify(serialized),
      )
    } catch {
      // Best-effort persistence.
    }
  }, [busPositions, graph])

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

  const resetLayout = () => {
    if (!graph) {
      return
    }
    setBusPositions(createDefaultLayout(graph.buses))
    setGraphZoom(1)
    setGraphOffset({ x: 0, y: 0 })
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
    if (
      nodeDragState.current.pointerId === event.pointerId &&
      nodeDragState.current.busId != null
    ) {
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

  const handleNodePointerDown = (
    busId: number,
    event: React.PointerEvent<SVGCircleElement>,
  ) => {
    event.stopPropagation()
    event.preventDefault()
    const point = busPositions[busId]
    if (!point) {
      return
    }
    const viewPoint = toViewboxPoint(
      event as unknown as React.PointerEvent<SVGSVGElement>,
    )
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
