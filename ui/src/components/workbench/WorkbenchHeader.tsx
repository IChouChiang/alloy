import type { TabKey, ThemeMode } from './types'

type WorkbenchHeaderProps = {
  activeTab: TabKey
  themeMode: ThemeMode
  selectedTopologyCount: number
  onShowWorkbenchTab: () => void
  onShowTopologyTab: () => void
  onToggleThemeMode: () => void
}

/**
 * Header for tab switching and global theme toggle.
 *
 * Args:
 *   activeTab: Currently active top-level tab.
 *   themeMode: Current theme mode.
 *   selectedTopologyCount: Number of selected topologies for Tab2 badge.
 *   onShowWorkbenchTab: Handler to switch to Tab1.
 *   onShowTopologyTab: Handler to switch to Tab2.
 *   onToggleThemeMode: Handler to toggle theme.
 *
 * Returns:
 *   Rendered workbench header section.
 */
export function WorkbenchHeader({
  activeTab,
  themeMode,
  selectedTopologyCount,
  onShowWorkbenchTab,
  onShowTopologyTab,
  onToggleThemeMode,
}: WorkbenchHeaderProps) {
  return (
    <header className="tabs-header">
      <button
        className={activeTab === 'tab1' ? 'tab-btn active' : 'tab-btn'}
        onClick={onShowWorkbenchTab}
      >
        Tab1 - Workbench
      </button>
      <button
        className={activeTab === 'tab2' ? 'tab-btn active' : 'tab-btn'}
        onClick={onShowTopologyTab}
      >
        Tab2 - Topology ({selectedTopologyCount})
      </button>
      <div className="header-spacer" />
      <button className="theme-btn" onClick={onToggleThemeMode}>
        Theme: {themeMode === 'light' ? 'Light' : 'Dark'}
      </button>
    </header>
  )
}
