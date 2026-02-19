import type { CardDefinition } from '../types.ts'

/**
 * Registry of built-in workbench cards.
 *
 * Notes:
 * - Keep IDs stable to avoid breaking saved layouts.
 * - Ports define the wiring contract for validation and edge rendering.
 */
export const WORKBENCH_CARD_DEFINITIONS: Record<CardDefinition['id'], CardDefinition> = {
  case_select: {
    id: 'case_select',
    title: 'Baseline',
    family: 'core',
    required: true,
    width: 260,
    ports: [
      {
        id: 'base_context_out',
        direction: 'output',
        label: 'basecase context',
      },
    ],
  },
  load_config: {
    id: 'load_config',
    title: 'Load Config',
    family: 'core',
    required: true,
    width: 330,
    ports: [
      {
        id: 'base_context_in',
        direction: 'input',
        label: 'basecase context',
      },
      {
        id: 'load_config_out',
        direction: 'output',
        label: 'load config',
      },
    ],
  },
  renewable_config: {
    id: 'renewable_config',
    title: 'Renewable Config',
    family: 'core',
    required: true,
    width: 320,
    ports: [
      {
        id: 'load_config_in',
        direction: 'input',
        label: 'load config',
      },
      {
        id: 'renewable_config_out',
        direction: 'output',
        label: 'renewable config',
      },
    ],
  },
  feature_construction: {
    id: 'feature_construction',
    title: 'Feature Construction',
    family: 'core',
    required: true,
    width: 280,
    ports: [
      {
        id: 'feature_in',
        direction: 'input',
        label: 'renewable config',
      },
      {
        id: 'feature_out',
        direction: 'output',
        label: 'feature settings',
      },
    ],
  },
  data_split: {
    id: 'data_split',
    title: 'Data Split',
    family: 'core',
    required: true,
    width: 320,
    ports: [
      {
        id: 'split_in',
        direction: 'input',
        label: 'feature settings',
      },
      {
        id: 'split_out',
        direction: 'output',
        label: 'split config',
      },
    ],
  },
  topology_sampling: {
    id: 'topology_sampling',
    title: 'Topology Sampling',
    family: 'core',
    required: true,
    width: 320,
    ports: [
      {
        id: 'topology_sampling_in',
        direction: 'input',
        label: 'split config',
      },
      {
        id: 'topology_sampling_out',
        direction: 'output',
        label: 'topology sampling',
      },
    ],
  },
  build_runtime: {
    id: 'build_runtime',
    title: 'Build Runtime',
    family: 'core',
    required: true,
    width: 320,
    ports: [
      {
        id: 'runtime_in',
        direction: 'input',
        label: 'topology sampling',
      },
      {
        id: 'runtime_out',
        direction: 'output',
        label: 'runtime config',
      },
    ],
  },
}
