"""
Train and evaluate GCNN on case39 dataset splits.
"""

from __future__ import annotations

from typing import Callable, cast

import numpy as np
import pandapower as pp
import pandapower.networks as pn
import torch
from torch.utils.data import DataLoader
from pandapower.auxiliary import pandapowerNet

from alloy.benchmarks.case39_runner import run_case39_benchmark
from alloy.data.dataset import (
    MaterializedCase39Dataset,
    ScenarioListDataset,
    load_case39_topology_tensors,
    load_scenarios_from_npz,
)
from alloy.data.sample_generation import (
    SampleGenerationConfig,
    SampleGenerator,
    SampleScenario,
)
from alloy.experiments.experiment_config import (
    Case39ModelConfig,
    Case39TrainingConfig,
    ExperimentConfig,
)
from alloy.losses import supervised_mse_loss
from alloy.models.gcnn_gao_01 import model_inputs_from_batch
from alloy.models.registry import create_model
from alloy.training import GCNNBatchBuilder, Trainer, TrainingConfig


def _build_target_fn() -> Callable[[pandapowerNet], np.ndarray]:
    """Build target function for [P_G, V_G] per bus.

    Returns:
        Callable that maps a pandapower net to targets with shape (n_buses, 2).

    Raises:
        RuntimeError: If power flow fails to converge.
    """

    def target_fn(net: pandapowerNet) -> np.ndarray:
        n_buses = len(net.bus)
        base_mva = float(net.sn_mva)

        try:
            pp.runpp(net, silent=True)
        except Exception:
            try:
                pp.runpp(
                    net,
                    silent=True,
                    init="flat",
                    max_iteration="50",
                    tolerance_mva=1e-6,
                )
            except Exception:
                return np.zeros((n_buses, 2), dtype=float)

        pg = np.zeros(n_buses, dtype=float)
        if not net.gen.empty:
            for idx, row in net.gen.iterrows():
                bus = int(row["bus"])
                pg[bus] += float(net.res_gen.at[idx, "p_mw"])

        if not net.ext_grid.empty:
            for idx, row in net.ext_grid.iterrows():
                bus = int(row["bus"])
                pg[bus] += float(net.res_ext_grid.at[idx, "p_mw"])

        pg_pu = pg / base_mva
        v_pu = net.res_bus["vm_pu"].to_numpy(dtype=float)
        return np.column_stack([pg_pu, v_pu])

    return target_fn


def _build_dataloaders(config: Case39TrainingConfig) -> dict[str, DataLoader]:
    """Create DataLoaders for case39 splits.

    Args:
        config: Case39 training configuration.

    Returns:
        Mapping of split name to DataLoader.
    """
    splits = {
        "train": config.data_dir / "case39_train.npz",
        "val": config.data_dir / "case39_val.npz",
        "test_seen": config.data_dir / "case39_test_seen.npz",
        "test_unseen": config.data_dir / "case39_test_unseen.npz",
    }

    dataloaders: dict[str, DataLoader] = {}
    for name, path in splits.items():
        scenarios = load_scenarios_from_npz(path)
        dataset = ScenarioListDataset(scenarios)
        dataloaders[name] = DataLoader(
            dataset,
            batch_size=config.batch_size,
            shuffle=(name == "train"),
            num_workers=config.num_workers,
            pin_memory=config.device.startswith("cuda"),
            collate_fn=lambda batch: batch,
        )
    return dataloaders


def _build_materialized_dataloaders(
    config: Case39TrainingConfig,
) -> dict[str, DataLoader]:
    """Create DataLoaders for materialized case39 splits.

    Args:
        config: Case39 training configuration.

    Returns:
        Mapping of split name to DataLoader.
    """
    splits = {
        "train": config.data_dir / "case39_train.npz",
        "val": config.data_dir / "case39_val.npz",
        "test_seen": config.data_dir / "case39_test_seen.npz",
        "test_unseen": config.data_dir / "case39_test_unseen.npz",
    }

    dataloaders: dict[str, DataLoader] = {}
    for name, path in splits.items():
        dataset = MaterializedCase39Dataset(path)
        dataloaders[name] = DataLoader(
            dataset,
            batch_size=config.batch_size,
            shuffle=(name == "train"),
            num_workers=config.num_workers,
            pin_memory=config.device.startswith("cuda"),
        )
    return dataloaders


