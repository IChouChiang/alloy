"""
GCNN input pipeline: Data packaging for graph convolution layers.

This pipeline prepares all inputs (features, admittance matrices, load data)
into a clean dictionary format ready for neural network consumption.
"""

from typing import TypedDict

import numpy as np
from pandapower.auxiliary import pandapowerNet

from .feature_construction import FeatureConstructionPipeline


class GCNNInput(TypedDict):
    """Type definition for GCNN input package."""

    node_features: np.ndarray
    pd: np.ndarray
    qd: np.ndarray
    g_diag: np.ndarray
    b_diag: np.ndarray
    g_nd: np.ndarray
    b_nd: np.ndarray
    n_buses: int
    num_iterations: int


class GCNNInputPipeline:
    """Package GCNN inputs from a pandapower network and features.

    Attributes:
        feature_pipeline: FeatureConstructionPipeline instance.
        pd, qd: Active and reactive power demand (per-unit).
        g_diag, b_diag: Diagonal admittance matrices.
        g_nd, b_nd: Non-diagonal admittance matrices.
    """

    def __init__(self, net: pandapowerNet):
        """Initialize GCNN input pipeline with a network.

        Args:
            net: Initialized pandapower network.
        """
        self.feature_pipeline = FeatureConstructionPipeline(net)
        self.pd = self.feature_pipeline.pd
        self.qd = self.feature_pipeline.qd
        self.g_diag = self.feature_pipeline.g_diag
        self.b_diag = self.feature_pipeline.b_diag
        self.g_nd = self.feature_pipeline.g_nd
        self.b_nd = self.feature_pipeline.b_nd

    def prepare(self, num_iterations: int = 4) -> GCNNInput:
        """Prepare complete GCNN input package.

        Orchestrates feature construction and packages all GCNN inputs
        (node features, admittance matrices, load data) into a dictionary.

        Args:
            num_iterations: Number of feature construction iterations K.

        Returns:
            Dictionary with keys:
            - 'node_features': Shape (n_buses, 2*K), stacked e and f
            - 'pd': Shape (n_buses,), active power demand
            - 'qd': Shape (n_buses,), reactive power demand
            - 'g_diag': Shape (n_buses, n_buses), diagonal conductance
            - 'b_diag': Shape (n_buses, n_buses), diagonal susceptance
            - 'g_nd': Shape (n_buses, n_buses), non-diagonal conductance
            - 'b_nd': Shape (n_buses, n_buses), non-diagonal susceptance
            - 'n_buses': Integer, number of buses
            - 'num_iterations': Integer, K iterations used
        """
        # Generate node features
        node_features = self.feature_pipeline.get_stacked_features(num_iterations)

        return {
            "node_features": node_features,
            "pd": self.pd,
            "qd": self.qd,
            "g_diag": self.g_diag,
            "b_diag": self.b_diag,
            "g_nd": self.g_nd,
            "b_nd": self.b_nd,
            "n_buses": self.feature_pipeline.n_buses,
            "num_iterations": num_iterations,
        }

    def summarize(self, num_iterations: int = 4) -> None:
        """Print summary of prepared GCNN inputs.

        Args:
            num_iterations: Number of feature construction iterations K.
        """
        inputs = self.prepare(num_iterations)
        node_features = np.asarray(inputs["node_features"])
        pd = inputs["pd"]
        qd = inputs["qd"]

        print("=" * 70)
        print("GCNN Input Pipeline Summary")
        print("=" * 70)
        print(f"Iterations: {num_iterations}")
        print(f"Node features shape: {node_features.shape}")
        print(f"  Expected: ({inputs['n_buses']}, {2*num_iterations})")
        print(f"PD/QD shape: {pd.shape}/{qd.shape}")
        print(f"Admittance matrices: {self.g_diag.shape}")
        print(f"Node features sample: {node_features[:3]}")
        print("=" * 70)
