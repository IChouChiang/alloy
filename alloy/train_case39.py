"""
Train and evaluate GCNN on case39 dataset splits.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Callable, cast

import numpy as np
import pandapower as pp
import pandapower.networks as pn
import torch
from torch.utils.data import DataLoader
from pandapower.auxiliary import pandapowerNet

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
from alloy.experiments.experiment_logger import ExperimentLogger
from alloy.losses import supervised_mse_loss
from alloy.models.gcnn_gao_01 import model_inputs_from_batch
from alloy.models.registry import create_model
from alloy.training import GCNNBatchBuilder, Trainer, TrainingConfig


def _to_device(data: Any, device: str) -> Any:
    """Move tensors in nested containers to target device.

    Args:
        data: Tensor or nested dict/list of tensors.
        device: Target device string.

    Returns:
        Data with tensors moved to target device.
    """
    if isinstance(data, torch.Tensor):
        return data.to(device)
    if isinstance(data, dict):
        return {key: _to_device(value, device) for key, value in data.items()}
    if isinstance(data, list):
        return [_to_device(value, device) for value in data]
    return data


@torch.no_grad()
def _evaluate_split_metrics(
    model: torch.nn.Module,
    dataloader: DataLoader,
    batch_to_inputs: Callable[[object], tuple[dict[str, torch.Tensor], torch.Tensor]],
    device: str,
    pg_threshold_pu: float,
    vg_threshold_pu: float,
) -> dict[str, float]:
    """Evaluate loss and probabilistic accuracy on a split.

    Probabilistic accuracy follows the paper's threshold definition:
    P(|error| < threshold).

    Args:
        model: Model under evaluation.
        dataloader: Split dataloader.
        batch_to_inputs: Batch converter.
        device: Device string.
        pg_threshold_pu: Active power threshold in p.u.
        vg_threshold_pu: Voltage threshold in p.u.

    Returns:
        Dictionary with loss, PG/VG probabilistic accuracy, and joint accuracy.
    """
    model.eval()
    total_loss = 0.0
    total_batches = 0
    total_elements = 0
    pg_hits = 0
    vg_hits = 0
    joint_hits = 0

    for batch in dataloader:
        model_inputs, targets = batch_to_inputs(batch)
        model_inputs = cast(dict[str, torch.Tensor], _to_device(model_inputs, device))
        targets = cast(torch.Tensor, _to_device(targets, device))

        preds = model(**model_inputs)
        loss = supervised_mse_loss(preds, targets)
        total_loss += float(loss.item())
        total_batches += 1

        pg_err = torch.abs(preds[..., 0] - targets[..., 0])
        vg_err = torch.abs(preds[..., 1] - targets[..., 1])

        pg_ok = pg_err < pg_threshold_pu
        vg_ok = vg_err < vg_threshold_pu
        joint_ok = pg_ok & vg_ok

        pg_hits += int(pg_ok.sum().item())
        vg_hits += int(vg_ok.sum().item())
        joint_hits += int(joint_ok.sum().item())
        total_elements += int(pg_ok.numel())

    denom_batches = max(total_batches, 1)
    denom_elements = max(total_elements, 1)
    return {
        "loss": total_loss / denom_batches,
        "pg_prob_acc": pg_hits / denom_elements,
        "vg_prob_acc": vg_hits / denom_elements,
        "joint_prob_acc": joint_hits / denom_elements,
    }


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

    logger = ExperimentLogger(config.run_dir)
    logger.log_config(experiment.to_dict())

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

    best_val = float("inf")
    best_epoch = -1
    best_train_loss = float("inf")
    best_checkpoint_meta: dict[str, float | int | str] = {}
    checkpoint_path = config.run_dir / config.best_checkpoint_name
    checkpoint_meta_path = config.run_dir / "best_model_info.json"
    pg_threshold_pu = 1.0 / float(net.sn_mva)
    vg_threshold_pu = 1e-3

    for epoch in range(config.epochs):
        epoch_start = datetime.now(timezone.utc)
        history = trainer.train(
            dataloaders["train"],
            batch_to_inputs_fn,
            current_epoch=epoch + 1,
            total_epochs=config.epochs,
        )
        train_loss = history[-1]
        logger.log_epoch_loss(epoch + 1, train_loss)

        val_loss = trainer.evaluate(
            dataloaders["val"],
            batch_to_inputs_fn,
            desc=f"val epoch {epoch + 1}/{config.epochs}",
        )
        logger.log_metric(f"val_epoch_{epoch + 1}", val_loss)

        if config.save_best_checkpoint and val_loss < best_val:
            best_val = val_loss
            best_epoch = epoch + 1
            best_train_loss = train_loss
            checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
            best_checkpoint_meta = {
                "saved_at_utc": datetime.now(timezone.utc).isoformat(),
                "epoch": best_epoch,
                "train_loss": float(best_train_loss),
                "val_loss": float(best_val),
                "learning_rate": float(optimizer.param_groups[0]["lr"]),
                "batch_size": int(config.batch_size),
                "num_iterations": int(config.num_iterations),
                "device": str(config.device),
                "experiment_name": str(experiment.name),
                "checkpoint_path": str(checkpoint_path),
                "epoch_start_utc": epoch_start.isoformat(),
            }
            torch.save(
                {
                    "epoch": best_epoch,
                    "val_loss": best_val,
                    "train_loss": best_train_loss,
                    "saved_at_utc": best_checkpoint_meta["saved_at_utc"],
                    "model_state_dict": model.state_dict(),
                    "optimizer_state_dict": optimizer.state_dict(),
                    "experiment": experiment.to_dict(),
                },
                checkpoint_path,
            )
            checkpoint_meta_path.write_text(
                json.dumps(best_checkpoint_meta, indent=2), encoding="utf-8"
            )

    if config.save_best_checkpoint and checkpoint_path.exists():
        checkpoint = torch.load(checkpoint_path, map_location=config.device)
        model.load_state_dict(checkpoint["model_state_dict"])
        logger.log_metric("best_epoch", float(checkpoint.get("epoch", -1)))
        logger.log_metric("best_val", float(checkpoint.get("val_loss", float("inf"))))
        logger.log_metric(
            "best_train",
            float(checkpoint.get("train_loss", float("inf"))),
        )

    split_metrics = {
        "val": _evaluate_split_metrics(
            model=model,
            dataloader=dataloaders["val"],
            batch_to_inputs=batch_to_inputs_fn,
            device=config.device,
            pg_threshold_pu=pg_threshold_pu,
            vg_threshold_pu=vg_threshold_pu,
        ),
        "test_seen": _evaluate_split_metrics(
            model=model,
            dataloader=dataloaders["test_seen"],
            batch_to_inputs=batch_to_inputs_fn,
            device=config.device,
            pg_threshold_pu=pg_threshold_pu,
            vg_threshold_pu=vg_threshold_pu,
        ),
        "test_unseen": _evaluate_split_metrics(
            model=model,
            dataloader=dataloaders["test_unseen"],
            batch_to_inputs=batch_to_inputs_fn,
            device=config.device,
            pg_threshold_pu=pg_threshold_pu,
            vg_threshold_pu=vg_threshold_pu,
        ),
    }
    for split, metrics in split_metrics.items():
        logger.log_metric(split, metrics["loss"])
        logger.log_metric(f"{split}_pg_prob_acc", metrics["pg_prob_acc"])
        logger.log_metric(f"{split}_vg_prob_acc", metrics["vg_prob_acc"])
        logger.log_metric(f"{split}_joint_prob_acc", metrics["joint_prob_acc"])

    results = {
        "val": split_metrics["val"]["loss"],
        "test_seen": split_metrics["test_seen"]["loss"],
        "test_unseen": split_metrics["test_unseen"]["loss"],
        "val_pg_prob_acc": split_metrics["val"]["pg_prob_acc"],
        "val_vg_prob_acc": split_metrics["val"]["vg_prob_acc"],
        "val_joint_prob_acc": split_metrics["val"]["joint_prob_acc"],
        "test_seen_pg_prob_acc": split_metrics["test_seen"]["pg_prob_acc"],
        "test_seen_vg_prob_acc": split_metrics["test_seen"]["vg_prob_acc"],
        "test_seen_joint_prob_acc": split_metrics["test_seen"]["joint_prob_acc"],
        "test_unseen_pg_prob_acc": split_metrics["test_unseen"]["pg_prob_acc"],
        "test_unseen_vg_prob_acc": split_metrics["test_unseen"]["vg_prob_acc"],
        "test_unseen_joint_prob_acc": split_metrics["test_unseen"]["joint_prob_acc"],
    }
    return results


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
