import { useMemo, useState } from 'react'

import { DEFAULT_TOPOLOGY_SELECTION } from '../constants.ts'
import type {
    TabKey,
    ThemeMode,
    TopologySelectionState,
    TopologyTargetCounts,
} from '../types.ts'

type UseWorkbenchAppStateResult = {
  activeTab: TabKey
  themeMode: ThemeMode
  topologySelection: TopologySelectionState
  topologyTargets: TopologyTargetCounts
  selectedTopologyCount: number
  setTopologySelection: React.Dispatch<React.SetStateAction<TopologySelectionState>>
  setTopologyTargets: React.Dispatch<React.SetStateAction<TopologyTargetCounts>>
  showWorkbenchTab: () => void
  showTopologyTab: () => void
  toggleThemeMode: () => void
}

/**
 * Manages root-level workbench shell state.
 *
 * @returns App shell state values and tab/theme/topology actions.
 */
export function useWorkbenchAppState(): UseWorkbenchAppStateResult {
  const [activeTab, setActiveTab] = useState<TabKey>('tab1')
  const [themeMode, setThemeMode] = useState<ThemeMode>('light')
  const [topologySelection, setTopologySelection] =
    useState<TopologySelectionState>(DEFAULT_TOPOLOGY_SELECTION)
  const [topologyTargets, setTopologyTargets] = useState<TopologyTargetCounts>({
    seen: 5,
    unseen: 2,
  })

  const showWorkbenchTab = () => {
    setActiveTab('tab1')
  }

  const showTopologyTab = () => {
    setActiveTab('tab2')
  }

  const toggleThemeMode = () => {
    setThemeMode((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const selectedTopologyCount = useMemo(() => {
    return topologySelection.specs.length
  }, [topologySelection.specs.length])

  return {
    activeTab,
    themeMode,
    topologySelection,
    topologyTargets,
    selectedTopologyCount,
    setTopologySelection,
    setTopologyTargets,
    showWorkbenchTab,
    showTopologyTab,
    toggleThemeMode,
  }
}
