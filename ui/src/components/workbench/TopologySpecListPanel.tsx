import type {
  TopologySelectionState,
  TopologySpec,
  TopologySplitGroup,
} from './types'

type TopologySpecListPanelProps = {
  assignment: TopologySelectionState
  selectedSpecs: TopologySpec[]
  splitGroupByTopologyId: Record<string, TopologySplitGroup>
  focusedTopologyId: string | null
  onSetFocusedTopologyId: (value: string | null) => void
  onSplitGroupChange: (topologyId: string, group: TopologySplitGroup) => void
  onAssignAllTopologies: (group: TopologySplitGroup) => void
  onRemoveTopologySpec: (topologyId: string) => void
  onResetLayout: () => void
  onResetToBaseline: () => void
}

/**
 * Renders topology spec management panel with split assignment controls.
 *
 * @param props Side-panel state and interaction handlers from editor container.
 * @returns Right-side topology set panel.
 */
export function TopologySpecListPanel({
  assignment,
  selectedSpecs,
  splitGroupByTopologyId,
  focusedTopologyId,
  onSetFocusedTopologyId,
  onSplitGroupChange,
  onAssignAllTopologies,
  onRemoveTopologySpec,
  onResetLayout,
  onResetToBaseline,
}: TopologySpecListPanelProps) {
  return (
    <section className="panel-shell topology-side-panel">
      <div className="panel-title">Topology Set (N + N-1)</div>
      <div className="topology-summary">
        <p>
          Total topologies: <strong>{assignment.specs.length}</strong>
        </p>
        <p>
          Seen: <strong>{assignment.seenTopologyIds.length}</strong>
        </p>
        <p>
          Unseen: <strong>{assignment.unseenTopologyIds.length}</strong>
        </p>
        <p className="topology-summary-hint">
          Hover card to highlight line; click remove to drop one outage.
        </p>
      </div>

      <div className="topology-side-batch">
        <button
          className="topology-btn"
          type="button"
          onClick={() => onAssignAllTopologies('seen')}
          disabled={selectedSpecs.length === 0}
        >
          All seen
        </button>
        <button
          className="topology-btn"
          type="button"
          onClick={() => onAssignAllTopologies('unseen')}
          disabled={selectedSpecs.length === 0}
        >
          All unseen
        </button>
      </div>

      <div className="topology-spec-list">
        <div className="topology-spec-item fixed">
          <div>
            <strong>N</strong>
            <div className="topology-spec-note">
              Baseline topology (fixed, always in seen)
            </div>
          </div>
          <span className="topology-chip">seen</span>
        </div>

        {selectedSpecs.map((spec) => (
          <div
            key={spec.topology_id}
            className={`topology-spec-item${
              focusedTopologyId === spec.topology_id ? ' active' : ''
            }`}
            onMouseEnter={() => onSetFocusedTopologyId(spec.topology_id)}
            onMouseLeave={() => onSetFocusedTopologyId(null)}
          >
            <div>
              <strong>{spec.topology_id}</strong>
              <div className="topology-spec-note">
                outage ({spec.line_outages[0]?.from_bus},{' '}
                {spec.line_outages[0]?.to_bus})
              </div>
            </div>
            <div className="topology-spec-controls">
              <select
                value={splitGroupByTopologyId[spec.topology_id] ?? 'seen'}
                onChange={(event) =>
                  onSplitGroupChange(
                    spec.topology_id,
                    event.target.value as TopologySplitGroup,
                  )
                }
              >
                <option value="seen">seen</option>
                <option value="unseen">unseen</option>
              </select>
              <button
                className="topology-remove-btn"
                type="button"
                onClick={() => onRemoveTopologySpec(spec.topology_id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="topology-side-actions">
        <button className="topology-btn" type="button" onClick={onResetLayout}>
          Reset layout
        </button>
        <button className="topology-btn" type="button" onClick={onResetToBaseline}>
          Reset to N only
        </button>
      </div>
    </section>
  )
}
