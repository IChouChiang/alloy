import { useCallback, useLayoutEffect, useRef, useState } from 'react'

import { useCardDrag } from '../cards/hooks/useCardDrag'
import type { Point } from '../types'

type UseWorkbenchCanvasControllerArgs = {
  isTab1Active: boolean
  caseCardWidth: number
  loadCardWidth: number
  topologyTargetsCardWidth: number
}

type UseWorkbenchCanvasControllerResult = {
  canvasRef: React.RefObject<HTMLDivElement | null>
  baselineRef: React.RefObject<HTMLDivElement | null>
  loadConfigRef: React.RefObject<HTMLDivElement | null>
  topologyTargetsRef: React.RefObject<HTMLDivElement | null>
  canvasZoom: number
  canvasOffset: Point
  isCanvasPanning: boolean
  cardPos: Point
  loadCardPos: Point
  topologyTargetsCardPos: Point
  isDragging: boolean
  isLoadCardDragging: boolean
  isTopologyTargetsCardDragging: boolean
  baselineHeight: number
  loadHeight: number
  topologyTargetsHeight: number
  handleCanvasWheel: (event: React.WheelEvent<HTMLDivElement>) => void
  handleCanvasPanStart: (event: React.PointerEvent<HTMLDivElement>) => void
  handleCanvasPanPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void
  handleCanvasPanPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void
  zoomIn: () => void
  zoomOut: () => void
  centerAt100: () => void
  handleDragStart: (event: React.PointerEvent<HTMLDivElement>) => void
  handleBaselineCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  handleLoadCardDragStart: (event: React.PointerEvent<HTMLDivElement>) => void
  handleLoadCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  handleTopologyTargetsCardDragStart: (
    event: React.PointerEvent<HTMLDivElement>,
  ) => void
  handleTopologyTargetsCardPointerDown: (
    event: React.PointerEvent<HTMLDivElement>,
  ) => void
}

/**
 * Controls workbench canvas zoom/pan and card dragging interactions.
 *
 * @param args Card width metadata used to center viewport around content.
 * @returns Canvas refs, viewport state, drag state, and interaction handlers.
 */
