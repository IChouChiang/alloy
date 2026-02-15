import type { RefObject } from 'react'

import { CaseSelectCard } from '../cards/CaseSelectCard'
import { LoadConfigCard } from '../cards/LoadConfigCard'
import type { Point, ScaleSamplingMode, TopologySelectionState } from '../types'
import { CanvasToolbar } from './CanvasToolbar'

type WorkbenchCanvasPanelProps = {
  canvasRef: RefObject<HTMLDivElement | null>
  baselineRef: RefObject<HTMLDivElement | null>
  loadConfigRef: RefObject<HTMLDivElement | null>
  canvasZoom: number
  canvasOffset: Point
  isCanvasPanning: boolean
  cardPos: Point
  loadCardPos: Point
  isDragging: boolean
  isLoadCardDragging: boolean
  selectedBasecase: string
  isBasecaseLocked: boolean
  isLoadConfigLocked: boolean
  scaleSamplingMode: ScaleSamplingMode
  globalScaleMu: number
  globalScaleSigma: number
  globalScaleMin: number
  globalScaleMax: number
  scaleUniformBins: number
  nodeNoiseSigma: number
  topologySelection: TopologySelectionState
  basecases: readonly string[]
  caseCardWidth: number
  loadCardWidth: number
  baselineHeight: number
  loadHeight: number
  onShowTopologyTab: () => void
  onWheel: (event: React.WheelEvent<HTMLDivElement>) => void
  onCanvasPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onCanvasPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void
  onCanvasPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void
  onZoomOut: () => void
  onZoomIn: () => void
  onCenterAt100: () => void
  onBaselineCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onBaselineHeaderPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onToggleBasecaseLock: () => void
  onChangeBasecase: (value: string) => void
  onLoadCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onLoadHeaderPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onToggleLoadConfigLock: () => void
  onScaleSamplingModeChange: (value: ScaleSamplingMode) => void
  onGlobalScaleMuChange: (value: number) => void
  onGlobalScaleSigmaChange: (value: number) => void
  onGlobalScaleMinChange: (value: number) => void
  onGlobalScaleMaxChange: (value: number) => void
  onScaleUniformBinsChange: (value: number) => void
  onNodeNoiseSigmaChange: (value: number) => void
}

/**
 * Center canvas panel that renders linked workbench cards and toolbar controls.
 *
 * Args:
 *   props: Canvas view model and interaction handlers from app orchestration layer.
 *
 * Returns:
 *   Rendered center canvas panel.
 */
export function WorkbenchCanvasPanel(props: WorkbenchCanvasPanelProps) {
  const baselineOutputPort = {
    x: props.cardPos.x + props.caseCardWidth,
    y: props.cardPos.y + props.baselineHeight / 2,
  }
  const loadInputPort = {
    x: props.loadCardPos.x,
    y: props.loadCardPos.y + props.loadHeight / 2,
  }

  return (
    <div className="panel-shell canvas-shell">
      <div className="panel-title panel-title-row">
        <span>Center Canvas (UI Shell)</span>
        <div className="panel-title-actions">
          <span className="topology-inline-summary">
            Topology set: {props.topologySelection.specs.length} (seen {props.topologySelection.seenTopologyIds.length} / unseen {props.topologySelection.unseenTopologyIds.length})
          </span>
          <button className="topology-nav-btn" type="button" onClick={props.onShowTopologyTab}>
            Open Topology Editor
          </button>
        </div>
      </div>
      <div
        className={`canvas-placeholder${props.isCanvasPanning ? ' panning' : ''}`}
        ref={props.canvasRef}
        onWheel={props.onWheel}
        onPointerDown={props.onCanvasPointerDown}
        onPointerMove={props.onCanvasPointerMove}
        onPointerUp={props.onCanvasPointerUp}
        onPointerCancel={props.onCanvasPointerUp}
      >
        <CanvasToolbar
          zoomPercent={Math.round(props.canvasZoom * 100)}
          onZoomOut={props.onZoomOut}
          onZoomIn={props.onZoomIn}
          onCenterAt100={props.onCenterAt100}
        />
        <div
          className="canvas-content"
          style={{ transform: `translate(${props.canvasOffset.x}px, ${props.canvasOffset.y}px) scale(${props.canvasZoom})` }}
        >
          <svg className="canvas-links" aria-hidden="true">
            <line
              x1={baselineOutputPort.x}
              y1={baselineOutputPort.y}
              x2={loadInputPort.x}
              y2={loadInputPort.y}
              className="canvas-link-line"
            />
          </svg>
          <CaseSelectCard
            position={props.cardPos}
            isDragging={props.isDragging}
            cardRef={props.baselineRef}
            selectedBasecase={props.selectedBasecase}
            isLocked={props.isBasecaseLocked}
            basecases={props.basecases}
            onCardPointerDown={props.onBaselineCardPointerDown}
            onHeaderPointerDown={props.onBaselineHeaderPointerDown}
            onToggleLock={props.onToggleBasecaseLock}
            onChangeBasecase={props.onChangeBasecase}
          />
          <LoadConfigCard
            position={props.loadCardPos}
            isDragging={props.isLoadCardDragging}
            cardRef={props.loadConfigRef}
            isLocked={props.isLoadConfigLocked}
            scaleSamplingMode={props.scaleSamplingMode}
            globalScaleMu={props.globalScaleMu}
            globalScaleSigma={props.globalScaleSigma}
            globalScaleMin={props.globalScaleMin}
            globalScaleMax={props.globalScaleMax}
            scaleUniformBins={props.scaleUniformBins}
            nodeNoiseSigma={props.nodeNoiseSigma}
            onCardPointerDown={props.onLoadCardPointerDown}
            onHeaderPointerDown={props.onLoadHeaderPointerDown}
            onToggleLock={props.onToggleLoadConfigLock}
            onModeChange={props.onScaleSamplingModeChange}
            onGlobalScaleMuChange={props.onGlobalScaleMuChange}
            onGlobalScaleSigmaChange={props.onGlobalScaleSigmaChange}
            onGlobalScaleMinChange={props.onGlobalScaleMinChange}
            onGlobalScaleMaxChange={props.onGlobalScaleMaxChange}
            onScaleUniformBinsChange={props.onScaleUniformBinsChange}
            onNodeNoiseSigmaChange={props.onNodeNoiseSigmaChange}
          />
        </div>
      </div>
    </div>
  )
}
