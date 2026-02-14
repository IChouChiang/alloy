"""Re-evaluate an existing case39 run and append updated metrics.

This command loads the original run config, overrides training epochs to 0,
loads the best checkpoint, and executes evaluation metrics logging only.
"""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from alloy.experiments.experiment_config import ExperimentConfig
from alloy.train_case39 import train_case39


def reevaluate_run(run_dir: Path) -> dict[str, float]:
    """Re-evaluate a completed run directory.

    Args:
        run_dir: Run directory containing config and checkpoint artifacts.

    Returns:
        Dictionary of re-evaluated metrics.

    Raises:
        FileNotFoundError: If config file is missing.
        ValueError: If config payload is malformed.
    """
    config_path = run_dir / "config.json"
    if not config_path.exists():
        raise FileNotFoundError(f"Run config not found: {config_path}")

    raw = json.loads(config_path.read_text(encoding="utf-8"))
    training = raw.get("training")
    if not isinstance(training, dict):
        raise ValueError("Invalid run config: missing 'training' mapping")

    training["epochs"] = 0
    training["run_dir"] = str(run_dir)
    raw["training"] = training

    experiment = ExperimentConfig.from_dict(raw)
    return train_case39(experiment)


def main() -> None:
    """CLI entry for re-evaluating a run directory."""
    parser = argparse.ArgumentParser(
        description="Re-evaluate a completed case39 run and append metrics."
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
