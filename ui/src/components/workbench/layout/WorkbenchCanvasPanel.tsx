import type { RefObject } from 'react'

import { CaseSelectCard } from '../cards/CaseSelectCard'
import { LoadConfigCard } from '../cards/LoadConfigCard'
import { TopologyTargetsCard } from '../cards/TopologyTargetsCard'
import type {
  Point,
  ScaleSamplingMode,
  TopologySelectionState,
  TopologyTargetCounts,
} from '../types'
import { CanvasToolbar } from './CanvasToolbar'

type WorkbenchCanvasPanelProps = {
  canvasRef: RefObject<HTMLDivElement | null>
  baselineRef: RefObject<HTMLDivElement | null>
  loadConfigRef: RefObject<HTMLDivElement | null>
  topologyTargetsRef: RefObject<HTMLDivElement | null>
  canvasZoom: number
  canvasOffset: Point
  isCanvasPanning: boolean
  cardPos: Point
  loadCardPos: Point
  topologyTargetsCardPos: Point
  isDragging: boolean
  isLoadCardDragging: boolean
  isTopologyTargetsCardDragging: boolean
  selectedBasecase: string
  isBasecaseLocked: boolean
  isLoadConfigLocked: boolean
  isTopologyTargetsLocked: boolean
  scaleSamplingMode: ScaleSamplingMode
  globalScaleMu: number
  globalScaleSigma: number
  globalScaleMin: number
  globalScaleMax: number
  scaleUniformBins: number
  nodeNoiseSigma: number
  topologySelection: TopologySelectionState
  topologyTargets: TopologyTargetCounts
  basecases: readonly string[]
  caseCardWidth: number
  loadCardWidth: number
  baselineHeight: number
  loadHeight: number
  topologyTargetsHeight: number
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
  onTopologyTargetSeenChange: (value: number) => void
  onTopologyTargetUnseenChange: (value: number) => void
  onTopologyTargetsCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onTopologyTargetsHeaderPointerDown: (
    event: React.PointerEvent<HTMLDivElement>,
  ) => void
  onToggleTopologyTargetsLock: () => void
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
  const portCenterXOffset = 1
  const baselineOutputPort = {
    x: props.cardPos.x + props.caseCardWidth + portCenterXOffset,
    y: props.cardPos.y + props.baselineHeight / 2,
  }
  const loadInputPort = {
    x: props.loadCardPos.x - portCenterXOffset,
    y: props.loadCardPos.y + props.loadHeight / 2,
  }
  const loadOutputPort = {
    x: props.loadCardPos.x + props.loadCardWidth + portCenterXOffset,
    y: props.loadCardPos.y + props.loadHeight / 2,
  }
  const topologyTargetsInputPort = {
    x: props.topologyTargetsCardPos.x - portCenterXOffset,
    y: props.topologyTargetsCardPos.y + props.topologyTargetsHeight / 2,
  }

  return (
    <div className="panel-shell canvas-shell">
      <div className="panel-title">Center Canvas (UI Shell)</div>
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
            <line
              x1={loadOutputPort.x}
              y1={loadOutputPort.y}
              x2={topologyTargetsInputPort.x}
              y2={topologyTargetsInputPort.y}
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
          <TopologyTargetsCard
            position={props.topologyTargetsCardPos}
            isDragging={props.isTopologyTargetsCardDragging}
            cardRef={props.topologyTargetsRef}
            isLocked={props.isTopologyTargetsLocked}
            seenCount={props.topologySelection.seenTopologyIds.length}
            unseenCount={props.topologySelection.unseenTopologyIds.length}
            seenTarget={props.topologyTargets.seen}
            unseenTarget={props.topologyTargets.unseen}
            totalTopologyCount={props.topologySelection.specs.length}
            onCardPointerDown={props.onTopologyTargetsCardPointerDown}
            onHeaderPointerDown={props.onTopologyTargetsHeaderPointerDown}
            onToggleLock={props.onToggleTopologyTargetsLock}
            onSeenTargetChange={props.onTopologyTargetSeenChange}
            onUnseenTargetChange={props.onTopologyTargetUnseenChange}
            onOpenTopologyEditor={props.onShowTopologyTab}
          />
        </div>
      </div>
    </div>
  )
}
