"""Gao GCNN model plugin (v01).

This package is the plugin-style entry for the first GCNN model family.
"""

from .layer import GSGCNLayer
from .model import GCNN

__all__ = ["GSGCNLayer", "GCNN"]
