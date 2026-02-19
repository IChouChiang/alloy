import { useMemo } from 'react'

import type {
    TopologyGraphPayload,
    TopologySelectionState,
    TopologySpec,
    TopologySplitGroup,
    TopologyVisualEdge,
} from '../../types'

type UseTopologyAssignmentArgs = {
  graph: TopologyGraphPayload | null
  selectedLineIds: Set<number>
  splitGroupByTopologyId: Record<string, TopologySplitGroup>
}

type UseTopologyAssignmentResult = {
  visualEdges: TopologyVisualEdge[]
  generatedSpecs: TopologySpec[]
  assignment: TopologySelectionState
  selectedSpecs: TopologySpec[]
}

type EditableSelectionState = {
  selectedLineIds: Set<number>
  splitGroupByTopologyId: Record<string, TopologySplitGroup>
}

/**
 * Maps persisted selection from app state into editable line/group state.
 *
 * @param selection Persisted topology selection.
 * @returns Editable state for selected line ids and split-group mapping.
 */
export function deriveEditableStateFromSelection(
  selection: TopologySelectionState,
): EditableSelectionState {
  if (selection.specs.length === 0) {
    return {
      selectedLineIds: new Set(),
      splitGroupByTopologyId: {},
    }
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

  return {
    selectedLineIds: nextSelected,
    splitGroupByTopologyId: nextGroups,
  }
}

/**
 * Derives visual edges and split assignment from graph and local selection state.
 *
 * @param args Graph and editable selection state.
 * @returns Visual edges and computed topology assignment payload.
 */
export function useTopologyAssignment({
  graph,
  selectedLineIds,
  splitGroupByTopologyId,
}: UseTopologyAssignmentArgs): UseTopologyAssignmentResult {
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

  return {
    visualEdges,
    generatedSpecs,
    assignment,
    selectedSpecs,
  }
}
