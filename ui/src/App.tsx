import { useEffect, useRef, useState } from 'react'
import { Group, Panel, Separator } from 'react-resizable-panels'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import 'xterm/css/xterm.css'
import './App.css'

type TabKey = 'tab1' | 'tab2'

type ChatMessage = {
  role: 'user' | 'assistant'
  text: string
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

function TerminalPanel() {
  const hostRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!hostRef.current) {
      return
    }

    const terminal = new Terminal({
      convertEol: true,
      cursorBlink: true,
      theme: {
        background: '#05070d',
        foreground: '#d4d8e8',
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
  }, [])

  return (
    <div className="panel-shell terminal-shell">
      <div className="panel-title">Terminal (xterm mock stream)</div>
      <div className="terminal-host" ref={hostRef} />
    </div>
  )
}

function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('tab1')

  return (
    <div className="app-root">
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
      </header>

      {activeTab === 'tab1' ? (
        <main className="workbench-main">
          <Group orientation="vertical">
            <Panel defaultSize={72} minSize={35}>
              <Group orientation="horizontal">
                <Panel defaultSize={72} minSize={35}>
                  <div className="panel-shell canvas-shell">
                    <div className="panel-title">Center Canvas (UI Shell)</div>
                    <div className="canvas-placeholder">
                      <div className="canvas-box">
                        Pipeline canvas placeholder
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
              <TerminalPanel />
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
