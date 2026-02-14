"""
Minimal tests for normalization utilities and dataset.
"""

import numpy as np

from alloy.data import (
    DatasetConfig,
    SampleGenerationConfig,
    SampleGenerator,
    ScenarioDataset,
    ZScoreNormalizer,
)


def test_zscore_roundtrip():
    """Verify that z-score normalization can be inverted."""
    x = np.random.randn(100, 5)
    norm = ZScoreNormalizer()
    z = norm.fit_transform(x)
    x_rec = norm.inverse_transform(z)
    np.testing.assert_allclose(x, x_rec, rtol=1e-6, atol=1e-6)


def test_scenario_dataset_shapes():
    """Verify dataset returns expected shapes."""
    config = SampleGenerationConfig(n_samples=3, seed=11)
    generator = SampleGenerator(config=config)
    scenarios = generator.generate()

    dataset = ScenarioDataset(scenarios, config=DatasetConfig(normalize_inputs=False))
    sample = dataset[0]

    assert sample["pd"].ndim == 1
    assert sample["qd"].ndim == 1
    assert sample["p_wind"].ndim == 1
    assert sample["p_solar"].ndim == 1
