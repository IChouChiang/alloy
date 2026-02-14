"""
Models module: Neural network layer definitions.

This module contains PyTorch layers for the physics-guided GCNN.
All layers use physics-embedded formulations from the paper.
"""

from .gcnn_layer import GSGCNLayer
from .gcnn import GCNN
from .gcnn_gao_01 import GCNN as GCNN_GAO_01
from .gcnn_gao_01 import GSGCNLayer as GSGCNLayer_GAO_01
from .registry import available_models, create_model

__all__ = [
    "GSGCNLayer",
    "GCNN",
    "GSGCNLayer_GAO_01",
    "GCNN_GAO_01",
    "available_models",
    "create_model",
]
