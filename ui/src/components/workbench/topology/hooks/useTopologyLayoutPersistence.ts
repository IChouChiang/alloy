import { useEffect, useMemo, useState } from 'react';

import type { TopologyBusNode, TopologyGraphPayload } from '../../types';

const TOPOLOGY_LAYOUT_STORAGE_KEY = 'alloy.topology.case39.layout.v1'

type BusPoint = { x: number; y: number }
type BusPositions = Record<number, BusPoint>

type UseTopologyLayoutPersistenceArgs = {
  graph: TopologyGraphPayload | null
  onGraphReset: () => void
}

type UseTopologyLayoutPersistenceResult = {
  busPositions: BusPositions
  setBusPositions: React.Dispatch<React.SetStateAction<BusPositions>>
  busPositionById: Map<number, BusPoint>
  resetLayout: () => void
}

/**
 * Builds default circular layout for case39 buses.
 *
 * @param buses Bus list from topology graph payload.
 * @returns Bus position map keyed by bus index.
 */
function createDefaultLayout(buses: TopologyBusNode[]): BusPositions {
  const layout: BusPositions = {}
  const centerX = 460
  const centerY = 290
  const radius = 210
  for (const [idx, bus] of buses.entries()) {
    const angle = (idx / buses.length) * Math.PI * 2 - Math.PI / 2
    layout[bus.bus_idx] = {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    }
  }
  return layout
}

/**
 * Persists and restores topology bus layout coordinates.
 *
 * @param args Hook arguments including graph payload and graph-reset callback.
 * @returns Layout state, derived bus-position map, and layout reset handler.
 */
export function useTopologyLayoutPersistence({
  graph,
  onGraphReset,
}: UseTopologyLayoutPersistenceArgs): UseTopologyLayoutPersistenceResult {
  const [busPositions, setBusPositions] = useState<BusPositions>({})

  useEffect(() => {
    if (!graph) {
      setBusPositions({})
      return
    }
    const defaultLayout = createDefaultLayout(graph.buses)
    let restoredLayout = defaultLayout
    try {
      const raw = window.localStorage.getItem(TOPOLOGY_LAYOUT_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, BusPoint>
        const merged: BusPositions = {
          ...defaultLayout,
        }
        for (const [key, point] of Object.entries(parsed)) {
          const busId = Number(key)
          if (Number.isFinite(busId) && merged[busId] != null && point != null) {
            merged[busId] = { x: Number(point.x), y: Number(point.y) }
          }
        }
        restoredLayout = merged
      }
    } catch {
      restoredLayout = defaultLayout
    }
    setBusPositions(restoredLayout)
    onGraphReset()
  }, [graph, onGraphReset])

  useEffect(() => {
    if (graph == null || Object.keys(busPositions).length === 0) {
      return
    }
    try {
      const serialized: Record<string, BusPoint> = {}
      for (const bus of graph.buses) {
        const point = busPositions[bus.bus_idx]
        if (point != null) {
          serialized[String(bus.bus_idx)] = point
        }
      }
      window.localStorage.setItem(
        TOPOLOGY_LAYOUT_STORAGE_KEY,
        JSON.stringify(serialized),
      )
    } catch {
      // Best-effort persistence.
    }
  }, [busPositions, graph])

  const busPositionById = useMemo(() => {
    const positions = new Map<number, BusPoint>()
    if (!graph) {
      return positions
    }
    for (const bus of graph.buses) {
      const point = busPositions[bus.bus_idx]
      if (point != null) {
        positions.set(bus.bus_idx, point)
      }
    }
    return positions
  }, [busPositions, graph])

  const resetLayout = () => {
    if (!graph) {
      return
    }
    setBusPositions(createDefaultLayout(graph.buses))
    onGraphReset()
  }

  return {
    busPositions,
    setBusPositions,
    busPositionById,
    resetLayout,
  }
}
