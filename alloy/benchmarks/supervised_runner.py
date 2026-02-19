"""Reusable supervised benchmark runner.

This module centralizes the train/eval/checkpoint workflow so model plugins
can be compared under the same benchmark procedure across different datasets.
"""

from __future__ import annotations

import json
from datetime import datetime, timezone
from typing import Any, Callable

import torch
from torch.utils.data import DataLoader

from alloy.experiments.experiment_config import ExperimentConfig
from alloy.experiments.experiment_logger import ExperimentLogger
from alloy.losses import supervised_mse_loss
from alloy.training import Trainer


BatchToInputs = Callable[[object], tuple[dict[str, torch.Tensor], torch.Tensor]]


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
def evaluate_split_metrics(
    model: torch.nn.Module,
    dataloader: DataLoader,
    batch_to_inputs: BatchToInputs,
    device: str,
    pg_threshold_pu: float,
    vg_threshold_pu: float,
) -> dict[str, float]:
    """Evaluate loss and probabilistic accuracy on one split.

    Args:
        model: Model under evaluation.
        dataloader: Split dataloader.
        batch_to_inputs: Batch converter callable.
        device: Device string.
        pg_threshold_pu: Active power threshold in p.u.
        vg_threshold_pu: Voltage threshold in p.u.

    Returns:
        Dictionary with loss and probabilistic accuracy metrics.
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
        model_inputs = _to_device(model_inputs, device)
        targets = _to_device(targets, device)

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
        # TODO(metric-scope): Restrict probabilistic-accuracy denominator to
        # generator buses to match paper metric definition.
        total_elements += int(pg_ok.numel())

    denom_batches = max(total_batches, 1)
    denom_elements = max(total_elements, 1)
    return {
        "loss": total_loss / denom_batches,
        "pg_prob_acc": pg_hits / denom_elements,
        "vg_prob_acc": vg_hits / denom_elements,
        "joint_prob_acc": joint_hits / denom_elements,
    }


def run_supervised_benchmark(
    *,
    experiment: ExperimentConfig,
    model: torch.nn.Module,
    trainer: Trainer,
    dataloaders: dict[str, DataLoader],
    batch_to_inputs: BatchToInputs,
    pg_threshold_pu: float,
    vg_threshold_pu: float,
) -> dict[str, float]:
    """Run standardized supervised benchmark workflow.

    Args:
        experiment: Experiment configuration.
        model: Model instance.
        trainer: Trainer instance.
        dataloaders: Mapping with train/val/test_seen/test_unseen dataloaders.
        batch_to_inputs: Batch converter callable.
        pg_threshold_pu: Active power threshold in p.u.
        vg_threshold_pu: Voltage threshold in p.u.

    Returns:
        Dictionary containing split losses and probabilistic accuracies.
    """
    config = experiment.training
    logger = ExperimentLogger(config.run_dir)
    logger.log_config(experiment.to_dict())

    best_val = float("inf")
    best_epoch = -1
    best_train_loss = float("inf")
    checkpoint_path = config.run_dir / config.best_checkpoint_name
    checkpoint_meta_path = config.run_dir / "best_model_info.json"

    for epoch in range(config.epochs):
        epoch_start = datetime.now(timezone.utc)
        history = trainer.train(
            dataloaders["train"],
            batch_to_inputs,
            current_epoch=epoch + 1,
            total_epochs=config.epochs,
        )
        train_loss = history[-1]
        logger.log_epoch_loss(epoch + 1, train_loss)

        val_loss = trainer.evaluate(
            dataloaders["val"],
            batch_to_inputs,
            desc=f"val epoch {epoch + 1}/{config.epochs}",
        )
        logger.log_metric(f"val_epoch_{epoch + 1}", val_loss)

        if config.save_best_checkpoint and val_loss < best_val:
            best_val = val_loss
            best_epoch = epoch + 1
            best_train_loss = train_loss
            checkpoint_path.parent.mkdir(parents=True, exist_ok=True)
            checkpoint_meta = {
                "saved_at_utc": datetime.now(timezone.utc).isoformat(),
                "epoch": best_epoch,
                "train_loss": float(best_train_loss),
                "val_loss": float(best_val),
                "learning_rate": float(trainer.optimizer.param_groups[0]["lr"]),
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
                    "saved_at_utc": checkpoint_meta["saved_at_utc"],
                    "model_state_dict": model.state_dict(),
                    "optimizer_state_dict": trainer.optimizer.state_dict(),
                    "experiment": experiment.to_dict(),
                },
                checkpoint_path,
            )
            checkpoint_meta_path.write_text(
                json.dumps(checkpoint_meta, indent=2),
                encoding="utf-8",
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
        "val": evaluate_split_metrics(
            model=model,
            dataloader=dataloaders["val"],
            batch_to_inputs=batch_to_inputs,
            device=config.device,
            pg_threshold_pu=pg_threshold_pu,
            vg_threshold_pu=vg_threshold_pu,
        ),
        "test_seen": evaluate_split_metrics(
            model=model,
            dataloader=dataloaders["test_seen"],
            batch_to_inputs=batch_to_inputs,
            device=config.device,
            pg_threshold_pu=pg_threshold_pu,
            vg_threshold_pu=vg_threshold_pu,
        ),
        "test_unseen": evaluate_split_metrics(
            model=model,
            dataloader=dataloaders["test_unseen"],
            batch_to_inputs=batch_to_inputs,
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

    return {
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
