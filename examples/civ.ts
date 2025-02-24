import {
    ACTION_GROUP_BUNDLE,
    Civilization, CivilizationItem, CivilizationLocalization,
    ICON_PATH,
    Mod, TAG_TRAIT, TRAIT,
    Unit,
    UNIT,
    UNIT_CLASS,
    UnitLocalization,
    UnitStat
} from './src';

const mod = new Mod({
    id: 'mod-test',
    version: '1'
});

const unit = new Unit({
    name: 'TEST_SCOUT',
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    unitStat: new UnitStat({ combat: 40 }),
    typeTags: [UNIT_CLASS.RECON, UNIT_CLASS.RECON_ABILITIES],
    visualRemap: UNIT.ARCHER,
    unitReplace: UNIT.SCOUT,
    icon: ICON_PATH.CIV_SYM_HAN,
    localizations: [
        new UnitLocalization({ name: 'Test scout', description: 'test scout description' })
    ]
});

const civilization = new Civilization({
    name: 'TEST_CIV',
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    civilizationTags: [TAG_TRAIT.CULTURAL, TAG_TRAIT.ECONOMIC],
    civilizationTraits: [TRAIT.ANTIQUITY_CIV, TRAIT.ATTRIBUTE_CULTURAL, TRAIT.ATTRIBUTE_ECONOMIC],
    icon: 'civ_sym_han.png',
    civilizationItems: [
        CivilizationItem.from(unit)
    ],
    localizations: [
        new CivilizationLocalization({
            name: 'Test civilization',
            description: 'Test civilization desc',
            fullName: 'Test civilization full name',
        })
    ]
});

unit.bindToCivilization(civilization);

mod.fill({
    civilizations: [civilization],
    units: [unit]
});

mod.build('./dist/mod-test', true);
