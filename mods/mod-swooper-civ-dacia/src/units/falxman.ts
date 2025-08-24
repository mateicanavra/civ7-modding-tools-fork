/**
 * Falxman - Dacian unique combat unit
 *
 * This file contains:
 * - Unit definition
 * - Any unit-specific abilities
 * - Any unit-specific modifiers
 */

import {
  UnitBuilder,
  ImportFileBuilder,
  UNIT_CLASS,
  ModifierBuilder,
  ACTION_GROUP_BUNDLE,
  COLLECTION,
  EFFECT,
  REQUIREMENT,
} from '@mateicanavra/civ7-sdk';
import { UnitPackage } from '@types';

// Define unit icon
const falxmanIcon = new ImportFileBuilder({
  actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
  content: 'blp:unitflag_swordsman',
  name: 'falxman',
});

// Define the Falxman unit
const unitDefinition = new UnitBuilder({
  actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
  typeTags: [UNIT_CLASS.COMBAT, UNIT_CLASS.INFANTRY],
  unit: {
    unitType: 'UNIT_FALXMAN',
    baseMoves: 2,
    baseSightRange: 2,
  },
  icon: {
    // path: `fs://game/${mod.id}/${falxmanIcon.name}`,
    path: 'blp:unitflag_swordsman',
  },
  unitCost: { cost: 110 },
  unitStat: { combat: 40 },
  unitReplace: { replacesUnitType: 'UNIT_PHALANX' },
  visualRemap: { to: 'UNIT_PHALANX' },
  localizations: [
    {
      name: 'Falx Warrior',
      description:
        'Dacian unique melee unit that replaces the Phalanx. +5 [icon:COMBAT_MELEE] Combat Strength when fighting on Hills.',
    },
  ],
});

// Create a modifier for the hills combat bonus mentioned in the description
const hillsCombatModifier = new ModifierBuilder({
  actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
  modifier: {
    id: 'FALXMAN_MOD_HILLS_COMBAT_BONUS',
    collection: COLLECTION.PLAYER_UNITS,
    effect: EFFECT.ADJUST_UNIT_BASE_COMBAT_STRENGTH,
    permanent: true,
    requirements: [
      {
        type: REQUIREMENT.UNIT_TYPE_MATCHES,
        arguments: [{ name: 'UnitType', value: 'UNIT_FALXMAN' }],
      },
      {
        type: REQUIREMENT.PLOT_TERRAIN_TYPE_MATCHES,
        arguments: [{ name: 'TerrainType', value: 'TERRAIN_HILLS' }],
      },
    ],
    arguments: [{ name: 'Amount', value: 5 }],
  },
});

// Export the unit package conforming to the UnitPackage interface
export const falxman: UnitPackage = {
  unit: unitDefinition,
  abilities: [],
  modifiers: [hillsCombatModifier],
  imports: [falxmanIcon],
};
