import { useCallback, useRef, useState } from 'react'

import { useCardDrag } from '../cards/hooks/useCardDrag'
import type { Point } from '../types'

type UseWorkbenchCanvasControllerArgs = {
  caseCardWidth: number
  loadCardWidth: number
}

type UseWorkbenchCanvasControllerResult = {
  canvasRef: React.RefObject<HTMLDivElement | null>
  baselineRef: React.RefObject<HTMLDivElement | null>
  loadConfigRef: React.RefObject<HTMLDivElement | null>
  canvasZoom: number
  canvasOffset: Point
  isCanvasPanning: boolean
  cardPos: Point
  loadCardPos: Point
  isDragging: boolean
  isLoadCardDragging: boolean
  baselineHeight: number
  loadHeight: number
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
}

/**
 * Controls workbench canvas zoom/pan and card dragging interactions.
 *
 * @param args Card width metadata used to center viewport around content.
 * @returns Canvas refs, viewport state, drag state, and interaction handlers.
 */
export function useWorkbenchCanvasController({
  caseCardWidth,
  loadCardWidth,
}: UseWorkbenchCanvasControllerArgs): UseWorkbenchCanvasControllerResult {
  const MIN_ZOOM = 0.5
  const MAX_ZOOM = 1.8
  const ZOOM_STEP = 0.1

  const [canvasZoom, setCanvasZoom] = useState(1)
  const [canvasOffset, setCanvasOffset] = useState<Point>({ x: 0, y: 0 })
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const baselineRef = useRef<HTMLDivElement | null>(null)
  const loadConfigRef = useRef<HTMLDivElement | null>(null)
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

  const cardPos = baselineDrag.position
  const loadCardPos = loadDrag.position
  const isDragging = baselineDrag.isDragging
  const isLoadCardDragging = loadDrag.isDragging
  const baselineHeight = baselineRef.current?.offsetHeight ?? 156
  const loadHeight = loadConfigRef.current?.offsetHeight ?? 292

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

    const minX = Math.min(cardPos.x, loadCardPos.x)
    const maxX = Math.max(cardPos.x + caseCardWidth, loadCardPos.x + loadCardWidth)
    const minY = Math.min(cardPos.y, loadCardPos.y)
    const maxY = Math.max(
      cardPos.y + baselineCardHeight,
      loadCardPos.y + loadConfigCardHeight,
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
        '.baseline-card, .load-config-card, .canvas-toolbar, .zoom-btn, .baseline-select, .load-input, .baseline-lock-btn, button, input, select, textarea, label',
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
    canvasZoom,
    canvasOffset,
    isCanvasPanning,
    cardPos,
    loadCardPos,
    isDragging,
    isLoadCardDragging,
    baselineHeight,
    loadHeight,
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
  }
}
