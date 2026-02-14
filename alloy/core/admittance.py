"""
Admittance module: Admittance matrix operations and initialization.

This module provides utilities for handling admittance matrices, which encode
the network topology and electrical properties. It handles matrix splitting
into diagonal and non-diagonal components needed for physics-embedded
graph convolution operations.
"""

import numpy as np
from pandapower.auxiliary import pandapowerNet
from pandapower.pypower.makeYbus import makeYbus


def initialize_voltage_features(n_buses: int) -> tuple[np.ndarray, np.ndarray]:
    """Initialize voltage features with flat start values.

    Sets initial voltage to 1.0 pu magnitude and 0 angle at all buses.
    This is the standard flat-start assumption in power flow analysis.

    Args:
        n_buses: Number of buses in the power system.

    Returns:
        Tuple of (e, f) representing:
        - e: Real part of voltage (cos(angle)) = 1.0 for all buses
        - f: Imaginary part of voltage (sin(angle)) = 0.0 for all buses
        Both have shape (n_buses,).
    """
    v_mag = np.ones(n_buses)
    v_ang = np.zeros(n_buses)
    v_ang_rad = np.deg2rad(v_ang)
    e = v_mag * np.cos(v_ang_rad)
    f = v_mag * np.sin(v_ang_rad)
    return e, f


def build_admittance_components(
    net: pandapowerNet,
) -> tuple[np.ndarray, np.ndarray, np.ndarray, np.ndarray, float]:
    """Build admittance matrices and split into diagonal and non-diagonal parts.

    Extracts the bus admittance matrix (Ybus) from the pandapower network
    and decomposes it into:
    - Diagonal elements: self-admittance at each bus
    - Non-diagonal elements: mutual admittance between buses (representing branches)

    This decomposition is essential for the physics-embedded graph convolution
    formulation, where diagonal and non-diagonal terms play different roles.

    Args:
        net: Pandapower network object with initialized power system data.

    Returns:
        Tuple of (g_diag, b_diag, g_nd, b_nd, baseMVA):
        - g_diag: Diagonal conductance matrix (n_buses x n_buses)
        - b_diag: Diagonal susceptance matrix (n_buses x n_buses)
        - g_nd: Non-diagonal conductance matrix (n_buses x n_buses)
        - b_nd: Non-diagonal susceptance matrix (n_buses x n_buses)
        - baseMVA: Base power for per-unit conversion

    Raises:
        ValueError: If Ybus construction fails or network is invalid.
    """
    ppc = net._ppc
    baseMVA = ppc["baseMVA"]

    # Build bus admittance matrix from pandapower network
    # makeYbus returns: Ybus (admittance), Yf, Yt (branch admittances)
    ybus, _, _ = makeYbus(baseMVA, ppc["bus"], ppc["branch"])

    # Convert sparse matrix to dense if necessary
    if hasattr(ybus, "toarray"):
        ybus = ybus.toarray()

    # Extract real (conductance) and imaginary (susceptance) parts
    g = ybus.real
    b = ybus.imag

    # Split into diagonal and non-diagonal components
    # Diagonal contains self-admittance (shunt elements)
    # Non-diagonal contains branch admittances (mutual coupling)
    g_diag = np.diag(np.diag(g))
    b_diag = np.diag(np.diag(b))
    g_nd = g - g_diag
    b_nd = b - b_diag

    return g_diag, b_diag, g_nd, b_nd, baseMVA
