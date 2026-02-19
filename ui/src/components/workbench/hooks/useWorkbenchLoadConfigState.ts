import { useMemo, useState } from 'react';

import type { ScaleSamplingMode, TopologySamplingMode } from '../types.ts';

/**
 * Piecewise-linear interpolation anchors for renewable penetration rate by bus count.
 *
 * The array is ordered by ascending system size and follows paper-defined reference cases.
 */
const PENETRATION_ANCHORS: Array<{ buses: number; rate: number }> = [
  { buses: 39, rate: 0.507 },
  { buses: 57, rate: 0.3577 },
  { buses: 118, rate: 0.2825 },
  { buses: 300, rate: 0.2219 },
]

/**
 * Extracts the trailing numeric bus count from a basecase identifier.
 *
 * Example: `case39` -> `39`.
 */
function parseBusCountFromBasecase(basecase: string): number | null {
  const matches = basecase.match(/(\d+)/g)
  if (!matches || matches.length === 0) {
    return null
  }
  const last = Number(matches[matches.length - 1])
  if (!Number.isFinite(last) || last <= 0) {
    return null
  }
  return Math.floor(last)
}

/**
 * Computes renewable penetration with piecewise-linear interpolation by bus count.
 *
 * Uses clamped edge values for bus counts outside anchor range.
 */
function interpolatePenetrationRateByBusCount(busCount: number): number {
  const anchors = PENETRATION_ANCHORS
  if (busCount <= anchors[0].buses) {
    return anchors[0].rate
  }
  const last = anchors[anchors.length - 1]
  if (busCount >= last.buses) {
    return last.rate
  }

  for (let idx = 0; idx < anchors.length - 1; idx += 1) {
    const left = anchors[idx]
    const right = anchors[idx + 1]
    if (busCount >= left.buses && busCount <= right.buses) {
      const ratio = (busCount - left.buses) / (right.buses - left.buses)
      return left.rate + ratio * (right.rate - left.rate)
    }
  }

  return last.rate
}

/**
 * Resolves default worker count based on available logical CPU cores.
 *
 * Uses `hardwareConcurrency - 2` when available and falls back to a safe constant.
 */
function defaultNumWorkers(): number {
  if (typeof navigator !== 'undefined' && Number.isFinite(navigator.hardwareConcurrency)) {
    return Math.max(1, Math.floor(navigator.hardwareConcurrency) - 2)
  }
  return 8
}

/**
 * Aggregate state contract returned by `useWorkbenchLoadConfigState`.
 *
 * Includes all Tab1 card values, setters, and lock toggles.
 */
type UseWorkbenchLoadConfigStateResult = {
  selectedBasecase: string
  isBasecaseLocked: boolean
  isLoadConfigLocked: boolean
  isRenewableConfigLocked: boolean
  isFeatureConstructionLocked: boolean
  isDataSplitLocked: boolean
  isTopologySamplingLocked: boolean
  isBuildRuntimeLocked: boolean
  isTopologyTargetsLocked: boolean
  scaleSamplingMode: ScaleSamplingMode
  globalScaleMu: number
  globalScaleSigma: number
  globalScaleMin: number
  globalScaleMax: number
  scaleUniformBins: number
  nodeNoiseSigma: number
  renewablePenetrationRate: number
  renewableWindShare: number
  renewableCandidateBusCount: number
  renewableWeibullLambda: number
  renewableWeibullK: number
  renewableBetaAlpha: number
  renewableBetaBeta: number
  renewableVIn: number
  renewableVRated: number
  renewableVOut: number
  renewableGStc: number
  featureNumIterations: number
  splitTrain: number
  splitVal: number
  splitTestSeen: number
  splitTestUnseen: number
  topologySamplingSeenMode: TopologySamplingMode
  topologySamplingUnseenMode: TopologySamplingMode
  runtimeSeed: number
  runtimeNumWorkers: number
  runtimeChunkSize: number
  runtimeMaxAttemptMultiplier: number
  setSelectedBasecase: React.Dispatch<React.SetStateAction<string>>
  setScaleSamplingMode: React.Dispatch<React.SetStateAction<ScaleSamplingMode>>
  setGlobalScaleMu: React.Dispatch<React.SetStateAction<number>>
  setGlobalScaleSigma: React.Dispatch<React.SetStateAction<number>>
  setGlobalScaleMin: React.Dispatch<React.SetStateAction<number>>
  setGlobalScaleMax: React.Dispatch<React.SetStateAction<number>>
  setScaleUniformBins: React.Dispatch<React.SetStateAction<number>>
  setNodeNoiseSigma: React.Dispatch<React.SetStateAction<number>>
  setRenewableWindShare: React.Dispatch<React.SetStateAction<number>>
  setRenewableCandidateBusCount: React.Dispatch<React.SetStateAction<number>>
  setRenewableWeibullLambda: React.Dispatch<React.SetStateAction<number>>
  setRenewableWeibullK: React.Dispatch<React.SetStateAction<number>>
  setRenewableBetaAlpha: React.Dispatch<React.SetStateAction<number>>
  setRenewableBetaBeta: React.Dispatch<React.SetStateAction<number>>
  setRenewableVIn: React.Dispatch<React.SetStateAction<number>>
  setRenewableVRated: React.Dispatch<React.SetStateAction<number>>
  setRenewableVOut: React.Dispatch<React.SetStateAction<number>>
  setRenewableGStc: React.Dispatch<React.SetStateAction<number>>
  setFeatureNumIterations: React.Dispatch<React.SetStateAction<number>>
  setSplitTrain: React.Dispatch<React.SetStateAction<number>>
  setSplitVal: React.Dispatch<React.SetStateAction<number>>
  setSplitTestSeen: React.Dispatch<React.SetStateAction<number>>
  setSplitTestUnseen: React.Dispatch<React.SetStateAction<number>>
  setTopologySamplingSeenMode: React.Dispatch<React.SetStateAction<TopologySamplingMode>>
  setTopologySamplingUnseenMode: React.Dispatch<React.SetStateAction<TopologySamplingMode>>
  setRuntimeSeed: React.Dispatch<React.SetStateAction<number>>
  setRuntimeNumWorkers: React.Dispatch<React.SetStateAction<number>>
  setRuntimeChunkSize: React.Dispatch<React.SetStateAction<number>>
  setRuntimeMaxAttemptMultiplier: React.Dispatch<React.SetStateAction<number>>
  toggleBasecaseLock: () => void
  toggleLoadConfigLock: () => void
  toggleRenewableConfigLock: () => void
  toggleFeatureConstructionLock: () => void
  toggleDataSplitLock: () => void
  toggleTopologySamplingLock: () => void
  toggleBuildRuntimeLock: () => void
  toggleTopologyTargetsLock: () => void
}

