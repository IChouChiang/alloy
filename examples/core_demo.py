"""
Demonstration of core module usage with case6ww network.

This script shows how to use the core module functions independently
for feature construction and physics-based calculations.
"""

import numpy as np
import pandapower as pp
import pandapower.networks as pn
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


def extract_network_data(net):
    """Extract load and generator data from pandapower network."""
    baseMVA = net._ppc["baseMVA"]
    n_buses = len(net.bus)

    # Extract load data
    import pandas as pandas_lib

    pd_vec = pandas_lib.Series(0.0, index=net.bus.index)
    qd_vec = pandas_lib.Series(0.0, index=net.bus.index)
    if not net.load.empty:
        pd_vec.update(net.load.groupby("bus")["p_mw"].sum())
        qd_vec.update(net.load.groupby("bus")["q_mvar"].sum())
    pd = pd_vec.values / baseMVA
    qd = qd_vec.values / baseMVA

    # Extract generator limits
    pg_min = np.zeros(n_buses)
    pg_max = np.zeros(n_buses)
    qg_min = np.zeros(n_buses)
    qg_max = np.zeros(n_buses)
    for _, gen_row in net.gen.iterrows():
        bus_idx = gen_row["bus"]
        pg_min[bus_idx] = gen_row["min_p_mw"] / baseMVA
        pg_max[bus_idx] = gen_row["max_p_mw"] / baseMVA
        qg_min[bus_idx] = gen_row["min_q_mvar"] / baseMVA
        qg_max[bus_idx] = gen_row["max_q_mvar"] / baseMVA

    return pd, qd, pg_min, pg_max, qg_min, qg_max, baseMVA


