import { Group, Panel, Separator } from 'react-resizable-panels'

import type { useWorkbenchAppState } from '../hooks/useWorkbenchAppState.ts'
import type { useWorkbenchCanvasController } from '../hooks/useWorkbenchCanvasController.ts'
import type { useWorkbenchLoadConfigState } from '../hooks/useWorkbenchLoadConfigState.ts'
import type { ThemeMode } from '../types.ts'
import { MockChatPanel } from '../chat-terminal/MockChatPanel.tsx'
import { TerminalPanel } from '../chat-terminal/TerminalPanel.tsx'
import { WorkbenchCanvasPanel } from './WorkbenchCanvasPanel.tsx'

type AppStateModel = ReturnType<typeof useWorkbenchAppState>
type CanvasControllerModel = ReturnType<typeof useWorkbenchCanvasController>
type LoadConfigStateModel = ReturnType<typeof useWorkbenchLoadConfigState>

/** Width metadata for Tab1 card link geometry. */
type WorkbenchCardWidths = {
  caseCardWidth: number
  loadCardWidth: number
  renewableCardWidth: number
  featureCardWidth: number
  splitCardWidth: number
  topologySamplingCardWidth: number
  runtimeCardWidth: number
}

/** Props for Tab1 workbench pane composition. */
type WorkbenchTab1PaneProps = {
  themeMode: ThemeMode
  appState: AppStateModel
  loadState: LoadConfigStateModel
  canvasState: CanvasControllerModel
  cardWidths: WorkbenchCardWidths
  basecases: readonly string[]
}

/**
 * Tab1 container that composes canvas, chat, and terminal panels.
 *
 * Keeps App-level routing logic lightweight while preserving existing behavior.
 */
