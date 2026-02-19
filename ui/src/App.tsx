import 'xterm/css/xterm.css'
import './App.css'

import { WORKBENCH_CARD_DEFINITIONS } from './components/workbench/cards/cardDefinitions.ts'
import { PANDAPOWER_BASECASES } from './components/workbench/constants.ts'
import { useWorkbenchAppState } from './components/workbench/hooks/useWorkbenchAppState.ts'
import { useWorkbenchCanvasController } from './components/workbench/hooks/useWorkbenchCanvasController.ts'
import { useWorkbenchLoadConfigState } from './components/workbench/hooks/useWorkbenchLoadConfigState.ts'
import { WorkbenchHeader } from './components/workbench/layout/WorkbenchHeader.tsx'
import { WorkbenchTab1Pane } from './components/workbench/layout/WorkbenchTab1Pane.tsx'
import { Tab2TopologyEditor } from './components/workbench/topology/Tab2TopologyEditor.tsx'

/**
 * Root workbench application shell.
 *
 * Orchestrates tab switching, theme mode, canvas pan/zoom, card dragging,
 * and card-level configuration state.
 */
function App() {
  const caseCardDef = WORKBENCH_CARD_DEFINITIONS.case_select
  const loadCardDef = WORKBENCH_CARD_DEFINITIONS.load_config
  const renewableCardDef = WORKBENCH_CARD_DEFINITIONS.renewable_config
  const featureCardDef = WORKBENCH_CARD_DEFINITIONS.feature_construction
  const splitCardDef = WORKBENCH_CARD_DEFINITIONS.data_split
  const topologySamplingCardDef = WORKBENCH_CARD_DEFINITIONS.topology_sampling
  const runtimeCardDef = WORKBENCH_CARD_DEFINITIONS.build_runtime

  const appState = useWorkbenchAppState()
  const loadState = useWorkbenchLoadConfigState()
  const canvasState = useWorkbenchCanvasController({
    isTab1Active: appState.activeTab === 'tab1',
    caseCardWidth: caseCardDef.width,
    loadCardWidth: loadCardDef.width,
    renewableCardWidth: renewableCardDef.width,
    featureCardWidth: featureCardDef.width,
    splitCardWidth: splitCardDef.width,
    topologySamplingCardWidth: topologySamplingCardDef.width,
    runtimeCardWidth: runtimeCardDef.width,
    topologyTargetsCardWidth: 300,
  })

  const cardWidths = {
    caseCardWidth: caseCardDef.width,
    loadCardWidth: loadCardDef.width,
    renewableCardWidth: renewableCardDef.width,
    featureCardWidth: featureCardDef.width,
    splitCardWidth: splitCardDef.width,
    topologySamplingCardWidth: topologySamplingCardDef.width,
    runtimeCardWidth: runtimeCardDef.width,
  }

  return (
    <div className={`app-root theme-${appState.themeMode}`}>
      <WorkbenchHeader
        activeTab={appState.activeTab}
        themeMode={appState.themeMode}
        selectedTopologyCount={appState.selectedTopologyCount}
        isTopologyTabLocked={loadState.isTopologyTargetsLocked}
        onShowWorkbenchTab={appState.showWorkbenchTab}
        onShowTopologyTab={appState.showTopologyTab}
        onToggleThemeMode={appState.toggleThemeMode}
      />

      {appState.activeTab === 'tab1' ? (
        <WorkbenchTab1Pane
          themeMode={appState.themeMode}
          appState={appState}
          loadState={loadState}
          canvasState={canvasState}
          cardWidths={cardWidths}
          basecases={PANDAPOWER_BASECASES}
        />
      ) : (
        <Tab2TopologyEditor
          selection={appState.topologySelection}
          topologyTargets={appState.topologyTargets}
          onSelectionChange={appState.setTopologySelection}
          onBackToWorkbench={appState.showWorkbenchTab}
        />
      )}
    </div>
  )
}

export default App
