"""
Core module: Physics-based computations for OPF and feature construction.

This module provides foundational numerical operations that are shared across
feature construction and neural network layers. It contains no external framework
dependencies beyond NumPy, making it highly testable and reusable.
"""

from .aggregation import (
    compute_alpha_beta,
    compute_delta_lambda,
    aggregate_features,
    normalize_features,
    compute_pg_qg,
    apply_power_limits,
)

from .admittance import (
    build_admittance_components,
    initialize_voltage_features,
)

__all__ = [
    "compute_alpha_beta",
    "compute_delta_lambda",
    "aggregate_features",
    "normalize_features",
    "compute_pg_qg",
    "apply_power_limits",
    "build_admittance_components",
    "initialize_voltage_features",
]
