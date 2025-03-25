/**
 * Dacia Civilization
 * 
 * This file contains the complete Dacia civilization implementation.
 */

import { 
    CivilizationBuilder, 
    TRAIT, 
    TAG_TRAIT, 
    TERRAIN, 
    BIOME, 
    FEATURE_CLASS, 
    RESOURCE,
    ModifierBuilder,
    CivilizationUnlockBuilder,
    LeaderUnlockBuilder,
    AGE,
    ImportFileBuilder
} from "civ7-modding-tools";
import { 
    ACTION_GROUP_BUNDLE,
    COLLECTION,
    EFFECT,
    REQUIREMENT,
    mod
} from "../config";
import { falxman, murusEngineer } from "../units";
import { mountainSanctuary } from "../constructibles";
import { CivilizationPackage } from "../types";

// Define civilization icon
const civilizationIcon = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: "./assets/Dacia_alt.png",
    name: "civ_sym_dacia",
});

// Define civilization
const civilization = new CivilizationBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    civilization: {
        domain: "AntiquityAgeCivilizations",
        civilizationType: "CIVILIZATION_DACIA",
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
    ],
    startBiasBiomes: [
        { biomeType: BIOME.GRASSLAND },
        { biomeType: BIOME.PLAINS },
    ],
    startBiasFeatureClasses: [{ featureClassType: FEATURE_CLASS.VEGETATED }],
    startBiasResources: [
        { resourceType: RESOURCE.GOLD },
        { resourceType: RESOURCE.HORSES },
        { resourceType: RESOURCE.SILVER },
        { resourceType: RESOURCE.WINE },
    ],
    startBiasRiver: 1,
    startBiasAdjacentToCoast: 0,
    localizations: [
        {
            name: "Dacia",
            description:
                "The Dacian kingdom flourished in the Carpathian Mountains, known for its gold mines, unique falx weapons, and mountain fortresses.",
            fullName: "The Dacian Kingdom",
            adjective: "Dacian",
            unlockPlayAs: "Play as [B]Dacia[/B], masters of mountain warfare.",
            cityNames: [
                "Sarmizegetusa",
                "Apulum",
                "Napoca",
                "Piroboridava",
                "Sucidava",
                "Buridava",
                "Cumidava",
                "Porolissum",
                "Genucla",
                "Dierna",
                "Tibiscum",
                "Drobeta",
            ],
            abilityName: "Carpathian Defenders",
            abilityDescription:
                "Units receive +5 [icon:COMBAT_MELEE] Combat Strength when fighting in Hills or Forest terrain. Gold Mines provide +1 [icon:YIELD_PRODUCTION] Production and +1 [icon:YIELD_CULTURE] Culture.",
        },
    ],
});

// Create a combat bonus modifier for hills
const terrainCombatModifier = new ModifierBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    modifier: {
        id: "DACIA_MOD_TERRAIN_COMBAT_BONUS",
        collection: COLLECTION.PLAYER_UNITS,
        effect: EFFECT.ADJUST_UNIT_STRENGTH_MODIFIER,
        permanent: true,
        requirements: [
            {
                type: REQUIREMENT.PLAYER_TYPE_MATCHES,
                arguments: [{ name: "CivilizationType", value: "CIVILIZATION_DACIA" }]
            },
            {
                type: REQUIREMENT.PLOT_TERRAIN_TYPE_MATCHES,
                arguments: [{ name: "TerrainType", value: "TERRAIN_HILLS" }]
            }
        ],
        arguments: [{ name: "Amount", value: 5 }]
    }
});

// Create a forest combat bonus modifier
const forestCombatModifier = new ModifierBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    modifier: {
        id: "DACIA_MOD_FOREST_COMBAT_BONUS",
        collection: COLLECTION.PLAYER_UNITS,
        effect: EFFECT.ADJUST_UNIT_STRENGTH_MODIFIER,
        permanent: true,
        requirements: [
            {
                type: REQUIREMENT.PLAYER_TYPE_MATCHES,
                arguments: [{ name: "CivilizationType", value: "CIVILIZATION_DACIA" }]
            },
            {
                type: REQUIREMENT.PLOT_FEATURE_TYPE_MATCHES,
                arguments: [{ name: "FeatureType", value: "FEATURE_FOREST" }]
            }
        ],
        arguments: [{ name: "Amount", value: 5 }]
    }
});

