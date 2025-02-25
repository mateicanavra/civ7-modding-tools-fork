import {
    ACTION_GROUP_BUNDLE,
    BIOME,
    Civilization,
    CivilizationItem,
    CivilizationLocalization,
    Constructible,
    CONSTRUCTIBLE_TYPE_TAG,
    ConstructibleLocalization,
    ConstructibleMaintenance,
    ConstructibleYieldChange,
    Icon,
    Mod,
    RESOURCE,
    TAG_TRAIT,
    TRAIT,
    Unit,
    UNIT,
    UNIT_CLASS,
    UnitLocalization,
    UnitStat,
    YIELD
} from './src';

const mod = new Mod({
    id: 'mod-test',
    version: '1'
});

const unit = new Unit({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    name: 'TEST_SCOUT',
    icon: new Icon({ modId: mod.id, content: './assets/unit-icon.png' }),
    unitStat: new UnitStat({ combat: 40 }),
    typeTags: [UNIT_CLASS.RECON, UNIT_CLASS.RECON_ABILITIES],
    visualRemap: UNIT.ARCHER,
    unitReplace: UNIT.SCOUT,
    localizations: [
        new UnitLocalization({ name: 'Test scout', description: 'test scout description' })
    ]
});

const constructible = new Constructible({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    name: 'TEST_BARN',
    icon: new Icon({ modId: mod.id, content: './assets/constructible-icon.png' }),
    typeTags: [
        CONSTRUCTIBLE_TYPE_TAG.UNIQUE,
        CONSTRUCTIBLE_TYPE_TAG.PERSISTENT,
        CONSTRUCTIBLE_TYPE_TAG.AGELESS,
        CONSTRUCTIBLE_TYPE_TAG.FOOD,
        CONSTRUCTIBLE_TYPE_TAG.PRODUCTION,
    ],
    constructibleYieldChanges: [
        new ConstructibleYieldChange({ yieldType: YIELD.PRODUCTION, yieldChange: 5 }),
        new ConstructibleYieldChange({ yieldType: YIELD.FOOD, yieldChange: 5 })
    ],
    constructibleMaintenances: [
        new ConstructibleMaintenance({ yieldType: YIELD.GOLD, amount: 1 }),
        new ConstructibleMaintenance({ yieldType: YIELD.HAPPINESS, amount: 1 }),
    ],
    localizations: [
        new ConstructibleLocalization({
            name: 'Test constructible',
            description: 'test constructible description',
            tooltip: 'test constructible tooltip'
        })
    ]
});

const civilization = new Civilization({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    name: 'TEST_CIV',
    civilizationTags: [
        TAG_TRAIT.CULTURAL,
        TAG_TRAIT.ECONOMIC
    ],
    civilizationTraits: [
        TRAIT.ANTIQUITY_CIV,
        TRAIT.ATTRIBUTE_CULTURAL,
        TRAIT.ATTRIBUTE_ECONOMIC
    ],
    icons: {
        main: new Icon({ modId: mod.id, content: './assets/civ-icon.png' })
    },
    civilizationItems: [
        CivilizationItem.from(unit),
        CivilizationItem.from(constructible),
    ],
    startBiasResources: [
        { resource: RESOURCE.HORSES, score: 20 }
    ],
    startBiasBiomes: [
        { biome: BIOME.GRASSLAND, score: 20 }
    ],
    localizations: [
        new CivilizationLocalization({
            name: 'Test civilization',
            description: 'Test civilization desc',
            fullName: 'Test civilization full name',
            adjective: 'Test adjective',
            cityNames: ['Test city 1', 'Test city 2']
        })
    ]
});

civilization.bind([
    unit,
    constructible
]);

mod.fill({
    civilizations: [civilization],
    constructibles: [constructible],
    units: [unit],
});

mod.build('./example-generated-mod', true);
