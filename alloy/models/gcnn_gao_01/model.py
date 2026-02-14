"""GCNN model: Physics-guided graph convolution network with FC head."""

from __future__ import annotations

from typing import Iterable

import numpy as np
import torch
import torch.nn as nn

from .layer import GSGCNLayer


class GCNN(nn.Module):
	"""Physics-guided GCNN model for OPF prediction."""

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

		gcn_layers: list[GSGCNLayer] = []
		for layer_idx in range(num_gcn_layers):
			in_ch = in_channels if layer_idx == 0 else gcn_channels
			gcn_layers.append(GSGCNLayer(in_ch, gcn_channels))
		self.gcn_layers = nn.ModuleList(gcn_layers)

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
		"""Forward pass of the GCNN model."""
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


__all__ = ["GCNN"]
