import { useCallback, useLayoutEffect, useRef, useState } from 'react'

import { useCardDrag } from '../cards/hooks/useCardDrag.ts'
import type { Point } from '../types.ts'

/** Input arguments for the workbench canvas controller hook. */
type UseWorkbenchCanvasControllerArgs = {
  isTab1Active: boolean
  caseCardWidth: number
  loadCardWidth: number
  renewableCardWidth: number
  featureCardWidth: number
  splitCardWidth: number
  topologySamplingCardWidth: number
  runtimeCardWidth: number
  topologyTargetsCardWidth: number
}

/**
 * Complete interaction/view-model contract returned by canvas controller.
 *
 * Includes viewport state, card refs/positions, measured dimensions, and handlers.
 */
type UseWorkbenchCanvasControllerResult = {
  canvasRef: React.RefObject<HTMLDivElement | null>
  baselineRef: React.RefObject<HTMLDivElement | null>
  loadConfigRef: React.RefObject<HTMLDivElement | null>
  renewableConfigRef: React.RefObject<HTMLDivElement | null>
  featureConstructionRef: React.RefObject<HTMLDivElement | null>
  dataSplitRef: React.RefObject<HTMLDivElement | null>
  topologySamplingRef: React.RefObject<HTMLDivElement | null>
  buildRuntimeRef: React.RefObject<HTMLDivElement | null>
  topologyTargetsRef: React.RefObject<HTMLDivElement | null>
  canvasZoom: number
  canvasOffset: Point
  isCanvasPanning: boolean
  cardPos: Point
  loadCardPos: Point
  renewableCardPos: Point
  featureCardPos: Point
  splitCardPos: Point
  topologySamplingCardPos: Point
  runtimeCardPos: Point
  topologyTargetsCardPos: Point
  isDragging: boolean
  isLoadCardDragging: boolean
  isRenewableCardDragging: boolean
  isFeatureCardDragging: boolean
  isDataSplitCardDragging: boolean
  isTopologySamplingCardDragging: boolean
  isBuildRuntimeCardDragging: boolean
  isTopologyTargetsCardDragging: boolean
  baselineHeight: number
  loadHeight: number
  renewableHeight: number
  featureHeight: number
  splitHeight: number
  topologySamplingHeight: number
  runtimeHeight: number
  topologyTargetsHeight: number
  handleCanvasWheel: (event: React.WheelEvent<HTMLDivElement>) => void
  handleCanvasPanStart: (event: React.PointerEvent<HTMLDivElement>) => void
  handleCanvasPanPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void
  handleCanvasPanPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void
  zoomIn: () => void
  zoomOut: () => void
  centerAt100: () => void
  fitCanvasView: () => void
  handleDragStart: (event: React.PointerEvent<HTMLDivElement>) => void
  handleBaselineCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  handleLoadCardDragStart: (event: React.PointerEvent<HTMLDivElement>) => void
  handleLoadCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  handleRenewableCardDragStart: (event: React.PointerEvent<HTMLDivElement>) => void
  handleRenewableCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  handleFeatureCardDragStart: (event: React.PointerEvent<HTMLDivElement>) => void
  handleFeatureCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  handleDataSplitCardDragStart: (event: React.PointerEvent<HTMLDivElement>) => void
  handleDataSplitCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  handleTopologySamplingCardDragStart: (event: React.PointerEvent<HTMLDivElement>) => void
  handleTopologySamplingCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  handleBuildRuntimeCardDragStart: (event: React.PointerEvent<HTMLDivElement>) => void
  handleBuildRuntimeCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  handleTopologyTargetsCardDragStart: (event: React.PointerEvent<HTMLDivElement>) => void
  handleTopologyTargetsCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
}

/**
 * Computes global axis-aligned extent for all cards in world coordinates.
 */
function getCardExtent(cards: Array<{ pos: Point; width: number; height: number }>) {
  const minX = Math.min(...cards.map((card) => card.pos.x))
  const maxX = Math.max(...cards.map((card) => card.pos.x + card.width))
  const minY = Math.min(...cards.map((card) => card.pos.y))
  const maxY = Math.max(...cards.map((card) => card.pos.y + card.height))
  return { minX, maxX, minY, maxY }
}

