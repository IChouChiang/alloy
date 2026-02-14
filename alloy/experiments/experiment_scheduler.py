"""
Experiment scheduler for adaptive hyperparameter runs.
"""

from __future__ import annotations

import time
from concurrent.futures import ProcessPoolExecutor, Future
from dataclasses import dataclass
from typing import Callable

from .experiment_config import ExperimentConfig
from .gpu_monitor import is_gpu_underutilized, query_gpu_metrics


@dataclass(frozen=True)
class SchedulerConfig:
    """Scheduler configuration.

    Args:
        base_concurrency: Baseline concurrent experiments.
        max_concurrency: Max concurrent experiments when underutilized.
        util_threshold: GPU utilization threshold.
        mem_threshold: GPU memory threshold.
        poll_interval: Seconds between GPU checks.
    """

    base_concurrency: int = 1
    max_concurrency: int = 2
    util_threshold: int = 80
    mem_threshold: int = 80
    poll_interval: float = 5.0


def schedule_experiments(
    experiments: list[ExperimentConfig],
    run_fn: Callable[[ExperimentConfig], float],
    config: SchedulerConfig,
) -> dict[str, float]:
    """Schedule experiments with adaptive concurrency.

    Args:
        experiments: List of experiment configs.
        run_fn: Callable to execute a single experiment. Returns loss.
        config: Scheduler configuration.

    Returns:
        Mapping from experiment name to final validation loss.
    """
    queue = list(experiments)
    running: dict[Future[float], ExperimentConfig] = {}
    results: dict[str, float] = {}

    with ProcessPoolExecutor(max_workers=config.max_concurrency) as executor:
        while queue or running:
            metrics = query_gpu_metrics()
            target_concurrency = config.base_concurrency
            if is_gpu_underutilized(
                metrics,
                util_threshold=config.util_threshold,
                mem_threshold=config.mem_threshold,
            ):
                target_concurrency = config.max_concurrency

            while queue and len(running) < target_concurrency:
                exp = queue.pop(0)
                future = executor.submit(run_fn, exp)
                running[future] = exp

            done = [fut for fut in running if fut.done()]
            for fut in done:
                exp = running.pop(fut)
                results[exp.name] = fut.result()

            if queue or running:
                time.sleep(config.poll_interval)

    return results
