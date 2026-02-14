"""
GPU monitoring utilities based on nvidia-smi.
"""

from __future__ import annotations

import shutil
import subprocess
from dataclasses import dataclass
from typing import Iterable


@dataclass(frozen=True)
class GpuMetrics:
    """GPU usage metrics.

    Args:
        index: GPU index.
        utilization: GPU utilization percent.
        memory_used: Used memory in MiB.
        memory_total: Total memory in MiB.
    """

    index: int
    utilization: int
    memory_used: int
    memory_total: int


def query_gpu_metrics() -> list[GpuMetrics]:
    """Query GPU metrics using nvidia-smi.

    Returns:
        List of GpuMetrics. Empty list if nvidia-smi is unavailable.
    """
    if shutil.which("nvidia-smi") is None:
        return []

    command = [
        "nvidia-smi",
        "--query-gpu=index,utilization.gpu,memory.used,memory.total",
        "--format=csv,noheader,nounits",
    ]
    try:
        result = subprocess.run(
            command,
            check=True,
            capture_output=True,
            text=True,
        )
    except subprocess.SubprocessError:
        return []

    metrics: list[GpuMetrics] = []
    for line in result.stdout.strip().splitlines():
        if not line.strip():
            continue
        parts = [part.strip() for part in line.split(",")]
        if len(parts) != 4:
            continue
        try:
            metrics.append(
                GpuMetrics(
                    index=int(parts[0]),
                    utilization=int(parts[1]),
                    memory_used=int(parts[2]),
                    memory_total=int(parts[3]),
                )
            )
        except ValueError:
            continue
    return metrics


def is_gpu_underutilized(
    metrics: Iterable[GpuMetrics],
    util_threshold: int = 80,
    mem_threshold: int = 80,
) -> bool:
    """Determine whether GPUs are underutilized.

    Args:
        metrics: Iterable of GpuMetrics.
        util_threshold: Utilization percent threshold.
        mem_threshold: Memory usage percent threshold.

    Returns:
        True if all GPUs are under thresholds and at least one GPU is present.
    """
    metrics_list = list(metrics)
    if not metrics_list:
        return False

    for item in metrics_list:
        mem_util = int((item.memory_used / max(item.memory_total, 1)) * 100)
        if item.utilization >= util_threshold or mem_util >= mem_threshold:
            return False
    return True
