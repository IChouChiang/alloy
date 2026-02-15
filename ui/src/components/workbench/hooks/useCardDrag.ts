import { useCallback, useEffect, useRef, useState } from 'react'

import type { Point } from '../types'

type UseCardDragArgs = {
  canvasRef: React.RefObject<HTMLDivElement | null>
  cardRef: React.RefObject<HTMLDivElement | null>
  canvasZoom: number
  canvasOffset: Point
  initialPosition: Point
}

type UseCardDragResult = {
  position: Point
  isDragging: boolean
  setPosition: React.Dispatch<React.SetStateAction<Point>>
  startDrag: (event: React.PointerEvent<HTMLDivElement>) => void
}

/**
 * Reusable card dragging hook for canvas-local card movement.
 *
 * Args:
 *   canvasRef: Canvas container reference used for coordinate conversion.
 *   cardRef: Target card element reference.
 *   canvasZoom: Current canvas zoom ratio.
 *   canvasOffset: Current canvas translation.
 *   initialPosition: Initial card position in canvas space.
 *
 * Returns:
 *   Drag state, position state, and drag-start handler.
 */
export function useCardDrag({
  canvasRef,
  cardRef,
  canvasZoom,
  canvasOffset,
  initialPosition,
}: UseCardDragArgs): UseCardDragResult {
  const dragState = useRef<{ isDragging: boolean; offsetX: number; offsetY: number }>({
    isDragging: false,
    offsetX: 0,
    offsetY: 0,
  })
  const [position, setPosition] = useState<Point>(initialPosition)
  const [isDragging, setIsDragging] = useState(false)

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!dragState.current.isDragging || !canvasRef.current) {
      return
    }
    const containerRect = canvasRef.current.getBoundingClientRect()
    const proposedX =
      (event.clientX - containerRect.left - canvasOffset.x) / canvasZoom - dragState.current.offsetX
    const proposedY =
      (event.clientY - containerRect.top - canvasOffset.y) / canvasZoom - dragState.current.offsetY
    setPosition({ x: proposedX, y: proposedY })
  }, [canvasOffset.x, canvasOffset.y, canvasRef, canvasZoom])

  const handlePointerUp = useCallback(() => {
    if (!dragState.current.isDragging) {
      return
    }
    dragState.current.isDragging = false
    setIsDragging(false)
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }, [handlePointerMove])

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [handlePointerMove, handlePointerUp])

  const startDrag = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !cardRef.current) {
      return
    }
    event.preventDefault()
    const cardRect = cardRef.current.getBoundingClientRect()
    dragState.current.isDragging = true
    setIsDragging(true)
    dragState.current.offsetX = (event.clientX - cardRect.left) / canvasZoom
    dragState.current.offsetY = (event.clientY - cardRect.top) / canvasZoom
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

  return {
    position,
    isDragging,
    setPosition,
    startDrag,
  }
}
