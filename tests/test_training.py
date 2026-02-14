"""
Minimal tests for training utilities.
"""

import numpy as np
import pandapower.networks as pn
import torch

from alloy.data import SampleGenerationConfig, SampleGenerator
from alloy.training import GCNNBatchBuilder, Trainer, TrainingConfig


class DummyModel(torch.nn.Module):
    """Simple linear model for training tests."""

    def __init__(self) -> None:
        super().__init__()
        self.linear = torch.nn.Linear(4, 2)

    def forward(self, x: torch.Tensor) -> torch.Tensor:
        return self.linear(x)


def test_trainer_runs_one_epoch():
    """Trainer should run without errors on dummy data."""
    model = DummyModel()
    optimizer = torch.optim.Adam(model.parameters(), lr=1e-3)

    def loss_fn(pred: torch.Tensor, target: torch.Tensor) -> torch.Tensor:
        return torch.mean((pred - target) ** 2)

    def batch_to_inputs(batch):
        return {"x": batch["x"]}, batch["y"]

    dataloader = [
        {"x": torch.randn(8, 4), "y": torch.randn(8, 2)},
        {"x": torch.randn(8, 4), "y": torch.randn(8, 2)},
    ]

    device = "cuda" if torch.cuda.is_available() else "cpu"
    trainer = Trainer(
        model, optimizer, loss_fn, TrainingConfig(epochs=1, device=device)
    )
    history = trainer.train(dataloader, batch_to_inputs)
    assert len(history) == 1


def test_gcnn_batch_builder_shapes():
    """GCNN batch builder should produce correct shapes."""
    config = SampleGenerationConfig(n_samples=2, seed=3)
    generator = SampleGenerator(net_factory=pn.case6ww, config=config)
    scenarios = generator.generate()

    def target_fn(net):
        return np.zeros((len(net.bus), 2), dtype=float)

    builder = GCNNBatchBuilder(
        net_builder=generator.build_net_for_scenario,
        target_fn=target_fn,
        num_iterations=2,
    )
    model_inputs, targets = builder(scenarios)

    assert model_inputs["node_features"].ndim == 3
    assert targets.ndim == 3
