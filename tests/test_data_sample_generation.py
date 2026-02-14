"""
Minimal tests for sample generation module.
"""

from alloy.data import SampleGenerationConfig, SampleGenerator


def test_sample_generator_shapes():
    """Verify generated scenario shapes for case39."""
    config = SampleGenerationConfig(n_samples=2, seed=123)
    generator = SampleGenerator(config=config)
    scenarios = generator.generate()

    assert len(scenarios) == 2
    for scenario in scenarios:
        assert scenario.pd.ndim == 1
        assert scenario.qd.ndim == 1
        assert scenario.p_wind.ndim == 1
        assert scenario.p_solar.ndim == 1
        assert scenario.pd.shape == scenario.qd.shape
        assert scenario.p_wind.shape == scenario.p_solar.shape
