"""Compatibility wrapper for case39 benchmark entry.

Base benchmark logic lives in `supervised_runner`; this module is retained as
an alias for backward compatibility of existing imports.
"""

from __future__ import annotations

from .supervised_runner import evaluate_split_metrics, run_supervised_benchmark


def run_case39_benchmark(*args, **kwargs):
    """Backward-compatible alias to generic supervised benchmark runner."""
    return run_supervised_benchmark(*args, **kwargs)


__all__ = ["evaluate_split_metrics", "run_case39_benchmark"]
