import type { ChangeEvent, PointerEvent, RefObject, SyntheticEvent } from 'react'

import type { Point } from '../types.ts'
import { LockIcon } from './LockIcon.tsx'

/** Props for renewable-configuration card. */
type RenewableConfigCardProps = {
  /** Card position in canvas/world coordinates. */
  position: Point
  /** Whether the card is currently being dragged. */
  isDragging: boolean
  /** Ref to card root for size/position measurement. */
  cardRef: RefObject<HTMLDivElement | null>
  /** Whether card controls are locked for editing. */
  isLocked: boolean
  /** Renewable penetration ratio η. */
  penetrationRate: number
  /** Wind share ratio in total renewable power. */
  windShare: number
  /** Number of buses selected for renewable connection. */
  candidateBusCount: number
  /** Weibull scale parameter λ for wind speed. */
  weibullLambda: number
  /** Weibull shape parameter k for wind speed. */
  weibullK: number
  /** Beta alpha parameter for solar irradiance. */
  betaAlpha: number
  /** Beta beta parameter for solar irradiance. */
  betaBeta: number
  /** Wind cut-in speed (m/s). */
  vIn: number
  /** Wind rated speed (m/s). */
  vRated: number
  /** Wind cut-out speed (m/s). */
  vOut: number
  /** Standard irradiance for PV conversion (W/m^2). */
  gStc: number
  /** Pointer-down handler for card body drag logic. */
  onCardPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  /** Pointer-down handler for header drag handle. */
  onHeaderPointerDown: (event: PointerEvent<HTMLDivElement>) => void
  /** Toggle lock/unlock state. */
  onToggleLock: () => void
  /** Update wind share ratio. */
  onWindShareChange: (value: number) => void
  /** Update selected candidate bus count. */
  onCandidateBusCountChange: (value: number) => void
  /** Update Weibull scale parameter λ. */
  onWeibullLambdaChange: (value: number) => void
  /** Update Weibull shape parameter k. */
  onWeibullKChange: (value: number) => void
  /** Update Beta alpha parameter. */
  onBetaAlphaChange: (value: number) => void
  /** Update Beta beta parameter. */
  onBetaBetaChange: (value: number) => void
  /** Update wind cut-in speed. */
  onVInChange: (value: number) => void
  /** Update wind rated speed. */
  onVRatedChange: (value: number) => void
  /** Update wind cut-out speed. */
  onVOutChange: (value: number) => void
  /** Update PV standard irradiance. */
  onGStcChange: (value: number) => void
}

/**
 * Renewable configuration card.
 *
 * This MVP card captures the key renewable knobs needed by sample generation.
 */
