"""Model registry for plugin-style model instantiation."""

from __future__ import annotations

from typing import Callable

from alloy.experiments.experiment_config import Case39ModelConfig

from .gcnn_gao_01 import GCNN as GCNN_GAO_01


ModelFactory = Callable[[Case39ModelConfig, int], object]


def _build_gcnn_gao_01(config: Case39ModelConfig, n_buses: int) -> GCNN_GAO_01:
    """Build Gao GCNN model plugin v01.

    Args:
        config: Model hyperparameter config.
        n_buses: Number of buses.

    Returns:
        Instantiated GCNN model.
    """
    return GCNN_GAO_01(
        n_buses=n_buses,
        in_channels=config.in_channels,
        gcn_channels=config.gcn_channels,
        num_gcn_layers=config.num_gcn_layers,
        num_fc_layers=config.num_fc_layers,
        fc_hidden_dim=config.fc_hidden_dim,
        output_dim=config.output_dim,
    )


_MODEL_FACTORIES: dict[str, ModelFactory] = {
    "01_gcnn_gao": _build_gcnn_gao_01,
}


def available_models() -> tuple[str, ...]:
    """Return supported model IDs."""
    return tuple(sorted(_MODEL_FACTORIES.keys()))


def create_model(
    model_name: str,
    config: Case39ModelConfig,
    n_buses: int,
) -> object:
    """Create model from registry.

    Args:
        model_name: Stable model identifier.
        config: Model config.
        n_buses: Number of buses.

    Returns:
        Instantiated model.

    Raises:
        ValueError: If model_name is unsupported.
    """
    factory = _MODEL_FACTORIES.get(model_name)
    if factory is None:
        supported = ", ".join(available_models())
        raise ValueError(f"Unknown model_name '{model_name}'. Supported: {supported}")
    return factory(config, n_buses)
