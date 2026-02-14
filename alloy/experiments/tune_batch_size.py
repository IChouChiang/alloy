"""
Batch-size hardware tuning for case39 GCNN training pipeline.
"""

from __future__ import annotations

import argparse
import csv
import time
from dataclasses import dataclass
from pathlib import Path
from typing import Iterable, TypeVar, TypedDict, cast

import torch
from torch.utils.data import DataLoader, Subset

from alloy.data.dataset import (
    MaterializedCase39Dataset,
    load_case39_topology_tensors,
)
from alloy.experiments.experiment_config import Case39ModelConfig
from alloy.models.registry import available_models, create_model


class TuneRow(TypedDict):
    """Result row for batch-size tuning."""

    batch_size: int
    learning_rate: float
    status: str
    steps: int
    epochs: int
    samples_per_sec: float
    peak_memory_mb: float
    start_loss: float
    end_loss: float
    loss_drop: float
    loss_drop_per_sec: float
    relative_drop_per_sec: float
    best_val_loss: float
    final_val_loss: float


T = TypeVar("T")


def _progress_iter(
    iterable: Iterable[T], desc: str, total: int | None = None
) -> Iterable[T]:
    """Wrap iterable with tqdm progress bar when available.

    Args:
        iterable: Source iterable.
        desc: Progress description.
        total: Optional known total length.

    Returns:
        Iterable with optional progress bar.
    """
    try:
        from tqdm import tqdm
    except Exception:
        return iterable
    return tqdm(iterable, desc=desc, total=total, leave=False)


@dataclass(frozen=True)
class BatchTuningConfig:
    """Configuration for batch-size tuning.

    Args:
        data_path: NPZ path for the training split.
        output_csv: Output CSV for benchmark results.
        min_batch_size: Starting batch size.
        max_batch_size: Maximum batch size to test.
        max_steps: Number of benchmark steps per batch size.
        epochs_per_batch: Number of short training epochs per batch size.
        num_workers: DataLoader workers.
        device: Device string.
        tiny_check: Whether to run tiny tuning mode.
        selection_metric: Metric used to select recommended batch size.
        objective: Whether to prioritize throughput or model quality.
        learning_rates: Learning-rate candidates.
        model_name: Stable model ID in registry.
    """

    data_path: Path = Path("data/gcnn/case39/case39_train.npz")
    output_csv: Path = Path("runs/case39/batch_tuning.csv")
    min_batch_size: int = 16
    max_batch_size: int = 1024
    max_steps: int = 20
    epochs_per_batch: int = 50
    num_workers: int = 0
    device: str = "cuda"
    tiny_check: bool = False
    selection_metric: str = "samples_per_sec"
    objective: str = "throughput"
    learning_rates: tuple[float, ...] = (1e-3,)
    model_name: str = "01_gcnn_gao"


