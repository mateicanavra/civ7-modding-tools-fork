import { REQUIREMENT } from '../civ7-modding-tools/src/constants/REQUIREMENT';
import {
    ACTION_GROUP_BUNDLE,
    CivilizationBuilder,
    CONSTRUCTIBLE_TYPE_TAG,
    ConstructibleBuilder,
    ConstructibleLocalization,
    DISTRICT,
    ImportFileBuilder,
    Mod,
    TAG_TRAIT,
    TRAIT,
    UNIT,
    UNIT_CLASS,
    UnitBuilder,
    YIELD,
    AGE,
    CivilizationUnlockBuilder,
    LeaderUnlockBuilder,
    COLLECTION,
    EFFECT,
    ModifierBuilder,
    TERRAIN,
    BIOME,
    FEATURE,
    FEATURE_CLASS,
    RESOURCE
} from "civ7-modding-tools";

let mod = new Mod({
    id: 'macnsqueeze-dacia',
    version: '1',
    name: 'Dacia',
    description: 'Adds the ancient Dacian civilization with unique units and buildings to Civilization VII',
    authors: 'macnqueeze'
});

const civilizationIcon = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: './imports/civ_sym_dacia',
    name: 'civ_sym_dacia'
});

// Create a modifier for recon units movement
const reconMovementModifier = new ModifierBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    modifier: {
        effect: EFFECT.UNIT_ADJUST_MOVEMENT,
        collection: COLLECTION.PLAYER_UNITS,
        arguments: [
            { name: 'Amount', value: 10 }
        ],
        requirements: [{
            type: REQUIREMENT.UNIT_TAG_MATCHES,
            arguments: [
                { name: 'Tag', value: UNIT_CLASS.RECON }
            ]
        }]
    }
});

const civilization = new CivilizationBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    civilization: {
        domain: 'AntiquityAgeCivilizations',
        civilizationType: 'CIVILIZATION_DACIA'
    },
    civilizationTraits: [
        TRAIT.ANTIQUITY_CIV,
        TRAIT.ATTRIBUTE_EXPANSIONIST,
        TRAIT.ATTRIBUTE_MILITARISTIC,
    ],
    civilizationTags: [TAG_TRAIT.CULTURAL, TAG_TRAIT.ECONOMIC],
    icon: {
        path: `fs://game/${mod.id}/${civilizationIcon.name}`
    },
    startBiasTerrains: [
        { terrainType: TERRAIN.MOUNTAIN },
        { terrainType: TERRAIN.HILL }
    ],
    startBiasBiomes: [
        { biomeType: BIOME.GRASSLAND },
        { biomeType: BIOME.PLAINS }
    ],
    startBiasFeatureClasses: [
        { featureClassType: FEATURE_CLASS.VEGETATED }
    ],
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
            name: 'Dacia', 
            description: 'The Dacian kingdom flourished in the Carpathian Mountains, known for its gold mines, unique falx weapons, and mountain fortresses.', 
            fullName: 'The Dacian Kingdom', 
            adjective: 'Dacian', 
            unlockPlayAs: 'Play as [B]Dacia[/B], masters of mountain warfare.',
            cityNames: [
                'Sarmizegetusa', 'Apulum', 'Napoca', 'Piroboridava', 'Sucidava',
                'Buridava', 'Cumidava', 'Porolissum', 'Genucla', 'Dierna',
                'Tibiscum', 'Drobeta'
            ],
            abilityName: 'Carpathian Defenders',
            abilityDescription: 'Units receive +5 [icon:COMBAT_MELEE] Combat Strength when fighting in Hills or Forest terrain. Gold Mines provide +1 [icon:YIELD_PRODUCTION] Production and +1 [icon:YIELD_CULTURE] Culture.'
        }
    ]
});

const civilizationUnlockToPrussia = new CivilizationUnlockBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_EXPLORATION,
    from: { civilizationType: civilization.civilization.civilizationType, ageType: AGE.ANTIQUITY, },
    to: { civilizationType: 'CIVILIZATION_PRUSSIA', ageType: AGE.MODERN, },
});

const leaderCatherineUnlock = new LeaderUnlockBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_EXPLORATION,
    leaderUnlock: {
        leaderType: 'LEADER_CATHERINE',
        type: civilization.civilization.civilizationType,
        ageType: AGE.EXPLORATION,
    },
    leaderCivilizationBias: {
        bias: 6,
    },
    localizations: [{
        tooltip: `[B]Catherine[/B] ruled [B]Dacia[/B].`
    }]
});

const unitIcon = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: 'blp:unitflag_swordsman',
    name: 'falx_warrior'
});

const unit = new UnitBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    typeTags: [UNIT_CLASS.COMBAT, UNIT_CLASS.INFANTRY],
    unit: {
        unitType: 'UNIT_FALX_WARRIOR',
        baseMoves: 2,
        baseSightRange: 2,
    },
    icon: {
        path: 'blp:unitflag_swordsman'
    },
    unitCost: { cost: 110 },
    unitStat: { combat: 40 },
    unitReplace: { replacesUnitType: 'UNIT_PHALANX' },
    visualRemap: { to: 'UNIT_PHALANX' },
    localizations: [
        { name: 'Falx Warrior', description: 'Dacian unique melee unit that replaces the Phalanx. +5 [icon:COMBAT_MELEE] Combat Strength when fighting on Hills.' },
    ],
});

const constructible = new ConstructibleBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    constructible: {
        constructibleType: 'BUILDING_MOUNTAIN_SANCTUARY',
    },
    building: {},
    typeTags: [
        CONSTRUCTIBLE_TYPE_TAG.UNIQUE,
        CONSTRUCTIBLE_TYPE_TAG.AGELESS,
        CONSTRUCTIBLE_TYPE_TAG.PRODUCTION,
        CONSTRUCTIBLE_TYPE_TAG.CULTURE
    ],
    constructibleValidDistricts: [
        DISTRICT.URBAN,
        DISTRICT.CITY_CENTER
    ],
    constructibleValidTerrains: [
        TERRAIN.MOUNTAIN,
        TERRAIN.HILL
    ],
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
    constructibleMaintenances: [
        { yieldType: YIELD.GOLD, amount: 2 },
    ],
    icon: {
        path: 'blp:buildicon_altar'
    },
    localizations: [
        {
            name: 'Mountain Sanctuary', 
            description: 'Dacian unique building that provides +1 [icon:YIELD_CULTURE] Culture, +1 [icon:YIELD_PRODUCTION] Production, and +1 [icon:YIELD_DIPLOMACY] Influence when adjacent to a Mountain tile.',
            tooltip: 'The Mountain Sanctuaries were sacred places where Dacians communed with their gods and gained spiritual strength.'
        },
    ]
});

civilization.bind([
    unit,
    constructible,
    civilizationUnlockToPrussia,
    leaderCatherineUnlock,
    reconMovementModifier
]);

mod.add([
    civilization,
    civilizationIcon,
    civilizationUnlockToPrussia,
    leaderCatherineUnlock,
    unit,
    unitIcon,
    constructible,
    reconMovementModifier
]);

mod.build('./dist');