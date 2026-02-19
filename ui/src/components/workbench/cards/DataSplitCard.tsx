import type { ChangeEvent, PointerEvent, RefObject, SyntheticEvent } from 'react'

import type { Point } from '../types.ts'
import { LockIcon } from './LockIcon.tsx'

/** Props for Data Split card. */
type DataSplitCardProps = {
  position: Point
  isDragging: boolean
  cardRef: RefObject<HTMLDivElement | null>
  isLocked: boolean
  trainCount: number
  valCount: number
  testSeenCount: number
  testUnseenCount: number
  onCardPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onHeaderPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onToggleLock: () => void
  onTrainCountChange: (value: number) => void
  onValCountChange: (value: number) => void
  onTestSeenCountChange: (value: number) => void
  onTestUnseenCountChange: (value: number) => void
}

/** Data-split card for train/val/test split sample counts. */
export function DataSplitCard({
  position,
  isDragging,
  cardRef,
  isLocked,
  trainCount,
  valCount,
  testSeenCount,
  testUnseenCount,
  onCardPointerDown,
  onHeaderPointerDown,
  onToggleLock,
  onTrainCountChange,
  onValCountChange,
  onTestSeenCountChange,
  onTestUnseenCountChange,
}: DataSplitCardProps) {
  const stopPropagation = (event: SyntheticEvent<HTMLElement>) => {
    event.stopPropagation()
  }

  const parseCount = (event: ChangeEvent<HTMLInputElement>) => {
    return Math.max(1, Math.floor(Number(event.target.value) || 1))
  }

  return (
    <div
      className={`split-card${isDragging ? ' dragging' : ''}`}
      ref={cardRef}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onPointerDown={onCardPointerDown}
    >
      <div
        className={`baseline-header card-drag-handle${isDragging ? ' dragging' : ''}`}
        onPointerDown={onHeaderPointerDown}
      >
        <span className="baseline-title">Data Split</span>
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
        <label className="baseline-label" htmlFor="split-train">train</label>
        <input
          id="split-train"
          className="load-input"
          type="number"
          min={1}
          step={100}
          value={trainCount}
          disabled={isLocked}
          onChange={(event) => onTrainCountChange(parseCount(event))}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />

        <label className="baseline-label" htmlFor="split-val">val</label>
        <input
          id="split-val"
          className="load-input"
          type="number"
          min={1}
          step={100}
          value={valCount}
          disabled={isLocked}
          onChange={(event) => onValCountChange(parseCount(event))}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />

        <label className="baseline-label" htmlFor="split-test-seen">test_seen</label>
        <input
          id="split-test-seen"
          className="load-input"
          type="number"
          min={1}
          step={100}
          value={testSeenCount}
          disabled={isLocked}
          onChange={(event) => onTestSeenCountChange(parseCount(event))}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />

        <label className="baseline-label" htmlFor="split-test-unseen">test_unseen</label>
        <input
          id="split-test-unseen"
          className="load-input"
          type="number"
          min={1}
          step={100}
          value={testUnseenCount}
          disabled={isLocked}
          onChange={(event) => onTestUnseenCountChange(parseCount(event))}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />
      </div>

      <p className="baseline-note">Default values align with backend split defaults.</p>
      <span className="card-port card-port-input" title="Input: feature settings" />
      <span className="card-port card-port-output" title="Output: split config" />
    </div>
  )
}
