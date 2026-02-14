"""
Aggregation module: Core physics-guided neighborhood aggregation operations.

This module implements the fundamental aggregation and feature transformation
operations used in iterative feature construction and graph convolution layers.
These functions follow the physics-embedded formulation from the paper:
"A Physics-Guided Graph Convolution Neural Network for Optimal Power Flow"
(Gao et al., IEEE Trans. Power Systems, 2024).

Key equations implemented:
- Equations 12-13: alpha, beta (neighborhood aggregation features)
- Equations 15: delta, lambda (self-transformed features)
- Equations 14-15: Feature aggregation (Gaussian-Seidel iteration)
- Equation 25: Feature normalization
"""

import numpy as np


def compute_pg_qg(
    e: np.ndarray,
    f: np.ndarray,
    g: np.ndarray,
    b: np.ndarray,
    pd: np.ndarray,
    qd: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    """Compute active and reactive power generation using AC power flow equations.

    Implements the power flow equations in Cartesian coordinate system:
    PG_i = PD_i + sum_j (conductance/susceptance terms involving e,f)
    QG_i = QD_i + sum_j (conductance/susceptance terms involving e,f)

    Args:
        e: Real part of voltage in Cartesian form (per-unit).
            Shape: (n_buses,)
        f: Imaginary part of voltage in Cartesian form (per-unit).
            Shape: (n_buses,)
        g: Conductance matrix including diagonal elements.
            Shape: (n_buses, n_buses)
        b: Susceptance matrix including diagonal elements.
            Shape: (n_buses, n_buses)
        pd: Active power demand at each bus (per-unit).
            Shape: (n_buses,)
        qd: Reactive power demand at each bus (per-unit).
            Shape: (n_buses,)

    Returns:
        Tuple of (pg, qg) representing generated active and reactive power
        at each bus (per-unit). Both have shape (n_buses,).
    """
    sum_g_e_minus_b_f = g @ e - b @ f
    sum_g_f_plus_b_e = g @ f + b @ e
    pg = pd + e * sum_g_e_minus_b_f + f * sum_g_f_plus_b_e
    qg = qd + f * sum_g_e_minus_b_f - e * sum_g_f_plus_b_e
    return pg, qg


def apply_power_limits(
    pg: np.ndarray,
    qg: np.ndarray,
    pg_min: np.ndarray,
    pg_max: np.ndarray,
    qg_min: np.ndarray,
    qg_max: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    """Apply generator power limits by clipping to feasible bounds.

    Implements equations 23-24 from the paper to enforce practical constraints
    on generator outputs during feature construction.

    Args:
        pg: Active power generation (per-unit).
            Shape: (n_buses,)
        qg: Reactive power generation (per-unit).
            Shape: (n_buses,)
        pg_min: Minimum active power limit at each bus (per-unit).
            Shape: (n_buses,)
        pg_max: Maximum active power limit at each bus (per-unit).
            Shape: (n_buses,)
        qg_min: Minimum reactive power limit at each bus (per-unit).
            Shape: (n_buses,)
        qg_max: Maximum reactive power limit at each bus (per-unit).
            Shape: (n_buses,)

    Returns:
        Tuple of (pg_limited, qg_limited) after clipping to bounds.
        Both have shape (n_buses,).
    """
    pg_limited = np.maximum(np.minimum(pg, pg_max), pg_min)
    qg_limited = np.maximum(np.minimum(qg, qg_max), qg_min)
    return pg_limited, qg_limited


def compute_alpha_beta(
    e: np.ndarray, f: np.ndarray, g_nd: np.ndarray, b_nd: np.ndarray
) -> tuple[np.ndarray, np.ndarray]:
    """Compute neighborhood aggregation features alpha and beta.

    Implements equations 12-13 from the paper. These features represent
    the aggregated contributions from neighboring buses (non-diagonal
    admittance elements).

    The formulation separates:
    - alpha: contribution from conductance-real voltage and susceptance-imag voltage
    - beta: contribution from conductance-imag voltage and susceptance-real voltage

    Args:
        e: Real part of voltage in Cartesian form (per-unit).
            Shape: (n_buses,)
        f: Imaginary part of voltage in Cartesian form (per-unit).
            Shape: (n_buses,)
        g_nd: Non-diagonal conductance matrix (diagonal elements zeroed).
            Shape: (n_buses, n_buses)
        b_nd: Non-diagonal susceptance matrix (diagonal elements zeroed).
            Shape: (n_buses, n_buses)

    Returns:
        Tuple of (alpha, beta) neighborhood aggregation features.
        Both have shape (n_buses,).
    """
    alpha = g_nd @ e - b_nd @ f
    beta = g_nd @ f + b_nd @ e
    return alpha, beta


def compute_delta_lambda(
    pg: np.ndarray,
    qg: np.ndarray,
    pd: np.ndarray,
    qd: np.ndarray,
    e: np.ndarray,
    f: np.ndarray,
    g_diag: np.ndarray,
    b_diag: np.ndarray,
) -> tuple[np.ndarray, np.ndarray]:
    """Compute self-transformed features delta and lambda.

    Implements equation 15 from the paper. These features represent the
    impact of power injection and diagonal admittance (self-coupling) at
    each bus. They are derived by moving the diagonal terms to the LHS of
    the power flow equations.

    Args:
        pg: Active power generation (per-unit).
            Shape: (n_buses,)
        qg: Reactive power generation (per-unit).
            Shape: (n_buses,)
        pd: Active power demand (per-unit).
            Shape: (n_buses,)
        qd: Reactive power demand (per-unit).
            Shape: (n_buses,)
        e: Real part of voltage in Cartesian form (per-unit).
            Shape: (n_buses,)
        f: Imaginary part of voltage in Cartesian form (per-unit).
            Shape: (n_buses,)
        g_diag: Diagonal conductance matrix (off-diagonal elements zeroed).
            Shape: (n_buses, n_buses)
        b_diag: Diagonal susceptance matrix (off-diagonal elements zeroed).
            Shape: (n_buses, n_buses)

    Returns:
        Tuple of (delta, lambda_i) self-transformed features.
        Both have shape (n_buses,).
    """
    v_squared = e**2 + f**2
    delta = pg - pd - v_squared * np.diag(g_diag)
    lambda_i = qg - qd + v_squared * np.diag(b_diag)
    return delta, lambda_i


def aggregate_features(
    alpha: np.ndarray, beta: np.ndarray, delta: np.ndarray, lambda_i: np.ndarray
) -> tuple[np.ndarray, np.ndarray]:
    """Aggregate neighborhood features into new e and f values.

    Implements equations 14 from the paper. This step solves the linear system
    formed by alpha, beta, delta, and lambda to obtain updated voltage features.
    The solution represents one iteration of Gaussian-Seidel applied to the
    coupled power flow equations.

    Mathematical formulation:
    e_new = (delta * alpha - lambda_i * beta) / (alpha^2 + beta^2)
    f_new = (delta * beta + lambda_i * alpha) / (alpha^2 + beta^2)

    Args:
        alpha: Neighborhood aggregation feature alpha.
            Shape: (n_buses,)
        beta: Neighborhood aggregation feature beta.
            Shape: (n_buses,)
        delta: Self-transformed feature delta.
            Shape: (n_buses,)
        lambda_i: Self-transformed feature lambda.
            Shape: (n_buses,)

    Returns:
        Tuple of (e_new, f_new) updated voltage features.
        Both have shape (n_buses,).
        Note: Zero denominators are handled by setting features to 0.
    """
    denominator = alpha**2 + beta**2
    e_new = np.zeros_like(alpha)
    f_new = np.zeros_like(beta)
    nonzero = denominator != 0
    e_new[nonzero] = (
        delta[nonzero] * alpha[nonzero] - lambda_i[nonzero] * beta[nonzero]
    ) / denominator[nonzero]
    f_new[nonzero] = (
        delta[nonzero] * beta[nonzero] + lambda_i[nonzero] * alpha[nonzero]
    ) / denominator[nonzero]
    return e_new, f_new


def normalize_features(e: np.ndarray, f: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """Normalize voltage features to maintain e^2 + f^2 ≈ 1.

    Implements equation 25 from the paper. This normalization step is critical
    to prevent feature divergence during iterative aggregation. It projects
    the Cartesian voltage representation onto the unit circle in the complex plane.

    Args:
        e: Real part of voltage in Cartesian form (per-unit).
            Shape: (n_buses,)
        f: Imaginary part of voltage in Cartesian form (per-unit).
            Shape: (n_buses,)

    Returns:
        Tuple of (e_norm, f_norm) normalized voltage features.
        Both have shape (n_buses,).
        Note: If magnitude is 0, features remain 0 (absorbing state).
    """
    magnitude_squared = e**2 + f**2
    magnitude = np.sqrt(magnitude_squared)
    e_norm = np.zeros_like(e)
    f_norm = np.zeros_like(f)
    np.divide(e, magnitude, out=e_norm, where=magnitude != 0)
    np.divide(f, magnitude, out=f_norm, where=magnitude != 0)
    return e_norm, f_norm
