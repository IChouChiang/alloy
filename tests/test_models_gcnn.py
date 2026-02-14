"""Unit tests for the canonical GCNN model export in alloy.models."""

from typing import cast

import numpy as np
import pandapower as pp
import pandapower.networks as pn
import torch

from pandapower.auxiliary import pandapowerNet

from alloy.models import GCNN
from alloy.core import build_admittance_components


def test_gcnn_initialization_defaults():
    """Test that default hyperparameters are set as expected."""
    net = cast(pandapowerNet, pn.case6ww())
    n_buses = len(net.bus)

    model = GCNN(n_buses=n_buses)

    assert model.n_buses == n_buses
    assert model.in_channels == 8
    assert model.gcn_channels == 8
    assert model.num_gcn_layers == 3
    assert model.num_fc_layers == 3
    assert model.fc_hidden_dim == 1000
    assert model.output_dim == 2


def test_gcnn_forward_output_shape():
    """Test that forward pass returns expected shape."""
    net = cast(pandapowerNet, pn.case6ww())
    pp.runpp(net)

    n_buses = len(net.bus)
    model = GCNN(n_buses=n_buses)

    node_features = torch.randn(n_buses, 8)
    g_diag, b_diag, g_nd, b_nd, _ = build_admittance_components(net)
    pd = np.ones(n_buses) * 0.5
    qd = np.ones(n_buses) * 0.2

    output = model(node_features, pd, qd, g_diag, b_diag, g_nd, b_nd)

    assert output.shape == (n_buses, 2)
    assert torch.all(torch.isfinite(output))


if __name__ == "__main__":
    import pytest

    pytest.main([__file__, "-v"])
