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
