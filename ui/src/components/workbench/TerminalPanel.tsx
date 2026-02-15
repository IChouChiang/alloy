import { useEffect, useRef } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'

import type { ThemeMode } from './types'

type TerminalPanelProps = {
  themeMode: ThemeMode
}

export function TerminalPanel({ themeMode }: TerminalPanelProps) {
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
