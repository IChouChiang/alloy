"""Minimal FastAPI service for topology selection GUI."""

from __future__ import annotations

from dataclasses import asdict
from pathlib import Path
from typing import Any, cast

import pandapower.networks as pn
from pandapower.auxiliary import pandapowerNet
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import RedirectResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field

from alloy.data.sample_generation import LineOutageSpec, TopologySpec


class ValidateSpecsRequest(BaseModel):
    """Request payload for topology-spec validation."""

    topology_specs: list[dict[str, Any]] = Field(default_factory=list)


class ValidateSpecsResponse(BaseModel):
    """Response payload for topology-spec validation."""

    ok: bool
    normalized_topology_specs: list[dict[str, Any]] = Field(default_factory=list)
    message: str


class LineOption(BaseModel):
    """One selectable line option for topology GUI."""

    line_idx: int
    from_bus: int
    to_bus: int
    name: str


class BusNode(BaseModel):
    """One bus node with inferred role for topology visualization."""

    bus_idx: int
    name: str
    kind: str


class Case39GraphResponse(BaseModel):
    """Case39 graph payload for visual topology editor."""

    buses: list[BusNode]
    lines: list[LineOption]
    edges: list["GraphEdge"]


class GraphEdge(BaseModel):
    """Visual graph edge returned to topology editor."""

    edge_id: str
    kind: str
    from_bus: int
    to_bus: int
    name: str
    line_idx: int | None = None


def _infer_bus_kind(net: pandapowerNet, bus_idx: int) -> str:
    """Infer visual node kind from pandapower tables.

    Args:
        net: Baseline pandapower net.
        bus_idx: Bus index.

    Returns:
        Node kind label for UI coloring.
    """
    if not net.ext_grid.empty and int(bus_idx) in net.ext_grid["bus"].to_numpy():
        return "slack"
    if not net.gen.empty and int(bus_idx) in net.gen["bus"].to_numpy():
        return "gen"
    if not net.load.empty and int(bus_idx) in net.load["bus"].to_numpy():
        return "load"
    return "bus"


def _case39_bus_nodes() -> list[BusNode]:
    """Build case39 bus-node metadata for topology visualization.

    Returns:
        Sorted bus-node list by bus index.
    """
    net = cast(pandapowerNet, pn.case39())
    nodes: list[BusNode] = []
    for bus_idx, row in net.bus.iterrows():
        idx = int(bus_idx)
        nodes.append(
            BusNode(
                bus_idx=idx,
                name=str(row.get("name") or f"bus-{idx}"),
                kind=_infer_bus_kind(net, idx),
            )
        )
    nodes.sort(key=lambda item: item.bus_idx)
    return nodes


def _resolve_outage_line_indices(
    net: pandapowerNet, line_outages: tuple[LineOutageSpec, ...]
) -> set[int]:
    """Resolve outage endpoint pairs into concrete baseline line indices.

    Args:
        net: Baseline network.
        line_outages: Outage endpoint pairs.

    Returns:
        Set of line indices to remove.

    Raises:
        ValueError: If an outage pair does not match any line.
    """
    blocked: set[int] = set()
    for outage in line_outages:
        from_bus = int(outage.from_bus)
        to_bus = int(outage.to_bus)
        mask_forward = (net.line["from_bus"] == from_bus) & (
            net.line["to_bus"] == to_bus
        )
        mask_reverse = (net.line["from_bus"] == to_bus) & (
            net.line["to_bus"] == from_bus
        )
        matched = net.line.index[mask_forward | mask_reverse]
        if len(matched) == 0:
            raise ValueError(
                f"Line outage ({from_bus}, {to_bus}) not found in case39 baseline."
            )
        for line_idx in matched:
            blocked.add(int(line_idx))
    return blocked


def _is_connected_without_islands(
    net: pandapowerNet, blocked_line_indices: set[int]
) -> bool:
    """Check whether remaining grid stays fully connected.

    Connectivity graph includes active line edges and transformer edges.

    Args:
        net: Baseline network.
        blocked_line_indices: Removed line indices.

    Returns:
        True when all buses remain in one connected component.
    """
    bus_ids = [int(item) for item in net.bus.index.to_numpy()]
    if not bus_ids:
        return True

    adjacency: dict[int, set[int]] = {bus: set() for bus in bus_ids}

    for line_idx, row in net.line.iterrows():
        idx = int(line_idx)
        if idx in blocked_line_indices:
            continue
        from_bus = int(row["from_bus"])
        to_bus = int(row["to_bus"])
        adjacency[from_bus].add(to_bus)
        adjacency[to_bus].add(from_bus)

    if not net.trafo.empty:
        for _, row in net.trafo.iterrows():
            hv_bus = int(row["hv_bus"])
            lv_bus = int(row["lv_bus"])
            adjacency[hv_bus].add(lv_bus)
            adjacency[lv_bus].add(hv_bus)

    if not net.trafo3w.empty:
        for _, row in net.trafo3w.iterrows():
            hv_bus = int(row["hv_bus"])
            mv_bus = int(row["mv_bus"])
            lv_bus = int(row["lv_bus"])
            triples = ((hv_bus, mv_bus), (hv_bus, lv_bus), (mv_bus, lv_bus))
            for left, right in triples:
                adjacency[left].add(right)
                adjacency[right].add(left)

    start = bus_ids[0]
    visited: set[int] = {start}
    stack = [start]
    while stack:
        node = stack.pop()
        for neighbor in adjacency[node]:
            if neighbor not in visited:
                visited.add(neighbor)
                stack.append(neighbor)

    return len(visited) == len(bus_ids)


