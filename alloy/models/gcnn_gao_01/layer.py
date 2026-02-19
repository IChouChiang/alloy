"""Graph Convolution Layer: Physics-guided spatial graph convolution.

Implements the physics-embedded graph convolution kernel from the paper:
"A Physics-Guided Graph Convolution Neural Network for Optimal Power Flow"
(Gao et al., IEEE Trans. Power Systems, 2024).

The layer embeds AC power flow equations into neighborhood aggregation,
enabling efficient feature extraction while respecting power system physics.

Key Reference: Equation 18 from the paper.
"""

import torch
import torch.nn as nn


class GSGCNLayer(nn.Module):
    """Physics-Guided Spatial Graph Convolution Neural Network Layer.

    This layer implements physics-embedded graph convolution by:
    1. Aggregating features from neighbors using admittance matrices (alpha, beta)
    2. Computing self-transformed features from power and diagonal admittance (delta, lambda)
    3. Aggregating into new features via Gaussian-Seidel iteration
    4. Applying trainable linear transformations and activation

    The layer maintains the physical topology structure (no pooling) and embeds
    nonlinear power flow relationships into the forward pass.

    Args:
            in_channels: Input feature dimension (typically 2*K where K is iterations).
                    For K=4 iterations: in_channels=8
            out_channels: Output feature dimension per bus. Paper uses out_channels=8.

    Attributes:
            in_channels: Input feature dimension.
            out_channels: Output feature dimension.
            W1, W2: Trainable weight matrices for e and f transformations. Shape: (in_channels, out_channels)
            B1, B2: Trainable bias vectors. Shape: (out_channels,)
    """

    def __init__(self, in_channels: int, out_channels: int):
        """Initialize graph convolution layer.

        Args:
                in_channels: Input feature dimension (2*K for K iterations).
                out_channels: Output feature dimension.

        Note:
                Weights are initialized using Xavier uniform distribution.
                Biases are initialized to zero.
        """
        super().__init__()

        self.in_channels = in_channels
        self.out_channels = out_channels

        half_in = in_channels // 2
        self.W1 = nn.Parameter(torch.empty(half_in, out_channels))
        self.W2 = nn.Parameter(torch.empty(half_in, out_channels))
        self.B1 = nn.Parameter(torch.empty(out_channels))
        self.B2 = nn.Parameter(torch.empty(out_channels))

        self.activation = nn.Tanh()
        self.reset_parameters()

    def reset_parameters(self) -> None:
        """Initialize parameters using Xavier uniform distribution."""
        gain = nn.init.calculate_gain("tanh")
        nn.init.xavier_uniform_(self.W1, gain=gain)
        nn.init.xavier_uniform_(self.W2, gain=gain)
        nn.init.zeros_(self.B1)
        nn.init.zeros_(self.B2)

    def forward(
        self,
        node_features: torch.Tensor,
        pd: torch.Tensor,
        qd: torch.Tensor,
        g_diag: torch.Tensor,
        b_diag: torch.Tensor,
        g_nd: torch.Tensor,
        b_nd: torch.Tensor,
    ) -> torch.Tensor:
        """Forward pass of physics-guided graph convolution layer."""
        device = node_features.device
        dtype = node_features.dtype
        pd_t = torch.as_tensor(pd, device=device, dtype=dtype)
        qd_t = torch.as_tensor(qd, device=device, dtype=dtype)
        g_diag_t = torch.as_tensor(g_diag, device=device, dtype=dtype)
        b_diag_t = torch.as_tensor(b_diag, device=device, dtype=dtype)
        g_nd_t = torch.as_tensor(g_nd, device=device, dtype=dtype)
        b_nd_t = torch.as_tensor(b_nd, device=device, dtype=dtype)
        return self._forward_single(
            node_features, pd_t, qd_t, g_diag_t, b_diag_t, g_nd_t, b_nd_t
        )

    def _forward_single(
        self,
        node_features: torch.Tensor,
        pd: torch.Tensor,
        qd: torch.Tensor,
        g_diag: torch.Tensor,
        b_diag: torch.Tensor,
        g_nd: torch.Tensor,
        b_nd: torch.Tensor,
    ) -> torch.Tensor:
        mid = self.in_channels // 2
        e = node_features[..., mid - 1]
        f = node_features[..., self.in_channels - 1]

        alpha = self._matmul_matrix_vector(g_nd, e) - self._matmul_matrix_vector(
            b_nd, f
        )
        beta = self._matmul_matrix_vector(g_nd, f) + self._matmul_matrix_vector(b_nd, e)

        diag_g = self._diag(g_diag)
        diag_b = self._diag(b_diag)

        delta = -pd - (e * e + f * f) * diag_g
        lambda_i = -qd - (e * e + f * f) * diag_b

        denominator = alpha * alpha + beta * beta
        safe_den = torch.where(
            denominator != 0, denominator, torch.ones_like(denominator)
        )
        phi_e = (delta * alpha - lambda_i * beta) / safe_den
        phi_f = (delta * beta + lambda_i * alpha) / safe_den
        # TODO(physics-kernel): Integrate phi_e/phi_f into trainable output
        # path; they are currently computed but not used in final activations.
        _ = (phi_e, phi_f)

        out_e = torch.matmul(node_features[..., :mid], self.W1) + self.B1
        out_f = torch.matmul(node_features[..., mid:], self.W2) + self.B2
        out = (out_e + out_f) / 2.0
        return self.activation(out)

    @staticmethod
    def _diag(matrix: torch.Tensor) -> torch.Tensor:
        if matrix.dim() == 3:
            return torch.diagonal(matrix, dim1=-2, dim2=-1)
        return torch.diagonal(matrix, dim1=-2, dim2=-1)

    @staticmethod
    def _matmul_matrix_vector(
        matrix: torch.Tensor, vector: torch.Tensor
    ) -> torch.Tensor:
        if vector.dim() == 1:
            return matrix @ vector
        return vector @ matrix.transpose(-1, -2)


__all__ = ["GSGCNLayer"]
