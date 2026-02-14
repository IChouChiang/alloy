"""
Experiment logging utilities.
"""

from __future__ import annotations

import csv
import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any


@dataclass
class ExperimentLogger:
    """Simple CSV/JSON logger for experiments.

    Args:
        run_dir: Directory to store logs.
    """

    run_dir: Path

    def __post_init__(self) -> None:
        self.run_dir.mkdir(parents=True, exist_ok=True)
        self.loss_path = self.run_dir / "loss_curve.csv"
        self.metrics_path = self.run_dir / "metrics.csv"

    def log_config(self, config: dict[str, Any]) -> None:
        """Persist experiment config as JSON.

        Args:
            config: JSON-serializable config dictionary.
        """
        config_path = self.run_dir / "config.json"
        config_path.write_text(json.dumps(config, indent=2), encoding="utf-8")

    def log_epoch_loss(self, epoch: int, loss: float) -> None:
        """Append epoch loss to CSV.

        Args:
            epoch: Epoch index (1-based).
            loss: Average epoch loss.
        """
        self._append_row(self.loss_path, ["epoch", "loss"], [epoch, loss])

    def log_metric(self, split: str, loss: float) -> None:
        """Append evaluation metric to CSV.

        Args:
            split: Dataset split name.
            loss: Evaluation loss.
        """
        self._append_row(self.metrics_path, ["split", "loss"], [split, loss])

    @staticmethod
    def _append_row(path: Path, header: list[str], row: list[Any]) -> None:
        exists = path.exists()
        with path.open("a", newline="", encoding="utf-8") as handle:
            writer = csv.writer(handle)
            if not exists:
                writer.writerow(header)
            writer.writerow(row)
