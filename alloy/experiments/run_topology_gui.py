"""Run minimal FastAPI topology GUI service."""

from __future__ import annotations

import argparse

import uvicorn


def main() -> None:
    """Run topology GUI server.

    Args:
        None.

    Returns:
        None.
    """
    parser = argparse.ArgumentParser(description="Run Alloy topology GUI API server.")
    parser.add_argument("--host", type=str, default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8008)
    parser.add_argument("--reload", action="store_true")
    args = parser.parse_args()

    uvicorn.run(
        "alloy.web.topology_api:app",
        host=args.host,
        port=args.port,
        reload=args.reload,
        log_level="info",
    )


if __name__ == "__main__":
    main()
