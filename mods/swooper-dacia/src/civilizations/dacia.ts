/**
 * Dacia Civilization
 *
 * This file contains the complete Dacia civilization implementation.
 */

import {
  CivilizationBuilder,
  CivilizationUnlockBuilder,
  LeaderUnlockBuilder,
  ImportFileBuilder,
  ModifierBuilder,
  TRAIT,
  TAG_TRAIT,
  TERRAIN,
  BIOME,
  FEATURE_CLASS,
  RESOURCE,
  AGE,
  ACTION_GROUP_BUNDLE,
  COLLECTION,
  EFFECT,
  REQUIREMENT,
} from 'civ7-modding-tools';
import { falxman, murusEngineer } from '@units';
import { mountainSanctuary, murusDacicus } from '@constructibles';
import { CivilizationPackage } from '@types';
import { mod } from '@mod';

// Define civilization icon
const civilizationIcon = new ImportFileBuilder({
  actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
  content: './assets/Dacia_alt.png',
  name: 'civ_sym_dacia',
});

// Define civilization
const civilization = new CivilizationBuilder({
  actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
  civilization: {
    domain: 'AntiquityAgeCivilizations',
    civilizationType: 'CIVILIZATION_DACIA',
  },
  civilizationTraits: [
    TRAIT.ANTIQUITY_CIV,
    TRAIT.ATTRIBUTE_EXPANSIONIST,
    TRAIT.ATTRIBUTE_MILITARISTIC,
  ],
  civilizationTags: [TAG_TRAIT.CULTURAL, TAG_TRAIT.ECONOMIC],
  icon: {
    path: `fs://game/${mod.id}/${civilizationIcon.name}`,
  },
  startBiasTerrains: [
    { terrainType: TERRAIN.MOUNTAIN },
    { terrainType: TERRAIN.HILL },
    { terrainType: TERRAIN.NAVIGABLE_RIVER },
  ],
  startBiasBiomes: [{ biomeType: BIOME.GRASSLAND }, { biomeType: BIOME.PLAINS }],
  startBiasFeatureClasses: [
    { featureClassType: FEATURE_CLASS.VEGETATED },
    { featureClassType: FEATURE_CLASS.FLOODPLAIN },
  ],
  startBiasResources: [
    // ── Core strategic abundance ──
    { resourceType: RESOURCE.SALT, score: 10 },
    { resourceType: RESOURCE.LIMESTONE, score: 9 },
    { resourceType: RESOURCE.HARDWOOD, score: 9 },
    { resourceType: RESOURCE.GOLD, score: 8 },

    // ── Secondary but still valuable ──
    { resourceType: RESOURCE.FISH, score: 6 },
    { resourceType: RESOURCE.WINE, score: 5 },
    { resourceType: RESOURCE.MARBLE, score: 5 },
    { resourceType: RESOURCE.WILD_GAME, score: 5 },

    // ── Moderate / situational ──
    { resourceType: RESOURCE.CLAY, score: 4 },
    { resourceType: RESOURCE.HORSES, score: 4 },

    // ── Minor presence ──
    { resourceType: RESOURCE.WOOL, score: 3 },
    { resourceType: RESOURCE.HIDES, score: 3 },
    { resourceType: RESOURCE.GYPSUM, score: 3 },

    // ── Effectively absent ──
    { resourceType: RESOURCE.TIN, score: 0 },
  ],
  startBiasRiver: 1,
  startBiasAdjacentToCoast: 0,
  localizations: [
    {
      name: 'Dacia',
      description:
        'The Dacian kingdom flourished in the Carpathian Mountains, known for its gold mines, unique falx weapons, and mountain fortresses.',
      fullName: 'The Dacian Kingdom',
      adjective: 'Dacian',
      unlockPlayAs: 'Play as [B]Dacia[/B], masters of mountain warfare.',
      cityNames: [
        'Sarmizegetusa',
        'Apulum',
        'Napoca',
        'Piroboridava',
        'Sucidava',
        'Buridava',
        'Cumidava',
        'Porolissum',
        'Genucla',
        'Dierna',
        'Tibiscum',
        'Drobeta',
      ],
      abilityName: 'Carpathian Defenders',
      abilityDescription:
        'Units receive +5 [icon:COMBAT_MELEE] Combat Strength when fighting in Hills or Forest terrain. Gold Mines provide +1 [icon:YIELD_PRODUCTION] Production and +1 [icon:YIELD_CULTURE] Culture.',
    },
  ],
});

