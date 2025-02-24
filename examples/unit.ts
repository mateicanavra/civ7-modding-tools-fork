import { ACTION_GROUP_BUNDLE, ICON_PATH, Mod, UNIT, Unit, UNIT_CLASS, UnitLocalization, UnitStat } from './src';

const mod = new Mod({
    id: 'mod-test',
    version: '1'
});

const unit = new Unit({
    type: 'UNIT_TEST_SCOUT',
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    unitStat: new UnitStat({ combat: 40 }),
    typeTags: [UNIT_CLASS.RECON, UNIT_CLASS.RECON_ABILITIES],
    visualRemap: UNIT.ARMY_COMMANDER,
    icon: ICON_PATH.CIV_SYM_HAN,
    localizations: [
        new UnitLocalization({ name: 'Test scout', description: 'test scout description' })
    ]
});

mod.fill({
    units: [unit]
});

mod.build('./dist/mod-test');
mod.build('C:/Users/izica/AppData/Local/Firaxis Games/Sid Meier\'s Civilization VII/Mods/test', true);