// Create a gold mine production yield modifier
const goldMineProductionModifier = new ModifierBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    modifier: {
        id: "DACIA_MOD_GOLD_MINE_PRODUCTION",
        collection: COLLECTION.PLAYER_UNITS,
        effect: EFFECT.CITY_ADJUST_YIELD,
        permanent: true,
        requirements: [
            {
                type: REQUIREMENT.PLAYER_TYPE_MATCHES,
                arguments: [{ name: "CivilizationType", value: "CIVILIZATION_DACIA" }]
            },
            {
                type: REQUIREMENT.PLOT_RESOURCE_TYPE_MATCHES,
                arguments: [{ name: "ResourceType", value: "RESOURCE_GOLD" }]
            },
            {
                type: REQUIREMENT.PLOT_HAS_ANY_IMPROVEMENT,
                arguments: [{ name: "ImprovementType", value: "IMPROVEMENT_MINE" }]
            }
        ],
        arguments: [
            { name: "YieldType", value: "YIELD_PRODUCTION" },
            { name: "Amount", value: 1 }
        ]
    }
});

// Create a gold mine culture yield modifier
const goldMineCultureModifier = new ModifierBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    modifier: {
        id: "DACIA_MOD_GOLD_MINE_CULTURE",
        collection: COLLECTION.PLAYER_UNITS,
        effect: EFFECT.CITY_ADJUST_YIELD,
        permanent: true,
        requirements: [
            {
                type: REQUIREMENT.PLAYER_TYPE_MATCHES,
                arguments: [{ name: "CivilizationType", value: "CIVILIZATION_DACIA" }]
            },
            {
                type: REQUIREMENT.PLOT_RESOURCE_TYPE_MATCHES,
                arguments: [{ name: "ResourceType", value: "RESOURCE_GOLD" }]
            },
            {
                type: REQUIREMENT.PLOT_HAS_ANY_IMPROVEMENT,
                arguments: [{ name: "ImprovementType", value: "IMPROVEMENT_MINE" }]
            }
        ],
        arguments: [
            { name: "YieldType", value: "YIELD_CULTURE" },
            { name: "Amount", value: 1 }
        ]
    }
});

// Define civilization unlocks
const unlockToMongolia = new CivilizationUnlockBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_EXPLORATION,
    from: {
        civilizationType: civilization.civilization.civilizationType,
        ageType: AGE.ANTIQUITY,
    },
    to: { civilizationType: "CIVILIZATION_MONGOLIA", ageType: AGE.MODERN },
});

const unlockToPrussia = new CivilizationUnlockBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_EXPLORATION,
    from: {
        civilizationType: civilization.civilization.civilizationType,
        ageType: AGE.ANTIQUITY,
    },
    to: { civilizationType: "CIVILIZATION_PRUSSIA", ageType: AGE.MODERN },
});

// Define leader unlocks
const catherineUnlock = new LeaderUnlockBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_EXPLORATION,
    leaderUnlock: {
        leaderType: "LEADER_CATHERINE",
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
    terrainCombatModifier,
    forestCombatModifier,
    goldMineProductionModifier,
    goldMineCultureModifier,
    unlockToMongolia,
    unlockToPrussia,
    catherineUnlock
]);

// Export as a CivilizationPackage
export const dacia: CivilizationPackage = {
    civilization,
    modifiers: [
        terrainCombatModifier, 
        forestCombatModifier, 
        goldMineProductionModifier, 
        goldMineCultureModifier
    ],
    imports: [civilizationIcon],
    unlocks: {
        civilizations: [unlockToMongolia, unlockToPrussia],
        leaders: [catherineUnlock]
    }
}; 

// Export unlocks directly for backward compatibility
export const civilizationUnlockToMongolia = unlockToMongolia;
export const civilizationUnlockToPrussia = unlockToPrussia;
export const leaderCatherineUnlock = catherineUnlock; 