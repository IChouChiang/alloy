export type TabKey = 'tab1' | 'tab2'
export type ThemeMode = 'light' | 'dark'

export type Point = {
  x: number
  y: number
}

export type ScaleSamplingMode = 'truncated_normal' | 'uniform_bins' | 'bounded_uniform'

export type CardId = 'case_select' | 'load_config'

export type PortDirection = 'input' | 'output'

export type PortSpec = {
  id: string
  direction: PortDirection
  label: string
}

export type CardDefinition = {
  id: CardId
  title: string
  family: 'core'
  required: boolean
  width: number
  ports: PortSpec[]
}