/** Controls Tab1 canvas zoom/pan and all card drag interactions. */
export function useWorkbenchCanvasController({
  isTab1Active,
  caseCardWidth,
  loadCardWidth,
  renewableCardWidth,
  featureCardWidth,
  splitCardWidth,
  topologySamplingCardWidth,
  runtimeCardWidth,
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
  const renewableConfigRef = useRef<HTMLDivElement | null>(null)
  const featureConstructionRef = useRef<HTMLDivElement | null>(null)
  const dataSplitRef = useRef<HTMLDivElement | null>(null)
  const topologySamplingRef = useRef<HTMLDivElement | null>(null)
  const buildRuntimeRef = useRef<HTMLDivElement | null>(null)
  const topologyTargetsRef = useRef<HTMLDivElement | null>(null)

  const [isCanvasPanning, setIsCanvasPanning] = useState(false)
  const canvasPanState = useRef({
    isPanning: false,
    pointerId: null as number | null,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  })

  const clampZoom = useCallback(
    (value: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value)),
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
  const renewableDrag = useCardDrag({
    canvasRef,
    cardRef: renewableConfigRef,
    canvasZoom,
    canvasOffset,
    initialPosition: { x: 680, y: 24 },
  })
  const featureDrag = useCardDrag({
    canvasRef,
    cardRef: featureConstructionRef,
    canvasZoom,
    canvasOffset,
    initialPosition: { x: 1020, y: 24 },
  })
  const splitDrag = useCardDrag({
    canvasRef,
    cardRef: dataSplitRef,
    canvasZoom,
    canvasOffset,
    initialPosition: { x: 1320, y: 24 },
  })
  const topologySamplingDrag = useCardDrag({
    canvasRef,
    cardRef: topologySamplingRef,
    canvasZoom,
    canvasOffset,
    initialPosition: { x: 1660, y: 24 },
  })
  const runtimeDrag = useCardDrag({
    canvasRef,
    cardRef: buildRuntimeRef,
    canvasZoom,
    canvasOffset,
    initialPosition: { x: 2000, y: 24 },
  })
  const topologyTargetsDrag = useCardDrag({
    canvasRef,
    cardRef: topologyTargetsRef,
    canvasZoom,
    canvasOffset,
    initialPosition: { x: 2340, y: 24 },
  })

  const cardPos = baselineDrag.position
  const loadCardPos = loadDrag.position
  const renewableCardPos = renewableDrag.position
  const featureCardPos = featureDrag.position
  const splitCardPos = splitDrag.position
  const topologySamplingCardPos = topologySamplingDrag.position
  const runtimeCardPos = runtimeDrag.position
  const topologyTargetsCardPos = topologyTargetsDrag.position

  const [baselineHeight, setBaselineHeight] = useState(156)
  const [loadHeight, setLoadHeight] = useState(292)
  const [renewableHeight, setRenewableHeight] = useState(260)
  const [featureHeight, setFeatureHeight] = useState(170)
  const [splitHeight, setSplitHeight] = useState(250)
  const [topologySamplingHeight, setTopologySamplingHeight] = useState(190)
  const [runtimeHeight, setRuntimeHeight] = useState(240)
  const [topologyTargetsHeight, setTopologyTargetsHeight] = useState(220)

  useLayoutEffect(() => {
    if (!isTab1Active) {
      return undefined
    }

    const syncHeights = () => {
      const nextBaselineHeight = baselineRef.current?.offsetHeight ?? 0
      const nextLoadHeight = loadConfigRef.current?.offsetHeight ?? 0
      const nextRenewableHeight = renewableConfigRef.current?.offsetHeight ?? 0
      const nextFeatureHeight = featureConstructionRef.current?.offsetHeight ?? 0
      const nextSplitHeight = dataSplitRef.current?.offsetHeight ?? 0
      const nextTopologySamplingHeight = topologySamplingRef.current?.offsetHeight ?? 0
      const nextRuntimeHeight = buildRuntimeRef.current?.offsetHeight ?? 0
      const nextTopologyTargetsHeight = topologyTargetsRef.current?.offsetHeight ?? 0

      if (nextBaselineHeight > 0) {
        setBaselineHeight((prev) => (prev === nextBaselineHeight ? prev : nextBaselineHeight))
      }
      if (nextLoadHeight > 0) {
        setLoadHeight((prev) => (prev === nextLoadHeight ? prev : nextLoadHeight))
      }
      if (nextRenewableHeight > 0) {
        setRenewableHeight((prev) => (prev === nextRenewableHeight ? prev : nextRenewableHeight))
      }
      if (nextFeatureHeight > 0) {
        setFeatureHeight((prev) => (prev === nextFeatureHeight ? prev : nextFeatureHeight))
      }
      if (nextSplitHeight > 0) {
        setSplitHeight((prev) => (prev === nextSplitHeight ? prev : nextSplitHeight))
      }
      if (nextTopologySamplingHeight > 0) {
        setTopologySamplingHeight((prev) => (prev === nextTopologySamplingHeight ? prev : nextTopologySamplingHeight))
      }
      if (nextRuntimeHeight > 0) {
        setRuntimeHeight((prev) => (prev === nextRuntimeHeight ? prev : nextRuntimeHeight))
      }
      if (nextTopologyTargetsHeight > 0) {
        setTopologyTargetsHeight((prev) => (prev === nextTopologyTargetsHeight ? prev : nextTopologyTargetsHeight))
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
    const refs = [
      baselineRef,
      loadConfigRef,
      renewableConfigRef,
      featureConstructionRef,
      dataSplitRef,
      topologySamplingRef,
      buildRuntimeRef,
      topologyTargetsRef,
    ]
    refs.forEach((ref) => {
      if (ref.current) {
        observer.observe(ref.current)
      }
    })

    return () => {
      cancelAnimationFrame(frameId)
      observer.disconnect()
    }
  }, [isTab1Active])

  /**
   * Decides whether pointer-down should initiate card dragging.
   *
   * Interactive child controls are excluded to preserve normal input behavior.
   */
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

  /** Updates canvas offset while pan gesture is active. */
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

  /** Finalizes current pan gesture and releases captured pointer when needed. */
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

  /** Starts baseline-card dragging from non-interactive card surface area. */
  const handleBaselineCardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!shouldStartCardDrag(event)) {
      return
    }
    handleDragStart(event)
  }

  const handleLoadCardDragStart = loadDrag.startDrag

  /** Starts load-card dragging from non-interactive card surface area. */
  const handleLoadCardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!shouldStartCardDrag(event)) {
      return
    }
    handleLoadCardDragStart(event)
  }

  const handleRenewableCardDragStart = renewableDrag.startDrag

  /** Starts renewable-card dragging from non-interactive card surface area. */
  const handleRenewableCardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!shouldStartCardDrag(event)) {
      return
    }
    handleRenewableCardDragStart(event)
  }

  const handleFeatureCardDragStart = featureDrag.startDrag

  /** Starts feature-card dragging from non-interactive card surface area. */
  const handleFeatureCardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!shouldStartCardDrag(event)) {
      return
    }
    handleFeatureCardDragStart(event)
  }

  const handleDataSplitCardDragStart = splitDrag.startDrag

  /** Starts data-split-card dragging from non-interactive card surface area. */
  const handleDataSplitCardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!shouldStartCardDrag(event)) {
      return
    }
    handleDataSplitCardDragStart(event)
  }

  const handleTopologySamplingCardDragStart = topologySamplingDrag.startDrag

  /** Starts topology-sampling-card dragging from non-interactive card surface area. */
  const handleTopologySamplingCardPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!shouldStartCardDrag(event)) {
      return
    }
    handleTopologySamplingCardDragStart(event)
  }

  const handleBuildRuntimeCardDragStart = runtimeDrag.startDrag

  /** Starts build-runtime-card dragging from non-interactive card surface area. */
  const handleBuildRuntimeCardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!shouldStartCardDrag(event)) {
      return
    }
    handleBuildRuntimeCardDragStart(event)
  }

  const handleTopologyTargetsCardDragStart = topologyTargetsDrag.startDrag

  /** Starts topology-targets-card dragging from non-interactive card surface area. */
  const handleTopologyTargetsCardPointerDown = (
    event: React.PointerEvent<HTMLDivElement>,
  ) => {
    if (!shouldStartCardDrag(event)) {
      return
    }
    handleTopologyTargetsCardDragStart(event)
  }

  /** Applies wheel-driven zoom delta to canvas viewport. */
  const handleCanvasWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const direction = event.deltaY < 0 ? 1 : -1
    setCanvasZoom((prev) => clampZoom(prev + direction * ZOOM_STEP))
  }

  /** Increases canvas zoom by one configured zoom step. */
  const zoomIn = () => setCanvasZoom((prev) => clampZoom(prev + ZOOM_STEP))

  /** Decreases canvas zoom by one configured zoom step. */
  const zoomOut = () => setCanvasZoom((prev) => clampZoom(prev - ZOOM_STEP))

  /** Builds a normalized list of all draggable cards for extent computations. */
  const getAllCards = () => {
    return [
      { pos: cardPos, width: caseCardWidth, height: baselineHeight },
      { pos: loadCardPos, width: loadCardWidth, height: loadHeight },
      { pos: renewableCardPos, width: renewableCardWidth, height: renewableHeight },
      { pos: featureCardPos, width: featureCardWidth, height: featureHeight },
      { pos: splitCardPos, width: splitCardWidth, height: splitHeight },
      {
        pos: topologySamplingCardPos,
        width: topologySamplingCardWidth,
        height: topologySamplingHeight,
      },
      { pos: runtimeCardPos, width: runtimeCardWidth, height: runtimeHeight },
      {
        pos: topologyTargetsCardPos,
        width: topologyTargetsCardWidth,
        height: topologyTargetsHeight,
      },
    ]
  }

  /** Resets zoom to 100% and centers viewport around all cards. */
  const centerAt100 = () => {
    if (!canvasRef.current) {
      return
    }
    const viewportWidth = canvasRef.current.clientWidth
    const viewportHeight = canvasRef.current.clientHeight
    const extent = getCardExtent(getAllCards())
    const contentCenterX = (extent.minX + extent.maxX) / 2
    const contentCenterY = (extent.minY + extent.maxY) / 2
    setCanvasZoom(1)
    setCanvasOffset({
      x: viewportWidth / 2 - contentCenterX,
      y: viewportHeight / 2 - contentCenterY,
    })
  }

  /** Fits all cards inside viewport with margin while respecting zoom bounds. */
  const fitCanvasView = () => {
    if (!canvasRef.current) {
      return
    }
    const viewportWidth = canvasRef.current.clientWidth
    const viewportHeight = canvasRef.current.clientHeight
    if (viewportWidth <= 0 || viewportHeight <= 0) {
      return
    }

    const extent = getCardExtent(getAllCards())
    const contentWidth = Math.max(extent.maxX - extent.minX, 1)
    const contentHeight = Math.max(extent.maxY - extent.minY, 1)
    const margin = 32
    const fitX = (viewportWidth - margin * 2) / contentWidth
    const fitY = (viewportHeight - margin * 2) / contentHeight
    const fitZoom = clampZoom(Math.min(fitX, fitY))
    const centerX = (extent.minX + extent.maxX) / 2
    const centerY = (extent.minY + extent.maxY) / 2

    setCanvasZoom(fitZoom)
    setCanvasOffset({
      x: viewportWidth / 2 - centerX * fitZoom,
      y: viewportHeight / 2 - centerY * fitZoom,
    })
  }

  /** Starts panning when pointer-down occurs on empty canvas background. */
  const handleCanvasPanStart = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    if (
      target?.closest(
        '.baseline-card, .load-config-card, .renewable-config-card, .feature-card, .split-card, .sampling-card, .runtime-card, .topology-target-card, .canvas-toolbar, .zoom-btn, .baseline-select, .load-input, .baseline-lock-btn, button, input, select, textarea, label',
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
    renewableConfigRef,
    featureConstructionRef,
    dataSplitRef,
    topologySamplingRef,
    buildRuntimeRef,
    topologyTargetsRef,
    canvasZoom,
    canvasOffset,
    isCanvasPanning,
    cardPos,
    loadCardPos,
    renewableCardPos,
    featureCardPos,
    splitCardPos,
    topologySamplingCardPos,
    runtimeCardPos,
    topologyTargetsCardPos,
    isDragging: baselineDrag.isDragging,
    isLoadCardDragging: loadDrag.isDragging,
    isRenewableCardDragging: renewableDrag.isDragging,
    isFeatureCardDragging: featureDrag.isDragging,
    isDataSplitCardDragging: splitDrag.isDragging,
    isTopologySamplingCardDragging: topologySamplingDrag.isDragging,
    isBuildRuntimeCardDragging: runtimeDrag.isDragging,
    isTopologyTargetsCardDragging: topologyTargetsDrag.isDragging,
    baselineHeight,
    loadHeight,
    renewableHeight,
    featureHeight,
    splitHeight,
    topologySamplingHeight,
    runtimeHeight,
    topologyTargetsHeight,
    handleCanvasWheel,
    handleCanvasPanStart,
    handleCanvasPanPointerMove,
    handleCanvasPanPointerUp,
    zoomIn,
    zoomOut,
    centerAt100,
    fitCanvasView,
    handleDragStart,
    handleBaselineCardPointerDown,
    handleLoadCardDragStart,
    handleLoadCardPointerDown,
    handleRenewableCardDragStart,
    handleRenewableCardPointerDown,
    handleFeatureCardDragStart,
    handleFeatureCardPointerDown,
    handleDataSplitCardDragStart,
    handleDataSplitCardPointerDown,
    handleTopologySamplingCardDragStart,
    handleTopologySamplingCardPointerDown,
    handleBuildRuntimeCardDragStart,
    handleBuildRuntimeCardPointerDown,
    handleTopologyTargetsCardDragStart,
    handleTopologyTargetsCardPointerDown,
  }
}
