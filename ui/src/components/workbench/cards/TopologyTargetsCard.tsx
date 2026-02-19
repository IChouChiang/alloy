import type { ChangeEvent, PointerEvent, RefObject, SyntheticEvent } from 'react'

import type { Point } from '../types.ts'
import { LockIcon } from './LockIcon.tsx'

/** Props for topology target-count card. */
type TopologyTargetsCardProps = {
  /** Card position in canvas/world coordinates. */
  position: Point
  /** Whether the card is currently being dragged. */
  isDragging: boolean
  /** Ref to card root for size/position measurement. */
  cardRef: RefObject<HTMLDivElement | null>
  /** Whether card controls are locked for editing. */
  isLocked: boolean
  /** Current seen topology count (includes baseline N). */
  seenCount: number
  /** Current unseen topology count. */
  unseenCount: number
  /** Target seen topology count (includes baseline N). */
  seenTarget: number
  /** Target unseen topology count. */
  unseenTarget: number
  /** Current total selected topology count. */
  totalTopologyCount: number
  /** Pointer-down handler for card body drag logic. */
  onCardPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  /** Pointer-down handler for header drag handle. */
  onHeaderPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  /** Toggle lock/unlock state. */
  onToggleLock: () => void
  /** Update target seen topology count. */
  onSeenTargetChange: (value: number) => void
  /** Update target unseen topology count. */
  onUnseenTargetChange: (value: number) => void
  /** Opens Tab2 topology editor. */
  onOpenTopologyEditor: () => void
}

/**
 * Topology target configuration card.
 *
 * Provides Tab1-side seen/unseen target counts that Tab2 must satisfy before save.
 */
export function TopologyTargetsCard({
  position,
  isDragging,
  cardRef,
  isLocked,
  seenCount,
  unseenCount,
  seenTarget,
  unseenTarget,
  totalTopologyCount,
  onCardPointerDown,
  onHeaderPointerDown,
  onToggleLock,
  onSeenTargetChange,
  onUnseenTargetChange,
  onOpenTopologyEditor,
}: TopologyTargetsCardProps) {
  /** Prevents child controls from bubbling pointer events to drag handlers. */
  const stopPropagation = (event: SyntheticEvent<HTMLElement>) => {
    event.stopPropagation()
  }

  /** Parses numeric text input to non-negative integer target count. */
  const parseCount = (event: ChangeEvent<HTMLInputElement>) => {
    return Math.max(0, Math.floor(Number(event.target.value) || 0))
  }

  /** Updates seen target count (minimum 1 because baseline N is required). */
  const handleSeenTargetChange = (event: ChangeEvent<HTMLInputElement>) => {
    onSeenTargetChange(Math.max(1, parseCount(event)))
  }

  /** Updates unseen target count. */
  const handleUnseenTargetChange = (event: ChangeEvent<HTMLInputElement>) => {
    onUnseenTargetChange(parseCount(event))
  }

  return (
    <div
      className={`topology-target-card${isDragging ? ' dragging' : ''}`}
      ref={cardRef}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onPointerDown={onCardPointerDown}
    >
      <div
        className={`baseline-header card-drag-handle${isDragging ? ' dragging' : ''}`}
        onPointerDown={onHeaderPointerDown}
      >
        <span className="baseline-title">Topology Targets</span>
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

      <div className="topology-target-grid">
        <label className="baseline-label" htmlFor="topology-target-seen">Seen target</label>
        <input
          id="topology-target-seen"
          className="load-input"
          type="number"
          min={1}
          step={1}
          value={seenTarget}
          disabled={isLocked}
          onChange={handleSeenTargetChange}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />

        <label className="baseline-label" htmlFor="topology-target-unseen">Unseen target</label>
        <input
          id="topology-target-unseen"
          className="load-input"
          type="number"
          min={0}
          step={1}
          value={unseenTarget}
          disabled={isLocked}
          onChange={handleUnseenTargetChange}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />
      </div>

      <p className="baseline-note">
        Current: seen {seenCount}/{seenTarget}, unseen {unseenCount}/{unseenTarget}. Seen count includes baseline N.
      </p>
      <div className="topology-target-actions">
        <span className="topology-inline-summary">
          Topology set: {totalTopologyCount} (seen {seenCount}/{seenTarget} / unseen {unseenCount}/{unseenTarget})
        </span>
        <button
          className="topology-nav-btn"
          type="button"
          disabled={isLocked}
          onClick={onOpenTopologyEditor}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        >
          Open Topology Editor
        </button>
      </div>
      <p className="baseline-note">
        {isLocked
          ? 'Topology target configuration is locked to prevent accidental edits.'
          : 'Topology target configuration is unlocked for editing.'}
      </p>
      <span className="card-port card-port-input" title="Input: topology assignment summary" />
    </div>
  )
}
