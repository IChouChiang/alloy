"""Case39 benchmark preset assembly.

This module builds case39-specific components while keeping benchmark execution
in the generic supervised runner.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Callable, cast

import numpy as np
import pandapower as pp
import pandapower.networks as pn
import torch
from pandapower.auxiliary import pandapowerNet
from torch.utils.data import DataLoader

from alloy.benchmarks.supervised_runner import BatchToInputs
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
from alloy.experiments.experiment_config import ExperimentConfig
from alloy.losses import supervised_mse_loss
from alloy.models.gcnn_gao_01 import model_inputs_from_batch
from alloy.models.registry import create_model
from alloy.training import GCNNBatchBuilder, Trainer, TrainingConfig


@dataclass(frozen=True)
class Case39Assembly:
    """Container for assembled case39 benchmark components.

    Attributes:
        model: Instantiated model.
        trainer: Trainer configured for one-epoch internal loop.
        dataloaders: Split dataloaders keyed by train/val/test_seen/test_unseen.
        batch_to_inputs: Callable converting a batch into model inputs/targets.
        pg_threshold_pu: Active power probabilistic-accuracy threshold in p.u.
        vg_threshold_pu: Voltage probabilistic-accuracy threshold in p.u.
    """

    model: torch.nn.Module
    trainer: Trainer
    dataloaders: dict[str, DataLoader]
    batch_to_inputs: BatchToInputs
    pg_threshold_pu: float
    vg_threshold_pu: float


def _build_target_fn() -> Callable[[pandapowerNet], np.ndarray]:
    """Build target function for [P_G, V_G] per bus.

    Returns:
        Callable that maps a pandapower net to targets with shape (n_buses, 2).
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


def _build_dataloaders(config) -> dict[str, DataLoader]:
    """Create DataLoaders for scenario-based case39 splits.

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


def _build_materialized_dataloaders(config) -> dict[str, DataLoader]:
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


def _has_materialized_dataset(config) -> bool:
    """Check whether required materialized case39 files exist.

    Args:
        config: Case39 training configuration.

    Returns:
        True if all required artifacts exist.
    """
    required = (
        config.data_dir / "case39_train.npz",
        config.data_dir / "case39_val.npz",
        config.data_dir / "case39_test_seen.npz",
        config.data_dir / "case39_test_unseen.npz",
        config.data_dir / "case39_topology.npz",
    )
    return all(path.exists() for path in required)


def assemble_case39(experiment: ExperimentConfig) -> Case39Assembly:
    """Assemble case39 benchmark components.

    Args:
        experiment: Full experiment configuration.

    Returns:
        `Case39Assembly` containing model, trainer, data loaders, and adapters.
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

    if _has_materialized_dataset(config):
        dataloaders = _build_materialized_dataloaders(config)
        topology = load_case39_topology_tensors(config.data_dir / "case39_topology.npz")

        def batch_to_inputs_materialized(batch: object):
            batch_dict = cast(dict[str, torch.Tensor], batch)
            model_inputs = model_inputs_from_batch(batch_dict, topology)
            return model_inputs, batch_dict["targets"]

        batch_to_inputs: BatchToInputs = batch_to_inputs_materialized
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

        def batch_to_inputs_scenarios(batch: object):
            scenarios = cast(SampleScenario | list[SampleScenario], batch)
            return batch_builder(scenarios)

        batch_to_inputs = batch_to_inputs_scenarios

    return Case39Assembly(
        model=model,
        trainer=trainer,
        dataloaders=dataloaders,
        batch_to_inputs=batch_to_inputs,
        pg_threshold_pu=1.0 / float(net.sn_mva),
        vg_threshold_pu=1e-3,
    )
