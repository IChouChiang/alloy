import { useCallback, useEffect, useRef, useState } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import './App.css'

type TabKey = 'tab1' | 'tab2'
type ThemeMode = 'light' | 'dark'

type ChatMessage = {
  role: 'user' | 'assistant'
  text: string
}

type Point = {
  x: number
  y: number
}

type ScaleSamplingMode = 'truncated_normal' | 'uniform_bins'

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

function LockIcon({ locked }: { locked: boolean }) {
  if (locked) {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true" className="lock-icon">
        <path d="M7 10V8a5 5 0 1 1 10 0v2h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h1Zm2 0h6V8a3 3 0 1 0-6 0v2Z" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="lock-icon">
      <path d="M17 10h1a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2v-8a2 2 0 0 1 2-2h9V8a3 3 0 1 0-6 0 1 1 0 0 1-2 0 5 5 0 1 1 10 0v2Z" />
    </svg>
  )
}

function MockChatPanel() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', text: 'Mock assistant ready. This panel is reserved for LLM integration.' },
  ])
  const [input, setInput] = useState('')

  const sendMessage = () => {
    const text = input.trim()
    if (!text) {
      return
    }
    setMessages((prev) => [...prev, { role: 'user', text }])
    setInput('')
    window.setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', text: `Mock reply: received "${text}".` },
      ])
    }, 450)
  }

  return (
    <div className="panel-shell">
      <div className="panel-title">LLM Chat (Mock)</div>
      <div className="chat-history">
        {messages.map((msg, idx) => (
          <div key={`${msg.role}-${idx}`} className={`chat-msg chat-${msg.role}`}>
            <span className="chat-role">{msg.role === 'user' ? 'You' : 'Assistant'}</span>
            <span>{msg.text}</span>
          </div>
        ))}
      </div>
      <div className="chat-input-row">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder="Type message..."
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              sendMessage()
            }
          }}
        />
        <button onClick={sendMessage}>Send</button>
      </div>
    </div>
  )
}

function TerminalPanel({ themeMode }: { themeMode: ThemeMode }) {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!hostRef.current) {
      return
    }

    const isDark = themeMode === 'dark'
    const terminal = new Terminal({
      convertEol: true,
      cursorBlink: true,
      theme: {
        background: isDark ? '#05070d' : '#f8fafc',
        foreground: isDark ? '#d4d8e8' : '#1f2937',
      },
      fontSize: 13,
    })
    const fitAddon = new FitAddon()
    terminal.loadAddon(fitAddon)
    terminal.open(hostRef.current)
    fitAddon.fit()

    terminal.writeln('[alloy-ui] terminal panel initialized.')
    terminal.writeln('[alloy-ui] waiting for backend task logs...')

    let tick = 1
    const timer = window.setInterval(() => {
      terminal.writeln(`[mock-log] heartbeat ${tick} | tab1 shell running`)
      tick += 1
      if (tick > 3) {
        terminal.writeln('[mock-log] heartbeat completed (3/3), stopping stream.')
        window.clearInterval(timer)
      }
    }, 1400)

    const resizeObserver = new ResizeObserver(() => {
      fitAddon.fit()
    })
    resizeObserver.observe(hostRef.current)

    return () => {
      window.clearInterval(timer)
      resizeObserver.disconnect()
      terminal.dispose()
    }
  }, [themeMode])

  return (
    <div className="panel-shell terminal-shell">
      <div className="panel-title">Terminal (xterm mock stream)</div>
      <div className="terminal-host" ref={hostRef} />
    </div>
  )
}

