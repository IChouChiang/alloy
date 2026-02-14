"""Input adapters for Gao GCNN plugin v01."""

from __future__ import annotations

from typing import Mapping

import torch


def model_inputs_from_batch(
    batch_dict: Mapping[str, torch.Tensor],
    topology: Mapping[str, torch.Tensor],
) -> dict[str, torch.Tensor]:
    """Build GCNN model input dictionary from a materialized batch.

    Args:
        batch_dict: Batch tensors from materialized dataset.
        topology: Topology tensors keyed by g_diag/b_diag/g_nd/b_nd.

    Returns:
        Mapping accepted by the GCNN forward method.
    """
    return {
        "node_features": batch_dict["node_features"],
        "pd": batch_dict["pd"],
        "qd": batch_dict["qd"],
        "g_diag": topology["g_diag"],
        "b_diag": topology["b_diag"],
        "g_nd": topology["g_nd"],
        "b_nd": topology["b_nd"],
    }
