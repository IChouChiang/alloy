import { useEffect, useRef } from 'react'
import { Terminal } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'

import type { ThemeMode } from './types'

/** Props for the terminal panel. */
type TerminalPanelProps = {
  /** Active UI theme, used to align terminal color palette. */
  themeMode: ThemeMode
}

/**
 * XTerm-based terminal panel with a short-lived mock heartbeat stream.
 *
 * Re-initializes terminal instance when theme changes to keep colors consistent.
 */
export function TerminalPanel({ themeMode }: TerminalPanelProps) {
  const hostRef = useRef<HTMLDivElement | null>(null)

  /** Creates terminal instance, binds resize fit, and disposes resources on cleanup. */
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

    /** Writes one heartbeat line and stops stream after the third tick. */
    const writeHeartbeatLog = () => {
      terminal.writeln(`[mock-log] heartbeat ${tick} | tab1 shell running`)
      tick += 1
      if (tick > 3) {
        terminal.writeln('[mock-log] heartbeat completed (3/3), stopping stream.')
        window.clearInterval(timer)
      }
    }

    const timer = window.setInterval(writeHeartbeatLog, 1400)

    /** Fits terminal columns/rows to the host container size. */
    const handleHostResize = () => {
      fitAddon.fit()
    }

    const resizeObserver = new ResizeObserver(handleHostResize)
    resizeObserver.observe(hostRef.current)

    /** Releases interval, observer, and xterm resources on effect teardown. */
    const cleanupTerminalResources = () => {
      window.clearInterval(timer)
      resizeObserver.disconnect()
      terminal.dispose()
    }

    return cleanupTerminalResources
  }, [themeMode])

  return (
    <div className="panel-shell terminal-shell">
      <div className="panel-title">Terminal (xterm mock stream)</div>
      <div className="terminal-host" ref={hostRef} />
    </div>
  )
}
