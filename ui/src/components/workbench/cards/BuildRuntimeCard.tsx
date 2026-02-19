import type { ChangeEvent, PointerEvent, RefObject, SyntheticEvent } from 'react'

import type { Point } from '../types.ts'
import { LockIcon } from './LockIcon.tsx'

/** Props for Build Runtime card. */
type BuildRuntimeCardProps = {
  position: Point
  isDragging: boolean
  cardRef: RefObject<HTMLDivElement | null>
  isLocked: boolean
  seed: number
  numWorkers: number
  chunkSize: number
  maxAttemptMultiplier: number
  onCardPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onHeaderPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onToggleLock: () => void
  onSeedChange: (value: number) => void
  onNumWorkersChange: (value: number) => void
  onChunkSizeChange: (value: number) => void
  onMaxAttemptMultiplierChange: (value: number) => void
}

/** Runtime tuning card for dataset build parallel execution controls. */
export function BuildRuntimeCard({
  position,
  isDragging,
  cardRef,
  isLocked,
  seed,
  numWorkers,
  chunkSize,
  maxAttemptMultiplier,
  onCardPointerDown,
  onHeaderPointerDown,
  onToggleLock,
  onSeedChange,
  onNumWorkersChange,
  onChunkSizeChange,
  onMaxAttemptMultiplierChange,
}: BuildRuntimeCardProps) {
  const stopPropagation = (event: SyntheticEvent<HTMLElement>) => {
    event.stopPropagation()
  }

  const parsePositiveInt = (event: ChangeEvent<HTMLInputElement>) => {
    return Math.max(1, Math.floor(Number(event.target.value) || 1))
  }

  return (
    <div
      className={`runtime-card${isDragging ? ' dragging' : ''}`}
      ref={cardRef}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onPointerDown={onCardPointerDown}
    >
      <div
        className={`baseline-header card-drag-handle${isDragging ? ' dragging' : ''}`}
        onPointerDown={onHeaderPointerDown}
      >
        <span className="baseline-title">Build Runtime</span>
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
        <label className="baseline-label" htmlFor="runtime-seed">seed</label>
        <input
          id="runtime-seed"
          className="load-input"
          type="number"
          step={1}
          value={seed}
          disabled={isLocked}
          onChange={(event) => onSeedChange(Math.floor(Number(event.target.value) || 0))}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />

        <label className="baseline-label" htmlFor="runtime-workers">num_workers</label>
        <input
          id="runtime-workers"
          className="load-input"
          type="number"
          min={1}
          step={1}
          value={numWorkers}
          disabled={isLocked}
          onChange={(event) => onNumWorkersChange(parsePositiveInt(event))}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />

        <label className="baseline-label" htmlFor="runtime-chunk">chunk_size</label>
        <input
          id="runtime-chunk"
          className="load-input"
          type="number"
          min={1}
          step={100}
          value={chunkSize}
          disabled={isLocked}
          onChange={(event) => onChunkSizeChange(parsePositiveInt(event))}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />

        <label className="baseline-label" htmlFor="runtime-attempt">max_attempt_multiplier</label>
        <input
          id="runtime-attempt"
          className="load-input"
          type="number"
          min={1}
          step={1}
          value={maxAttemptMultiplier}
          disabled={isLocked}
          onChange={(event) => onMaxAttemptMultiplierChange(parsePositiveInt(event))}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />
      </div>

      <p className="baseline-note">Tiny check remains CLI-only for development and is intentionally hidden from UI.</p>
      <span className="card-port card-port-input" title="Input: topology sampling config" />
      <span className="card-port card-port-output" title="Output: runtime config" />
    </div>
  )
}
