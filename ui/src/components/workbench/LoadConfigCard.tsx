import type { PointerEvent, RefObject, SyntheticEvent } from 'react'

import { LockIcon } from './LockIcon'
import type { Point, ScaleSamplingMode } from './types'

type LoadConfigCardProps = {
  position: Point
  isDragging: boolean
  cardRef: RefObject<HTMLDivElement | null>
  isLocked: boolean
  scaleSamplingMode: ScaleSamplingMode
  globalScaleMu: number
  globalScaleSigma: number
  globalScaleMin: number
  globalScaleMax: number
  scaleUniformBins: number
  nodeNoiseSigma: number
  onCardPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onHeaderPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  onToggleLock: () => void
  onModeChange: (mode: ScaleSamplingMode) => void
  onGlobalScaleMuChange: (value: number) => void
  onGlobalScaleSigmaChange: (value: number) => void
  onGlobalScaleMinChange: (value: number) => void
  onGlobalScaleMaxChange: (value: number) => void
  onScaleUniformBinsChange: (value: number) => void
  onNodeNoiseSigmaChange: (value: number) => void
}

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
  const stopPropagation = (event: SyntheticEvent<HTMLElement>) => {
    event.stopPropagation()
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
          onChange={(event) => onGlobalScaleMinChange(Number(event.target.value))}
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
          onChange={(event) => onGlobalScaleMaxChange(Number(event.target.value))}
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
          onChange={(event) => onModeChange(event.target.value as ScaleSamplingMode)}
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
              onChange={(event) => onGlobalScaleMuChange(Number(event.target.value))}
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
              onChange={(event) => onGlobalScaleSigmaChange(Number(event.target.value))}
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
              onChange={(event) => onScaleUniformBinsChange(Number(event.target.value))}
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
          onChange={(event) => onNodeNoiseSigmaChange(Number(event.target.value))}
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