def _has_materialized_dataset(config: Case39TrainingConfig) -> bool:
    """Check whether materialized dataset artifacts are available.

    Args:
        config: Case39 training configuration.

    Returns:
        True when required materialized files exist.
    """
    required = (
        config.data_dir / "case39_train.npz",
        config.data_dir / "case39_val.npz",
        config.data_dir / "case39_test_seen.npz",
        config.data_dir / "case39_test_unseen.npz",
        config.data_dir / "case39_topology.npz",
    )
    return all(path.exists() for path in required)


def train_case39(experiment: ExperimentConfig) -> dict[str, float]:
    """Train and evaluate GCNN on case39 splits.

    Args:
        experiment: Experiment configuration.

    Returns:
        Dictionary of evaluation losses.
    """
    config = experiment.training
    model_config = experiment.model
    net = cast(pandapowerNet, pn.case39())
    n_buses = len(net.bus)

    model = cast(
        torch.nn.Module,
        create_model(model_config.model_name, model_config, n_buses),
    )
    optimizer = torch.optim.Adam(model.parameters(), lr=config.learning_rate)
    trainer = Trainer(
        model,
        optimizer,
        supervised_mse_loss,
        TrainingConfig(epochs=1, device=config.device, show_progress=True),
    )

    use_materialized = _has_materialized_dataset(config)
    batch_to_inputs_fn: Callable[[object], tuple[dict[str, torch.Tensor], torch.Tensor]]

    if use_materialized:
        dataloaders = _build_materialized_dataloaders(config)
        topology = load_case39_topology_tensors(config.data_dir / "case39_topology.npz")

        def batch_to_inputs_materialized(
            batch: object,
        ) -> tuple[dict[str, torch.Tensor], torch.Tensor]:
            batch_dict = cast(dict[str, torch.Tensor], batch)
            model_inputs = model_inputs_from_batch(batch_dict, topology)
            return model_inputs, batch_dict["targets"]

        batch_to_inputs_fn = batch_to_inputs_materialized

    else:
        dataloaders = _build_dataloaders(config)
        generator = SampleGenerator(
            net_factory=lambda: cast(pandapowerNet, pn.case39()),
            config=SampleGenerationConfig(n_samples=1, seed=0),
        )
        batch_builder = GCNNBatchBuilder(
            net_builder=generator.build_net_for_scenario,
            target_fn=_build_target_fn(),
            num_iterations=config.num_iterations,
        )

        def batch_to_inputs_scenarios(
            batch: object,
        ) -> tuple[dict[str, torch.Tensor], torch.Tensor]:
            scenarios = cast(SampleScenario | list[SampleScenario], batch)
            return batch_builder(scenarios)

        batch_to_inputs_fn = batch_to_inputs_scenarios

    pg_threshold_pu = 1.0 / float(net.sn_mva)
    vg_threshold_pu = 1e-3
    return run_case39_benchmark(
        experiment=experiment,
        model=model,
        trainer=trainer,
        dataloaders=dataloaders,
        batch_to_inputs=batch_to_inputs_fn,
        pg_threshold_pu=pg_threshold_pu,
        vg_threshold_pu=vg_threshold_pu,
    )


def main() -> None:
    """Entry point for case39 training."""
    experiment = ExperimentConfig(
        name="case39_default",
        model=Case39ModelConfig(),
        training=Case39TrainingConfig(),
    )
    train_case39(experiment)


if __name__ == "__main__":
    main()