// Create a combat bonus modifier for hills
const terrainCombatModifier = new ModifierBuilder({
  actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
  modifier: {
    id: 'DACIA_MOD_TERRAIN_COMBAT_BONUS',
    collection: COLLECTION.PLAYER_UNITS,
    effect: EFFECT.ADJUST_UNIT_STRENGTH_MODIFIER,
    permanent: true,
    requirements: [
      {
        type: REQUIREMENT.PLAYER_TYPE_MATCHES,
        arguments: [{ name: 'CivilizationType', value: 'CIVILIZATION_DACIA' }],
      },
      {
        type: REQUIREMENT.PLOT_TERRAIN_TYPE_MATCHES,
        arguments: [{ name: 'TerrainType', value: 'TERRAIN_HILLS' }],
      },
    ],
    arguments: [{ name: 'Amount', value: 5 }],
  },
});

// Create a forest combat bonus modifier
const forestCombatModifier = new ModifierBuilder({
  actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
  modifier: {
    id: 'DACIA_MOD_FOREST_COMBAT_BONUS',
    collection: COLLECTION.PLAYER_UNITS,
    effect: EFFECT.ADJUST_UNIT_STRENGTH_MODIFIER,
    permanent: true,
    requirements: [
      {
        type: REQUIREMENT.PLAYER_TYPE_MATCHES,
        arguments: [{ name: 'CivilizationType', value: 'CIVILIZATION_DACIA' }],
      },
      {
        type: REQUIREMENT.PLOT_FEATURE_TYPE_MATCHES,
        arguments: [{ name: 'FeatureType', value: 'FEATURE_FOREST' }],
      },
    ],
    arguments: [{ name: 'Amount', value: 5 }],
  },
});

// Abstract factory function for resource yield modifiers
function createResourceYieldModifier({
  id,
  resourceType,
  yieldType,
  amount,
}: {
  id: string;
  resourceType: string;
  yieldType: string;
  amount: number;
}) {
  return new ModifierBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    modifier: {
      id,
      collection: COLLECTION.PLAYER_PLOT_YIELDS,
      effect: EFFECT.PLOT_ADJUST_YIELD,
      permanent: true,
      requirements: [
        {
          type: REQUIREMENT.PLAYER_TYPE_MATCHES,
          arguments: [{ name: 'CivilizationType', value: 'CIVILIZATION_DACIA' }],
        },
        {
          type: REQUIREMENT.PLOT_RESOURCE_TYPE_MATCHES,
          arguments: [{ name: 'ResourceType', value: resourceType }],
        },
      ],
      arguments: [
        { name: 'YieldType', value: yieldType },
        { name: 'Amount', value: amount },
      ],
    },
  });
}

// Create a gold mine production yield modifier
const goldMineProductionModifier = createResourceYieldModifier({
  id: 'DACIA_MOD_GOLD_MINE_PRODUCTION',
  resourceType: 'RESOURCE_GOLD',
  yieldType: 'YIELD_PRODUCTION',
  amount: 10,
});

// Create a gold mine culture yield modifier
const goldMineCultureModifier = createResourceYieldModifier({
  id: 'DACIA_MOD_GOLD_MINE_CULTURE',
  resourceType: 'RESOURCE_GOLD',
  yieldType: 'YIELD_CULTURE',
  amount: 10,
});

// Create a horses production yield modifier
const horsesProductionModifier = createResourceYieldModifier({
  id: 'DACIA_MOD_HORSES_PRODUCTION',
  resourceType: 'RESOURCE_HORSES',
  yieldType: 'YIELD_PRODUCTION',
  amount: 10,
});

