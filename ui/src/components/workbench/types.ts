/** Top-level workbench tabs. */
export type TabKey = 'tab1' | 'tab2'

/** UI theme mode applied to workbench and panels. */
export type ThemeMode = 'light' | 'dark'

/** 2D point in canvas/world coordinates. */
export type Point = {
  /** Horizontal coordinate. */
  x: number
  /** Vertical coordinate. */
  y: number
}

/**
 * Global load-scale sampling strategy.
 *
 * - `truncated_normal`: sample from N(μ,σ) and reject outside bounds.
 * - `uniform_bins`: cycle bins within bounds then sample uniformly in selected bin.
 */
export type ScaleSamplingMode = 'truncated_normal' | 'uniform_bins'

/** Stable card identifiers used by registry and wiring logic. */
export type CardId =
  | 'case_select'
  | 'load_config'
  | 'renewable_config'
  | 'feature_construction'
  | 'data_split'
  | 'topology_sampling'
  | 'build_runtime'

/** Port direction in the card graph. */
export type PortDirection = 'input' | 'output'

/**
 * Port metadata for a card.
 *
 * This structure is used for UI rendering and future graph validation.
 */
export type PortSpec = {
  /** Unique port key within a card definition. */
  id: string
  /** Whether the port receives or emits data. */
  direction: PortDirection
  /** Human-readable port label shown in UI/tooling. */
  label: string
}

/**
 * Card metadata definition used by the workbench registry.
 *
 * Keeps card identity, presentation hints, and wiring contract in one place.
 */
export type CardDefinition = {
  /** Stable card ID. */
  id: CardId
  /** Display title for card header. */
  title: string
  /** Card family for compatibility filtering and grouping. */
  family: 'core'
  /** Whether the card must exist in a valid pipeline. */
  required: boolean
  /** Default card width in pixels for layout/wiring calculations. */
  width: number
  /** Declared input/output ports for this card. */
  ports: PortSpec[]
}

/** Visual category for one bus node in topology graph. */
export type TopologyBusKind = 'slack' | 'gen' | 'load' | 'bus'

/** Bus node metadata from topology graph API. */
export type TopologyBusNode = {
  /** Bus index in pandapower network. */
  bus_idx: number
  /** Human-readable bus label. */
  name: string
  /** Visual category used by node styling. */
  kind: TopologyBusKind
}

/** Line edge metadata from topology graph API. */
export type TopologyLineEdge = {
  /** Stable line index in pandapower baseline network. */
  line_idx: number
  /** Endpoint bus index A. */
  from_bus: number
  /** Endpoint bus index B. */
  to_bus: number
  /** Display label for UI. */
  name: string
}

/** Edge category in visual topology graph. */
export type TopologyEdgeKind = 'line' | 'trafo' | 'trafo3w'

/** Generic visual edge metadata in topology graph. */
export type TopologyVisualEdge = {
  /** Stable graph edge identifier. */
  edge_id: string
  /** Edge category used by styling and interaction rules. */
  kind: TopologyEdgeKind
  /** Endpoint bus index A. */
  from_bus: number
  /** Endpoint bus index B. */
  to_bus: number
  /** Display label. */
  name: string
  /** Optional line index for selectable outage edges. */
  line_idx?: number
}

/** Graph payload returned by case39 topology API. */
export type TopologyGraphPayload = {
  /** Bus node list. */
  buses: TopologyBusNode[]
  /** Selectable line edge list used for outage specs. */
  lines: TopologyLineEdge[]
  /** Full visual edge list including transformers. */
  edges: TopologyVisualEdge[]
}

/** One line outage object in topology spec. */
export type LineOutageSpec = {
  /** Outage endpoint bus index A. */
  from_bus: number
  /** Outage endpoint bus index B. */
  to_bus: number
}

/** One topology object sent to backend validation/dataset build config. */
export type TopologySpec = {
  /** Unique topology identifier, for example N or N-1_1_4_14. */
  topology_id: string
  /** Outage line list for this topology. */
  line_outages: LineOutageSpec[]
}

/** Split group where topology is used during dataset construction. */
export type TopologySplitGroup = 'seen' | 'unseen'

/** Persisted topology editor output consumed by app-level state. */
export type TopologySelectionState = {
  /** Full topology list including baseline N. */
  specs: TopologySpec[]
  /** Topology IDs assigned to train/val/test_seen pool. */
  seenTopologyIds: string[]
  /** Topology IDs assigned to test_unseen pool. */
  unseenTopologyIds: string[]
}

/** Target counts for topology split assignment (seen includes baseline N). */
export type TopologyTargetCounts = {
  /** Required count of seen topology IDs (including baseline N). */
  seen: number
  /** Required count of unseen topology IDs. */
  unseen: number
}

/** Topology-spec selection strategy for sample generation. */
export type TopologySamplingMode = 'uniform_random' | 'uniform_cycle'