export function useWorkbenchCanvasController({
  isTab1Active,
  caseCardWidth,
  loadCardWidth,
  topologyTargetsCardWidth,
}: UseWorkbenchCanvasControllerArgs): UseWorkbenchCanvasControllerResult {
  const MIN_ZOOM = 0.5
  const MAX_ZOOM = 1.8
  const ZOOM_STEP = 0.1

  const [canvasZoom, setCanvasZoom] = useState(1)
  const [canvasOffset, setCanvasOffset] = useState<Point>({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const baselineRef = useRef<HTMLDivElement | null>(null)
  const loadConfigRef = useRef<HTMLDivElement | null>(null)
  const topologyTargetsRef = useRef<HTMLDivElement | null>(null)
  const [isCanvasPanning, setIsCanvasPanning] = useState(false)
  const canvasPanState = useRef<{
    isPanning: boolean
    pointerId: number | null
    startX: number
    startY: number
    startOffsetX: number
    startOffsetY: number
  }>({
    isPanning: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  })

  const clampZoom = useCallback(
    (value: number) => {
      return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
    },
    [MAX_ZOOM, MIN_ZOOM],
  )

  const baselineDrag = useCardDrag({
    canvasRef,
    cardRef: baselineRef,
    canvasZoom,
    canvasOffset,
    initialPosition: { x: 24, y: 24 },
  })
  const loadDrag = useCardDrag({
    canvasRef,
    cardRef: loadConfigRef,
    canvasZoom,
    canvasOffset,
    initialPosition: { x: 320, y: 24 },
  })
  const topologyTargetsDrag = useCardDrag({
    canvasRef,
    cardRef: topologyTargetsRef,
    canvasZoom,
    canvasOffset,
    initialPosition: { x: 680, y: 24 },
  })

  const cardPos = baselineDrag.position
  const loadCardPos = loadDrag.position
  const isDragging = baselineDrag.isDragging
  const isLoadCardDragging = loadDrag.isDragging
  const isTopologyTargetsCardDragging = topologyTargetsDrag.isDragging
  const topologyTargetsCardPos = topologyTargetsDrag.position
  const [baselineHeight, setBaselineHeight] = useState(156)
  const [loadHeight, setLoadHeight] = useState(292)
  const [topologyTargetsHeight, setTopologyTargetsHeight] = useState(220)

  useLayoutEffect(() => {
    if (!isTab1Active) {
      return undefined
    }

    const syncHeights = () => {
      const baselineEl = baselineRef.current
      const loadEl = loadConfigRef.current
      const topologyTargetsEl = topologyTargetsRef.current

      const nextBaselineHeight = baselineEl?.offsetHeight ?? 0
      const nextLoadHeight = loadEl?.offsetHeight ?? 0
      const nextTopologyTargetsHeight = topologyTargetsEl?.offsetHeight ?? 0

      if (nextBaselineHeight > 0) {
        setBaselineHeight((prev) => (
          prev === nextBaselineHeight ? prev : nextBaselineHeight
        ))
      }
      if (nextLoadHeight > 0) {
        setLoadHeight((prev) => (prev === nextLoadHeight ? prev : nextLoadHeight))
      }
      if (nextTopologyTargetsHeight > 0) {
        setTopologyTargetsHeight((prev) => (
          prev === nextTopologyTargetsHeight ? prev : nextTopologyTargetsHeight
        ))
      }
    }

    syncHeights()
    const frameId = requestAnimationFrame(syncHeights)

    if (typeof ResizeObserver === 'undefined') {
      return () => {
        cancelAnimationFrame(frameId)
      }
    }

    const observer = new ResizeObserver(syncHeights)

    if (baselineRef.current) {
      observer.observe(baselineRef.current)
    }
    if (loadConfigRef.current) {
      observer.observe(loadConfigRef.current)
    }
    if (topologyTargetsRef.current) {
      observer.observe(topologyTargetsRef.current)
    }

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
    }
  }, [isTab1Active])

  const handleCanvasPanPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !canvasPanState.current.isPanning ||
      canvasPanState.current.pointerId !== event.pointerId
    ) {
      return
    }
    const deltaX = event.clientX - canvasPanState.current.startX
    const deltaY = event.clientY - canvasPanState.current.startY
    setCanvasOffset({
      x: canvasPanState.current.startOffsetX + deltaX,
      y: canvasPanState.current.startOffsetY + deltaY,
    })
  }

  const handleCanvasPanPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (
      !canvasPanState.current.isPanning ||
      canvasPanState.current.pointerId !== event.pointerId
    ) {
      return
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    canvasPanState.current.isPanning = false
    canvasPanState.current.pointerId = null
    setIsCanvasPanning(false)
  }

  const handleDragStart = baselineDrag.startDrag

  const shouldStartCardDrag = (event: React.PointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null
    if (!target) {
      return false
    }
    if (
      target.closest(
        'button, input, select, textarea, option, .card-drag-handle, .baseline-title, .baseline-note, .baseline-label, .zoom-btn, .canvas-toolbar, p, span, label',
      )
    ) {
      return false
    }
    return true
  }

  const handleBaselineCardPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!shouldStartCardDrag(event)) {
      return
    }
    handleDragStart(event)
  }

  const handleLoadCardDragStart = loadDrag.startDrag

  const handleLoadCardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!shouldStartCardDrag(event)) {
      return
    }
    handleLoadCardDragStart(event)
  }

  const handleTopologyTargetsCardDragStart = topologyTargetsDrag.startDrag

  const handleTopologyTargetsCardPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!shouldStartCardDrag(event)) {
      return
    }
    handleTopologyTargetsCardDragStart(event)
  }

  const handleCanvasWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const direction = event.deltaY < 0 ? 1 : -1
    setCanvasZoom((prev) => clampZoom(prev + direction * ZOOM_STEP))
  }

  const zoomIn = () => {
    setCanvasZoom((prev) => clampZoom(prev + ZOOM_STEP))
  }

  const zoomOut = () => {
    setCanvasZoom((prev) => clampZoom(prev - ZOOM_STEP))
  }

  const centerAt100 = () => {
    if (!canvasRef.current) {
      return
    }
    const viewportWidth = canvasRef.current.clientWidth
    const viewportHeight = canvasRef.current.clientHeight

    const baselineCardHeight = baselineRef.current?.offsetHeight ?? 180
    const loadConfigCardHeight = loadConfigRef.current?.offsetHeight ?? 300
    const topologyTargetsCardHeight = topologyTargetsRef.current?.offsetHeight ?? 220

    const minX = Math.min(cardPos.x, loadCardPos.x, topologyTargetsCardPos.x)
    const maxX = Math.max(
      cardPos.x + caseCardWidth,
      loadCardPos.x + loadCardWidth,
      topologyTargetsCardPos.x + topologyTargetsCardWidth,
    )
    const minY = Math.min(cardPos.y, loadCardPos.y, topologyTargetsCardPos.y)
    const maxY = Math.max(
      cardPos.y + baselineCardHeight,
      loadCardPos.y + loadConfigCardHeight,
      topologyTargetsCardPos.y + topologyTargetsCardHeight,
    )

    const contentCenterX = (minX + maxX) / 2
    const contentCenterY = (minY + maxY) / 2

    setCanvasZoom(1)
    setCanvasOffset({
      x: viewportWidth / 2 - contentCenterX,
      y: viewportHeight / 2 - contentCenterY,
    })
  }

  const handleCanvasPanStart = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    if (
      target?.closest(
        '.baseline-card, .load-config-card, .topology-target-card, .canvas-toolbar, .zoom-btn, .baseline-select, .load-input, .baseline-lock-btn, button, input, select, textarea, label',
      )
    ) {
      return
    }
    event.preventDefault()
    canvasPanState.current.isPanning = true
    canvasPanState.current.pointerId = event.pointerId
    canvasPanState.current.startX = event.clientX
    canvasPanState.current.startY = event.clientY
    canvasPanState.current.startOffsetX = canvasOffset.x
    canvasPanState.current.startOffsetY = canvasOffset.y
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsCanvasPanning(true)
  }

  return {
    canvasRef,
    baselineRef,
    loadConfigRef,
    topologyTargetsRef,
    canvasZoom,
    canvasOffset,
    isCanvasPanning,
    cardPos,
    loadCardPos,
    topologyTargetsCardPos,
    isDragging,
    isLoadCardDragging,
    isTopologyTargetsCardDragging,
    baselineHeight,
    loadHeight,
    topologyTargetsHeight,
    handleCanvasWheel,
    handleCanvasPanStart,
    handleCanvasPanPointerMove,
    handleCanvasPanPointerUp,
    zoomIn,
    zoomOut,
    centerAt100,
    handleDragStart,
    handleBaselineCardPointerDown,
    handleLoadCardDragStart,
    handleLoadCardPointerDown,
    handleTopologyTargetsCardDragStart,
    handleTopologyTargetsCardPointerDown,
  }
}
