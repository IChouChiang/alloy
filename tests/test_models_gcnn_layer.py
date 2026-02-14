"""Unit tests for the canonical GSGCNLayer export in alloy.models."""

from typing import cast

import numpy as np
import pytest
import torch
import pandapower as pp
import pandapower.networks as pn
from pandapower.auxiliary import pandapowerNet
from alloy.models import GSGCNLayer
from alloy.core import build_admittance_components


class TestGSGCNLayer:
    """Test suite for GSGCNLayer (Physics-Guided Graph Convolution)."""

    def test_initialization(self):
        """Test layer initialization with various channel sizes."""
        for in_ch, out_ch in [(8, 8), (8, 16), (16, 32)]:
            layer = GSGCNLayer(in_ch, out_ch)

            assert layer.in_channels == in_ch
            assert layer.out_channels == out_ch
            half_in = in_ch // 2
            assert layer.W1.shape == (half_in, out_ch)
            assert layer.W2.shape == (half_in, out_ch)
            assert layer.B1.shape == (out_ch,)
            assert layer.B2.shape == (out_ch,)

    def test_forward_pass_output_shape(self):
        """Test forward pass produces correct output shape."""
        net = cast(pandapowerNet, pn.case6ww())
        pp.runpp(net)

        n_buses = len(net.bus)
        in_channels = 8
        out_channels = 8

        layer = GSGCNLayer(in_channels, out_channels)

        # Create dummy inputs
        node_features = torch.randn(n_buses, in_channels)
        g_diag, b_diag, g_nd, b_nd, _ = build_admittance_components(net)
        pd = np.random.rand(n_buses)
        qd = np.random.rand(n_buses)

        # Forward pass
        output = layer(node_features, pd, qd, g_diag, b_diag, g_nd, b_nd)

        # Verify output shape
        assert output.shape[0] == n_buses
        # Output should be (n_buses, out_channels) or close to it
        assert output.ndim == 2

    def test_forward_pass_output_finite(self):
        """Test that forward pass produces finite outputs."""
        net = cast(pandapowerNet, pn.case6ww())
        pp.runpp(net)

        n_buses = len(net.bus)
        layer = GSGCNLayer(8, 8)

        node_features = torch.randn(n_buses, 8)
        g_diag, b_diag, g_nd, b_nd, _ = build_admittance_components(net)
        pd = np.ones(n_buses) * 0.5
        qd = np.ones(n_buses) * 0.2

        output = layer(node_features, pd, qd, g_diag, b_diag, g_nd, b_nd)

        # All outputs should be finite
        assert torch.all(torch.isfinite(output))

    def test_forward_pass_activation_bounds(self):
        """Test that tanh activation keeps outputs in [-1, 1]."""
        net = cast(pandapowerNet, pn.case6ww())
        pp.runpp(net)

        n_buses = len(net.bus)
        layer = GSGCNLayer(8, 8)

        node_features = torch.randn(n_buses, 8)
        g_diag, b_diag, g_nd, b_nd, _ = build_admittance_components(net)
        pd = np.ones(n_buses) * 0.5
        qd = np.ones(n_buses) * 0.2

        output = layer(node_features, pd, qd, g_diag, b_diag, g_nd, b_nd)

        # Tanh output should be bounded by [-1, 1]
        assert torch.all(output >= -1.0)
        assert torch.all(output <= 1.0)

    def test_forward_pass_gradient_flow(self):
        """Test that gradients can flow through the layer."""
        net = cast(pandapowerNet, pn.case6ww())
        pp.runpp(net)

        n_buses = len(net.bus)
        layer = GSGCNLayer(8, 8)

        node_features = torch.randn(n_buses, 8, requires_grad=True)
        g_diag, b_diag, g_nd, b_nd, _ = build_admittance_components(net)
        pd = np.ones(n_buses) * 0.5
        qd = np.ones(n_buses) * 0.2

        output = layer(node_features, pd, qd, g_diag, b_diag, g_nd, b_nd)
        loss = output.sum()
        loss.backward()

        # Check that gradients are computed
        assert node_features.grad is not None
        assert not torch.all(node_features.grad == 0)
        assert layer.W1.grad is not None


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
