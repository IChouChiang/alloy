"""Compatibility wrapper for re-evaluating completed runs.

Prefer using `alloy.experiments.reevaluate_benchmark` for configurable
benchmark entrypoint selection.
"""

from __future__ import annotations

import argparse
from pathlib import Path

from alloy.experiments.reevaluate_benchmark import reevaluate_benchmark


def reevaluate_run(run_dir: Path) -> dict[str, float]:
    """Re-evaluate a completed run directory.

    Args:
        run_dir: Run directory containing config and checkpoint artifacts.

    Returns:
        Dictionary of re-evaluated metrics.

    Returns:
        Dictionary of re-evaluated metrics.
    """
    return reevaluate_benchmark(run_dir)


def main() -> None:
    """CLI entry for re-evaluating a run directory."""
    parser = argparse.ArgumentParser(
        description="Re-evaluate a completed run and append metrics."
    )
    parser.add_argument(
        "--run-dir",
        type=str,
        required=True,
        help="Path to a completed run directory containing config.json",
    )
    args = parser.parse_args()

    run_dir = Path(args.run_dir)
    results = reevaluate_run(run_dir)
    print("[reeval-done]", results)


if __name__ == "__main__":
    main()
