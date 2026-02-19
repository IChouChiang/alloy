import type { ChangeEvent, PointerEvent, RefObject, SyntheticEvent } from 'react'

import type { Point } from '../types.ts'
import { LockIcon } from './LockIcon.tsx'

/** Props for Feature Construction card. */
type FeatureConstructionCardProps = {
  position: Point
  isDragging: boolean
  cardRef: RefObject<HTMLDivElement | null>
  isLocked: boolean
  numIterations: number
  onCardPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onHeaderPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onToggleLock: () => void
  onNumIterationsChange: (value: number) => void
}

/** Feature-construction card for GCNN iteration depth. */
export function FeatureConstructionCard({
  position,
  isDragging,
  cardRef,
  isLocked,
  numIterations,
  onCardPointerDown,
  onHeaderPointerDown,
  onToggleLock,
  onNumIterationsChange,
}: FeatureConstructionCardProps) {
  const stopPropagation = (event: SyntheticEvent<HTMLElement>) => {
    event.stopPropagation()
  }

  const handleNumIterationsChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Math.max(1, Math.floor(Number(event.target.value) || 1))
    onNumIterationsChange(next)
  }

  return (
    <div
      className={`feature-card${isDragging ? ' dragging' : ''}`}
      ref={cardRef}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onPointerDown={onCardPointerDown}
    >
      <div
        className={`baseline-header card-drag-handle${isDragging ? ' dragging' : ''}`}
        onPointerDown={onHeaderPointerDown}
      >
        <span className="baseline-title">Feature Construction</span>
        <button
          type="button"
          className={`baseline-lock-btn${isLocked ? ' locked' : ''}`}
          onClick={onToggleLock}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        >
          <LockIcon locked={isLocked} />
          <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
        </button>
      </div>

      <div className="load-config-grid">
        <label className="baseline-label" htmlFor="feature-num-iterations">num_iterations</label>
        <input
          id="feature-num-iterations"
          className="load-input"
          type="number"
          min={1}
          step={1}
          value={numIterations}
          disabled={isLocked}
          onChange={handleNumIterationsChange}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />
      </div>

      <p className="baseline-note">Controls feature construction depth in the physics-guided pipeline.</p>
      <span className="card-port card-port-input" title="Input: renewable config" />
      <span className="card-port card-port-output" title="Output: feature settings" />
    </div>
  )
}
