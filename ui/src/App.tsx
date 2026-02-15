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
  const [activeTab, setActiveTab] = useState<TabKey>('tab1')
  const [themeMode, setThemeMode] = useState<ThemeMode>('light')
  const canvasRef = useRef<HTMLDivElement | null>(null)
  const baselineRef = useRef<HTMLDivElement | null>(null)
  const dragState = useRef<{ isDragging: boolean; offsetX: number; offsetY: number }>({
    isDragging: false,
    offsetX: 0,
    offsetY: 0,
  })
  const [cardPos, setCardPos] = useState<Point>({ x: 24, y: 24 })
  const [isDragging, setIsDragging] = useState(false)

  const handlePointerMove = useCallback((event: PointerEvent) => {
    if (!dragState.current.isDragging || !canvasRef.current) {
      return
    }
    const containerRect = canvasRef.current.getBoundingClientRect()
    const targetRect = baselineRef.current?.getBoundingClientRect()
    const proposedX = event.clientX - containerRect.left - dragState.current.offsetX
    const proposedY = event.clientY - containerRect.top - dragState.current.offsetY
    const maxX = targetRect ? containerRect.width - targetRect.width : containerRect.width
    const maxY = targetRect ? containerRect.height - targetRect.height : containerRect.height
    setCardPos({
      x: Math.min(Math.max(0, proposedX), Math.max(0, maxX)),
      y: Math.min(Math.max(0, proposedY), Math.max(0, maxY)),
    })
  }, [])

  const handlePointerUp = useCallback(() => {
    if (!dragState.current.isDragging) {
      return
    }
    dragState.current.isDragging = false
    setIsDragging(false)
    window.removeEventListener('pointermove', handlePointerMove)
    window.removeEventListener('pointerup', handlePointerUp)
  }, [handlePointerMove])

  useEffect(() => {
    return () => {
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerup', handlePointerUp)
    }
  }, [handlePointerMove, handlePointerUp])

  const handleDragStart = (event: React.PointerEvent<HTMLDivElement>) => {
    if (!canvasRef.current || !baselineRef.current) {
      return
    }
    event.preventDefault()
    const cardRect = baselineRef.current.getBoundingClientRect()
    dragState.current.isDragging = true
    setIsDragging(true)
    dragState.current.offsetX = event.clientX - cardRect.left
    dragState.current.offsetY = event.clientY - cardRect.top
    window.addEventListener('pointermove', handlePointerMove)
    window.addEventListener('pointerup', handlePointerUp)
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
                    <div className="canvas-placeholder" ref={canvasRef}>
                      <div className="canvas-box">
                        Pipeline canvas placeholder
                      </div>
                      <div
                        className={`baseline-card${isDragging ? ' dragging' : ''}`}
                        ref={baselineRef}
                        style={{ left: `${cardPos.x}px`, top: `${cardPos.y}px` }}
                        onPointerDown={handleDragStart}
                      >
                        <div className="baseline-header">
                          <span className="baseline-title">Baseline</span>
                          <span className="baseline-badge">Locked</span>
                        </div>
                        <div className="baseline-row">
                          <span className="baseline-label">Base case</span>
                          <span className="baseline-value">IEEE 39-bus</span>
                        </div>
                        <p className="baseline-note">Case39 is the only configured option right now.</p>
                      </div>
                      <p>Next iteration: add sample-generation parameter nodes.</p>
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
