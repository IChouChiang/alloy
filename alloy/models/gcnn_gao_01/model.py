"""Model adapter for Gao GCNN plugin v01.

This adapter reuses the existing model implementation to keep behavior
unchanged during the architecture migration.
"""

from alloy.models.gcnn import GCNN

__all__ = ["GCNN"]
