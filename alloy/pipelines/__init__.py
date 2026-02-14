"""
Pipelines module: High-level data processing workflows.

This module orchestrates core module functions into complete workflows
for feature construction and GCNN input preparation. Pipelines combine
the low-level physics computations (core) into application-level operations.
"""

from .feature_construction import FeatureConstructionPipeline
from .gcnn_input import GCNNInputPipeline

__all__ = [
    "FeatureConstructionPipeline",
    "GCNNInputPipeline",
]
