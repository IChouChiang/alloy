import { useCallback, useRef, useState } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import 'xterm/css/xterm.css'
import './App.css'

import { WORKBENCH_CARD_DEFINITIONS } from './components/workbench/cards/cardDefinitions'
import { useCardDrag } from './components/workbench/cards/hooks/useCardDrag'
import { MockChatPanel } from './components/workbench/chat-terminal/MockChatPanel'
import { TerminalPanel } from './components/workbench/chat-terminal/TerminalPanel'
import { DEFAULT_TOPOLOGY_SELECTION, PANDAPOWER_BASECASES } from './components/workbench/constants'
import { WorkbenchCanvasPanel } from './components/workbench/layout/WorkbenchCanvasPanel'
import { WorkbenchHeader } from './components/workbench/layout/WorkbenchHeader'
import { Tab2TopologyEditor } from './components/workbench/topology/Tab2TopologyEditor'
import type { Point, ScaleSamplingMode, TabKey, ThemeMode, TopologySelectionState } from './components/workbench/types'

/**
 * Root workbench application shell.
 *
 * Orchestrates tab switching, theme mode, canvas pan/zoom, card dragging,
 * and card-level configuration state.
 */
function App() {
  const MIN_ZOOM = 0.5
  const MAX_ZOOM = 1.8
  const ZOOM_STEP = 0.1
  const caseCardDef = WORKBENCH_CARD_DEFINITIONS.case_select
  const loadCardDef = WORKBENCH_CARD_DEFINITIONS.load_config

  const [activeTab, setActiveTab] = useState<TabKey>('tab1')
  const [themeMode, setThemeMode] = useState<ThemeMode>('light')
  const [canvasZoom, setCanvasZoom] = useState(1)
  const [canvasOffset, setCanvasOffset] = useState<Point>({ x: 0, y: 0 })
  const [selectedBasecase, setSelectedBasecase] = useState<string>('case39')
  const [isBasecaseLocked, setIsBasecaseLocked] = useState(true)
  const [isLoadConfigLocked, setIsLoadConfigLocked] = useState(true)
  const [scaleSamplingMode, setScaleSamplingMode] = useState<ScaleSamplingMode>('truncated_normal')
  const [globalScaleMu, setGlobalScaleMu] = useState(1.0)
  const [globalScaleSigma, setGlobalScaleSigma] = useState(0.2)
  const [globalScaleMin, setGlobalScaleMin] = useState(0.5)
  const [globalScaleMax, setGlobalScaleMax] = useState(1.5)
  const [scaleUniformBins, setScaleUniformBins] = useState(20)
  const [nodeNoiseSigma, setNodeNoiseSigma] = useState(0.05)
  const [topologySelection, setTopologySelection] = useState<TopologySelectionState>(DEFAULT_TOPOLOGY_SELECTION)
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const baselineRef = useRef<HTMLDivElement | null>(null)
  const loadConfigRef = useRef<HTMLDivElement | null>(null)
  const [isCanvasPanning, setIsCanvasPanning] = useState(false)
  const canvasPanState = useRef<{ isPanning: boolean; pointerId: number | null; startX: number; startY: number; startOffsetX: number; startOffsetY: number }>({
    isPanning: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  })

  /** Clamps a zoom value to the configured min/max range. */
  const clampZoom = useCallback((value: number) => {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
  }, [MAX_ZOOM, MIN_ZOOM])

  const baselineDrag = useCardDrag({
    canvasRef,
    cardRef: baselineRef,
    canvasZoom,
    canvasOffset,
    initialPosition: { x: 24, y: 24 },
  })
  const loadDrag = useCardDrag({
    canvasRef,
    cardRef: loadConfigRef,
    canvasZoom,
    canvasOffset,
    initialPosition: { x: 320, y: 24 },
  })

  const cardPos = baselineDrag.position
  const loadCardPos = loadDrag.position
  const isDragging = baselineDrag.isDragging
  const isLoadCardDragging = loadDrag.isDragging
  const baselineHeight = baselineRef.current?.offsetHeight ?? 156
  const loadHeight = loadConfigRef.current?.offsetHeight ?? 292

  /** Updates canvas offset during blank-area panning with pointer capture. */
  const handleCanvasPanPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canvasPanState.current.isPanning || canvasPanState.current.pointerId !== event.pointerId) {
      return
    }
    const deltaX = event.clientX - canvasPanState.current.startX
    const deltaY = event.clientY - canvasPanState.current.startY
    setCanvasOffset({
      x: canvasPanState.current.startOffsetX + deltaX,
      y: canvasPanState.current.startOffsetY + deltaY,
    })
  }

  /** Ends panning and releases pointer capture for the active canvas pointer. */
  const handleCanvasPanPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canvasPanState.current.isPanning || canvasPanState.current.pointerId !== event.pointerId) {
      return
    }
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    canvasPanState.current.isPanning = false
    canvasPanState.current.pointerId = null
    setIsCanvasPanning(false)
  }

  const handleDragStart = baselineDrag.startDrag

  /** Returns whether a pointer-down target should initiate card dragging. */
  const shouldStartCardDrag = (event: React.PointerEvent<HTMLElement>) => {
    const target = event.target as HTMLElement | null
    if (!target) {
      return false
    }
    if (
      target.closest(
        'button, input, select, textarea, option, .card-drag-handle, .baseline-title, .baseline-note, .baseline-label, .zoom-btn, .canvas-toolbar, p, span, label'
      )
    ) {
      return false
    }
    return true
  }

  /** Starts baseline card drag when pointer-down happens on blank card area. */
  const handleBaselineCardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!shouldStartCardDrag(event)) {
      return
    }
    handleDragStart(event)
  }

  const handleLoadCardDragStart = loadDrag.startDrag

  /** Starts load-config drag when pointer-down happens on blank card area. */
  const handleLoadCardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!shouldStartCardDrag(event)) {
      return
    }
    handleLoadCardDragStart(event)
  }

  /** Applies wheel-based zooming around the current viewport. */
  const handleCanvasWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const direction = event.deltaY < 0 ? 1 : -1
    setCanvasZoom((prev) => clampZoom(prev + direction * ZOOM_STEP))
  }

  /** Increases canvas zoom by one step. */
  const zoomIn = () => {
    setCanvasZoom((prev) => clampZoom(prev + ZOOM_STEP))
  }

  /** Decreases canvas zoom by one step. */
  const zoomOut = () => {
    setCanvasZoom((prev) => clampZoom(prev - ZOOM_STEP))
  }

  /**
   * Resets zoom to 100% and recenters viewport around current card content bounds.
   */
  const centerAt100 = () => {
    if (!canvasRef.current) {
      return
    }
    const viewportWidth = canvasRef.current.clientWidth
    const viewportHeight = canvasRef.current.clientHeight

    const baselineHeight = baselineRef.current?.offsetHeight ?? 180
    const loadHeight = loadConfigRef.current?.offsetHeight ?? 300

    const minX = Math.min(cardPos.x, loadCardPos.x)
    const maxX = Math.max(cardPos.x + caseCardDef.width, loadCardPos.x + loadCardDef.width)
    const minY = Math.min(cardPos.y, loadCardPos.y)
    const maxY = Math.max(cardPos.y + baselineHeight, loadCardPos.y + loadHeight)

    const contentCenterX = (minX + maxX) / 2
    const contentCenterY = (minY + maxY) / 2

    setCanvasZoom(1)
    setCanvasOffset({
      x: viewportWidth / 2 - contentCenterX,
      y: viewportHeight / 2 - contentCenterY,
    })
  }

  /** Starts blank-area canvas panning and captures the active pointer. */
  const handleCanvasPanStart = (event: React.PointerEvent<HTMLDivElement>) => {
    const target = event.target as HTMLElement | null
    if (
      target?.closest(
        '.baseline-card, .load-config-card, .canvas-toolbar, .zoom-btn, .baseline-select, .load-input, .baseline-lock-btn, button, input, select, textarea, label'
      )
    ) {
      return
    }
    event.preventDefault()
    canvasPanState.current.isPanning = true
    canvasPanState.current.pointerId = event.pointerId
    canvasPanState.current.startX = event.clientX
    canvasPanState.current.startY = event.clientY
    canvasPanState.current.startOffsetX = canvasOffset.x
    canvasPanState.current.startOffsetY = canvasOffset.y
    event.currentTarget.setPointerCapture(event.pointerId)
    setIsCanvasPanning(true)
  }

  /** Switches active tab to the Workbench view. */
  const showWorkbenchTab = () => {
    setActiveTab('tab1')
  }

  /** Switches active tab to the Topology placeholder view. */
  const showTopologyTab = () => {
    setActiveTab('tab2')
  }

  const selectedTopologyCount = topologySelection.specs.length

  /** Toggles application theme between light and dark modes. */
  const toggleThemeMode = () => {
    setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  /** Toggles lock state for the baseline/card basecase configuration. */
  const toggleBasecaseLock = () => {
    setIsBasecaseLocked((prev) => !prev)
  }

  /** Toggles lock state for load-configuration inputs. */
  const toggleLoadConfigLock = () => {
    setIsLoadConfigLocked((prev) => !prev)
  }

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
