"""Layer adapter for Gao GCNN plugin v01.

This adapter reuses the existing layer implementation to keep behavior
unchanged during the architecture migration.
"""

from alloy.models.gcnn_layer import GSGCNLayer

__all__ = ["GSGCNLayer"]
