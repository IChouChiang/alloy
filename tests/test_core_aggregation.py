"""
Unit tests for alloy.core.aggregation module.

Tests verify that aggregation functions produce physically correct results
and match the paper's mathematical formulations.
"""

import numpy as np
import pytest
from alloy.core.aggregation import (
    compute_pg_qg,
    apply_power_limits,
    compute_alpha_beta,
    compute_delta_lambda,
    normalize_features,
)


class TestComputePgQg:
    """Test suite for compute_pg_qg function."""

    def test_zero_demand(self):
        """Test that power includes diagonal admittance contribution."""
        n_buses = 3
        e = np.ones(n_buses)
        f = np.zeros(n_buses)
        # Zero admittance matrix (no branches, no shunt)
        g = np.zeros((n_buses, n_buses))
        b = np.zeros((n_buses, n_buses))
        pd = np.array([0.5, 0.3, 0.2])
        qd = np.array([0.1, 0.05, 0.03])

        pg, qg = compute_pg_qg(e, f, g, b, pd, qd)

        # With zero admittance, PG = PD and QG = QD
        np.testing.assert_array_almost_equal(pg, pd)
        np.testing.assert_array_almost_equal(qg, qd)


class TestApplyPowerLimits:
    """Test suite for apply_power_limits function."""

    def test_clipping_exceeding_limits(self):
        """Test that power exceeding limits is clipped."""
        pg = np.array([1.5, 0.5])
        qg = np.array([0.6, -0.6])
        pg_min = np.array([0.0, 0.0])
        pg_max = np.array([1.0, 1.0])
        qg_min = np.array([-0.5, -0.5])
        qg_max = np.array([0.5, 0.5])

        pg_limited, qg_limited = apply_power_limits(
            pg, qg, pg_min, pg_max, qg_min, qg_max
        )

        # Check clipping
        assert pg_limited[0] == 1.0
        assert qg_limited[1] == -0.5


class TestComputeAlphaBeta:
    """Test suite for compute_alpha_beta function."""

    def test_output_shape(self):
        """Test that output shape matches input."""
        n_buses = 10
        e = np.random.randn(n_buses)
        f = np.random.randn(n_buses)
        g_nd = np.random.randn(n_buses, n_buses)
        b_nd = np.random.randn(n_buses, n_buses)

        alpha, beta = compute_alpha_beta(e, f, g_nd, b_nd)

        assert alpha.shape == (n_buses,)
        assert beta.shape == (n_buses,)


class TestComputeDeltaLambda:
    """Test suite for compute_delta_lambda function."""

    def test_nonzero_diagonal(self):
        """Test with non-zero diagonal admittance."""
        pg = np.array([0.5])
        qg = np.array([0.1])
        pd = np.array([0.4])
        qd = np.array([0.08])
        e = np.array([1.0])
        f = np.array([0.0])
        g_diag = np.array([[2.0]])
        b_diag = np.array([[-5.0]])

        delta, lambda_i = compute_delta_lambda(pg, qg, pd, qd, e, f, g_diag, b_diag)

        # delta = pg - pd - (e^2 + f^2) * g_diag_value
        # = 0.5 - 0.4 - (1.0 + 0.0) * 2.0 = 0.1 - 2.0 = -1.9
        expected_delta = 0.5 - 0.4 - (1.0 + 0.0) * 2.0
        np.testing.assert_almost_equal(delta[0], expected_delta)


class TestNormalizeFeatures:
    """Test suite for normalize_features function."""

    def test_zero_vector_handling(self):
        """Test that zero vectors remain zero."""
        e = np.array([0.0, 1.0])
        f = np.array([0.0, 0.0])

        e_norm, f_norm = normalize_features(e, f)

        assert e_norm[0] == 0.0
        assert f_norm[0] == 0.0
        assert np.isfinite(e_norm[1])
        assert np.isfinite(f_norm[1])


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
