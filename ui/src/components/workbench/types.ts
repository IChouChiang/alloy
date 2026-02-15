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
 * - `bounded_uniform`: sample uniformly within bounds.
 */
export type ScaleSamplingMode = 'truncated_normal' | 'uniform_bins' | 'bounded_uniform'

/** Stable card identifiers used by registry and wiring logic. */
export type CardId = 'case_select' | 'load_config'

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
