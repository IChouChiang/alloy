import { useEffect, useMemo, useState } from 'react'

import type {
  TopologyGraphPayload,
  TopologySelectionState,
  TopologySpec,
  TopologySplitGroup,
  TopologyVisualEdge,
} from '../types'

const TOPOLOGY_API_BASE_CANDIDATES = ['', 'http://localhost:8000', 'http://127.0.0.1:8000'] as const

/** Default topology selection with baseline `N` only. */
export const EMPTY_TOPOLOGY_SELECTION: TopologySelectionState = {
  specs: [{ topology_id: 'N', line_outages: [] }],
  seenTopologyIds: ['N'],
  unseenTopologyIds: [],
}

type UseTopologyGraphDataArgs = {
  selection: TopologySelectionState
}

type UseTopologyGraphDataResult = {
  graph: TopologyGraphPayload | null
  status: string
  setStatus: React.Dispatch<React.SetStateAction<string>>
  graphLoadError: string | null
  isSaving: boolean
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>
  selectedLineIds: Set<number>
  setSelectedLineIds: React.Dispatch<React.SetStateAction<Set<number>>>
  splitGroupByTopologyId: Record<string, TopologySplitGroup>
  setSplitGroupByTopologyId: React.Dispatch<
    React.SetStateAction<Record<string, TopologySplitGroup>>
  >
  visualEdges: TopologyVisualEdge[]
  assignment: TopologySelectionState
  selectedSpecs: TopologySpec[]
  validateSpecs: (specs: TopologySpec[]) => Promise<unknown>
  toggleLineSelection: (line: TopologyVisualEdge) => Promise<void>
  handleSplitGroupChange: (topologyId: string, group: TopologySplitGroup) => void
  assignAllTopologies: (group: TopologySplitGroup) => void
  removeTopologySpec: (
    topologyId: string,
    focusedTopologyId: string | null,
    onFocusClear: () => void,
  ) => void
}

/**
 * Manages topology graph loading, spec assignment, and backend validation state.
 *
 * @param args Hook input including persisted selection from app state.
 * @returns Graph payload, computed assignments, and topology mutation handlers.
 */
