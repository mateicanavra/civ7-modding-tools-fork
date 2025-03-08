import { ConstructibleBuilder } from "../builders";
import { CONSTRUCTIBLE_TYPE_TAG, DISTRICT, YIELD } from "../constants";
import { ActionGroupBundle } from "../core";

/**
 * @description create building for testing
 */
export function createGodConstructible(actionGroupBundle: ActionGroupBundle, constructibleType: string = 'BUILDING_GOD' ) {
    return new ConstructibleBuilder({
        actionGroupBundle,
        constructible: {
            constructibleType: 'BUILDING_GOD',
        },
        building: {},
        typeTags: [
            CONSTRUCTIBLE_TYPE_TAG.AGELESS,
            CONSTRUCTIBLE_TYPE_TAG.PRODUCTION,
            CONSTRUCTIBLE_TYPE_TAG.FOOD
        ],
        constructibleValidDistricts: [
            DISTRICT.URBAN,
            DISTRICT.CITY_CENTER,
            DISTRICT.RURAL,
        ],
        constructibleYieldChanges: [
            { yieldType: YIELD.PRODUCTION, yieldChange: 900 },
            { yieldType: YIELD.SCIENCE, yieldChange: 900 },
            { yieldType: YIELD.FOOD, yieldChange: 900 },
            { yieldType: YIELD.CULTURE, yieldChange: 900 },
            { yieldType: YIELD.GOLD, yieldChange: 900 },
        ],
        constructibleMaintenances: [
            { yieldType: YIELD.GOLD, amount: 1 },
        ],
        localizations: [
            { name: 'GOD BUILDING', description: 'ONLY FOR TESTING', tooltip: 'ONLY FOR TESTING' },
        ]
    });
}
