"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createGodConstructible = createGodConstructible;
const builders_1 = require("../builders");
const constants_1 = require("../constants");
/**
 * @description create building for testing
 */
function createGodConstructible(actionGroupBundle, constructibleType = 'BUILDING_GOD') {
    return new builders_1.ConstructibleBuilder({
        actionGroupBundle,
        constructible: {
            constructibleType: 'BUILDING_GOD',
        },
        building: {},
        typeTags: [
            constants_1.CONSTRUCTIBLE_TYPE_TAG.AGELESS,
            constants_1.CONSTRUCTIBLE_TYPE_TAG.PRODUCTION,
            constants_1.CONSTRUCTIBLE_TYPE_TAG.FOOD
        ],
        constructibleValidDistricts: [
            constants_1.DISTRICT.URBAN,
            constants_1.DISTRICT.CITY_CENTER,
            constants_1.DISTRICT.RURAL,
        ],
        constructibleYieldChanges: [
            { yieldType: constants_1.YIELD.PRODUCTION, yieldChange: 900 },
            { yieldType: constants_1.YIELD.SCIENCE, yieldChange: 900 },
            { yieldType: constants_1.YIELD.FOOD, yieldChange: 900 },
            { yieldType: constants_1.YIELD.CULTURE, yieldChange: 900 },
            { yieldType: constants_1.YIELD.GOLD, yieldChange: 900 },
        ],
        constructibleMaintenances: [
            { yieldType: constants_1.YIELD.GOLD, amount: 1 },
        ],
        localizations: [
            { name: 'GOD BUILDING', description: 'ONLY FOR TESTING', tooltip: 'ONLY FOR TESTING' },
        ]
    });
}
//# sourceMappingURL=createGodConstructible.js.map