export function RenewableConfigCard({
  position,
  isDragging,
  cardRef,
  isLocked,
  penetrationRate,
  windShare,
  candidateBusCount,
  weibullLambda,
  weibullK,
  betaAlpha,
  betaBeta,
  vIn,
  vRated,
  vOut,
  gStc,
  onCardPointerDown,
  onHeaderPointerDown,
  onToggleLock,
  onWindShareChange,
  onCandidateBusCountChange,
  onWeibullLambdaChange,
  onWeibullKChange,
  onBetaAlphaChange,
  onBetaBetaChange,
  onVInChange,
  onVRatedChange,
  onVOutChange,
  onGStcChange,
}: RenewableConfigCardProps) {
  const solarShare = Math.max(0, 1 - windShare)

  /** Prevents child controls from bubbling pointer events to drag handlers. */
  const stopPropagation = (event: SyntheticEvent<HTMLElement>) => {
    event.stopPropagation()
  }

  /** Converts numeric input field text to number for parent state updates. */
  const parseNumericValue = (event: ChangeEvent<HTMLInputElement>) => {
    return Number(event.target.value)
  }

  /** Updates wind share ratio and keeps it in [0, 1]. */
  const handleWindShareChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = parseNumericValue(event)
    onWindShareChange(Math.max(0, Math.min(1, next)))
  }

  /** Updates renewable candidate bus count with non-negative integer constraint. */
  const handleCandidateBusCountChange = (event: ChangeEvent<HTMLInputElement>) => {
    const next = Math.max(0, Math.floor(parseNumericValue(event) || 0))
    onCandidateBusCountChange(next)
  }

  /** Updates Weibull scale parameter λ. */
  const handleWeibullLambdaChange = (event: ChangeEvent<HTMLInputElement>) => {
    onWeibullLambdaChange(parseNumericValue(event))
  }

  /** Updates Weibull shape parameter k. */
  const handleWeibullKChange = (event: ChangeEvent<HTMLInputElement>) => {
    onWeibullKChange(parseNumericValue(event))
  }

  /** Updates Beta alpha parameter. */
  const handleBetaAlphaChange = (event: ChangeEvent<HTMLInputElement>) => {
    onBetaAlphaChange(parseNumericValue(event))
  }

  /** Updates Beta beta parameter. */
  const handleBetaBetaChange = (event: ChangeEvent<HTMLInputElement>) => {
    onBetaBetaChange(parseNumericValue(event))
  }

  /** Updates wind cut-in speed. */
  const handleVInChange = (event: ChangeEvent<HTMLInputElement>) => {
    onVInChange(parseNumericValue(event))
  }

  /** Updates wind rated speed. */
  const handleVRatedChange = (event: ChangeEvent<HTMLInputElement>) => {
    onVRatedChange(parseNumericValue(event))
  }

  /** Updates wind cut-out speed. */
  const handleVOutChange = (event: ChangeEvent<HTMLInputElement>) => {
    onVOutChange(parseNumericValue(event))
  }

  /** Updates PV standard irradiance. */
  const handleGStcChange = (event: ChangeEvent<HTMLInputElement>) => {
    onGStcChange(parseNumericValue(event))
  }

  return (
    <div
      className={`renewable-config-card${isDragging ? ' dragging' : ''}`}
      ref={cardRef}
      style={{ left: `${position.x}px`, top: `${position.y}px` }}
      onPointerDown={onCardPointerDown}
    >
      <div
        className={`baseline-header card-drag-handle${isDragging ? ' dragging' : ''}`}
        onPointerDown={onHeaderPointerDown}
      >
        <span className="baseline-title">Renewable Config</span>
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

      <div className="renewable-config-grid">
        <label className="baseline-label" htmlFor="renewable-penetration">Penetration η</label>
        <input
          id="renewable-penetration"
          className="load-input"
          type="number"
          min="0"
          step="0.01"
          value={Number(penetrationRate.toFixed(4))}
          disabled
          readOnly
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />

        <label className="baseline-label" htmlFor="renewable-wind-share">Wind share</label>
        <input
          id="renewable-wind-share"
          className="load-input"
          type="number"
          min="0"
          max="1"
          step="0.01"
          value={windShare}
          disabled={isLocked}
          onChange={handleWindShareChange}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />

        <span className="baseline-label">Solar share</span>
        <span className="baseline-value">{solarShare.toFixed(2)}</span>

        <label className="baseline-label" htmlFor="renewable-candidate-buses">Candidate buses (K)</label>
        <input
          id="renewable-candidate-buses"
          className="load-input"
          type="number"
          min="0"
          step="1"
          value={candidateBusCount}
          disabled={isLocked}
          onChange={handleCandidateBusCountChange}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />

        <span className="load-section-spacer" />
        <span className="load-section-title">Wind Weibull</span>

        <label className="baseline-label" htmlFor="renewable-weibull-lambda">Weibull λ</label>
        <input
          id="renewable-weibull-lambda"
          className="load-input"
          type="number"
          step="0.001"
          min="0"
          value={weibullLambda}
          disabled={isLocked}
          onChange={handleWeibullLambdaChange}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />

        <label className="baseline-label" htmlFor="renewable-weibull-k">Weibull k</label>
        <input
          id="renewable-weibull-k"
          className="load-input"
          type="number"
          step="0.001"
          min="0"
          value={weibullK}
          disabled={isLocked}
          onChange={handleWeibullKChange}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />

        <span className="load-section-spacer" />
        <span className="load-section-title">Solar Beta</span>

        <label className="baseline-label" htmlFor="renewable-beta-alpha">Beta α</label>
        <input
          id="renewable-beta-alpha"
          className="load-input"
          type="number"
          step="0.001"
          min="0"
          value={betaAlpha}
          disabled={isLocked}
          onChange={handleBetaAlphaChange}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />

        <label className="baseline-label" htmlFor="renewable-beta-beta">Beta β</label>
        <input
          id="renewable-beta-beta"
          className="load-input"
          type="number"
          step="0.001"
          min="0"
          value={betaBeta}
          disabled={isLocked}
          onChange={handleBetaBetaChange}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />

        <span className="load-section-spacer" />
        <span className="load-section-title">Wind Curve / PV Base</span>

        <label className="baseline-label" htmlFor="renewable-vin">v_in (m/s)</label>
        <input
          id="renewable-vin"
          className="load-input"
          type="number"
          step="0.1"
          min="0"
          value={vIn}
          disabled={isLocked}
          onChange={handleVInChange}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />

        <label className="baseline-label" htmlFor="renewable-vrated">v_rated (m/s)</label>
        <input
          id="renewable-vrated"
          className="load-input"
          type="number"
          step="0.1"
          min="0"
          value={vRated}
          disabled={isLocked}
          onChange={handleVRatedChange}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />

        <label className="baseline-label" htmlFor="renewable-vout">v_out (m/s)</label>
        <input
          id="renewable-vout"
          className="load-input"
          type="number"
          step="0.1"
          min="0"
          value={vOut}
          disabled={isLocked}
          onChange={handleVOutChange}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />

        <label className="baseline-label" htmlFor="renewable-gstc">G_stc (W/m²)</label>
        <input
          id="renewable-gstc"
          className="load-input"
          type="number"
          step="1"
          min="0"
          value={gStc}
          disabled={isLocked}
          onChange={handleGStcChange}
          onPointerDown={stopPropagation}
          onMouseDown={stopPropagation}
        />
      </div>

      <p className="baseline-note">
        Wind/solar split is configured as wind share and its complement (solar = 1 - wind).
      </p>
      {/* TODO(alloy-ui): map renewable config state into backend SampleGenerationConfig and provider-specific payload. */}
      {/* TODO(alloy-ui): add field-level validation and warnings for invalid penetration/share ranges. */}
      <span className="card-port card-port-input" title="Input: load sampling context" />
      <span className="card-port card-port-output" title="Output: renewable sampling config" />
    </div>
  )
}
