import { useState } from 'react'

import type { ScaleSamplingMode } from '../types'

type UseWorkbenchLoadConfigStateResult = {
  selectedBasecase: string
  isBasecaseLocked: boolean
  isLoadConfigLocked: boolean
  scaleSamplingMode: ScaleSamplingMode
  globalScaleMu: number
  globalScaleSigma: number
  globalScaleMin: number
  globalScaleMax: number
  scaleUniformBins: number
  nodeNoiseSigma: number
  setSelectedBasecase: React.Dispatch<React.SetStateAction<string>>
  setScaleSamplingMode: React.Dispatch<React.SetStateAction<ScaleSamplingMode>>
  setGlobalScaleMu: React.Dispatch<React.SetStateAction<number>>
  setGlobalScaleSigma: React.Dispatch<React.SetStateAction<number>>
  setGlobalScaleMin: React.Dispatch<React.SetStateAction<number>>
  setGlobalScaleMax: React.Dispatch<React.SetStateAction<number>>
  setScaleUniformBins: React.Dispatch<React.SetStateAction<number>>
  setNodeNoiseSigma: React.Dispatch<React.SetStateAction<number>>
  toggleBasecaseLock: () => void
  toggleLoadConfigLock: () => void
}

/**
 * Manages baseline and load-configuration card state.
 *
 * @returns Config values, setters, and lock toggle handlers used by Tab1 cards.
 */
export function useWorkbenchLoadConfigState(): UseWorkbenchLoadConfigStateResult {
  const [selectedBasecase, setSelectedBasecase] = useState<string>('case39')
  const [isBasecaseLocked, setIsBasecaseLocked] = useState(true)
  const [isLoadConfigLocked, setIsLoadConfigLocked] = useState(true)
  const [scaleSamplingMode, setScaleSamplingMode] =
    useState<ScaleSamplingMode>('truncated_normal')
  const [globalScaleMu, setGlobalScaleMu] = useState(1.0)
  const [globalScaleSigma, setGlobalScaleSigma] = useState(0.2)
  const [globalScaleMin, setGlobalScaleMin] = useState(0.5)
  const [globalScaleMax, setGlobalScaleMax] = useState(1.5)
  const [scaleUniformBins, setScaleUniformBins] = useState(20)
  const [nodeNoiseSigma, setNodeNoiseSigma] = useState(0.05)

  const toggleBasecaseLock = () => {
    setIsBasecaseLocked((prev) => !prev)
  }

  const toggleLoadConfigLock = () => {
    setIsLoadConfigLocked((prev) => !prev)
  }

  return {
    selectedBasecase,
    isBasecaseLocked,
    isLoadConfigLocked,
    scaleSamplingMode,
    globalScaleMu,
    globalScaleSigma,
    globalScaleMin,
    globalScaleMax,
    scaleUniformBins,
    nodeNoiseSigma,
    setSelectedBasecase,
    setScaleSamplingMode,
    setGlobalScaleMu,
    setGlobalScaleSigma,
    setGlobalScaleMin,
    setGlobalScaleMax,
    setScaleUniformBins,
    setNodeNoiseSigma,
    toggleBasecaseLock,
    toggleLoadConfigLock,
  }
}
