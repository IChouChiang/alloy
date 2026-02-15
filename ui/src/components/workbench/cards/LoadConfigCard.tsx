import type { ChangeEvent, PointerEvent, RefObject, SyntheticEvent } from 'react'

import type { Point, ScaleSamplingMode } from '../types'
import { LockIcon } from './LockIcon'

/** Props for the Load Config card. */
type LoadConfigCardProps = {
  /** Card position in canvas/world coordinates. */
  position: Point
  /** Whether the card is currently being dragged. */
  isDragging: boolean
  /** Ref to card root for size/position measurement. */
  cardRef: RefObject<HTMLDivElement | null>
  /** Whether card controls are locked for editing. */
  isLocked: boolean
  /** Selected global-scale sampling strategy. */
  scaleSamplingMode: ScaleSamplingMode
  /** Mean μ for truncated-normal strategy. */
  globalScaleMu: number
  /** Std-dev σ for truncated-normal strategy. */
  globalScaleSigma: number
  /** Lower bound g_min for global load scale. */
  globalScaleMin: number
  /** Upper bound g_max for global load scale. */
  globalScaleMax: number
  /** Bin count for uniform-bins strategy. */
  scaleUniformBins: number
  /** Per-node Gaussian noise σ. */
  nodeNoiseSigma: number
  /** Pointer-down handler for card body drag logic. */
  onCardPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  /** Pointer-down handler for header drag handle. */
  onHeaderPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  /** Toggle lock/unlock state. */
  onToggleLock: () => void
  /** Update sampling mode. */
  onModeChange: (mode: ScaleSamplingMode) => void
  /** Update μ. */
  onGlobalScaleMuChange: (value: number) => void
  /** Update σ. */
  onGlobalScaleSigmaChange: (value: number) => void
  /** Update g_min. */
  onGlobalScaleMinChange: (value: number) => void
  /** Update g_max. */
  onGlobalScaleMaxChange: (value: number) => void
  /** Update uniform bin count. */
  onScaleUniformBinsChange: (value: number) => void
  /** Update node noise σ. */
  onNodeNoiseSigmaChange: (value: number) => void
}

/**
 * Load configuration card.
 *
 * Encapsulates the two-stage load setup: bounds first, then sampling strategy.
 */
