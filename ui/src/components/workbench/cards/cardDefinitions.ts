import type { CardDefinition } from '../types'

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
}
