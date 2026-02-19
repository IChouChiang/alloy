import { useMemo, useState } from 'react'

import { DEFAULT_TOPOLOGY_SELECTION } from '../constants'
import type { TabKey, ThemeMode, TopologySelectionState } from '../types'

type UseWorkbenchAppStateResult = {
  activeTab: TabKey
  themeMode: ThemeMode
  topologySelection: TopologySelectionState
  selectedTopologyCount: number
  setTopologySelection: React.Dispatch<React.SetStateAction<TopologySelectionState>>
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
    selectedTopologyCount,
    setTopologySelection,
    showWorkbenchTab,
    showTopologyTab,
    toggleThemeMode,
  }
}
