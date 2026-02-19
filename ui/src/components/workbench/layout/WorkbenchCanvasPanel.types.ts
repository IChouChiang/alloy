import type { RefObject } from 'react'

import type {
  Point,
  ScaleSamplingMode,
  TopologySamplingMode,
  TopologySelectionState,
  TopologyTargetCounts,
} from '../types.ts'

/**
 * Props for the Tab1 canvas composition panel.
 *
 * This contract carries card state, positions, dimensions, and all interaction callbacks
 * needed to render and control the end-to-end card chain.
 */
export type WorkbenchCanvasPanelProps = {
  canvasRef: RefObject<HTMLDivElement | null>
  baselineRef: RefObject<HTMLDivElement | null>
  loadConfigRef: RefObject<HTMLDivElement | null>
  renewableConfigRef: RefObject<HTMLDivElement | null>
  featureConstructionRef: RefObject<HTMLDivElement | null>
  dataSplitRef: RefObject<HTMLDivElement | null>
  topologySamplingRef: RefObject<HTMLDivElement | null>
  buildRuntimeRef: RefObject<HTMLDivElement | null>
  topologyTargetsRef: RefObject<HTMLDivElement | null>
  canvasZoom: number
  canvasOffset: Point
  isCanvasPanning: boolean
  cardPos: Point
  loadCardPos: Point
  renewableCardPos: Point
  featureCardPos: Point
  splitCardPos: Point
  topologySamplingCardPos: Point
  runtimeCardPos: Point
  topologyTargetsCardPos: Point
  isDragging: boolean
  isLoadCardDragging: boolean
  isRenewableCardDragging: boolean
  isFeatureCardDragging: boolean
  isDataSplitCardDragging: boolean
  isTopologySamplingCardDragging: boolean
  isBuildRuntimeCardDragging: boolean
  isTopologyTargetsCardDragging: boolean
  selectedBasecase: string
  isBasecaseLocked: boolean
  isLoadConfigLocked: boolean
  isRenewableConfigLocked: boolean
  isFeatureConstructionLocked: boolean
  isDataSplitLocked: boolean
  isTopologySamplingLocked: boolean
  isBuildRuntimeLocked: boolean
  isTopologyTargetsLocked: boolean
  scaleSamplingMode: ScaleSamplingMode
  globalScaleMu: number
  globalScaleSigma: number
  globalScaleMin: number
  globalScaleMax: number
  scaleUniformBins: number
  nodeNoiseSigma: number
  renewablePenetrationRate: number
  renewableWindShare: number
  renewableCandidateBusCount: number
  renewableWeibullLambda: number
  renewableWeibullK: number
  renewableBetaAlpha: number
  renewableBetaBeta: number
  renewableVIn: number
  renewableVRated: number
  renewableVOut: number
  renewableGStc: number
  featureNumIterations: number
  splitTrain: number
  splitVal: number
  splitTestSeen: number
  splitTestUnseen: number
  topologySamplingSeenMode: TopologySamplingMode
  topologySamplingUnseenMode: TopologySamplingMode
  runtimeSeed: number
  runtimeNumWorkers: number
  runtimeChunkSize: number
  runtimeMaxAttemptMultiplier: number
  topologySelection: TopologySelectionState
  topologyTargets: TopologyTargetCounts
  basecases: readonly string[]
  caseCardWidth: number
  loadCardWidth: number
  renewableCardWidth: number
  featureCardWidth: number
  splitCardWidth: number
  topologySamplingCardWidth: number
  runtimeCardWidth: number
  baselineHeight: number
  loadHeight: number
  renewableHeight: number
  featureHeight: number
  splitHeight: number
  topologySamplingHeight: number
  runtimeHeight: number
  topologyTargetsHeight: number
  onShowTopologyTab: () => void
  onWheel: (event: React.WheelEvent<HTMLDivElement>) => void
  onCanvasPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onCanvasPointerMove: (event: React.PointerEvent<HTMLDivElement>) => void
  onCanvasPointerUp: (event: React.PointerEvent<HTMLDivElement>) => void
  onZoomOut: () => void
  onZoomIn: () => void
  onCenterAt100: () => void
  onFitView: () => void
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
  onRenewableWindShareChange: (value: number) => void
  onRenewableCandidateBusCountChange: (value: number) => void
  onRenewableWeibullLambdaChange: (value: number) => void
  onRenewableWeibullKChange: (value: number) => void
  onRenewableBetaAlphaChange: (value: number) => void
  onRenewableBetaBetaChange: (value: number) => void
  onRenewableVInChange: (value: number) => void
  onRenewableVRatedChange: (value: number) => void
  onRenewableVOutChange: (value: number) => void
  onRenewableGStcChange: (value: number) => void
  onRenewableCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onRenewableHeaderPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onToggleRenewableConfigLock: () => void
  onFeatureCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onFeatureHeaderPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onToggleFeatureConstructionLock: () => void
  onFeatureNumIterationsChange: (value: number) => void
  onDataSplitCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onDataSplitHeaderPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onToggleDataSplitLock: () => void
  onSplitTrainChange: (value: number) => void
  onSplitValChange: (value: number) => void
  onSplitTestSeenChange: (value: number) => void
  onSplitTestUnseenChange: (value: number) => void
  onTopologySamplingCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onTopologySamplingHeaderPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onToggleTopologySamplingLock: () => void
  onTopologySamplingSeenModeChange: (value: TopologySamplingMode) => void
  onTopologySamplingUnseenModeChange: (value: TopologySamplingMode) => void
  onBuildRuntimeCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onBuildRuntimeHeaderPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onToggleBuildRuntimeLock: () => void
  onRuntimeSeedChange: (value: number) => void
  onRuntimeNumWorkersChange: (value: number) => void
  onRuntimeChunkSizeChange: (value: number) => void
  onRuntimeMaxAttemptMultiplierChange: (value: number) => void
  onTopologyTargetSeenChange: (value: number) => void
  onTopologyTargetUnseenChange: (value: number) => void
  onTopologyTargetsCardPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onTopologyTargetsHeaderPointerDown: (event: React.PointerEvent<HTMLDivElement>) => void
  onToggleTopologyTargetsLock: () => void
}