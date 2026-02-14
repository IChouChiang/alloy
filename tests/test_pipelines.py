"""
Unit tests for alloy.pipelines module.

Tests verify that pipelines correctly orchestrate core module functions
and produce expected outputs.
"""

from typing import cast

import numpy as np
import pytest
import pandapower as pp
import pandapower.networks as pn
from pandapower.auxiliary import pandapowerNet
from alloy.pipelines import FeatureConstructionPipeline, GCNNInputPipeline


class TestFeatureConstructionPipeline:
    """Test suite for FeatureConstructionPipeline."""

    def test_initialization(self):
        """Test pipeline initialization with case6ww network."""
        net = cast(pandapowerNet, pn.case6ww())
        pp.runpp(net)

        pipeline = FeatureConstructionPipeline(net)

        # Verify attributes are set
        assert pipeline.n_buses == len(net.bus)
        assert pipeline.baseMVA > 0
        assert pipeline.pd.shape == (pipeline.n_buses,)
        assert pipeline.qd.shape == (pipeline.n_buses,)
        assert pipeline.g_full.shape == (pipeline.n_buses, pipeline.n_buses)

    def test_run_output_shape(self):
        """Test that run() produces correct output shape."""
        net = cast(pandapowerNet, pn.case6ww())
        pp.runpp(net)
        pipeline = FeatureConstructionPipeline(net)

        for num_iters in [2, 3, 4]:
            e_features, f_features = pipeline.run(num_iters)

            assert e_features.shape == (pipeline.n_buses, num_iters)
            assert f_features.shape == (pipeline.n_buses, num_iters)

    def test_get_stacked_features(self):
        """Test stacked features output format."""
        net = cast(pandapowerNet, pn.case6ww())
        pp.runpp(net)
        pipeline = FeatureConstructionPipeline(net)

        num_iters = 4
        stacked = pipeline.get_stacked_features(num_iters)

        # Expected shape: (n_buses, 2*K)
        assert stacked.shape == (pipeline.n_buses, 2 * num_iters)

        # Verify stacking order: [e^0, e^1, ..., e^(K-1), f^0, f^1, ..., f^(K-1)]
        e_features, f_features = pipeline.run(num_iters)
        expected = np.column_stack([e_features, f_features])
        np.testing.assert_array_almost_equal(stacked, expected)


class TestGCNNInputPipeline:
    """Test suite for GCNNInputPipeline."""

    def test_prepare_output_shapes(self):
        """Test that prepare() returns correct output shapes."""
        net = cast(pandapowerNet, pn.case6ww())
        pp.runpp(net)
        pipeline = GCNNInputPipeline(net)

        num_iters = 4
        inputs = pipeline.prepare(num_iterations=num_iters)

        n_buses = len(net.bus)

        # Verify shapes
        assert inputs["node_features"].shape == (n_buses, 2 * num_iters)
        assert inputs["pd"].shape == (n_buses,)
        assert inputs["qd"].shape == (n_buses,)
        assert inputs["g_diag"].shape == (n_buses, n_buses)
        assert inputs["g_nd"].shape == (n_buses, n_buses)
        assert inputs["n_buses"] == n_buses
        assert inputs["num_iterations"] == num_iters

    def test_summarize_no_error(self):
        """Test that summarize() method works without error."""
        net = cast(pandapowerNet, pn.case6ww())
        pp.runpp(net)
        pipeline = GCNNInputPipeline(net)

        # Should not raise any exception
        pipeline.summarize(num_iterations=4)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
