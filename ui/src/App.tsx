import { useCallback, useEffect, useRef, useState } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import 'xterm/css/xterm.css'
import './App.css'

import { CanvasToolbar } from './components/workbench/CanvasToolbar'
import { CaseSelectCard } from './components/workbench/CaseSelectCard'
import { WORKBENCH_CARD_DEFINITIONS } from './components/workbench/cardDefinitions'
import { LoadConfigCard } from './components/workbench/LoadConfigCard'
import { MockChatPanel } from './components/workbench/MockChatPanel'
import { Tab2Placeholder } from './components/workbench/Tab2Placeholder'
import { TerminalPanel } from './components/workbench/TerminalPanel'
import type { Point, ScaleSamplingMode, TabKey, ThemeMode } from './components/workbench/types'

const PANDAPOWER_BASECASES = [
  'case4gs',
  'case5',
  'case6ww',
  'case9',
  'case11_iwamoto',
  'case14',
  'case24_ieee_rts',
  'case30',
  'case_ieee30',
  'case33bw',
  'case39',
  'case57',
  'case89pegase',
  'case118',
  'case145',
  'case_illinois200',
  'case300',
  'case1354pegase',
  'case1888rte',
  'case2848rte',
  'case2869pegase',
  'case3120sp',
  'case6470rte',
  'case6495rte',
  'case6515rte',
  'case9241pegase',
] as const

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
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const baselineRef = useRef<HTMLDivElement | null>(null)
  const loadConfigRef = useRef<HTMLDivElement | null>(null)
  const dragState = useRef<{ isDragging: boolean; offsetX: number; offsetY: number }>({
    isDragging: false,
    offsetX: 0,
    offsetY: 0,
  })
  const loadCardDragState = useRef<{ isDragging: boolean; offsetX: number; offsetY: number }>({
    isDragging: false,
    offsetX: 0,
    offsetY: 0,
  })
  const [cardPos, setCardPos] = useState<Point>({ x: 24, y: 24 })
  const [loadCardPos, setLoadCardPos] = useState<Point>({ x: 320, y: 24 })
  const [isDragging, setIsDragging] = useState(false)
  const [isLoadCardDragging, setIsLoadCardDragging] = useState(false)
  const [isCanvasPanning, setIsCanvasPanning] = useState(false)
  const canvasPanState = useRef<{ isPanning: boolean; pointerId: number | null; startX: number; startY: number; startOffsetX: number; startOffsetY: number }>({
    isPanning: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startOffsetX: 0,
    startOffsetY: 0,
  })

  const baselineHeight = baselineRef.current?.offsetHeight ?? 156
  const loadHeight = loadConfigRef.current?.offsetHeight ?? 292
  const baselineOutputPort = {
    x: cardPos.x + caseCardDef.width,
    y: cardPos.y + baselineHeight / 2,
  }
  const loadInputPort = {
    x: loadCardPos.x,
    y: loadCardPos.y + loadHeight / 2,
  }

  const clampZoom = useCallback((value: number) => {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, value))
  }, [MAX_ZOOM, MIN_ZOOM])

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!dragState.current.isDragging || !canvasRef.current) {
      return
    }
    const containerRect = canvasRef.current.getBoundingClientRect()
    const proposedX =
      (event.clientX - containerRect.left - canvasOffset.x) / canvasZoom - dragState.current.offsetX
    const proposedY =
      (event.clientY - containerRect.top - canvasOffset.y) / canvasZoom - dragState.current.offsetY
    setCardPos({
      x: proposedX,
      y: proposedY,
    })
  }, [canvasOffset.x, canvasOffset.y, canvasZoom])

  const handlePointerUp = useCallback(() => {
    if (!dragState.current.isDragging) {
      return
    }
    dragState.current.isDragging = false
    setIsDragging(false)
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }, [handlePointerMove])

  const handleLoadCardPointerMove = useCallback((event: PointerEvent) => {
    if (!loadCardDragState.current.isDragging || !canvasRef.current) {
      return
    }
    const containerRect = canvasRef.current.getBoundingClientRect()
    const proposedX =
      (event.clientX - containerRect.left - canvasOffset.x) / canvasZoom - loadCardDragState.current.offsetX
    const proposedY =
      (event.clientY - containerRect.top - canvasOffset.y) / canvasZoom - loadCardDragState.current.offsetY
    setLoadCardPos({
      x: proposedX,
      y: proposedY,
    })
  }, [canvasOffset.x, canvasOffset.y, canvasZoom])

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

  const handleLoadCardPointerUp = useCallback(() => {
    if (!loadCardDragState.current.isDragging) {
      return
    }
    loadCardDragState.current.isDragging = false
    setIsLoadCardDragging(false)
    window.removeEventListener('pointermove', handleLoadCardPointerMove)
    window.removeEventListener('pointerup', handleLoadCardPointerUp)
  }, [handleLoadCardPointerMove])

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
      window.removeEventListener('pointermove', handleLoadCardPointerMove)
      window.removeEventListener('pointerup', handleLoadCardPointerUp)
    }
  }, [
    handlePointerMove,
    handlePointerUp,
    handleLoadCardPointerMove,
    handleLoadCardPointerUp,
  ])

  const handleDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !baselineRef.current) {
      return
    }
    event.preventDefault()
    const cardRect = baselineRef.current.getBoundingClientRect()
    dragState.current.isDragging = true
    setIsDragging(true)
    dragState.current.offsetX = (event.clientX - cardRect.left) / canvasZoom
    dragState.current.offsetY = (event.clientY - cardRect.top) / canvasZoom
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
  }

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

  const handleBaselineCardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!shouldStartCardDrag(event)) {
      return
    }
    handleDragStart(event)
  }

  const handleLoadCardDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !loadConfigRef.current) {
      return
    }
    event.preventDefault()
    const cardRect = loadConfigRef.current.getBoundingClientRect()
    loadCardDragState.current.isDragging = true
    setIsLoadCardDragging(true)
    loadCardDragState.current.offsetX = (event.clientX - cardRect.left) / canvasZoom
    loadCardDragState.current.offsetY = (event.clientY - cardRect.top) / canvasZoom
    window.addEventListener('pointermove', handleLoadCardPointerMove)
    window.addEventListener('pointerup', handleLoadCardPointerUp)
  }

  const handleLoadCardPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!shouldStartCardDrag(event)) {
      return
    }
    handleLoadCardDragStart(event)
  }

  const handleCanvasWheel = (event: React.WheelEvent<HTMLDivElement>) => {
    event.preventDefault()
    const direction = event.deltaY < 0 ? 1 : -1
    setCanvasZoom((prev) => clampZoom(prev + direction * ZOOM_STEP))
  }

  const zoomIn = () => {
    setCanvasZoom((prev) => clampZoom(prev + ZOOM_STEP))
  }

  const zoomOut = () => {
    setCanvasZoom((prev) => clampZoom(prev - ZOOM_STEP))
  }

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

  return (
    <div className={`app-root theme-${themeMode}`}>
      <header className="tabs-header">
        <button
          className={activeTab === 'tab1' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('tab1')}
        >
          Tab1 - Workbench
        </button>
        <button
          className={activeTab === 'tab2' ? 'tab-btn active' : 'tab-btn'}
          onClick={() => setActiveTab('tab2')}
        >
          Tab2 - Topology (Placeholder)
        </button>
        <div className="header-spacer" />
        <button
          className="theme-btn"
          onClick={() => setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'))}
        >
          Theme: {themeMode === 'light' ? 'Light' : 'Dark'}
        </button>
      </header>

      {activeTab === 'tab1' ? (
        <main className="workbench-main">
          <Group orientation="vertical">
            <Panel defaultSize={72} minSize={35}>
              <Group orientation="horizontal">
                <Panel defaultSize={72} minSize={35}>
                  <div className="panel-shell canvas-shell">
                    <div className="panel-title">Center Canvas (UI Shell)</div>
                    <div
                      className={`canvas-placeholder${isCanvasPanning ? ' panning' : ''}`}
                      ref={canvasRef}
                      onWheel={handleCanvasWheel}
                      onPointerDown={handleCanvasPanStart}
                      onPointerMove={handleCanvasPanPointerMove}
                      onPointerUp={handleCanvasPanPointerUp}
                      onPointerCancel={handleCanvasPanPointerUp}
                    >
                      <CanvasToolbar
                        zoomPercent={Math.round(canvasZoom * 100)}
                        onZoomOut={zoomOut}
                        onZoomIn={zoomIn}
                        onCenterAt100={centerAt100}
                      />
                      <div
                        className="canvas-content"
                        style={{ transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasZoom})` }}
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
                          position={cardPos}
                          isDragging={isDragging}
                          cardRef={baselineRef}
                          selectedBasecase={selectedBasecase}
                          isLocked={isBasecaseLocked}
                          basecases={PANDAPOWER_BASECASES}
                          onCardPointerDown={handleBaselineCardPointerDown}
                          onHeaderPointerDown={handleDragStart}
                          onToggleLock={() => setIsBasecaseLocked((prev) => !prev)}
                          onChangeBasecase={setSelectedBasecase}
                        />
                        <LoadConfigCard
                          position={loadCardPos}
                          isDragging={isLoadCardDragging}
                          cardRef={loadConfigRef}
                          isLocked={isLoadConfigLocked}
                          scaleSamplingMode={scaleSamplingMode}
                          globalScaleMu={globalScaleMu}
                          globalScaleSigma={globalScaleSigma}
                          globalScaleMin={globalScaleMin}
                          globalScaleMax={globalScaleMax}
                          scaleUniformBins={scaleUniformBins}
                          nodeNoiseSigma={nodeNoiseSigma}
                          onCardPointerDown={handleLoadCardPointerDown}
                          onHeaderPointerDown={handleLoadCardDragStart}
                          onToggleLock={() => setIsLoadConfigLocked((prev) => !prev)}
                          onModeChange={setScaleSamplingMode}
                          onGlobalScaleMuChange={setGlobalScaleMu}
                          onGlobalScaleSigmaChange={setGlobalScaleSigma}
                          onGlobalScaleMinChange={setGlobalScaleMin}
                          onGlobalScaleMaxChange={setGlobalScaleMax}
                          onScaleUniformBinsChange={setScaleUniformBins}
                          onNodeNoiseSigmaChange={setNodeNoiseSigma}
                        />
                      </div>
                    </div>
                  </div>
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
      ) : <Tab2Placeholder />}
    </div>
  )
}

export default App
