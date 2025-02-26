import { ACTION_GROUP_BUNDLE, Mod, UNIT, UNIT_CLASS, UnitBuilder } from "./src";

const mod = new Mod({
    id: 'mod-test',
    version: '1',
});

const unit = new UnitBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    unit: {
        unitType: 'UNIT_CUSTOM_SCOUT',
        baseMoves: 2,
        baseSightRange: 10
    },
    typeTags: [UNIT_CLASS.RECON, UNIT_CLASS.RECON_ABILITIES],
    unitCost: { cost: 20 },
    unitStat: { combat: 0 },
    unitReplace: { replacesUnitType: UNIT.SCOUT },
    visualRemap: { to: UNIT.ARMY_COMMANDER }
});

mod.add(unit).build('./dist');
