"""
Loss functions for physics-guided GCNN training.
"""

from __future__ import annotations

import torch
import torch.nn.functional as F


def supervised_mse_loss(pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
    """Compute supervised mean squared error loss.

    Args:
        pred: Predicted outputs. Shape: (..., output_dim)
        target: Ground truth outputs. Shape: (..., output_dim)

    Returns:
        Scalar tensor loss.
    """
    return F.mse_loss(pred, target)


def _matmul_g(g: torch.Tensor, x: torch.Tensor) -> torch.Tensor:
    """Multiply admittance matrix with vector batch.

    Args:
        g: Matrix of shape (n_buses, n_buses).
        x: Vector of shape (n_buses,) or batch of shape (batch, n_buses).

    Returns:
        Result with same leading shape as x.
    """
    if x.dim() == 1:
        return g @ x
    return x @ g.T


def correlative_pg_loss(
    pg_pred: torch.Tensor,
    v_pred: torch.Tensor,
    pd: torch.Tensor,
    qd: torch.Tensor,
    g_diag: torch.Tensor,
    b_diag: torch.Tensor,
    g_nd: torch.Tensor,
    b_nd: torch.Tensor,
) -> torch.Tensor:
    """Correlative learning loss for active power generation.

    This loss computes the mismatch between predicted PG and the PG implied
    by predicted voltage magnitude under a flat angle assumption.

    Args:
        pg_pred: Predicted active generation. Shape: (n_buses,) or (batch, n_buses)
        v_pred: Predicted voltage magnitude. Shape: (n_buses,) or (batch, n_buses)
        pd: Active demand. Shape: (n_buses,)
        qd: Reactive demand. Shape: (n_buses,)
        g_diag: Diagonal conductance matrix. Shape: (n_buses, n_buses)
        b_diag: Diagonal susceptance matrix. Shape: (n_buses, n_buses)
        g_nd: Non-diagonal conductance matrix. Shape: (n_buses, n_buses)
        b_nd: Non-diagonal susceptance matrix. Shape: (n_buses, n_buses)

    Returns:
        Scalar tensor loss.
    """
    g_full = g_diag + g_nd
    b_full = b_diag + b_nd

    e = v_pred
    f = torch.zeros_like(e)

    sum_g_e_minus_b_f = _matmul_g(g_full, e) - _matmul_g(b_full, f)
    sum_g_f_plus_b_e = _matmul_g(g_full, f) + _matmul_g(b_full, e)

    pg_calc = pd + e * sum_g_e_minus_b_f + f * sum_g_f_plus_b_e

    return F.mse_loss(pg_pred, pg_calc)


def combined_loss(
    pred: torch.Tensor,
    target: torch.Tensor,
    v_pred: torch.Tensor,
    pd: torch.Tensor,
    qd: torch.Tensor,
    g_diag: torch.Tensor,
    b_diag: torch.Tensor,
    g_nd: torch.Tensor,
    b_nd: torch.Tensor,
    kappa: float = 1.0,
) -> torch.Tensor:
    """Compute combined supervised and correlative loss.

    Args:
        pred: Predicted outputs. Shape: (..., 2) with [P_G, V_G].
        target: Target outputs. Shape: (..., 2) with [P_G, V_G].
        v_pred: Predicted voltage magnitude. Shape: (n_buses,) or (batch, n_buses)
        pd: Active demand. Shape: (n_buses,)
        qd: Reactive demand. Shape: (n_buses,)
        g_diag: Diagonal conductance matrix. Shape: (n_buses, n_buses)
        b_diag: Diagonal susceptance matrix. Shape: (n_buses, n_buses)
        g_nd: Non-diagonal conductance matrix. Shape: (n_buses, n_buses)
        b_nd: Non-diagonal susceptance matrix. Shape: (n_buses, n_buses)
        kappa: Weight for correlative loss term.

    Returns:
        Scalar tensor loss.
    """
    supervised = supervised_mse_loss(pred, target)
    pg_pred = pred[..., 0]
    corr = correlative_pg_loss(pg_pred, v_pred, pd, qd, g_diag, b_diag, g_nd, b_nd)
    return supervised + kappa * corr
