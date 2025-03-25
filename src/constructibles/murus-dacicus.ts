import {
	ConstructibleBuilder,
	CONSTRUCTIBLE_TYPE_TAG,
	DISTRICT,
	TERRAIN,
	YIELD,
	ModifierBuilder,
	EFFECT,
	COLLECTION,
	REQUIREMENT,
	DOMAIN,
    ACTION_GROUP_BUNDLE,
} from "civ7-modding-tools";
import { ConstructiblePackage } from "../types";

// Define the Murus Dacicus constructible
const constructible = new ConstructibleBuilder({
	actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
	constructible: {
		constructibleType: "BUILDING_MURUS_DACICUS",
		constructibleClass: "BUILDING",
		cost: 60, // Same cost as Ancient Walls
		population: 0,
		age: "AGE_ANTIQUITY",
		existingDistrictOnly: true,
		repairable: true,
		districtDefense: true,
		militaryDomain: DOMAIN.LAND,
		costProgressionModel: "COST_PROGRESSION_PREVIOUS_COPIES_CITY",
		costProgressionParam1: 20,
	},
	building: {
		movable: false,
		multiplePerCity: true,
		purchasable: true,
		town: true,
		grantFortification: 1,
		defenseModifier: 10, // Higher than Ancient Walls to provide +10 combat strength
	},
	typeTags: [
		CONSTRUCTIBLE_TYPE_TAG.UNIQUE,
		CONSTRUCTIBLE_TYPE_TAG.AGELESS,
		CONSTRUCTIBLE_TYPE_TAG.DISTRICT_WALL,
		CONSTRUCTIBLE_TYPE_TAG.FORTIFICATION,
		CONSTRUCTIBLE_TYPE_TAG.IGNORE_DISTRICT_PLACEMENT_CAP,
		CONSTRUCTIBLE_TYPE_TAG.LINK_ADJACENT,
	],
	constructibleValidDistricts: [DISTRICT.CITY_CENTER, DISTRICT.URBAN],
	constructibleValidTerrains: [TERRAIN.HILL],
	constructibleYieldChanges: [
		{ yieldType: YIELD.PRODUCTION, yieldChange: 1 }, // Providing a small production bonus
	],
	constructiblePlunders: [{ plunderType: "PLUNDER_HEAL", amount: 30 }],
	icon: {
		path: "blp:impicon_hillfort", // Using the hillfort icon
	},
	localizations: [
		{
			name: "Murus Dacicus",
			description:
				"A unique Dacian defensive structure that replaces Ancient Walls. Provides +10 [icon:COMBAT_DEFENSE] Combat Strength to the city. Units defending on this tile get +2 [icon:YIELD_PRODUCTION] Production.",
			tooltip:
				"The Murus Dacicus was a distinctive Dacian wall construction technique combining a stone facing with an earth and timber core. They were especially effective when built on hillsides, providing superior defensive capabilities compared to standard fortifications. These walls became a hallmark of Dacian military architecture and were found at many important Dacian settlements.",
		},
	],
});

// Sight bonus modifier
const sightModifier = new ModifierBuilder({
	actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
	modifier: {
		id: "MOD_MURUS_DACICUS_SIGHT",
		collection: COLLECTION.PLAYER_UNITS,
		effect: EFFECT.ADJUST_UNIT_SIGHT,
		arguments: [{ name: "Amount", value: 10 }],
		requirements: [
			{
				type: REQUIREMENT.PLOT_HAS_CONSTRUCTIBLE,
				arguments: [
					{
						name: "ConstructibleType",
						value: "BUILDING_MURUS_DACICUS",
					},
				],
			},
		],
	},
	localizations: [
		{
			description: "+1 Sight for units on Murus Dacicus.",
		},
	],
});

// Healing bonus modifier
const healingModifier = new ModifierBuilder({
	actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
	modifier: {
		id: "MOD_MURUS_DACICUS_HEALING",
		collection: COLLECTION.OWNER,
		effect: EFFECT.ADJUST_DISTRICT_YIELD_MODIFIER,
		arguments: [
			{ name: "YieldType", value: YIELD.PRODUCTION },
			{ name: "Amount", value: 5 },
			{ name: "TerritoryTypes", value: "ALL_TERRITORIES" },
		],
		requirements: [
			{
				type: REQUIREMENT.PLOT_HAS_CONSTRUCTIBLE,
				arguments: [
					{
						name: "ConstructibleType",
						value: "BUILDING_MURUS_DACICUS",
					},
				],
			},
		],
	},
	localizations: [
		{
			description: "+5 Healing per turn for units on Murus Dacicus.",
		},
	],
});

// Export as a ConstructiblePackage
export const murusDacicus: ConstructiblePackage = {
	constructible,
	modifiers: [sightModifier, healingModifier],
};
