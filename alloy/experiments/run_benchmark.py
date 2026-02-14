"""Run benchmark experiments via configurable entrypoints.

This command executes a benchmark train/eval function loaded from
`module:function` and driven by a JSON experiment config.
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
    """Load train/eval callable from `module:function` spec.

    Args:
        spec: Entrypoint spec in module:function format.

    Returns:
        Callable with signature `(ExperimentConfig) -> dict[str, float]`.

    Raises:
        ValueError: If spec format is invalid.
        AttributeError: If function is missing from module.
    """
    if ":" not in spec:
        raise ValueError("Entrypoint must use 'module:function' format")
    module_name, func_name = spec.split(":", maxsplit=1)
    module = importlib.import_module(module_name)
    func = getattr(module, func_name)
    return cast(TrainEntrypoint, func)


def run_benchmark(
    config_path: Path,
    train_entrypoint: str = "alloy.train_case39:train_case39",
    run_dir_override: Path | None = None,
    epochs_override: int | None = None,
) -> dict[str, float]:
    """Run one benchmark from JSON config and dynamic entrypoint.

    Args:
        config_path: Path to experiment config JSON.
        train_entrypoint: Entrypoint in module:function format.
        run_dir_override: Optional override for training run_dir.
        epochs_override: Optional override for training epochs.

    Returns:
        Dictionary of benchmark metrics returned by entrypoint.
    """
    if not config_path.exists():
        raise FileNotFoundError(f"Config file not found: {config_path}")

    raw = json.loads(config_path.read_text(encoding="utf-8"))
    training = raw.get("training")
    if not isinstance(training, dict):
        raise ValueError("Invalid config: missing 'training' mapping")

    if run_dir_override is not None:
        training["run_dir"] = str(run_dir_override)
    if epochs_override is not None:
        training["epochs"] = int(epochs_override)

    raw["training"] = training
    experiment = ExperimentConfig.from_dict(raw)
    train_fn = _load_entrypoint(train_entrypoint)
    return train_fn(experiment)


def main() -> None:
    """CLI entry for configurable benchmark execution."""
    parser = argparse.ArgumentParser(
        description="Run benchmark via module:function entrypoint and JSON config."
    )
    parser.add_argument(
        "--config",
        type=str,
        required=True,
        help="Path to experiment JSON config",
    )
    parser.add_argument(
        "--train-entrypoint",
        type=str,
        default="alloy.train_case39:train_case39",
        help="Entrypoint in module:function format",
    )
    parser.add_argument(
        "--run-dir",
        type=str,
        default="",
        help="Optional run_dir override",
    )
    parser.add_argument(
        "--epochs",
        type=int,
        default=-1,
        help="Optional epochs override; use negative to keep config value",
    )
    args = parser.parse_args()

    run_dir_override = Path(args.run_dir) if args.run_dir else None
    epochs_override = args.epochs if args.epochs >= 0 else None

    results = run_benchmark(
        config_path=Path(args.config),
        train_entrypoint=args.train_entrypoint,
        run_dir_override=run_dir_override,
        epochs_override=epochs_override,
    )
    print("[benchmark-done]", results)


if __name__ == "__main__":
    main()