def tune_batch_sizes(config: BatchTuningConfig) -> list[TuneRow]:
    """Benchmark throughput for increasing batch sizes.

    Args:
        config: Batch tuning configuration.

    Returns:
        List of benchmark rows.
    """
    dataset = MaterializedCase39Dataset(config.data_path)
    if config.tiny_check:
        tiny_count = min(2048, len(dataset))
        dataset = Subset(dataset, range(tiny_count))

    topology = load_case39_topology_tensors(
        config.data_path.parent / "case39_topology.npz"
    )
    topology_on_device = {
        key: value.to(config.device) for key, value in topology.items()
    }

    val_dataset = None
    val_dataloader = None
    if config.objective == "quality":
        val_path = config.data_path.parent / "case39_val.npz"
        if not val_path.exists():
            raise FileNotFoundError(
                f"Validation split not found for quality tuning: {val_path}"
            )
        val_dataset = MaterializedCase39Dataset(val_path)
        if config.tiny_check:
            tiny_val_count = min(1024, len(val_dataset))
            val_dataset = Subset(val_dataset, range(tiny_val_count))
        val_dataloader = DataLoader(
            val_dataset,
            batch_size=config.max_batch_size,
            shuffle=False,
            num_workers=config.num_workers,
            pin_memory=config.device.startswith("cuda"),
        )

    sample_item = dataset[0]
    n_buses = int(sample_item["node_features"].shape[0])
    model_cfg = Case39ModelConfig(model_name=config.model_name)
    loss_fn = torch.nn.MSELoss()

    rows: list[TuneRow] = []
    batch_sizes: list[int] = []
    batch_size = config.min_batch_size
    while batch_size <= config.max_batch_size:
        batch_sizes.append(batch_size)
        batch_size *= 2

    if config.objective == "quality" and config.selection_metric == "samples_per_sec":
        config = BatchTuningConfig(
            data_path=config.data_path,
            output_csv=config.output_csv,
            min_batch_size=config.min_batch_size,
            max_batch_size=config.max_batch_size,
            max_steps=config.max_steps,
            epochs_per_batch=config.epochs_per_batch,
            num_workers=config.num_workers,
            device=config.device,
            tiny_check=config.tiny_check,
            selection_metric="best_val_loss",
            objective=config.objective,
            learning_rates=config.learning_rates,
            model_name=config.model_name,
        )

    lr_values = config.learning_rates if config.objective == "quality" else (1e-3,)

    for batch_size_obj in _progress_iter(
        batch_sizes,
        desc="batch-size tuning",
        total=len(batch_sizes),
    ):
        batch_size = int(batch_size_obj)
        dataloader = DataLoader(
            dataset,
            batch_size=batch_size,
            shuffle=False,
            num_workers=config.num_workers,
            pin_memory=config.device.startswith("cuda"),
        )

        for lr in lr_values:
            try:
                model = cast(
                    torch.nn.Module,
                    create_model(config.model_name, model_cfg, n_buses),
                ).to(config.device)
                optimizer = torch.optim.Adam(model.parameters(), lr=lr)
                model.train()
                start_loss: float | None = None
                end_loss: float | None = None
                best_val_loss = float("inf")
                final_val_loss = float("inf")
                start = time.perf_counter()
                steps = 0
                total_samples = 0
                steps_per_epoch = min(config.max_steps, len(dataloader))
                progress_total = steps_per_epoch * config.epochs_per_batch

                for epoch_idx in range(config.epochs_per_batch):
                    epoch_iter = _progress_iter(
                        dataloader,
                        desc=(
                            f"benchmark bs={batch_size} lr={lr:g} "
                            f"epoch {epoch_idx + 1}/{config.epochs_per_batch}"
                        ),
                        total=steps_per_epoch,
                    )
                    epoch_steps = 0
                    for batch in epoch_iter:
                        batch_dict = cast(dict[str, torch.Tensor], batch)
                        model_inputs = {
                            "node_features": batch_dict["node_features"].to(
                                config.device
                            ),
                            "pd": batch_dict["pd"].to(config.device),
                            "qd": batch_dict["qd"].to(config.device),
                            "g_diag": topology_on_device["g_diag"],
                            "b_diag": topology_on_device["b_diag"],
                            "g_nd": topology_on_device["g_nd"],
                            "b_nd": topology_on_device["b_nd"],
                        }
                        targets = batch_dict["targets"].to(config.device)

                        preds = model(**model_inputs)
                        loss = loss_fn(preds, targets)
                        loss_value = float(loss.item())
                        if start_loss is None:
                            start_loss = loss_value
                        end_loss = loss_value

                        optimizer.zero_grad(set_to_none=True)
                        loss.backward()
                        optimizer.step()

                        batch_len = int(batch_dict["node_features"].shape[0])
                        total_samples += batch_len
                        steps += 1
                        epoch_steps += 1

                        if epoch_steps >= steps_per_epoch:
                            break

                    if config.objective == "quality" and val_dataloader is not None:
                        final_val_loss = _evaluate_loss(
                            model=model,
                            dataloader=val_dataloader,
                            topology=topology_on_device,
                            device=config.device,
                            loss_fn=loss_fn,
                        )
                        best_val_loss = min(best_val_loss, final_val_loss)

                    if steps >= progress_total:
                        break

                elapsed = time.perf_counter() - start
                samples_per_sec = total_samples / max(elapsed, 1e-9)
                safe_start_loss = start_loss if start_loss is not None else 0.0
                safe_end_loss = end_loss if end_loss is not None else safe_start_loss
                loss_drop = safe_start_loss - safe_end_loss
                loss_drop_per_sec = loss_drop / max(elapsed, 1e-9)
                relative_drop = loss_drop / max(abs(safe_start_loss), 1e-9)
                relative_drop_per_sec = relative_drop / max(elapsed, 1e-9)

                if config.device.startswith("cuda") and torch.cuda.is_available():
                    memory_mb = torch.cuda.max_memory_allocated() / (1024 * 1024)
                    torch.cuda.reset_peak_memory_stats()
                else:
                    memory_mb = 0.0

                rows.append(
                    {
                        "batch_size": batch_size,
                        "learning_rate": float(lr),
                        "status": "ok",
                        "steps": steps,
                        "epochs": config.epochs_per_batch,
                        "samples_per_sec": samples_per_sec,
                        "peak_memory_mb": memory_mb,
                        "start_loss": safe_start_loss,
                        "end_loss": safe_end_loss,
                        "loss_drop": loss_drop,
                        "loss_drop_per_sec": loss_drop_per_sec,
                        "relative_drop_per_sec": relative_drop_per_sec,
                        "best_val_loss": best_val_loss,
                        "final_val_loss": final_val_loss,
                    }
                )

            except RuntimeError as exc:
                if "out of memory" in str(exc).lower():
                    rows.append(
                        {
                            "batch_size": batch_size,
                            "learning_rate": float(lr),
                            "status": "oom",
                            "steps": 0,
                            "epochs": config.epochs_per_batch,
                            "samples_per_sec": 0.0,
                            "peak_memory_mb": 0.0,
                            "start_loss": 0.0,
                            "end_loss": 0.0,
                            "loss_drop": 0.0,
                            "loss_drop_per_sec": 0.0,
                            "relative_drop_per_sec": 0.0,
                            "best_val_loss": float("inf"),
                            "final_val_loss": float("inf"),
                        }
                    )
                    if torch.cuda.is_available():
                        torch.cuda.empty_cache()
                    break
                raise

    _write_rows(config.output_csv, rows)
    _print_recommendation(rows, config.selection_metric)
    return rows


