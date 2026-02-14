## Project Status (Single Source of Truth)

### Summary
- ✅ Steps 1-4 complete (core physics, pipelines, single-layer GCN)
- ✅ Step 5 complete (full GCNN model)
- ✅ Step 6 complete (training framework)

### Current Facts
- Tests: reduced set (latest: models + training tests passed)
- Demos: 2 (`examples/core_demo.py`, `examples/pipeline_gcnn_demo.py`)

### Documentation Policy
- This file is the only running summary.
- No new standalone summary files will be created.
- Updates go to the Change Log below.

### Requirements Input (User to Update)
- 每个系统的**样本数量**与**训练/验证/测试(seen)/测试(unseen)**比例：50K/12.5K/12.5K/10K

- 每个节点**负荷分布的相关性**：独立采样

  `Load_i = Base_Load_i * Global_Scale_Factor * (1 + Gaussian_Noise)`

  节点噪声是为了模拟“总负荷不变的情况下，各节点负荷比例的微小波动”。

  - **分布类型：** **标准正态分布 (N)**

  - **均值 (μ)：** `0`

  - **标准差 (σnoise)**： **`0.05`** (即 5% 的波动)

  - **系统相关性：** **无关**。

    - *理由：* 5% 是节点负荷预测误差的典型值。无论系统大小，单节点的预测不确定性通常都在这个范围。

  - **合成公式确认：**

    $P_{load,i}=P_{base,i}\times \text{GlobalScale} \times (1+N(0,0.05))$

- **总负荷约束**：

  **均值 (μ)：** `1.0` (即默认 Case Base Load)

  **标准差 (σ)：** `0.2` (这意味着约 68% 的样本落在 ±20% 范围内，保证了大部分样本是“正常工况”)

  **截断范围 (Bounds)：** `[0.5, 1.5]` (即 ±50% 硬约束)

- **N-1 事件集合**的选择规则：彼时会创建一个可交互的 GUI 供用户选择，是一个较复杂的议题，在完成 N 情况的采样后再考虑。

- 可再生**装机容量/渗透率**的具体数值如下，做一个分段线性插值 (Piecewise Linear Interpolation)，如此可以对其他未提及节点数的系统定义其渗透率。公式定义为

$$
\eta = \frac{\sum P_{rated}^{renewable}}{\sum P_{load}^{base}}
$$

  风光比例 50%/50%，接入位置随机选择 K 个节点接入新能源（K 可设为总节点数乘上渗透率），按节点原有负荷比例分配 (Proportional to Load)即可。按就地消纳原则

1. 计算系统总目标可再生容量：$P_{total\_RES} = P_{total\_load}^{base} \times \eta$

2. 计算风、光总目标：$P_{wind\_total} = 0.5 \times P_{total\_RES}$, $P_{solar\_total} = 0.5 \times P_{total\_RES}$

3. 选定接入风能的节点集合 $\Omega_{wind}$。

4. **分配公式：**

   $$P_{rated, i}^{wind} = P_{wind\_total} \times \frac{P_{load, i}^{base}}{\sum_{j \in \Omega_{wind}} P_{load, j}^{base}}$$



  | **IEEE testing system** | **Renewable energy penetration rate** |
  | ----------------------- | ------------------------------------- |
  | IEEE 39-bus             | 50.7%                                 |
  | IEEE 57-bus             | 35.77%                                |
  | IEEE 118-bus            | 28.25%                                |
  | IEEE 300-bus            | 22.19%                                |