export function LoadConfigCard({
  position,
  isDragging,
  cardRef,
  isLocked,
  scaleSamplingMode,
  globalScaleMu,
  globalScaleSigma,
  globalScaleMin,
  globalScaleMax,
  scaleUniformBins,
  nodeNoiseSigma,
  onCardPointerDown,
  onHeaderPointerDown,
  onToggleLock,
  onModeChange,
  onGlobalScaleMuChange,
  onGlobalScaleSigmaChange,
  onGlobalScaleMinChange,
  onGlobalScaleMaxChange,
  onScaleUniformBinsChange,
  onNodeNoiseSigmaChange,
}: LoadConfigCardProps) {
  /** Prevents child controls from bubbling pointer events to drag handlers. */
  const stopPropagation = (event: SyntheticEvent<HTMLElement>) => {
    event.stopPropagation()
  }

  /** Converts numeric input field text to number for parent state updates. */
  const parseNumericValue = (event: ChangeEvent<HTMLInputElement>) => {
    return Number(event.target.value)
  }

  /** Updates lower bound g_min. */
  const handleGlobalScaleMinChange = (event: ChangeEvent<HTMLInputElement>) => {
    onGlobalScaleMinChange(parseNumericValue(event))
  }

  /** Updates upper bound g_max. */
  const handleGlobalScaleMaxChange = (event: ChangeEvent<HTMLInputElement>) => {
    onGlobalScaleMaxChange(parseNumericValue(event))
  }

  /** Updates sampling strategy mode. */
  const handleScaleModeChange = (event: ChangeEvent<HTMLSelectElement>) => {
    onModeChange(event.target.value as ScaleSamplingMode)
  }

  /** Updates truncated-normal mean μ. */
  const handleGlobalScaleMuChange = (event: ChangeEvent<HTMLInputElement>) => {
    onGlobalScaleMuChange(parseNumericValue(event))
  }

  /** Updates truncated-normal std-dev σ. */
  const handleGlobalScaleSigmaChange = (event: ChangeEvent<HTMLInputElement>) => {
    onGlobalScaleSigmaChange(parseNumericValue(event))
  }

  /** Updates uniform bin count. */
  const handleScaleUniformBinsChange = (event: ChangeEvent<HTMLInputElement>) => {
    onScaleUniformBinsChange(parseNumericValue(event))
  }

  /** Updates node-level noise σ. */
  const handleNodeNoiseSigmaChange = (event: ChangeEvent<HTMLInputElement>) => {
    onNodeNoiseSigmaChange(parseNumericValue(event))
  }

  return (
    <div
      className={`load-config-card${isDragging ? ' dragging' : ''}`}
      ref={cardRef}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onPointerDown={onCardPointerDown}
    >
      <div
        className={`baseline-header card-drag-handle${isDragging ? ' dragging' : ''}`}
        onPointerDown={onHeaderPointerDown}
      >
        <span className="baseline-title">Load Config</span>
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

      <div className="load-config-grid">
        <span className="load-section-title">Bounds</span>
        <span className="load-section-spacer" />

        <label className="baseline-label" htmlFor="global-scale-min">Lower bound (g_min)</label>
        <input
          id="global-scale-min"
          className="load-input"
          type="number"
          step="0.01"
          value={globalScaleMin}
          disabled={isLocked}
          onChange={handleGlobalScaleMinChange}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />

        <label className="baseline-label" htmlFor="global-scale-max">Upper bound (g_max)</label>
        <input
          id="global-scale-max"
          className="load-input"
          type="number"
          step="0.01"
          value={globalScaleMax}
          disabled={isLocked}
          onChange={handleGlobalScaleMaxChange}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />

        <span className="load-bounds-hint">Global load factor g is clipped to [g_min, g_max], e.g. 0.5-1.5 means 50%-150% of base load.</span>
        <span className="load-section-spacer" />

        <span className="load-strategy-hint">
          {scaleSamplingMode === 'truncated_normal'
            ? 'Truncated normal: sample g~N(μ,σ), reject values outside [g_min, g_max].'
            : scaleSamplingMode === 'uniform_bins'
              ? 'Uniform bins: split [g_min, g_max] into bins, cycle bins, then uniformly sample within selected bin.'
              : 'Bounded uniform: directly sample g uniformly in [g_min, g_max].'}
        </span>
        <span className="load-section-spacer" />

        <span className="load-section-title">Strategy</span>
        <span className="load-section-spacer" />

        <label className="baseline-label" htmlFor="scale-mode-select">Mode</label>
        <select
          id="scale-mode-select"
          className="baseline-select"
          value={scaleSamplingMode}
          disabled={isLocked}
          onChange={handleScaleModeChange}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        >
          <option value="truncated_normal">truncated_normal</option>
          <option value="uniform_bins">uniform_bins</option>
          <option value="bounded_uniform">bounded_uniform</option>
        </select>

        {scaleSamplingMode === 'truncated_normal' ? (
          <>
            <label className="baseline-label" htmlFor="global-scale-mu">Global μ</label>
            <input
              id="global-scale-mu"
              className="load-input"
              type="number"
              step="0.01"
              value={globalScaleMu}
              disabled={isLocked}
              onChange={handleGlobalScaleMuChange}
              onPointerDown={stopPropagation}
              onMouseDown={stopPropagation}
            />

            <label className="baseline-label" htmlFor="global-scale-sigma">Global σ</label>
            <input
              id="global-scale-sigma"
              className="load-input"
              type="number"
              step="0.01"
              min="0"
              value={globalScaleSigma}
              disabled={isLocked}
              onChange={handleGlobalScaleSigmaChange}
              onPointerDown={stopPropagation}
              onMouseDown={stopPropagation}
            />
          </>
        ) : null}

        {scaleSamplingMode === 'uniform_bins' ? (
          <>
            <label className="baseline-label" htmlFor="uniform-bins">Uniform bins</label>
            <input
              id="uniform-bins"
              className="load-input"
              type="number"
              step="1"
              min="1"
              value={scaleUniformBins}
              disabled={isLocked}
              onChange={handleScaleUniformBinsChange}
              onPointerDown={stopPropagation}
              onMouseDown={stopPropagation}
            />
          </>
        ) : null}

        <label className="baseline-label" htmlFor="node-noise-sigma">Node noise σ</label>
        <input
          id="node-noise-sigma"
          className="load-input"
          type="number"
          step="0.01"
          min="0"
          value={nodeNoiseSigma}
          disabled={isLocked}
          onChange={handleNodeNoiseSigmaChange}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />
      </div>

      <p className="baseline-note">Current process: define bounds first, then apply selected strategy.</p>
      {/* TODO(alloy-ui): wire Load Config state to backend DatasetBuildConfig/SampleGenerationConfig payload. */}
      {/* TODO(alloy-ui): add inline validation for min<max, sigma>0, and bins>=1 with field-level hints. */}
      {/* TODO(alloy-ui): backend currently supports truncated_normal/uniform_bins; add bounded_uniform policy in sample_generation.py. */}
      <span className="card-port card-port-input" title="Input: basecase context" />
    </div>
  )
}
