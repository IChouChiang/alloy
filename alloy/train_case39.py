"""
Train and evaluate GCNN on case39 dataset splits.
"""

from __future__ import annotations

from alloy.benchmarks.presets import assemble_case39
from alloy.benchmarks.supervised_runner import run_supervised_benchmark
from alloy.experiments.experiment_config import (
    Case39ModelConfig,
    Case39TrainingConfig,
    ExperimentConfig,
)


def train_case39(experiment: ExperimentConfig) -> dict[str, float]:
    """Train and evaluate GCNN on case39 splits.

    Args:
        experiment: Experiment configuration.

    Returns:
        Dictionary of evaluation losses.
    """
    assembly = assemble_case39(experiment)
    return run_supervised_benchmark(
        experiment=experiment,
        model=assembly.model,
        trainer=assembly.trainer,
        dataloaders=assembly.dataloaders,
        batch_to_inputs=assembly.batch_to_inputs,
        pg_threshold_pu=assembly.pg_threshold_pu,
        vg_threshold_pu=assembly.vg_threshold_pu,
    )


def main() -> None:
    """Entry point for case39 training."""
    experiment = ExperimentConfig(
        name="case39_default",
        model=Case39ModelConfig(),
        training=Case39TrainingConfig(),
    )
    train_case39(experiment)


if __name__ == "__main__":
    main()
