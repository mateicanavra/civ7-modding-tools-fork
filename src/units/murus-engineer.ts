import { UnitBuilder, UNIT_CLASS, UNIT } from "civ7-modding-tools";
import { ACTION_GROUP_BUNDLE } from "../config";
import { murusEngineerIcon } from "../imports";

export const murusEngineerUnit = new UnitBuilder({
    actionGroupBundle: ACTION_GROUP_BUNDLE.AGE_ANTIQUITY,
    typeTags: [UNIT_CLASS.RECON],
    unit: {
        unitType: "UNIT_MURUS_ENGINEER",
        baseMoves: 2,
        baseSightRange: 2,
        buildCharges: 3,
        canPurchase: true,
        canBeDamaged: false,
    },
    icon: {
        path: "blp:unitflag_prospector",
    },
    unitCost: { cost: 80 },
    visualRemap: { to: UNIT_CLASS.PROSPECTOR },
    localizations: [
        {
            name: "Murus Engineer",
            description:
                "Dacian unique civilian unit with 3 specialized charges for building Ancient Walls and claiming resources. Walls built by Murus Engineers provide +2 [icon:CITY_DEFENSE] City Defense Strength and units defending on these walls receive +3 [icon:COMBAT_MELEE] Combat Strength.",
        },
    ],
}); 
