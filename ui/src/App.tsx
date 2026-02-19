import { Group, Panel, Separator } from 'react-resizable-panels'
import 'xterm/css/xterm.css'
import './App.css'

import { WORKBENCH_CARD_DEFINITIONS } from './components/workbench/cards/cardDefinitions'
import { MockChatPanel } from './components/workbench/chat-terminal/MockChatPanel'
import { TerminalPanel } from './components/workbench/chat-terminal/TerminalPanel'
import { PANDAPOWER_BASECASES } from './components/workbench/constants'
import { useWorkbenchAppState } from './components/workbench/hooks/useWorkbenchAppState'
import { useWorkbenchCanvasController } from './components/workbench/hooks/useWorkbenchCanvasController'
import { useWorkbenchLoadConfigState } from './components/workbench/hooks/useWorkbenchLoadConfigState'
import { WorkbenchCanvasPanel } from './components/workbench/layout/WorkbenchCanvasPanel'
import { WorkbenchHeader } from './components/workbench/layout/WorkbenchHeader'
import { Tab2TopologyEditor } from './components/workbench/topology/Tab2TopologyEditor'

/**
 * Root workbench application shell.
 *
 * Orchestrates tab switching, theme mode, canvas pan/zoom, card dragging,
 * and card-level configuration state.
 */
function App() {
  const caseCardDef = WORKBENCH_CARD_DEFINITIONS.case_select
  const loadCardDef = WORKBENCH_CARD_DEFINITIONS.load_config

  const {
    activeTab,
    themeMode,
    topologySelection,
    selectedTopologyCount,
    setTopologySelection,
    showWorkbenchTab,
    showTopologyTab,
    toggleThemeMode,
  } = useWorkbenchAppState()

  const {
    selectedBasecase,
    isBasecaseLocked,
    isLoadConfigLocked,
    scaleSamplingMode,
    globalScaleMu,
    globalScaleSigma,
    globalScaleMin,
    globalScaleMax,
    scaleUniformBins,
    nodeNoiseSigma,
    setSelectedBasecase,
    setScaleSamplingMode,
    setGlobalScaleMu,
    setGlobalScaleSigma,
    setGlobalScaleMin,
    setGlobalScaleMax,
    setScaleUniformBins,
    setNodeNoiseSigma,
    toggleBasecaseLock,
    toggleLoadConfigLock,
  } = useWorkbenchLoadConfigState()

  const {
    canvasRef,
    baselineRef,
    loadConfigRef,
    canvasZoom,
    canvasOffset,
    isCanvasPanning,
    cardPos,
    loadCardPos,
    isDragging,
    isLoadCardDragging,
    baselineHeight,
    loadHeight,
    handleCanvasWheel,
    handleCanvasPanStart,
    handleCanvasPanPointerMove,
    handleCanvasPanPointerUp,
    zoomIn,
    zoomOut,
    centerAt100,
    handleDragStart,
    handleBaselineCardPointerDown,
    handleLoadCardDragStart,
    handleLoadCardPointerDown,
  } = useWorkbenchCanvasController({
    caseCardWidth: caseCardDef.width,
    loadCardWidth: loadCardDef.width,
  })

  return (
    <div className={`app-root theme-${themeMode}`}>
      <WorkbenchHeader
        activeTab={activeTab}
        themeMode={themeMode}
        selectedTopologyCount={selectedTopologyCount}
        onShowWorkbenchTab={showWorkbenchTab}
        onShowTopologyTab={showTopologyTab}
        onToggleThemeMode={toggleThemeMode}
      />

      {activeTab === 'tab1' ? (
        <main className="workbench-main">
          <Group orientation="vertical">
            <Panel defaultSize={72} minSize={35}>
              <Group orientation="horizontal">
                <Panel defaultSize={72} minSize={35}>
                  <WorkbenchCanvasPanel
                    canvasRef={canvasRef}
                    baselineRef={baselineRef}
                    loadConfigRef={loadConfigRef}
                    canvasZoom={canvasZoom}
                    canvasOffset={canvasOffset}
                    isCanvasPanning={isCanvasPanning}
                    cardPos={cardPos}
                    loadCardPos={loadCardPos}
                    isDragging={isDragging}
                    isLoadCardDragging={isLoadCardDragging}
                    selectedBasecase={selectedBasecase}
                    isBasecaseLocked={isBasecaseLocked}
                    isLoadConfigLocked={isLoadConfigLocked}
                    scaleSamplingMode={scaleSamplingMode}
                    globalScaleMu={globalScaleMu}
                    globalScaleSigma={globalScaleSigma}
                    globalScaleMin={globalScaleMin}
                    globalScaleMax={globalScaleMax}
                    scaleUniformBins={scaleUniformBins}
                    nodeNoiseSigma={nodeNoiseSigma}
                    topologySelection={topologySelection}
                    basecases={PANDAPOWER_BASECASES}
                    caseCardWidth={caseCardDef.width}
                    loadCardWidth={loadCardDef.width}
                    baselineHeight={baselineHeight}
                    loadHeight={loadHeight}
                    onShowTopologyTab={showTopologyTab}
                    onWheel={handleCanvasWheel}
                    onCanvasPointerDown={handleCanvasPanStart}
                    onCanvasPointerMove={handleCanvasPanPointerMove}
                    onCanvasPointerUp={handleCanvasPanPointerUp}
                    onZoomOut={zoomOut}
                    onZoomIn={zoomIn}
                    onCenterAt100={centerAt100}
                    onBaselineCardPointerDown={handleBaselineCardPointerDown}
                    onBaselineHeaderPointerDown={handleDragStart}
                    onToggleBasecaseLock={toggleBasecaseLock}
                    onChangeBasecase={setSelectedBasecase}
                    onLoadCardPointerDown={handleLoadCardPointerDown}
                    onLoadHeaderPointerDown={handleLoadCardDragStart}
                    onToggleLoadConfigLock={toggleLoadConfigLock}
                    onScaleSamplingModeChange={setScaleSamplingMode}
                    onGlobalScaleMuChange={setGlobalScaleMu}
                    onGlobalScaleSigmaChange={setGlobalScaleSigma}
                    onGlobalScaleMinChange={setGlobalScaleMin}
                    onGlobalScaleMaxChange={setGlobalScaleMax}
                    onScaleUniformBinsChange={setScaleUniformBins}
                    onNodeNoiseSigmaChange={setNodeNoiseSigma}
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
      ) : (
        <Tab2TopologyEditor
          selection={topologySelection}
          onSelectionChange={setTopologySelection}
          onBackToWorkbench={showWorkbenchTab}
        />
      )}
    </div>
  )
}

export default App
