import { BuildRuntimeCard } from '../cards/BuildRuntimeCard.tsx'
import { CaseSelectCard } from '../cards/CaseSelectCard.tsx'
import { DataSplitCard } from '../cards/DataSplitCard.tsx'
import { FeatureConstructionCard } from '../cards/FeatureConstructionCard.tsx'
import { LoadConfigCard } from '../cards/LoadConfigCard.tsx'
import { RenewableConfigCard } from '../cards/RenewableConfigCard.tsx'
import { TopologySamplingCard } from '../cards/TopologySamplingCard.tsx'
import { TopologyTargetsCard } from '../cards/TopologyTargetsCard.tsx'
import type { Point } from '../types.ts'
import { CanvasToolbar } from './CanvasToolbar.tsx'
import type { WorkbenchCanvasPanelProps } from './WorkbenchCanvasPanel.types.ts'

/** Center canvas panel rendering all Tab1 workflow cards and links. */
export function WorkbenchCanvasPanel(props: WorkbenchCanvasPanelProps) {
  const portCenterXOffset = 1
  /** Computes vertical center of a card for link anchoring. */
  const centerY = (position: Point, height: number) => position.y + height / 2

  const points = {
    baseOut: {
      x: props.cardPos.x + props.caseCardWidth + portCenterXOffset,
      y: centerY(props.cardPos, props.baselineHeight),
    },
    loadIn: {
      x: props.loadCardPos.x - portCenterXOffset,
      y: centerY(props.loadCardPos, props.loadHeight),
    },
    loadOut: {
      x: props.loadCardPos.x + props.loadCardWidth + portCenterXOffset,
      y: centerY(props.loadCardPos, props.loadHeight),
    },
    renewableIn: {
      x: props.renewableCardPos.x - portCenterXOffset,
      y: centerY(props.renewableCardPos, props.renewableHeight),
    },
    renewableOut: {
      x: props.renewableCardPos.x + props.renewableCardWidth + portCenterXOffset,
      y: centerY(props.renewableCardPos, props.renewableHeight),
    },
    featureIn: {
      x: props.featureCardPos.x - portCenterXOffset,
      y: centerY(props.featureCardPos, props.featureHeight),
    },
    featureOut: {
      x: props.featureCardPos.x + props.featureCardWidth + portCenterXOffset,
      y: centerY(props.featureCardPos, props.featureHeight),
    },
    splitIn: {
      x: props.splitCardPos.x - portCenterXOffset,
      y: centerY(props.splitCardPos, props.splitHeight),
    },
    splitOut: {
      x: props.splitCardPos.x + props.splitCardWidth + portCenterXOffset,
      y: centerY(props.splitCardPos, props.splitHeight),
    },
    topologySamplingIn: {
      x: props.topologySamplingCardPos.x - portCenterXOffset,
      y: centerY(props.topologySamplingCardPos, props.topologySamplingHeight),
    },
    topologySamplingOut: {
      x:
        props.topologySamplingCardPos.x +
        props.topologySamplingCardWidth +
        portCenterXOffset,
      y: centerY(props.topologySamplingCardPos, props.topologySamplingHeight),
    },
    runtimeIn: {
      x: props.runtimeCardPos.x - portCenterXOffset,
      y: centerY(props.runtimeCardPos, props.runtimeHeight),
    },
    runtimeOut: {
      x: props.runtimeCardPos.x + props.runtimeCardWidth + portCenterXOffset,
      y: centerY(props.runtimeCardPos, props.runtimeHeight),
    },
    topologyTargetsIn: {
      x: props.topologyTargetsCardPos.x - portCenterXOffset,
      y: centerY(props.topologyTargetsCardPos, props.topologyTargetsHeight),
    },
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
          onFitView={props.onFitView}
        />
        <div
          className="canvas-content"
          style={{
            transform: `translate(${props.canvasOffset.x}px, ${props.canvasOffset.y}px) scale(${props.canvasZoom})`,
          }}
        >
          <svg className="canvas-links" aria-hidden="true">
            <line x1={points.baseOut.x} y1={points.baseOut.y} x2={points.loadIn.x} y2={points.loadIn.y} className="canvas-link-line" />
            <line x1={points.loadOut.x} y1={points.loadOut.y} x2={points.renewableIn.x} y2={points.renewableIn.y} className="canvas-link-line" />
            <line x1={points.renewableOut.x} y1={points.renewableOut.y} x2={points.featureIn.x} y2={points.featureIn.y} className="canvas-link-line" />
            <line x1={points.featureOut.x} y1={points.featureOut.y} x2={points.splitIn.x} y2={points.splitIn.y} className="canvas-link-line" />
            <line x1={points.splitOut.x} y1={points.splitOut.y} x2={points.topologySamplingIn.x} y2={points.topologySamplingIn.y} className="canvas-link-line" />
            <line x1={points.topologySamplingOut.x} y1={points.topologySamplingOut.y} x2={points.runtimeIn.x} y2={points.runtimeIn.y} className="canvas-link-line" />
            <line x1={points.runtimeOut.x} y1={points.runtimeOut.y} x2={points.topologyTargetsIn.x} y2={points.topologyTargetsIn.y} className="canvas-link-line" />
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

          <RenewableConfigCard
            position={props.renewableCardPos}
            isDragging={props.isRenewableCardDragging}
            cardRef={props.renewableConfigRef}
            isLocked={props.isRenewableConfigLocked}
            penetrationRate={props.renewablePenetrationRate}
            windShare={props.renewableWindShare}
            candidateBusCount={props.renewableCandidateBusCount}
            weibullLambda={props.renewableWeibullLambda}
            weibullK={props.renewableWeibullK}
            betaAlpha={props.renewableBetaAlpha}
            betaBeta={props.renewableBetaBeta}
            vIn={props.renewableVIn}
            vRated={props.renewableVRated}
            vOut={props.renewableVOut}
            gStc={props.renewableGStc}
            onCardPointerDown={props.onRenewableCardPointerDown}
            onHeaderPointerDown={props.onRenewableHeaderPointerDown}
            onToggleLock={props.onToggleRenewableConfigLock}
            onWindShareChange={props.onRenewableWindShareChange}
            onCandidateBusCountChange={props.onRenewableCandidateBusCountChange}
            onWeibullLambdaChange={props.onRenewableWeibullLambdaChange}
            onWeibullKChange={props.onRenewableWeibullKChange}
            onBetaAlphaChange={props.onRenewableBetaAlphaChange}
            onBetaBetaChange={props.onRenewableBetaBetaChange}
            onVInChange={props.onRenewableVInChange}
            onVRatedChange={props.onRenewableVRatedChange}
            onVOutChange={props.onRenewableVOutChange}
            onGStcChange={props.onRenewableGStcChange}
          />

          <FeatureConstructionCard
            position={props.featureCardPos}
            isDragging={props.isFeatureCardDragging}
            cardRef={props.featureConstructionRef}
            isLocked={props.isFeatureConstructionLocked}
            numIterations={props.featureNumIterations}
            onCardPointerDown={props.onFeatureCardPointerDown}
            onHeaderPointerDown={props.onFeatureHeaderPointerDown}
            onToggleLock={props.onToggleFeatureConstructionLock}
            onNumIterationsChange={props.onFeatureNumIterationsChange}
          />

          <DataSplitCard
            position={props.splitCardPos}
            isDragging={props.isDataSplitCardDragging}
            cardRef={props.dataSplitRef}
            isLocked={props.isDataSplitLocked}
            trainCount={props.splitTrain}
            valCount={props.splitVal}
            testSeenCount={props.splitTestSeen}
            testUnseenCount={props.splitTestUnseen}
            onCardPointerDown={props.onDataSplitCardPointerDown}
            onHeaderPointerDown={props.onDataSplitHeaderPointerDown}
            onToggleLock={props.onToggleDataSplitLock}
            onTrainCountChange={props.onSplitTrainChange}
            onValCountChange={props.onSplitValChange}
            onTestSeenCountChange={props.onSplitTestSeenChange}
            onTestUnseenCountChange={props.onSplitTestUnseenChange}
          />

          <TopologySamplingCard
            position={props.topologySamplingCardPos}
            isDragging={props.isTopologySamplingCardDragging}
            cardRef={props.topologySamplingRef}
            isLocked={props.isTopologySamplingLocked}
            seenSamplingMode={props.topologySamplingSeenMode}
            unseenSamplingMode={props.topologySamplingUnseenMode}
            onCardPointerDown={props.onTopologySamplingCardPointerDown}
            onHeaderPointerDown={props.onTopologySamplingHeaderPointerDown}
            onToggleLock={props.onToggleTopologySamplingLock}
            onSeenSamplingModeChange={props.onTopologySamplingSeenModeChange}
            onUnseenSamplingModeChange={props.onTopologySamplingUnseenModeChange}
          />

          <BuildRuntimeCard
            position={props.runtimeCardPos}
            isDragging={props.isBuildRuntimeCardDragging}
            cardRef={props.buildRuntimeRef}
            isLocked={props.isBuildRuntimeLocked}
            seed={props.runtimeSeed}
            numWorkers={props.runtimeNumWorkers}
            chunkSize={props.runtimeChunkSize}
            maxAttemptMultiplier={props.runtimeMaxAttemptMultiplier}
            onCardPointerDown={props.onBuildRuntimeCardPointerDown}
            onHeaderPointerDown={props.onBuildRuntimeHeaderPointerDown}
            onToggleLock={props.onToggleBuildRuntimeLock}
            onSeedChange={props.onRuntimeSeedChange}
            onNumWorkersChange={props.onRuntimeNumWorkersChange}
            onChunkSizeChange={props.onRuntimeChunkSizeChange}
            onMaxAttemptMultiplierChange={props.onRuntimeMaxAttemptMultiplierChange}
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
