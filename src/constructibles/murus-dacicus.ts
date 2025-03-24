import { ConstructibleBuilder, CONSTRUCTIBLE_TYPE_TAG, DISTRICT, TERRAIN, YIELD, TRAIT } from "civ7-modding-tools";
import { ACTION_GROUP_BUNDLE } from "../config";

export const murusDacicusConstructible = new ConstructibleBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    constructible: {
        constructibleType: "BUILDING_MURUS_DACICUS",
    },
    building: {
        purchasable: true,
        town: true,
        grantFortification: 1,
        defenseModifier: 10,  // Higher than Ancient Walls to provide +10 combat strength
    },
    typeTags: [
        CONSTRUCTIBLE_TYPE_TAG.UNIQUE,
        CONSTRUCTIBLE_TYPE_TAG.AGELESS,
        CONSTRUCTIBLE_TYPE_TAG.FORTIFICATION
    ],
    constructibleValidDistricts: [
        DISTRICT.URBAN, 
        DISTRICT.CITY_CENTER
    ],
    constructibleValidTerrains: [
        TERRAIN.FLAT,
        TERRAIN.HILL,
        TERRAIN.COAST  // Including coast like Ancient Walls
    ],
    constructibleMaintenances: [
        { yieldType: YIELD.GOLD, amount: 2 }
    ],
    icon: {
        path: "blp:buildicon_walls", // Using a walls icon as placeholder
    },
    localizations: [
        {
            name: "Murus Dacicus",
            description: "Dacian unique building that replaces Ancient Walls. Provides +10 [icon:COMBAT_DEFENSE] Combat Strength to the city.",
            tooltip: "The Murus Dacicus was a distinctive Dacian wall construction technique, combining a stone facing with an earth and timber core for superior defensive capabilities."
        }
    ],
    // The replacement is likely handled at the civilization level or through modifiers
}); 