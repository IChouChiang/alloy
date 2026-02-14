"""
Minimal tests for loss functions.
"""

import torch

from alloy.losses import combined_loss, correlative_pg_loss, supervised_mse_loss


def test_supervised_mse_loss_scalar():
    """Loss should return scalar."""
    pred = torch.zeros(4, 2)
    target = torch.ones(4, 2)
    loss = supervised_mse_loss(pred, target)
    assert loss.ndim == 0


def test_correlative_pg_loss_scalar():
    """Correlative loss should return scalar."""
    n = 4
    pg_pred = torch.zeros(n)
    v_pred = torch.ones(n)
    pd = torch.zeros(n)
    qd = torch.zeros(n)
    g = torch.eye(n)
    b = torch.zeros(n, n)
    loss = correlative_pg_loss(pg_pred, v_pred, pd, qd, g, b, g * 0.0, b)
    assert loss.ndim == 0


def test_combined_loss_scalar():
    """Combined loss should return scalar."""
    n = 4
    pred = torch.zeros(n, 2)
    target = torch.ones(n, 2)
    v_pred = torch.ones(n)
    pd = torch.zeros(n)
    qd = torch.zeros(n)
    g = torch.eye(n)
    b = torch.zeros(n, n)
    loss = combined_loss(pred, target, v_pred, pd, qd, g, b, g * 0.0, b, kappa=0.5)
    assert loss.ndim == 0
