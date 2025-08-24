import {
    ACTION_GROUP_BUNDLE,
    CivilizationBuilder,
    CONSTRUCTIBLE_TYPE_TAG,
    ConstructibleBuilder,
    DISTRICT,
    ImportFileBuilder,
    Mod,
    TAG_TRAIT,
    TRAIT,
    UNIT,
    UNIT_CLASS,
    UnitBuilder,
    YIELD,
    LeaderUnlockLocalization,
    AGE,
    COLLECTION,
    EFFECT,
    REQUIREMENT,
    CivilizationUnlockBuilder,
    LeaderUnlockBuilder,
    ModifierBuilder,
    FEATURE,
    TERRAIN
} from "@mateicanavra/civ7-sdk";

// Initialize the mod
let mod = new Mod({
    id: 'macnsqueeze-civilization-dacia',
    version: '1',
    name: 'Dacia Mac',
    description: 'Adds the ancient Dacian civilization with unique units and buildings to Civilization VII',
    authors: 'MacNSqueeze'
});

// Import assets
const civilizationIcon = new ImportFileBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    content: './imports/civ_sym_dacia',
    name: 'civ_sym_dacia'
});

// Create combat strength modifier
const hillCombatModifier = new ModifierBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    modifier: {
        effect: EFFECT.ADJUST_UNIT_STRENGTH_MODIFIER,
        collection: COLLECTION.PLAYER_UNITS,
        arguments: [
            { name: 'Amount', value: 5 }
        ],
        requirements: [{
            type: REQUIREMENT.PLOT_TERRAIN_TYPE_MATCHES,
            arguments: [
                { name: 'TerrainType', value: TERRAIN.HILL },
                { name: 'FeatureType', value: FEATURE.FOREST }
            ]
        }]
    }
});

// Create the Dacia civilization
const civilization = new CivilizationBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    civilization: {
        domain: 'AntiquityAgeCivilizations',
        civilizationType: 'CIVILIZATION_DACIA'
    },
    civilizationTraits: [
        TRAIT.ANTIQUITY_CIV,
        TRAIT.ATTRIBUTE_MILITARISTIC,
        TRAIT.ATTRIBUTE_CULTURAL
    ],
    civilizationTags: [TAG_TRAIT.CULTURAL, TAG_TRAIT.MILITARISTIC],
    icon: {
        path: `fs://game/${mod.id}/${civilizationIcon.name}`
    },
    localizations: [
        { 
            name: 'Dacia', 
            description: 'The Dacian kingdom flourished in the Carpathian Mountains, known for its gold mines, unique falx weapons, and mountain fortresses.', 
            fullName: 'The Dacian Kingdom', 
            adjective: 'Dacian', 
            unlockPlayAs: 'Play as [B]Daciastan[/B], masters of mountain warfare.',
            cityNames: [
                'Sarmizegetusa', 'Apulum', 'Napoca', 'Piroboridava', 'Sucidava',
                'Buridava', 'Cumidava', 'Porolissum', 'Genucla', 'Dierna',
                'Tibiscum', 'Drobeta'
            ],
            abilityName: 'Carpathian Defenders',
            abilityDescription: '[LIST][LI]Units receive +5 [icon:YIELD_COMBAT] Combat Strength when fighting in Hills or Forest terrain.[/LI][LI]Gold Mines provide +1 [icon:YIELD_PRODUCTION] Production and +1 [icon:YIELD_CULTURE] Culture.[/LI][/LIST]'
        }
    ]
});

const civilizationUnlockToExploration = new CivilizationUnlockBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_EXPLORATION,
    from: { civilizationType: civilization.civilization.civilizationType, ageType: AGE.ANTIQUITY, },
    to: { civilizationType: 'CIVILIZATION_NORMAN', ageType: AGE.EXPLORATION, },
});



const leaderDecebalusUnlock = new LeaderUnlockBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    leaderUnlock: {
        leaderType: 'LEADER_XERXES',
        type: civilization.civilization.civilizationType,
        ageType: AGE.ANTIQUITY,
    },
    leaderCivilizationBias: {
        bias: 6,
    },
    localizations: [{
        tooltip: `[B]Decebalus[/B] ruled [B]Dacia[/B].`
    }]
});

const unitFalxWarrior = new UnitBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    typeTags: [UNIT_CLASS.COMBAT, UNIT_CLASS.INFANTRY],
    unit: {
        unitType: 'UNIT_DACIAN_FALX_WARRIOR',
        baseMoves: 2,
        baseSightRange: 2,
    },
    icon: {
        path: 'blp:unitflag_swordsman'
    },
    unitCost: { cost: 110 },
    unitStat: { combat: 40 },
    unitReplace: { replacesUnitType: 'UNIT_SWORDSMAN' },
    visualRemap: { to: 'UNIT_SWORDSMAN' },
    localizations: [
        { name: 'Falx Warrior', description: 'Dacian unique melee unit that replaces the Swordsman. +5 [icon:YIELD_COMBAT] Combat Strength when fighting on Hills.' },
    ],
});

const mountainSanctuary = new ConstructibleBuilder({
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
        DISTRICT.CITY_CENTER,
    ],
    constructibleYieldChanges: [
        { yieldType: YIELD.CULTURE, yieldChange: 1 },
        { yieldType: YIELD.PRODUCTION, yieldChange: 1 },
    ],
    constructibleMaintenances: [
        { yieldType: YIELD.GOLD, amount: 1 },
    ],
    localizations: [
        {
            name: 'Mountain Sanctuary', 
            description: 'Dacian unique building that provides +1 [icon:YIELD_CULTURE] Culture, +1 [icon:YIELD_PRODUCTION] Production, and +1 [icon:YIELD_DIPLOMACY] Influence when adjacent to a Mountain tile.',
            tooltip: 'The Mountain Sanctuaries were sacred places where Dacians communed with their gods and gained spiritual strength.'
        },
    ]
});

// Bind components to the civilization
civilization.bind([
    unitFalxWarrior,
    mountainSanctuary,
    civilizationUnlockToExploration,
    leaderDecebalusUnlock,
    hillCombatModifier
]);

// Add components to the mod
mod.add([
    civilizationIcon,
    civilization,
    civilizationUnlockToExploration,
    leaderDecebalusUnlock,
    unitFalxWarrior,
    mountainSanctuary,
    hillCombatModifier
]);

// Define an output directory for the build
const OUTPUT_DIR = './dist';

// Build the mod
mod.build(OUTPUT_DIR);