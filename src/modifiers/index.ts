import { ModifierBuilder } from "civ7-modding-tools";
import { ACTION_GROUP_BUNDLE, COLLECTION, EFFECT, REQUIREMENT } from "../config";


// Create modifier to grant resource claiming ability
export const murusEngineerResourceClaimModifier = new ModifierBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    modifier: {
        id: "MURUS_ENGINEER_MOD_GRANT_ABILITY_CHARGE",
        collection: COLLECTION.PLAYER_UNITS,
        effect: EFFECT.GRANT_UNIT_ABILITY_CHARGE,
        permanent: true,
        requirements: [{
            type: REQUIREMENT.UNIT_TYPE_MATCHES,
            arguments: [{ name: "UnitType", value: "UNIT_MURUS_ENGINEER" }]
        }],
        arguments: [
            { name: "AbilityType", value: "ABILITY_CLAIM_RESOURCE" },
            { name: "ChargedAbilityType", value: "CHARGED_ABILITY_CLAIM_RESOURCE" },
            { name: "Amount", value: 3 }
        ]
    }
});

// Murus Wall Defense Modifier
export const murusWallDefenseModifier = new ModifierBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    modifier: {
        collection: COLLECTION.CITY_DISTRICTS,
        effect: EFFECT.DISTRICT_ADJUST_FORTIFIED_COMBAT_STRENGTH,
        arguments: [{ name: "Amount", value: 2 }],
        requirements: [
            {
                type: REQUIREMENT.UNIT_IS_STATIONED_ON_DISTRICT,
                arguments: [{ name: "DistrictType", value: "DISTRICT_CITY_CENTER" }],
            },
        ],
    },
    localizations: [
        {
            description:
                "+2 City Defense Strength for walls built by Murus Engineers",
        },
    ],
});

// Murus Wall Combat Modifier
export const murusWallCombatModifier = new ModifierBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    modifier: {
        effect: EFFECT.ADJUST_UNIT_STRENGTH_MODIFIER,
        collection: COLLECTION.PLAYER_UNITS,
        arguments: [{ name: "Amount", value: 3 }],
        requirements: [
            {
                type: REQUIREMENT.PLOT_DISTRICT_IS_DEFENDED,
            },
            {
                type: REQUIREMENT.CITY_HAS_BUILDING,
                arguments: [{ name: "BuildingType", value: "BUILDING_ANCIENT_WALLS" }],
            },
        ],
    },
    localizations: [
        {
            description:
                "+3 Combat Strength for units defending on tiles with walls built by Murus Engineers",
        },
    ],
});

// Export all modifiers as an array for easy addition to the mod
export const allModifiers = [
    murusEngineerResourceClaimModifier,
    murusWallDefenseModifier,
    murusWallCombatModifier
]; 