export function WorkbenchTab1Pane({
  themeMode,
  appState,
  loadState,
  canvasState,
  cardWidths,
  basecases,
}: WorkbenchTab1PaneProps) {
  return (
    <main className="workbench-main">
      <Group orientation="vertical">
        <Panel defaultSize={72} minSize={35}>
          <Group orientation="horizontal">
            <Panel defaultSize={72} minSize={35}>
              <WorkbenchCanvasPanel
                canvasRef={canvasState.canvasRef}
                baselineRef={canvasState.baselineRef}
                loadConfigRef={canvasState.loadConfigRef}
                renewableConfigRef={canvasState.renewableConfigRef}
                featureConstructionRef={canvasState.featureConstructionRef}
                dataSplitRef={canvasState.dataSplitRef}
                topologySamplingRef={canvasState.topologySamplingRef}
                buildRuntimeRef={canvasState.buildRuntimeRef}
                topologyTargetsRef={canvasState.topologyTargetsRef}
                canvasZoom={canvasState.canvasZoom}
                canvasOffset={canvasState.canvasOffset}
                isCanvasPanning={canvasState.isCanvasPanning}
                cardPos={canvasState.cardPos}
                loadCardPos={canvasState.loadCardPos}
                renewableCardPos={canvasState.renewableCardPos}
                featureCardPos={canvasState.featureCardPos}
                splitCardPos={canvasState.splitCardPos}
                topologySamplingCardPos={canvasState.topologySamplingCardPos}
                runtimeCardPos={canvasState.runtimeCardPos}
                topologyTargetsCardPos={canvasState.topologyTargetsCardPos}
                isDragging={canvasState.isDragging}
                isLoadCardDragging={canvasState.isLoadCardDragging}
                isRenewableCardDragging={canvasState.isRenewableCardDragging}
                isFeatureCardDragging={canvasState.isFeatureCardDragging}
                isDataSplitCardDragging={canvasState.isDataSplitCardDragging}
                isTopologySamplingCardDragging={canvasState.isTopologySamplingCardDragging}
                isBuildRuntimeCardDragging={canvasState.isBuildRuntimeCardDragging}
                isTopologyTargetsCardDragging={canvasState.isTopologyTargetsCardDragging}
                selectedBasecase={loadState.selectedBasecase}
                isBasecaseLocked={loadState.isBasecaseLocked}
                isLoadConfigLocked={loadState.isLoadConfigLocked}
                isRenewableConfigLocked={loadState.isRenewableConfigLocked}
                isFeatureConstructionLocked={loadState.isFeatureConstructionLocked}
                isDataSplitLocked={loadState.isDataSplitLocked}
                isTopologySamplingLocked={loadState.isTopologySamplingLocked}
                isBuildRuntimeLocked={loadState.isBuildRuntimeLocked}
                isTopologyTargetsLocked={loadState.isTopologyTargetsLocked}
                scaleSamplingMode={loadState.scaleSamplingMode}
                globalScaleMu={loadState.globalScaleMu}
                globalScaleSigma={loadState.globalScaleSigma}
                globalScaleMin={loadState.globalScaleMin}
                globalScaleMax={loadState.globalScaleMax}
                scaleUniformBins={loadState.scaleUniformBins}
                nodeNoiseSigma={loadState.nodeNoiseSigma}
                renewablePenetrationRate={loadState.renewablePenetrationRate}
                renewableWindShare={loadState.renewableWindShare}
                renewableCandidateBusCount={loadState.renewableCandidateBusCount}
                renewableWeibullLambda={loadState.renewableWeibullLambda}
                renewableWeibullK={loadState.renewableWeibullK}
                renewableBetaAlpha={loadState.renewableBetaAlpha}
                renewableBetaBeta={loadState.renewableBetaBeta}
                renewableVIn={loadState.renewableVIn}
                renewableVRated={loadState.renewableVRated}
                renewableVOut={loadState.renewableVOut}
                renewableGStc={loadState.renewableGStc}
                featureNumIterations={loadState.featureNumIterations}
                splitTrain={loadState.splitTrain}
                splitVal={loadState.splitVal}
                splitTestSeen={loadState.splitTestSeen}
                splitTestUnseen={loadState.splitTestUnseen}
                topologySamplingSeenMode={loadState.topologySamplingSeenMode}
                topologySamplingUnseenMode={loadState.topologySamplingUnseenMode}
                runtimeSeed={loadState.runtimeSeed}
                runtimeNumWorkers={loadState.runtimeNumWorkers}
                runtimeChunkSize={loadState.runtimeChunkSize}
                runtimeMaxAttemptMultiplier={loadState.runtimeMaxAttemptMultiplier}
                topologySelection={appState.topologySelection}
                topologyTargets={appState.topologyTargets}
                basecases={basecases}
                caseCardWidth={cardWidths.caseCardWidth}
                loadCardWidth={cardWidths.loadCardWidth}
                renewableCardWidth={cardWidths.renewableCardWidth}
                featureCardWidth={cardWidths.featureCardWidth}
                splitCardWidth={cardWidths.splitCardWidth}
                topologySamplingCardWidth={cardWidths.topologySamplingCardWidth}
                runtimeCardWidth={cardWidths.runtimeCardWidth}
                baselineHeight={canvasState.baselineHeight}
                loadHeight={canvasState.loadHeight}
                renewableHeight={canvasState.renewableHeight}
                featureHeight={canvasState.featureHeight}
                splitHeight={canvasState.splitHeight}
                topologySamplingHeight={canvasState.topologySamplingHeight}
                runtimeHeight={canvasState.runtimeHeight}
                topologyTargetsHeight={canvasState.topologyTargetsHeight}
                onShowTopologyTab={appState.showTopologyTab}
                onWheel={canvasState.handleCanvasWheel}
                onCanvasPointerDown={canvasState.handleCanvasPanStart}
                onCanvasPointerMove={canvasState.handleCanvasPanPointerMove}
                onCanvasPointerUp={canvasState.handleCanvasPanPointerUp}
                onZoomOut={canvasState.zoomOut}
                onZoomIn={canvasState.zoomIn}
                onCenterAt100={canvasState.centerAt100}
                onFitView={canvasState.fitCanvasView}
                onBaselineCardPointerDown={canvasState.handleBaselineCardPointerDown}
                onBaselineHeaderPointerDown={canvasState.handleDragStart}
                onToggleBasecaseLock={loadState.toggleBasecaseLock}
                onChangeBasecase={loadState.setSelectedBasecase}
                onLoadCardPointerDown={canvasState.handleLoadCardPointerDown}
                onLoadHeaderPointerDown={canvasState.handleLoadCardDragStart}
                onTopologyTargetsCardPointerDown={canvasState.handleTopologyTargetsCardPointerDown}
                onTopologyTargetsHeaderPointerDown={canvasState.handleTopologyTargetsCardDragStart}
                onToggleTopologyTargetsLock={loadState.toggleTopologyTargetsLock}
                onToggleLoadConfigLock={loadState.toggleLoadConfigLock}
                onScaleSamplingModeChange={loadState.setScaleSamplingMode}
                onGlobalScaleMuChange={loadState.setGlobalScaleMu}
                onGlobalScaleSigmaChange={loadState.setGlobalScaleSigma}
                onGlobalScaleMinChange={loadState.setGlobalScaleMin}
                onGlobalScaleMaxChange={loadState.setGlobalScaleMax}
                onScaleUniformBinsChange={loadState.setScaleUniformBins}
                onNodeNoiseSigmaChange={loadState.setNodeNoiseSigma}
                onRenewableWindShareChange={loadState.setRenewableWindShare}
                onRenewableCandidateBusCountChange={loadState.setRenewableCandidateBusCount}
                onRenewableWeibullLambdaChange={loadState.setRenewableWeibullLambda}
                onRenewableWeibullKChange={loadState.setRenewableWeibullK}
                onRenewableBetaAlphaChange={loadState.setRenewableBetaAlpha}
                onRenewableBetaBetaChange={loadState.setRenewableBetaBeta}
                onRenewableVInChange={loadState.setRenewableVIn}
                onRenewableVRatedChange={loadState.setRenewableVRated}
                onRenewableVOutChange={loadState.setRenewableVOut}
                onRenewableGStcChange={loadState.setRenewableGStc}
                onRenewableCardPointerDown={canvasState.handleRenewableCardPointerDown}
                onRenewableHeaderPointerDown={canvasState.handleRenewableCardDragStart}
                onToggleRenewableConfigLock={loadState.toggleRenewableConfigLock}
                onFeatureCardPointerDown={canvasState.handleFeatureCardPointerDown}
                onFeatureHeaderPointerDown={canvasState.handleFeatureCardDragStart}
                onToggleFeatureConstructionLock={loadState.toggleFeatureConstructionLock}
                onFeatureNumIterationsChange={loadState.setFeatureNumIterations}
                onDataSplitCardPointerDown={canvasState.handleDataSplitCardPointerDown}
                onDataSplitHeaderPointerDown={canvasState.handleDataSplitCardDragStart}
                onToggleDataSplitLock={loadState.toggleDataSplitLock}
                onSplitTrainChange={loadState.setSplitTrain}
                onSplitValChange={loadState.setSplitVal}
                onSplitTestSeenChange={loadState.setSplitTestSeen}
                onSplitTestUnseenChange={loadState.setSplitTestUnseen}
                onTopologySamplingCardPointerDown={canvasState.handleTopologySamplingCardPointerDown}
                onTopologySamplingHeaderPointerDown={canvasState.handleTopologySamplingCardDragStart}
                onToggleTopologySamplingLock={loadState.toggleTopologySamplingLock}
                onTopologySamplingSeenModeChange={loadState.setTopologySamplingSeenMode}
                onTopologySamplingUnseenModeChange={loadState.setTopologySamplingUnseenMode}
                onBuildRuntimeCardPointerDown={canvasState.handleBuildRuntimeCardPointerDown}
                onBuildRuntimeHeaderPointerDown={canvasState.handleBuildRuntimeCardDragStart}
                onToggleBuildRuntimeLock={loadState.toggleBuildRuntimeLock}
                onRuntimeSeedChange={loadState.setRuntimeSeed}
                onRuntimeNumWorkersChange={loadState.setRuntimeNumWorkers}
                onRuntimeChunkSizeChange={loadState.setRuntimeChunkSize}
                onRuntimeMaxAttemptMultiplierChange={loadState.setRuntimeMaxAttemptMultiplier}
                onTopologyTargetSeenChange={(value) => {
                  appState.setTopologyTargets((prev) => ({ ...prev, seen: value }))
                }}
                onTopologyTargetUnseenChange={(value) => {
                  appState.setTopologyTargets((prev) => ({ ...prev, unseen: value }))
                }}
              />
            </Panel>
            <Separator className="resize-handle vertical" />
            <Panel defaultSize={28} minSize={20}>
              <MockChatPanel />
            </Panel>
          </Group>
        </Panel>
        <Separator className="resize-handle horizontal" />
        <Panel defaultSize={28} minSize={18}>
          <TerminalPanel themeMode={themeMode} />
        </Panel>
      </Group>
    </main>
  )
}