def _print_recommendation(rows: list[TuneRow], selection_metric: str) -> None:
    """Print selected batch size under the requested metric.

    Args:
        rows: Tuning rows.
        selection_metric: Metric used for ranking.
    """
    metric_candidates = {
        "samples_per_sec",
        "loss_drop_per_sec",
        "relative_drop_per_sec",
        "best_val_loss",
        "final_val_loss",
    }
    if selection_metric not in metric_candidates:
        selection_metric = "samples_per_sec"

    ok_rows = [row for row in rows if row["status"] == "ok"]
    if not ok_rows:
        print("No valid batch size to recommend.")
        return

    if selection_metric in {"best_val_loss", "final_val_loss"}:
        best = min(ok_rows, key=lambda row: float(row[selection_metric]))
    else:
        best = max(ok_rows, key=lambda row: float(row[selection_metric]))
    print(
        "recommendation:",
        f"batch_size={best['batch_size']}",
        f"lr={best['learning_rate']}",
        f"metric={selection_metric}",
        f"value={float(best[selection_metric]):.8f}",
    )


@torch.no_grad()
def _evaluate_loss(
    model: torch.nn.Module,
    dataloader: DataLoader,
    topology: dict[str, torch.Tensor],
    device: str,
    loss_fn: torch.nn.MSELoss,
) -> float:
    """Evaluate average loss on a dataloader.

    Args:
        model: Model under evaluation.
        dataloader: Validation dataloader.
        topology: Topology tensors on target device.
        device: Device string.
        loss_fn: Loss function.

    Returns:
        Mean loss across validation batches.
    """
    model.eval()
    total_loss = 0.0
    count = 0
    for batch in dataloader:
        batch_dict = cast(dict[str, torch.Tensor], batch)
        model_inputs = {
            "node_features": batch_dict["node_features"].to(device),
            "pd": batch_dict["pd"].to(device),
            "qd": batch_dict["qd"].to(device),
            "g_diag": topology["g_diag"],
            "b_diag": topology["b_diag"],
            "g_nd": topology["g_nd"],
            "b_nd": topology["b_nd"],
        }
        targets = batch_dict["targets"].to(device)
        preds = model(**model_inputs)
        total_loss += float(loss_fn(preds, targets).item())
        count += 1
    model.train()
    return total_loss / max(count, 1)


