"""
GCNN model: Physics-guided graph convolution network with FC prediction head.

Implements the two-block architecture from the paper:
1) Feature extraction block: stacked physics-guided GCN layers
2) Prediction block: flatten + fully connected layers

Defaults follow the paper's case study settings:
- 3 GCN layers with 8 channels
- 3 FC layers with 1000 hidden units
- Output: [P_G, V_G] per bus
"""

from __future__ import annotations

from typing import Iterable

import numpy as np
import torch
import torch.nn as nn

from .gcnn_layer import GSGCNLayer


class GCNN(nn.Module):
    """Physics-guided GCNN model for OPF prediction.

    This model stacks multiple `GSGCNLayer` blocks for feature extraction,
    then flattens node features and applies a fully connected prediction head.

    Args:
        n_buses: Number of buses in the network. Required for flatten dimension.
        in_channels: Input feature dimension (typically 2*K). Default is 8.
        gcn_channels: Output channels of each GCN layer. Default is 8.
        num_gcn_layers: Number of GCN layers. Default is 3.
        num_fc_layers: Number of FC layers in prediction head. Default is 3.
        fc_hidden_dim: Hidden units per FC layer. Default is 1000.
        output_dim: Output features per bus. Default is 2 (P_G, V_G).
        fc_activation: Activation for FC layers. Default is ReLU.

    Attributes:
        gcn_layers: Stacked physics-guided GCN layers.
        fc_layers: Fully connected prediction head.

    Raises:
        ValueError: If n_buses is not positive or layer counts are invalid.
    """

    def __init__(
        self,
        n_buses: int,
        in_channels: int = 8,
        gcn_channels: int = 8,
        num_gcn_layers: int = 3,
        num_fc_layers: int = 3,
        fc_hidden_dim: int = 1000,
        output_dim: int = 2,
        fc_activation: type[nn.Module] = nn.ReLU,
    ) -> None:
        super().__init__()

        if n_buses <= 0:
            raise ValueError("n_buses must be positive.")
        if num_gcn_layers <= 0:
            raise ValueError("num_gcn_layers must be positive.")
        if num_fc_layers <= 0:
            raise ValueError("num_fc_layers must be positive.")
        if output_dim <= 0:
            raise ValueError("output_dim must be positive.")

        self.n_buses = n_buses
        self.in_channels = in_channels
        self.gcn_channels = gcn_channels
        self.num_gcn_layers = num_gcn_layers
        self.num_fc_layers = num_fc_layers
        self.fc_hidden_dim = fc_hidden_dim
        self.output_dim = output_dim

        # Feature extraction block
        gcn_layers: list[GSGCNLayer] = []
        for layer_idx in range(num_gcn_layers):
            in_ch = in_channels if layer_idx == 0 else gcn_channels
            gcn_layers.append(GSGCNLayer(in_ch, gcn_channels))
        self.gcn_layers = nn.ModuleList(gcn_layers)

        # Prediction block (flatten + FC layers)
        fc_layers: list[nn.Module] = []
        fc_in_dim = n_buses * gcn_channels

        if num_fc_layers == 1:
            fc_layers.append(nn.Linear(fc_in_dim, n_buses * output_dim))
        else:
            fc_layers.append(nn.Linear(fc_in_dim, fc_hidden_dim))
            fc_layers.append(fc_activation())
            for _ in range(num_fc_layers - 2):
                fc_layers.append(nn.Linear(fc_hidden_dim, fc_hidden_dim))
                fc_layers.append(fc_activation())
            fc_layers.append(nn.Linear(fc_hidden_dim, n_buses * output_dim))

        self.fc_layers = nn.Sequential(*fc_layers)

    def forward(
        self,
        node_features: torch.Tensor,
        pd: np.ndarray | torch.Tensor,
        qd: np.ndarray | torch.Tensor,
        g_diag: np.ndarray | torch.Tensor,
        b_diag: np.ndarray | torch.Tensor,
        g_nd: np.ndarray | torch.Tensor,
        b_nd: np.ndarray | torch.Tensor,
    ) -> torch.Tensor:
        """Forward pass of the GCNN model.

        Args:
            node_features: Input node features. Shape: (n_buses, in_channels)
            pd: Active power demand (per-unit). Shape: (n_buses,)
            qd: Reactive power demand (per-unit). Shape: (n_buses,)
            g_diag: Diagonal conductance matrix. Shape: (n_buses, n_buses)
            b_diag: Diagonal susceptance matrix. Shape: (n_buses, n_buses)
            g_nd: Non-diagonal conductance matrix. Shape: (n_buses, n_buses)
            b_nd: Non-diagonal susceptance matrix. Shape: (n_buses, n_buses)

        Returns:
            Output predictions with shape (n_buses, output_dim).
            Output order is [P_G, V_G] per bus.
        """
        x = node_features
        for layer in self.gcn_layers:
            x = layer(x, pd, qd, g_diag, b_diag, g_nd, b_nd)

        if x.dim() == 3:
            flat = x.reshape(x.shape[0], self.n_buses * self.gcn_channels)
            out = self.fc_layers(flat)
            return out.reshape(x.shape[0], self.n_buses, self.output_dim)

        flat = x.reshape(self.n_buses * self.gcn_channels)
        out = self.fc_layers(flat)
        return out.reshape(self.n_buses, self.output_dim)
