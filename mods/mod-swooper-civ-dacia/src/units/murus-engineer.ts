/**
 * Murus Engineer - Dacian unique civilian unit
 *
 * This file contains:
 * - Unit definition
 * - Claim resource ability implementation
 * - Ability charge modifier implementation
 */

import {
  UnitBuilder,
  UNIT_CLASS,
  AbilityBuilder,
  ModifierBuilder,
  ImportFileBuilder,
  ACTION_GROUP_BUNDLE,
  COLLECTION,
  EFFECT,
  REQUIREMENT,
  ABILITY,
  TERRAIN,
  RESOURCE,
  RESOURCE_CLASS,
} from '@mateicanavra/civ7-sdk';
import { UnitPackage } from '@types';

// Define unit icon
const murusEngineerIcon = new ImportFileBuilder({
  actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
  content: 'blp:unitflag_prospector',
  name: 'murus_engineer',
});

// Define the Murus Engineer unit
const unitDefinition = new UnitBuilder({
  actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
  typeTags: [UNIT_CLASS.RECON],
  unit: {
    unitType: 'UNIT_MURUS_ENGINEER',
    baseMoves: 2,
    baseSightRange: 2,
    buildCharges: 3,
    canPurchase: true,
    canBeDamaged: false,
  },
  icon: {
    // path: `fs://game/${mod.id}/${murusEngineerIcon.name}`,
    path: 'blp:unitflag_prospector',
  },
  unitCost: { cost: 80 },
  visualRemap: { to: UNIT_CLASS.PROSPECTOR },
  localizations: [
    {
      name: 'Murus Engineer',
      description:
        'Dacian unique civilian unit with 3 specialized charges for building Ancient Walls and claiming resources. Walls built by Murus Engineers provide +2 [icon:CITY_DEFENSE] City Defense Strength and units defending on these walls receive +3 [icon:COMBAT_MELEE] Combat Strength.',
    },
  ],
});

// Define Claim Resource ability
const claimResourceAbility = new AbilityBuilder({
  actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
  ability: {
    abilityType: ABILITY.CLAIM_RESOURCE,
    name: 'Claim Resource',
    description: 'Claim an unclaimed resource, adding it to your civilization.',
  },
  chargedAbility: {
    enabled: true,
    rechargeTurns: 1,
  },
});

/**
// Define ability charge modifiers
*/
const grantAbilityChargeModifierGold = new ModifierBuilder({
  actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
  modifier: {
    id: 'MURUS_ENGINEER_MOD_GRANT_ABILITY_CHARGE_GOLD',
    collection: COLLECTION.PLAYER_UNITS,
    effect: EFFECT.GRANT_UNIT_ABILITY_CHARGE,
    permanent: true,
    requirements: [
      {
        type: REQUIREMENT.UNIT_TYPE_MATCHES,
        arguments: [{ name: 'UnitType', value: 'UNIT_MURUS_ENGINEER' }],
      },
      {
        type: REQUIREMENT.PLOT_RESOURCE_TYPE_MATCHES,
        arguments: [{ name: 'ResourceType', value: RESOURCE.GOLD }],
      },
    ],
    arguments: [
      {
        name: 'ChargedAbilityType',
        value: 'CHARGED_ABILITY_CLAIM_RESOURCE',
      },
      { name: 'Amount', value: 3 },
    ],
  },
});

const grantAbilityChargeModifierLimestone = new ModifierBuilder({
  actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
  modifier: {
    id: 'MURUS_ENGINEER_MOD_GRANT_ABILITY_CHARGE_LIMESTONE',
    collection: COLLECTION.PLAYER_UNITS,
    effect: EFFECT.GRANT_UNIT_ABILITY_CHARGE,
    permanent: true,
    requirements: [
      {
        type: REQUIREMENT.UNIT_TYPE_MATCHES,
        arguments: [{ name: 'UnitType', value: 'UNIT_MURUS_ENGINEER' }],
      },
      {
        type: REQUIREMENT.PLOT_RESOURCE_TYPE_MATCHES,
        arguments: [{ name: 'ResourceType', value: RESOURCE.LIMESTONE }],
      },
    ],
    arguments: [
      {
        name: 'ChargedAbilityType',
        value: 'CHARGED_ABILITY_CLAIM_RESOURCE',
      },
      { name: 'Amount', value: 3 },
    ],
  },
});

const grantAbilityChargeModifierSalt = new ModifierBuilder({
  actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
  modifier: {
    id: 'MURUS_ENGINEER_MOD_GRANT_ABILITY_CHARGE_SALT',
    collection: COLLECTION.PLAYER_UNITS,
    effect: EFFECT.GRANT_UNIT_ABILITY_CHARGE,
    permanent: true,
    requirements: [
      {
        type: REQUIREMENT.UNIT_TYPE_MATCHES,
        arguments: [{ name: 'UnitType', value: 'UNIT_MURUS_ENGINEER' }],
      },
      {
        type: REQUIREMENT.PLOT_RESOURCE_TYPE_MATCHES,
        arguments: [{ name: 'ResourceType', value: RESOURCE.SALT }],
      },
    ],
    arguments: [
      {
        name: 'ChargedAbilityType',
        value: 'CHARGED_ABILITY_CLAIM_RESOURCE',
      },
      { name: 'Amount', value: 3 },
    ],
  },
});

// Bind the ability to the unit using the modern pattern
claimResourceAbility.bind([unitDefinition]);

// Bind the modifiers to the ability - this generates the UnitAbilityModifiers section
claimResourceAbility.bindModifiers([
  grantAbilityChargeModifierGold,
  grantAbilityChargeModifierLimestone,
  grantAbilityChargeModifierSalt,
]);

// Export the unit package conforming to the UnitPackage interface
export const murusEngineer: UnitPackage = {
  unit: unitDefinition,
  abilities: [claimResourceAbility],
  modifiers: [
    grantAbilityChargeModifierGold,
    grantAbilityChargeModifierLimestone,
    grantAbilityChargeModifierSalt,
  ],
  imports: [murusEngineerIcon],
};
