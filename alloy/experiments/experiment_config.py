"""
Experiment configuration definitions.
"""

from __future__ import annotations

import json
from dataclasses import asdict, dataclass
from pathlib import Path
from typing import Any, Mapping


@dataclass(frozen=True)
class Case39ModelConfig:
    """Model hyperparameters for case39 training.

    Args:
        in_channels: Input feature dimension.
        gcn_channels: Channels per GCN layer.
        num_gcn_layers: Number of GCN layers.
        num_fc_layers: Number of FC layers.
        fc_hidden_dim: Hidden units per FC layer.
        output_dim: Output dimension per bus.
        model_name: Stable model ID in registry.
    """

    in_channels: int = 8
    gcn_channels: int = 8
    num_gcn_layers: int = 3
    num_fc_layers: int = 3
    fc_hidden_dim: int = 1000
    output_dim: int = 2
    model_name: str = "01_gcnn_gao"


@dataclass(frozen=True)
class Case39TrainingConfig:
    """Training configuration for case39 experiments.

    Args:
        data_dir: Directory containing case39 NPZ splits.
        batch_size: Batch size for training.
        num_workers: DataLoader workers.
        epochs: Number of training epochs.
        learning_rate: Learning rate for Adam optimizer.
        device: Device string ("cuda" or "cpu").
        num_iterations: Feature construction iterations.
        run_dir: Directory to save logs and outputs.
        save_best_checkpoint: Whether to save best model checkpoint.
        best_checkpoint_name: File name for best checkpoint.
    """

    data_dir: Path = Path("data/gcnn/case39")
    batch_size: int = 16
    num_workers: int = 0
    epochs: int = 1
    learning_rate: float = 1e-3
    device: str = "cuda"
    num_iterations: int = 4
    run_dir: Path = Path("runs/case39/default")
    save_best_checkpoint: bool = True
    best_checkpoint_name: str = "best_model.pt"


@dataclass(frozen=True)
class ExperimentConfig:
    """Experiment configuration.

    Args:
        name: Experiment name.
        model: Model configuration.
        training: Training configuration.
        seed: Random seed for reproducibility.
    """

    name: str
    model: Case39ModelConfig
    training: Case39TrainingConfig
    seed: int = 42

    def to_dict(self) -> dict[str, object]:
        """Convert config to a JSON-serializable dict."""
        data = asdict(self)
        data["model"] = asdict(self.model)
        data["training"] = asdict(self.training)
        data["training"]["data_dir"] = str(self.training.data_dir)
        data["training"]["run_dir"] = str(self.training.run_dir)
        return data

    def save(self, path: Path) -> None:
        """Save config to a JSON file.

        Args:
            path: Output path for JSON.
        """
        path.write_text(json.dumps(self.to_dict(), indent=2), encoding="utf-8")

    @staticmethod
    def from_dict(data: Mapping[str, Any]) -> "ExperimentConfig":
        """Load config from a dict.

        Args:
            data: Dictionary payload.

        Returns:
            ExperimentConfig instance.
        """
        model_data_raw = data.get("model", {})
        training_data_raw = data.get("training", {})
        model_data = model_data_raw if isinstance(model_data_raw, Mapping) else {}
        training_data = (
            training_data_raw if isinstance(training_data_raw, Mapping) else {}
        )
        return ExperimentConfig(
            name=str(data.get("name", "experiment")),
            model=Case39ModelConfig(**dict(model_data)),
            training=Case39TrainingConfig(
                data_dir=Path(training_data.get("data_dir", "data/gcnn/case39")),
                batch_size=int(training_data.get("batch_size", 16)),
                num_workers=int(training_data.get("num_workers", 0)),
                epochs=int(training_data.get("epochs", 1)),
                learning_rate=float(training_data.get("learning_rate", 1e-3)),
                device=str(training_data.get("device", "cuda")),
                num_iterations=int(training_data.get("num_iterations", 4)),
                run_dir=Path(training_data.get("run_dir", "runs/case39/default")),
                save_best_checkpoint=bool(
                    training_data.get("save_best_checkpoint", True)
                ),
                best_checkpoint_name=str(
                    training_data.get("best_checkpoint_name", "best_model.pt")
                ),
            ),
            seed=int(data.get("seed", 42)),
        )