def _case39_line_options() -> list[LineOption]:
    """Build selectable case39 line options for GUI.

    Returns:
        Sorted line options by line index.
    """
    net = cast(pandapowerNet, pn.case39())
    options: list[LineOption] = []
    for line_idx, row in net.line.iterrows():
        from_bus = int(row["from_bus"])
        to_bus = int(row["to_bus"])
        options.append(
            LineOption(
                line_idx=int(line_idx),
                from_bus=from_bus,
                to_bus=to_bus,
                name=f"line-{line_idx}: {from_bus} -> {to_bus}",
            )
        )
    options.sort(key=lambda item: item.line_idx)
    return options


def _case39_graph_edges() -> list[GraphEdge]:
    """Build full visual edge list (lines + transformers) for case39 graph.

    Returns:
        Sorted edge list by edge_id.
    """
    net = cast(pandapowerNet, pn.case39())
    edges: list[GraphEdge] = []

    for line_idx, row in net.line.iterrows():
        idx = int(line_idx)
        from_bus = int(row["from_bus"])
        to_bus = int(row["to_bus"])
        edges.append(
            GraphEdge(
                edge_id=f"line-{idx}",
                kind="line",
                from_bus=from_bus,
                to_bus=to_bus,
                name=f"line-{idx}: {from_bus} -> {to_bus}",
                line_idx=idx,
            )
        )

    for trafo_idx, row in net.trafo.iterrows():
        idx = int(trafo_idx)
        hv_bus = int(row["hv_bus"])
        lv_bus = int(row["lv_bus"])
        edges.append(
            GraphEdge(
                edge_id=f"trafo-{idx}",
                kind="trafo",
                from_bus=hv_bus,
                to_bus=lv_bus,
                name=f"trafo-{idx}: {hv_bus} -> {lv_bus}",
                line_idx=None,
            )
        )

    for trafo3w_idx, row in net.trafo3w.iterrows():
        idx = int(trafo3w_idx)
        hv_bus = int(row["hv_bus"])
        mv_bus = int(row["mv_bus"])
        lv_bus = int(row["lv_bus"])
        pairs = ((hv_bus, mv_bus), (hv_bus, lv_bus), (mv_bus, lv_bus))
        for pair_idx, (left, right) in enumerate(pairs):
            edges.append(
                GraphEdge(
                    edge_id=f"trafo3w-{idx}-{pair_idx}",
                    kind="trafo3w",
                    from_bus=left,
                    to_bus=right,
                    name=f"trafo3w-{idx}: {left} -> {right}",
                    line_idx=None,
                )
            )

    edges.sort(key=lambda item: item.edge_id)
    return edges


def _normalize_topology_specs(payload: list[dict[str, Any]]) -> list[TopologySpec]:
    """Normalize and validate incoming topology specs from GUI.

    Args:
        payload: Raw topology-spec list.

    Returns:
        Normalized `TopologySpec` list.

    Raises:
        ValueError: If payload is malformed.
    """
    normalized: list[TopologySpec] = []
    for item in payload:
        if not isinstance(item, dict):
            raise ValueError("Each topology spec must be an object.")
        topology_id = str(item.get("topology_id", "")).strip()
        if topology_id == "":
            raise ValueError("Each topology spec must contain a non-empty topology_id.")

        raw_outages = item.get("line_outages", [])
        if not isinstance(raw_outages, list):
            raise ValueError("line_outages must be a list.")

        outages: list[LineOutageSpec] = []
        for raw_outage in raw_outages:
            if not isinstance(raw_outage, dict):
                raise ValueError("Each line outage must be an object.")
            if "from_bus" not in raw_outage or "to_bus" not in raw_outage:
                raise ValueError("Line outage must include from_bus and to_bus.")
            outages.append(
                LineOutageSpec(
                    from_bus=int(raw_outage["from_bus"]),
                    to_bus=int(raw_outage["to_bus"]),
                )
            )

        normalized.append(
            TopologySpec(topology_id=topology_id, line_outages=tuple(outages))
        )

    ids = [spec.topology_id for spec in normalized]
    if len(ids) != len(set(ids)):
        raise ValueError("Duplicated topology_id values are not allowed.")

    base_net = cast(pandapowerNet, pn.case39())
    for spec in normalized:
        blocked = _resolve_outage_line_indices(base_net, spec.line_outages)
        if not _is_connected_without_islands(base_net, blocked):
            raise ValueError(
                f"Topology {spec.topology_id} introduces islands and is not allowed."
            )
    return normalized


def create_app() -> FastAPI:
    """Create FastAPI app for topology GUI.

    Returns:
        Configured FastAPI app.
    """
    app = FastAPI(title="Alloy Topology GUI API", version="0.1.0")
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    static_dir = Path(__file__).resolve().parent / "static"
    app.mount("/static", StaticFiles(directory=static_dir), name="static")

    @app.get("/")
    def root() -> RedirectResponse:
        return RedirectResponse(url="/static/topology_gui.html")

    @app.get("/api/topology/case39/lines", response_model=list[LineOption])
    def get_case39_lines() -> list[LineOption]:
        return _case39_line_options()

    @app.get("/api/topology/case39/graph", response_model=Case39GraphResponse)
    def get_case39_graph() -> Case39GraphResponse:
        return Case39GraphResponse(
            buses=_case39_bus_nodes(),
            lines=_case39_line_options(),
            edges=_case39_graph_edges(),
        )

    @app.post("/api/topology/specs/validate", response_model=ValidateSpecsResponse)
    def validate_topology_specs(
        request: ValidateSpecsRequest,
    ) -> ValidateSpecsResponse:
        try:
            normalized = _normalize_topology_specs(request.topology_specs)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail=str(exc)) from exc

        return ValidateSpecsResponse(
            ok=True,
            normalized_topology_specs=[asdict(spec) for spec in normalized],
            message="Topology specs are valid.",
        )

    return app


app = create_app()