export function useTopologyGraphData({
  selection,
}: UseTopologyGraphDataArgs): UseTopologyGraphDataResult {
  const [graph, setGraph] = useState<TopologyGraphPayload | null>(null)
  const [status, setStatus] = useState('Loading case39 graph...')
  const [graphLoadError, setGraphLoadError] = useState<string | null>(null)
  const [apiBaseUrl, setApiBaseUrl] = useState<string>('')
  const [isSaving, setIsSaving] = useState(false)
  const [selectedLineIds, setSelectedLineIds] = useState<Set<number>>(new Set())
  const [splitGroupByTopologyId, setSplitGroupByTopologyId] = useState<
    Record<string, TopologySplitGroup>
  >({})

  useEffect(() => {
    let active = true

    const fetchJsonWithFallback = async <T,>(
      path: string,
      init?: RequestInit,
    ): Promise<{ data: T; baseUrl: string }> => {
      let lastError = 'unknown error'
      for (const baseUrl of TOPOLOGY_API_BASE_CANDIDATES) {
        const requestUrl = `${baseUrl}${path}`
        try {
          const response = await fetch(requestUrl, init)
          if (!response.ok) {
            lastError = `${requestUrl} -> HTTP ${response.status}`
            continue
          }
          const data = (await response.json()) as T
          return { data, baseUrl }
        } catch (error) {
          lastError = `${requestUrl} -> ${String(error)}`
        }
      }
      throw new Error(lastError)
    }

    const loadGraph = async () => {
      try {
        const result = await fetchJsonWithFallback<TopologyGraphPayload>(
          '/api/topology/case39/graph',
        )
        const payload = result.data
        if (!active) {
          return
        }
        setApiBaseUrl(result.baseUrl)
        setGraph(payload)
        setGraphLoadError(null)
        setStatus(
          `Graph loaded: ${payload.buses.length} buses, ${payload.lines.length} lines.`,
        )
      } catch (error) {
        if (!active) {
          return
        }
        const message = `Graph load failed: ${String(error)}`
        setGraphLoadError(message)
        setStatus(message)
      }
    }

    void loadGraph()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (selection.specs.length === 0) {
      setSelectedLineIds(new Set())
      setSplitGroupByTopologyId({})
      return
    }

    const nextSelected = new Set<number>()
    const nextGroups: Record<string, TopologySplitGroup> = {}

    for (const spec of selection.specs) {
      if (spec.topology_id === 'N') {
        continue
      }
      const line = spec.line_outages[0]
      if (line == null) {
        continue
      }
      const idPart = spec.topology_id.split('_')[1]
      const parsed = Number(idPart)
      if (Number.isFinite(parsed)) {
        nextSelected.add(parsed)
      }
      nextGroups[spec.topology_id] = selection.unseenTopologyIds.includes(
        spec.topology_id,
      )
        ? 'unseen'
        : 'seen'
    }

    setSelectedLineIds(nextSelected)
    setSplitGroupByTopologyId(nextGroups)
  }, [selection])

  const lineById = useMemo(() => {
    if (!graph) {
      return new Map<number, TopologyVisualEdge>()
    }
    return new Map(graph.lines.map((line) => [line.line_idx, line]))
  }, [graph])

  const visualEdges = useMemo<TopologyVisualEdge[]>(() => {
    if (!graph) {
      return []
    }
    if (graph.edges && graph.edges.length > 0) {
      return graph.edges
    }
    return graph.lines.map((line) => ({
      edge_id: `line-${line.line_idx}`,
      kind: 'line',
      from_bus: line.from_bus,
      to_bus: line.to_bus,
      name: line.name,
      line_idx: line.line_idx,
    }))
  }, [graph])

  const selectedLines = useMemo(() => {
    return [...selectedLineIds]
      .map((lineId) => lineById.get(lineId))
      .filter(
        (line): line is TopologyVisualEdge & { line_idx: number } =>
          line != null && line.line_idx != null,
      )
      .sort((left, right) => left.line_idx - right.line_idx)
  }, [lineById, selectedLineIds])

  const generatedSpecs = useMemo<TopologySpec[]>(() => {
    const specs: TopologySpec[] = [{ topology_id: 'N', line_outages: [] }]
    for (const line of selectedLines) {
      specs.push({
        topology_id: `N-1_${line.line_idx}_${line.from_bus}_${line.to_bus}`,
        line_outages: [{ from_bus: line.from_bus, to_bus: line.to_bus }],
      })
    }
    return specs
  }, [selectedLines])

  const assignment = useMemo<TopologySelectionState>(() => {
    const seen = ['N']
    const unseen: string[] = []
    for (const spec of generatedSpecs) {
      if (spec.topology_id === 'N') {
        continue
      }
      const group = splitGroupByTopologyId[spec.topology_id] ?? 'seen'
      if (group === 'unseen') {
        unseen.push(spec.topology_id)
      } else {
        seen.push(spec.topology_id)
      }
    }
    return {
      specs: generatedSpecs,
      seenTopologyIds: seen,
      unseenTopologyIds: unseen,
    }
  }, [generatedSpecs, splitGroupByTopologyId])

  const selectedSpecs = useMemo(() => {
    return assignment.specs.filter((spec) => spec.topology_id !== 'N')
  }, [assignment.specs])

  const validateSpecs = async (specs: TopologySpec[]) => {
    const candidates =
      apiBaseUrl !== '' ? [apiBaseUrl] : [...TOPOLOGY_API_BASE_CANDIDATES]
    let lastError = 'unknown error'
    for (const baseUrl of candidates) {
      const requestUrl = `${baseUrl}/api/topology/specs/validate`
      try {
        const response = await fetch(requestUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ topology_specs: specs }),
        })
        if (!response.ok) {
          const payload = await response
            .json()
            .catch(() => ({ detail: response.statusText }))
          lastError = `${requestUrl} -> ${String(
            payload.detail ?? response.statusText,
          )}`
          continue
        }
        return response.json()
      } catch (error) {
        lastError = `${requestUrl} -> ${String(error)}`
      }
    }
    throw new Error(lastError)
  }

  const toggleLineSelection = async (line: TopologyVisualEdge) => {
    if (line.kind !== 'line' || line.line_idx == null) {
      return
    }
    const isSelected = selectedLineIds.has(line.line_idx)

    if (isSelected) {
      const lineIdx = line.line_idx
      setSelectedLineIds((prev) => {
        const next = new Set(prev)
        next.delete(lineIdx)
        return next
      })
      setStatus(`Removed ${line.name} from topology list.`)
      return
    }

    const candidateSpecs: TopologySpec[] = [
      ...generatedSpecs,
      {
        topology_id: `N-1_${line.line_idx}_${line.from_bus}_${line.to_bus}`,
        line_outages: [{ from_bus: line.from_bus, to_bus: line.to_bus }],
      },
    ]

    setStatus(`Checking connectivity for ${line.name}...`)
    try {
      const lineIdx = line.line_idx
      await validateSpecs(candidateSpecs)
      setSelectedLineIds((prev) => new Set(prev).add(lineIdx))
      setStatus(`Added ${line.name}.`)
    } catch (error) {
      setStatus(`Cannot add ${line.name}: ${String(error)}`)
    }
  }

  const handleSplitGroupChange = (
    topologyId: string,
    group: TopologySplitGroup,
  ) => {
    setSplitGroupByTopologyId((prev) => ({
      ...prev,
      [topologyId]: group,
    }))
  }

  const assignAllTopologies = (group: TopologySplitGroup) => {
    const next: Record<string, TopologySplitGroup> = {}
    for (const spec of selectedSpecs) {
      next[spec.topology_id] = group
    }
    setSplitGroupByTopologyId(next)
    setStatus(`Assigned ${selectedSpecs.length} N-1 topologies to ${group}.`)
  }

  const removeTopologySpec = (
    topologyId: string,
    focusedTopologyId: string | null,
    onFocusClear: () => void,
  ) => {
    const parsed = Number(topologyId.split('_')[1])
    if (!Number.isFinite(parsed)) {
      return
    }
    setSelectedLineIds((prev) => {
      const next = new Set(prev)
      next.delete(parsed)
      return next
    })
    setSplitGroupByTopologyId((prev) => {
      const next = { ...prev }
      delete next[topologyId]
      return next
    })
    if (focusedTopologyId === topologyId) {
      onFocusClear()
    }
    setStatus(`Removed ${topologyId} from topology set.`)
  }

  return {
    graph,
    status,
    setStatus,
    graphLoadError,
    isSaving,
    setIsSaving,
    selectedLineIds,
    setSelectedLineIds,
    splitGroupByTopologyId,
    setSplitGroupByTopologyId,
    visualEdges,
    assignment,
    selectedSpecs,
    validateSpecs,
    toggleLineSelection,
    handleSplitGroupChange,
    assignAllTopologies,
    removeTopologySpec,
  }
}
