import type { ChangeEvent, PointerEvent, RefObject, SyntheticEvent } from 'react'

import type { Point } from '../types.ts'
import { LockIcon } from './LockIcon.tsx'

/** Props for the Case Select card. */
type CaseSelectCardProps = {
  /** Card position in canvas/world coordinates. */
  position: Point
  /** Whether the card is currently being dragged. */
  isDragging: boolean
  /** Ref to card root for size/position measurement. */
  cardRef: RefObject<HTMLDivElement | null>
  /** Active basecase identifier. */
  selectedBasecase: string
  /** Whether card controls are locked for editing. */
  isLocked: boolean
  /** Available basecase options. */
  basecases: readonly string[]
  /** Pointer-down handler for card body drag logic. */
  onCardPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  /** Pointer-down handler for header drag handle. */
  onHeaderPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  /** Toggle lock/unlock state. */
  onToggleLock: () => void
  /** Update selected basecase value. */
  onChangeBasecase: (value: string) => void
}

/**
 * Case selection card.
 *
 * Provides locked/unlocked basecase selection and emits base-context metadata
 * to downstream cards through its output port.
 */
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
  /** Prevents child controls from bubbling pointer events to drag handlers. */
  const stopPropagation = (event: SyntheticEvent<HTMLElement>) => {
    event.stopPropagation()
  }

  /** Propagates selected basecase change to parent state. */
  const handleBasecaseChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onChangeBasecase(event.target.value)
  }

  /** Renders one selectable basecase option. */
  const renderBasecaseOption = (basecase: string) => {
    return (
      <option key={basecase} value={basecase}>
        {basecase}
      </option>
    )
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
          onChange={handleBasecaseChange}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        >
          {basecases.map(renderBasecaseOption)}
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
