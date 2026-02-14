"""Re-evaluate an existing run with configurable benchmark entrypoint.

This command loads the saved run config, forces evaluation-only mode
(`epochs=0`), then invokes a configurable train/eval entrypoint.
"""

from __future__ import annotations

import argparse
import importlib
import json
from pathlib import Path
from typing import Callable, cast

from alloy.experiments.experiment_config import ExperimentConfig


TrainEntrypoint = Callable[[ExperimentConfig], dict[str, float]]


def _load_entrypoint(spec: str) -> TrainEntrypoint:
    """Load entrypoint callable from `module:function` spec.

    Args:
        spec: Entrypoint spec in module:function format.

    Returns:
        Callable accepting `ExperimentConfig`.

    Raises:
        ValueError: If spec format is invalid.
        AttributeError: If function is missing.
    """
    if ":" not in spec:
        raise ValueError("Entrypoint must use 'module:function' format")
    module_name, func_name = spec.split(":", maxsplit=1)
    module = importlib.import_module(module_name)
    func = getattr(module, func_name)
    return cast(TrainEntrypoint, func)


def reevaluate_benchmark(
    run_dir: Path,
    train_entrypoint: str = "alloy.train_case39:train_case39",
) -> dict[str, float]:
    """Re-evaluate a completed run using the selected benchmark entrypoint.

    Args:
        run_dir: Run directory containing `config.json`.
        train_entrypoint: Entrypoint in `module:function` format.

    Returns:
        Dictionary of re-evaluated metrics.
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
    train_fn = _load_entrypoint(train_entrypoint)
    return train_fn(experiment)


def main() -> None:
    """CLI entry for benchmark re-evaluation."""
    parser = argparse.ArgumentParser(
        description="Re-evaluate a completed run and append metrics."
    )
    parser.add_argument(
        "--run-dir",
        type=str,
        required=True,
        help="Path to a completed run directory containing config.json",
    )
    parser.add_argument(
        "--train-entrypoint",
        type=str,
        default="alloy.train_case39:train_case39",
        help="Entrypoint in module:function format",
    )
    args = parser.parse_args()

    results = reevaluate_benchmark(
        run_dir=Path(args.run_dir),
        train_entrypoint=args.train_entrypoint,
    )
    print("[reeval-done]", results)


if __name__ == "__main__":
    main()
