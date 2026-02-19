import { useRef, useState } from 'react';

type BusPoint = { x: number; y: number }

type UseTopologyPointerInteractionsArgs = {
  svgRef: React.RefObject<SVGSVGElement | null>
  graphZoom: number
  graphOffset: BusPoint
  setGraphOffset: React.Dispatch<React.SetStateAction<BusPoint>>
  busPositions: Record<number, BusPoint>
  setBusPositions: React.Dispatch<React.SetStateAction<Record<number, BusPoint>>>
  viewBox: { width: number; height: number }
}

type UseTopologyPointerInteractionsResult = {
  isGraphPanning: boolean
  draggingBusId: number | null
  handleGraphPointerDown: (event: React.PointerEvent<SVGSVGElement>) => void
  handleGraphPointerMove: (event: React.PointerEvent<SVGSVGElement>) => void
  handleGraphPointerUp: (event: React.PointerEvent<SVGSVGElement>) => void
  handleNodePointerDown: (
    busId: number,
    event: React.PointerEvent<SVGCircleElement>,
  ) => void
}

/**
 * Handles topology SVG pointer interactions for pan and node drag.
 *
 * @param args Hook arguments containing current viewport transform and bus layout state.
 * @returns Interaction flags and pointer handlers for graph and node elements.
 */
export function useTopologyPointerInteractions({
  svgRef,
  graphZoom,
  graphOffset,
  setGraphOffset,
  busPositions,
  setBusPositions,
  viewBox,
}: UseTopologyPointerInteractionsArgs): UseTopologyPointerInteractionsResult {
  const [isGraphPanning, setIsGraphPanning] = useState(false)
  const [draggingBusId, setDraggingBusId] = useState<number | null>(null)

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

  const toViewboxPointFromClient = (clientX: number, clientY: number) => {
    if (!svgRef.current) {
      return { x: 0, y: 0 }
    }
    const rect = svgRef.current.getBoundingClientRect()
    if (rect.width === 0 || rect.height === 0) {
      return { x: 0, y: 0 }
    }
    return {
      x: (clientX - rect.left) * (viewBox.width / rect.width),
      y: (clientY - rect.top) * (viewBox.height / rect.height),
    }
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
      const viewPoint = toViewboxPointFromClient(event.clientX, event.clientY)
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
      const dx = dxClient * (viewBox.width / rect.width)
      const dy = dyClient * (viewBox.height / rect.height)
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
    const viewPoint = toViewboxPointFromClient(event.clientX, event.clientY)
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
    isGraphPanning,
    draggingBusId,
    handleGraphPointerDown,
    handleGraphPointerMove,
    handleGraphPointerUp,
    handleNodePointerDown,
  }
}
