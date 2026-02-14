"""
End-to-end demo: Feature construction pipeline + GCNN layer inference.

This script demonstrates:
1. Loading a pandapower network
2. Constructing 8-dimensional features through iterative physics aggregation
3. Passing features through a physics-guided graph convolution layer
4. Verifying output dimensions and value ranges

Usage:
    python examples/pipeline_gcnn_demo.py
"""

from typing import cast

import numpy as np
import torch
from pandapower.auxiliary import pandapowerNet
from pandapower.networks import case6ww

from alloy.pipelines import FeatureConstructionPipeline, GCNNInputPipeline
from alloy.pipelines.gcnn_input import GCNNInput
from alloy.models import GSGCNLayer


def demo_feature_construction() -> tuple[pandapowerNet, np.ndarray]:
    """Demo: Feature construction pipeline."""
    print("\n" + "=" * 70)
    print("DEMO 1: Feature Construction Pipeline")
    print("=" * 70)

    # Load test network
    net = cast(pandapowerNet, case6ww())
    print(f"Loaded network: {len(net.bus)} buses, {len(net.line)} lines")

    # Initialize pipeline
    pipeline = FeatureConstructionPipeline(net)
    print(f"Pipeline initialized for {pipeline.n_buses} buses")

    # Run K iterations of physics aggregation
    K = 4
    e_features, f_features = pipeline.run(num_iterations=K)

    print(f"\nAfter {K} iterations of physics aggregation:")
    print(f"  e_features shape: {e_features.shape}")  # (n_buses, K)
    print(f"  f_features shape: {f_features.shape}")  # (n_buses, K)
    print(f"  e_features range: [{e_features.min():.4f}, {e_features.max():.4f}]")
    print(f"  f_features range: [{f_features.min():.4f}, {f_features.max():.4f}]")

    # Get stacked features for GCNN input
    stacked = pipeline.get_stacked_features(num_iterations=K)
    print(f"\nStacked features: {stacked.shape}")  # (n_buses, 2*K)
    print(f"  Stacking: [e^0, e^1, ..., e^{K-1}, f^0, f^1, ..., f^{K-1}]")

    return net, stacked


def demo_gcnn_input_pipeline(net: pandapowerNet) -> GCNNInput:
    """Demo: GCNN input preparation pipeline."""
    print("\n" + "=" * 70)
    print("DEMO 2: GCNN Input Pipeline")
    print("=" * 70)

    # Initialize pipeline
    pipeline = GCNNInputPipeline(net)

    # Prepare all GCNN inputs
    K = 4
    gcnn_input = pipeline.prepare(num_iterations=K)

    print("Prepared GCNN inputs:")
    print(f"  node_features: {gcnn_input['node_features'].shape}")
    print(f"  pd (load): {gcnn_input['pd'].shape}")
    print(f"  qd (load): {gcnn_input['qd'].shape}")
    print(f"  g_diag (conductance): {gcnn_input['g_diag'].shape}")
    print(f"  b_diag (susceptance): {gcnn_input['b_diag'].shape}")
    print(f"  g_nd (off-diag conductance): {gcnn_input['g_nd'].shape}")
    print(f"  b_nd (off-diag susceptance): {gcnn_input['b_nd'].shape}")

    # Print summary
    print("\nGCNN Input Pipeline Summary:")
    pipeline.summarize()

    return gcnn_input


