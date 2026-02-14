"""
Training utilities for physics-guided GCNN.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any, Callable, Iterable, Mapping, Sized

import torch
import numpy as np
from pandapower.auxiliary import pandapowerNet

from alloy.data.sample_generation import SampleScenario
from alloy.pipelines import GCNNInputPipeline


BatchToInputs = Callable[[object], tuple[Mapping[str, torch.Tensor], torch.Tensor]]
LossFn = Callable[[torch.Tensor, torch.Tensor], torch.Tensor]
TargetFn = Callable[[pandapowerNet], np.ndarray]


@dataclass(frozen=True)
class TrainingConfig:
    """Training configuration.

    Args:
        epochs: Number of training epochs.
        device: Device string for training.
        log_every: Log interval in steps.
        show_progress: Whether to show progress bars.
    """

    epochs: int = 1
    device: str = "cuda"
    log_every: int = 100
    show_progress: bool = False


class Trainer:
    """Simple training loop wrapper.

    Args:
        model: PyTorch model.
        optimizer: Optimizer instance.
        loss_fn: Loss function.
        config: TrainingConfig.
    """

    def __init__(
        self,
        model: torch.nn.Module,
        optimizer: torch.optim.Optimizer,
        loss_fn: LossFn,
        config: TrainingConfig | None = None,
    ) -> None:
        self.model = model
        self.optimizer = optimizer
        self.loss_fn = loss_fn
        self.config = config or TrainingConfig()
        if self.config.device == "cuda" and not torch.cuda.is_available():
            self.config = TrainingConfig(
                epochs=self.config.epochs,
                device="cpu",
                log_every=self.config.log_every,
            )
        self.model.to(self.config.device)

    def train(
        self,
        dataloader: Iterable[object],
        batch_to_inputs: BatchToInputs,
        current_epoch: int | None = None,
        total_epochs: int | None = None,
    ) -> list[float]:
        """Run training for configured epochs.

        Args:
            dataloader: Iterable of batches.
            batch_to_inputs: Callable mapping batch to (model_inputs, targets).
            current_epoch: External epoch index (1-based) for progress display.
            total_epochs: External total epoch count for progress display.

        Returns:
            List of average epoch losses.
        """
        history: list[float] = []
        for epoch in range(self.config.epochs):
            self.model.train()
            total_loss = 0.0
            step_count = 0
            epoch_label = current_epoch if current_epoch is not None else (epoch + 1)
            total_label = (
                total_epochs if total_epochs is not None else self.config.epochs
            )
            desc = f"train epoch {epoch_label}/{total_label}"
            for step, batch in enumerate(
                self._progress_iter(dataloader, desc), start=1
            ):
                model_inputs, targets = batch_to_inputs(batch)
                model_inputs = self._to_device(model_inputs)
                targets = self._to_device(targets)
                preds = self.model(**model_inputs)
                loss = self.loss_fn(preds, targets)

                self.optimizer.zero_grad(set_to_none=True)
                loss.backward()
                self.optimizer.step()

                total_loss += float(loss.item())
                step_count += 1
                if step % self.config.log_every == 0:
                    pass

            avg_loss = total_loss / max(step_count, 1)
            history.append(avg_loss)
        return history

    @torch.no_grad()
    def evaluate(
        self,
        dataloader: Iterable[object],
        batch_to_inputs: BatchToInputs,
        desc: str = "eval",
    ) -> float:
        """Evaluate model loss.

        Args:
            dataloader: Iterable of batches.
            batch_to_inputs: Callable mapping batch to (model_inputs, targets).
            desc: Progress bar description.

        Returns:
            Average loss.
        """
        self.model.eval()
        total_loss = 0.0
        step_count = 0
        for batch in self._progress_iter(dataloader, desc):
            model_inputs, targets = batch_to_inputs(batch)
            model_inputs = self._to_device(model_inputs)
            targets = self._to_device(targets)
            preds = self.model(**model_inputs)
            loss = self.loss_fn(preds, targets)
            total_loss += float(loss.item())
            step_count += 1
        return total_loss / max(step_count, 1)

    def _progress_iter(
        self, dataloader: Iterable[object], desc: str
    ) -> Iterable[object]:
        if not self.config.show_progress:
            return dataloader
        try:
            from tqdm import tqdm
        except Exception:
            return dataloader

        total = None
        if isinstance(dataloader, Sized):
            try:
                total = len(dataloader)
            except TypeError:
                total = None
        return tqdm(dataloader, total=total, desc=desc, leave=False)

    def _to_device(self, data: Any) -> Any:
        """Move tensors to the configured device.

        Args:
            data: Tensor or container of tensors.

        Returns:
            Data with tensors moved to the configured device.
        """
        if isinstance(data, torch.Tensor):
            return data.to(self.config.device)
        if isinstance(data, dict):
            return {key: self._to_device(value) for key, value in data.items()}
        return data


@dataclass(frozen=True)
class GCNNBatchBuilder:
    """Build GCNN model inputs and targets from a sample scenario.

    Args:
        net_builder: Callable that applies a scenario and returns a pandapowerNet.
        target_fn: Callable that returns targets with shape (n_buses, 2).
        num_iterations: Number of feature construction iterations.

    Raises:
        ValueError: If batch size is not 1.
    """

    net_builder: Callable[[SampleScenario], pandapowerNet]
    target_fn: TargetFn
    num_iterations: int = 4

    def __call__(
        self, batch: SampleScenario | list[SampleScenario]
    ) -> tuple[Mapping[str, torch.Tensor], torch.Tensor]:
        scenarios = batch if isinstance(batch, list) else [batch]

        node_features_list = []
        pd_list = []
        qd_list = []
        targets_list = []

        g_diag = b_diag = g_nd = b_nd = None

        for scenario in scenarios:
            net = self.net_builder(scenario)
            pipeline = GCNNInputPipeline(net)
            gcnn_input = pipeline.prepare(num_iterations=self.num_iterations)

            node_features_list.append(gcnn_input["node_features"])
            pd_list.append(gcnn_input["pd"])
            qd_list.append(gcnn_input["qd"])
            targets_list.append(self.target_fn(net))

            if g_diag is None:
                g_diag = gcnn_input["g_diag"]
                b_diag = gcnn_input["b_diag"]
                g_nd = gcnn_input["g_nd"]
                b_nd = gcnn_input["b_nd"]

        node_features = torch.from_numpy(np.stack(node_features_list)).float()
        pd = np.stack(pd_list)
        qd = np.stack(qd_list)

        model_inputs = {
            "node_features": node_features,
            "pd": torch.from_numpy(pd).float(),
            "qd": torch.from_numpy(qd).float(),
            "g_diag": torch.from_numpy(g_diag).float(),
            "b_diag": torch.from_numpy(b_diag).float(),
            "g_nd": torch.from_numpy(g_nd).float(),
            "b_nd": torch.from_numpy(b_nd).float(),
        }

        targets = torch.from_numpy(np.stack(targets_list)).float()
        return model_inputs, targets
