import type { PointerEvent, RefObject, SyntheticEvent } from 'react'

import { LockIcon } from './LockIcon'
import type { Point } from './types'

type CaseSelectCardProps = {
  position: Point
  isDragging: boolean
  cardRef: RefObject<HTMLDivElement | null>
  selectedBasecase: string
  isLocked: boolean
  basecases: readonly string[]
  onCardPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onHeaderPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onToggleLock: () => void
  onChangeBasecase: (value: string) => void
}

export function CaseSelectCard({
  position,
  isDragging,
  cardRef,
  selectedBasecase,
  isLocked,
  basecases,
  onCardPointerDown,
  onHeaderPointerDown,
  onToggleLock,
  onChangeBasecase,
}: CaseSelectCardProps) {
  const stopPropagation = (event: SyntheticEvent<HTMLElement>) => {
    event.stopPropagation()
  }

  return (
    <div
      className={`baseline-card${isDragging ? ' dragging' : ''}`}
      ref={cardRef}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onPointerDown={onCardPointerDown}
    >
      <div className={`baseline-header card-drag-handle${isDragging ? ' dragging' : ''}`} onPointerDown={onHeaderPointerDown}>
        <span className="baseline-title">Baseline</span>
        <button
          type="button"
          className={`baseline-lock-btn${isLocked ? ' locked' : ''}`}
          onClick={onToggleLock}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
          title={isLocked ? 'Unlock configuration' : 'Lock configuration'}
          aria-label={isLocked ? 'Unlock configuration' : 'Lock configuration'}
        >
          <LockIcon locked={isLocked} />
          <span>{isLocked ? 'Locked' : 'Unlocked'}</span>
        </button>
      </div>
      <div className="baseline-row">
        <label className="baseline-label" htmlFor="basecase-select">Base case</label>
        <select
          id="basecase-select"
          className="baseline-select"
          value={selectedBasecase}
          disabled={isLocked}
          onChange={(event) => onChangeBasecase(event.target.value)}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        >
          {basecases.map((basecase) => (
            <option key={basecase} value={basecase}>
              {basecase}
            </option>
          ))}
        </select>
      </div>
      <p className="baseline-note">
        {isLocked
          ? 'Basecase selection is locked to prevent accidental edits.'
          : 'Basecase selection is unlocked for editing.'}
      </p>
      <span className="card-port card-port-output" title="Output: basecase context" />
    </div>
  )
}