// Create a horses culture yield modifier
const horsesCultureModifier = createResourceYieldModifier({
  id: 'DACIA_MOD_HORSES_CULTURE',
  resourceType: 'RESOURCE_HORSES',
  yieldType: 'YIELD_CULTURE',
  amount: 10,
});

// Create a salt production yield modifier
const saltProductionModifier = createResourceYieldModifier({
  id: 'DACIA_MOD_SALT_PRODUCTION',
  resourceType: 'RESOURCE_SALT',
  yieldType: 'YIELD_PRODUCTION',
  amount: 10,
});

// Create a salt culture yield modifier
const saltCultureModifier = createResourceYieldModifier({
  id: 'DACIA_MOD_SALT_CULTURE',
  resourceType: 'RESOURCE_SALT',
  yieldType: 'YIELD_CULTURE',
  amount: 10,
});
/* Create an iron production yield modifier */
const ironProductionModifier = createResourceYieldModifier({
  id: 'DACIA_MOD_IRON_PRODUCTION',
  resourceType: 'RESOURCE_IRON',
  yieldType: 'YIELD_PRODUCTION',
  amount: 10,
});

/* Create an iron culture yield modifier */
const ironCultureModifier = createResourceYieldModifier({
  id: 'DACIA_MOD_IRON_CULTURE',
  resourceType: 'RESOURCE_IRON',
  yieldType: 'YIELD_CULTURE',
  amount: 10,
});

// Define civilization unlocks
const unlockToMongolia = new CivilizationUnlockBuilder({
  actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_EXPLORATION,
  from: {
    civilizationType: civilization.civilization.civilizationType,
    ageType: AGE.ANTIQUITY,
  },
  to: { civilizationType: 'CIVILIZATION_MONGOLIA', ageType: AGE.MODERN },
});

const unlockToPrussia = new CivilizationUnlockBuilder({
  actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_EXPLORATION,
  from: {
    civilizationType: civilization.civilization.civilizationType,
    ageType: AGE.ANTIQUITY,
  },
  to: { civilizationType: 'CIVILIZATION_PRUSSIA', ageType: AGE.MODERN },
});

// Define leader unlocks
const catherineUnlock = new LeaderUnlockBuilder({
  actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_EXPLORATION,
  leaderUnlock: {
    leaderType: 'LEADER_CATHERINE',
    type: civilization.civilization.civilizationType,
    ageType: AGE.EXPLORATION,
  },
  leaderCivilizationBias: {
    bias: 6,
  },
  localizations: [
    {
      tooltip: `[B]Catherine[/B] ruled [B]Dacia[/B].`,
    },
  ],
});

// Bind units, constructibles, modifiers, and unlocks to the civilization
civilization.bind([
  falxman.unit,
  murusEngineer.unit,
  ...(falxman.modifiers || []),
  ...(murusEngineer.modifiers || []),
  mountainSanctuary.constructible,
  murusDacicus.constructible,
  // ...(mountainSanctuary.modifiers || []),
  ...(murusDacicus.modifiers || []),
  terrainCombatModifier,
  forestCombatModifier,
  goldMineProductionModifier,
  goldMineCultureModifier,
  horsesProductionModifier,
  horsesCultureModifier,
  saltProductionModifier,
  saltCultureModifier,
  ironCultureModifier,
  ironProductionModifier,
  unlockToMongolia,
  unlockToPrussia,
  catherineUnlock,
]);

// Export as a CivilizationPackage
export const dacia: CivilizationPackage = {
  civilization,
  modifiers: [
    terrainCombatModifier,
    forestCombatModifier,
    goldMineProductionModifier,
    goldMineCultureModifier,
    horsesProductionModifier,
    horsesCultureModifier,
    saltProductionModifier,
    saltCultureModifier,
    ironCultureModifier,
    ironProductionModifier,
  ],
  imports: [civilizationIcon],
  unlocks: {
    civilizations: [unlockToMongolia, unlockToPrussia],
    leaders: [catherineUnlock],
  },
};

// Export unlocks directly for backward compatibility
export const civilizationUnlockToMongolia = unlockToMongolia;
export const civilizationUnlockToPrussia = unlockToPrussia;
export const leaderCatherineUnlock = catherineUnlock;