function App() {
  const MIN_ZOOM = 0.5
  const MAX_ZOOM = 1.8
  const ZOOM_STEP = 0.1
  const BASELINE_CARD_WIDTH = 260
  const LOAD_CARD_WIDTH = 330

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
    const maxX = Math.max(cardPos.x + BASELINE_CARD_WIDTH, loadCardPos.x + LOAD_CARD_WIDTH)
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
                      <div className="canvas-toolbar">
                        <button className="zoom-btn" onClick={zoomOut} type="button" aria-label="Zoom out">-</button>
                        <span className="zoom-text">{Math.round(canvasZoom * 100)}%</span>
                        <button className="zoom-btn" onClick={zoomIn} type="button" aria-label="Zoom in">+</button>
                        <button className="zoom-btn zoom-center" onClick={centerAt100} type="button" aria-label="Center at 100%">100%</button>
                      </div>
                      <div
                        className="canvas-content"
                        style={{ transform: `translate(${canvasOffset.x}px, ${canvasOffset.y}px) scale(${canvasZoom})` }}
                      >
                      <div
                        className={`baseline-card${isDragging ? ' dragging' : ''}`}
                        ref={baselineRef}
                        style={{ left: `${cardPos.x}px`, top: `${cardPos.y}px` }}
                        onPointerDown={handleDragStart}
                      >
                        <div className="baseline-header">
                          <span className="baseline-title">Baseline</span>
                          <button
                            type="button"
                            className={`baseline-lock-btn${isBasecaseLocked ? ' locked' : ''}`}
                            onClick={() => setIsBasecaseLocked((prev) => !prev)}
                            onPointerDown={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                            title={isBasecaseLocked ? 'Unlock configuration' : 'Lock configuration'}
                            aria-label={isBasecaseLocked ? 'Unlock configuration' : 'Lock configuration'}
                          >
                            <LockIcon locked={isBasecaseLocked} />
                            <span>{isBasecaseLocked ? 'Locked' : 'Unlocked'}</span>
                          </button>
                        </div>
                        <div className="baseline-row">
                          <label className="baseline-label" htmlFor="basecase-select">Base case</label>
                          <select
                            id="basecase-select"
                            className="baseline-select"
                            value={selectedBasecase}
                            disabled={isBasecaseLocked}
                            onChange={(event) => setSelectedBasecase(event.target.value)}
                            onPointerDown={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                          >
                            {PANDAPOWER_BASECASES.map((basecase) => (
                              <option key={basecase} value={basecase}>
                                {basecase}
                              </option>
                            ))}
                          </select>
                        </div>
                        <p className="baseline-note">
                          {isBasecaseLocked
                            ? 'Basecase selection is locked to prevent accidental edits.'
                            : 'Basecase selection is unlocked for editing.'}
                        </p>
                      </div>
                      <div
                        className={`load-config-card${isLoadCardDragging ? ' dragging' : ''}`}
                        ref={loadConfigRef}
                        style={{ left: `${loadCardPos.x}px`, top: `${loadCardPos.y}px` }}
                        onPointerDown={handleLoadCardDragStart}
                      >
                        <div className="baseline-header">
                          <span className="baseline-title">Load Config</span>
                          <button
                            type="button"
                            className={`baseline-lock-btn${isLoadConfigLocked ? ' locked' : ''}`}
                            onClick={() => setIsLoadConfigLocked((prev) => !prev)}
                            onPointerDown={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                            title={isLoadConfigLocked ? 'Unlock configuration' : 'Lock configuration'}
                            aria-label={isLoadConfigLocked ? 'Unlock configuration' : 'Lock configuration'}
                          >
                            <LockIcon locked={isLoadConfigLocked} />
                            <span>{isLoadConfigLocked ? 'Locked' : 'Unlocked'}</span>
                          </button>
                        </div>

                        <div className="load-config-grid">
                          <label className="baseline-label" htmlFor="scale-mode-select">Mode</label>
                          <select
                            id="scale-mode-select"
                            className="baseline-select"
                            value={scaleSamplingMode}
                            disabled={isLoadConfigLocked}
                            onChange={(event) => setScaleSamplingMode(event.target.value as ScaleSamplingMode)}
                            onPointerDown={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                          >
                            <option value="truncated_normal">truncated_normal</option>
                            <option value="uniform_bins">uniform_bins</option>
                          </select>

                          <label className="baseline-label" htmlFor="global-scale-mu">Global μ</label>
                          <input
                            id="global-scale-mu"
                            className="load-input"
                            type="number"
                            step="0.01"
                            value={globalScaleMu}
                            disabled={isLoadConfigLocked}
                            onChange={(event) => setGlobalScaleMu(Number(event.target.value))}
                            onPointerDown={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                          />

                          <label className="baseline-label" htmlFor="global-scale-sigma">Global σ</label>
                          <input
                            id="global-scale-sigma"
                            className="load-input"
                            type="number"
                            step="0.01"
                            min="0"
                            value={globalScaleSigma}
                            disabled={isLoadConfigLocked}
                            onChange={(event) => setGlobalScaleSigma(Number(event.target.value))}
                            onPointerDown={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                          />

                          <label className="baseline-label" htmlFor="global-scale-min">Scale min</label>
                          <input
                            id="global-scale-min"
                            className="load-input"
                            type="number"
                            step="0.01"
                            value={globalScaleMin}
                            disabled={isLoadConfigLocked}
                            onChange={(event) => setGlobalScaleMin(Number(event.target.value))}
                            onPointerDown={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                          />

                          <label className="baseline-label" htmlFor="global-scale-max">Scale max</label>
                          <input
                            id="global-scale-max"
                            className="load-input"
                            type="number"
                            step="0.01"
                            value={globalScaleMax}
                            disabled={isLoadConfigLocked}
                            onChange={(event) => setGlobalScaleMax(Number(event.target.value))}
                            onPointerDown={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                          />

                          {scaleSamplingMode === 'uniform_bins' ? (
                            <>
                              <label className="baseline-label" htmlFor="uniform-bins">Uniform bins</label>
                              <input
                                id="uniform-bins"
                                className="load-input"
                                type="number"
                                step="1"
                                min="1"
                                value={scaleUniformBins}
                                disabled={isLoadConfigLocked}
                                onChange={(event) => setScaleUniformBins(Number(event.target.value))}
                                onPointerDown={(event) => event.stopPropagation()}
                                onMouseDown={(event) => event.stopPropagation()}
                              />
                            </>
                          ) : null}

                          <label className="baseline-label" htmlFor="node-noise-sigma">Node noise σ</label>
                          <input
                            id="node-noise-sigma"
                            className="load-input"
                            type="number"
                            step="0.01"
                            min="0"
                            value={nodeNoiseSigma}
                            disabled={isLoadConfigLocked}
                            onChange={(event) => setNodeNoiseSigma(Number(event.target.value))}
                            onPointerDown={(event) => event.stopPropagation()}
                            onMouseDown={(event) => event.stopPropagation()}
                          />
                        </div>

                        <p className="baseline-note">
                          {scaleSamplingMode === 'truncated_normal'
                            ? 'Mode uses truncated normal for global scale with [min, max] bounds.'
                            : 'Mode cycles bins across [min, max], then samples uniformly inside each selected bin.'}
                        </p>
                        {/* TODO(alloy-ui): wire Load Config state to backend DatasetBuildConfig/SampleGenerationConfig payload. */}
                        {/* TODO(alloy-ui): add inline validation for min<max, sigma>0, and bins>=1 with field-level hints. */}
                      </div>
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
      ) : (
        <main className="workbench-main">
          <div className="panel-shell tab2-shell">
            <div className="panel-title">Tab2 - Topology UI Placeholder</div>
            <p>Topology selector will be implemented in the next step.</p>
          </div>
        </main>
      )}
    </div>
  )
}

export default App
