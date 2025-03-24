import { UnitBuilder, UNIT_CLASS } from "civ7-modding-tools";
import { ACTION_GROUP_BUNDLE } from "../config";
import { falxmanUnitIcon } from "../imports";

export const falxmanUnit = new UnitBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    typeTags: [UNIT_CLASS.COMBAT, UNIT_CLASS.INFANTRY],
    unit: {
        unitType: "UNIT_FALXMAN",
        baseMoves: 2,
        baseSightRange: 2,
    },
    icon: {
        path: "blp:unitflag_swordsman",
    },
    unitCost: { cost: 110 },
    unitStat: { combat: 40 },
    unitReplace: { replacesUnitType: "UNIT_PHALANX" },
    visualRemap: { to: "UNIT_PHALANX" },
    localizations: [
        {
            name: "Falx Warrior",
            description:
                "Dacian unique melee unit that replaces the Phalanx. +5 [icon:COMBAT_MELEE] Combat Strength when fighting on Hills.",
        },
    ],
}); 