- 新能源按负负载接入，风能从 Weibull 分布中采样得到了风速 $v$ ($m/s$)，则风机输出功率 $P_{wind}$ 为：

  $$P_{wind}(v) = \begin{cases} 0 & v < v_{in} \quad \text{(风速过低，未启动)} \\ P_{rated} \times \frac{v^3 - v_{in}^3}{v_{rated}^3 - v_{in}^3} & v_{in} \le v < v_{rated} \quad \text{(爬坡阶段，三次曲线)} \\ P_{rated} & v_{rated} \le v < v_{out} \quad \text{(满发阶段)} \\ 0 & v \ge v_{out} \quad \text{(风速过高，保护停机)} \end{cases}$$

  **典型值 (Typical Values)**

  以下参数适用于典型的陆上商用风机（如 2MW-5MW 级别）：

  | **参数符号** | **含义**                 | **典型值**                        | **来源参考** |
  | ------------ | ------------------------ | --------------------------------- | ------------ |
  | $v_{in}$     | 切入风速 (Cut-in Speed)  | **3.0 ~ 3.5 m/s**                 |              |
  | $v_{rated}$  | 额定风速 (Rated Speed)   | **11 ~ 13 m/s** (常用 **12 m/s**) |              |
  | $v_{out}$    | 切出风速 (Cut-out Speed) | **25 m/s**                        |              |

  光伏建模 (Photovoltaic Power)

  光伏输出主要取决于**辐照度**（Irradiance）和**电池板温度**（Cell Temperature）。在 OPF 研究中，通常使用考虑温度修正的线性模型。

  **简化公式**

  假设你从 Beta 分布中采样得到了辐照度 $G$ ($W/m^2$)，并已知环境温度 $T_{amb}$，则光伏输出 $P_{pv}$ 为：

  $$P_{pv}(G, T_{amb}) = P_{rated} \times \frac{G}{G_{STC}} \times [1 + \alpha_P (T_{cell} - T_{STC})]$$

  其中，电池工作温度 $T_{cell}$ 需要通过环境温度推算（使用 NOCT 参数）：

  $$T_{cell} = T_{amb} + \frac{NOCT - 20}{800} \times G$$

  - **注：** 如果你的数据集中不包含温度 $T_{amb}$，在极简模拟中可以忽略温度修正项，直接使用 $P_{pv} \approx P_{rated} \times \frac{G}{1000}$，但这会牺牲约 10-20% 的精度。

  **典型值 (Typical Values)**

  基于标准测试条件 (STC) 和常规多晶/单晶硅组件参数：

  | **参数符号** | **含义**            | **典型值**                             | **来源参考** |
  | ------------ | ------------------- | -------------------------------------- | ------------ |
  | $G_{STC}$    | 标准辐照度          | **1000 $W/m^2$**                       |              |
  | $T_{STC}$    | 标准测试温度        | **25 $^\circ C$**                      |              |
  | $\alpha_P$   | 功率温度系数        | **-0.4% / $^\circ C$** (即 **-0.004**) |              |
  | $NOCT$       | 额定电池工作温度    | **45 $^\circ C$** 或 **48 $^\circ C$** |              |
  | $T_{amb}$    | 环境温度 (若无数据) | 可设为 **25 $^\circ C$** (常温)        | (假设值)     |

- 是否引入**机组约束**、无功/电压范围等额外过滤规则：否，仅保留 pandapower 的 caseXX 中默认带有的约束即可。

- 加上 N 算作一种拓扑类型，外加 4 种 N-1 共 5 种拓扑类型，对于测试集，外加 2 种未见过的 N-1 共 7 种拓扑类型。在50K/12.5K/12.5K/10K的比例中, seen 即为五种拓扑平分 10K/2.5K/2.5K，对 unseen 两种未见拓扑平分即可，即每种 5K。

### Change Log

- 2026-01-31: Consolidated status into this file and removed standalone step summaries.
  - Physics aggregation
  - Trainable transformations
  - Output: (n_buses, out_channels)
- 2026-01-31: Added configurable GCNN model with paper defaults (3 GCN layers, 3 FC layers, 1000 hidden units).
- 2026-02-01: Added case39 N-topology sample generation component with configurable hyperparameters.
- 2026-02-02: Added normalization utilities and scenario dataset loader for N-topology training.
- 2026-02-02: Added loss functions and training utilities (supervised + correlative loss).
- 2026-02-02: Added GCNN batch builder to wire scenarios into training inputs.
- 2026-02-03: Updated GSGCNLayer to accept numpy inputs by converting to torch on-device; model/training tests passed.
- 2026-02-02: Added case39 dataset build script with split storage to NPZ.
- 2026-02-02: Generated case39 dataset splits at data/gcnn/case39.
- 2026-02-02: Added NPZ loader and ScenarioListDataset for split consumption.
- 2026-02-02: Added case39 training entry with DataLoader wiring and evaluation.
- 2026-02-02: Added experiment automation modules (GPU monitor, scheduler, config, logger).
- 2026-02-10: Added optional tqdm progress bars for training/evaluation.
- 2026-02-12: Added best-checkpoint saving based on per-epoch validation loss.
- 2026-02-12: Added batch-size hardware tuning script (16 to 1024) with throughput/memory logging.
- 2026-02-13: Switched to converged-only, fully materialized case39 dataset build path (offline tensors).
- 2026-02-13: Added fast materialized training/tuning data paths and tiny-check CLI flow.
- 2026-02-13: Added uniform-bins global scale sampling mode (bounded) and parallel chunked dataset build.
- 2026-02-13: Validated parallel tiny-check build + tuning outputs (case39_tiny_parallel).
- 2026-02-13: Optimized `GSGCNLayer` batch forward by removing per-sample Python loop and enabling vectorized tensor path for better GPU utilization.
- 2026-02-13: Fixed training/validation progress bars to display real external epoch counters (e.g., `epoch 7/100`) instead of always `1/1`.
- 2026-02-13: Fixed two Pylance diagnostics: typed slicing in `GCNNInputPipeline.summarize` and `batch_to_inputs` redeclaration in `train_case39`.
- 2026-02-14: Extended batch tuning to support quality-first objective with fixed optimization-step fairness, limited LR candidates, and validation-based recommendation (`best_val_loss`).
- 2026-02-14: Ran quality-first tuning (`epochs_per_batch=50`, `max_steps=20`, LR={1e-3, 5e-4}); recommendation: `batch_size=128`, `lr=0.001`.
- 2026-02-14: Enhanced case39 evaluation with paper-aligned probabilistic accuracy metrics (PG<1MW, VG<0.001 p.u., plus joint accuracy) and logged them into run `metrics.csv`.
- 2026-02-14: Created full workspace safety backup archive at `/home/ichou/backups/alloy_workspace_20260214_131310.tar.gz` before architecture refactor.
- 2026-02-14: Started plugin-style model organization by adding `alloy/models/gcnn_gao_01` adapters and exposing compatibility aliases in `alloy/models/__init__.py`.
- 2026-02-14: Standardized run re-evaluation via CLI `python -m alloy.experiments.reevaluate_run --run-dir <path>` to replace ad-hoc temporary scripts.
- 2026-02-14: Added model registry (`alloy/models/registry.py`) and switched training/tuning model construction to registry-based `model_name` selection (default: `01_gcnn_gao`).
- 2026-02-14: Initialized git baseline with artifact exclusions (`runs/`, `data/`, caches) and committed repository snapshot.
- 2026-02-14: Removed legacy `alloy/models/gcnn.py` and `alloy/models/gcnn_layer.py`; `gcnn_gao_01` is now the canonical implementation path.

