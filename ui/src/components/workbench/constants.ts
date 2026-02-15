import type { TopologySelectionState } from './types'

/** Supported pandapower base case identifiers for case selection card. */
export const PANDAPOWER_BASECASES = [
  'case4gs',
  'case5',
  'case6ww',
  'case9',
  'case11_iwamoto',
  'case14',
  'case24_ieee_rts',
  'case30',
  'case_ieee30',
  'case33bw',
  'case39',
  'case57',
  'case89pegase',
  'case118',
  'case145',
  'case_illinois200',
  'case300',
  'case1354pegase',
  'case1888rte',
  'case2848rte',
  'case2869pegase',
  'case3120sp',
  'case6470rte',
  'case6495rte',
  'case6515rte',
  'case9241pegase',
] as const

/** Default topology selection when topology editor has not been configured. */
export const DEFAULT_TOPOLOGY_SELECTION: TopologySelectionState = {
  specs: [{ topology_id: 'N', line_outages: [] }],
  seenTopologyIds: ['N'],
  unseenTopologyIds: [],
}
