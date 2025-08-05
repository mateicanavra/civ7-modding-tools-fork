import {
	ConstructibleBuilder,
	CONSTRUCTIBLE_TYPE_TAG,
	DISTRICT,
	TERRAIN,
	YIELD,
	ACTION_GROUP_BUNDLE,
    ModifierBuilder,
    COLLECTION,
    EFFECT,
    REQUIREMENT,
} from "civ7-modding-tools";
import { ConstructiblePackage } from '@types';

// Define the Mountain Sanctuary constructible
const constructible = new ConstructibleBuilder({
	actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
	constructible: {
		constructibleType: "BUILDING_MOUNTAIN_SANCTUARY",
	},
	building: {
		purchasable: true,
		town: true,
		grantFortification: 1,
		defenseModifier: 5,
	},
	typeTags: [
		CONSTRUCTIBLE_TYPE_TAG.UNIQUE,
		CONSTRUCTIBLE_TYPE_TAG.AGELESS,
		CONSTRUCTIBLE_TYPE_TAG.PRODUCTION,
		CONSTRUCTIBLE_TYPE_TAG.CULTURE,
	],
	constructibleValidDistricts: [DISTRICT.URBAN, DISTRICT.CITY_CENTER],
	constructibleValidTerrains: [TERRAIN.HILL],
	constructibleYieldChanges: [
		{ yieldType: YIELD.CULTURE, yieldChange: 1 },
		{ yieldType: YIELD.PRODUCTION, yieldChange: 1 },
		{ yieldType: YIELD.DIPLOMACY, yieldChange: 1 },
	],
	adjacencyYieldChanges: [
		{ yieldType: YIELD.CULTURE, yieldChange: 1 },
		{ yieldType: YIELD.PRODUCTION, yieldChange: 1 },
		{ yieldType: YIELD.DIPLOMACY, yieldChange: 1 },
	],
	constructibleMaintenances: [{ yieldType: YIELD.GOLD, amount: 2 }],
	icon: {
		path: "blp:buildicon_altar",
	},
	localizations: [
		{
			name: "Mountain Sanctuary",
			description:
				"Dacian unique building that provides +1 [icon:YIELD_CULTURE] Culture, +1 [icon:YIELD_PRODUCTION] Production, and +1 [icon:YIELD_DIPLOMACY] Influence when adjacent to a Mountain tile.",
			tooltip:
				"The Mountain Sanctuaries were sacred places where Dacians communed with their gods and gained spiritual strength.",
		},
	],
});

// modifier for mountain adjacency bonus
const mountainSanctuaryModifier = new ModifierBuilder({
	actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
	modifier: {
		id: "MOUNTAIN_SANCTUARY_MOUNTAIN_ADJACENCY_MODIFIER",
		runOnce: false,
		permanent: true,
        collection: COLLECTION.CITY_CONSTRUCTIBLES,
        effect: EFFECT.CITY_ADJUST_CONSTRUCTIBLE_YIELD,
        arguments: [
            { name: "YieldType", value: YIELD.DIPLOMACY },
            { name: "Amount", value: 3 },
        ],
        requirements: [
            {
                type: REQUIREMENT.PLOT_ADJACENT_TERRAIN_TYPE_MATCHES,
                arguments: [{ name: "TerrainType", value: TERRAIN.MOUNTAIN }],
            },
        ],
	},
    localizations: [
        {
            description: "Boosts [icon:YIELD_DIPLOMACY] Influence yield by 3 when adjacent to a Mountain tile.",
        },
    ],
});

// Export as a ConstructiblePackage
export const mountainSanctuary: ConstructiblePackage = {
	constructible,
	modifiers: [mountainSanctuaryModifier],
};
