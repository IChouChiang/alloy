import type { ChangeEvent, PointerEvent, RefObject, SyntheticEvent } from 'react'

import type { Point, TopologySamplingMode } from '../types.ts'
import { LockIcon } from './LockIcon.tsx'

/** Props for Topology Sampling card. */
type TopologySamplingCardProps = {
  position: Point
  isDragging: boolean
  cardRef: RefObject<HTMLDivElement | null>
  isLocked: boolean
  seenSamplingMode: TopologySamplingMode
  unseenSamplingMode: TopologySamplingMode
  onCardPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onHeaderPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onToggleLock: () => void
  onSeenSamplingModeChange: (value: TopologySamplingMode) => void
  onUnseenSamplingModeChange: (value: TopologySamplingMode) => void
}

/** Topology sampling strategy card for seen/unseen split generation behavior. */
export function TopologySamplingCard({
  position,
  isDragging,
  cardRef,
  isLocked,
  seenSamplingMode,
  unseenSamplingMode,
  onCardPointerDown,
  onHeaderPointerDown,
  onToggleLock,
  onSeenSamplingModeChange,
  onUnseenSamplingModeChange,
}: TopologySamplingCardProps) {
  const stopPropagation = (event: SyntheticEvent<HTMLElement>) => {
    event.stopPropagation()
  }

  const parseMode = (event: ChangeEvent<HTMLSelectElement>) => {
    return event.target.value as TopologySamplingMode
  }

  return (
    <div
      className={`sampling-card${isDragging ? ' dragging' : ''}`}
      ref={cardRef}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onPointerDown={onCardPointerDown}
    >
      <div
        className={`baseline-header card-drag-handle${isDragging ? ' dragging' : ''}`}
        onPointerDown={onHeaderPointerDown}
      >
        <span className="baseline-title">Topology Sampling</span>
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
        <label className="baseline-label" htmlFor="sampling-seen">seen mode</label>
        <select
          id="sampling-seen"
          className="baseline-select"
          value={seenSamplingMode}
          disabled={isLocked}
          onChange={(event) => onSeenSamplingModeChange(parseMode(event))}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        >
          <option value="uniform_cycle">uniform_cycle</option>
          <option value="uniform_random">uniform_random</option>
        </select>

        <label className="baseline-label" htmlFor="sampling-unseen">unseen mode</label>
        <select
          id="sampling-unseen"
          className="baseline-select"
          value={unseenSamplingMode}
          disabled={isLocked}
          onChange={(event) => onUnseenSamplingModeChange(parseMode(event))}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        >
          <option value="uniform_cycle">uniform_cycle</option>
          <option value="uniform_random">uniform_random</option>
        </select>
      </div>

      <p className="baseline-note">Default is uniform_cycle for deterministic and balanced coverage.</p>
      <span className="card-port card-port-input" title="Input: split config" />
      <span className="card-port card-port-output" title="Output: topology sampling config" />
    </div>
  )
}