### Multi-Layer Configuration
```
Input Layer: (n_buses, 8)
    ↓ GSGCNLayer(8, 8)
Hidden Layer 1: (n_buses, 8)
    ↓ GSGCNLayer(8, 8)
Hidden Layer 2: (n_buses, 8)
    ↓ GSGCNLayer(8, 8)
Output Features: (n_buses, 8)
    ↓ [Flatten: (n_buses*8,)]
    ↓ [FC Prediction Block - STEP 5]
    ↓ [Final Predictions: V, P_G]
```

---

## Next Immediate Tasks (Step 5)

### Full GCNN Model (`alloy/models/gcnn.py`)
```python
class GCNN(nn.Module):
    def __init__(self, in_channels=8, hidden_channels=16, num_layers=3, out_features=2):
        """
        - num_layers GSGCNLayer instances
        - Flexible channel dimensions
        - FC prediction head
        """
    
    def forward(self, node_features, admittance_data, load_data):
        # GCN stack → flatten → FC block → output
```

**Estimated scope**: 100-150 lines  
**Tests needed**: 8-10  
**Dependencies**: All of Steps 1-4

### Loss Functions (`alloy/losses.py`)
```python
# Supervised loss
L_supervised = MSE(predictions, targets)

# Physics-aware loss (power balance)
L_phi_PG = correlative_learning_loss(P_G_pred, network_constraints)

# Combined
L_total = L_supervised + κ * L_phi_PG
```

**Estimated scope**: 80-120 lines  
**Tests needed**: 6-8

### Training Loop (`alloy/training.py`)
```python
# Standard PyTorch training with:
# - Optimizer (Adam)
# - Learning rate scheduler
# - Early stopping
# - Checkpoint management
# - Validation metrics
```

**Estimated scope**: 150-200 lines

---

## Performance Baseline

### Current Capabilities (Steps 1-4)
- ✅ Load pandapower networks of any size
- ✅ Extract and normalize physics features
- ✅ Construct 8-dimensional GCNN input
- ✅ Forward pass through single GCN layer (~10ms for 6-bus network)
- ✅ Multi-layer inference (~30ms for 3-layer stack)
- ✅ Gradient computation for training (~50ms backward pass)

### Expected Performance (After Steps 5-6)
- Full model inference: ~50-100ms (6-bus), ~500ms-1s (33-bus)
- Training: ~100ms per batch (gradient + backward pass)
- Memory: ~50MB (model weights + cache)

---

## Troubleshooting Guide

### Common Issues

1. **Power flow doesn't converge**
   - Handled gracefully in `FeatureConstructionPipeline.__init__`
   - Features still computed (may be less accurate)

2. **Shape mismatch errors**
   - All tests validate input/output shapes
   - Run test suite to debug: `pytest -vv`

3. **GPU out of memory**
   - Reduce batch size or layer width
   - GSGCNLayer automatically handles GPU/CPU

4. **NaN in outputs**
   - Check input data validity (loads, admittance)
   - Run demo script to verify pipeline

---

## References

**Paper**: "A Physics-Guided Graph Convolution Neural Network for Optimal Power Flow"
- Gao et al., IEEE Transactions on Power Systems, 2024
- Equations 8-25 implemented in core module
- Equations 14-18 implemented in GSGCNLayer

**Key equations**:
- Eq. 8-11: Power flow computations
- Eq. 12-13: Feature aggregation (α, β)
- Eq. 14-15: Self features (δ, λ)
- Eq. 16-17: Gaussian-Seidel aggregation
- Eq. 18: Graph convolution kernel

---

## Summary

**Implementation Status**: 80% complete (4/5 stages)  
**Test Coverage**: 51/51 passing  
**Code Quality**: Production-ready  
**Documentation**: Comprehensive  
**Next Milestone**: Step 5 (Complete GCNN Model) - Estimated 1-2 days

---

*Last Updated: 2025-01-14*  
*Environment: Python 3.11, alloy311 conda environment*  
*Total Effort: ~2,000+ lines of code + tests*