def _write_rows(path: Path, rows: list[TuneRow]) -> None:
    """Write benchmark rows to CSV.

    Args:
        path: Output CSV path.
        rows: Benchmark rows.
    """
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(
            handle,
            fieldnames=[
                "batch_size",
                "learning_rate",
                "status",
                "steps",
                "epochs",
                "samples_per_sec",
                "peak_memory_mb",
                "start_loss",
                "end_loss",
                "loss_drop",
                "loss_drop_per_sec",
                "relative_drop_per_sec",
                "best_val_loss",
                "final_val_loss",
            ],
        )
        writer.writeheader()
        writer.writerows(rows)


def main() -> None:
    """Entry point for hardware batch-size tuning."""
    parser = argparse.ArgumentParser(description="Tune case39 training batch size.")
    parser.add_argument(
        "--data-path",
        type=str,
        default="data/gcnn/case39/case39_train.npz",
        help="Materialized training split path",
    )
    parser.add_argument(
        "--output-csv",
        type=str,
        default="runs/case39/batch_tuning.csv",
        help="Output CSV path",
    )
    parser.add_argument("--min-batch-size", type=int, default=16)
    parser.add_argument("--max-batch-size", type=int, default=1024)
    parser.add_argument("--max-steps", type=int, default=20)
    parser.add_argument("--epochs-per-batch", type=int, default=50)
    parser.add_argument("--num-workers", type=int, default=0)
    parser.add_argument("--device", type=str, default="cuda")
    parser.add_argument(
        "--model-name",
        type=str,
        default="01_gcnn_gao",
        choices=list(available_models()),
        help="Model ID from registry",
    )
    parser.add_argument(
        "--objective",
        type=str,
        default="throughput",
        choices=["throughput", "quality"],
        help=(
            "throughput: prioritize samples/s; "
            "quality: prioritize validation loss under fixed optimization steps"
        ),
    )
    parser.add_argument(
        "--learning-rates",
        type=str,
        default="0.001",
        help="Comma-separated learning rates, e.g. 0.001,0.0005",
    )
    parser.add_argument(
        "--selection-metric",
        type=str,
        default="samples_per_sec",
        choices=[
            "samples_per_sec",
            "loss_drop_per_sec",
            "relative_drop_per_sec",
            "best_val_loss",
            "final_val_loss",
        ],
        help=(
            "Metric for recommending batch size. " "Use best_val_loss in quality mode."
        ),
    )
    parser.add_argument(
        "--tiny-check",
        action="store_true",
        help="Run on a tiny subset for quick speed sanity check",
    )
    args = parser.parse_args()

    learning_rates = tuple(
        float(item.strip()) for item in args.learning_rates.split(",") if item.strip()
    )
    if len(learning_rates) == 0:
        learning_rates = (1e-3,)

    config = BatchTuningConfig(
        data_path=Path(args.data_path),
        output_csv=Path(args.output_csv),
        min_batch_size=args.min_batch_size,
        max_batch_size=args.max_batch_size,
        max_steps=args.max_steps,
        epochs_per_batch=args.epochs_per_batch,
        num_workers=args.num_workers,
        device=args.device,
        tiny_check=args.tiny_check,
        selection_metric=args.selection_metric,
        objective=args.objective,
        learning_rates=learning_rates,
        model_name=args.model_name,
    )
    tune_batch_sizes(config)


if __name__ == "__main__":
    main()
