"""
Feature construction pipeline: Iterative physics-guided feature generation.

This pipeline orchestrates the core aggregation functions to perform
K iterations of feature construction, producing stacked (e,f) features
ready for GCNN input. All heavy lifting is delegated to core module.
"""

import numpy as np
import pandas as pd
import pandapower as pp
from pandapower.auxiliary import pandapowerNet

from alloy.core import (
    initialize_voltage_features,
    build_admittance_components,
    compute_pg_qg,
    apply_power_limits,
    compute_alpha_beta,
    compute_delta_lambda,
    aggregate_features,
    normalize_features,
)


class FeatureConstructionPipeline:
    """Iterative feature construction pipeline for OPF.

    This pipeline implements the model-informed feature construction strategy
    from the paper, running K iterations of physics-guided aggregation to
    extract topology and physical features into node vectors.

    Attributes:
        net: Pandapower network object.
        n_buses: Number of buses in the network.
        baseMVA: Base power for per-unit conversion.
        g_full, b_full: Full admittance matrices (diagonal + non-diagonal).
        g_diag, b_diag: Diagonal admittance matrices.
        g_nd, b_nd: Non-diagonal admittance matrices.
        pd, qd: Active and reactive power demand vectors (per-unit).
        pg_min, pg_max: Active power generation limits (per-unit).
        qg_min, qg_max: Reactive power generation limits (per-unit).
    """

    def __init__(self, net: pandapowerNet):
        """Initialize pipeline with a pandapower network.

        Args:
            net: Pandapower network (will run power flow if not already run).

        Raises:
            ValueError: If network data is invalid or incomplete.
        """
        self.net = net
        self.n_buses = len(net.bus)

        # Ensure power flow is run to initialize network data
        if not self._has_valid_powerflow_results():
            try:
                pp.runpp(self.net, silent=True)
            except Exception as e:
                print(f"Warning: Power flow did not converge: {e}")

        # Build admittance components
        self.g_diag, self.b_diag, self.g_nd, self.b_nd, self.baseMVA = (
            build_admittance_components(net)
        )
        self.g_full = self.g_diag + self.g_nd
        self.b_full = self.b_diag + self.b_nd

        # Extract network data
        self._extract_network_data()

    def _has_valid_powerflow_results(self) -> bool:
        """Check whether network already has valid power flow results.

        Returns:
            True if res_bus exists with voltage magnitude results.
        """
        if not hasattr(self.net, "res_bus"):
            return False
        if self.net.res_bus.empty:
            return False
        if "vm_pu" not in self.net.res_bus.columns:
            return False
        return bool(self.net.res_bus["vm_pu"].notna().all())

    def _extract_network_data(self) -> None:
        """Extract and preprocess load and generator data from network."""
        # Extract load data
        pd_vec = pd.Series(0.0, index=self.net.bus.index)
        qd_vec = pd.Series(0.0, index=self.net.bus.index)
        if not self.net.load.empty:
            pd_vec.update(self.net.load.groupby("bus")["p_mw"].sum())
            qd_vec.update(self.net.load.groupby("bus")["q_mvar"].sum())
        base_mva = float(self.baseMVA)
        self.pd = pd_vec.to_numpy(dtype=float) / base_mva
        self.qd = qd_vec.to_numpy(dtype=float) / base_mva

        # Extract generator limits
        self.pg_min = np.zeros(self.n_buses)
        self.pg_max = np.zeros(self.n_buses)
        self.qg_min = np.zeros(self.n_buses)
        self.qg_max = np.zeros(self.n_buses)
        for _, gen_row in self.net.gen.iterrows():
            bus_idx = gen_row["bus"]
            self.pg_min[bus_idx] = gen_row["min_p_mw"] / self.baseMVA
            self.pg_max[bus_idx] = gen_row["max_p_mw"] / self.baseMVA
            self.qg_min[bus_idx] = gen_row["min_q_mvar"] / self.baseMVA
            self.qg_max[bus_idx] = gen_row["max_q_mvar"] / self.baseMVA

    def run(self, num_iterations: int = 4) -> tuple[np.ndarray, np.ndarray]:
        """Run feature construction for K iterations.

        Implements Algorithm 1 from the paper: iterative feature construction
        with physics-guided aggregation and normalization.

        Args:
            num_iterations: Number of iterations K. Paper uses K=3 or K=4.
                Shape: scalar
                Typical values: 3, 4, or 10 (paper shows K<=10 before divergence)

        Returns:
            Tuple of (e_features, f_features) where each element is shape
            (n_buses, num_iterations). Stacking them gives (n_buses, 2*K).
        """
        # Initialize flat-start voltage features
        e, f = initialize_voltage_features(self.n_buses)

        # Store all iterations for stacking
        e_features = [e.copy()]
        f_features = [f.copy()]

        # Run K-1 more iterations (first is already stored)
        for _ in range(num_iterations - 1):
            # Compute power generation
            pg, qg = compute_pg_qg(e, f, self.g_full, self.b_full, self.pd, self.qd)

            # Apply power limits
            pg, qg = apply_power_limits(
                pg, qg, self.pg_min, self.pg_max, self.qg_min, self.qg_max
            )

            # Compute neighborhood aggregation features
            alpha, beta = compute_alpha_beta(e, f, self.g_nd, self.b_nd)

            # Compute self-transformed features
            delta, lambda_i = compute_delta_lambda(
                pg, qg, self.pd, self.qd, e, f, self.g_diag, self.b_diag
            )

            # Aggregate features into new e, f
            e, f = aggregate_features(alpha, beta, delta, lambda_i)

            # Normalize to prevent divergence
            e, f = normalize_features(e, f)

            # Store this iteration
            e_features.append(e.copy())
            f_features.append(f.copy())

        return np.column_stack(e_features), np.column_stack(f_features)

    def get_stacked_features(self, num_iterations: int = 4) -> np.ndarray:
        """Run pipeline and return stacked features for GCNN input.

        Convenience method that runs feature construction and stacks
        e and f features into a single (n_buses, 2*K) matrix.

        Args:
            num_iterations: Number of iterations K.

        Returns:
            Stacked features array of shape (n_buses, 2*num_iterations).
            Columns are [e^0, e^1, ..., e^(K-1), f^0, f^1, ..., f^(K-1)].
        """
        e_features, f_features = self.run(num_iterations)
        return np.column_stack([e_features, f_features])