def main():
    """Main demonstration using case6ww."""
    print("=" * 70)
    print("ALLOY Core Module Demonstration with case6ww")
    print("=" * 70)

    # Load and prepare network
    print("\n[STEP 1] Loading case6ww network...")
    net = pn.case6ww()
    pp.runpp(net)
    n_buses = len(net.bus)
    print(f"  Network loaded: {n_buses} buses")

    # Initialize voltage features
    print("\n[STEP 2] Initializing voltage features (flat start)...")
    e, f = initialize_voltage_features(n_buses)
    v_mag = np.sqrt(e**2 + f**2)
    print(f"  Voltage magnitude: min={v_mag.min():.4f}, max={v_mag.max():.4f}")
    print(f"  Sample e[:3]: {e[:3]}")
    print(f"  Sample f[:3]: {f[:3]}")

    # Build admittance components
    print("\n[STEP 3] Building admittance matrix components...")
    g_diag, b_diag, g_nd, b_nd, baseMVA = build_admittance_components(net)
    g_full = g_diag + g_nd
    b_full = b_diag + b_nd
    print(f"  Base MVA: {baseMVA}")
    print(f"  Admittance matrix size: {g_full.shape}")
    print(f"  Non-diagonal elements (sparsity): {np.count_nonzero(g_nd)}/{g_nd.size}")

    # Extract network data
    print("\n[STEP 4] Extracting load and generator data...")
    pd, qd, pg_min, pg_max, qg_min, qg_max, _ = extract_network_data(net)
    print(f"  Total load (PD): {pd.sum():.4f} p.u.")
    print(f"  Total load (QD): {qd.sum():.4f} p.u.")
    print(f"  Generator capacity: {pg_max.sum():.4f} p.u.")

    # Demonstrate one iteration of feature construction
    print("\n[STEP 5] Computing power generation (PG, QG)...")
    pg, qg = compute_pg_qg(e, f, g_full, b_full, pd, qd)
    print(f"  Initial PG: min={pg.min():.4f}, max={pg.max():.4f}")
    print(f"  Initial QG: min={qg.min():.4f}, max={qg.max():.4f}")

    # Apply power limits
    print("\n[STEP 6] Applying power generation limits...")
    pg_limited, qg_limited = apply_power_limits(pg, qg, pg_min, pg_max, qg_min, qg_max)
    print(f"  After limits PG: min={pg_limited.min():.4f}, max={pg_limited.max():.4f}")
    print(f"  After limits QG: min={qg_limited.min():.4f}, max={qg_limited.max():.4f}")

    # Compute aggregation features
    print("\n[STEP 7] Computing neighborhood aggregation (alpha, beta)...")
    alpha, beta = compute_alpha_beta(e, f, g_nd, b_nd)
    print(f"  Alpha: min={alpha.min():.4f}, max={alpha.max():.4f}")
    print(f"  Beta: min={beta.min():.4f}, max={beta.max():.4f}")

    # Compute self-transformed features
    print("\n[STEP 8] Computing self-transformed features (delta, lambda)...")
    delta, lambda_i = compute_delta_lambda(
        pg_limited, qg_limited, pd, qd, e, f, g_diag, b_diag
    )
    print(f"  Delta: min={delta.min():.4f}, max={delta.max():.4f}")
    print(f"  Lambda: min={lambda_i.min():.4f}, max={lambda_i.max():.4f}")

    # Aggregate features
    print("\n[STEP 9] Aggregating features into new e, f...")
    e_new, f_new = aggregate_features(alpha, beta, delta, lambda_i)
    v_mag_new = np.sqrt(e_new**2 + f_new**2)
    print(
        f"  New voltage magnitude: min={v_mag_new.min():.4f}, max={v_mag_new.max():.4f}"
    )
    print(f"  Sample e_new[:3]: {e_new[:3]}")
    print(f"  Sample f_new[:3]: {f_new[:3]}")

    # Normalize features
    print("\n[STEP 10] Normalizing voltage features...")
    e_norm, f_norm = normalize_features(e_new, f_new)
    v_mag_norm = np.sqrt(e_norm**2 + f_norm**2)
    print(
        f"  Normalized voltage magnitude: min={v_mag_norm.min():.4f}, max={v_mag_norm.max():.4f}"
    )
    print(
        f"  All normalized to unit magnitude: {np.allclose(v_mag_norm[v_mag_norm > 1e-6], 1.0)}"
    )

    # Iterative aggregation
    print("\n[STEP 11] Running 4 iterations of feature aggregation...")
    e_iter, f_iter = e.copy(), f.copy()
    for iter_num in range(4):
        pg_iter, qg_iter = compute_pg_qg(e_iter, f_iter, g_full, b_full, pd, qd)
        pg_iter, qg_iter = apply_power_limits(
            pg_iter, qg_iter, pg_min, pg_max, qg_min, qg_max
        )
        alpha_iter, beta_iter = compute_alpha_beta(e_iter, f_iter, g_nd, b_nd)
        delta_iter, lambda_iter = compute_delta_lambda(
            pg_iter, qg_iter, pd, qd, e_iter, f_iter, g_diag, b_diag
        )
        e_iter, f_iter = aggregate_features(
            alpha_iter, beta_iter, delta_iter, lambda_iter
        )
        e_iter, f_iter = normalize_features(e_iter, f_iter)
        v_mag_iter = np.sqrt(e_iter**2 + f_iter**2)
        print(f"  Iteration {iter_num+1}: voltage mag mean={v_mag_iter.mean():.6f}")

    # Stack features for GCNN input
    print("\n[STEP 12] Preparing stacked features for GCNN...")
    e_iter, f_iter = e.copy(), f.copy()
    e_features = [e_iter.copy()]
    f_features = [f_iter.copy()]
    for _ in range(3):  # 3 more iterations (4 total)
        pg_iter, qg_iter = compute_pg_qg(e_iter, f_iter, g_full, b_full, pd, qd)
        pg_iter, qg_iter = apply_power_limits(
            pg_iter, qg_iter, pg_min, pg_max, qg_min, qg_max
        )
        alpha_iter, beta_iter = compute_alpha_beta(e_iter, f_iter, g_nd, b_nd)
        delta_iter, lambda_iter = compute_delta_lambda(
            pg_iter, qg_iter, pd, qd, e_iter, f_iter, g_diag, b_diag
        )
        e_iter, f_iter = aggregate_features(
            alpha_iter, beta_iter, delta_iter, lambda_iter
        )
        e_iter, f_iter = normalize_features(e_iter, f_iter)
        e_features.append(e_iter.copy())
        f_features.append(f_iter.copy())

    # Stack into single feature matrix
    node_features = np.column_stack([*e_features, *f_features])
    print(f"  Stacked feature shape: {node_features.shape}")
    print(f"  Expected shape: ({n_buses}, {2*4}) = ({n_buses}, 8)")
    assert node_features.shape == (n_buses, 8), "Feature stacking dimension mismatch!"
    print("  ✓ Feature dimensions match GCNN input requirement!")

    print("\n" + "=" * 70)
    print("Core Module Demonstration Complete")
    print("=" * 70)
    print("\nKey Results:")
    print(f"  - Network: {n_buses} buses, {len(net.line)} lines")
    print(f"  - Feature construction: K=4 iterations → 8-dimensional features")
    print(f"  - Output shape ready for graph convolution layer")
    print("\nNext Step: Implement GSGCNLayer to process these features")
    print("=" * 70)


if __name__ == "__main__":
    main()
