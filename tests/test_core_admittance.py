"""
Unit tests for alloy.core.admittance module.

Tests verify admittance matrix operations and initialization.
"""

import numpy as np
import pytest
import pandapower as pp
import pandapower.networks as pn
from alloy.core.admittance import (
    initialize_voltage_features,
    build_admittance_components,
)


class TestInitializeVoltageFeatures:
    """Test suite for initialize_voltage_features function."""

    def test_flat_start_values(self):
        """Test that flat start is exactly [1.0, 0.0] at all buses."""
        n_buses = 5
        e, f = initialize_voltage_features(n_buses)

        np.testing.assert_array_almost_equal(e, np.ones(n_buses))
        np.testing.assert_array_almost_equal(f, np.zeros(n_buses))


class TestBuildAdmittanceComponents:
    """Test suite for build_admittance_components function."""

    def test_case6ww_structure(self):
        """Test admittance decomposition on case6ww network."""
        net = pn.case6ww()
        pp.runpp(net)

        g_diag, b_diag, g_nd, b_nd, baseMVA = build_admittance_components(net)

        n_buses = len(net.bus)

        # Verify shapes
        assert g_diag.shape == (n_buses, n_buses)
        assert b_diag.shape == (n_buses, n_buses)
        assert g_nd.shape == (n_buses, n_buses)
        assert b_nd.shape == (n_buses, n_buses)

        # Verify baseMVA is positive
        assert baseMVA > 0

    def test_full_reconstruction(self):
        """Test that diag + non-diag reconstructs full admittance."""
        net = pn.case6ww()
        pp.runpp(net)

        g_diag, b_diag, g_nd, b_nd, baseMVA = build_admittance_components(net)

        # Reconstruct full matrices
        g_full = g_diag + g_nd
        b_full = b_diag + b_nd

        # Recompute Ybus for verification
        from pandapower.pypower.makeYbus import makeYbus

        ppc = net._ppc
        ybus, _, _ = makeYbus(baseMVA, ppc["bus"], ppc["branch"])
        if hasattr(ybus, "toarray"):
            ybus = ybus.toarray()
        g_expected = ybus.real
        b_expected = ybus.imag

        # Verify reconstruction matches
        np.testing.assert_array_almost_equal(g_full, g_expected)
        np.testing.assert_array_almost_equal(b_full, b_expected)

    def test_symmetry(self):
        """Test that admittance matrices are symmetric (passive network)."""
        net = pn.case6ww()
        pp.runpp(net)

        g_diag, b_diag, g_nd, b_nd, _ = build_admittance_components(net)

        # Reconstruct full matrices
        g_full = g_diag + g_nd
        b_full = b_diag + b_nd

        # For passive networks, admittance should be symmetric
        np.testing.assert_array_almost_equal(g_full, g_full.T)
        np.testing.assert_array_almost_equal(b_full, b_full.T)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
