import { useEffect, useState } from 'react'

import type {
    TopologyGraphPayload,
    TopologySelectionState,
    TopologySpec,
    TopologySplitGroup,
    TopologyVisualEdge,
} from '../../types.ts'
import { loadCase39TopologyGraph, validateTopologySpecs } from '../api/topologyApi.ts'
import {
    deriveEditableStateFromSelection,
    useTopologyAssignment,
} from './useTopologyAssignment.ts'

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

    const loadGraph = async () => {
      try {
        const result = await loadCase39TopologyGraph()
        const payload = result.payload
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
    const editableState = deriveEditableStateFromSelection(selection)
    setSelectedLineIds(editableState.selectedLineIds)
    setSplitGroupByTopologyId(editableState.splitGroupByTopologyId)
  }, [selection])
  const { visualEdges, generatedSpecs, assignment, selectedSpecs } =
    useTopologyAssignment({
      graph,
      selectedLineIds,
      splitGroupByTopologyId,
    })

  const validateSpecs = async (specs: TopologySpec[]) => {
    return validateTopologySpecs(specs, apiBaseUrl)
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