def demo_gcnn_layer(gcnn_input: GCNNInput) -> torch.Tensor:
    """Demo: Physics-guided graph convolution layer forward pass."""
    print("\n" + "=" * 70)
    print("DEMO 3: GSGCNLayer Forward Pass")
    print("=" * 70)

    # Extract inputs
    node_features = gcnn_input["node_features"]  # (n_buses, 8)
    pd = gcnn_input["pd"]
    qd = gcnn_input["qd"]
    g_diag = gcnn_input["g_diag"]
    b_diag = gcnn_input["b_diag"]
    g_nd = gcnn_input["g_nd"]
    b_nd = gcnn_input["b_nd"]

    # Create layer
    in_channels = node_features.shape[1]  # 8
    out_channels = 8
    layer = GSGCNLayer(in_channels, out_channels)

    print(f"Created GSGCNLayer: {in_channels} -> {out_channels} channels")
    print(f"  W1 shape: {layer.W1.shape}")
    print(f"  W2 shape: {layer.W2.shape}")
    print(f"  B1 shape: {layer.B1.shape}")
    print(f"  B2 shape: {layer.B2.shape}")

    # Convert to torch
    node_features_torch = torch.from_numpy(node_features).float()

    # Forward pass
    output = layer(node_features_torch, pd, qd, g_diag, b_diag, g_nd, b_nd)

    print(f"\nForward pass results:")
    print(f"  Input shape: {node_features_torch.shape}")
    print(f"  Output shape: {output.shape}")
    print(f"  Output dtype: {output.dtype}")
    print(f"  Output range: [{output.min():.4f}, {output.max():.4f}]")
    print(f"  Output mean: {output.mean():.4f}, std: {output.std():.4f}")

    # Verify output properties
    assert output.shape == (
        node_features.shape[0],
        out_channels,
    ), "Output shape mismatch"
    assert torch.all(output >= -1.0) and torch.all(
        output <= 1.0
    ), "Output out of tanh bounds"
    assert torch.all(torch.isfinite(output)), "Output contains NaN or Inf"

    print("\n✓ All output property checks passed")

    return output


def demo_stacking_multiple_layers() -> None:
    """Demo: Stacking multiple GCNN layers."""
    print("\n" + "=" * 70)
    print("DEMO 4: Stacking Multiple GCNN Layers")
    print("=" * 70)

    net = cast(pandapowerNet, case6ww())
    pipeline = GCNNInputPipeline(net)
    gcnn_input = pipeline.prepare(num_iterations=4)

    node_features = gcnn_input["node_features"]
    pd = gcnn_input["pd"]
    qd = gcnn_input["qd"]
    g_diag = gcnn_input["g_diag"]
    b_diag = gcnn_input["b_diag"]
    g_nd = gcnn_input["g_nd"]
    b_nd = gcnn_input["b_nd"]

    # Create layer stack
    layers = [
        GSGCNLayer(8, 8),  # 8 -> 8 channels
        GSGCNLayer(8, 8),  # 8 -> 8 channels
        GSGCNLayer(8, 8),  # 8 -> 8 channels
    ]

    print(f"Created {len(layers)} stacked layers:")
    for i, layer in enumerate(layers):
        print(f"  Layer {i+1}: {layer.in_channels} -> {layer.out_channels}")

    # Forward pass through stack
    x = torch.from_numpy(node_features).float()
    print(f"\nInput shape: {x.shape}")

    for i, layer in enumerate(layers):
        # Ensure x is a torch tensor
        if isinstance(x, np.ndarray):
            x = torch.from_numpy(x).float()

        x = layer(x, pd, qd, g_diag, b_diag, g_nd, b_nd)
        print(f"  After layer {i+1}: {x.shape}")

    print(f"\nFinal output shape: {x.shape}")
    print(f"Final output range: [{x.min():.4f}, {x.max():.4f}]")


def main() -> None:
    """Run all demonstrations."""
    print("\n" + "=" * 70)
    print("Physics-Guided GCNN: End-to-End Pipeline Demo")
    print("=" * 70)

    # Demo 1: Feature construction
    net, stacked_features = demo_feature_construction()

    # Demo 2: GCNN input pipeline
    gcnn_input = demo_gcnn_input_pipeline(net)

    # Demo 3: GCNN layer forward pass
    output = demo_gcnn_layer(gcnn_input)

    # Demo 4: Multiple layer stacking
    demo_stacking_multiple_layers()

    print("\n" + "=" * 70)
    print("All demos completed successfully!")
    print("=" * 70 + "\n")


if __name__ == "__main__":
    main()