/**
 * Manages all Tab1 configuration-card state.
 *
 * Returns:
 *   State values, setters, and lock toggles used across Tab1 cards.
 */
export function useWorkbenchLoadConfigState(): UseWorkbenchLoadConfigStateResult {
  const [selectedBasecase, setSelectedBasecase] = useState<string>('case39')
  const [isBasecaseLocked, setIsBasecaseLocked] = useState(true)
  const [isLoadConfigLocked, setIsLoadConfigLocked] = useState(true)
  const [isRenewableConfigLocked, setIsRenewableConfigLocked] = useState(true)
  const [isFeatureConstructionLocked, setIsFeatureConstructionLocked] = useState(true)
  const [isDataSplitLocked, setIsDataSplitLocked] = useState(true)
  const [isTopologySamplingLocked, setIsTopologySamplingLocked] = useState(true)
  const [isBuildRuntimeLocked, setIsBuildRuntimeLocked] = useState(true)
  const [isTopologyTargetsLocked, setIsTopologyTargetsLocked] = useState(true)

  const [scaleSamplingMode, setScaleSamplingMode] =
    useState<ScaleSamplingMode>('truncated_normal')
  const [globalScaleMu, setGlobalScaleMu] = useState(1.0)
  const [globalScaleSigma, setGlobalScaleSigma] = useState(0.2)
  const [globalScaleMin, setGlobalScaleMin] = useState(0.5)
  const [globalScaleMax, setGlobalScaleMax] = useState(1.5)
  const [scaleUniformBins, setScaleUniformBins] = useState(20)
  const [nodeNoiseSigma, setNodeNoiseSigma] = useState(0.05)

  /** Derived penetration rate linked to currently selected baseline case size. */
  const renewablePenetrationRate = useMemo(() => {
    const buses = parseBusCountFromBasecase(selectedBasecase)
    if (buses == null) {
      return PENETRATION_ANCHORS[0].rate
    }
    return interpolatePenetrationRateByBusCount(buses)
  }, [selectedBasecase])

  const [renewableWindShare, setRenewableWindShare] = useState(0.5)
  const [renewableCandidateBusCount, setRenewableCandidateBusCount] = useState(10)
  const [renewableWeibullLambda, setRenewableWeibullLambda] = useState(5.089)
  const [renewableWeibullK, setRenewableWeibullK] = useState(2.016)
  const [renewableBetaAlpha, setRenewableBetaAlpha] = useState(2.06)
  const [renewableBetaBeta, setRenewableBetaBeta] = useState(2.5)
  const [renewableVIn, setRenewableVIn] = useState(3.0)
  const [renewableVRated, setRenewableVRated] = useState(12.0)
  const [renewableVOut, setRenewableVOut] = useState(25.0)
  const [renewableGStc, setRenewableGStc] = useState(1000.0)

  const [featureNumIterations, setFeatureNumIterations] = useState(4)

  const [splitTrain, setSplitTrain] = useState(50_000)
  const [splitVal, setSplitVal] = useState(12_500)
  const [splitTestSeen, setSplitTestSeen] = useState(12_500)
  const [splitTestUnseen, setSplitTestUnseen] = useState(10_000)

  const [topologySamplingSeenMode, setTopologySamplingSeenMode] =
    useState<TopologySamplingMode>('uniform_cycle')
  const [topologySamplingUnseenMode, setTopologySamplingUnseenMode] =
    useState<TopologySamplingMode>('uniform_cycle')

  const [runtimeSeed, setRuntimeSeed] = useState(42)
  const [runtimeNumWorkers, setRuntimeNumWorkers] = useState(defaultNumWorkers)
  const [runtimeChunkSize, setRuntimeChunkSize] = useState(1000)
  const [runtimeMaxAttemptMultiplier, setRuntimeMaxAttemptMultiplier] = useState(20)

  /** Toggles baseline card lock state. */
  const toggleBasecaseLock = () => setIsBasecaseLocked((prev) => !prev)

  /** Toggles load-config card lock state. */
  const toggleLoadConfigLock = () => setIsLoadConfigLocked((prev) => !prev)

  /** Toggles renewable-config card lock state. */
  const toggleRenewableConfigLock = () => setIsRenewableConfigLocked((prev) => !prev)

  /** Toggles feature-construction card lock state. */
  const toggleFeatureConstructionLock = () => setIsFeatureConstructionLocked((prev) => !prev)

  /** Toggles data-split card lock state. */
  const toggleDataSplitLock = () => setIsDataSplitLocked((prev) => !prev)

  /** Toggles topology-sampling card lock state. */
  const toggleTopologySamplingLock = () => setIsTopologySamplingLocked((prev) => !prev)

  /** Toggles build-runtime card lock state. */
  const toggleBuildRuntimeLock = () => setIsBuildRuntimeLocked((prev) => !prev)

  /** Toggles topology-targets card lock state. */
  const toggleTopologyTargetsLock = () => setIsTopologyTargetsLocked((prev) => !prev)

  return {
    selectedBasecase,
    isBasecaseLocked,
    isLoadConfigLocked,
    isRenewableConfigLocked,
    isFeatureConstructionLocked,
    isDataSplitLocked,
    isTopologySamplingLocked,
    isBuildRuntimeLocked,
    isTopologyTargetsLocked,
    scaleSamplingMode,
    globalScaleMu,
    globalScaleSigma,
    globalScaleMin,
    globalScaleMax,
    scaleUniformBins,
    nodeNoiseSigma,
    renewablePenetrationRate,
    renewableWindShare,
    renewableCandidateBusCount,
    renewableWeibullLambda,
    renewableWeibullK,
    renewableBetaAlpha,
    renewableBetaBeta,
    renewableVIn,
    renewableVRated,
    renewableVOut,
    renewableGStc,
    featureNumIterations,
    splitTrain,
    splitVal,
    splitTestSeen,
    splitTestUnseen,
    topologySamplingSeenMode,
    topologySamplingUnseenMode,
    runtimeSeed,
    runtimeNumWorkers,
    runtimeChunkSize,
    runtimeMaxAttemptMultiplier,
    setSelectedBasecase,
    setScaleSamplingMode,
    setGlobalScaleMu,
    setGlobalScaleSigma,
    setGlobalScaleMin,
    setGlobalScaleMax,
    setScaleUniformBins,
    setNodeNoiseSigma,
    setRenewableWindShare,
    setRenewableCandidateBusCount,
    setRenewableWeibullLambda,
    setRenewableWeibullK,
    setRenewableBetaAlpha,
    setRenewableBetaBeta,
    setRenewableVIn,
    setRenewableVRated,
    setRenewableVOut,
    setRenewableGStc,
    setFeatureNumIterations,
    setSplitTrain,
    setSplitVal,
    setSplitTestSeen,
    setSplitTestUnseen,
    setTopologySamplingSeenMode,
    setTopologySamplingUnseenMode,
    setRuntimeSeed,
    setRuntimeNumWorkers,
    setRuntimeChunkSize,
    setRuntimeMaxAttemptMultiplier,
    toggleBasecaseLock,
    toggleLoadConfigLock,
    toggleRenewableConfigLock,
    toggleFeatureConstructionLock,
    toggleDataSplitLock,
    toggleTopologySamplingLock,
    toggleBuildRuntimeLock,
    toggleTopologyTargetsLock,
  }
}
